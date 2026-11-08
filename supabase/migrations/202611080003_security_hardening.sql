-- ENGINE//OS Migration 202611080003: Security Hardening & Storage Lifecycle Policies
-- Platform: NOTREAL ENGINE, LLC

-- 1. Grant execute on brief submission RPC to authenticated users as well as anon
GRANT EXECUTE ON FUNCTION public.submit_project_brief(jsonb,text,text) TO authenticated;

-- 2. Storage objects deletion & update policies for organization admins and staff
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
