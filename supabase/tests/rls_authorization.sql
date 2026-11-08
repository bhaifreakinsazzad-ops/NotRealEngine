-- Run against a disposable Supabase test project after migrations.
begin;
select plan(8);

select has_table('public','organizations','organizations exists');
select has_table('public','quotes','quotes exists');
select has_function('public','decide_quote',array['uuid','text','text'],'quote decision RPC exists');
select has_function('public','submit_project_brief',array['jsonb','text','text'],'anonymous intake RPC exists');
select policies_are('public','orders',array['orders_org_select','orders_staff_all'],'orders are protected by organization/staff policies');
select policies_are('public','projects',array['projects_org_select','projects_staff_all'],'projects are protected by organization/staff policies');
select policies_are('public','project_files',array['files_org_select','files_org_insert'],'project file metadata is tenant protected');
select col_is_pk('public','quote_acceptances','id','acceptance records have a primary key');

select * from finish();
rollback;
