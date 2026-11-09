-- ==============================================================================
-- ENGINE//OS — COMPOSITE ROLLOUT SCRIPT (MIGRATIONS 0006 & 0007)
-- Platform: NOTREAL ENGINE, LLC
-- Target Staging Project: yamwmfgqqjwlfcjjkwzl
-- Purpose: Apply remaining database governance and ingestion integrity updates
--          in a single transaction in Supabase Cloud Dashboard SQL Editor.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- PART 1: MIGRATION 202611080006
-- V13 Terms Environment, Founder Governance & Financial Clearance Hardening
-- ------------------------------------------------------------------------------

-- ENGINE//OS Migration 202611080006: V13 Terms Environment, Founder Governance & Financial Clearance Hardening
-- Platform: NOTREAL ENGINE, LLC
-- Directive: Master Directive V13.0 Sections 2, 3, 4, 8

-- =============================================================================
-- 1. SYSTEM ENVIRONMENT GOVERNANCE TABLE & FAIL-SAFE HELPER
-- =============================================================================
-- Tracks runtime environment (staging vs production) at the PostgreSQL schema layer.
-- Direct RPC calls fail closed to 'production' if this table or row is missing.
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

-- Helper function: current_user_is_super_admin
-- Checks if current actor is service_role OR has role = 'super_admin' in public.profiles.
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

-- =============================================================================
-- 2. FOUNDER-ONLY COMMERCIAL TERMS APPROVAL SEPARATION
-- =============================================================================
-- Ordinary staff can modify draft, staging_synthetic, or retired terms.
-- Assigning or updating classification = 'approved_production' is restricted to super_admin or service_role!
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

-- Dedicated RPC: public.approve_commercial_terms
-- Only super_admin (or service_role) may execute this to promote terms to approved_production.
-- Supports 2 or 3 arguments (p_version, p_reference, optional p_notes).
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

-- =============================================================================
-- 3. ENVIRONMENT-AWARE TERMS GOVERNANCE IN decide_quote
-- =============================================================================
-- Fails closed to 'production' if system_environment is missing or unset.
-- Rejects staging_synthetic terms if environment <> 'staging'.
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
  -- 1. Resolve system environment (fail closed to 'production')
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

  -- 2. Lock and fetch quote
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

  -- 3. Commercial terms governance & Environment enforcement
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

-- =============================================================================
-- 4. FINANCIAL-STATE CLEARANCE ENFORCEMENT ON ORDERS
-- =============================================================================
-- Enforces:
-- 1. Currency and amount matching: payment_transactions.currency = order.currency
--    AND payment_transactions.amount_minor >= order.total_minor.
-- 2. Synthetic settlement methods (staging_clearance, staging_test_clearance, synthetic_staging)
--    are strictly rejected if system_environment <> 'staging'.
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
  -- Resolve environment
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
    -- 1. Check verified payment matching order total and currency
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

    -- Reject synthetic payment methods in production
    IF has_synthetic_payment AND (v_env <> 'staging' OR NOT v_synthetic_allowed) THEN
      RAISE EXCEPTION 'synthetic_settlement_prohibited_in_production: staging clearance payment methods cannot satisfy financial clearance in % environment', v_env
        USING errcode = 'integrity_constraint_violation';
    END IF;

    -- 2. Check authorized manual settlement
    settlement_method := coalesce(new.commercial_snapshot->'settlement'->>'method', '');
    settlement_ref := coalesce(trim(new.commercial_snapshot->'settlement'->>'reference'), '');

    has_manual_settlement := (
      coalesce(new.commercial_snapshot->'settlement'->>'status', '') = 'approved_manual_settlement'
      AND settlement_ref <> ''
      AND coalesce(trim(new.commercial_snapshot->'settlement'->>'approvedBy'), '') <> ''
    );

    -- Reject synthetic settlement methods in production
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

-- =============================================================================
-- 5. ATOMIC PROJECT PROVISIONING RPC UPGRADE
-- =============================================================================
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

  -- Idempotency check
  SELECT id INTO existing_project_id FROM public.projects WHERE order_id = o.id;
  IF existing_project_id IS NOT NULL THEN
    RETURN existing_project_id;
  END IF;

  IF o.state NOT IN ('confirmed', 'in_production') THEN
    RAISE EXCEPTION 'order_not_confirmed: order must be confirmed before provisioning a project workspace (current state: %)', o.state;
  END IF;

  -- Verify financial clearance directly
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

  -- Resolve canonical service_id strictly
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

  -- Requirements
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

  -- Milestones
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


-- ------------------------------------------------------------------------------
-- PART 2: MIGRATION 202611080007
-- LeadConnector Ingestion Integrity, Nullable Service ID & Atomic Webhook RPC
-- ------------------------------------------------------------------------------

-- ENGINE//OS Migration 202611080007: LeadConnector Ingestion Integrity
-- Platform: NOTREAL ENGINE, LLC
-- Directive: Master Directive V16.0 Section 7 (Omnichannel Lead Ingestion Correction)
--
-- Problem being fixed:
--   1. The LeadConnector webhook deduplicated by (contact_email, 1-hour window), which both
--      discards separate legitimate enquiries from the same person and fails to dedupe a
--      replayed event that arrives outside that window. There was no durable, event-identity
--      based idempotency record.
--   2. project_briefs.service_id was NOT NULL, forcing the webhook to default every
--      unclassified enquiry to SVC-01-SPW (Single Page Website) -- a fabricated
--      classification rather than an honest "needs staff qualification" state.
--   3. The webhook performed three separate client-side inserts (project_briefs, leads,
--      audit_logs) with no transactional guarantee, risking an orphaned project_brief if a
--      later insert failed.
--
-- This migration makes service_id nullable (unclassified intake, never a 13th fabricated
-- service), extends public.webhook_events (already unique on (provider, provider_event_id))
-- to link back to the records it produced, and introduces a single SECURITY DEFINER RPC that
-- performs idempotency check + brief + lead + audit as one atomic transaction.

-- =============================================================================
-- 1. ALLOW UNCLASSIFIED INTAKE (NO FABRICATED DEFAULT SERVICE)
-- =============================================================================
ALTER TABLE public.project_briefs ALTER COLUMN service_id DROP NOT NULL;
COMMENT ON COLUMN public.project_briefs.service_id IS
  'Nullable: NULL means the enquiry has not been classified against the canonical catalog yet and awaits staff qualification. Never auto-filled with a guessed service.';

-- =============================================================================
-- 2. LINK WEBHOOK_EVENTS TO THE RECORDS THEY PRODUCED
-- =============================================================================
ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS project_brief_id uuid REFERENCES public.project_briefs(id),
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id);

-- =============================================================================
-- 3. ATOMIC, IDEMPOTENT INGESTION RPC
-- =============================================================================
-- Service-role only: this ingests pre-authenticated, pre-validated external webhook data and
-- must never be callable from anon/authenticated browser sessions.
CREATE OR REPLACE FUNCTION public.ingest_leadconnector_event(
  p_provider_event_id text,
  p_payload_hash text,
  p_reference text,
  p_service_id text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_organization_name text,
  p_payload jsonb,
  p_attribution jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event_id uuid;
  v_existing_brief_id uuid;
  v_existing_lead_id uuid;
  v_existing_reference text;
  v_existing_payload_hash text;
  v_chosen_service text := p_service_id;
  v_brief_id uuid;
  v_lead_id uuid;
BEGIN
  IF p_provider_event_id IS NULL OR length(trim(p_provider_event_id)) = 0 THEN
    RAISE EXCEPTION 'missing_provider_event_id';
  END IF;
  IF p_contact_email IS NULL AND p_contact_phone IS NULL THEN
    RAISE EXCEPTION 'missing_contact_info';
  END IF;

  -- Only trust an explicitly provided, currently-active canonical service id.
  -- Anything else (unknown, retired, or simply absent) is preserved as unclassified
  -- rather than guessed, so staff can qualify it.
  IF v_chosen_service IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.services WHERE id = v_chosen_service AND active
  ) THEN
    v_chosen_service := NULL;
  END IF;

  -- Idempotency: one row per (provider, provider_event_id), independent of contact details,
  -- so a replayed delivery is recognized even outside any arbitrary time window, and two
  -- distinct enquiries from the same contact are never merged into one.
  INSERT INTO public.webhook_events(provider, provider_event_id, payload_hash, state)
  VALUES ('leadconnector', p_provider_event_id, p_payload_hash, 'received')
  ON CONFLICT (provider, provider_event_id) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    SELECT we.project_brief_id, we.lead_id, pb.reference, we.payload_hash
      INTO v_existing_brief_id, v_existing_lead_id, v_existing_reference, v_existing_payload_hash
      FROM public.webhook_events we
      LEFT JOIN public.project_briefs pb ON pb.id = we.project_brief_id
     WHERE we.provider = 'leadconnector' AND we.provider_event_id = p_provider_event_id;

    -- Detect payload conflict: if an event with the same ID arrives with a different payload hash
    IF v_existing_payload_hash IS NOT NULL AND v_existing_payload_hash <> p_payload_hash THEN
      INSERT INTO public.audit_logs(action, entity_type, entity_id, after_data)
      VALUES (
        'webhook.payload_conflict', 'webhook_event', p_provider_event_id,
        jsonb_build_object(
          'provider', 'leadconnector',
          'providerEventId', p_provider_event_id,
          'existingHash', v_existing_payload_hash,
          'receivedHash', p_payload_hash,
          'existingBriefId', v_existing_brief_id
        )
      );

      RETURN jsonb_build_object(
        'duplicate', false,
        'conflict', true,
        'error', 'conflicting_payload_for_event_id',
        'projectBriefId', v_existing_brief_id,
        'leadId', v_existing_lead_id,
        'reference', v_existing_reference
      );
    END IF;

    RETURN jsonb_build_object(
      'duplicate', true,
      'conflict', false,
      'projectBriefId', v_existing_brief_id,
      'leadId', v_existing_lead_id,
      'reference', v_existing_reference
    );
  END IF;

  INSERT INTO public.project_briefs(
    reference, service_id, contact_name, contact_email, contact_phone,
    organization_name, status, payload, attribution
  )
  VALUES (
    p_reference, v_chosen_service, p_contact_name, p_contact_email, p_contact_phone,
    p_organization_name, 'submitted', p_payload, coalesce(p_attribution, '{}'::jsonb)
  )
  RETURNING id INTO v_brief_id;

  INSERT INTO public.leads(project_brief_id, status)
  VALUES (v_brief_id, 'new')
  RETURNING id INTO v_lead_id;

  UPDATE public.webhook_events
     SET project_brief_id = v_brief_id, lead_id = v_lead_id, state = 'processed', processed_at = now()
   WHERE id = v_event_id;

  INSERT INTO public.audit_logs(action, entity_type, entity_id, after_data)
  VALUES (
    'lead.ingested_from_leadconnector', 'lead', v_lead_id::text,
    jsonb_build_object(
      'leadId', v_lead_id, 'briefId', v_brief_id, 'reference', p_reference,
      'serviceId', v_chosen_service, 'providerEventId', p_provider_event_id,
      'provider', 'leadconnector'
    )
  );

  RETURN jsonb_build_object(
    'duplicate', false,
    'projectBriefId', v_brief_id,
    'leadId', v_lead_id,
    'reference', p_reference,
    'serviceId', v_chosen_service
  );
END $$;

REVOKE ALL ON FUNCTION public.ingest_leadconnector_event(
  text, text, text, text, text, text, text, text, jsonb, jsonb
) FROM public;
GRANT EXECUTE ON FUNCTION public.ingest_leadconnector_event(
  text, text, text, text, text, text, text, text, jsonb, jsonb
) TO service_role;


COMMIT;
-- ==============================================================================
-- END OF COMPOSITE ROLLOUT SCRIPT (MIGRATIONS 0006 & 0007)
-- ==============================================================================
