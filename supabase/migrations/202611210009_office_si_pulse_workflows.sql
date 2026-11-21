-- NotRealEngine — Migration 202611210009: RLS Repair Verification, NRE OFFICE Collaboration,
-- Human-Supervised SI Workflow, NRE PULSE Operations, and Legacy Order Provisioning Continuity
-- Timestamp: 2026-11-21
-- Governance:
--   - Idempotently enforces verified 0-arg public.current_user_is_staff() and 1-arg public.is_org_member(uuid)
--     across project_timeline_events, si_suggestions, and support_tickets.
--   - Enforces cross-tenant project-to-organization consistency via public.verify_project_organization_match().
--   - Adds project_assignments (human experts), project_messages (client/staff communications),
--     and pulse_subscriptions (manual eligibility & coverage tracking with recurring billing OFF).
--   - Expands si_suggestions with strict Draft -> Under Review -> Approved/Rejected -> Applied guards.
--   - Preserves historical SVC-* order provisioning without activating retired public catalog items.

begin;

-- =============================================================================
-- 1. IDEMPOTENT RLS & CROSS-TENANT CONSISTENCY HARDENING ON 0008 TABLES
-- =============================================================================
drop trigger if exists trg_verify_project_timeline_org on public.project_timeline_events;
create trigger trg_verify_project_timeline_org
  before insert or update of project_id, organization_id on public.project_timeline_events
  for each row execute function public.verify_project_organization_match();

drop policy if exists "org_members_read_project_timeline" on public.project_timeline_events;
create policy "org_members_read_project_timeline"
  on public.project_timeline_events for select to authenticated
  using (
    public.current_user_is_staff()
    or (
      visible_to_client = true
      and exists (
        select 1 from public.projects p
        where p.id = project_id
          and p.organization_id = organization_id
          and public.is_org_member(organization_id)
      )
    )
  );

drop policy if exists "staff_manage_project_timeline" on public.project_timeline_events;
create policy "staff_manage_project_timeline"
  on public.project_timeline_events for all to authenticated
  using (public.current_user_is_staff())
  with check (
    public.current_user_is_staff()
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.organization_id = organization_id
    )
  );

-- Ensure staff can manage support tickets under RLS (0001/0004 only defined SELECT and INSERT)
drop policy if exists "tickets_staff_all" on public.support_tickets;
create policy "tickets_staff_all"
  on public.support_tickets for all to authenticated
  using (public.current_user_is_staff())
  with check (public.current_user_is_staff());

grant select, insert, update, delete on public.si_suggestions to authenticated;
grant select, insert, update, delete on public.project_timeline_events to authenticated;

-- =============================================================================
-- 2. NRE OFFICE — HUMAN EXPERT ASSIGNMENTS (REAL STAFF ONLY)
-- =============================================================================
create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assignee_id uuid not null references public.profiles(id) on delete cascade,
  role_label text not null check (char_length(trim(role_label)) between 2 and 80),
  assigned_by uuid not null references public.profiles(id),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, assignee_id, role_label)
);

create index if not exists idx_project_assignments_project
  on public.project_assignments (project_id, active);

drop trigger if exists trg_verify_project_assignments_org on public.project_assignments;
create trigger trg_verify_project_assignments_org
  before insert or update of project_id, organization_id on public.project_assignments
  for each row execute function public.verify_project_organization_match();

alter table public.project_assignments enable row level security;

drop policy if exists "org_members_read_project_assignments" on public.project_assignments;
create policy "org_members_read_project_assignments"
  on public.project_assignments for select to authenticated
  using (
    public.current_user_is_staff()
    or (
      active = true
      and exists (
        select 1 from public.projects p
        where p.id = project_id
          and p.organization_id = organization_id
          and public.is_org_member(organization_id)
      )
    )
  );

drop policy if exists "staff_manage_project_assignments" on public.project_assignments;
create policy "staff_manage_project_assignments"
  on public.project_assignments for all to authenticated
  using (public.current_user_is_staff())
  with check (
    public.current_user_is_staff()
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.organization_id = organization_id
    )
  );

grant select, insert, update, delete on public.project_assignments to authenticated;

-- =============================================================================
-- 3. NRE OFFICE — PROJECT CLIENT & STAFF COMMUNICATIONS
-- =============================================================================
create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 2 and 4000),
  internal_only boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_project_messages_project
  on public.project_messages (project_id, created_at asc);

drop trigger if exists trg_verify_project_messages_org on public.project_messages;
create trigger trg_verify_project_messages_org
  before insert or update of project_id, organization_id on public.project_messages
  for each row execute function public.verify_project_organization_match();

alter table public.project_messages enable row level security;

drop policy if exists "org_members_read_project_messages" on public.project_messages;
create policy "org_members_read_project_messages"
  on public.project_messages for select to authenticated
  using (
    public.current_user_is_staff()
    or (
      internal_only = false
      and exists (
        select 1 from public.projects p
        where p.id = project_id
          and p.organization_id = organization_id
          and public.is_org_member(organization_id)
      )
    )
  );

drop policy if exists "org_members_insert_project_messages" on public.project_messages;
create policy "org_members_insert_project_messages"
  on public.project_messages for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      (
        public.current_user_is_staff()
        and exists (
          select 1 from public.projects p
          where p.id = project_id
            and p.organization_id = organization_id
        )
      )
      or (
        internal_only = false
        and exists (
          select 1 from public.projects p
          where p.id = project_id
            and p.organization_id = organization_id
            and public.is_org_member(organization_id)
        )
      )
    )
  );

grant select, insert on public.project_messages to authenticated;

-- =============================================================================
-- 4. HUMAN-SUPERVISED SI SUGGESTIONS WORKFLOW HARDENING
--    Draft -> Under Review -> Approved / Rejected -> Applied (Never Autonomous)
-- =============================================================================
alter table public.si_suggestions
  add column if not exists title text not null default 'SI Draft Suggestion',
  add column if not exists rationale text not null default '',
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists approved_at timestamptz,
  add column if not exists decision_note text,
  add column if not exists applied_action_ref text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- Replace status check constraint cleanly to support explicit approval workflow
do $$
declare
  c_name text;
begin
  select conname into c_name
  from pg_constraint
  where conrelid = 'public.si_suggestions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';
  if c_name is not null then
    execute format('alter table public.si_suggestions drop constraint %I', c_name);
  end if;
end $$;

alter table public.si_suggestions
  add constraint si_suggestions_status_check
  check (status in ('draft', 'under_review', 'reviewed', 'approved', 'rejected', 'applied', 'dismissed'));

create or replace function public.validate_si_suggestion_transition()
returns trigger language plpgsql set search_path = public as $$
declare
  allowed boolean := false;
begin
  if new.status = old.status then
    return new;
  end if;

  allowed := (
    (old.status = 'draft' and new.status in ('under_review', 'approved', 'rejected', 'dismissed'))
    or (old.status in ('under_review', 'reviewed') and new.status in ('approved', 'rejected', 'dismissed'))
    or (old.status = 'approved' and new.status in ('applied', 'dismissed'))
  );

  if not allowed then
    raise exception 'invalid_si_suggestion_transition:%:%', old.status, new.status
      using errcode = 'check_violation';
  end if;

  if new.status = 'approved' and new.approved_by is null then
    raise exception 'human_approval_required: approved_by must be set by human reviewer'
      using errcode = 'check_violation';
  end if;

  if new.status = 'applied' and (old.approved_by is null or coalesce(trim(new.applied_action_ref), '') = '') then
    raise exception 'authorized_action_required: only human-approved suggestions with an action reference may be applied'
      using errcode = 'check_violation';
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end $$;

drop trigger if exists si_suggestions_transition_guard on public.si_suggestions;
create trigger si_suggestions_transition_guard
  before update of status on public.si_suggestions
  for each row execute function public.validate_si_suggestion_transition();

drop policy if exists "staff_manage_si_suggestions" on public.si_suggestions;
create policy "staff_manage_si_suggestions"
  on public.si_suggestions for all to authenticated
  using (public.current_user_is_staff())
  with check (public.current_user_is_staff());

-- =============================================================================
-- 5. NRE PULSE OPERATIONS — ELIGIBILITY REVIEWS & COVERAGE ASSIGNMENTS
--    (Recurring billing strictly disabled until founder authorization)
-- =============================================================================
create table if not exists public.pulse_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  plan_id text not null references public.pulse_plans(id),
  status text not null default 'inquiry'
    check (status in ('inquiry', 'eligibility_review', 'approved_manual', 'active_manual', 'paused', 'closed')),
  coverage_module_ids text[] not null default '{}',
  billing_mode text not null default 'manual_invoicing_only'
    check (billing_mode = 'manual_invoicing_only'),
  scope_notes text not null default '',
  requested_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_pulse_subscriptions_org
  on public.pulse_subscriptions (organization_id, created_at desc);

drop trigger if exists trg_verify_pulse_subscriptions_org on public.pulse_subscriptions;
create trigger trg_verify_pulse_subscriptions_org
  before insert or update of project_id, organization_id on public.pulse_subscriptions
  for each row execute function public.verify_project_organization_match();

alter table public.pulse_subscriptions enable row level security;

drop policy if exists "org_members_read_pulse_subscriptions" on public.pulse_subscriptions;
create policy "org_members_read_pulse_subscriptions"
  on public.pulse_subscriptions for select to authenticated
  using (
    public.current_user_is_staff()
    or public.is_org_member(organization_id)
  );

drop policy if exists "org_members_request_pulse_eligibility" on public.pulse_subscriptions;
create policy "org_members_request_pulse_eligibility"
  on public.pulse_subscriptions for insert to authenticated
  with check (
    requested_by = auth.uid()
    and status = 'inquiry'
    and billing_mode = 'manual_invoicing_only'
    and (
      public.current_user_is_staff()
      or public.is_org_member(organization_id)
    )
    and (
      project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = project_id
          and p.organization_id = organization_id
      )
    )
  );

drop policy if exists "staff_manage_pulse_subscriptions" on public.pulse_subscriptions;
create policy "staff_manage_pulse_subscriptions"
  on public.pulse_subscriptions for all to authenticated
  using (public.current_user_is_staff())
  with check (public.current_user_is_staff());

grant select, insert, update, delete on public.pulse_subscriptions to authenticated;

-- =============================================================================
-- 6. PRESERVE HISTORICAL SVC-* ORDER PROVISIONING CONTINUITY
-- =============================================================================
create or replace function public.initialize_project_from_order(
  p_order_id uuid,
  p_service_id text default null,
  p_requirements jsonb default null,
  p_milestones jsonb default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  existing_project_id uuid;
  new_project_id uuid;
  resolved_service_id text;
  rev_limit integer;
  req_item jsonb;
  ms_item jsonb;
  idx integer := 0;
  has_clearance boolean := false;
  is_valid_service boolean := false;
begin
  if not public.current_user_is_staff() and current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'unauthorized_staff_only';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if o.id is null then
    raise exception 'order_not_found';
  end if;

  select id into existing_project_id from public.projects where order_id = o.id;
  if existing_project_id is not null then
    return existing_project_id;
  end if;

  if o.state not in ('confirmed', 'in_production') then
    raise exception 'order_not_confirmed: order must be confirmed before provisioning a project workspace (current state: %)', o.state;
  end if;

  select (
    exists (
      select 1 from public.payment_transactions pt
      where pt.order_id = o.id
        and pt.state = 'paid'
        and pt.verified_at is not null
        and pt.currency = o.currency
        and pt.amount_minor >= o.total_minor
    )
    or (
      coalesce(o.commercial_snapshot->'settlement'->>'status', '') = 'approved_manual_settlement'
      and coalesce(trim(o.commercial_snapshot->'settlement'->>'reference'), '') <> ''
    )
  ) into has_clearance;

  if not has_clearance then
    raise exception 'order_lacks_financial_clearance: order % lacks verified payment or approved manual settlement', o.id;
  end if;

  resolved_service_id := coalesce(
    nullif(trim(p_service_id), ''),
    (
      select pb.service_id
      from public.quotes q
      join public.project_briefs pb on pb.id = q.project_brief_id
      where q.id = o.quote_id
    ),
    nullif(trim(o.commercial_snapshot->>'serviceId'), '')
  );

  -- Allow active canonical v5 services OR archived legacy SVC-* aliases (never retired S16/S20 or unknown IDs)
  select (
    resolved_service_id is not null
    and (
      exists (select 1 from public.services s where s.id = resolved_service_id and s.active)
      or exists (select 1 from public.service_legacy_aliases a where a.legacy_service_id = resolved_service_id)
    )
  ) into is_valid_service;

  if not is_valid_service then
    raise exception 'invalid_service_reference: order % does not reference a valid active canonical or archived legacy service (%).', o.id, coalesce(resolved_service_id, 'NULL');
  end if;

  rev_limit := coalesce((o.commercial_snapshot->>'revisionLimit')::integer, 2);

  insert into public.projects(order_id, organization_id, service_id, state, revision_limit, revision_count)
  values (o.id, o.organization_id, resolved_service_id, 'awaiting_requirements', rev_limit, 0)
  returning id into new_project_id;

  if p_requirements is not null and jsonb_typeof(p_requirements) = 'array' and jsonb_array_length(p_requirements) > 0 then
    for req_item in select * from jsonb_array_elements(p_requirements) loop
      insert into public.project_requirements(project_id, key, label, required)
      values (
        new_project_id,
        req_item->>'key',
        req_item->>'label',
        coalesce((req_item->>'required')::boolean, true)
      );
    end loop;
  else
    insert into public.project_requirements(project_id, key, label, required)
    values
      (new_project_id, 'brand_assets', 'Brand Assets & Identity (Logos, Vectors, Color Palette, Brand Guide)', true),
      (new_project_id, 'content_copy', 'Primary Content Copy, Offer Descriptions, and Media Files', true),
      (new_project_id, 'infrastructure_credentials', 'Hosting / DNS / Domain Access Requirements', false);
  end if;

  if p_milestones is not null and jsonb_typeof(p_milestones) = 'array' and jsonb_array_length(p_milestones) > 0 then
    for ms_item in select * from jsonb_array_elements(p_milestones) loop
      idx := idx + 1;
      insert into public.milestones(project_id, label, state, display_order)
      values (
        new_project_id,
        ms_item->>'label',
        coalesce(ms_item->>'state', 'pending'),
        coalesce((ms_item->>'display_order')::integer, idx)
      );
    end loop;
  else
    insert into public.milestones(project_id, label, state, display_order)
    values
      (new_project_id, 'Requirement Verification & Technical Architecture', 'pending', 1),
      (new_project_id, 'Core Module Implementation & Integration', 'pending', 2),
      (new_project_id, 'Internal Security & QA Validation', 'pending', 3),
      (new_project_id, 'Client UAT & Sign-off Review', 'pending', 4),
      (new_project_id, 'Production Deployment & Handover', 'pending', 5);
  end if;

  insert into public.project_timeline_events(project_id, organization_id, event_type, title, detail, visible_to_client, actor_id)
  values (
    new_project_id,
    o.organization_id,
    'project.initialized',
    'Project Workspace Provisioned',
    'Order cleared and workspace initialized with requirements and delivery milestones.',
    true,
    auth.uid()
  );

  insert into public.outbox_events(aggregate_type, aggregate_id, event_type, payload, state, idempotency_key)
  values (
    'project',
    new_project_id::text,
    'Project Created',
    jsonb_build_object('projectId', new_project_id, 'orderId', o.id, 'organizationId', o.organization_id, 'serviceId', resolved_service_id),
    'disabled',
    'project-created:' || new_project_id::text
  ) on conflict (idempotency_key) do nothing;

  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_data)
  values (
    o.organization_id,
    auth.uid(),
    'project.initialized',
    'project',
    new_project_id::text,
    jsonb_build_object('orderId', o.id, 'serviceId', resolved_service_id, 'revisionLimit', rev_limit)
  );

  return new_project_id;
end $$;

revoke all on function public.initialize_project_from_order(uuid,text,jsonb,jsonb) from public;
grant execute on function public.initialize_project_from_order(uuid,text,jsonb,jsonb) to authenticated;
grant execute on function public.initialize_project_from_order(uuid,text,jsonb,jsonb) to service_role;

commit;
