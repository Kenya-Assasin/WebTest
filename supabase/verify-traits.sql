-- Read-only, after apply-traits.sql.
with checks as (
select 'terms_rls' as name,coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.creature_terms')),false) as ok
union all select 'element_links_rls',coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.creature_elements')),false)
union all select 'trait_columns',(select count(*)=6 from information_schema.columns where table_schema='public' and table_name='creatures'
  and column_name in ('traits_version','species_term_id','species_name','element_codes','element_names','dimensions'))
union all select 'no_direct_writes',not has_table_privilege('authenticated','public.creature_terms','INSERT,UPDATE,DELETE,TRUNCATE')
  and not has_table_privilege('anon','public.creature_terms','INSERT,UPDATE,DELETE,TRUNCATE')
  and not has_table_privilege('authenticated','public.creature_elements','INSERT,UPDATE,DELETE,TRUNCATE')
  and not has_table_privilege('anon','public.creature_elements','INSERT,UPDATE,DELETE,TRUNCATE')
union all select 'rpc_permissions',has_function_privilege('authenticated','public.mca_submit_creature_v2(uuid,jsonb,text)','EXECUTE')
  and has_function_privilege('authenticated','public.mca_add_term(text,text)','EXECUTE')
  and has_function_privilege('authenticated','public.mca_review_term(uuid,text,text)','EXECUTE')
  and not has_function_privilege('anon','public.mca_submit_creature_v2(uuid,jsonb,text)','EXECUTE')
  and not has_function_privilege('anon','public.mca_add_term(text,text)','EXECUTE')
  and not has_function_privilege('anon','public.mca_review_term(uuid,text,text)','EXECUTE')
)
select bool_and(ok) as mca_traits_ready,jsonb_object_agg(name,ok) as checks from checks;
