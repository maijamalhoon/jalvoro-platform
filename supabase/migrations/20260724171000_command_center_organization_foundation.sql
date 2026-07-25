create table private.command_center_organizations (
  id uuid primary key default gen_random_uuid(),
  organization_code text not null unique default ('ORG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  organization_key text not null unique,
  display_name text not null,
  status text not null default 'draft',
  primary_country_code text,
  region_key text references private.command_center_regions(region_key) on update cascade on delete restrict,
  data_classification text not null default 'confidential',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  suspended_at timestamptz,
  closed_at timestamptz,
  version bigint not null default 1,
  constraint command_center_organization_code_check check (organization_code ~ '^ORG-[A-F0-9]{12}$'),
  constraint command_center_organization_key_check check (organization_key ~ '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$'),
  constraint command_center_organization_name_check check (
    char_length(display_name) between 2 and 120
    and display_name = btrim(display_name)
    and display_name !~ '[[:cntrl:]]'
  ),
  constraint command_center_organization_status_check check (status in ('draft', 'active', 'suspended', 'closed')),
  constraint command_center_organization_country_check check (primary_country_code is null or primary_country_code ~ '^[A-Z]{2}$'),
  constraint command_center_organization_classification_check check (data_classification in ('public', 'internal', 'confidential', 'restricted')),
  constraint command_center_organization_version_check check (version > 0),
  constraint command_center_organization_timestamps_check check (
    (status = 'draft' and activated_at is null and suspended_at is null and closed_at is null)
    or (status = 'active' and activated_at is not null and closed_at is null)
    or (status = 'suspended' and activated_at is not null and suspended_at is not null and closed_at is null)
    or (status = 'closed' and closed_at is not null)
  )
);

create table private.command_center_organization_memberships (
  id uuid primary key default gen_random_uuid(),
  membership_code text not null unique default ('MBR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  organization_id uuid not null references private.command_center_organizations(id) on update cascade on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  suspended_at timestamptz,
  revoked_at timestamptz,
  version bigint not null default 1,
  constraint command_center_organization_membership_code_check check (membership_code ~ '^MBR-[A-F0-9]{12}$'),
  constraint command_center_organization_membership_role_check check (role in ('organization_owner', 'organization_admin', 'billing_admin', 'analyst', 'member')),
  constraint command_center_organization_membership_status_check check (status in ('active', 'suspended', 'revoked')),
  constraint command_center_organization_membership_version_check check (version > 0),
  constraint command_center_organization_membership_timestamps_check check (
    (status = 'active' and revoked_at is null)
    or (status = 'suspended' and suspended_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  ),
  unique (organization_id, user_id)
);

create table private.command_center_organization_audit (
  id bigint primary key generated always as identity,
  organization_id uuid references private.command_center_organizations(id) on delete set null,
  membership_id uuid references private.command_center_organization_memberships(id) on delete set null,
  admin_grant_id uuid references private.command_center_admin_grants(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  previous_status text,
  next_status text,
  previous_role text,
  next_role text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 years'),
  constraint command_center_organization_audit_action_check check (action in (
    'organization_created',
    'organization_status_changed',
    'membership_created',
    'membership_role_changed',
    'membership_suspended',
    'membership_reactivated',
    'membership_revoked',
    'organization_admin_permission_granted',
    'organization_admin_permission_revoked'
  )),
  constraint command_center_organization_audit_expiry_check check (expires_at > created_at)
);

alter table private.command_center_organizations enable row level security;
alter table private.command_center_organization_memberships enable row level security;
alter table private.command_center_organization_audit enable row level security;

create policy command_center_organizations_deny_direct
on private.command_center_organizations
for all to public
using (false)
with check (false);

create policy command_center_organization_memberships_deny_direct
on private.command_center_organization_memberships
for all to public
using (false)
with check (false);

create policy command_center_organization_audit_deny_direct
on private.command_center_organization_audit
for all to public
using (false)
with check (false);

revoke all on table private.command_center_organizations from public, anon, authenticated;
revoke all on table private.command_center_organization_memberships from public, anon, authenticated;
revoke all on table private.command_center_organization_audit from public, anon, authenticated;
grant all on table private.command_center_organizations to service_role;
grant all on table private.command_center_organization_memberships to service_role;
grant all on table private.command_center_organization_audit to service_role;
grant usage, select on sequence private.command_center_organization_audit_id_seq to service_role;

create index command_center_organizations_status_idx
  on private.command_center_organizations (status, created_at desc);
create index command_center_organizations_region_idx
  on private.command_center_organizations (region_key)
  where region_key is not null;
create index command_center_organization_memberships_org_status_idx
  on private.command_center_organization_memberships (organization_id, status, role);
create index command_center_organization_memberships_user_status_idx
  on private.command_center_organization_memberships (user_id, status);
create index command_center_organization_audit_org_created_idx
  on private.command_center_organization_audit (organization_id, created_at desc);
create index command_center_organization_audit_membership_idx
  on private.command_center_organization_audit (membership_id)
  where membership_id is not null;
create index command_center_organization_audit_grant_idx
  on private.command_center_organization_audit (admin_grant_id)
  where admin_grant_id is not null;
create index command_center_organization_audit_actor_idx
  on private.command_center_organization_audit (actor_user_id)
  where actor_user_id is not null;
create index command_center_admin_grants_organization_idx
  on private.command_center_admin_grants (organization_id, permission_key, user_id)
  where organization_id is not null;

alter table private.command_center_admin_grants
  add constraint command_center_admin_grants_organization_id_fkey
  foreign key (organization_id)
  references private.command_center_organizations(id)
  on update cascade
  on delete restrict;

create trigger command_center_organization_audit_append_only
before update or delete on private.command_center_organization_audit
for each row execute function private.reject_platform_audit_update();

create or replace function private.organization_member_reference(p_user_id uuid)
returns text
language sql
immutable strict
set search_path = 'pg_catalog', 'extensions'
as $$
  select 'USR-' || upper(substr(
    encode(extensions.digest(convert_to(p_user_id::text, 'UTF8'), 'sha256'), 'hex'),
    1,
    12
  ));
$$;

create or replace function private.command_center_has_organization_permission(
  p_permission_key text,
  p_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = 'pg_catalog', 'private'
as $$
  select exists (
    select 1
    from private.platform_admins pa
    join private.command_center_organizations o on o.id = p_organization_id
    where pa.user_id = auth.uid()
      and pa.disabled_at is null
      and o.status <> 'closed'
      and (
        exists (
          select 1
          from private.command_center_role_permissions rp
          where rp.role = pa.role
            and rp.permission_key = p_permission_key
            and (rp.product_key is null or rp.product_key = 'command-center')
            and (rp.module_key is null or rp.module_key = 'organizations')
            and rp.environment_key is null
        )
        or exists (
          select 1
          from private.command_center_admin_grants g
          where g.user_id = pa.user_id
            and g.permission_key = p_permission_key
            and g.revoked_at is null
            and (g.expires_at is null or g.expires_at > now())
            and (g.product_key is null or g.product_key = 'command-center')
            and (g.module_key is null or g.module_key = 'organizations')
            and g.environment_key is null
            and (g.region_key is null or g.region_key = o.region_key)
            and (g.organization_id is null or g.organization_id = o.id)
            and (g.data_classification is null or g.data_classification = o.data_classification)
        )
      )
  );
$$;

create or replace function private.create_command_center_organization(
  p_organization_key text,
  p_display_name text,
  p_owner_user_id uuid,
  p_primary_country_code text default null,
  p_region_key text default null,
  p_data_classification text default 'confidential'
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'auth', 'private'
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_organization private.command_center_organizations%rowtype;
  v_membership private.command_center_organization_memberships%rowtype;
  v_key text := lower(btrim(coalesce(p_organization_key, '')));
  v_name text := btrim(coalesce(p_display_name, ''));
  v_country text := nullif(upper(btrim(coalesce(p_primary_country_code, ''))), '');
  v_region text := nullif(lower(btrim(coalesce(p_region_key, ''))), '');
  v_classification text := lower(btrim(coalesce(p_data_classification, '')));
begin
  if v_actor is null or v_role <> 'owner' then
    raise exception 'command_center_organization_owner_required' using errcode = '42501';
  end if;
  if v_key !~ '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$' or char_length(v_key) > 80 then
    raise exception 'command_center_organization_key_invalid' using errcode = '22023';
  end if;
  if char_length(v_name) not between 2 and 120 or v_name ~ '[[:cntrl:]]' then
    raise exception 'command_center_organization_name_invalid' using errcode = '22023';
  end if;
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then
    raise exception 'command_center_organization_country_invalid' using errcode = '22023';
  end if;
  if v_classification not in ('public', 'internal', 'confidential', 'restricted') then
    raise exception 'command_center_organization_classification_invalid' using errcode = '22023';
  end if;
  if v_region is not null and not exists (
    select 1 from private.command_center_regions where region_key = v_region and active
  ) then
    raise exception 'command_center_region_missing' using errcode = 'P0002';
  end if;
  if not exists (select 1 from auth.users where id = p_owner_user_id and deleted_at is null) then
    raise exception 'command_center_organization_owner_user_missing' using errcode = 'P0002';
  end if;

  insert into private.command_center_organizations (
    organization_key,
    display_name,
    primary_country_code,
    region_key,
    data_classification,
    created_by,
    updated_by
  ) values (
    v_key,
    v_name,
    v_country,
    v_region,
    v_classification,
    v_actor,
    v_actor
  ) returning * into v_organization;

  insert into private.command_center_organization_memberships (
    organization_id,
    user_id,
    role,
    status,
    created_by,
    updated_by
  ) values (
    v_organization.id,
    p_owner_user_id,
    'organization_owner',
    'active',
    v_actor,
    v_actor
  ) returning * into v_membership;

  insert into private.command_center_organization_audit (
    organization_id,
    actor_user_id,
    action,
    next_status
  ) values (
    v_organization.id,
    v_actor,
    'organization_created',
    'draft'
  );

  insert into private.command_center_organization_audit (
    organization_id,
    membership_id,
    actor_user_id,
    subject_user_id,
    action,
    next_status,
    next_role
  ) values (
    v_organization.id,
    v_membership.id,
    v_actor,
    p_owner_user_id,
    'membership_created',
    'active',
    'organization_owner'
  );

  return jsonb_build_object(
    'organizationCode', v_organization.organization_code,
    'organizationKey', v_organization.organization_key,
    'status', v_organization.status,
    'ownerReference', private.organization_member_reference(p_owner_user_id),
    'membershipCode', v_membership.membership_code
  );
exception
  when unique_violation then
    raise exception 'command_center_organization_already_exists' using errcode = '23505';
end;
$$;

create or replace function private.transition_command_center_organization(
  p_organization_code text,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'private'
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_organization private.command_center_organizations%rowtype;
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_previous_status text;
begin
  if v_actor is null or v_role <> 'owner' then
    raise exception 'command_center_organization_owner_required' using errcode = '42501';
  end if;

  select * into v_organization
  from private.command_center_organizations
  where organization_code = upper(btrim(coalesce(p_organization_code, '')))
  for update;

  if v_organization.id is null then
    raise exception 'command_center_organization_missing' using errcode = 'P0002';
  end if;

  v_previous_status := v_organization.status;

  if v_action = 'activate' then
    if v_organization.status not in ('draft', 'suspended') then
      raise exception 'command_center_organization_transition_invalid' using errcode = '22023';
    end if;
    if not exists (
      select 1
      from private.command_center_organization_memberships
      where organization_id = v_organization.id
        and role = 'organization_owner'
        and status = 'active'
    ) then
      raise exception 'command_center_organization_active_owner_required' using errcode = '23514';
    end if;
    update private.command_center_organizations
    set status = 'active',
        activated_at = coalesce(activated_at, now()),
        updated_by = v_actor,
        updated_at = now(),
        version = version + 1
    where id = v_organization.id
    returning * into v_organization;
  elsif v_action = 'suspend' then
    if v_organization.status <> 'active' then
      raise exception 'command_center_organization_transition_invalid' using errcode = '22023';
    end if;
    update private.command_center_organizations
    set status = 'suspended',
        suspended_at = now(),
        updated_by = v_actor,
        updated_at = now(),
        version = version + 1
    where id = v_organization.id
    returning * into v_organization;
  elsif v_action = 'close' then
    if v_organization.status = 'closed' then
      raise exception 'command_center_organization_transition_invalid' using errcode = '22023';
    end if;

    insert into private.command_center_organization_audit (
      organization_id,
      membership_id,
      actor_user_id,
      subject_user_id,
      action,
      previous_status,
      next_status,
      previous_role,
      next_role
    )
    select
      organization_id,
      id,
      v_actor,
      user_id,
      'membership_revoked',
      status,
      'revoked',
      role,
      role
    from private.command_center_organization_memberships
    where organization_id = v_organization.id
      and status <> 'revoked';

    update private.command_center_organization_memberships
    set status = 'revoked',
        revoked_at = now(),
        updated_by = v_actor,
        updated_at = now(),
        version = version + 1
    where organization_id = v_organization.id
      and status <> 'revoked';

    insert into private.command_center_organization_audit (
      organization_id,
      admin_grant_id,
      actor_user_id,
      subject_user_id,
      action,
      previous_status,
      next_status
    )
    select
      organization_id,
      id,
      v_actor,
      user_id,
      'organization_admin_permission_revoked',
      'active',
      'revoked'
    from private.command_center_admin_grants
    where organization_id = v_organization.id
      and revoked_at is null;

    update private.command_center_admin_grants
    set revoked_at = now(), revoked_by = v_actor
    where organization_id = v_organization.id
      and revoked_at is null;

    update private.command_center_organizations
    set status = 'closed',
        closed_at = now(),
        updated_by = v_actor,
        updated_at = now(),
        version = version + 1
    where id = v_organization.id
    returning * into v_organization;
  else
    raise exception 'command_center_organization_action_invalid' using errcode = '22023';
  end if;

  insert into private.command_center_organization_audit (
    organization_id,
    actor_user_id,
    action,
    previous_status,
    next_status
  ) values (
    v_organization.id,
    v_actor,
    'organization_status_changed',
    v_previous_status,
    v_organization.status
  );

  return jsonb_build_object(
    'organizationCode', v_organization.organization_code,
    'status', v_organization.status,
    'version', v_organization.version
  );
end;
$$;

create or replace function private.create_command_center_organization_membership(
  p_organization_code text,
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'auth', 'private'
as $$
declare
  v_actor uuid := auth.uid();
  v_admin_role text := private.command_center_admin_role();
  v_organization private.command_center_organizations%rowtype;
  v_membership private.command_center_organization_memberships%rowtype;
  v_role text := lower(btrim(coalesce(p_role, '')));
begin
  if v_actor is null or v_admin_role <> 'owner' then
    raise exception 'command_center_organization_owner_required' using errcode = '42501';
  end if;
  if v_role not in ('organization_owner', 'organization_admin', 'billing_admin', 'analyst', 'member') then
    raise exception 'command_center_organization_membership_role_invalid' using errcode = '22023';
  end if;

  select * into v_organization
  from private.command_center_organizations
  where organization_code = upper(btrim(coalesce(p_organization_code, '')))
  for share;

  if v_organization.id is null then
    raise exception 'command_center_organization_missing' using errcode = 'P0002';
  end if;
  if v_organization.status not in ('draft', 'active') then
    raise exception 'command_center_organization_membership_unavailable' using errcode = '55000';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id and deleted_at is null) then
    raise exception 'command_center_organization_member_user_missing' using errcode = 'P0002';
  end if;

  insert into private.command_center_organization_memberships (
    organization_id,
    user_id,
    role,
    status,
    created_by,
    updated_by
  ) values (
    v_organization.id,
    p_user_id,
    v_role,
    'active',
    v_actor,
    v_actor
  ) returning * into v_membership;

  insert into private.command_center_organization_audit (
    organization_id,
    membership_id,
    actor_user_id,
    subject_user_id,
    action,
    next_status,
    next_role
  ) values (
    v_organization.id,
    v_membership.id,
    v_actor,
    p_user_id,
    'membership_created',
    'active',
    v_membership.role
  );

  return jsonb_build_object(
    'organizationCode', v_organization.organization_code,
    'membershipCode', v_membership.membership_code,
    'memberReference', private.organization_member_reference(p_user_id),
    'role', v_membership.role,
    'status', v_membership.status
  );
exception
  when unique_violation then
    raise exception 'command_center_organization_membership_already_exists' using errcode = '23505';
end;
$$;

create or replace function private.transition_command_center_organization_membership(
  p_membership_code text,
  p_action text,
  p_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'private'
as $$
declare
  v_actor uuid := auth.uid();
  v_admin_role text := private.command_center_admin_role();
  v_membership private.command_center_organization_memberships%rowtype;
  v_organization private.command_center_organizations%rowtype;
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_next_role text := nullif(lower(btrim(coalesce(p_role, ''))), '');
  v_previous_status text;
  v_previous_role text;
  v_audit_action text;
begin
  if v_actor is null or v_admin_role <> 'owner' then
    raise exception 'command_center_organization_owner_required' using errcode = '42501';
  end if;

  select * into v_membership
  from private.command_center_organization_memberships
  where membership_code = upper(btrim(coalesce(p_membership_code, '')))
  for update;

  if v_membership.id is null then
    raise exception 'command_center_organization_membership_missing' using errcode = 'P0002';
  end if;

  select * into v_organization
  from private.command_center_organizations
  where id = v_membership.organization_id
  for share;

  if v_organization.status = 'closed' then
    raise exception 'command_center_organization_membership_unavailable' using errcode = '55000';
  end if;

  v_previous_status := v_membership.status;
  v_previous_role := v_membership.role;

  if v_action = 'change_role' then
    if v_next_role not in ('organization_owner', 'organization_admin', 'billing_admin', 'analyst', 'member') then
      raise exception 'command_center_organization_membership_role_invalid' using errcode = '22023';
    end if;
    if v_membership.status = 'revoked' then
      raise exception 'command_center_organization_membership_transition_invalid' using errcode = '22023';
    end if;
    v_audit_action := 'membership_role_changed';
  elsif v_action = 'suspend' then
    if v_membership.status <> 'active' then
      raise exception 'command_center_organization_membership_transition_invalid' using errcode = '22023';
    end if;
    v_next_role := v_membership.role;
    v_audit_action := 'membership_suspended';
  elsif v_action = 'reactivate' then
    if v_membership.status <> 'suspended' or v_organization.status not in ('draft', 'active') then
      raise exception 'command_center_organization_membership_transition_invalid' using errcode = '22023';
    end if;
    v_next_role := v_membership.role;
    v_audit_action := 'membership_reactivated';
  elsif v_action = 'revoke' then
    if v_membership.status = 'revoked' then
      raise exception 'command_center_organization_membership_transition_invalid' using errcode = '22023';
    end if;
    v_next_role := v_membership.role;
    v_audit_action := 'membership_revoked';
  else
    raise exception 'command_center_organization_membership_action_invalid' using errcode = '22023';
  end if;

  if v_membership.role = 'organization_owner'
     and v_membership.status = 'active'
     and (
       v_action in ('suspend', 'revoke')
       or (v_action = 'change_role' and v_next_role <> 'organization_owner')
     )
     and not exists (
       select 1
       from private.command_center_organization_memberships
       where organization_id = v_membership.organization_id
         and id <> v_membership.id
         and role = 'organization_owner'
         and status = 'active'
     ) then
    raise exception 'command_center_organization_last_owner_required' using errcode = '23514';
  end if;

  update private.command_center_organization_memberships
  set role = case when v_action = 'change_role' then v_next_role else role end,
      status = case
        when v_action = 'suspend' then 'suspended'
        when v_action = 'reactivate' then 'active'
        when v_action = 'revoke' then 'revoked'
        else status
      end,
      suspended_at = case
        when v_action = 'suspend' then now()
        when v_action = 'reactivate' then suspended_at
        else suspended_at
      end,
      revoked_at = case when v_action = 'revoke' then now() else revoked_at end,
      updated_by = v_actor,
      updated_at = now(),
      version = version + 1
  where id = v_membership.id
  returning * into v_membership;

  insert into private.command_center_organization_audit (
    organization_id,
    membership_id,
    actor_user_id,
    subject_user_id,
    action,
    previous_status,
    next_status,
    previous_role,
    next_role
  ) values (
    v_membership.organization_id,
    v_membership.id,
    v_actor,
    v_membership.user_id,
    v_audit_action,
    v_previous_status,
    v_membership.status,
    v_previous_role,
    v_membership.role
  );

  return jsonb_build_object(
    'membershipCode', v_membership.membership_code,
    'memberReference', private.organization_member_reference(v_membership.user_id),
    'role', v_membership.role,
    'status', v_membership.status,
    'version', v_membership.version
  );
end;
$$;

create or replace function private.get_command_center_organization_foundation_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog', 'private'
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_items jsonb := '[]'::jsonb;
begin
  if v_user_id is null or v_role is null then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

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
      count(m.id)::bigint as memberships,
      count(m.id) filter (where m.status = 'active')::bigint as "activeMemberships",
      count(m.id) filter (where m.status = 'active' and m.role = 'organization_owner')::bigint as "activeOwners",
      (
        select count(*)::bigint
        from private.command_center_admin_grants g
        where g.organization_id = o.id
          and g.revoked_at is null
          and (g.expires_at is null or g.expires_at > now())
      ) as "activeAdminGrants"
    from private.command_center_organizations o
    left join private.command_center_organization_memberships m on m.organization_id = o.id
    where private.command_center_has_organization_permission(
      'command-center:organizations:view',
      o.id
    )
    group by o.id
    order by o.display_name
    limit 100
  ) organization_rows;

  return jsonb_build_object(
    'generatedAt', now(),
    'adminRole', v_role,
    'totals', jsonb_build_object(
      'total', (select count(*)::bigint from private.command_center_organizations o where private.command_center_has_organization_permission('command-center:organizations:view', o.id)),
      'draft', (select count(*)::bigint from private.command_center_organizations o where o.status = 'draft' and private.command_center_has_organization_permission('command-center:organizations:view', o.id)),
      'active', (select count(*)::bigint from private.command_center_organizations o where o.status = 'active' and private.command_center_has_organization_permission('command-center:organizations:view', o.id)),
      'suspended', (select count(*)::bigint from private.command_center_organizations o where o.status = 'suspended' and private.command_center_has_organization_permission('command-center:organizations:view', o.id)),
      'closed', (select count(*)::bigint from private.command_center_organizations o where o.status = 'closed' and private.command_center_has_organization_permission('command-center:organizations:view', o.id)),
      'memberships', (
        select count(*)::bigint
        from private.command_center_organization_memberships m
        join private.command_center_organizations o on o.id = m.organization_id
        where private.command_center_has_organization_permission('command-center:organizations:view', o.id)
      ),
      'activeMemberships', (
        select count(*)::bigint
        from private.command_center_organization_memberships m
        join private.command_center_organizations o on o.id = m.organization_id
        where m.status = 'active'
          and private.command_center_has_organization_permission('command-center:organizations:view', o.id)
      ),
      'activeAdminGrants', (
        select count(*)::bigint
        from private.command_center_admin_grants g
        join private.command_center_organizations o on o.id = g.organization_id
        where g.revoked_at is null
          and (g.expires_at is null or g.expires_at > now())
          and private.command_center_has_organization_permission('command-center:organizations:view', o.id)
      )
    ),
    'items', v_items,
    'identityFieldsIncluded', false,
    'directTableAccessEnabled', false
  );
end;
$$;

create or replace function private.grant_command_center_permission(
  p_user_id uuid,
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
set search_path = 'pg_catalog', 'private'
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_grant private.command_center_admin_grants%rowtype;
  v_organization private.command_center_organizations%rowtype;
begin
  if v_actor is null or v_role <> 'owner' then
    raise exception 'command_center_registry_owner_required' using errcode = '42501';
  end if;
  if not exists(select 1 from private.platform_admins where user_id = p_user_id and disabled_at is null) then
    raise exception 'command_center_admin_missing' using errcode = 'P0002';
  end if;
  if coalesce(p_permission_key, '') !~ '^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*){2,4}$' then
    raise exception 'command_center_permission_invalid' using errcode = '22023';
  end if;
  if p_product_key is not null and not exists(select 1 from private.command_center_products where product_key = p_product_key) then
    raise exception 'command_center_product_missing' using errcode = 'P0002';
  end if;
  if p_module_key is not null and not exists(select 1 from private.command_center_modules where product_key = p_product_key and module_key = p_module_key) then
    raise exception 'command_center_module_missing' using errcode = 'P0002';
  end if;
  if p_environment_key is not null and p_environment_key not in ('development', 'preview', 'production') then
    raise exception 'command_center_environment_invalid' using errcode = '22023';
  end if;
  if p_region_key is not null and not exists(select 1 from private.command_center_regions where region_key = p_region_key and active) then
    raise exception 'command_center_region_missing' using errcode = 'P0002';
  end if;
  if p_data_classification is not null and p_data_classification not in ('public', 'internal', 'confidential', 'restricted') then
    raise exception 'command_center_classification_invalid' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'command_center_grant_expiry_invalid' using errcode = '22023';
  end if;

  if p_organization_id is not null then
    select * into v_organization
    from private.command_center_organizations
    where id = p_organization_id;

    if v_organization.id is null then
      raise exception 'command_center_organization_missing' using errcode = 'P0002';
    end if;
    if v_organization.status <> 'active' then
      raise exception 'command_center_organization_grant_unavailable' using errcode = '55000';
    end if;
    if p_region_key is not null and v_organization.region_key is not null and p_region_key <> v_organization.region_key then
      raise exception 'command_center_organization_region_scope_invalid' using errcode = '22023';
    end if;
    if p_data_classification is not null and p_data_classification <> v_organization.data_classification then
      raise exception 'command_center_organization_classification_scope_invalid' using errcode = '22023';
    end if;
  end if;

  insert into private.command_center_admin_grants (
    user_id,
    permission_key,
    product_key,
    module_key,
    environment_key,
    region_key,
    organization_id,
    data_classification,
    granted_by,
    expires_at
  ) values (
    p_user_id,
    p_permission_key,
    p_product_key,
    p_module_key,
    p_environment_key,
    p_region_key,
    p_organization_id,
    p_data_classification,
    v_actor,
    p_expires_at
  ) returning * into v_grant;

  insert into private.command_center_registry_audit (
    actor_user_id,
    subject_user_id,
    grant_id,
    product_key,
    permission_key,
    action,
    next_status
  ) values (
    v_actor,
    p_user_id,
    v_grant.id,
    p_product_key,
    p_permission_key,
    'permission_granted',
    'active'
  );

  if p_organization_id is not null then
    insert into private.command_center_organization_audit (
      organization_id,
      admin_grant_id,
      actor_user_id,
      subject_user_id,
      action,
      next_status
    ) values (
      p_organization_id,
      v_grant.id,
      v_actor,
      p_user_id,
      'organization_admin_permission_granted',
      'active'
    );
  end if;

  return jsonb_build_object(
    'grantCode', v_grant.grant_code,
    'userReference', private.platform_admin_reference(p_user_id),
    'permissionKey', v_grant.permission_key,
    'organizationCode', v_organization.organization_code,
    'expiresAt', v_grant.expires_at
  );
exception
  when unique_violation then
    raise exception 'command_center_grant_already_active' using errcode = '23505';
end;
$$;

create or replace function private.revoke_command_center_permission(p_grant_code text)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'private'
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_grant private.command_center_admin_grants%rowtype;
begin
  if v_actor is null or v_role <> 'owner' then
    raise exception 'command_center_registry_owner_required' using errcode = '42501';
  end if;

  update private.command_center_admin_grants
  set revoked_at = now(), revoked_by = v_actor
  where grant_code = upper(btrim(coalesce(p_grant_code, '')))
    and revoked_at is null
  returning * into v_grant;

  if v_grant.id is null then
    raise exception 'command_center_grant_missing' using errcode = 'P0002';
  end if;

  insert into private.command_center_registry_audit (
    actor_user_id,
    subject_user_id,
    grant_id,
    product_key,
    permission_key,
    action,
    previous_status,
    next_status
  ) values (
    v_actor,
    v_grant.user_id,
    v_grant.id,
    v_grant.product_key,
    v_grant.permission_key,
    'permission_revoked',
    'active',
    'revoked'
  );

  if v_grant.organization_id is not null then
    insert into private.command_center_organization_audit (
      organization_id,
      admin_grant_id,
      actor_user_id,
      subject_user_id,
      action,
      previous_status,
      next_status
    ) values (
      v_grant.organization_id,
      v_grant.id,
      v_actor,
      v_grant.user_id,
      'organization_admin_permission_revoked',
      'active',
      'revoked'
    );
  end if;

  return jsonb_build_object('grantCode', v_grant.grant_code, 'status', 'revoked');
end;
$$;

insert into private.command_center_role_permissions (
  role,
  permission_key,
  product_key,
  module_key,
  environment_key
)
values
  ('owner', 'command-center:organizations:view', 'command-center', 'organizations', null),
  ('owner', 'command-center:organizations:manage', 'command-center', 'organizations', null),
  ('owner', 'command-center:organizations:membership-manage', 'command-center', 'organizations', null),
  ('admin', 'command-center:organizations:view', 'command-center', 'organizations', null),
  ('analyst', 'command-center:organizations:view', 'command-center', 'organizations', null),
  ('support', 'command-center:organizations:view', 'command-center', 'organizations', null)
on conflict do nothing;

create or replace function public.create_command_center_organization(
  p_organization_key text,
  p_display_name text,
  p_owner_user_id uuid,
  p_primary_country_code text default null,
  p_region_key text default null,
  p_data_classification text default 'confidential'
)
returns jsonb
language sql
set search_path = 'pg_catalog', 'private'
as $$
  select private.create_command_center_organization(
    p_organization_key,
    p_display_name,
    p_owner_user_id,
    p_primary_country_code,
    p_region_key,
    p_data_classification
  );
$$;

create or replace function public.transition_command_center_organization(
  p_organization_code text,
  p_action text
)
returns jsonb
language sql
set search_path = 'pg_catalog', 'private'
as $$
  select private.transition_command_center_organization(p_organization_code, p_action);
$$;

create or replace function public.create_command_center_organization_membership(
  p_organization_code text,
  p_user_id uuid,
  p_role text
)
returns jsonb
language sql
set search_path = 'pg_catalog', 'private'
as $$
  select private.create_command_center_organization_membership(p_organization_code, p_user_id, p_role);
$$;

create or replace function public.transition_command_center_organization_membership(
  p_membership_code text,
  p_action text,
  p_role text default null
)
returns jsonb
language sql
set search_path = 'pg_catalog', 'private'
as $$
  select private.transition_command_center_organization_membership(p_membership_code, p_action, p_role);
$$;

create or replace function public.get_command_center_organization_foundation_snapshot()
returns jsonb
language sql
stable
set search_path = 'pg_catalog', 'private'
as $$
  select private.get_command_center_organization_foundation_snapshot();
$$;

revoke all on function private.organization_member_reference(uuid) from public, anon, authenticated;
revoke all on function private.command_center_has_organization_permission(text, uuid) from public, anon, authenticated;
revoke all on function private.create_command_center_organization(text, text, uuid, text, text, text) from public, anon, authenticated;
revoke all on function private.transition_command_center_organization(text, text) from public, anon, authenticated;
revoke all on function private.create_command_center_organization_membership(text, uuid, text) from public, anon, authenticated;
revoke all on function private.transition_command_center_organization_membership(text, text, text) from public, anon, authenticated;
revoke all on function private.get_command_center_organization_foundation_snapshot() from public, anon, authenticated;
revoke all on function private.grant_command_center_permission(uuid, text, text, text, text, text, uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function private.revoke_command_center_permission(text) from public, anon, authenticated;

revoke all on function public.create_command_center_organization(text, text, uuid, text, text, text) from public, anon;
revoke all on function public.transition_command_center_organization(text, text) from public, anon;
revoke all on function public.create_command_center_organization_membership(text, uuid, text) from public, anon;
revoke all on function public.transition_command_center_organization_membership(text, text, text) from public, anon;
revoke all on function public.get_command_center_organization_foundation_snapshot() from public, anon;

grant execute on function public.create_command_center_organization(text, text, uuid, text, text, text) to authenticated;
grant execute on function public.transition_command_center_organization(text, text) to authenticated;
grant execute on function public.create_command_center_organization_membership(text, uuid, text) to authenticated;
grant execute on function public.transition_command_center_organization_membership(text, text, text) to authenticated;
grant execute on function public.get_command_center_organization_foundation_snapshot() to authenticated;
