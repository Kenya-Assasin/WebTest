-- Reviewed against supabase/audits/20261006-before-phase3.json.
-- Additive: does not replace existing profiles/creatures/abilities or remove their data.
begin;

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
commit;
