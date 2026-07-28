-- Complete the zero-downtime Command Center gateway cutover after the
-- gateway-aware application revision is live and verified.

-- The browser/server user session can no longer call Command Center RPCs
-- directly. The Edge Function calls the gateway with the service role only
-- after validating the main identity, isolated Control Plane identity, email
-- binding, current AAL2, and bounded Control Plane access.
do $$
declare
  v_signature regprocedure;
begin
  foreach v_signature in array array[
    'public.get_platform_admin_snapshot()'::regprocedure,
    'public.get_command_center_navigation(text)'::regprocedure,
    'public.get_command_center_organization_operations_snapshot(text,integer,integer)'::regprocedure,
    'public.create_command_center_organization_by_email(text,text,text,text,text,text)'::regprocedure,
    'public.transition_command_center_organization(text,text)'::regprocedure,
    'public.create_command_center_organization_membership_by_email(text,text,text)'::regprocedure,
    'public.transition_command_center_organization_membership(text,text,text)'::regprocedure,
    'public.grant_command_center_organization_permission_by_email(text,text,text,timestamptz)'::regprocedure,
    'public.revoke_command_center_permission(text)'::regprocedure,
    'public.apply_billing_plan_operation(text,text,text,numeric,text,smallint,boolean)'::regprocedure,
    'public.apply_privacy_request_workflow(text,text,text,date,boolean)'::regprocedure,
    'public.approve_admin_release(text,text)'::regprocedure,
    'public.revoke_admin_release(text)'::regprocedure,
    'public.create_platform_security_incident(text,text,text,text,timestamptz)'::regprocedure,
    'public.apply_platform_security_incident_workflow(text,text,text,timestamptz,boolean,text)'::regprocedure,
    'public.apply_admin_compliance_review(text,text)'::regprocedure,
    'public.create_platform_admin_invitation(text,text,text,integer)'::regprocedure,
    'public.apply_platform_admin_member_action(text,text,text)'::regprocedure,
    'public.revoke_platform_admin_invitation(text)'::regprocedure,
    'public.accept_platform_admin_invitation(text)'::regprocedure
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', v_signature);
    execute format('grant execute on function %s to service_role', v_signature);
  end loop;
end;
$$;

-- Close the implementation layer as well. These functions previously needed
-- authenticated EXECUTE only because the public wrappers were SECURITY INVOKER.
-- The gateway is SECURITY DEFINER and preserves auth.uid() explicitly, so no
-- browser role needs direct access to the private implementation surface.
do $$
declare
  v_signature regprocedure;
begin
  foreach v_signature in array array[
    'private.command_center_admin_role()'::regprocedure,
    'private.get_platform_admin_snapshot()'::regprocedure,
    'private.get_platform_admin_snapshot_base()'::regprocedure,
    'private.get_admin_access_snapshot()'::regprocedure,
    'private.get_admin_user_operations_snapshot()'::regprocedure,
    'private.get_platform_security_incident_snapshot()'::regprocedure,
    'private.get_admin_compliance_audit_snapshot()'::regprocedure,
    'private.get_admin_release_readiness_snapshot()'::regprocedure,
    'private.get_privacy_governance_snapshot()'::regprocedure,
    'private.get_billing_operations_snapshot()'::regprocedure,
    'private.get_command_center_global_operations_snapshot()'::regprocedure,
    'private.get_command_center_navigation(text)'::regprocedure,
    'private.get_command_center_organization_operations_snapshot(text,integer,integer)'::regprocedure,
    'private.create_command_center_organization_by_email(text,text,text,text,text,text)'::regprocedure,
    'private.transition_command_center_organization(text,text)'::regprocedure,
    'private.create_command_center_organization_membership_by_email(text,text,text)'::regprocedure,
    'private.transition_command_center_organization_membership(text,text,text)'::regprocedure,
    'private.grant_command_center_organization_permission_by_email(text,text,text,timestamptz)'::regprocedure,
    'private.revoke_command_center_permission(text)'::regprocedure,
    'private.apply_billing_plan_operation_impl(text,text,text,numeric,text,smallint,boolean)'::regprocedure,
    'private.apply_privacy_request_workflow(text,text,text,date,boolean)'::regprocedure,
    'private.approve_admin_release(text,text)'::regprocedure,
    'private.revoke_admin_release(text)'::regprocedure,
    'private.create_platform_security_incident(text,text,text,text,timestamptz)'::regprocedure,
    'private.apply_platform_security_incident_workflow(text,text,text,timestamptz,boolean,text)'::regprocedure,
    'private.apply_admin_compliance_review(text,text)'::regprocedure,
    'private.create_platform_admin_invitation(text,text,text,integer)'::regprocedure,
    'private.apply_platform_admin_member_action(text,text,text)'::regprocedure,
    'private.revoke_platform_admin_invitation(text)'::regprocedure,
    'private.accept_platform_admin_invitation(text)'::regprocedure
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', v_signature);
    execute format('grant execute on function %s to service_role', v_signature);
  end loop;
end;
$$;
