create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_app_role() = 'admin'
    and auth.jwt()->>'aal' = 'aal2'
    and exists (
      select 1
      from jsonb_array_elements(
        case
          when jsonb_typeof(auth.jwt()->'amr') = 'array'
            then auth.jwt()->'amr'
          else '[]'::jsonb
        end
      ) as methods(method)
      where coalesce(methods.method->>'method', methods.method #>> '{}') = 'mfa/webauthn'
    ),
    false
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_app_role() = 'clerk' or public.is_admin(),
    false
  );
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
