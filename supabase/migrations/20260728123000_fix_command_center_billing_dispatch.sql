-- Preserve the billing plan RPC's smallint signature when the optional
-- currency exponent is omitted. Without the typed fallback, PostgreSQL
-- resolves COALESCE to integer and the Command Center gateway fails at runtime.

create or replace function public.execute_command_center_operation(
  p_actor_user_id uuid,
  p_operation text,
  p_arguments jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_operation text := lower(btrim(coalesce(p_operation, '')));
  v_arguments jsonb := coalesce(p_arguments, '{}'::jsonb);
  v_claims jsonb;
  v_now_epoch bigint := extract(epoch from clock_timestamp())::bigint;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'command_center_gateway_service_role_required'
      using errcode = '42501';
  end if;

  if p_actor_user_id is null or not exists (
    select 1
    from auth.users u
    where u.id = p_actor_user_id
      and u.deleted_at is null
      and u.email_confirmed_at is not null
  ) then
    raise exception 'command_center_gateway_actor_invalid'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_arguments) <> 'object'
    or pg_column_size(v_arguments) > 16384 then
    raise exception 'command_center_gateway_arguments_invalid'
      using errcode = '22023';
  end if;

  v_claims := jsonb_build_object(
    'sub', p_actor_user_id,
    'role', 'authenticated',
    'aal', 'aal2',
    'command_center_gateway', true,
    'amr', jsonb_build_array(
      jsonb_build_object('method', 'password', 'timestamp', v_now_epoch),
      jsonb_build_object('method', 'totp', 'timestamp', v_now_epoch)
    )
  );
  perform set_config('request.jwt.claims', v_claims::text, true);

  case v_operation
    when 'get_platform_admin_snapshot' then
      return public.get_platform_admin_snapshot();
    when 'get_command_center_navigation' then
      return public.get_command_center_navigation(v_arguments->>'p_environment');
    when 'get_command_center_organization_operations_snapshot' then
      return public.get_command_center_organization_operations_snapshot(
        nullif(v_arguments->>'p_organization_code', ''),
        coalesce((v_arguments->>'p_limit')::integer, 50),
        coalesce((v_arguments->>'p_offset')::integer, 0)
      );
    when 'create_command_center_organization_by_email' then
      return public.create_command_center_organization_by_email(
        v_arguments->>'p_organization_key',
        v_arguments->>'p_display_name',
        v_arguments->>'p_owner_email',
        nullif(v_arguments->>'p_primary_country_code', ''),
        nullif(v_arguments->>'p_region_key', ''),
        coalesce(nullif(v_arguments->>'p_data_classification', ''), 'confidential')
      );
    when 'transition_command_center_organization' then
      return public.transition_command_center_organization(
        v_arguments->>'p_organization_code',
        v_arguments->>'p_action'
      );
    when 'create_command_center_organization_membership_by_email' then
      return public.create_command_center_organization_membership_by_email(
        v_arguments->>'p_organization_code',
        v_arguments->>'p_member_email',
        v_arguments->>'p_role'
      );
    when 'transition_command_center_organization_membership' then
      return public.transition_command_center_organization_membership(
        v_arguments->>'p_membership_code',
        v_arguments->>'p_action',
        nullif(v_arguments->>'p_role', '')
      );
    when 'grant_command_center_organization_permission_by_email' then
      return public.grant_command_center_organization_permission_by_email(
        v_arguments->>'p_admin_email',
        v_arguments->>'p_permission_key',
        v_arguments->>'p_organization_code',
        nullif(v_arguments->>'p_expires_at', '')::timestamptz
      );
    when 'revoke_command_center_permission' then
      return public.revoke_command_center_permission(v_arguments->>'p_grant_code');
    when 'apply_billing_plan_operation' then
      return public.apply_billing_plan_operation(
        v_arguments->>'p_code',
        v_arguments->>'p_name',
        v_arguments->>'p_billing_interval',
        (v_arguments->>'p_price_major')::numeric,
        v_arguments->>'p_currency',
        coalesce((v_arguments->>'p_currency_exponent')::smallint, 2::smallint),
        coalesce((v_arguments->>'p_is_active')::boolean, true)
      );
    when 'apply_privacy_request_workflow' then
      return public.apply_privacy_request_workflow(
        v_arguments->>'p_request_code',
        v_arguments->>'p_status',
        v_arguments->>'p_verification_status',
        nullif(v_arguments->>'p_due_date', '')::date,
        coalesce((v_arguments->>'p_assign_to_self')::boolean, false)
      );
    when 'approve_admin_release' then
      return public.approve_admin_release(
        v_arguments->>'p_revision_sha',
        v_arguments->>'p_environment'
      );
    when 'revoke_admin_release' then
      return public.revoke_admin_release(v_arguments->>'p_release_code');
    when 'create_platform_security_incident' then
      return public.create_platform_security_incident(
        v_arguments->>'p_category',
        v_arguments->>'p_severity',
        v_arguments->>'p_source',
        nullif(v_arguments->>'p_source_reference', ''),
        nullif(v_arguments->>'p_due_at', '')::timestamptz
      );
    when 'apply_platform_security_incident_workflow' then
      return public.apply_platform_security_incident_workflow(
        v_arguments->>'p_incident_code',
        v_arguments->>'p_status',
        v_arguments->>'p_severity',
        nullif(v_arguments->>'p_due_at', '')::timestamptz,
        coalesce((v_arguments->>'p_assign_to_self')::boolean, false),
        nullif(v_arguments->>'p_resolution_code', '')
      );
    when 'apply_admin_compliance_review' then
      return public.apply_admin_compliance_review(
        v_arguments->>'p_event_code',
        v_arguments->>'p_status'
      );
    when 'create_platform_admin_invitation' then
      return public.create_platform_admin_invitation(
        v_arguments->>'p_email',
        v_arguments->>'p_role',
        v_arguments->>'p_token_sha256',
        coalesce((v_arguments->>'p_expires_in_hours')::integer, 72)
      );
    when 'apply_platform_admin_member_action' then
      return public.apply_platform_admin_member_action(
        v_arguments->>'p_admin_reference',
        v_arguments->>'p_action',
        nullif(v_arguments->>'p_role', '')
      );
    when 'revoke_platform_admin_invitation' then
      return public.revoke_platform_admin_invitation(
        v_arguments->>'p_invitation_code'
      );
    when 'accept_platform_admin_invitation' then
      return public.accept_platform_admin_invitation(
        v_arguments->>'p_token_sha256'
      );
    else
      raise exception 'command_center_gateway_operation_invalid'
        using errcode = '22023';
  end case;
end;
$$;

revoke all on function public.execute_command_center_operation(uuid,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.execute_command_center_operation(uuid,text,jsonb)
  to service_role;

comment on function public.execute_command_center_operation(uuid,text,jsonb) is
  'Service-role-only Command Center gateway. Actor context is accepted only from the dual-project AAL2 Edge Function and is preserved for authorization and audit attribution.';
