-- Target only: isolated Supabase project jalvoro-control-plane (zzvpovvuybfihwgjrder).
-- Invitation acceptance must require the same recent password and TOTP assurance
-- as every established operator action.

create or replace function private.require_recent_control_plane_authentication()
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, auth, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_jwt jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  v_aal text := coalesce(v_jwt->>'aal', 'aal1');
  v_now_epoch bigint := extract(epoch from clock_timestamp())::bigint;
  v_latest_password_epoch bigint;
  v_latest_totp_epoch bigint;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if v_aal <> 'aal2' then
    raise exception 'mfa_verification_required' using errcode = '42501';
  end if;

  select max((entry->>'timestamp')::bigint)
      filter (where entry->>'method' = 'password' and entry->>'timestamp' ~ '^[0-9]+$'),
    max((entry->>'timestamp')::bigint)
      filter (where entry->>'method' = 'totp' and entry->>'timestamp' ~ '^[0-9]+$')
  into v_latest_password_epoch, v_latest_totp_epoch
  from jsonb_array_elements(
    case
      when jsonb_typeof(v_jwt->'amr') = 'array' then v_jwt->'amr'
      else '[]'::jsonb
    end
  ) as entry;

  if v_latest_password_epoch is null
    or v_latest_password_epoch > v_now_epoch + 60
    or v_latest_password_epoch < v_now_epoch - (12 * 60 * 60) then
    raise exception 'control_plane_password_reauthentication_required'
      using errcode = '42501';
  end if;

  if v_latest_totp_epoch is null
    or v_latest_totp_epoch > v_now_epoch + 60
    or v_latest_totp_epoch < v_now_epoch - (20 * 60) then
    raise exception 'control_plane_mfa_reauthentication_required'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function private.require_control_plane_operator(
  p_allowed_roles text[] default null
)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, auth, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
begin
  perform private.require_recent_control_plane_authentication();

  select role into v_role
  from private.control_plane_operators
  where user_id = v_user_id
    and status = 'active'
    and disabled_at is null;

  if v_role is null then
    raise exception 'control_plane_access_required' using errcode = '42501';
  end if;

  if p_allowed_roles is not null and not (v_role = any(p_allowed_roles)) then
    raise exception 'control_plane_role_required' using errcode = '42501';
  end if;

  return v_role;
end;
$$;

create or replace function public.accept_control_plane_invitation(
  p_token_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth, private, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_hash bytea;
  v_token_hash bytea;
  v_invitation private.control_plane_invitations%rowtype;
begin
  perform private.require_recent_control_plane_authentication();

  if p_token_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'control_plane_invitation_token_invalid' using errcode = '22023';
  end if;

  select lower(trim(email)) into v_email
  from auth.users
  where id = v_user_id
    and deleted_at is null
    and email_confirmed_at is not null;

  if v_email is null or v_email = '' then
    raise exception 'verified_email_required' using errcode = '42501';
  end if;

  if exists (
    select 1 from private.control_plane_operators where user_id = v_user_id
  ) then
    raise exception 'control_plane_operator_already_exists' using errcode = '23505';
  end if;

  v_email_hash := extensions.digest(convert_to(v_email, 'UTF8'), 'sha256');
  v_token_hash := decode(p_token_sha256, 'hex');

  update private.control_plane_invitations
  set status = 'expired'
  where status = 'pending' and expires_at <= now();

  select * into v_invitation
  from private.control_plane_invitations
  where token_sha256 = v_token_hash
    and intended_email_sha256 = v_email_hash
    and status = 'pending'
    and expires_at > now()
  for update;

  if v_invitation.id is null then
    raise exception 'control_plane_invitation_invalid' using errcode = '42501';
  end if;

  insert into private.control_plane_operators (
    user_id, role, is_root_owner, status, created_by
  ) values (
    v_user_id, v_invitation.role, false, 'active', v_invitation.created_by
  );

  update private.control_plane_invitations
  set status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = now()
  where id = v_invitation.id;

  insert into private.control_plane_audit_events (
    actor_user_id, subject_user_id, invitation_id, action, next_role
  ) values (
    v_user_id, v_user_id, v_invitation.id, 'invitation_accepted', v_invitation.role
  );

  return jsonb_build_object(
    'userReference', private.control_plane_user_reference(v_user_id),
    'role', v_invitation.role,
    'status', 'active'
  );
end;
$$;

revoke all on function private.require_recent_control_plane_authentication()
  from public, anon, authenticated;
revoke all on function private.require_control_plane_operator(text[])
  from public, anon, authenticated;
grant execute on function private.require_recent_control_plane_authentication()
  to postgres, service_role;
grant execute on function private.require_control_plane_operator(text[])
  to postgres, service_role;
revoke all on function public.accept_control_plane_invitation(text)
  from public, anon;
grant execute on function public.accept_control_plane_invitation(text)
  to authenticated;
