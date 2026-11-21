-- NotRealEngine — Migration 202611210010: Production Account Creation & Provisioning Hardening
-- Timestamp: 2026-11-21
-- Purpose:
--   1. Make auth.users -> public.profiles trigger defensive so signup NEVER fails with
--      "Database error saving new user" due to metadata edge cases.
--   2. Add safe self-insert RLS policy on public.profiles (strictly non-staff, role IS NULL)
--      so authenticated users can self-heal if auth.users trigger was skipped in restricted roles.
--   3. Provide idempotent SECURITY DEFINER RPC public.ensure_client_account_bootstrap() that
--      provisions the caller's profile and initial client organization workspace atomically
--      using auth.uid() only (never trusting client-supplied IDs or roles).
--   4. Backfill any existing auth.users rows missing a public.profiles entry.

begin;

-- =============================================================================
-- 1. DEFENSIVE HANDLE_NEW_USER TRIGGER (NEVER BREAKS AUTH.USERS INSERT)
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  v_full_name := nullif(left(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), 120), '');

  insert into public.profiles (id, full_name, is_staff, role)
  values (new.id, v_full_name, false, null)
  on conflict (id) do update
    set full_name = coalesce(public.profiles.full_name, excluded.full_name),
        updated_at = timezone('utc', now());

  return new;
exception when others then
  -- Never block Supabase Auth user creation; application bootstrap RPC will self-heal on first session.
  raise warning 'handle_new_user non-fatal warning for user %: %', new.id, sqlerrm;
  return new;
end;
$$;

do $$
begin
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception when others then
  raise notice 'Skipping direct auth.users trigger setup (requires superuser/postgres role): %', sqlerrm;
end $$;

-- =============================================================================
-- 2. SAFE SELF-INSERT POLICY ON PUBLIC.PROFILES (NO PRIVILEGE ESCALATION)
-- =============================================================================
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert
  on public.profiles
  for insert
  to authenticated
  with check (
    id = auth.uid()
    and is_staff = false
    and role is null
  );

grant select, insert, update on public.profiles to authenticated;

-- =============================================================================
-- 3. IDEMPOTENT CLIENT ACCOUNT BOOTSTRAP RPC (PROFILE + DEFAULT ORGANIZATION)
-- =============================================================================
create or replace function public.ensure_client_account_bootstrap(
  p_full_name text default null,
  p_org_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_meta_full_name text;
  v_meta_org_name text;
  v_resolved_name text;
  v_resolved_org_name text;
  v_existing_org_id uuid;
  v_new_org_id uuid;
  v_slug_base text;
  v_slug text;
begin
  if v_uid is null then
    raise exception 'unauthenticated: valid session required to bootstrap account'
      using errcode = '42501';
  end if;

  select
    u.email,
    nullif(left(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), 120), ''),
    nullif(left(trim(coalesce(u.raw_user_meta_data->>'organization_name', '')), 120), '')
  into v_email, v_meta_full_name, v_meta_org_name
  from auth.users u
  where u.id = v_uid;

  v_resolved_name := coalesce(
    nullif(left(trim(coalesce(p_full_name, '')), 120), ''),
    v_meta_full_name,
    nullif(split_part(coalesce(v_email, ''), '@', 1), ''),
    'Client Account'
  );

  -- 1) Ensure profile exists (never overwrites existing staff status or role)
  insert into public.profiles (id, full_name, is_staff, role)
  values (v_uid, v_resolved_name, false, null)
  on conflict (id) do update
    set full_name = coalesce(nullif(trim(public.profiles.full_name), ''), excluded.full_name),
        updated_at = timezone('utc', now());

  -- 2) Check if user already belongs to an organization
  select om.organization_id
  into v_existing_org_id
  from public.organization_memberships om
  where om.user_id = v_uid
  order by om.created_at asc
  limit 1;

  if v_existing_org_id is not null then
    return jsonb_build_object(
      'profile_id', v_uid,
      'organization_id', v_existing_org_id,
      'created_org', false
    );
  end if;

  -- 3) Provision default client workspace organization atomically
  v_resolved_org_name := coalesce(
    nullif(left(trim(coalesce(p_org_name, '')), 120), ''),
    v_meta_org_name,
    v_resolved_name || ' Workspace'
  );
  if char_length(v_resolved_org_name) < 2 then
    v_resolved_org_name := 'Client Workspace';
  end if;

  v_slug_base := regexp_replace(lower(v_resolved_org_name), '[^a-z0-9]+', '-', 'g');
  v_slug_base := trim(both '-' from left(v_slug_base, 42));
  if v_slug_base = '' then
    v_slug_base := 'workspace';
  end if;
  v_slug := v_slug_base || '-' || substr(replace(v_uid::text, '-', ''), 1, 8);

  insert into public.organizations (name, slug)
  values (v_resolved_org_name, v_slug)
  on conflict (slug) do update
    set updated_at = timezone('utc', now())
  returning id into v_new_org_id;

  insert into public.organization_memberships (organization_id, user_id, role)
  values (v_new_org_id, v_uid, 'owner')
  on conflict (organization_id, user_id) do nothing;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after_data)
  values (
    v_new_org_id,
    v_uid,
    'organization.self_bootstrapped',
    'organization',
    v_new_org_id::text,
    jsonb_build_object('name', v_resolved_org_name, 'slug', v_slug)
  );

  return jsonb_build_object(
    'profile_id', v_uid,
    'organization_id', v_new_org_id,
    'created_org', true
  );
end;
$$;

revoke all on function public.ensure_client_account_bootstrap(text, text) from public;
grant execute on function public.ensure_client_account_bootstrap(text, text) to authenticated;
grant execute on function public.ensure_client_account_bootstrap(text, text) to service_role;

-- =============================================================================
-- 4. IDEMPOTENT BACKFILL FOR ANY EXISTING AUTH.USERS MISSING A PROFILE
-- =============================================================================
do $$
begin
  insert into public.profiles (id, full_name, is_staff, role)
  select
    u.id,
    nullif(left(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), 120), ''),
    false,
    null
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null
  on conflict (id) do nothing;
exception when others then
  raise notice 'Skipping auth.users profile backfill in restricted role: %', sqlerrm;
end $$;

commit;
