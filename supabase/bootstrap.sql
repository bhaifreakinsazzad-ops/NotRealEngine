-- ==============================================================================
-- ENGINE//OS — CANONICAL STAGING DATABASE BOOTSTRAP (MIGRATIONS 0001 - 0004)
-- Platform: NOTREAL ENGINE, LLC
-- Purpose: Direct, single-run initialization in Supabase Cloud SQL Editor.
-- Note: This is an exact composition of canonical versioned migrations:
--   - 202611080001_engine_os_foundation.sql
--   - 202611080002_seed_canonical_services.sql
--   - 202611080003_security_hardening.sql
--   - 202611080004_security_remediation.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PART 1: FOUNDATION SCHEMA, STATE GUARDS & SECURITY POLICIES (0001)
-- ------------------------------------------------------------------------------

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.membership_role AS ENUM ('owner','admin','member','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quote_state AS ENUM ('draft','under_review','sent','accepted','rejected','expired','superseded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_state AS ENUM ('draft','awaiting_acceptance','awaiting_payment','confirmed','in_production','completed','cancelled','on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.project_state AS ENUM ('awaiting_requirements','requirements_review','ready_for_production','in_progress','internal_qa','client_review','revision','approved','delivered','on_hold','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_state AS ENUM ('pending','processing','paid','failed','refunded','partially_refunded','disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. CORE IDENTITY & ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  is_staff boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.membership_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

-- 3. CANONICAL SERVICE REGISTRY & PACKAGES
CREATE TABLE IF NOT EXISTS public.services (
  id text PRIMARY KEY,
  category_id text NOT NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  summary text NOT NULL,
  sales_mode text NOT NULL CHECK (sales_mode IN ('quote_required','fixed_checkout','configurable_checkout')),
  active boolean NOT NULL DEFAULT true,
  canonical boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL CHECK (display_order > 0),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'services_canonical_order') THEN
    CREATE UNIQUE INDEX services_canonical_order ON public.services(display_order) WHERE canonical;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id text NOT NULL REFERENCES public.services(id),
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft','pending_approval','approved','retired')),
  active boolean NOT NULL DEFAULT false,
  orderable boolean NOT NULL DEFAULT false,
  approval_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT orderable OR (active AND status = 'approved' AND approval_metadata IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.price_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('regular','promotional','addon','recurring')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency IN ('BDT','USD')),
  market text NOT NULL CHECK (market IN ('BD','US','GLOBAL')),
  recurring_interval text CHECK (recurring_interval IN ('week','month','year')),
  status text NOT NULL CHECK (status IN ('draft','pending_approval','approved','retired')),
  valid_from timestamptz NOT NULL,
  valid_to timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_to IS NULL OR valid_to > valid_from),
  CHECK (status <> 'approved' OR (approved_at IS NOT NULL AND approved_by IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.feature_definitions (
  id text PRIMARY KEY,
  service_id text NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  label text NOT NULL,
  included boolean NOT NULL DEFAULT false,
  requires_ids text[] NOT NULL DEFAULT '{}',
  conflicts_ids text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.configuration_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id),
  organization_id uuid REFERENCES public.organizations(id),
  opaque_token_hash text UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (owner_id IS NOT NULL OR opaque_token_hash IS NOT NULL)
);

-- 4. INTAKE & COMMERCIAL LIFECYCLE
CREATE TABLE IF NOT EXISTS public.project_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  owner_id uuid REFERENCES public.profiles(id),
  organization_id uuid REFERENCES public.organizations(id),
  service_id text NOT NULL REFERENCES public.services(id),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','qualified','closed')),
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  organization_name text,
  payload jsonb NOT NULL,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_brief_id uuid NOT NULL UNIQUE REFERENCES public.project_briefs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','qualified','unqualified','converted','closed')),
  owner_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_brief_id uuid REFERENCES public.project_briefs(id),
  state public.quote_state NOT NULL DEFAULT 'draft',
  currency text NOT NULL CHECK (currency IN ('BDT','USD')),
  total_minor bigint NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  revision_limit integer NOT NULL DEFAULT 0 CHECK (revision_limit >= 0),
  valid_until timestamptz,
  terms_version text,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot jsonb,
  sent_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (state NOT IN ('sent','accepted') OR (valid_until IS NOT NULL AND terms_version IS NOT NULL AND total_minor > 0))
);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_amount_minor bigint NOT NULL CHECK (unit_amount_minor >= 0),
  recurring_interval text CHECK (recurring_interval IN ('week','month','year')),
  display_order integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.quote_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL UNIQUE REFERENCES public.quotes(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  accepted_by uuid NOT NULL REFERENCES public.profiles(id),
  decision text NOT NULL CHECK (decision IN ('accepted','rejected')),
  accepted_snapshot jsonb NOT NULL,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL UNIQUE REFERENCES public.quotes(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  state public.order_state NOT NULL DEFAULT 'awaiting_payment',
  currency text NOT NULL CHECK (currency IN ('BDT','USD')),
  total_minor bigint NOT NULL CHECK (total_minor > 0),
  commercial_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  provider text NOT NULL,
  provider_event_id text UNIQUE,
  provider_transaction_id text,
  state public.payment_state NOT NULL DEFAULT 'pending',
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency IN ('BDT','USD')),
  recurring boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  raw_event jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (state <> 'paid' OR (verified_at IS NOT NULL AND provider_event_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  status text NOT NULL CHECK (status IN ('draft','issued','paid','void','overdue')),
  total_minor bigint NOT NULL CHECK (total_minor > 0),
  currency text NOT NULL CHECK (currency IN ('BDT','USD')),
  issued_at timestamptz,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. PROJECT WORKSPACE & OPERATIONS
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  service_id text NOT NULL REFERENCES public.services(id),
  state public.project_state NOT NULL DEFAULT 'awaiting_requirements',
  revision_limit integer NOT NULL DEFAULT 0 CHECK (revision_limit >= 0),
  revision_count integer NOT NULL DEFAULT 0 CHECK (revision_count >= 0 AND revision_count <= revision_limit),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  response jsonb,
  submitted_by uuid REFERENCES public.profiles(id),
  submitted_at timestamptz,
  UNIQUE (project_id, key)
);

CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  storage_path text NOT NULL UNIQUE,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 52428800),
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','in_progress','complete','blocked')),
  display_order integer NOT NULL,
  due_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id),
  label text NOT NULL,
  state text NOT NULL DEFAULT 'todo' CHECK (state IN ('todo','in_progress','blocked','done')),
  due_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  kind text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','changes_requested')),
  decided_by uuid NOT NULL REFERENCES public.profiles(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.revision_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  sequence integer NOT NULL CHECK (sequence > 0),
  request text NOT NULL CHECK (char_length(request) BETWEEN 10 AND 5000),
  state text NOT NULL DEFAULT 'submitted' CHECK (state IN ('submitted','accepted','in_progress','complete','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, sequence)
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid REFERENCES public.projects(id),
  opened_by uuid NOT NULL REFERENCES public.profiles(id),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 5 AND 200),
  body text NOT NULL CHECK (char_length(body) BETWEEN 15 AND 5000),
  state text NOT NULL DEFAULT 'open' CHECK (state IN ('open','waiting_client','waiting_staff','resolved','closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. SYSTEM LOGS & OUTBOX
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  user_id uuid REFERENCES public.profiles(id),
  event_type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('in_app','email','sms','messaging')),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','processing','sent','failed','disabled')),
  payload jsonb NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  last_error text,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','processing','processed','failed','disabled')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id),
  actor_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id),
  user_id uuid REFERENCES public.profiles(id),
  anonymous_id text,
  event_name text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  payload_hash text NOT NULL,
  state text NOT NULL DEFAULT 'received' CHECK (state IN ('received','verified','processed','rejected','failed')),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key_hash text NOT NULL,
  bucket_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key_hash, bucket_start)
);

-- 7. HELPER FUNCTIONS & RPCs
CREATE OR REPLACE FUNCTION public.current_user_is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT coalesce((SELECT is_staff FROM public.profiles WHERE id = auth.uid()), false) $$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT exists(SELECT 1 FROM public.organization_memberships WHERE organization_id = org_id AND user_id = auth.uid()) $$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT exists(SELECT 1 FROM public.organization_memberships WHERE organization_id = org_id AND user_id = auth.uid() AND role IN ('owner','admin')) $$;

REVOKE ALL ON FUNCTION public.current_user_is_staff() FROM public;
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.current_user_is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_state_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE allowed boolean := false;
BEGIN
  IF new.state = old.state THEN RETURN new; END IF;
  IF tg_table_name = 'quotes' THEN
    allowed := (old.state = 'draft' AND new.state = 'under_review') OR (old.state = 'under_review' AND new.state IN ('draft','sent')) OR (old.state = 'sent' AND new.state IN ('accepted','rejected','expired','superseded')) OR (old.state = 'accepted' AND new.state = 'superseded');
  ELSIF tg_table_name = 'orders' THEN
    allowed := (old.state = 'draft' AND new.state IN ('awaiting_acceptance','cancelled')) OR (old.state = 'awaiting_acceptance' AND new.state IN ('awaiting_payment','cancelled')) OR (old.state = 'awaiting_payment' AND new.state IN ('confirmed','cancelled','on_hold')) OR (old.state = 'confirmed' AND new.state IN ('in_production','on_hold','cancelled')) OR (old.state = 'in_production' AND new.state IN ('completed','on_hold','cancelled')) OR (old.state = 'on_hold' AND new.state IN ('awaiting_payment','confirmed','in_production','cancelled'));
  ELSIF tg_table_name = 'projects' THEN
    allowed := (old.state = 'awaiting_requirements' AND new.state IN ('requirements_review','on_hold','cancelled')) OR (old.state = 'requirements_review' AND new.state IN ('awaiting_requirements','ready_for_production','on_hold','cancelled')) OR (old.state = 'ready_for_production' AND new.state IN ('in_progress','on_hold','cancelled')) OR (old.state = 'in_progress' AND new.state IN ('internal_qa','on_hold','cancelled')) OR (old.state = 'internal_qa' AND new.state IN ('in_progress','client_review','on_hold')) OR (old.state = 'client_review' AND new.state IN ('revision','approved','on_hold')) OR (old.state = 'revision' AND new.state IN ('in_progress','client_review','on_hold')) OR (old.state = 'approved' AND new.state = 'delivered') OR (old.state = 'on_hold' AND new.state NOT IN ('delivered','approved'));
  END IF;
  IF NOT allowed THEN RAISE EXCEPTION 'invalid_state_transition:%:%:%', tg_table_name, old.state, new.state USING errcode = 'check_violation'; END IF;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS quotes_state_guard ON public.quotes;
CREATE TRIGGER quotes_state_guard BEFORE UPDATE OF state ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.validate_state_transition();

DROP TRIGGER IF EXISTS orders_state_guard ON public.orders;
CREATE TRIGGER orders_state_guard BEFORE UPDATE OF state ON public.orders FOR EACH ROW EXECUTE FUNCTION public.validate_state_transition();

DROP TRIGGER IF EXISTS projects_state_guard ON public.projects;
CREATE TRIGGER projects_state_guard BEFORE UPDATE OF state ON public.projects FOR EACH ROW EXECUTE FUNCTION public.validate_state_transition();

CREATE OR REPLACE FUNCTION public.prevent_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable_record' USING errcode = 'check_violation'; END $$;

DROP TRIGGER IF EXISTS quote_acceptances_immutable ON public.quote_acceptances;
CREATE TRIGGER quote_acceptances_immutable BEFORE UPDATE OR DELETE ON public.quote_acceptances FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();

DROP TRIGGER IF EXISTS audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER audit_logs_immutable BEFORE UPDATE OR DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name) VALUES(new.id, nullif(new.raw_user_meta_data->>'full_name','')) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping direct auth.users trigger setup (requires superuser/postgres role): %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.submit_project_brief(p_payload jsonb, p_request_hash text, p_reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bucket timestamptz := date_trunc('hour', now()) + (floor(extract(minute from now()) / 10) * interval '10 minutes');
DECLARE count_now integer; DECLARE brief_id uuid; DECLARE chosen_service text := p_payload->>'serviceId';
BEGIN
  IF p_payload->>'consent' <> 'true' THEN RAISE EXCEPTION 'consent_required'; END IF;
  IF NOT exists(SELECT 1 FROM public.services WHERE id = chosen_service AND active) THEN RAISE EXCEPTION 'invalid_service'; END IF;
  IF char_length(coalesce(p_payload->>'problem','')) NOT BETWEEN 20 AND 3000 THEN RAISE EXCEPTION 'invalid_problem'; END IF;
  IF char_length(coalesce(p_payload->>'email','')) > 320 OR position('@' in coalesce(p_payload->>'email','')) = 0 THEN RAISE EXCEPTION 'invalid_email'; END IF;
  INSERT INTO public.rate_limit_buckets(key_hash,bucket_start,request_count) VALUES(p_request_hash,bucket,1)
  ON CONFLICT(key_hash,bucket_start) DO UPDATE SET request_count = public.rate_limit_buckets.request_count + 1 RETURNING request_count INTO count_now;
  IF count_now > 3 THEN RAISE EXCEPTION 'rate_limit_exceeded'; END IF;
  INSERT INTO public.project_briefs(reference,service_id,contact_name,contact_email,contact_phone,organization_name,payload,attribution)
  VALUES(p_reference,chosen_service,p_payload->>'name',lower(p_payload->>'email'),p_payload->>'phone',nullif(p_payload->>'organization',''),p_payload - 'name' - 'email' - 'phone' - 'organization' - 'consent',coalesce(p_payload->'attribution','{}'::jsonb)) RETURNING id INTO brief_id;
  INSERT INTO public.leads(project_brief_id) VALUES(brief_id);
  INSERT INTO public.outbox_events(aggregate_type,aggregate_id,event_type,payload,state,idempotency_key)
  VALUES('project_brief',brief_id::text,'Lead Submitted',jsonb_build_object('project_brief_id',brief_id),'disabled','lead-submitted:'||brief_id::text);
  INSERT INTO public.audit_logs(action,entity_type,entity_id,after_data) VALUES('project_brief.submitted','project_brief',brief_id::text,jsonb_build_object('reference',p_reference,'service_id',chosen_service));
  RETURN brief_id;
END $$;

REVOKE ALL ON FUNCTION public.submit_project_brief(jsonb,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_quote(p_quote_id uuid, p_decision text, p_ip_hash text DEFAULT null)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; DECLARE acceptance_id uuid; DECLARE order_id uuid;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF q.id IS NULL OR NOT public.is_org_member(q.organization_id) THEN RAISE EXCEPTION 'quote_not_found'; END IF;
  IF q.state <> 'sent' OR q.valid_until <= now() THEN RAISE EXCEPTION 'quote_not_acceptable'; END IF;
  IF p_decision NOT IN ('accepted','rejected') THEN RAISE EXCEPTION 'invalid_decision'; END IF;
  IF q.snapshot IS NULL THEN RAISE EXCEPTION 'missing_snapshot'; END IF;
  INSERT INTO public.quote_acceptances(quote_id,organization_id,accepted_by,decision,accepted_snapshot,ip_hash)
  VALUES(q.id,q.organization_id,auth.uid(),p_decision,q.snapshot,p_ip_hash) RETURNING id INTO acceptance_id;
  UPDATE public.quotes SET state = p_decision::public.quote_state, updated_at = now() WHERE id = q.id;
  IF p_decision = 'accepted' THEN
    INSERT INTO public.orders(quote_id,organization_id,state,currency,total_minor,commercial_snapshot)
    VALUES(q.id,q.organization_id,'awaiting_payment',q.currency,q.total_minor,q.snapshot)
    ON CONFLICT(quote_id) DO UPDATE SET quote_id = excluded.quote_id RETURNING id INTO order_id;
    INSERT INTO public.outbox_events(aggregate_type,aggregate_id,event_type,payload,state,idempotency_key)
    VALUES('quote',q.id::text,'Quote Accepted',jsonb_build_object('quote_id',q.id,'order_id',order_id),'disabled','quote-accepted:'||q.id::text);
  END IF;
  INSERT INTO public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_data)
  VALUES(q.organization_id,auth.uid(),'quote.'||p_decision,'quote',q.id::text,jsonb_build_object('acceptance_id',acceptance_id,'order_id',order_id));
  RETURN coalesce(order_id, acceptance_id);
END $$;

REVOKE ALL ON FUNCTION public.decide_quote(uuid,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.decide_quote(uuid,text,text) TO authenticated;

-- 8. ROW LEVEL SECURITY ENABLING
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuration_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- 9. ROW LEVEL SECURITY POLICIES
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_self_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.current_user_is_staff());

DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND (NOT is_staff OR public.current_user_is_staff()));

DROP POLICY IF EXISTS organizations_member_select ON public.organizations;
CREATE POLICY organizations_member_select ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id) OR public.current_user_is_staff());

DROP POLICY IF EXISTS memberships_member_select ON public.organization_memberships;
CREATE POLICY memberships_member_select ON public.organization_memberships FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_org_admin(organization_id) OR public.current_user_is_staff());

DROP POLICY IF EXISTS services_public_select ON public.services;
CREATE POLICY services_public_select ON public.services FOR SELECT USING (active);

DROP POLICY IF EXISTS packages_public_approved ON public.packages;
CREATE POLICY packages_public_approved ON public.packages FOR SELECT USING (active AND orderable AND status = 'approved');

DROP POLICY IF EXISTS prices_public_approved ON public.price_versions;
CREATE POLICY prices_public_approved ON public.price_versions FOR SELECT USING (status = 'approved' AND valid_from <= now() AND (valid_to IS NULL OR valid_to >= now()));

DROP POLICY IF EXISTS features_public_select ON public.feature_definitions;
CREATE POLICY features_public_select ON public.feature_definitions FOR SELECT USING (active);

DROP POLICY IF EXISTS services_staff_all ON public.services;
CREATE POLICY services_staff_all ON public.services FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS packages_staff_all ON public.packages;
CREATE POLICY packages_staff_all ON public.packages FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS prices_staff_all ON public.price_versions;
CREATE POLICY prices_staff_all ON public.price_versions FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS features_staff_all ON public.feature_definitions;
CREATE POLICY features_staff_all ON public.feature_definitions FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS drafts_owner_all ON public.configuration_drafts;
CREATE POLICY drafts_owner_all ON public.configuration_drafts FOR ALL TO authenticated USING (owner_id = auth.uid() OR public.current_user_is_staff()) WITH CHECK (owner_id = auth.uid() OR public.current_user_is_staff());

DROP POLICY IF EXISTS briefs_org_select ON public.project_briefs;
CREATE POLICY briefs_org_select ON public.project_briefs FOR SELECT TO authenticated USING ((organization_id IS NOT NULL AND public.is_org_member(organization_id)) OR public.current_user_is_staff());

DROP POLICY IF EXISTS briefs_staff_update ON public.project_briefs;
CREATE POLICY briefs_staff_update ON public.project_briefs FOR UPDATE TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS leads_staff_all ON public.leads;
CREATE POLICY leads_staff_all ON public.leads FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS quotes_org_select ON public.quotes;
CREATE POLICY quotes_org_select ON public.quotes FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.current_user_is_staff());

DROP POLICY IF EXISTS quotes_staff_all ON public.quotes;
CREATE POLICY quotes_staff_all ON public.quotes FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS quote_items_org_select ON public.quote_items;
CREATE POLICY quote_items_org_select ON public.quote_items FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND (public.is_org_member(q.organization_id) OR public.current_user_is_staff())));

DROP POLICY IF EXISTS quote_items_staff_all ON public.quote_items;
CREATE POLICY quote_items_staff_all ON public.quote_items FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS acceptances_org_select ON public.quote_acceptances;
CREATE POLICY acceptances_org_select ON public.quote_acceptances FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.current_user_is_staff());

DROP POLICY IF EXISTS orders_org_select ON public.orders;
CREATE POLICY orders_org_select ON public.orders FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.current_user_is_staff());

DROP POLICY IF EXISTS orders_staff_all ON public.orders;
CREATE POLICY orders_staff_all ON public.orders FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS payments_org_select ON public.payment_transactions;
CREATE POLICY payments_org_select ON public.payment_transactions FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.current_user_is_staff());

DROP POLICY IF EXISTS payments_staff_all ON public.payment_transactions;
CREATE POLICY payments_staff_all ON public.payment_transactions FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS invoices_org_select ON public.invoices;
CREATE POLICY invoices_org_select ON public.invoices FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.current_user_is_staff());

DROP POLICY IF EXISTS invoices_staff_all ON public.invoices;
CREATE POLICY invoices_staff_all ON public.invoices FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS projects_org_select ON public.projects;
CREATE POLICY projects_org_select ON public.projects FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.current_user_is_staff());

DROP POLICY IF EXISTS projects_staff_all ON public.projects;
CREATE POLICY projects_staff_all ON public.projects FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS requirements_project_select ON public.project_requirements;
CREATE POLICY requirements_project_select ON public.project_requirements FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.projects p WHERE p.id = project_id AND (public.is_org_member(p.organization_id) OR public.current_user_is_staff())));

DROP POLICY IF EXISTS requirements_project_update ON public.project_requirements;
CREATE POLICY requirements_project_update ON public.project_requirements FOR UPDATE TO authenticated USING (EXISTS(SELECT 1 FROM public.projects p WHERE p.id = project_id AND (public.is_org_member(p.organization_id) OR public.current_user_is_staff()))) WITH CHECK (EXISTS(SELECT 1 FROM public.projects p WHERE p.id = project_id AND (public.is_org_member(p.organization_id) OR public.current_user_is_staff())));

DROP POLICY IF EXISTS files_org_select ON public.project_files;
CREATE POLICY files_org_select ON public.project_files FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.current_user_is_staff());

DROP POLICY IF EXISTS files_org_insert ON public.project_files;
CREATE POLICY files_org_insert ON public.project_files FOR INSERT TO authenticated WITH CHECK ((public.is_org_member(organization_id) OR public.current_user_is_staff()) AND uploaded_by = auth.uid());

DROP POLICY IF EXISTS milestones_project_select ON public.milestones;
CREATE POLICY milestones_project_select ON public.milestones FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.projects p WHERE p.id = project_id AND (public.is_org_member(p.organization_id) OR public.current_user_is_staff())));

DROP POLICY IF EXISTS milestones_staff_all ON public.milestones;
CREATE POLICY milestones_staff_all ON public.milestones FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS tasks_staff_all ON public.tasks;
CREATE POLICY tasks_staff_all ON public.tasks FOR ALL TO authenticated USING (public.current_user_is_staff()) WITH CHECK (public.current_user_is_staff());

DROP POLICY IF EXISTS approvals_org_select ON public.approvals;
CREATE POLICY approvals_org_select ON public.approvals FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.current_user_is_staff());

DROP POLICY IF EXISTS approvals_org_insert ON public.approvals;
CREATE POLICY approvals_org_insert ON public.approvals FOR INSERT TO authenticated WITH CHECK ((public.is_org_member(organization_id) OR public.current_user_is_staff()) AND decided_by = auth.uid());

DROP POLICY IF EXISTS revisions_org_select ON public.revision_requests;
CREATE POLICY revisions_org_select ON public.revision_requests FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.current_user_is_staff());

DROP POLICY IF EXISTS revisions_org_insert ON public.revision_requests;
CREATE POLICY revisions_org_insert ON public.revision_requests FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND requested_by = auth.uid());

DROP POLICY IF EXISTS tickets_org_select ON public.support_tickets;
CREATE POLICY tickets_org_select ON public.support_tickets FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.current_user_is_staff());

DROP POLICY IF EXISTS tickets_org_insert ON public.support_tickets;
CREATE POLICY tickets_org_insert ON public.support_tickets FOR INSERT TO authenticated WITH CHECK ((public.is_org_member(organization_id) OR public.current_user_is_staff()) AND opened_by = auth.uid());

DROP POLICY IF EXISTS notifications_recipient_select ON public.notifications;
CREATE POLICY notifications_recipient_select ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR (organization_id IS NOT NULL AND public.is_org_member(organization_id)) OR public.current_user_is_staff());

DROP POLICY IF EXISTS outbox_staff_select ON public.outbox_events;
CREATE POLICY outbox_staff_select ON public.outbox_events FOR SELECT TO authenticated USING (public.current_user_is_staff());

DROP POLICY IF EXISTS audit_staff_select ON public.audit_logs;
CREATE POLICY audit_staff_select ON public.audit_logs FOR SELECT TO authenticated USING (public.current_user_is_staff());

DROP POLICY IF EXISTS audit_org_select ON public.audit_logs;
CREATE POLICY audit_org_select ON public.audit_logs FOR SELECT TO authenticated USING (organization_id IS NOT NULL AND public.is_org_admin(organization_id));

DROP POLICY IF EXISTS analytics_staff_select ON public.analytics_events;
CREATE POLICY analytics_staff_select ON public.analytics_events FOR SELECT TO authenticated USING (public.current_user_is_staff());

DROP POLICY IF EXISTS webhooks_staff_select ON public.webhook_events;
CREATE POLICY webhooks_staff_select ON public.webhook_events FOR SELECT TO authenticated USING (public.current_user_is_staff());

-- 10. STORAGE BUCKET & INITIAL STORAGE POLICIES
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('project-files', 'project-files', false, 52428800, ARRAY['application/pdf','image/png','image/jpeg','text/plain','application/zip'])
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Storage bucket insert skipped (bucket may be managed via dashboard): %', SQLERRM;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP POLICY IF EXISTS project_files_storage_select ON storage.objects;
    CREATE POLICY project_files_storage_select ON storage.objects FOR SELECT TO authenticated USING (
      bucket_id = 'project-files' AND EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id::text = (storage.foldername(name))[1] 
          AND (public.is_org_member(p.organization_id) OR public.current_user_is_staff())
      )
    );

    DROP POLICY IF EXISTS project_files_storage_insert ON storage.objects;
    CREATE POLICY project_files_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
      bucket_id = 'project-files' AND EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id::text = (storage.foldername(name))[1] 
          AND (public.is_org_member(p.organization_id) OR public.current_user_is_staff())
      )
    );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- PART 2: CANONICAL SERVICE REGISTRY SEED (0002)
-- ------------------------------------------------------------------------------

INSERT INTO public.services (id, category_id, slug, name, summary, sales_mode, active, canonical, display_order) VALUES
('SVC-01-SPW','website-development','single-page-website-development','Single Page Website Development','A focused one-page website with a maximum of five sections.','quote_required',true,true,1),
('SVC-02-MIN','website-development','mini-website-development','Mini Website Development','A compact one-page website with a maximum of eight sections.','quote_required',true,true,2),
('SVC-03-BIZ','website-development','business-website-development','Business Website Development','A structured multi-page website.','quote_required',true,true,3),
('SVC-04-FUN','sales-funnel-development','sales-funnel-development','Sales Funnel Development','A measured landing and qualification journey.','quote_required',true,true,4),
('SVC-05-EFC','ecommerce-fcommerce','ecommerce-fcommerce-store-development','E-commerce / F-commerce Store Development','A selling system with catalogue, checkout, and order workflow.','quote_required',true,true,5),
('SVC-06-WAP','web-application-development','custom-web-application-development','Custom Web Application Development','An authenticated browser-based business application.','quote_required',true,true,6),
('SVC-07-PWA','progressive-web-app-development','pwa-development','PWA Development','An installable web application with an offline strategy.','quote_required',true,true,7),
('SVC-08-MOB','mobile-app-development','android-ios-mobile-app-development','Android & iOS Mobile App Development','A secure mobile application for Android and iOS.','quote_required',true,true,8),
('SVC-09-CSE','custom-software-engineering','custom-software-full-stack-development','Custom Software & Full-Stack Development','A complex full-stack engineering engagement.','quote_required',true,true,9),
('SVC-10-MVP','mvp-saas-engineering','mvp-saas-development','MVP & SaaS Development','A staged production-capable product build.','quote_required',true,true,10),
('SVC-11-BMS','business-management-systems','business-dashboard-order-management-system','Business Dashboard & Order Management System','An internal operations and order control surface.','quote_required',true,true,11),
('SVC-12-BCP','client-platforms','branded-client-portal-development','Branded Client Portal Development','A private organization-scoped client area.','quote_required',true,true,12)
ON CONFLICT (id) DO UPDATE SET 
  category_id = excluded.category_id,
  slug = excluded.slug,
  name = excluded.name,
  summary = excluded.summary,
  sales_mode = excluded.sales_mode,
  display_order = excluded.display_order;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.packages WHERE service_id = 'SVC-01-SPW' AND name = 'Launch Promotion') THEN
    INSERT INTO public.packages (service_id, name, status, active, orderable, approval_metadata)
    VALUES ('SVC-01-SPW', 'Launch Promotion', 'pending_approval', false, false, jsonb_build_object('recorded_amount_bdt', 999, 'note', 'Regular price, promotion duration, full package approval, and checkout readiness remain unresolved.'));
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- PART 3: SECURITY HARDENING & STORAGE LIFECYCLE (0003)
-- ------------------------------------------------------------------------------

-- Grant brief submission RPC to authenticated users as well as anon
GRANT EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) TO authenticated;

-- Storage objects deletion & update policies for organization admins and staff
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP POLICY IF EXISTS project_files_storage_delete ON storage.objects;
    CREATE POLICY project_files_storage_delete ON storage.objects FOR DELETE TO authenticated USING (
      bucket_id = 'project-files' AND EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id::text = (storage.foldername(name))[1] 
          AND (public.is_org_admin(p.organization_id) OR public.current_user_is_staff())
      )
    );

    DROP POLICY IF EXISTS project_files_storage_update ON storage.objects;
    CREATE POLICY project_files_storage_update ON storage.objects FOR UPDATE TO authenticated USING (
      bucket_id = 'project-files' AND EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id::text = (storage.foldername(name))[1] 
          AND (public.is_org_admin(p.organization_id) OR public.current_user_is_staff())
      )
    );
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- PART 4: SECURITY REMEDIATION & CROSS-TENANT INTEGRITY (0004)
-- ------------------------------------------------------------------------------

-- 1. Intake RPC Security: Revoke anon execute grant to prevent rate limit bypass
REVOKE EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) TO authenticated;

-- 2. Cross-Organization Relationship Integrity Trigger
CREATE OR REPLACE FUNCTION public.verify_project_organization_match()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF new.project_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = new.project_id AND p.organization_id = new.organization_id
    ) THEN
      RAISE EXCEPTION 'cross_tenant_violation: project % does not belong to organization %', new.project_id, new.organization_id USING errcode = 'foreign_key_violation';
    END IF;
  END IF;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS trg_verify_project_files_org ON public.project_files;
CREATE TRIGGER trg_verify_project_files_org
  BEFORE INSERT OR UPDATE OF project_id, organization_id ON public.project_files
  FOR EACH ROW EXECUTE FUNCTION public.verify_project_organization_match();

DROP TRIGGER IF EXISTS trg_verify_approvals_org ON public.approvals;
CREATE TRIGGER trg_verify_approvals_org
  BEFORE INSERT OR UPDATE OF project_id, organization_id ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.verify_project_organization_match();

DROP TRIGGER IF EXISTS trg_verify_revisions_org ON public.revision_requests;
CREATE TRIGGER trg_verify_revisions_org
  BEFORE INSERT OR UPDATE OF project_id, organization_id ON public.revision_requests
  FOR EACH ROW EXECUTE FUNCTION public.verify_project_organization_match();

DROP TRIGGER IF EXISTS trg_verify_support_tickets_org ON public.support_tickets;
CREATE TRIGGER trg_verify_support_tickets_org
  BEFORE INSERT OR UPDATE OF project_id, organization_id ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.verify_project_organization_match();

-- 3. Hardened RLS Policies for Cross-Organization Integrity
DROP POLICY IF EXISTS files_org_insert ON public.project_files;
CREATE POLICY files_org_insert ON public.project_files FOR INSERT TO authenticated WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.organization_id = organization_id
      AND (public.is_org_member(organization_id) OR public.current_user_is_staff())
  )
);

DROP POLICY IF EXISTS files_org_select ON public.project_files;
CREATE POLICY files_org_select ON public.project_files FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.organization_id = organization_id
      AND (public.is_org_member(organization_id) OR public.current_user_is_staff())
  )
);

DROP POLICY IF EXISTS approvals_org_insert ON public.approvals;
CREATE POLICY approvals_org_insert ON public.approvals FOR INSERT TO authenticated WITH CHECK (
  decided_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.organization_id = organization_id
      AND (public.is_org_member(organization_id) OR public.current_user_is_staff())
  )
);

DROP POLICY IF EXISTS approvals_org_select ON public.approvals;
CREATE POLICY approvals_org_select ON public.approvals FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.organization_id = organization_id
      AND (public.is_org_member(organization_id) OR public.current_user_is_staff())
  )
);

DROP POLICY IF EXISTS revisions_org_insert ON public.revision_requests;
CREATE POLICY revisions_org_insert ON public.revision_requests FOR INSERT TO authenticated WITH CHECK (
  requested_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.organization_id = organization_id
      AND (public.is_org_member(organization_id) OR public.current_user_is_staff())
  )
);

DROP POLICY IF EXISTS revisions_org_select ON public.revision_requests;
CREATE POLICY revisions_org_select ON public.revision_requests FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.organization_id = organization_id
      AND (public.is_org_member(organization_id) OR public.current_user_is_staff())
  )
);

DROP POLICY IF EXISTS tickets_org_insert ON public.support_tickets;
CREATE POLICY tickets_org_insert ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (
  opened_by = auth.uid()
  AND (
    (project_id IS NULL AND (public.is_org_member(organization_id) OR public.current_user_is_staff()))
    OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.organization_id = organization_id
        AND (public.is_org_member(organization_id) OR public.current_user_is_staff())
    ))
  )
);

DROP POLICY IF EXISTS tickets_org_select ON public.support_tickets;
CREATE POLICY tickets_org_select ON public.support_tickets FOR SELECT TO authenticated USING (
  (project_id IS NULL AND (public.is_org_member(organization_id) OR public.current_user_is_staff()))
  OR
  (project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.organization_id = organization_id
      AND (public.is_org_member(organization_id) OR public.current_user_is_staff())
  ))
);

-- 4. Storage Update Policy with Destination Validation
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP POLICY IF EXISTS project_files_storage_update ON storage.objects;
    CREATE POLICY project_files_storage_update ON storage.objects FOR UPDATE TO authenticated USING (
      bucket_id = 'project-files' AND EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id::text = (storage.foldername(name))[1] 
          AND (public.is_org_admin(p.organization_id) OR public.current_user_is_staff())
      )
    ) WITH CHECK (
      bucket_id = 'project-files' AND EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id::text = (storage.foldername(name))[1] 
          AND (public.is_org_admin(p.organization_id) OR public.current_user_is_staff())
      )
    );
  END IF;
END $$;


-- =============================================================================
-- MIGRATION 202611080005: V12 COMMERCIAL, TERMS, FINANCIAL & PROVISIONING HARDENING
-- =============================================================================
REVOKE EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) TO service_role;

CREATE TABLE IF NOT EXISTS public.commercial_terms_versions (
  version text PRIMARY KEY,
  document_id text NOT NULL,
  title text NOT NULL,
  classification text NOT NULL CHECK (classification IN ('draft', 'staging_synthetic', 'approved_production', 'retired')),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  approval_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    classification <> 'approved_production'
    OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND coalesce(trim(approval_reference), '') <> '')
  )
);

ALTER TABLE public.commercial_terms_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS terms_public_select ON public.commercial_terms_versions;
CREATE POLICY terms_public_select ON public.commercial_terms_versions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS terms_staff_all ON public.commercial_terms_versions;
CREATE POLICY terms_staff_all ON public.commercial_terms_versions
  FOR ALL TO authenticated
  USING (public.current_user_is_staff())
  WITH CHECK (public.current_user_is_staff());

INSERT INTO public.commercial_terms_versions (version, document_id, title, classification)
VALUES
  ('ENGINE//OS-TERMS-V1.0', 'DOC-TERMS-2026-V1', 'ENGINE//OS Master Commercial Terms v1.0 (Draft Pending Founder Approval)', 'draft'),
  ('STANDARD-V1.0', 'DOC-STD-2026-V1', 'Standard Commercial Proposal Terms v1.0 (Draft Pending Founder Approval)', 'draft'),
  ('STAGING-TEST-TERMS-V1.0', 'DOC-STG-SYNTHETIC-V1', 'Non-Binding Synthetic Staging Verification Terms v1.0', 'staging_synthetic')
ON CONFLICT (version) DO UPDATE
SET
  document_id = EXCLUDED.document_id,
  title = EXCLUDED.title,
  classification = CASE
    WHEN public.commercial_terms_versions.classification = 'approved_production' THEN public.commercial_terms_versions.classification
    ELSE EXCLUDED.classification
  END;

-- =============================================================================
-- SYSTEM ENVIRONMENT GOVERNANCE TABLE & FAIL-SAFE HELPER
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.system_environment (
  id text PRIMARY KEY DEFAULT 'current' CHECK (id = 'current'),
  environment text NOT NULL CHECK (environment IN ('staging', 'production')) DEFAULT 'production',
  is_synthetic_allowed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.system_environment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_env_select ON public.system_environment;
CREATE POLICY system_env_select ON public.system_environment
  FOR SELECT TO authenticated, anon
  USING (true);

-- Seed default for all environments: FAIL CLOSED TO PRODUCTION (never staging by default)
INSERT INTO public.system_environment (id, environment, is_synthetic_allowed, updated_at)
VALUES ('current', 'production', false, now())
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN current_setting('request.jwt.claim.role', true) = 'service_role' THEN true
    ELSE coalesce((
      SELECT role = 'super_admin' AND is_staff = true
      FROM public.profiles
      WHERE id = auth.uid()
    ), false)
  END;
$$;

REVOKE ALL ON FUNCTION public.current_user_is_super_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin() TO service_role;

DROP POLICY IF EXISTS system_env_super_admin_all ON public.system_environment;
CREATE POLICY system_env_super_admin_all ON public.system_environment
  FOR ALL TO authenticated
  USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

-- Dedicated RPC: public.set_system_environment
-- Only super_admin (or service_role) may execute this to change environment or synthetic flags.
CREATE OR REPLACE FUNCTION public.set_system_environment(
  p_environment text,
  p_allow_synthetic boolean DEFAULT false
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rec public.system_environment;
BEGIN
  IF NOT public.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'unauthorized_super_admin_only: only a verified super_admin (founder) may modify system environment'
      USING errcode = 'insufficient_privilege';
  END IF;

  IF p_environment NOT IN ('staging', 'production') THEN
    RAISE EXCEPTION 'invalid_environment: environment must be either staging or production'
      USING errcode = 'invalid_parameter_value';
  END IF;

  -- Synthetic operations are strictly prohibited if environment is production
  IF p_environment = 'production' AND p_allow_synthetic = true THEN
    RAISE EXCEPTION 'invalid_environment_configuration: synthetic operations cannot be enabled in production'
      USING errcode = 'integrity_constraint_violation';
  END IF;

  UPDATE public.system_environment
  SET
    environment = p_environment,
    is_synthetic_allowed = (p_environment = 'staging' AND p_allow_synthetic),
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = 'current'
  RETURNING * INTO v_rec;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, after_data)
  VALUES (
    auth.uid(),
    'system_environment.updated',
    'system_environment',
    'current',
    jsonb_build_object(
      'environment', v_rec.environment,
      'isSyntheticAllowed', v_rec.is_synthetic_allowed,
      'updatedBy', v_rec.updated_by,
      'updatedAt', v_rec.updated_at
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'environment', v_rec.environment,
    'isSyntheticAllowed', v_rec.is_synthetic_allowed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_system_environment(text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.set_system_environment(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_system_environment(text, boolean) TO service_role;

DROP POLICY IF EXISTS terms_staff_all ON public.commercial_terms_versions;
DROP POLICY IF EXISTS terms_staff_manage_non_production ON public.commercial_terms_versions;
DROP POLICY IF EXISTS terms_super_admin_manage_all ON public.commercial_terms_versions;

CREATE POLICY terms_staff_manage_non_production ON public.commercial_terms_versions
  FOR ALL TO authenticated
  USING (
    public.current_user_is_staff() AND (
      classification IN ('draft', 'staging_synthetic', 'retired')
      OR public.current_user_is_super_admin()
    )
  )
  WITH CHECK (
    public.current_user_is_staff() AND (
      classification IN ('draft', 'staging_synthetic', 'retired')
      OR public.current_user_is_super_admin()
    )
  );

CREATE POLICY terms_super_admin_manage_all ON public.commercial_terms_versions
  FOR ALL TO authenticated
  USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

CREATE OR REPLACE FUNCTION public.approve_commercial_terms(
  p_version text,
  p_reference text,
  p_notes text DEFAULT null
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rec public.commercial_terms_versions;
BEGIN
  IF NOT public.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'unauthorized_super_admin_only: only a verified super_admin (founder) may approve production commercial terms'
      USING errcode = 'insufficient_privilege';
  END IF;

  IF coalesce(trim(p_reference), '') = '' THEN
    RAISE EXCEPTION 'invalid_approval_reference: approval reference is required'
      USING errcode = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_rec FROM public.commercial_terms_versions WHERE version = p_version FOR UPDATE;
  IF v_rec.version IS NULL THEN
    RAISE EXCEPTION 'terms_version_not_found: terms version % does not exist', p_version
      USING errcode = 'no_data_found';
  END IF;

  UPDATE public.commercial_terms_versions
  SET
    classification = 'approved_production',
    approved_by = auth.uid(),
    approved_at = now(),
    approval_reference = trim(p_reference)
  WHERE version = p_version
  RETURNING * INTO v_rec;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, after_data)
  VALUES (
    auth.uid(),
    'commercial_terms.approved_production',
    'commercial_terms_version',
    p_version,
    jsonb_build_object(
      'version', v_rec.version,
      'documentId', v_rec.document_id,
      'title', v_rec.title,
      'classification', v_rec.classification,
      'approvedBy', v_rec.approved_by,
      'approvedAt', v_rec.approved_at,
      'approvalReference', v_rec.approval_reference,
      'notes', p_notes
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'version', v_rec.version,
    'classification', v_rec.classification,
    'approvalReference', v_rec.approval_reference,
    'notes', p_notes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_commercial_terms(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.approve_commercial_terms(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_commercial_terms(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.decide_quote(p_quote_id uuid, p_decision text, p_ip_hash text DEFAULT null)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q public.quotes;
  t public.commercial_terms_versions;
  v_env text := 'production';
  v_synthetic_allowed boolean := false;
  acceptance_id uuid;
  order_id uuid;
  enriched_snapshot jsonb;
BEGIN
  BEGIN
    SELECT environment, is_synthetic_allowed
    INTO v_env, v_synthetic_allowed
    FROM public.system_environment
    WHERE id = 'current'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_env := 'production';
    v_synthetic_allowed := false;
  END;

  IF v_env IS NULL THEN
    v_env := 'production';
    v_synthetic_allowed := false;
  END IF;

  SELECT * INTO q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF q.id IS NULL OR (NOT public.is_org_member(q.organization_id) AND NOT public.current_user_is_staff()) THEN
    RAISE EXCEPTION 'quote_not_found';
  END IF;
  IF NOT public.is_org_admin(q.organization_id) AND NOT public.current_user_is_staff() THEN
    RAISE EXCEPTION 'unauthorized_signatory: only organization owners or admins may accept or reject a quote';
  END IF;
  IF q.state <> 'sent' OR q.valid_until <= now() THEN
    RAISE EXCEPTION 'quote_not_acceptable';
  END IF;
  IF p_decision NOT IN ('accepted','rejected') THEN
    RAISE EXCEPTION 'invalid_decision';
  END IF;
  IF q.snapshot IS NULL THEN
    RAISE EXCEPTION 'missing_snapshot';
  END IF;
  IF coalesce(trim(q.terms_version), '') = '' THEN
    RAISE EXCEPTION 'missing_terms_version';
  END IF;

  SELECT * INTO t FROM public.commercial_terms_versions WHERE version = q.terms_version;

  IF p_decision = 'accepted' THEN
    IF t.version IS NULL THEN
      RAISE EXCEPTION 'unapproved_terms_version: terms version % is not registered', q.terms_version;
    END IF;

    IF t.classification = 'draft' THEN
      RAISE EXCEPTION 'unapproved_terms_version: terms version % is draft and pending founder approval', q.terms_version;
    ELSIF t.classification = 'retired' THEN
      RAISE EXCEPTION 'unapproved_terms_version: terms version % is retired and cannot bind an order', q.terms_version;
    ELSIF t.classification = 'staging_synthetic' THEN
      IF v_env <> 'staging' OR NOT v_synthetic_allowed THEN
        RAISE EXCEPTION 'synthetic_terms_prohibited_in_production: synthetic terms % cannot bind orders in % environment', q.terms_version, v_env
          USING errcode = 'integrity_constraint_violation';
      END IF;
    ELSIF t.classification = 'approved_production' THEN
      IF t.approved_by IS NULL OR t.approved_at IS NULL OR coalesce(trim(t.approval_reference), '') = '' THEN
        RAISE EXCEPTION 'unapproved_terms_version: terms version % lacks verified founder approval metadata', q.terms_version;
      END IF;
    ELSE
      RAISE EXCEPTION 'unapproved_terms_version: unrecognized terms classification %', t.classification;
    END IF;
  END IF;

  enriched_snapshot := q.snapshot || jsonb_build_object(
    'acceptanceGovernance', jsonb_build_object(
      'termsVersion', q.terms_version,
      'documentId', coalesce(t.document_id, 'UNREGISTERED'),
      'termsClassification', coalesce(t.classification, 'draft'),
      'systemEnvironment', v_env,
      'acceptedBy', auth.uid(),
      'acceptedAt', now()
    )
  );

  INSERT INTO public.quote_acceptances(quote_id,organization_id,accepted_by,decision,accepted_snapshot,ip_hash)
  VALUES(q.id,q.organization_id,auth.uid(),p_decision,enriched_snapshot,p_ip_hash)
  RETURNING id INTO acceptance_id;

  UPDATE public.quotes SET state = p_decision::public.quote_state, updated_at = now() WHERE id = q.id;

  IF p_decision = 'accepted' THEN
    INSERT INTO public.orders(quote_id,organization_id,state,currency,total_minor,commercial_snapshot)
    VALUES(q.id,q.organization_id,'awaiting_payment',q.currency,q.total_minor,enriched_snapshot)
    ON CONFLICT(quote_id) DO UPDATE SET quote_id = excluded.quote_id RETURNING id INTO order_id;

    INSERT INTO public.outbox_events(aggregate_type,aggregate_id,event_type,payload,state,idempotency_key)
    VALUES('quote',q.id::text,'Quote Accepted',jsonb_build_object('quote_id',q.id,'order_id',order_id,'terms_classification',t.classification,'environment',v_env),'disabled','quote-accepted:'||q.id::text)
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  INSERT INTO public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_data)
  VALUES(q.organization_id,auth.uid(),'quote.'||p_decision,'quote',q.id::text,jsonb_build_object('acceptance_id',acceptance_id,'order_id',order_id,'terms_version',q.terms_version,'terms_classification',t.classification,'environment',v_env));

  RETURN coalesce(order_id, acceptance_id);
END $$;

REVOKE ALL ON FUNCTION public.decide_quote(uuid,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.decide_quote(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_quote(uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.verify_order_financial_clearance()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_env text := 'production';
  v_synthetic_allowed boolean := false;
  has_verified_payment boolean := false;
  has_synthetic_payment boolean := false;
  has_manual_settlement boolean := false;
  settlement_method text;
  settlement_ref text;
BEGIN
  BEGIN
    SELECT environment, is_synthetic_allowed
    INTO v_env, v_synthetic_allowed
    FROM public.system_environment
    WHERE id = 'current'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_env := 'production';
    v_synthetic_allowed := false;
  END;

  IF v_env IS NULL THEN
    v_env := 'production';
    v_synthetic_allowed := false;
  END IF;

  IF new.state IN ('confirmed', 'in_production', 'completed') AND (old.state IS DISTINCT FROM new.state) THEN
    SELECT
      EXISTS (
        SELECT 1 FROM public.payment_transactions pt
        WHERE pt.order_id = new.id
          AND pt.state = 'paid'
          AND pt.verified_at IS NOT NULL
          AND pt.currency = new.currency
          AND pt.amount_minor >= new.total_minor
      ),
      EXISTS (
        SELECT 1 FROM public.payment_transactions pt
        WHERE pt.order_id = new.id
          AND pt.state = 'paid'
          AND pt.verified_at IS NOT NULL
          AND pt.provider IN ('staging_clearance', 'staging_test_clearance', 'synthetic_staging')
      )
    INTO has_verified_payment, has_synthetic_payment;

    IF has_synthetic_payment AND (v_env <> 'staging' OR NOT v_synthetic_allowed) THEN
      RAISE EXCEPTION 'synthetic_settlement_prohibited_in_production: staging clearance payment methods cannot satisfy financial clearance in % environment', v_env
        USING errcode = 'integrity_constraint_violation';
    END IF;

    settlement_method := coalesce(new.commercial_snapshot->'settlement'->>'method', '');
    settlement_ref := coalesce(trim(new.commercial_snapshot->'settlement'->>'reference'), '');

    has_manual_settlement := (
      coalesce(new.commercial_snapshot->'settlement'->>'status', '') = 'approved_manual_settlement'
      AND settlement_ref <> ''
      AND coalesce(trim(new.commercial_snapshot->'settlement'->>'approvedBy'), '') <> ''
    );

    IF has_manual_settlement AND settlement_method IN ('staging_clearance', 'staging_test_clearance') THEN
      IF v_env <> 'staging' OR NOT v_synthetic_allowed THEN
        RAISE EXCEPTION 'synthetic_settlement_prohibited_in_production: % settlement method is not permitted in % environment', settlement_method, v_env
          USING errcode = 'integrity_constraint_violation';
      END IF;
    END IF;

    IF NOT has_verified_payment AND NOT has_manual_settlement THEN
      RAISE EXCEPTION 'order_financial_clearance_required: order % cannot transition to % without a verified matching payment (amount >= %, currency = %) or approved manual settlement record',
        new.id, new.state, new.total_minor, new.currency
        USING errcode = 'check_violation';
    END IF;
  END IF;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS orders_financial_clearance_guard ON public.orders;
CREATE TRIGGER orders_financial_clearance_guard
  BEFORE UPDATE OF state ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.verify_order_financial_clearance();

DROP POLICY IF EXISTS requirements_staff_all ON public.project_requirements;
CREATE POLICY requirements_staff_all ON public.project_requirements FOR ALL TO authenticated
  USING (public.current_user_is_staff())
  WITH CHECK (public.current_user_is_staff());

CREATE OR REPLACE FUNCTION public.initialize_project_from_order(
  p_order_id uuid,
  p_service_id text DEFAULT null,
  p_requirements jsonb DEFAULT null,
  p_milestones jsonb DEFAULT null
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.orders;
  existing_project_id uuid;
  new_project_id uuid;
  resolved_service_id text;
  rev_limit integer;
  req_item jsonb;
  ms_item jsonb;
  idx integer := 0;
  has_clearance boolean := false;
BEGIN
  IF NOT public.current_user_is_staff() AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized_staff_only';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF o.id IS NULL THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  SELECT id INTO existing_project_id FROM public.projects WHERE order_id = o.id;
  IF existing_project_id IS NOT NULL THEN
    RETURN existing_project_id;
  END IF;

  IF o.state NOT IN ('confirmed', 'in_production') THEN
    RAISE EXCEPTION 'order_not_confirmed: order must be confirmed before provisioning a project workspace (current state: %)', o.state;
  END IF;

  SELECT (
    EXISTS (
      SELECT 1 FROM public.payment_transactions pt
      WHERE pt.order_id = o.id
        AND pt.state = 'paid'
        AND pt.verified_at IS NOT NULL
        AND pt.currency = o.currency
        AND pt.amount_minor >= o.total_minor
    )
    OR (
      coalesce(o.commercial_snapshot->'settlement'->>'status', '') = 'approved_manual_settlement'
      AND coalesce(trim(o.commercial_snapshot->'settlement'->>'reference'), '') <> ''
    )
  ) INTO has_clearance;

  IF NOT has_clearance THEN
    RAISE EXCEPTION 'order_lacks_financial_clearance: order % lacks verified payment or approved manual settlement', o.id;
  END IF;

  resolved_service_id := coalesce(
    nullif(trim(p_service_id), ''),
    (
      SELECT pb.service_id
      FROM public.quotes q
      JOIN public.project_briefs pb ON pb.id = q.project_brief_id
      WHERE q.id = o.quote_id
    ),
    nullif(trim(o.commercial_snapshot->>'serviceId'), '')
  );

  IF resolved_service_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.services s WHERE s.id = resolved_service_id AND s.active) THEN
    RAISE EXCEPTION 'invalid_service_reference: order % does not reference a valid active canonical service (%).', o.id, coalesce(resolved_service_id, 'NULL');
  END IF;

  rev_limit := coalesce((o.commercial_snapshot->>'revisionLimit')::integer, 2);

  INSERT INTO public.projects(order_id, organization_id, service_id, state, revision_limit, revision_count)
  VALUES (o.id, o.organization_id, resolved_service_id, 'awaiting_requirements', rev_limit, 0)
  RETURNING id INTO new_project_id;

  IF p_requirements IS NOT NULL AND jsonb_typeof(p_requirements) = 'array' AND jsonb_array_length(p_requirements) > 0 THEN
    FOR req_item IN SELECT * FROM jsonb_array_elements(p_requirements) LOOP
      INSERT INTO public.project_requirements(project_id, key, label, required)
      VALUES (
        new_project_id,
        req_item->>'key',
        req_item->>'label',
        coalesce((req_item->>'required')::boolean, true)
      );
    END LOOP;
  ELSE
    INSERT INTO public.project_requirements(project_id, key, label, required)
    VALUES
      (new_project_id, 'brand_assets', 'Brand Assets & Identity (Logos, Vectors, Color Palette, Brand Guide)', true),
      (new_project_id, 'content_copy', 'Primary Content Copy, Offer Descriptions, and Media Files', true),
      (new_project_id, 'infrastructure_credentials', 'Hosting / DNS / Domain Access Requirements', false);
  END IF;

  IF p_milestones IS NOT NULL AND jsonb_typeof(p_milestones) = 'array' AND jsonb_array_length(p_milestones) > 0 THEN
    FOR ms_item IN SELECT * FROM jsonb_array_elements(p_milestones) LOOP
      idx := idx + 1;
      INSERT INTO public.milestones(project_id, label, state, display_order)
      VALUES (
        new_project_id,
        ms_item->>'label',
        coalesce(ms_item->>'state', 'pending'),
        coalesce((ms_item->>'display_order')::integer, idx)
      );
    END LOOP;
  ELSE
    INSERT INTO public.milestones(project_id, label, state, display_order)
    VALUES
      (new_project_id, 'Requirement Verification & Technical Architecture', 'pending', 1),
      (new_project_id, 'Core Module Implementation & Integration', 'pending', 2),
      (new_project_id, 'Internal Security & QA Validation', 'pending', 3),
      (new_project_id, 'Client UAT & Sign-off Review', 'pending', 4),
      (new_project_id, 'Production Deployment & Handover', 'pending', 5);
  END IF;

  INSERT INTO public.outbox_events(aggregate_type, aggregate_id, event_type, payload, state, idempotency_key)
  VALUES (
    'project',
    new_project_id::text,
    'Project Created',
    jsonb_build_object('projectId', new_project_id, 'orderId', o.id, 'organizationId', o.organization_id, 'serviceId', resolved_service_id),
    'disabled',
    'project-created:' || new_project_id::text
  ) ON CONFLICT (idempotency_key) DO NOTHING;

  INSERT INTO public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_data)
  VALUES (
    o.organization_id,
    auth.uid(),
    'project.initialized',
    'project',
    new_project_id::text,
    jsonb_build_object('orderId', o.id, 'serviceId', resolved_service_id, 'revisionLimit', rev_limit)
  );

  RETURN new_project_id;
END $$;

REVOKE ALL ON FUNCTION public.initialize_project_from_order(uuid,text,jsonb,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.initialize_project_from_order(uuid,text,jsonb,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_project_from_order(uuid,text,jsonb,jsonb) TO service_role;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text
  CHECK (role IS NULL OR role IN ('super_admin', 'sales_ops', 'delivery_manager', 'finance', 'support'));


