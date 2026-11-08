-- ENGINE//OS Migration 202611080005: V11 Commercial & RPC Hardening
-- Platform: NOTREAL ENGINE, LLC
-- Directive: Master Directive V11.0 Tasks 4 & 9

-- 1. STRICT INTAKE RPC BOUNDARY
-- Prevent ordinary authenticated clients from calling submit_project_brief directly with arbitrary p_request_hash.
-- Only service_role (via the server-side /api/project-briefs route) may invoke submit_project_brief.
REVOKE EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) TO service_role;

-- 2. AUTHORIZED SIGNATORY & TERMS GOVERNANCE IN decide_quote
-- Requires caller to be an organization owner or admin (public.is_org_admin) rather than a read-only viewer.
-- Also verifies terms_version is present and non-empty.
CREATE OR REPLACE FUNCTION public.decide_quote(p_quote_id uuid, p_decision text, p_ip_hash text DEFAULT null)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; DECLARE acceptance_id uuid; DECLARE order_id uuid;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF q.id IS NULL OR NOT public.is_org_member(q.organization_id) THEN RAISE EXCEPTION 'quote_not_found'; END IF;
  IF NOT public.is_org_admin(q.organization_id) AND NOT public.current_user_is_staff() THEN
    RAISE EXCEPTION 'unauthorized_signatory: only organization owners or admins may accept or reject a quote';
  END IF;
  IF q.state <> 'sent' OR q.valid_until <= now() THEN RAISE EXCEPTION 'quote_not_acceptable'; END IF;
  IF p_decision NOT IN ('accepted','rejected') THEN RAISE EXCEPTION 'invalid_decision'; END IF;
  IF q.snapshot IS NULL THEN RAISE EXCEPTION 'missing_snapshot'; END IF;
  IF coalesce(trim(q.terms_version), '') = '' THEN RAISE EXCEPTION 'missing_terms_version'; END IF;
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

-- 3. STAFF MANAGEMENT POLICY ON PROJECT REQUIREMENTS
-- Allows staff to insert/update/delete project_requirements when initializing project workspaces.
DROP POLICY IF EXISTS requirements_staff_all ON public.project_requirements;
CREATE POLICY requirements_staff_all ON public.project_requirements FOR ALL TO authenticated
  USING (public.current_user_is_staff())
  WITH CHECK (public.current_user_is_staff());

