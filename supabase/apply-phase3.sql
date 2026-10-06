-- MCA phase 3: reviewed against the CSV audit supplied on 2026-10-06.
-- Run the WHOLE file once as postgres in Supabase SQL Editor.
-- Preserves existing creatures/abilities/profiles and public images.
-- Changes browser write permissions: use the Next.js phase 3 frontend afterwards.
-- All changes roll back if any statement fails. Do not run 001/002/003 separately afterwards.
begin;
select pg_advisory_xact_lock(hashtextextended('mca:phase3:migration',0));
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

-- Reviewed against supabase/audits/20261006-before-phase3.json.
-- Additive: does not replace existing profiles/creatures/abilities or remove their data.

-- Match the existing creature ID type rather than assuming bigint or UUID.
do $$
declare id_type text;
begin
  select pg_catalog.format_type(atttypid, atttypmod) into id_type
  from pg_catalog.pg_attribute where attrelid = 'public.creatures'::regclass and attname = 'id' and not attisdropped;
  if id_type not in ('bigint', 'integer', 'uuid') then raise exception 'Unsupported creatures.id type: %', id_type; end if;
  execute format('create table public.creature_favorites (
    user_id uuid not null references auth.users(id) on delete cascade,
    creature_id %s not null references public.creatures(id) on delete cascade,
    created_at timestamptz not null default now(), primary key (user_id, creature_id))', id_type);
  execute format('create table public.mca_submission_requests (
    user_id uuid not null references auth.users(id) on delete cascade,
    request_id uuid not null, draft jsonb not null, image_path text,
    creature_id %s references public.creatures(id) on delete set null,
    created_at timestamptz not null default now(), primary key (user_id, request_id))', id_type);
end $$;
create index creature_favorites_recent on public.creature_favorites(user_id, created_at desc, creature_id);
create index creature_favorites_creature on public.creature_favorites(creature_id);
create index mca_submission_creature on public.mca_submission_requests(creature_id);

alter table public.creature_favorites enable row level security;
alter table public.mca_submission_requests enable row level security;
revoke all on public.creature_favorites, public.mca_submission_requests from public, anon, authenticated;
grant select, insert, delete on public.creature_favorites to authenticated;
create policy mca_favorites_read on public.creature_favorites for select to authenticated using (user_id = (select auth.uid()));
create policy mca_favorites_insert on public.creature_favorites for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.creatures c where c.id = creature_id));
create policy mca_favorites_delete on public.creature_favorites for delete to authenticated using (user_id = (select auth.uid()));
-- No table grants/policies on submission requests: accessed only through the RPC.

create function public.mca_submit_creature(p_request_id uuid, p_draft jsonb, p_image_path text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_owner_id uuid := auth.uid();
  previous public.mca_submission_requests%rowtype;
  creature public.creatures%rowtype;
  ability jsonb;
  field_name text;
  field_limit integer;
  image_url text;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_request_id is null then raise exception 'DRAFT_INVALID: request id' using errcode = '22023'; end if;
  -- Serialize retries for one owner/request pair, including concurrent requests.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_owner_id::text || ':' || p_request_id::text, 0));
  select * into previous from public.mca_submission_requests where user_id = v_owner_id and request_id = p_request_id;
  if found then
    if previous.draft is distinct from p_draft or previous.image_path is distinct from p_image_path then
      raise exception 'REQUEST_CONFLICT' using errcode = '22023';
    end if;
    if previous.creature_id is null then raise exception 'REQUEST_RECORD_REMOVED' using errcode = 'P0002'; end if;
    select * into creature from public.creatures where id = previous.creature_id;
    return to_jsonb(creature);
  end if;
  if jsonb_typeof(p_draft) is distinct from 'object' then raise exception 'DRAFT_INVALID: object' using errcode = '22023'; end if;
  for field_name, field_limit in select * from (values
    ('name',100),('species',50),('universe',100),('galaxy',100),('planet',100),('world',150),('age',50),('size',100),
    ('element',50),('rarity',50),('powerSource',150),('threatLevel',10),('description',3000),('appearance',2000),
    ('weaknesses',2000),('limitations',2000),('strongestAbilityCondition',1500)) as limits(name, max_length)
  loop
    if jsonb_typeof(p_draft -> field_name) is distinct from 'string' or length(p_draft ->> field_name) > field_limit then
      raise exception 'DRAFT_INVALID: %', field_name using errcode = '22023';
    end if;
  end loop;
  if btrim(p_draft->>'name') = '' or btrim(p_draft->>'universe') = '' or btrim(p_draft->>'planet') = ''
     or length(btrim(p_draft->>'description')) < 30 or btrim(p_draft->>'weaknesses') = ''
     or p_draft->>'species' not in ('dragon','beast','entity','insect','mythical','humanoid','machine','plant','unknown')
     or p_draft->>'threatLevel' not in ('F','E','D','C','B','A','S','SS','X')
     or p_draft->>'element' not in ('','fire','ice','water','earth','wind','light','dark','void','space','crystal','electric','multi','unknown')
     or p_draft->>'rarity' not in ('','common','uncommon','rare','epic','legendary','unique','unknown') then
    raise exception 'DRAFT_INVALID: required fields' using errcode = '22023';
  end if;
  if jsonb_typeof(p_draft->'abilities') is distinct from 'array' then raise exception 'DRAFT_INVALID: abilities' using errcode = '22023'; end if;
  if jsonb_array_length(p_draft->'abilities') not between 1 and 5 then raise exception 'DRAFT_INVALID: ability count' using errcode = '22023'; end if;
  for ability in select * from jsonb_array_elements(p_draft->'abilities') loop
    if jsonb_typeof(ability) is distinct from 'object' or jsonb_typeof(ability->'name') is distinct from 'string'
       or jsonb_typeof(ability->'description') is distinct from 'string'
       or length(btrim(ability->>'name')) not between 1 and 100 or length(ability->>'description') > 1000 then
      raise exception 'DRAFT_INVALID: ability' using errcode = '22023';
    end if;
  end loop;
  if p_image_path is not null then
    if p_image_path !~ ('^' || v_owner_id::text || '/' || p_request_id::text || '\.(jpg|png|webp)$')
       or not exists (select 1 from storage.objects o join storage.buckets b on b.id = o.bucket_id
         where o.bucket_id = 'creature-images' and o.name = p_image_path and b.public
           and o.owner_id = v_owner_id::text and (o.metadata->>'mimetype') in ('image/jpeg','image/png','image/webp')
           and (o.metadata->>'size')::bigint between 1 and 5242880) then
      raise exception 'IMAGE_INVALID' using errcode = '22023';
    end if;
    -- Resolve this path against NEXT_PUBLIC_SUPABASE_URL in the frontend.
    image_url := '/storage/v1/object/public/creature-images/' || p_image_path;
  end if;
  insert into public.creatures (creator_id,name,species,universe,galaxy,planet,world,age,size,element,rarity,power_source,
    proposed_threat_level,verified_threat_level,description,appearance,weaknesses,limitations,strongest_ability_condition,image_url,status)
  values (v_owner_id,btrim(p_draft->>'name'),p_draft->>'species',btrim(p_draft->>'universe'),nullif(btrim(p_draft->>'galaxy'),''),
    btrim(p_draft->>'planet'),nullif(btrim(p_draft->>'world'),''),nullif(btrim(p_draft->>'age'),''),nullif(btrim(p_draft->>'size'),''),
    nullif(p_draft->>'element',''),nullif(p_draft->>'rarity',''),nullif(btrim(p_draft->>'powerSource'),''),p_draft->>'threatLevel',null,
    btrim(p_draft->>'description'),nullif(btrim(p_draft->>'appearance'),''),btrim(p_draft->>'weaknesses'),nullif(btrim(p_draft->>'limitations'),''),
    nullif(btrim(p_draft->>'strongestAbilityCondition'),''),image_url,'pending') returning * into creature;
  -- Respect an existing backend trigger which already sets the code.
  if creature.creature_code is null or creature.creature_code = '' then
    update public.creatures set creature_code = case when id::text ~ '^[0-9]+$'
      then 'VX-' || case when length(id::text) < 4 then lpad(id::text,4,'0') else id::text end
      else 'MCA-' || id::text end where id = creature.id returning * into creature;
  end if;
  insert into public.creature_abilities(creature_id,ability_name,ability_description)
    select creature.id,btrim(a->>'name'),nullif(btrim(a->>'description'),'') from jsonb_array_elements(p_draft->'abilities') a;
  insert into public.mca_submission_requests(user_id,request_id,draft,image_path,creature_id)
    values (v_owner_id,p_request_id,p_draft,p_image_path,creature.id);
  return to_jsonb(creature);
end $$;
revoke all on function public.mca_submit_creature(uuid,jsonb,text) from public, anon;
grant execute on function public.mca_submit_creature(uuid,jsonb,text) to authenticated;

-- A new name avoids accidentally leaving an old admin RPC overload executable.
create function public.mca_review_creature(p_creature_id text,p_status text,p_verified_threat_level text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_status not in ('verified','investigation','conflicting') or p_status is null
     or (p_status = 'verified' and (p_verified_threat_level is null or p_verified_threat_level not in ('F','E','D','C','B','A','S','SS','X'))) then
    raise exception 'REVIEW_INVALID' using errcode = '22023';
  end if;
  update public.creatures set status = p_status, verified_threat_level = case when p_status = 'verified' then p_verified_threat_level else null end,
    updated_at = now() where id::text = p_creature_id;
  if not found then raise exception 'CREATURE_NOT_FOUND' using errcode = 'P0002'; end if;
end $$;
revoke all on function public.mca_review_creature(text,text,text) from public, anon;
grant execute on function public.mca_review_creature(text,text,text) to authenticated;
notify pgrst, 'reload schema';

-- Reviewed policy baseline for the supplied 2026-10-06 audit.
-- Public archive reads; all creature/ability writes go through audited RPCs.
-- Keeps all rows. Intentionally retires browser writes used by the static website.

alter table public.profiles enable row level security;
alter table public.creatures enable row level security;
alter table public.creature_abilities enable row level security;

-- Existing permissive policies cannot bypass restrictive gates below.
create policy mca_profiles_owner_gate on public.profiles as restrictive for all to anon, authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy mca_profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy mca_profiles_name_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy mca_creatures_read on public.creatures for select to anon, authenticated using (true);
create policy mca_abilities_read on public.creature_abilities for select to anon, authenticated
  using (exists (select 1 from public.creatures c where c.id = creature_id));
create policy mca_creatures_no_insert on public.creatures as restrictive for insert to anon, authenticated with check (false);
create policy mca_creatures_no_update on public.creatures as restrictive for update to anon, authenticated using (false) with check (false);
create policy mca_creatures_no_delete on public.creatures as restrictive for delete to anon, authenticated using (false);
create policy mca_abilities_no_insert on public.creature_abilities as restrictive for insert to anon, authenticated with check (false);
create policy mca_abilities_no_update on public.creature_abilities as restrictive for update to anon, authenticated using (false) with check (false);
create policy mca_abilities_no_delete on public.creature_abilities as restrictive for delete to anon, authenticated using (false);
revoke all on public.profiles,public.creatures,public.creature_abilities from public,anon,authenticated;
-- Table revocation alone does not revoke pre-existing column grants.
do $$
declare target record;
begin
  for target in select table_name,string_agg(quote_ident(column_name),',') as columns
    from information_schema.columns where table_schema='public' and table_name in ('profiles','creatures','creature_abilities') group by table_name
  loop
    execute format('revoke select (%s), insert (%s), update (%s), references (%s) on public.%I from public,anon,authenticated',target.columns,target.columns,target.columns,target.columns,target.table_name);
  end loop;
end $$;
grant select on public.creatures,public.creature_abilities to anon,authenticated;
grant select on public.profiles to authenticated;
grant update(username) on public.profiles to authenticated;

-- Revoke the old review RPC(s). Other existing SECURITY DEFINER functions must be
-- inspected in the audit before this baseline can be considered sufficient.
do $$
declare old_rpc record;
begin
  for old_rpc in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='admin_review_creature'
  loop execute format('revoke all on function %s from public,anon,authenticated',old_rpc.signature); end loop;
end $$;

-- Restrict only creature-images, preserving behavior of unrelated buckets.
-- SELECT is needed for safe cleanup; public image downloads remain public.
create policy mca_image_write_gate on storage.objects as restrictive for all to anon,authenticated
  using (bucket_id <> 'creature-images' or ((storage.foldername(name))[1] = (select auth.uid())::text and owner_id = (select auth.uid())::text))
  with check (bucket_id <> 'creature-images' or ((storage.foldername(name))[1] = (select auth.uid())::text and owner_id = (select auth.uid())::text));
create policy mca_image_insert on storage.objects for insert to authenticated
  with check (bucket_id='creature-images' and (storage.foldername(name))[1]=(select auth.uid())::text and owner_id=(select auth.uid())::text);
create policy mca_image_owner_read on storage.objects for select to authenticated
  using (bucket_id='creature-images' and (storage.foldername(name))[1]=(select auth.uid())::text and owner_id=(select auth.uid())::text);
create policy mca_image_unused_delete on storage.objects for delete to authenticated
  using (bucket_id='creature-images' and (storage.foldername(name))[1]=(select auth.uid())::text and owner_id=(select auth.uid())::text
    and not exists (select 1 from public.creatures c where c.image_url = '/storage/v1/object/public/creature-images/' || storage.objects.name
      or c.image_url like '%/storage/v1/object/public/creature-images/' || storage.objects.name));
-- Existing broad DELETE policies must not allow deletion of a committed image.
create policy mca_image_delete_gate on storage.objects as restrictive for delete to anon,authenticated
  using (bucket_id <> 'creature-images' or not exists (select 1 from public.creatures c
    where c.image_url = '/storage/v1/object/public/creature-images/' || storage.objects.name or c.image_url like '%/storage/v1/object/public/creature-images/' || storage.objects.name));
create policy mca_image_no_update on storage.objects as restrictive for update to anon,authenticated
  using (bucket_id <> 'creature-images') with check (bucket_id <> 'creature-images');
-- No bucket creation: audit must confirm an existing public bucket first.
update storage.buckets set file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='creature-images';
notify pgrst, 'reload schema';

-- The audited Auth trigger already calls handle_new_user(). Preserve that binding.
-- Existing profiles/admin roles/reputation remain unchanged.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,username,role,investigator_level,reputation)
  values (new.id,
    case when jsonb_typeof(new.raw_user_meta_data->'username') = 'string'
      then coalesce(nullif(left(btrim(new.raw_user_meta_data->>'username'),40),''),'Investigator')
      else 'Investigator' end,
    'user','Cấp I',0)
  on conflict (id) do nothing;
  return new;
end $$;
-- A trigger continues to execute without granting a browser RPC entry point.
revoke all on function public.handle_new_user() from public,anon,authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated;

create function public.mca_validate_profile_name()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.username is null or length(btrim(new.username)) not between 1 and 40 then
    raise exception 'PROFILE_NAME_INVALID' using errcode = '22023';
  end if;
  new.username := btrim(new.username);
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.mca_validate_profile_name() from public,anon,authenticated;
create trigger mca_profile_name_before_update before update of username on public.profiles
for each row execute function public.mca_validate_profile_name();

-- Fill only missing profiles. Never overwrite an existing administrator or reputation.
insert into public.profiles(id,username,role,investigator_level,reputation)
select u.id,case when jsonb_typeof(u.raw_user_meta_data->'username') = 'string'
  then coalesce(nullif(left(btrim(u.raw_user_meta_data->>'username'),40),''),'Investigator')
  else 'Investigator' end,'user','Cấp I',0
from auth.users u where not exists(select 1 from public.profiles p where p.id=u.id)
on conflict(id) do nothing;
notify pgrst, 'reload schema';

-- Keep the original dataset intact and enable the frontend only after verification.
commit;
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
select 'MCA_PHASE3_APPLIED'::text as result,
  (select count(*) from public.creatures) as creature_count,
  (select count(*) from public.creature_abilities) as ability_count,
  (select count(*) from public.profiles) as profile_count,
  bool_and(ok) as mca_phase3_ready,jsonb_object_agg(name,ok) as checks from checks;

