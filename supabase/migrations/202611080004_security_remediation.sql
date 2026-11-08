-- ENGINE//OS Migration 202611080004: Security Remediation & Cross-Tenant Integrity
-- Platform: NOTREAL ENGINE, LLC
-- Directive: Master Directive V10.0 Section 2

-- 1. INTAKE RPC SECURITY HARDENING
-- Revoke anon execute grant to prevent client-side rate limit bypass.
-- Project intake must occur through trusted server route (/api/project-briefs).
REVOKE EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) TO authenticated;

-- 2. CROSS-ORGANIZATION RELATIONSHIP INTEGRITY TRIGGER
-- Prevents any child record from referencing a project belonging to a different organization.
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

-- 3. HARDENED RLS POLICIES FOR CROSS-ORGANIZATION INTEGRITY
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

-- 4. HARDENED STORAGE UPDATE POLICY (VALIDATING BOTH CURRENT & DESTINATION PATH)
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
