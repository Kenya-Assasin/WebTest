-- Read-only verification after apply-origins.sql.
with checks as (
  select 'catalog_rls' as name,coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.origin_locations')),false) as ok
  union all select 'origin_columns',(select count(*)=3 from information_schema.columns where table_schema='public' and table_name='creatures' and column_name in ('nebula','star_system','origin_planet_id'))
  union all select 'parent_trigger',exists(select 1 from pg_trigger where tgrelid=to_regclass('public.origin_locations') and tgname='mca_origin_parent' and tgenabled='O')
  union all select 'catalog_no_browser_write',not exists(select 1 from information_schema.columns where table_schema='public' and table_name='origin_locations'
    and (has_column_privilege('authenticated','public.origin_locations',column_name,'INSERT') or has_column_privilege('authenticated','public.origin_locations',column_name,'UPDATE')))
    and not has_table_privilege('authenticated','public.origin_locations','DELETE,TRUNCATE')
    and not has_table_privilege('anon','public.origin_locations','DELETE,TRUNCATE')
  union all select 'rpc_permissions',has_function_privilege('authenticated','public.mca_add_origin(text,text,uuid)','EXECUTE')
    and has_function_privilege('authenticated','public.mca_submit_creature_with_origin(uuid,jsonb,text)','EXECUTE')
    and has_function_privilege('authenticated','public.mca_review_origin(uuid,text,text)','EXECUTE')
    and not has_function_privilege('anon','public.mca_add_origin(text,text,uuid)','EXECUTE')
    and not has_function_privilege('anon','public.mca_submit_creature_with_origin(uuid,jsonb,text)','EXECUTE')
    and not has_function_privilege('anon','public.mca_review_origin(uuid,text,text)','EXECUTE')
  union all select 'moderated_visibility',exists(select 1 from pg_policies where schemaname='public' and tablename='origin_locations' and policyname='mca_origin_public_read' and qual like '%approved%')
    and exists(select 1 from pg_policies where schemaname='public' and tablename='origin_locations' and policyname='mca_origin_account_read' and qual like '%created_by%')
)
select bool_and(ok) as mca_origins_ready,jsonb_object_agg(name,ok) as checks from checks;
