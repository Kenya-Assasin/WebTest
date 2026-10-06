-- Runs inside apply-phase3.sql's transaction. Fail before changing anything if
-- the target no longer matches the reviewed schema or phase 3 was already applied.
do $$
declare expected record;
begin
  if current_user <> 'postgres' then raise exception 'Run this migration as postgres in Supabase SQL Editor'; end if;
  if to_regclass('public.creature_favorites') is not null or to_regclass('public.mca_submission_requests') is not null
     or to_regprocedure('public.mca_submit_creature(uuid,jsonb,text)') is not null then
    raise exception 'PHASE3_ALREADY_PRESENT: stop and verify the existing migration';
  end if;
  for expected in select * from (values
    ('creatures','id','bigint'),('creatures','creator_id','uuid'),('creature_abilities','creature_id','bigint'),
    ('profiles','id','uuid'),('profiles','role','text'),('profiles','username','text'),('profiles','updated_at','timestamp with time zone')
  ) fields(table_name,column_name,type_name) loop
    if not exists(select 1 from information_schema.columns c where c.table_schema='public'
      and c.table_name=expected.table_name and c.column_name=expected.column_name and c.data_type=expected.type_name) then
      raise exception 'AUDIT_MISMATCH: %.%',expected.table_name,expected.column_name;
    end if;
  end loop;
  if not exists(select 1 from information_schema.columns where table_schema='storage' and table_name='objects' and column_name='owner_id' and data_type='text')
     or not exists(select 1 from information_schema.columns where table_schema='storage' and table_name='objects' and column_name='metadata' and data_type='jsonb') then
    raise exception 'STORAGE_SCHEMA_MISMATCH';
  end if;
  if not exists(select 1 from storage.buckets where id='creature-images' and public) then raise exception 'PUBLIC_IMAGE_BUCKET_REQUIRED'; end if;
  if not exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created'
      and tgfoid=to_regprocedure('public.handle_new_user()') and not tgisinternal and tgenabled='O') then
    raise exception 'AUTH_TRIGGER_MISMATCH';
  end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef
    and p.oid not in (select signature::oid from unnest(array[
      to_regprocedure('public.handle_new_user()'),to_regprocedure('public.is_admin()'),
      to_regprocedure('public.admin_review_creature(bigint,text,text)')
    ]) signature where signature is not null)) then
    raise exception 'UNREVIEWED_SECURITY_DEFINER_FUNCTION';
  end if;
  if exists(select 1 from pg_class c where c.oid in ('public.profiles'::regclass,'public.creatures'::regclass,'public.creature_abilities'::regclass)
    and (c.relforcerowsecurity or pg_get_userbyid(c.relowner)<>'postgres')) then
    raise exception 'TABLE_OWNER_OR_FORCE_RLS_MISMATCH';
  end if;
end $$;
