-- CHỈ ĐỌC. Chạy cả file trong Supabase > SQL Editor > New query > Run.
-- Kết quả là MỘT ô JSON: dùng Copy cell hoặc Download CSV để gửi đối chiếu.
-- Không sửa bảng, quyền hoặc dữ liệu. Không cần khóa bí mật.
with target_tables as (
  select c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) as owner
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in ('profiles','creatures','creature_abilities','creature_favorites','mca_submission_requests')
), target_triggers as (
  select t.oid,t.tgfoid,t.tgrelid,t.tgname
  from pg_trigger t where not t.tgisinternal and (t.tgrelid in (select oid from target_tables) or t.tgrelid=to_regclass('auth.users'))
), target_functions as (
  select p.*,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname='public' and (p.prosecdef or p.proname in ('admin_review_creature','mca_submit_creature','mca_review_creature')))
     or p.oid in (select tgfoid from target_triggers)
)
select jsonb_pretty(jsonb_build_object(
  'tables',coalesce((select jsonb_agg(to_jsonb(t)) from target_tables t),'[]'::jsonb),
  'columns',coalesce((select jsonb_agg(to_jsonb(c) order by table_name,ordinal_position) from (
    select table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default,character_maximum_length,is_identity,identity_generation
    from information_schema.columns where table_schema='public' and table_name in (select relname from target_tables)
  ) c),'[]'::jsonb),
  'constraints',coalesce((select jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,'name',conname,'definition',pg_get_constraintdef(oid)))
    from pg_constraint where conrelid in (select oid from target_tables)),'[]'::jsonb),
  'policies',coalesce((select jsonb_agg(to_jsonb(p)) from pg_policies p where
    (schemaname='public' and tablename in (select relname from target_tables)) or (schemaname='storage' and tablename='objects')),'[]'::jsonb),
  'table_grants',coalesce((select jsonb_agg(to_jsonb(g)) from information_schema.role_table_grants g
    where (table_schema='public' and table_name in (select relname from target_tables)) or (table_schema='storage' and table_name='objects')),'[]'::jsonb),
  'column_grants',coalesce((select jsonb_agg(to_jsonb(g)) from information_schema.role_column_grants g
    where table_schema='public' and table_name in (select relname from target_tables)),'[]'::jsonb),
  'triggers',coalesce((select jsonb_agg(jsonb_build_object('table',tgrelid::regclass::text,'name',tgname,'definition',pg_get_triggerdef(oid))) from target_triggers),'[]'::jsonb),
  'functions',coalesce((select jsonb_agg(jsonb_build_object('signature',oid::regprocedure::text,'owner',pg_get_userbyid(proowner),
    'security_definer',prosecdef,'settings',proconfig,'permissions',proacl,'definition',pg_get_functiondef(oid))) from target_functions),'[]'::jsonb),
  'enums',coalesce((select jsonb_agg(to_jsonb(e)) from (
    select n.nspname as schema_name,t.typname,e.enumlabel,e.enumsortorder
    from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace where n.nspname='public'
  ) e),'[]'::jsonb),
  'bucket',coalesce((select to_jsonb(b) from (select id,name,public,file_size_limit,allowed_mime_types from storage.buckets where id='creature-images') b),'null'::jsonb)
)) as mca_audit;
