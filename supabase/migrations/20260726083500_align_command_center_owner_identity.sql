-- Align the production Admin registry with the one dedicated Command Center
-- account. The legacy transposed-email owner is disabled atomically only after
-- the intended account is active as owner.
do $$
declare
  v_command_user_id uuid;
  v_legacy_user_id uuid;
  v_previous_role text;
  v_command_already_active boolean;
begin
  select id into v_command_user_id
  from auth.users
  where lower(email) = 'jamalarain186@gmail.com'
  limit 1;

  if v_command_user_id is null then
    raise exception 'command_center_owner_user_missing';
  end if;

  select id into v_legacy_user_id
  from auth.users
  where lower(email) = 'jamalarain681@gmail.com'
  limit 1;

  select role,
         role = 'owner' and disabled_at is null
  into v_previous_role, v_command_already_active
  from private.platform_admins
  where user_id = v_command_user_id;

  if not coalesce(v_command_already_active, false) then
    insert into private.platform_admins(
      user_id,
      role,
      created_by,
      disabled_at
    )
    values (
      v_command_user_id,
      'owner',
      coalesce(v_legacy_user_id, v_command_user_id),
      null
    )
    on conflict (user_id) do update
      set role = 'owner',
          disabled_at = null;

    insert into private.platform_admin_access_audit(
      actor_user_id,
      subject_user_id,
      action,
      previous_role,
      next_role
    )
    values (
      v_command_user_id,
      v_command_user_id,
      'role_changed',
      v_previous_role,
      'owner'
    );
  end if;

  if v_legacy_user_id is not null
     and v_legacy_user_id <> v_command_user_id
     and exists (
       select 1
       from private.platform_admins
       where user_id = v_legacy_user_id
         and disabled_at is null
     ) then
    update private.platform_admins
    set disabled_at = now()
    where user_id = v_legacy_user_id;

    insert into private.platform_admin_access_audit(
      actor_user_id,
      subject_user_id,
      action,
      previous_role,
      next_role
    )
    select
      v_command_user_id,
      v_legacy_user_id,
      'access_disabled',
      role,
      null
    from private.platform_admins
    where user_id = v_legacy_user_id;
  end if;
end;
$$;
