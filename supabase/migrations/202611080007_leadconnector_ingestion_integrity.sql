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
