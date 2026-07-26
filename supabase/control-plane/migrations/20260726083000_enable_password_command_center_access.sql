-- The owner requested one dedicated Command Center login: email + password.
-- This bounded RPC verifies the authenticated user is active in the existing
-- private operator registry without requiring the retired Control Plane MFA flow.
create or replace function public.get_my_command_center_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog', 'auth', 'private'
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_is_owner boolean;
begin
  if v_user_id is null then
    raise exception 'command_center_authentication_required' using errcode = '42501';
  end if;

  select role, is_root_owner
  into v_role, v_is_owner
  from private.control_plane_operators
  where user_id = v_user_id
    and status = 'active'
    and disabled_at is null;

  if v_role is null then
    raise exception 'command_center_access_required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'userReference', private.control_plane_user_reference(v_user_id),
    'role', v_role,
    'isOwner', coalesce(v_is_owner, false),
    'sessionAssurance', 'password'
  );
end;
$$;

revoke all on function public.get_my_command_center_access() from public, anon;
grant execute on function public.get_my_command_center_access() to authenticated, service_role;
