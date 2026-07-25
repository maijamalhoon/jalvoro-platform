-- Public invoker wrappers require execute on their private, auth-checked targets.
-- Table privileges remain revoked and every mutation still verifies auth.uid() and Owner role.
grant execute on function private.create_command_center_organization(text, text, uuid, text, text, text) to authenticated;
grant execute on function private.transition_command_center_organization(text, text) to authenticated;
grant execute on function private.create_command_center_organization_membership(text, uuid, text) to authenticated;
grant execute on function private.transition_command_center_organization_membership(text, text, text) to authenticated;
grant execute on function private.get_command_center_organization_foundation_snapshot() to authenticated;
grant execute on function private.grant_command_center_permission(uuid, text, text, text, text, text, uuid, text, timestamptz) to authenticated;
grant execute on function private.revoke_command_center_permission(text) to authenticated;

create or replace function private.grant_command_center_organization_permission(
  p_user_id uuid,
  p_permission_key text,
  p_organization_code text,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'private'
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_organization private.command_center_organizations%rowtype;
begin
  if v_actor is null or v_role <> 'owner' then
    raise exception 'command_center_organization_owner_required' using errcode = '42501';
  end if;

  select * into v_organization
  from private.command_center_organizations
  where organization_code = upper(btrim(coalesce(p_organization_code, '')));

  if v_organization.id is null then
    raise exception 'command_center_organization_missing' using errcode = 'P0002';
  end if;
  if v_organization.status <> 'active' then
    raise exception 'command_center_organization_grant_unavailable' using errcode = '55000';
  end if;

  return private.grant_command_center_permission(
    p_user_id,
    p_permission_key,
    'command-center',
    'organizations',
    null,
    v_organization.region_key,
    v_organization.id,
    v_organization.data_classification,
    p_expires_at
  );
end;
$$;

create or replace function public.grant_command_center_organization_permission(
  p_user_id uuid,
  p_permission_key text,
  p_organization_code text,
  p_expires_at timestamptz default null
)
returns jsonb
language sql
set search_path = 'pg_catalog', 'private'
as $$
  select private.grant_command_center_organization_permission(
    p_user_id,
    p_permission_key,
    p_organization_code,
    p_expires_at
  );
$$;

revoke all on function private.grant_command_center_organization_permission(uuid, text, text, timestamptz) from public, anon;
grant execute on function private.grant_command_center_organization_permission(uuid, text, text, timestamptz) to authenticated;
revoke all on function public.grant_command_center_organization_permission(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.grant_command_center_organization_permission(uuid, text, text, timestamptz) to authenticated;
