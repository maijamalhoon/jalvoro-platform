-- Target only: isolated Supabase project jalvoro-control-plane (zzvpovvuybfihwgjrder).
-- Keep outside supabase/migrations to prevent accidental application to the main
-- JALVORO production database.

create or replace function private.resolve_control_plane_user_reference(
  p_user_reference text
)
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, private
as $$
declare
  v_reference text := upper(trim(coalesce(p_user_reference, '')));
  v_user_id uuid;
begin
  if v_reference !~ '^CPU-[A-F0-9]{12}$' then
    raise exception 'control_plane_user_reference_invalid' using errcode = '22023';
  end if;

  select user_id into v_user_id
  from private.control_plane_operators
  where private.control_plane_user_reference(user_id) = v_reference;

  if v_user_id is null then
    raise exception 'control_plane_operator_not_found' using errcode = '22023';
  end if;

  return v_user_id;
end;
$$;

revoke all on function private.resolve_control_plane_user_reference(text)
  from public, anon, authenticated;
grant execute on function private.resolve_control_plane_user_reference(text)
  to postgres, service_role;

create or replace function public.grant_control_plane_permission_by_reference(
  p_user_reference text,
  p_permission_key text,
  p_product_key text default null,
  p_module_key text default null,
  p_environment_key text default null,
  p_region_key text default null,
  p_organization_id uuid default null,
  p_data_classification text default null,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
declare
  v_user_id uuid;
begin
  perform private.require_control_plane_operator(array['owner']);
  v_user_id := private.resolve_control_plane_user_reference(p_user_reference);

  return public.grant_control_plane_permission(
    v_user_id,
    p_permission_key,
    p_product_key,
    p_module_key,
    p_environment_key,
    p_region_key,
    p_organization_id,
    p_data_classification,
    p_expires_at
  );
end;
$$;

create or replace function public.disable_control_plane_operator_by_reference(
  p_user_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
begin
  perform private.require_control_plane_operator(array['owner']);
  return public.disable_control_plane_operator(
    private.resolve_control_plane_user_reference(p_user_reference)
  );
end;
$$;

create or replace function public.restore_control_plane_operator_by_reference(
  p_user_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth, private
as $$
declare
  v_actor uuid := auth.uid();
  v_user_id uuid;
  v_operator private.control_plane_operators%rowtype;
begin
  perform private.require_control_plane_operator(array['owner']);
  v_user_id := private.resolve_control_plane_user_reference(p_user_reference);

  select * into v_operator
  from private.control_plane_operators
  where user_id = v_user_id
  for update;

  if v_operator.is_root_owner then
    raise exception 'root_owner_cannot_be_restored' using errcode = '42501';
  end if;

  update private.control_plane_operators
  set status = 'active',
      disabled_at = null,
      disabled_by = null,
      updated_at = now()
  where user_id = v_user_id;

  insert into private.control_plane_audit_events (
    actor_user_id,
    subject_user_id,
    action,
    next_role
  ) values (
    v_actor,
    v_user_id,
    'operator_restored',
    v_operator.role
  );

  return jsonb_build_object(
    'userReference', private.control_plane_user_reference(v_user_id),
    'status', 'active'
  );
end;
$$;

create or replace function public.change_control_plane_operator_role_by_reference(
  p_user_reference text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth, private
as $$
declare
  v_actor uuid := auth.uid();
  v_user_id uuid;
  v_operator private.control_plane_operators%rowtype;
begin
  perform private.require_control_plane_operator(array['owner']);

  if p_role not in ('admin', 'analyst', 'support') then
    raise exception 'control_plane_operator_role_invalid' using errcode = '22023';
  end if;

  v_user_id := private.resolve_control_plane_user_reference(p_user_reference);

  select * into v_operator
  from private.control_plane_operators
  where user_id = v_user_id
  for update;

  if v_operator.is_root_owner then
    raise exception 'root_owner_role_is_immutable' using errcode = '42501';
  end if;

  update private.control_plane_operators
  set role = p_role,
      updated_at = now()
  where user_id = v_user_id;

  insert into private.control_plane_audit_events (
    actor_user_id,
    subject_user_id,
    action,
    previous_role,
    next_role
  ) values (
    v_actor,
    v_user_id,
    'operator_role_changed',
    v_operator.role,
    p_role
  );

  return jsonb_build_object(
    'userReference', private.control_plane_user_reference(v_user_id),
    'role', p_role,
    'status', v_operator.status
  );
end;
$$;

create or replace function public.revoke_control_plane_invitation(
  p_invitation_code text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth, private
as $$
declare
  v_actor uuid := auth.uid();
  v_invitation private.control_plane_invitations%rowtype;
begin
  perform private.require_control_plane_operator(array['owner']);

  select * into v_invitation
  from private.control_plane_invitations
  where invitation_code = upper(trim(coalesce(p_invitation_code, '')))
    and status = 'pending'
  for update;

  if v_invitation.id is null then
    raise exception 'control_plane_invitation_not_found' using errcode = '22023';
  end if;

  update private.control_plane_invitations
  set status = 'revoked',
      revoked_at = now()
  where id = v_invitation.id;

  insert into private.control_plane_audit_events (
    actor_user_id,
    invitation_id,
    action,
    previous_role
  ) values (
    v_actor,
    v_invitation.id,
    'invitation_revoked',
    v_invitation.role
  );

  return jsonb_build_object(
    'invitationCode', v_invitation.invitation_code,
    'status', 'revoked'
  );
end;
$$;

revoke all on function public.grant_control_plane_permission_by_reference(
  text, text, text, text, text, text, uuid, text, timestamptz
) from public, anon;
revoke all on function public.disable_control_plane_operator_by_reference(text)
  from public, anon;
revoke all on function public.restore_control_plane_operator_by_reference(text)
  from public, anon;
revoke all on function public.change_control_plane_operator_role_by_reference(text, text)
  from public, anon;
revoke all on function public.revoke_control_plane_invitation(text)
  from public, anon;

grant execute on function public.grant_control_plane_permission_by_reference(
  text, text, text, text, text, text, uuid, text, timestamptz
) to authenticated;
grant execute on function public.disable_control_plane_operator_by_reference(text)
  to authenticated;
grant execute on function public.restore_control_plane_operator_by_reference(text)
  to authenticated;
grant execute on function public.change_control_plane_operator_role_by_reference(text, text)
  to authenticated;
grant execute on function public.revoke_control_plane_invitation(text)
  to authenticated;
