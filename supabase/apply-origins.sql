-- MCA origins: run the WHOLE file once as postgres, AFTER phase 3.
-- Preserves old creature data; new proposals require admin approval.
-- Apply AFTER phase 3. Adds a shared, immutable catalog; old records remain intact.
begin;
select pg_advisory_xact_lock(hashtextextended('mca:origins:migration',0));
do $$ begin
  if to_regprocedure('public.mca_submit_creature(uuid,jsonb,text)') is null
     or to_regclass('public.mca_submission_requests') is null then
    raise exception 'Apply phase 3 first';
  end if;
end $$;

create table public.origin_locations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('universe','galaxy','nebula','star_system','planet')),
  name text not null check (length(name) between 1 and 100 and name=btrim(name)),
  parent_id uuid references public.origin_locations(id) on delete restrict,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  review_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((kind='universe')=(parent_id is null))
);
create unique index origin_locations_name_parent on public.origin_locations
  (kind,coalesce(parent_id,'00000000-0000-0000-0000-000000000000'::uuid),lower(name));
create index origin_locations_parent on public.origin_locations(parent_id,kind);
alter table public.origin_locations enable row level security;
revoke all on public.origin_locations from public,anon,authenticated;
grant select(id,kind,name,parent_id,status,review_note) on public.origin_locations to anon,authenticated;
create policy mca_origin_public_read on public.origin_locations for select to anon using(status='approved');
create policy mca_origin_account_read on public.origin_locations for select to authenticated
  using(status='approved' or created_by=(select auth.uid()) or (select public.is_admin()));

create function public.mca_validate_origin_parent() returns trigger
language plpgsql set search_path='' as $$
declare expected text;
begin
  expected:=case new.kind when 'galaxy' then 'universe' when 'nebula' then 'galaxy'
    when 'star_system' then 'nebula' when 'planet' then 'star_system' end;
  if new.kind='universe' then
    if new.parent_id is not null then raise exception 'ORIGIN_PARENT_INVALID' using errcode='22023'; end if;
  elsif expected is null or not exists(select 1 from public.origin_locations where id=new.parent_id and kind=expected) then
    raise exception 'ORIGIN_PARENT_INVALID' using errcode='22023';
  end if;
  return new;
end $$;
create trigger mca_origin_parent before insert or update on public.origin_locations
  for each row execute function public.mca_validate_origin_parent();
revoke all on function public.mca_validate_origin_parent() from public,anon,authenticated;

-- Seed only known ancestry from old records. Do not invent nebulae or star systems.
insert into public.origin_locations(kind,name,status)
select distinct 'universe',regexp_replace(btrim(universe),'\s+',' ','g'),'approved' from public.creatures
where status in ('verified','canon') and length(regexp_replace(btrim(universe),'\s+',' ','g')) between 1 and 100 on conflict do nothing;
insert into public.origin_locations(kind,name,parent_id,status)
select distinct 'galaxy',regexp_replace(btrim(c.galaxy),'\s+',' ','g'),u.id,'approved' from public.creatures c
join public.origin_locations u on u.kind='universe' and lower(u.name)=lower(regexp_replace(btrim(c.universe),'\s+',' ','g'))
where c.status in ('verified','canon') and length(regexp_replace(btrim(c.galaxy),'\s+',' ','g')) between 1 and 100 on conflict do nothing;

alter table public.creatures add column nebula text,add column star_system text,
  add column origin_planet_id uuid references public.origin_locations(id) on delete restrict;
create index creatures_origin_planet on public.creatures(origin_planet_id);

create function public.mca_add_origin(p_kind text,p_name text,p_parent_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();clean_name text;node public.origin_locations%rowtype;expected text;
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  clean_name:=regexp_replace(btrim(p_name),'\s+',' ','g');
  if p_kind is null or p_kind not in ('universe','galaxy','nebula','star_system','planet')
     or clean_name is null or length(clean_name) not between 1 and 100
     or clean_name ~ '[[:cntrl:]]' then raise exception 'ORIGIN_NAME_INVALID' using errcode='22023'; end if;
  expected:=case p_kind when 'galaxy' then 'universe' when 'nebula' then 'galaxy'
    when 'star_system' then 'nebula' when 'planet' then 'star_system' end;
  if (p_kind='universe' and p_parent_id is not null)
     or (p_kind<>'universe' and not exists(select 1 from public.origin_locations where id=p_parent_id and kind=expected
       and (status='approved' or (status='pending' and created_by=actor)))) then
    raise exception 'ORIGIN_PARENT_INVALID' using errcode='22023';
  end if;
  if exists(with recursive ancestry as (
    select id,parent_id,status,created_by from public.origin_locations where id=p_parent_id
    union all select p.id,p.parent_id,p.status,p.created_by from public.origin_locations p join ancestry a on p.id=a.parent_id
  ) select 1 from ancestry where not(status='approved' or (status='pending' and created_by=actor))) then
    raise exception 'ORIGIN_PARENT_INVALID' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('mca:origin:add:'||actor::text,0));
  select * into node from public.origin_locations where kind=p_kind and parent_id is not distinct from p_parent_id and lower(name)=lower(clean_name);
  if found then
    if node.status='rejected' then raise exception 'ORIGIN_REJECTED' using errcode='22023'; end if;
    if node.status<>'approved' and node.created_by is distinct from actor then raise exception 'ORIGIN_NAME_RESERVED' using errcode='22023'; end if;
    return jsonb_build_object('id',node.id,'kind',node.kind,'name',node.name,'parent_id',node.parent_id,'status',node.status,'review_note',node.review_note);
  end if;
  if (select count(*) from public.origin_locations where created_by=actor and created_at>now()-interval '1 day')>=100 then
    raise exception 'ORIGIN_LIMIT_REACHED' using errcode='54000';
  end if;
  insert into public.origin_locations(kind,name,parent_id,created_by) values(p_kind,clean_name,p_parent_id,actor)
    on conflict do nothing returning * into node;
  if not found then select * into node from public.origin_locations where kind=p_kind and parent_id is not distinct from p_parent_id and lower(name)=lower(clean_name); end if;
  if node.status<>'approved' and node.created_by is distinct from actor then raise exception 'ORIGIN_NAME_RESERVED' using errcode='22023'; end if;
  return jsonb_build_object('id',node.id,'kind',node.kind,'name',node.name,'parent_id',node.parent_id,'status',node.status,'review_note',node.review_note);
end $$;
revoke all on function public.mca_add_origin(text,text,uuid) from public,anon;
grant execute on function public.mca_add_origin(text,text,uuid) to authenticated;

create function public.mca_review_origin(p_id uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path='' as $$
declare node public.origin_locations%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  if p_status is null or p_status not in ('approved','rejected') or length(coalesce(p_note,''))>300 then
    raise exception 'ORIGIN_REVIEW_INVALID' using errcode='22023'; end if;
  select * into node from public.origin_locations where id=p_id for update;
  if not found then raise exception 'ORIGIN_NOT_FOUND' using errcode='P0002'; end if;
  if node.status=p_status then return; end if;
  if node.status<>'pending' then raise exception 'ORIGIN_ALREADY_REVIEWED' using errcode='22023'; end if;
  if p_status='approved' and node.parent_id is not null and not exists(select 1 from public.origin_locations where id=node.parent_id and status='approved') then
    raise exception 'ORIGIN_APPROVE_PARENT_FIRST' using errcode='22023'; end if;
  update public.origin_locations set status=p_status,review_note=nullif(btrim(p_note),'') where id=p_id;
end $$;
revoke all on function public.mca_review_origin(uuid,text,text) from public,anon;
grant execute on function public.mca_review_origin(uuid,text,text) to authenticated;

-- Keep the original RPC for existing clients and pending submissions. This wrapper
-- resolves the five names from the selected leaf; client text cannot forge ancestry.
create function public.mca_submit_creature_with_origin(p_request_id uuid,p_draft jsonb,p_image_path text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();previous public.mca_submission_requests%rowtype;
  planet_node public.origin_locations%rowtype;system_node public.origin_locations%rowtype;
  nebula_node public.origin_locations%rowtype;galaxy_node public.origin_locations%rowtype;
  universe_node public.origin_locations%rowtype;legacy_draft jsonb;creature jsonb;
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_request_id is null or jsonb_typeof(p_draft) is distinct from 'object' then raise exception 'DRAFT_INVALID' using errcode='22023'; end if;
  -- Same lock as the original RPC. Validate replay BEFORE consulting the catalog.
  perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_request_id::text,0));
  select * into previous from public.mca_submission_requests where user_id=actor and request_id=p_request_id;
  if found then
    if previous.draft is distinct from p_draft or previous.image_path is distinct from p_image_path then raise exception 'REQUEST_CONFLICT' using errcode='22023'; end if;
    if previous.creature_id is null then raise exception 'REQUEST_RECORD_REMOVED' using errcode='P0002'; end if;
    select to_jsonb(c) into creature from public.creatures c where id=previous.creature_id;
    return creature;
  end if;
  select * into planet_node from public.origin_locations where id::text=p_draft->>'originPlanetId' and kind='planet';
  if not found then raise exception 'DRAFT_INVALID: origin' using errcode='22023'; end if;
  select * into system_node from public.origin_locations where id=planet_node.parent_id and kind='star_system';
  select * into nebula_node from public.origin_locations where id=system_node.parent_id and kind='nebula';
  select * into galaxy_node from public.origin_locations where id=nebula_node.parent_id and kind='galaxy';
  select * into universe_node from public.origin_locations where id=galaxy_node.parent_id and kind='universe' and parent_id is null;
  if universe_node.id is null then raise exception 'DRAFT_INVALID: origin chain' using errcode='22023'; end if;
  if exists(select 1 from public.origin_locations where id in(planet_node.id,system_node.id,nebula_node.id,galaxy_node.id,universe_node.id)
    and not(status='approved' or (status='pending' and created_by=actor))) then
    raise exception 'DRAFT_INVALID: origin permission' using errcode='22023';
  end if;
  legacy_draft:=p_draft||jsonb_build_object('universe',universe_node.name,'galaxy',galaxy_node.name,'planet',planet_node.name,'world',coalesce(p_draft->>'world',''));
  creature:=public.mca_submit_creature(p_request_id,legacy_draft,p_image_path);
  update public.creatures c set nebula=nebula_node.name,star_system=system_node.name,origin_planet_id=planet_node.id
    where c.id::text=creature->>'id' returning to_jsonb(c) into creature;
  update public.mca_submission_requests set draft=p_draft where user_id=actor and request_id=p_request_id;
  return creature;
end $$;
revoke all on function public.mca_submit_creature_with_origin(uuid,jsonb,text) from public,anon;
grant execute on function public.mca_submit_creature_with_origin(uuid,jsonb,text) to authenticated;
notify pgrst,'reload schema';
commit;

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
select 'MCA_ORIGINS_APPLIED'::text as result,bool_and(ok) as mca_origins_ready,jsonb_object_agg(name,ok) as checks from checks;
