-- Auth/profile rules required by username login and account provisioning.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, username, full_name, phone, gender,
    emergency_contact_name, emergency_contact_phone, role
  )
  values (
    new.id,
    new.email,
    nullif(lower(trim(new.raw_user_meta_data ->> 'username')), ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'emergency_contact_name',
    new.raw_user_meta_data ->> 'emergency_contact_phone',
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'member')
  );
  return new;
end;
$$;

create or replace function public.validate_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.email is distinct from old.email
     or new.id is distinct from old.id then
    if not public.is_admin() then
      raise exception 'Role, status, email, and id are server-managed';
    end if;
  end if;
  if new.username is not null then
    new.username = lower(trim(new.username));
    if new.username !~ '^[a-z0-9][a-z0-9._-]{2,31}$' then
      raise exception 'Username must be 3-32 lowercase letters, numbers, dots, underscores, or hyphens';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_validate_update
before update on public.profiles
for each row execute function public.validate_profile_update();

revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone, gender, emergency_contact_name,
  emergency_contact_phone, avatar_url) on public.profiles to authenticated;
