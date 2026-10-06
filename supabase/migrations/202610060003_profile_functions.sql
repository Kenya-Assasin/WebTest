-- The audited Auth trigger already calls handle_new_user(). Preserve that binding.
-- Existing profiles/admin roles/reputation remain unchanged.
begin;
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
commit;
