begin;

create extension if not exists pgcrypto;

create type public.membership_role as enum ('owner','admin','member','viewer');
create type public.quote_state as enum ('draft','under_review','sent','accepted','rejected','expired','superseded');
create type public.order_state as enum ('draft','awaiting_acceptance','awaiting_payment','confirmed','in_production','completed','cancelled','on_hold');
create type public.project_state as enum ('awaiting_requirements','requirements_review','ready_for_production','in_progress','internal_qa','client_review','revision','approved','delivered','on_hold','cancelled');
create type public.payment_state as enum ('pending','processing','paid','failed','refunded','partially_refunded','disputed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  is_staff boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.services (
  id text primary key,
  category_id text not null,
  slug text not null unique,
  name text not null,
  summary text not null,
  sales_mode text not null check (sales_mode in ('quote_required','fixed_checkout','configurable_checkout')),
  active boolean not null default true,
  canonical boolean not null default true,
  display_order integer not null check (display_order > 0),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index services_canonical_order on public.services(display_order) where canonical;

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  service_id text not null references public.services(id),
  name text not null,
  status text not null check (status in ('draft','pending_approval','approved','retired')),
  active boolean not null default false,
  orderable boolean not null default false,
  approval_metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not orderable or (active and status = 'approved' and approval_metadata is not null))
);

create table public.price_versions (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  kind text not null check (kind in ('regular','promotional','addon','recurring')),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency in ('BDT','USD')),
  market text not null check (market in ('BD','US','GLOBAL')),
  recurring_interval text check (recurring_interval in ('week','month','year')),
  status text not null check (status in ('draft','pending_approval','approved','retired')),
  valid_from timestamptz not null,
  valid_to timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from),
  check (status <> 'approved' or (approved_at is not null and approved_by is not null))
);

create table public.feature_definitions (
  id text primary key,
  service_id text not null references public.services(id) on delete cascade,
  label text not null,
  included boolean not null default false,
  requires_ids text[] not null default '{}',
  conflicts_ids text[] not null default '{}',
  active boolean not null default true
);

create table public.configuration_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id),
  organization_id uuid references public.organizations(id),
  opaque_token_hash text unique,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_id is not null or opaque_token_hash is not null)
);

create table public.project_briefs (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  owner_id uuid references public.profiles(id),
  organization_id uuid references public.organizations(id),
  service_id text not null references public.services(id),
  status text not null default 'submitted' check (status in ('submitted','under_review','qualified','closed')),
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,
  organization_name text,
  payload jsonb not null,
  attribution jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  project_brief_id uuid not null unique references public.project_briefs(id) on delete cascade,
  status text not null default 'new' check (status in ('new','reviewing','qualified','unqualified','converted','closed')),
  owner_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  project_brief_id uuid references public.project_briefs(id),
  state public.quote_state not null default 'draft',
  currency text not null check (currency in ('BDT','USD')),
  total_minor bigint not null default 0 check (total_minor >= 0),
  revision_limit integer not null default 0 check (revision_limit >= 0),
  valid_until timestamptz,
  terms_version text,
  scope jsonb not null default '{}'::jsonb,
  snapshot jsonb,
  sent_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (state not in ('sent','accepted') or (valid_until is not null and terms_version is not null and total_minor > 0))
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  label text not null,
  description text,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_amount_minor bigint not null check (unit_amount_minor >= 0),
  recurring_interval text check (recurring_interval in ('week','month','year')),
  display_order integer not null default 1
);

create table public.quote_acceptances (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null unique references public.quotes(id),
  organization_id uuid not null references public.organizations(id),
  accepted_by uuid not null references public.profiles(id),
  decision text not null check (decision in ('accepted','rejected')),
  accepted_snapshot jsonb not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null unique references public.quotes(id),
  organization_id uuid not null references public.organizations(id),
  state public.order_state not null default 'awaiting_payment',
  currency text not null check (currency in ('BDT','USD')),
  total_minor bigint not null check (total_minor > 0),
  commercial_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  organization_id uuid not null references public.organizations(id),
  provider text not null,
  provider_event_id text unique,
  provider_transaction_id text,
  state public.payment_state not null default 'pending',
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency in ('BDT','USD')),
  recurring boolean not null default false,
  verified_at timestamptz,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  check (state <> 'paid' or (verified_at is not null and provider_event_id is not null))
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  organization_id uuid not null references public.organizations(id),
  status text not null check (status in ('draft','issued','paid','void','overdue')),
  total_minor bigint not null check (total_minor > 0),
  currency text not null check (currency in ('BDT','USD')),
  issued_at timestamptz,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id),
  organization_id uuid not null references public.organizations(id),
  service_id text not null references public.services(id),
  state public.project_state not null default 'awaiting_requirements',
  revision_limit integer not null default 0 check (revision_limit >= 0),
  revision_count integer not null default 0 check (revision_count >= 0 and revision_count <= revision_limit),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  key text not null,
  label text not null,
  required boolean not null default true,
  response jsonb,
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz,
  unique(project_id, key)
);

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  state text not null default 'pending' check (state in ('pending','in_progress','complete','blocked')),
  display_order integer not null,
  due_at timestamptz,
  completed_at timestamptz
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  assigned_to uuid references public.profiles(id),
  label text not null,
  state text not null default 'todo' check (state in ('todo','in_progress','blocked','done')),
  due_at timestamptz
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  kind text not null,
  decision text not null check (decision in ('approved','changes_requested')),
  decided_by uuid not null references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create table public.revision_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  requested_by uuid not null references public.profiles(id),
  sequence integer not null check (sequence > 0),
  request text not null check (char_length(request) between 10 and 5000),
  state text not null default 'submitted' check (state in ('submitted','accepted','in_progress','complete','declined')),
  created_at timestamptz not null default now(),
  unique(project_id, sequence)
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  project_id uuid references public.projects(id),
  opened_by uuid not null references public.profiles(id),
  subject text not null check (char_length(subject) between 5 and 200),
  body text not null check (char_length(body) between 15 and 5000),
  state text not null default 'open' check (state in ('open','waiting_client','waiting_staff','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  user_id uuid references public.profiles(id),
  event_type text not null,
  channel text not null check (channel in ('in_app','email','sms','messaging')),
  state text not null default 'pending' check (state in ('pending','processing','sent','failed','disabled')),
  payload jsonb not null,
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_error text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  payload jsonb not null,
  state text not null default 'pending' check (state in ('pending','processing','processed','failed','disabled')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id),
  user_id uuid references public.profiles(id),
  anonymous_id text,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payload_hash text not null,
  state text not null default 'received' check (state in ('received','verified','processed','rejected','failed')),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

create table public.rate_limit_buckets (
  key_hash text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 1,
  primary key (key_hash, bucket_start)
);

create or replace function public.current_user_is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_staff from public.profiles where id = auth.uid()), false) $$;

create or replace function public.is_org_member(org_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.organization_memberships where organization_id = org_id and user_id = auth.uid()) $$;

create or replace function public.is_org_admin(org_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.organization_memberships where organization_id = org_id and user_id = auth.uid() and role in ('owner','admin')) $$;

revoke all on function public.current_user_is_staff() from public;
revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.current_user_is_staff() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;

create or replace function public.validate_state_transition()
returns trigger language plpgsql set search_path = public as $$
declare allowed boolean := false;
begin
  if new.state = old.state then return new; end if;
  if tg_table_name = 'quotes' then
    allowed := (old.state = 'draft' and new.state = 'under_review') or (old.state = 'under_review' and new.state in ('draft','sent')) or (old.state = 'sent' and new.state in ('accepted','rejected','expired','superseded')) or (old.state = 'accepted' and new.state = 'superseded');
  elsif tg_table_name = 'orders' then
    allowed := (old.state = 'draft' and new.state in ('awaiting_acceptance','cancelled')) or (old.state = 'awaiting_acceptance' and new.state in ('awaiting_payment','cancelled')) or (old.state = 'awaiting_payment' and new.state in ('confirmed','cancelled','on_hold')) or (old.state = 'confirmed' and new.state in ('in_production','on_hold','cancelled')) or (old.state = 'in_production' and new.state in ('completed','on_hold','cancelled')) or (old.state = 'on_hold' and new.state in ('awaiting_payment','confirmed','in_production','cancelled'));
  elsif tg_table_name = 'projects' then
    allowed := (old.state = 'awaiting_requirements' and new.state in ('requirements_review','on_hold','cancelled')) or (old.state = 'requirements_review' and new.state in ('awaiting_requirements','ready_for_production','on_hold','cancelled')) or (old.state = 'ready_for_production' and new.state in ('in_progress','on_hold','cancelled')) or (old.state = 'in_progress' and new.state in ('internal_qa','on_hold','cancelled')) or (old.state = 'internal_qa' and new.state in ('in_progress','client_review','on_hold')) or (old.state = 'client_review' and new.state in ('revision','approved','on_hold')) or (old.state = 'revision' and new.state in ('in_progress','client_review','on_hold')) or (old.state = 'approved' and new.state = 'delivered') or (old.state = 'on_hold' and new.state not in ('delivered','approved'));
  end if;
  if not allowed then raise exception 'invalid_state_transition:%:%:%', tg_table_name, old.state, new.state using errcode = 'check_violation'; end if;
  return new;
end $$;

create trigger quotes_state_guard before update of state on public.quotes for each row execute function public.validate_state_transition();
create trigger orders_state_guard before update of state on public.orders for each row execute function public.validate_state_transition();
create trigger projects_state_guard before update of state on public.projects for each row execute function public.validate_state_transition();

create or replace function public.prevent_mutation()
returns trigger language plpgsql as $$ begin raise exception 'immutable_record' using errcode = 'check_violation'; end $$;
create trigger quote_acceptances_immutable before update or delete on public.quote_acceptances for each row execute function public.prevent_mutation();
create trigger audit_logs_immutable before update or delete on public.audit_logs for each row execute function public.prevent_mutation();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles(id, full_name) values(new.id, nullif(new.raw_user_meta_data->>'full_name','')) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.submit_project_brief(p_payload jsonb, p_request_hash text, p_reference text)
returns uuid language plpgsql security definer set search_path = public as $$
declare bucket timestamptz := date_trunc('hour', now()) + (floor(extract(minute from now()) / 10) * interval '10 minutes');
declare count_now integer; declare brief_id uuid; declare chosen_service text := p_payload->>'serviceId';
begin
  if p_payload->>'consent' <> 'true' then raise exception 'consent_required'; end if;
  if not exists(select 1 from public.services where id = chosen_service and active) then raise exception 'invalid_service'; end if;
  if char_length(coalesce(p_payload->>'problem','')) not between 20 and 3000 then raise exception 'invalid_problem'; end if;
  if char_length(coalesce(p_payload->>'email','')) > 320 or position('@' in coalesce(p_payload->>'email','')) = 0 then raise exception 'invalid_email'; end if;
  insert into public.rate_limit_buckets(key_hash,bucket_start,request_count) values(p_request_hash,bucket,1)
  on conflict(key_hash,bucket_start) do update set request_count = public.rate_limit_buckets.request_count + 1 returning request_count into count_now;
  if count_now > 3 then raise exception 'rate_limit_exceeded'; end if;
  insert into public.project_briefs(reference,service_id,contact_name,contact_email,contact_phone,organization_name,payload,attribution)
  values(p_reference,chosen_service,p_payload->>'name',lower(p_payload->>'email'),p_payload->>'phone',nullif(p_payload->>'organization',''),p_payload - 'name' - 'email' - 'phone' - 'organization' - 'consent',coalesce(p_payload->'attribution','{}'::jsonb)) returning id into brief_id;
  insert into public.leads(project_brief_id) values(brief_id);
  insert into public.outbox_events(aggregate_type,aggregate_id,event_type,payload,state,idempotency_key)
  values('project_brief',brief_id::text,'Lead Submitted',jsonb_build_object('project_brief_id',brief_id),'disabled','lead-submitted:'||brief_id::text);
  insert into public.audit_logs(action,entity_type,entity_id,after_data) values('project_brief.submitted','project_brief',brief_id::text,jsonb_build_object('reference',p_reference,'service_id',chosen_service));
  return brief_id;
end $$;

revoke all on function public.submit_project_brief(jsonb,text,text) from public;
grant execute on function public.submit_project_brief(jsonb,text,text) to anon;

create or replace function public.decide_quote(p_quote_id uuid, p_decision text, p_ip_hash text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare q public.quotes; declare acceptance_id uuid; declare order_id uuid;
begin
  select * into q from public.quotes where id = p_quote_id for update;
  if q.id is null or not public.is_org_member(q.organization_id) then raise exception 'quote_not_found'; end if;
  if q.state <> 'sent' or q.valid_until <= now() then raise exception 'quote_not_acceptable'; end if;
  if p_decision not in ('accepted','rejected') then raise exception 'invalid_decision'; end if;
  if q.snapshot is null then raise exception 'missing_snapshot'; end if;
  insert into public.quote_acceptances(quote_id,organization_id,accepted_by,decision,accepted_snapshot,ip_hash)
  values(q.id,q.organization_id,auth.uid(),p_decision,q.snapshot,p_ip_hash) returning id into acceptance_id;
  update public.quotes set state = p_decision::public.quote_state, updated_at = now() where id = q.id;
  if p_decision = 'accepted' then
    insert into public.orders(quote_id,organization_id,state,currency,total_minor,commercial_snapshot)
    values(q.id,q.organization_id,'awaiting_payment',q.currency,q.total_minor,q.snapshot)
    on conflict(quote_id) do update set quote_id = excluded.quote_id returning id into order_id;
    insert into public.outbox_events(aggregate_type,aggregate_id,event_type,payload,state,idempotency_key)
    values('quote',q.id::text,'Quote Accepted',jsonb_build_object('quote_id',q.id,'order_id',order_id),'disabled','quote-accepted:'||q.id::text);
  end if;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_data)
  values(q.organization_id,auth.uid(),'quote.'||p_decision,'quote',q.id::text,jsonb_build_object('acceptance_id',acceptance_id,'order_id',order_id));
  return coalesce(order_id, acceptance_id);
end $$;

revoke all on function public.decide_quote(uuid,text,text) from public;
grant execute on function public.decide_quote(uuid,text,text) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.services enable row level security;
alter table public.packages enable row level security;
alter table public.price_versions enable row level security;
alter table public.feature_definitions enable row level security;
alter table public.configuration_drafts enable row level security;
alter table public.project_briefs enable row level security;
alter table public.leads enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.quote_acceptances enable row level security;
alter table public.orders enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.invoices enable row level security;
alter table public.projects enable row level security;
alter table public.project_requirements enable row level security;
alter table public.project_files enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.approvals enable row level security;
alter table public.revision_requests enable row level security;
alter table public.support_tickets enable row level security;
alter table public.notifications enable row level security;
alter table public.outbox_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.analytics_events enable row level security;
alter table public.webhook_events enable row level security;
alter table public.rate_limit_buckets enable row level security;

create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid() or public.current_user_is_staff());
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and (not is_staff or public.current_user_is_staff()));
create policy organizations_member_select on public.organizations for select to authenticated using (public.is_org_member(id) or public.current_user_is_staff());
create policy memberships_member_select on public.organization_memberships for select to authenticated using (user_id = auth.uid() or public.is_org_admin(organization_id) or public.current_user_is_staff());
create policy services_public_select on public.services for select using (active);
create policy packages_public_approved on public.packages for select using (active and orderable and status = 'approved');
create policy prices_public_approved on public.price_versions for select using (status = 'approved' and valid_from <= now() and (valid_to is null or valid_to >= now()));
create policy features_public_select on public.feature_definitions for select using (active);
create policy services_staff_all on public.services for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy packages_staff_all on public.packages for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy prices_staff_all on public.price_versions for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy features_staff_all on public.feature_definitions for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy drafts_owner_all on public.configuration_drafts for all to authenticated using (owner_id = auth.uid() or public.current_user_is_staff()) with check (owner_id = auth.uid() or public.current_user_is_staff());
create policy briefs_org_select on public.project_briefs for select to authenticated using ((organization_id is not null and public.is_org_member(organization_id)) or public.current_user_is_staff());
create policy briefs_staff_update on public.project_briefs for update to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy leads_staff_all on public.leads for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy quotes_org_select on public.quotes for select to authenticated using (public.is_org_member(organization_id) or public.current_user_is_staff());
create policy quotes_staff_all on public.quotes for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy quote_items_org_select on public.quote_items for select to authenticated using (exists(select 1 from public.quotes q where q.id = quote_id and (public.is_org_member(q.organization_id) or public.current_user_is_staff())));
create policy quote_items_staff_all on public.quote_items for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy acceptances_org_select on public.quote_acceptances for select to authenticated using (public.is_org_member(organization_id) or public.current_user_is_staff());
create policy orders_org_select on public.orders for select to authenticated using (public.is_org_member(organization_id) or public.current_user_is_staff());
create policy orders_staff_all on public.orders for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy payments_org_select on public.payment_transactions for select to authenticated using (public.is_org_member(organization_id) or public.current_user_is_staff());
create policy payments_staff_all on public.payment_transactions for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy invoices_org_select on public.invoices for select to authenticated using (public.is_org_member(organization_id) or public.current_user_is_staff());
create policy invoices_staff_all on public.invoices for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy projects_org_select on public.projects for select to authenticated using (public.is_org_member(organization_id) or public.current_user_is_staff());
create policy projects_staff_all on public.projects for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy requirements_project_select on public.project_requirements for select to authenticated using (exists(select 1 from public.projects p where p.id = project_id and (public.is_org_member(p.organization_id) or public.current_user_is_staff())));
create policy requirements_project_update on public.project_requirements for update to authenticated using (exists(select 1 from public.projects p where p.id = project_id and (public.is_org_member(p.organization_id) or public.current_user_is_staff()))) with check (exists(select 1 from public.projects p where p.id = project_id and (public.is_org_member(p.organization_id) or public.current_user_is_staff())));
create policy files_org_select on public.project_files for select to authenticated using (public.is_org_member(organization_id) or public.current_user_is_staff());
create policy files_org_insert on public.project_files for insert to authenticated with check ((public.is_org_member(organization_id) or public.current_user_is_staff()) and uploaded_by = auth.uid());
create policy milestones_project_select on public.milestones for select to authenticated using (exists(select 1 from public.projects p where p.id = project_id and (public.is_org_member(p.organization_id) or public.current_user_is_staff())));
create policy milestones_staff_all on public.milestones for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy tasks_staff_all on public.tasks for all to authenticated using (public.current_user_is_staff()) with check (public.current_user_is_staff());
create policy approvals_org_select on public.approvals for select to authenticated using (public.is_org_member(organization_id) or public.current_user_is_staff());
create policy approvals_org_insert on public.approvals for insert to authenticated with check ((public.is_org_member(organization_id) or public.current_user_is_staff()) and decided_by = auth.uid());
create policy revisions_org_select on public.revision_requests for select to authenticated using (public.is_org_member(organization_id) or public.current_user_is_staff());
create policy revisions_org_insert on public.revision_requests for insert to authenticated with check (public.is_org_member(organization_id) and requested_by = auth.uid());
create policy tickets_org_select on public.support_tickets for select to authenticated using (public.is_org_member(organization_id) or public.current_user_is_staff());
create policy tickets_org_insert on public.support_tickets for insert to authenticated with check ((public.is_org_member(organization_id) or public.current_user_is_staff()) and opened_by = auth.uid());
create policy notifications_recipient_select on public.notifications for select to authenticated using (user_id = auth.uid() or (organization_id is not null and public.is_org_member(organization_id)) or public.current_user_is_staff());
create policy outbox_staff_select on public.outbox_events for select to authenticated using (public.current_user_is_staff());
create policy audit_staff_select on public.audit_logs for select to authenticated using (public.current_user_is_staff());
create policy audit_org_select on public.audit_logs for select to authenticated using (organization_id is not null and public.is_org_admin(organization_id));
create policy analytics_staff_select on public.analytics_events for select to authenticated using (public.current_user_is_staff());
create policy webhooks_staff_select on public.webhook_events for select to authenticated using (public.current_user_is_staff());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('project-files','project-files',false,52428800,array['application/pdf','image/png','image/jpeg','text/plain','application/zip'])
on conflict(id) do nothing;

create policy project_files_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'project-files' and exists (
    select 1 from public.projects p where p.id::text = (storage.foldername(name))[1] and (public.is_org_member(p.organization_id) or public.current_user_is_staff())
  )
);
create policy project_files_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'project-files' and exists (
    select 1 from public.projects p where p.id::text = (storage.foldername(name))[1] and (public.is_org_member(p.organization_id) or public.current_user_is_staff())
  )
);

commit;
