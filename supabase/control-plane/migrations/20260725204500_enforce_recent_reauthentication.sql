-- Target only: isolated Supabase project jalvoro-control-plane (zzvpovvuybfihwgjrder).
-- This file is intentionally outside supabase/migrations so the main JALVORO
-- production migration runner cannot apply it accidentally.

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
  v_jwt jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  v_aal text := coalesce(v_jwt->>'aal', 'aal1');
  v_role text;
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
      filter (
        where entry->>'method' = 'password'
          and entry->>'timestamp' ~ '^[0-9]+$'
      ),
    max((entry->>'timestamp')::bigint)
      filter (
        where entry->>'method' = 'totp'
          and entry->>'timestamp' ~ '^[0-9]+$'
      )
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

revoke all on function private.require_control_plane_operator(text[])
  from public, anon, authenticated;
grant execute on function private.require_control_plane_operator(text[])
  to postgres, service_role;
