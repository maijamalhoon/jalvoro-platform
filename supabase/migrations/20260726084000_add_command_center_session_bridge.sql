-- The browser authenticates once against the dedicated Command Center project.
-- A production Edge Function validates that session and uses this service-role-
-- only resolver before minting a one-time website session for the same email.
create or replace function public.resolve_command_center_bridge_target(
  p_email text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog', 'auth', 'private'
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_result jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if length(v_email) < 3 or length(v_email) > 254 then
    raise exception 'invalid_command_center_email' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'email', lower(u.email),
    'role', pa.role
  )
  into v_result
  from auth.users u
  join private.platform_admins pa on pa.user_id = u.id
  where lower(u.email) = v_email
    and u.email_confirmed_at is not null
    and pa.disabled_at is null
    and pa.role = 'owner'
  limit 1;

  if v_result is null then
    raise exception 'command_center_owner_not_registered' using errcode = '42501';
  end if;

  return v_result;
end;
$$;

revoke all on function public.resolve_command_center_bridge_target(text)
  from public, anon, authenticated;
grant execute on function public.resolve_command_center_bridge_target(text)
  to service_role;
