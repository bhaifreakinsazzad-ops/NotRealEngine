-- ENGINE//OS Migration 202611080005: V12 Commercial, Terms, Financial & Provisioning Hardening
-- Platform: NOTREAL ENGINE, LLC
-- Directive: Master Directive V12.0 Sections 2, 3, 4

-- =============================================================================
-- 1. STRICT INTAKE RPC BOUNDARY
-- =============================================================================
-- Prevent ordinary authenticated clients from calling submit_project_brief directly with arbitrary p_request_hash.
-- Only service_role (via the server-side /api/project-briefs route) may invoke submit_project_brief.
REVOKE EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) TO service_role;

-- =============================================================================
-- 2. SERVER-AUTHORITATIVE COMMERCIAL TERMS GOVERNANCE
-- =============================================================================
-- Distinguishes draft, staging_synthetic, approved_production, and retired terms.
-- Hardcoded production terms are NEVER pre-approved without verified founder approval metadata.
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

-- Seed authoritative terms classifications:
-- 1) ENGINE//OS-TERMS-V1.0 and STANDARD-V1.0 are strictly 'draft' until founder sign-off!
-- 2) STAGING-TEST-TERMS-V1.0 is strictly 'staging_synthetic' (valid only for non-production staging verification).
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
-- 3. AUTHORIZED SIGNATORY & TERMS GOVERNANCE IN decide_quote
-- =============================================================================
-- Enforces at the PostgreSQL RPC boundary:
-- 1. Caller must be an organization owner or admin (public.is_org_admin) or staff. Viewers cannot accept/reject.
-- 2. Quote must be in 'sent' state, unexpired, with a valid snapshot.
-- 3. When p_decision = 'accepted', the quote's terms_version MUST exist in public.commercial_terms_versions
--    and have classification IN ('approved_production', 'staging_synthetic'). Draft or retired terms are blocked!
-- 4. Records terms_version, document_id, classification, accepting user, and timestamp in accepted_snapshot.
CREATE OR REPLACE FUNCTION public.decide_quote(p_quote_id uuid, p_decision text, p_ip_hash text DEFAULT null)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q public.quotes;
  t public.commercial_terms_versions;
  acceptance_id uuid;
  order_id uuid;
  enriched_snapshot jsonb;
BEGIN
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
    IF t.classification NOT IN ('approved_production', 'staging_synthetic') THEN
      RAISE EXCEPTION 'unapproved_terms_version: terms version % has classification % and cannot bind an order', q.terms_version, t.classification;
    END IF;
  END IF;

  enriched_snapshot := q.snapshot || jsonb_build_object(
    'acceptanceGovernance', jsonb_build_object(
      'termsVersion', q.terms_version,
      'documentId', coalesce(t.document_id, 'UNREGISTERED'),
      'termsClassification', coalesce(t.classification, 'draft'),
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
    VALUES('quote',q.id::text,'Quote Accepted',jsonb_build_object('quote_id',q.id,'order_id',order_id,'terms_classification',t.classification),'disabled','quote-accepted:'||q.id::text)
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  INSERT INTO public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_data)
  VALUES(q.organization_id,auth.uid(),'quote.'||p_decision,'quote',q.id::text,jsonb_build_object('acceptance_id',acceptance_id,'order_id',order_id,'terms_version',q.terms_version,'terms_classification',t.classification));

  RETURN coalesce(order_id, acceptance_id);
END $$;

REVOKE ALL ON FUNCTION public.decide_quote(uuid,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.decide_quote(uuid,text,text) TO authenticated;

-- =============================================================================
-- 4. FINANCIAL-STATE CLEARANCE ENFORCEMENT ON ORDERS
-- =============================================================================
-- Prevents an unpaid order from silently becoming 'confirmed', 'in_production', or 'completed'
-- unless either:
--   (a) A verified paid payment_transaction exists for the order (state = 'paid' AND verified_at IS NOT NULL), OR
--   (b) An explicit authorized manual settlement record is present on commercial_snapshot->'settlement'
--       with status = 'approved_manual_settlement', a valid reference, and approvedBy actor.
CREATE OR REPLACE FUNCTION public.verify_order_financial_clearance()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  has_verified_payment boolean := false;
  has_manual_settlement boolean := false;
BEGIN
  IF new.state IN ('confirmed', 'in_production', 'completed') AND (old.state IS DISTINCT FROM new.state) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.payment_transactions pt
      WHERE pt.order_id = new.id
        AND pt.state = 'paid'
        AND pt.verified_at IS NOT NULL
    ) INTO has_verified_payment;

    has_manual_settlement := (
      coalesce(new.commercial_snapshot->'settlement'->>'status', '') = 'approved_manual_settlement'
      AND coalesce(trim(new.commercial_snapshot->'settlement'->>'reference'), '') <> ''
      AND coalesce(trim(new.commercial_snapshot->'settlement'->>'approvedBy'), '') <> ''
    );

    IF NOT has_verified_payment AND NOT has_manual_settlement THEN
      RAISE EXCEPTION 'order_financial_clearance_required: order % cannot transition to % without a verified payment or approved manual settlement record', new.id, new.state
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
-- 5. ATOMIC & IDEMPOTENT PROJECT PROVISIONING RPC + REQUIREMENTS STAFF POLICY
-- =============================================================================
DROP POLICY IF EXISTS requirements_staff_all ON public.project_requirements;
CREATE POLICY requirements_staff_all ON public.project_requirements FOR ALL TO authenticated
  USING (public.current_user_is_staff())
  WITH CHECK (public.current_user_is_staff());

-- Atomic RPC: validates order eligibility, verifies service identity, creates project,
-- seeds requirements and milestones, records audit & outbox in one transaction.
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
BEGIN
  IF NOT public.current_user_is_staff() AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized_staff_only';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF o.id IS NULL THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  -- Check idempotency after locking the order row
  SELECT id INTO existing_project_id FROM public.projects WHERE order_id = o.id;
  IF existing_project_id IS NOT NULL THEN
    RETURN existing_project_id;
  END IF;

  IF o.state NOT IN ('confirmed', 'in_production') THEN
    RAISE EXCEPTION 'order_not_confirmed: order must be confirmed before provisioning a project workspace (current state: %)', o.state;
  END IF;

  -- Resolve service_id from parameter, linked project brief, or commercial snapshot (never substitute unrelated fallback!)
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

  -- Insert requirements atomically
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

  -- Insert milestones atomically
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

-- =============================================================================
-- 6. STAFF ROLE GRANULARITY FOR FOUNDER ADMIN PROMOTION
-- =============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text
  CHECK (role IS NULL OR role IN ('super_admin', 'sales_ops', 'delivery_manager', 'finance', 'support'));

