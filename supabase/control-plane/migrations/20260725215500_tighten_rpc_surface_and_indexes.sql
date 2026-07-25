-- Target only: isolated Supabase project jalvoro-control-plane (zzvpovvuybfihwgjrder).
-- Remove browser access to internal UUID-based helpers and cover every foreign
-- key used by operator and audit lifecycle queries.

revoke all on function public.disable_control_plane_operator(uuid)
  from public, anon, authenticated;
revoke all on function public.grant_control_plane_permission(
  uuid, text, text, text, text, text, uuid, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.disable_control_plane_operator(uuid)
  to postgres, service_role;
grant execute on function public.grant_control_plane_permission(
  uuid, text, text, text, text, text, uuid, text, timestamptz
) to postgres, service_role;

create index if not exists control_plane_audit_subject_user_idx
  on private.control_plane_audit_events (subject_user_id)
  where subject_user_id is not null;
create index if not exists control_plane_audit_invitation_idx
  on private.control_plane_audit_events (invitation_id)
  where invitation_id is not null;
create index if not exists control_plane_audit_grant_idx
  on private.control_plane_audit_events (grant_id)
  where grant_id is not null;
create index if not exists control_plane_invitations_created_by_idx
  on private.control_plane_invitations (created_by);
create index if not exists control_plane_invitations_accepted_by_idx
  on private.control_plane_invitations (accepted_by)
  where accepted_by is not null;
create index if not exists control_plane_operators_created_by_idx
  on private.control_plane_operators (created_by)
  where created_by is not null;
create index if not exists control_plane_operators_disabled_by_idx
  on private.control_plane_operators (disabled_by)
  where disabled_by is not null;
create index if not exists control_plane_grants_granted_by_idx
  on private.control_plane_permission_grants (granted_by);
create index if not exists control_plane_grants_revoked_by_idx
  on private.control_plane_permission_grants (revoked_by)
  where revoked_by is not null;
