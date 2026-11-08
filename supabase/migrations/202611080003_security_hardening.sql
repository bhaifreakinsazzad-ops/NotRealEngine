-- ENGINE//OS Migration 202611080003: Security Hardening & Storage Access Policies
-- Applied to support authenticated brief submissions and controlled file deletion

begin;

-- 1. Allow authenticated clients as well as anonymous guests to submit project briefs
grant execute on function public.submit_project_brief(jsonb,text,text) to authenticated;

-- 2. Explicitly allow organization admins or internal staff to delete project files
create policy project_files_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'project-files' and exists (
    select 1 from public.projects p 
    where p.id::text = (storage.foldername(name))[1] 
      and (public.is_org_admin(p.organization_id) or public.current_user_is_staff())
  )
);

-- 3. Explicitly allow organization admins or internal staff to update/replace project files
create policy project_files_storage_update on storage.objects for update to authenticated using (
  bucket_id = 'project-files' and exists (
    select 1 from public.projects p 
    where p.id::text = (storage.foldername(name))[1] 
      and (public.is_org_admin(p.organization_id) or public.current_user_is_staff())
  )
);

commit;
