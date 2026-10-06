-- MCA traits: run the WHOLE file once, after phase 3 and origins.
-- Run after phase 3 and origins. Existing records and pending requests are preserved.
begin;
select pg_advisory_xact_lock(hashtextextended('mca:traits:migration',0));
do $$ begin
  if to_regprocedure('public.mca_submit_creature_with_origin(uuid,jsonb,text)') is null then
    raise exception 'Apply origins first';
  end if;
end $$;

create table public.creature_terms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('species','element')),
  code text not null check(length(code) between 1 and 50),
  name text not null check(length(name) between 1 and 100 and name=btrim(name)),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  review_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(kind,code),unique(id,kind)
);
create unique index creature_terms_names on public.creature_terms(kind,lower(name));
alter table public.creature_terms enable row level security;
revoke all on public.creature_terms from public,anon,authenticated;
grant select(id,kind,code,name,status,review_note) on public.creature_terms to anon,authenticated;
create policy mca_term_public_read on public.creature_terms for select to anon using(status='approved');
create policy mca_term_account_read on public.creature_terms for select to authenticated
  using(status='approved' or created_by=(select auth.uid()) or (select public.is_admin()));
insert into public.creature_terms(kind,code,name,status) values
('species','dragon','Rồng','approved'),('species','beast','Thú','approved'),('species','entity','Thực thể','approved'),
('species','insect','Côn trùng','approved'),('species','mythical','Sinh vật thần thoại','approved'),
('species','humanoid','Dạng người','approved'),('species','machine','Sinh vật cơ giới','approved'),
('species','plant','Thực vật','approved'),('species','unknown','Chưa xác định','approved'),
('element','fire','Lửa','approved'),('element','ice','Băng','approved'),('element','water','Nước','approved'),
('element','earth','Đất','approved'),('element','wind','Gió','approved'),('element','light','Ánh sáng','approved'),
('element','dark','Bóng tối','approved'),('element','void','Hư không','approved'),('element','space','Không gian','approved'),
('element','crystal','Tinh thể','approved'),('element','electric','Điện','approved'),
('element','multi','Đa thuộc tính','approved'),('element','unknown','Chưa xác định','approved');

alter table public.creatures add column traits_version smallint check(traits_version=1),
  add column species_term_id uuid references public.creature_terms(id) on delete restrict,
  add column species_name text,add column element_codes text[],add column element_names text[],add column dimensions jsonb;
create index creatures_element_codes on public.creatures using gin(element_codes);
do $$ declare id_type text; begin
  select format_type(atttypid,atttypmod) into id_type from pg_attribute where attrelid='public.creatures'::regclass and attname='id' and not attisdropped;
  if id_type not in ('bigint','integer','uuid') then raise exception 'Unsupported creature ID'; end if;
  execute format('create table public.creature_elements (
    creature_id %s not null references public.creatures(id) on delete cascade,
    term_id uuid not null,kind text not null default ''element'' check(kind=''element''),
    position smallint not null check(position between 0 and 19),
    primary key(creature_id,term_id),unique(creature_id,position),
    foreign key(term_id,kind) references public.creature_terms(id,kind) on delete restrict)',id_type);
end $$;
alter table public.creature_elements enable row level security;
revoke all on public.creature_elements from public,anon,authenticated;
grant select on public.creature_elements to anon,authenticated;
create policy mca_creature_elements_read on public.creature_elements for select to anon,authenticated
  using(exists(select 1 from public.creatures c where c.id=creature_id));

create function public.mca_add_term(p_kind text,p_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();clean_name text;node public.creature_terms%rowtype;new_id uuid:=gen_random_uuid();
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  clean_name:=regexp_replace(btrim(p_name),'\s+',' ','g');
  if p_kind is null or p_kind not in ('species','element') or clean_name is null
     or length(clean_name) not between 1 and 100 or clean_name ~ '[[:cntrl:]]' then
    raise exception 'TERM_NAME_INVALID' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('mca:term:add:'||actor::text,0));
  select * into node from public.creature_terms where kind=p_kind and lower(name)=lower(clean_name);
  if not found then
    if (select count(*) from public.creature_terms where created_by=actor and created_at>now()-interval '1 day')>=100 then
      raise exception 'TERM_LIMIT_REACHED' using errcode='54000';
    end if;
    insert into public.creature_terms(id,kind,code,name,created_by) values(new_id,p_kind,'custom_'||new_id::text,clean_name,actor)
      on conflict do nothing returning * into node;
    if not found then select * into node from public.creature_terms where kind=p_kind and lower(name)=lower(clean_name); end if;
  end if;
  if node.status='rejected' then raise exception 'TERM_REJECTED' using errcode='22023'; end if;
  if node.status<>'approved' and node.created_by is distinct from actor then raise exception 'TERM_NAME_RESERVED' using errcode='22023'; end if;
  return jsonb_build_object('id',node.id,'kind',node.kind,'code',node.code,'name',node.name,'status',node.status,'review_note',node.review_note);
end $$;
revoke all on function public.mca_add_term(text,text) from public,anon;
grant execute on function public.mca_add_term(text,text) to authenticated;

create function public.mca_review_term(p_id uuid,p_status text,p_note text default null) returns void
language plpgsql security definer set search_path='' as $$
declare node public.creature_terms%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  if p_status is null or p_status not in ('approved','rejected') or length(coalesce(p_note,''))>300 then
    raise exception 'TERM_REVIEW_INVALID' using errcode='22023'; end if;
  select * into node from public.creature_terms where id=p_id for update;
  if not found then raise exception 'TERM_NOT_FOUND' using errcode='P0002'; end if;
  if node.status=p_status then return; end if;
  if node.status<>'pending' then raise exception 'TERM_ALREADY_REVIEWED' using errcode='22023'; end if;
  update public.creature_terms set status=p_status,review_note=nullif(btrim(p_note),'') where id=p_id;
end $$;
revoke all on function public.mca_review_term(uuid,text,text) from public,anon;
grant execute on function public.mca_review_term(uuid,text,text) to authenticated;

create function public.mca_submit_creature_v2(p_request_id uuid,p_draft jsonb,p_image_path text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();previous public.mca_submission_requests%rowtype;species_node public.creature_terms%rowtype;
  entry jsonb;axis text;value text;unit text;normalized_dimensions jsonb:='{}';names text[]:='{}';codes text[]:='{}';
  ids uuid[]:='{}';node public.creature_terms%rowtype;legacy jsonb;creature jsonb;threat text;selected_rarity text;
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_request_id is null or jsonb_typeof(p_draft) is distinct from 'object' then raise exception 'DRAFT_INVALID' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_request_id::text,0));
  select * into previous from public.mca_submission_requests where user_id=actor and request_id=p_request_id;
  if found then
    if previous.draft is distinct from p_draft or previous.image_path is distinct from p_image_path then raise exception 'REQUEST_CONFLICT' using errcode='22023'; end if;
    if previous.creature_id is null then raise exception 'REQUEST_RECORD_REMOVED' using errcode='P0002'; end if;
    select to_jsonb(c) into creature from public.creatures c where id=previous.creature_id;return creature;
  end if;
  if p_draft->>'traitsVersion' is distinct from '1' then raise exception 'DRAFT_INVALID: version' using errcode='22023'; end if;
  select * into species_node from public.creature_terms where id::text=p_draft->>'speciesTermId' and kind='species'
    and (status='approved' or (status='pending' and created_by=actor));
  if not found then raise exception 'DRAFT_INVALID: species permission' using errcode='22023'; end if;
  if jsonb_typeof(p_draft->'elementTermIds') is distinct from 'array' then raise exception 'DRAFT_INVALID: elements' using errcode='22023'; end if;
  if jsonb_array_length(p_draft->'elementTermIds')>20 then raise exception 'DRAFT_INVALID: element count' using errcode='22023'; end if;
  for entry in select * from jsonb_array_elements(p_draft->'elementTermIds') loop
    if jsonb_typeof(entry) is distinct from 'string' then raise exception 'DRAFT_INVALID: element id' using errcode='22023'; end if;
    select * into node from public.creature_terms where id::text=entry#>>'{}' and kind='element'
      and (status='approved' or (status='pending' and created_by=actor));
    if not found or node.id=any(ids) then raise exception 'DRAFT_INVALID: element permission or duplicate' using errcode='22023'; end if;
    ids:=array_append(ids,node.id);names:=array_append(names,node.name);codes:=array_append(codes,node.code);
  end loop;
  if jsonb_typeof(p_draft->'dimensions') is distinct from 'object' then raise exception 'DRAFT_INVALID: dimensions' using errcode='22023'; end if;
  for axis in select unnest(array['height','length','width']) loop
    entry:=p_draft->'dimensions'->axis;
    if jsonb_typeof(entry) is distinct from 'object' or jsonb_typeof(entry->'value') is distinct from 'string'
      or jsonb_typeof(entry->'unit') is distinct from 'string' then raise exception 'DRAFT_INVALID: dimension' using errcode='22023'; end if;
    value:=entry->>'value';unit:=entry->>'unit';
    if unit not in ('nm','um','mm','cm','dm','m','dam','hm','km','Mm','Gm','au','ly') or length(value)>43 then
      raise exception 'DRAFT_INVALID: dimension unit or length' using errcode='22023'; end if;
    if value<>'' then
      if value !~ '^[0-9]{1,30}(\.[0-9]{1,12})?$' then raise exception 'DRAFT_INVALID: dimension number' using errcode='22023'; end if;
      if value::numeric<=0 then raise exception 'DRAFT_INVALID: dimension positive' using errcode='22023'; end if;
    end if;
    normalized_dimensions:=normalized_dimensions||jsonb_build_object(axis,jsonb_build_object('value',value,'unit',unit));
  end loop;
  threat:=p_draft->>'threatLevel';selected_rarity:=p_draft->>'rarity';
  if threat is null or threat not in ('F','E','D','C','B','A','S','T2','T3','T4','T5','T6','T7')
    or selected_rarity is null or selected_rarity not in ('','normal','special','rare','unique','legend','god','genesis') then
    raise exception 'DRAFT_INVALID: rarity or threat' using errcode='22023'; end if;
  -- Use the existing origin/Auth/image/skills transaction, then replace its
  -- compatibility fields with canonical traits before this transaction commits.
  legacy:=p_draft||jsonb_build_object('species','unknown','element','','rarity','','size','',
    'threatLevel',case when threat like 'T%' then 'S' else threat end);
  creature:=public.mca_submit_creature_with_origin(p_request_id,legacy,p_image_path);
  update public.creatures c set traits_version=1,species_term_id=species_node.id,species=species_node.code,species_name=species_node.name,
    element_codes=codes,element_names=names,element=nullif(codes[1],''),dimensions=normalized_dimensions,
    rarity=nullif(selected_rarity,''),proposed_threat_level=threat where c.id::text=creature->>'id' returning to_jsonb(c) into creature;
  insert into public.creature_elements(creature_id,term_id,position)
    select c.id,x.id,(x.position-1)::smallint from public.creatures c,
      unnest(ids) with ordinality as x(id,position) where c.id::text=creature->>'id';
  update public.mca_submission_requests set draft=p_draft where user_id=actor and request_id=p_request_id;
  return creature;
end $$;
revoke all on function public.mca_submit_creature_v2(uuid,jsonb,text) from public,anon;
grant execute on function public.mca_submit_creature_v2(uuid,jsonb,text) to authenticated;

create or replace function public.mca_review_creature(p_creature_id text,p_status text,p_verified_threat_level text default null)
returns void language plpgsql security definer set search_path='' as $$
declare modern smallint;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  select traits_version into modern from public.creatures where id::text=p_creature_id for update;
  if not found then raise exception 'CREATURE_NOT_FOUND' using errcode='P0002'; end if;
  if p_status is null or p_status not in ('verified','investigation','conflicting')
    or (p_status='verified' and (p_verified_threat_level is null or not(
      p_verified_threat_level in ('F','E','D','C','B','A','S','T2','T3','T4','T5','T6','T7')
      or (modern is null and p_verified_threat_level in ('SS','X'))))) then raise exception 'REVIEW_INVALID' using errcode='22023'; end if;
  update public.creatures set status=p_status,verified_threat_level=case when p_status='verified' then p_verified_threat_level else null end,
    updated_at=now() where id::text=p_creature_id;
end $$;
revoke all on function public.mca_review_creature(text,text,text) from public,anon;
grant execute on function public.mca_review_creature(text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;

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
select 'MCA_TRAITS_APPLIED'::text as result,bool_and(ok) as mca_traits_ready,jsonb_object_agg(name,ok) as checks from checks;
