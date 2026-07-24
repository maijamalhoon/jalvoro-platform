create or replace function private.command_center_organization_audit_reference(p_audit_id bigint)
returns text
language sql
immutable
strict
set search_path = 'pg_catalog', 'extensions'
as $$
  select 'OAE-' || upper(substr(
    encode(extensions.digest(convert_to(p_audit_id::text, 'UTF8'), 'sha256'), 'hex'),
    1,
    12
  ));
$$;

create or replace function private.get_command_center_organization_detail_json(
  p_organization_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = 'pg_catalog', 'private'
as $$
  select jsonb_build_object(
    'organizationCode', o.organization_code,
    'organizationKey', o.organization_key,
    'displayName', o.display_name,
    'status', o.status,
    'primaryCountryCode', o.primary_country_code,
    'regionKey', o.region_key,
    'dataClassification', o.data_classification,
    'version', o.version,
    'createdAt', o.created_at,
    'updatedAt', o.updated_at,
    'members', coalesce((
      select jsonb_agg(to_jsonb(member_rows) order by member_rows."createdAt", member_rows."membershipCode")
      from (
        select
          m.membership_code as "membershipCode",
          private.organization_member_reference(m.user_id) as "memberReference",
          m.role,
          m.status,
          m.version,
          m.created_at as "createdAt",
          m.updated_at as "updatedAt"
        from private.command_center_organization_memberships m
        where m.organization_id = o.id
        order by m.created_at, m.membership_code
        limit 250
      ) member_rows
    ), '[]'::jsonb),
    'grants', coalesce((
      select jsonb_agg(to_jsonb(grant_rows) order by grant_rows."grantedAt" desc, grant_rows."grantCode")
      from (
        select
          g.grant_code as "grantCode",
          private.platform_admin_reference(g.user_id) as "adminReference",
          g.permission_key as "permissionKey",
          case
            when g.revoked_at is not null then 'revoked'
            when g.expires_at is not null and g.expires_at <= now() then 'expired'
            else 'active'
          end as status,
          g.granted_at as "grantedAt",
          g.expires_at as "expiresAt",
          g.revoked_at as "revokedAt"
        from private.command_center_admin_grants g
        where g.organization_id = o.id
        order by g.granted_at desc, g.grant_code
        limit 250
      ) grant_rows
    ), '[]'::jsonb),
    'audit', coalesce((
      select jsonb_agg(to_jsonb(audit_rows) order by audit_rows."createdAt" desc)
      from (
        select
          private.command_center_organization_audit_reference(a.id) as "eventReference",
          a.action,
          private.organization_member_reference(a.actor_user_id) as "actorReference",
          private.organization_member_reference(a.subject_user_id) as "subjectReference",
          a.previous_status as "previousStatus",
          a.next_status as "nextStatus",
          a.previous_role as "previousRole",
          a.next_role as "nextRole",
          a.created_at as "createdAt",
          a.expires_at as "expiresAt"
        from private.command_center_organization_audit a
        where a.organization_id = o.id
        order by a.created_at desc, a.id desc
        limit 100
      ) audit_rows
    ), '[]'::jsonb)
  )
  from private.command_center_organizations o
  where o.id = p_organization_id;
$$;

create or replace function private.get_command_center_organization_operations_snapshot(
  p_organization_code text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog', 'private'
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_limit integer := coalesce(p_limit, 50);
  v_offset integer := coalesce(p_offset, 0);
  v_total bigint := 0;
  v_items jsonb := '[]'::jsonb;
  v_selected_id uuid;
  v_selected jsonb := null;
begin
  if v_user_id is null or v_role is null then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;
  if v_limit < 1 or v_limit > 100 or v_offset < 0 or v_offset > 100000 then
    raise exception 'command_center_organization_pagination_invalid' using errcode = '22023';
  end if;

  select count(*)::bigint
  into v_total
  from private.command_center_organizations o
  where private.command_center_has_organization_permission(
    'command-center:organizations:view',
    o.id
  );

  select coalesce(
    jsonb_agg(to_jsonb(organization_rows) order by organization_rows."displayName"),
    '[]'::jsonb
  )
  into v_items
  from (
    select
      o.organization_code as "organizationCode",
      o.organization_key as "organizationKey",
      o.display_name as "displayName",
      o.status,
      o.primary_country_code as "primaryCountryCode",
      o.region_key as "regionKey",
      o.data_classification as "dataClassification",
      o.version,
      o.created_at as "createdAt",
      o.updated_at as "updatedAt",
      count(m.id)::bigint as memberships,
      count(m.id) filter (where m.status = 'active')::bigint as "activeMemberships",
      count(m.id) filter (
        where m.status = 'active' and m.role = 'organization_owner'
      )::bigint as "activeOwners",
      (
        select count(*)::bigint
        from private.command_center_admin_grants g
        where g.organization_id = o.id
          and g.revoked_at is null
          and (g.expires_at is null or g.expires_at > now())
      ) as "activeAdminGrants"
    from private.command_center_organizations o
    left join private.command_center_organization_memberships m
      on m.organization_id = o.id
    where private.command_center_has_organization_permission(
      'command-center:organizations:view',
      o.id
    )
    group by o.id
    order by o.display_name, o.organization_code
    limit v_limit
    offset v_offset
  ) organization_rows;

  if nullif(upper(btrim(coalesce(p_organization_code, ''))), '') is not null then
    select o.id
    into v_selected_id
    from private.command_center_organizations o
    where o.organization_code = upper(btrim(p_organization_code))
      and private.command_center_has_organization_permission(
        'command-center:organizations:view',
        o.id
      );

    if v_selected_id is null then
      raise exception 'command_center_organization_missing' using errcode = 'P0002';
    end if;

    v_selected := private.get_command_center_organization_detail_json(v_selected_id);
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'adminRole', v_role,
    'operationsAllowed', v_role = 'owner',
    'totals', jsonb_build_object(
      'total', v_total,
      'draft', (
        select count(*)::bigint
        from private.command_center_organizations o
        where o.status = 'draft'
          and private.command_center_has_organization_permission(
            'command-center:organizations:view',
            o.id
          )
      ),
      'active', (
        select count(*)::bigint
        from private.command_center_organizations o
        where o.status = 'active'
          and private.command_center_has_organization_permission(
            'command-center:organizations:view',
            o.id
          )
      ),
      'suspended', (
        select count(*)::bigint
        from private.command_center_organizations o
        where o.status = 'suspended'
          and private.command_center_has_organization_permission(
            'command-center:organizations:view',
            o.id
          )
      ),
      'closed', (
        select count(*)::bigint
        from private.command_center_organizations o
        where o.status = 'closed'
          and private.command_center_has_organization_permission(
            'command-center:organizations:view',
            o.id
          )
      ),
      'memberships', (
        select count(*)::bigint
        from private.command_center_organization_memberships m
        join private.command_center_organizations o on o.id = m.organization_id
        where private.command_center_has_organization_permission(
          'command-center:organizations:view',
          o.id
        )
      ),
      'activeMemberships', (
        select count(*)::bigint
        from private.command_center_organization_memberships m
        join private.command_center_organizations o on o.id = m.organization_id
        where m.status = 'active'
          and private.command_center_has_organization_permission(
            'command-center:organizations:view',
            o.id
          )
      ),
      'activeAdminGrants', (
        select count(*)::bigint
        from private.command_center_admin_grants g
        join private.command_center_organizations o on o.id = g.organization_id
        where g.revoked_at is null
          and (g.expires_at is null or g.expires_at > now())
          and private.command_center_has_organization_permission(
            'command-center:organizations:view',
            o.id
          )
      )
    ),
    'pagination', jsonb_build_object(
      'limit', v_limit,
      'offset', v_offset,
      'hasMore', v_offset + jsonb_array_length(v_items) < v_total
    ),
    'items', v_items,
    'selectedOrganization', v_selected,
    'availablePermissions', jsonb_build_array(
      'command-center:organizations:view',
      'command-center:organizations:manage',
      'command-center:organizations:membership-manage'
    ),
    'identityFieldsIncluded', false,
    'directTableAccessEnabled', false
  );
end;
$$;

create or replace function private.resolve_command_center_user_by_email(
  p_email text,
  p_require_platform_admin boolean default false
)
returns uuid
language plpgsql
stable
security definer
set search_path = 'pg_catalog', 'auth', 'private'
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user_id uuid;
begin
  if v_actor is null or v_role <> 'owner' then
    raise exception 'command_center_organization_owner_required' using errcode = '42501';
  end if;
  if char_length(v_email) < 3
     or char_length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'command_center_organization_email_invalid' using errcode = '22023';
  end if;

  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = v_email
    and u.deleted_at is null
    and coalesce(u.is_anonymous, false) = false
    and (
      not p_require_platform_admin
      or exists (
        select 1
        from private.platform_admins pa
        where pa.user_id = u.id
          and pa.disabled_at is null
      )
    )
  order by u.created_at
  limit 1;

  if v_user_id is null then
    raise exception 'command_center_organization_user_missing' using errcode = 'P0002';
  end if;

  return v_user_id;
end;
$$;

create or replace function private.create_command_center_organization_by_email(
  p_organization_key text,
  p_display_name text,
  p_owner_email text,
  p_primary_country_code text default null,
  p_region_key text default null,
  p_data_classification text default 'confidential'
)
returns jsonb
language sql
security definer
set search_path = 'pg_catalog', 'private'
as $$
  select private.create_command_center_organization(
    p_organization_key,
    p_display_name,
    private.resolve_command_center_user_by_email(p_owner_email, false),
    p_primary_country_code,
    p_region_key,
    p_data_classification
  );
$$;

create or replace function private.create_command_center_organization_membership_by_email(
  p_organization_code text,
  p_member_email text,
  p_role text
)
returns jsonb
language sql
security definer
set search_path = 'pg_catalog', 'private'
as $$
  select private.create_command_center_organization_membership(
    p_organization_code,
    private.resolve_command_center_user_by_email(p_member_email, false),
    p_role
  );
$$;

create or replace function private.grant_command_center_organization_permission_by_email(
  p_admin_email text,
  p_permission_key text,
  p_organization_code text,
  p_expires_at timestamptz default null
)
returns jsonb
language sql
security definer
set search_path = 'pg_catalog', 'private'
as $$
  select private.grant_command_center_organization_permission(
    private.resolve_command_center_user_by_email(p_admin_email, true),
    p_permission_key,
    p_organization_code,
    p_expires_at
  );
$$;

create or replace function public.get_command_center_organization_operations_snapshot(
  p_organization_code text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
stable
set search_path = 'pg_catalog', 'private'
as $$
  select private.get_command_center_organization_operations_snapshot(
    p_organization_code,
    p_limit,
    p_offset
  );
$$;

create or replace function public.create_command_center_organization_by_email(
  p_organization_key text,
  p_display_name text,
  p_owner_email text,
  p_primary_country_code text default null,
  p_region_key text default null,
  p_data_classification text default 'confidential'
)
returns jsonb
language sql
set search_path = 'pg_catalog', 'private'
as $$
  select private.create_command_center_organization_by_email(
    p_organization_key,
    p_display_name,
    p_owner_email,
    p_primary_country_code,
    p_region_key,
    p_data_classification
  );
$$;

create or replace function public.create_command_center_organization_membership_by_email(
  p_organization_code text,
  p_member_email text,
  p_role text
)
returns jsonb
language sql
set search_path = 'pg_catalog', 'private'
as $$
  select private.create_command_center_organization_membership_by_email(
    p_organization_code,
    p_member_email,
    p_role
  );
$$;

create or replace function public.grant_command_center_organization_permission_by_email(
  p_admin_email text,
  p_permission_key text,
  p_organization_code text,
  p_expires_at timestamptz default null
)
returns jsonb
language sql
set search_path = 'pg_catalog', 'private'
as $$
  select private.grant_command_center_organization_permission_by_email(
    p_admin_email,
    p_permission_key,
    p_organization_code,
    p_expires_at
  );
$$;

revoke all on function private.command_center_organization_audit_reference(bigint) from public, anon, authenticated;
revoke all on function private.get_command_center_organization_detail_json(uuid) from public, anon, authenticated;
revoke all on function private.get_command_center_organization_operations_snapshot(text, integer, integer) from public, anon;
revoke all on function private.resolve_command_center_user_by_email(text, boolean) from public, anon, authenticated;
revoke all on function private.create_command_center_organization_by_email(text, text, text, text, text, text) from public, anon;
revoke all on function private.create_command_center_organization_membership_by_email(text, text, text) from public, anon;
revoke all on function private.grant_command_center_organization_permission_by_email(text, text, text, timestamptz) from public, anon;

grant execute on function private.get_command_center_organization_operations_snapshot(text, integer, integer) to authenticated;
grant execute on function private.create_command_center_organization_by_email(text, text, text, text, text, text) to authenticated;
grant execute on function private.create_command_center_organization_membership_by_email(text, text, text) to authenticated;
grant execute on function private.grant_command_center_organization_permission_by_email(text, text, text, timestamptz) to authenticated;

revoke all on function public.get_command_center_organization_operations_snapshot(text, integer, integer) from public, anon;
revoke all on function public.create_command_center_organization_by_email(text, text, text, text, text, text) from public, anon;
revoke all on function public.create_command_center_organization_membership_by_email(text, text, text) from public, anon;
revoke all on function public.grant_command_center_organization_permission_by_email(text, text, text, timestamptz) from public, anon;

grant execute on function public.get_command_center_organization_operations_snapshot(text, integer, integer) to authenticated;
grant execute on function public.create_command_center_organization_by_email(text, text, text, text, text, text) to authenticated;
grant execute on function public.create_command_center_organization_membership_by_email(text, text, text) to authenticated;
grant execute on function public.grant_command_center_organization_permission_by_email(text, text, text, timestamptz) to authenticated;
