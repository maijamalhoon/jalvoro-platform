create or replace function private.get_command_center_organization_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog', 'private'
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text := private.command_center_admin_role();
begin
  if v_user_id is null or v_role is null then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'sourceStatus', 'registered',
    'total', (select count(*)::bigint from private.command_center_organizations),
    'draft', (select count(*)::bigint from private.command_center_organizations where status = 'draft'),
    'active', (select count(*)::bigint from private.command_center_organizations where status = 'active'),
    'suspended', (select count(*)::bigint from private.command_center_organizations where status = 'suspended'),
    'closed', (select count(*)::bigint from private.command_center_organizations where status = 'closed'),
    'memberships', (select count(*)::bigint from private.command_center_organization_memberships),
    'activeMemberships', (select count(*)::bigint from private.command_center_organization_memberships where status = 'active'),
    'activeAdminGrants', (
      select count(*)::bigint
      from private.command_center_admin_grants
      where organization_id is not null
        and revoked_at is null
        and (expires_at is null or expires_at > now())
    ),
    'identityFieldsIncluded', false
  );
end;
$$;

create or replace function private.get_platform_admin_snapshot()
returns jsonb
language sql
security definer
set search_path = 'pg_catalog', 'private'
as $$
  select private.get_platform_admin_snapshot_base()
    || jsonb_build_object(
      'privacy', private.get_privacy_governance_snapshot()
    )
    || jsonb_build_object(
      'billingOperations', private.get_billing_operations_snapshot()
    )
    || jsonb_build_object(
      'globalOperations',
      private.get_command_center_global_operations_snapshot()
        || jsonb_build_object(
          'organizations', private.get_command_center_organization_summary()
        )
    );
$$;

revoke all on function private.get_command_center_organization_summary() from public, anon, authenticated;
