-- CHỈ ĐỌC. Sau khi chạy apply-phase3.sql, chạy file này để kiểm tra quyền.
with checks as (
  select 'rls_on_all_mca_tables' as name,(select count(*)=5 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('profiles','creatures','creature_abilities','creature_favorites','mca_submission_requests') and c.relrowsecurity) as ok
  union all select 'submission_rpc_grants',
    has_function_privilege('authenticated','public.mca_submit_creature(uuid,jsonb,text)','EXECUTE')
    and not has_function_privilege('anon','public.mca_submit_creature(uuid,jsonb,text)','EXECUTE')
  union all select 'review_rpc_grants',
    has_function_privilege('authenticated','public.mca_review_creature(text,text,text)','EXECUTE')
    and not has_function_privilege('anon','public.mca_review_creature(text,text,text)','EXECUTE')
  union all select 'legacy_review_revoked',
    not has_function_privilege('authenticated','public.admin_review_creature(bigint,text,text)','EXECUTE')
    and not has_function_privilege('anon','public.admin_review_creature(bigint,text,text)','EXECUTE')
  union all select 'profile_name_only_update',
    has_column_privilege('authenticated','public.profiles','username','UPDATE')
    and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name<>'username'
      and has_column_privilege('authenticated','public.profiles',column_name,'UPDATE'))
  union all select 'no_direct_creature_writes',not exists(
    select 1 from information_schema.columns where table_schema='public' and table_name in ('creatures','creature_abilities')
      and (has_column_privilege('authenticated',format('public.%I',table_name),column_name,'INSERT')
        or has_column_privilege('authenticated',format('public.%I',table_name),column_name,'UPDATE')))
  union all select 'no_browser_truncate',not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('profiles','creatures','creature_abilities','creature_favorites','mca_submission_requests')
      and (has_table_privilege('anon',c.oid,'TRUNCATE') or has_table_privilege('authenticated',c.oid,'TRUNCATE')))
  union all select 'auth_trigger_preserved',exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created'
    and tgfoid=to_regprocedure('public.handle_new_user()') and tgenabled='O')
  union all select 'image_bucket_limits',exists(select 1 from storage.buckets where id='creature-images' and public and file_size_limit=5242880
    and allowed_mime_types @> array['image/jpeg','image/png','image/webp'] and allowed_mime_types <@ array['image/jpeg','image/png','image/webp'])
)
select bool_and(ok) as mca_phase3_ready,jsonb_object_agg(name,ok) as checks from checks;
