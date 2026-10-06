-- Reviewed policy baseline for the supplied 2026-10-06 audit.
-- Public archive reads; all creature/ability writes go through audited RPCs.
-- Keeps all rows. Intentionally retires browser writes used by the static website.
begin;
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
commit;
