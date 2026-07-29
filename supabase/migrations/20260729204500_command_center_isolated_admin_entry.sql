begin;

create or replace function public.resolve_command_center_actor_by_email(
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth, private
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user_id uuid;
  v_role text;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'command_center_gateway_service_role_required'
      using errcode = '42501';
  end if;

  if v_email = '' or char_length(v_email) > 254 then
    raise exception 'command_center_actor_email_invalid'
      using errcode = '22023';
  end if;

  select u.id, pa.role
    into v_user_id, v_role
  from auth.users u
  join private.platform_admins pa on pa.user_id = u.id
  where lower(btrim(u.email)) = v_email
    and u.deleted_at is null
    and u.email_confirmed_at is not null
    and pa.disabled_at is null
  limit 1;

  if v_user_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'userId', v_user_id,
    'role', v_role
  );
end;
$$;

revoke all on function public.resolve_command_center_actor_by_email(text)
  from public, anon, authenticated;
grant execute on function public.resolve_command_center_actor_by_email(text)
  to service_role;

comment on function public.resolve_command_center_actor_by_email(text) is
  'Service-role-only bridge from a verified isolated Command Center email to an active platform administrator actor. It does not create a customer application session.';

commit;
