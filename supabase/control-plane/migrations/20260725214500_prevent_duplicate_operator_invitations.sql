-- Target only: isolated Supabase project jalvoro-control-plane (zzvpovvuybfihwgjrder).
-- Existing operators, including the immutable Root Owner, can never receive a
-- second operator invitation.

create or replace function public.create_control_plane_invitation(
  p_email text,
  p_role text,
  p_token_sha256 text,
  p_expires_in_hours integer default 72
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth, private, extensions
as $$
declare
  v_actor uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_email_hash bytea;
  v_token_hash bytea;
  v_invitation private.control_plane_invitations%rowtype;
begin
  perform private.require_control_plane_operator(array['owner']);

  if char_length(v_email) < 5 or char_length(v_email) > 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'control_plane_invitation_email_invalid' using errcode = '22023';
  end if;

  if exists (
    select 1
    from auth.users u
    join private.control_plane_operators o on o.user_id = u.id
    where lower(trim(u.email)) = v_email
  ) then
    raise exception 'control_plane_operator_already_exists' using errcode = '23505';
  end if;

  if p_role not in ('admin', 'analyst', 'support') then
    raise exception 'control_plane_invitation_role_invalid' using errcode = '22023';
  end if;

  if p_expires_in_hours < 1 or p_expires_in_hours > 168 then
    raise exception 'control_plane_invitation_expiry_invalid' using errcode = '22023';
  end if;

  if p_token_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'control_plane_invitation_token_invalid' using errcode = '22023';
  end if;

  v_email_hash := extensions.digest(convert_to(v_email, 'UTF8'), 'sha256');
  v_token_hash := decode(p_token_sha256, 'hex');

  update private.control_plane_invitations
  set status = 'expired'
  where status = 'pending' and expires_at <= now();

  update private.control_plane_invitations
  set status = 'revoked', revoked_at = now()
  where status = 'pending'
    and intended_email_sha256 = v_email_hash;

  insert into private.control_plane_invitations (
    token_sha256,
    intended_email_sha256,
    intended_email_masked,
    role,
    created_by,
    expires_at
  ) values (
    v_token_hash,
    v_email_hash,
    private.mask_control_plane_email(v_email),
    p_role,
    v_actor,
    now() + make_interval(hours => p_expires_in_hours)
  ) returning * into v_invitation;

  insert into private.control_plane_audit_events (
    actor_user_id, invitation_id, action, next_role
  ) values (
    v_actor, v_invitation.id, 'invitation_created', v_invitation.role
  );

  return jsonb_build_object(
    'invitationCode', v_invitation.invitation_code,
    'maskedEmail', v_invitation.intended_email_masked,
    'role', v_invitation.role,
    'expiresAt', v_invitation.expires_at
  );
end;
$$;

revoke all on function public.create_control_plane_invitation(text, text, text, integer)
  from public, anon;
grant execute on function public.create_control_plane_invitation(text, text, text, integer)
  to authenticated;
