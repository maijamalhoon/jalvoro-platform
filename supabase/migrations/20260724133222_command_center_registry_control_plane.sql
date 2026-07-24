
begin;

create table if not exists private.command_center_product_families (
  family_key text primary key,
  name text not null,
  description text not null,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint command_center_product_families_key_check check (
    family_key ~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$'
  ),
  constraint command_center_product_families_status_check check (
    status in ('active', 'deprecated', 'retired')
  )
);

create table if not exists private.command_center_products (
  product_key text primary key,
  product_id text not null unique,
  family_key text not null references private.command_center_product_families(family_key),
  category_key text not null,
  name text not null,
  description text not null,
  icon_key text not null,
  lifecycle_status text not null,
  registration_status text not null,
  data_classification text not null,
  retention_days integer not null,
  team_key text not null,
  documentation_reference text not null,
  admin_required_permissions text[] not null default '{}',
  current_manifest_version integer,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  suspended_at timestamptz,
  constraint command_center_products_product_key_check check (
    product_key ~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$'
  ),
  constraint command_center_products_product_id_check check (
    product_id ~ '^prd_[a-z0-9_]{3,64}$'
  ),
  constraint command_center_products_category_key_check check (
    category_key ~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$'
  ),
  constraint command_center_products_lifecycle_check check (
    lifecycle_status in (
      'concept', 'internal_development', 'internal_testing', 'alpha', 'beta',
      'limited_release', 'public_release', 'maintenance', 'deprecated', 'retired'
    )
  ),
  constraint command_center_products_registration_check check (
    registration_status in ('draft', 'validation_pending', 'approved', 'active', 'suspended', 'rejected')
  ),
  constraint command_center_products_classification_check check (
    data_classification in ('public', 'internal', 'confidential', 'restricted')
  ),
  constraint command_center_products_retention_check check (
    retention_days between 1 and 3650
  ),
  constraint command_center_products_documentation_check check (
    documentation_reference ~ '^docs/[a-z0-9][a-z0-9/_.-]*\.md$'
  )
);

create table if not exists private.command_center_applications (
  product_key text not null references private.command_center_products(product_key) on delete cascade,
  application_key text not null,
  application_id text not null unique,
  name text not null,
  platforms text[] not null,
  current_versions text[] not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_key, application_key),
  constraint command_center_applications_key_check check (
    application_key ~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$'
  ),
  constraint command_center_applications_id_check check (
    application_id ~ '^app_[a-z0-9_]{3,64}$'
  )
);

create table if not exists private.command_center_modules (
  product_key text not null references private.command_center_products(product_key) on delete cascade,
  module_key text not null,
  module_id text not null unique,
  name text not null,
  description text not null,
  lifecycle_status text not null,
  enabled boolean not null default true,
  required_permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_key, module_key),
  constraint command_center_modules_key_check check (
    module_key ~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$'
  ),
  constraint command_center_modules_id_check check (
    module_id ~ '^mod_[a-z0-9_]{3,64}$'
  ),
  constraint command_center_modules_lifecycle_check check (
    lifecycle_status in (
      'concept', 'internal_development', 'internal_testing', 'alpha', 'beta',
      'limited_release', 'public_release', 'maintenance', 'deprecated', 'retired'
    )
  )
);

create table if not exists private.command_center_services (
  product_key text not null references private.command_center_products(product_key) on delete cascade,
  service_key text not null,
  created_at timestamptz not null default now(),
  primary key (product_key, service_key),
  constraint command_center_services_key_check check (
    service_key ~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$'
  )
);

create table if not exists private.command_center_environments (
  environment_key text primary key,
  name text not null,
  active boolean not null default true,
  constraint command_center_environments_key_check check (
    environment_key in ('development', 'preview', 'production')
  )
);

create table if not exists private.command_center_regions (
  region_key text primary key,
  name text not null,
  active boolean not null default true,
  constraint command_center_regions_key_check check (
    region_key ~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$'
  )
);

create table if not exists private.command_center_product_environments (
  product_key text not null references private.command_center_products(product_key) on delete cascade,
  environment_key text not null references private.command_center_environments(environment_key),
  primary key (product_key, environment_key)
);

create table if not exists private.command_center_product_regions (
  product_key text not null references private.command_center_products(product_key) on delete cascade,
  region_key text not null references private.command_center_regions(region_key),
  primary key (product_key, region_key)
);

create table if not exists private.command_center_navigation_entries (
  product_key text not null,
  navigation_id text not null,
  module_key text not null,
  label text not null,
  href text not null,
  icon_key text not null,
  display_order integer not null,
  required_permissions text[] not null default '{}',
  environments text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_key, navigation_id),
  foreign key (product_key, module_key)
    references private.command_center_modules(product_key, module_key)
    on delete cascade,
  constraint command_center_navigation_id_check check (
    navigation_id ~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$'
  ),
  constraint command_center_navigation_href_check check (
    href ~ '^/admin(/[a-z0-9][a-z0-9/_-]*)?$'
    and position('?' in href) = 0
    and position('#' in href) = 0
  ),
  constraint command_center_navigation_order_check check (
    display_order between 0 and 100000
  )
);

create table if not exists private.command_center_manifest_versions (
  id uuid primary key default gen_random_uuid(),
  manifest_code text not null unique default (
    'CMF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  ),
  product_key text not null,
  version integer not null,
  schema_version text not null,
  manifest_digest bytea not null,
  manifest jsonb not null,
  validation_status text not null,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  activated_at timestamptz,
  constraint command_center_manifest_code_check check (
    manifest_code ~ '^CMF-[A-F0-9]{12}$'
  ),
  constraint command_center_manifest_product_key_check check (
    product_key ~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$'
  ),
  constraint command_center_manifest_version_check check (
    version > 0
  ),
  constraint command_center_manifest_schema_check check (
    schema_version = '1.0'
  ),
  constraint command_center_manifest_digest_check check (
    octet_length(manifest_digest) = 32
  ),
  constraint command_center_manifest_validation_status_check check (
    validation_status in ('passed', 'failed')
  ),
  unique (product_key, version),
  unique (product_key, manifest_digest)
);

create table if not exists private.command_center_validation_results (
  id bigint generated by default as identity primary key,
  manifest_id uuid not null references private.command_center_manifest_versions(id) on delete cascade,
  status text not null,
  issue_count integer not null,
  issues jsonb not null,
  validator_version text not null default '1.0',
  validated_at timestamptz not null default now(),
  constraint command_center_validation_status_check check (
    status in ('passed', 'failed')
  ),
  constraint command_center_validation_issue_count_check check (
    issue_count >= 0
  ),
  constraint command_center_validation_issues_check check (
    jsonb_typeof(issues) = 'array'
  )
);

create table if not exists private.command_center_approvals (
  id uuid primary key default gen_random_uuid(),
  approval_code text not null unique default (
    'CAP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  ),
  manifest_id uuid not null references private.command_center_manifest_versions(id) on delete cascade,
  status text not null default 'active',
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  consumed_at timestamptz,
  revoked_at timestamptz,
  constraint command_center_approval_code_check check (
    approval_code ~ '^CAP-[A-F0-9]{12}$'
  ),
  constraint command_center_approval_status_check check (
    status in ('active', 'consumed', 'revoked', 'expired')
  ),
  constraint command_center_approval_expiry_check check (
    expires_at > approved_at
    and expires_at <= approved_at + interval '24 hours'
  )
);

create table if not exists private.command_center_role_permissions (
  id bigint generated by default as identity primary key,
  role text not null,
  permission_key text not null,
  product_key text,
  module_key text,
  environment_key text,
  created_at timestamptz not null default now(),
  constraint command_center_role_permissions_role_check check (
    role in ('owner', 'admin', 'analyst', 'support')
  ),
  constraint command_center_role_permissions_permission_check check (
    permission_key ~ '^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*){2,4}$'
  ),
  constraint command_center_role_permissions_environment_check check (
    environment_key is null or environment_key in ('development', 'preview', 'production')
  )
);

create table if not exists private.command_center_admin_grants (
  id uuid primary key default gen_random_uuid(),
  grant_code text not null unique default (
    'CAG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  ),
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_key text not null,
  product_key text,
  module_key text,
  environment_key text,
  region_key text,
  organization_id uuid,
  data_classification text,
  granted_by uuid not null references auth.users(id) on delete restrict,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  constraint command_center_admin_grant_code_check check (
    grant_code ~ '^CAG-[A-F0-9]{12}$'
  ),
  constraint command_center_admin_grant_permission_check check (
    permission_key ~ '^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*){2,4}$'
  ),
  constraint command_center_admin_grant_environment_check check (
    environment_key is null or environment_key in ('development', 'preview', 'production')
  ),
  constraint command_center_admin_grant_classification_check check (
    data_classification is null
    or data_classification in ('public', 'internal', 'confidential', 'restricted')
  ),
  constraint command_center_admin_grant_expiry_check check (
    expires_at is null or expires_at > granted_at
  )
);

create table if not exists private.command_center_registry_audit (
  id bigint generated by default as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  manifest_id uuid references private.command_center_manifest_versions(id) on delete set null,
  approval_id uuid references private.command_center_approvals(id) on delete set null,
  grant_id uuid references private.command_center_admin_grants(id) on delete set null,
  product_key text,
  permission_key text,
  action text not null,
  previous_status text,
  next_status text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 months'),
  constraint command_center_registry_audit_action_check check (
    action in (
      'registry_bootstrapped',
      'manifest_submitted',
      'manifest_validated',
      'manifest_rejected',
      'manifest_approved',
      'manifest_approval_replaced',
      'manifest_activated',
      'product_suspended',
      'permission_granted',
      'permission_revoked'
    )
  ),
  constraint command_center_registry_audit_expiry_check check (
    expires_at > created_at
  )
);

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'command_center_product_families',
    'command_center_products',
    'command_center_applications',
    'command_center_modules',
    'command_center_services',
    'command_center_environments',
    'command_center_regions',
    'command_center_product_environments',
    'command_center_product_regions',
    'command_center_navigation_entries',
    'command_center_manifest_versions',
    'command_center_validation_results',
    'command_center_approvals',
    'command_center_role_permissions',
    'command_center_admin_grants',
    'command_center_registry_audit'
  ]
  loop
    execute format('alter table private.%I enable row level security', v_table);
    execute format('revoke all on table private.%I from public, anon, authenticated', v_table);
    execute format('grant select, insert, update, delete on table private.%I to service_role', v_table);
    execute format('drop policy if exists %I on private.%I', v_table || '_deny_direct', v_table);
    execute format(
      'create policy %I on private.%I for all to anon, authenticated using (false) with check (false)',
      v_table || '_deny_direct',
      v_table
    );
  end loop;
end;
$$;

grant usage, select on sequence private.command_center_validation_results_id_seq
  to service_role;
grant usage, select on sequence private.command_center_role_permissions_id_seq
  to service_role;
grant usage, select on sequence private.command_center_registry_audit_id_seq
  to service_role;

create unique index if not exists command_center_role_permissions_unique_idx
  on private.command_center_role_permissions (
    role,
    permission_key,
    coalesce(product_key, ''),
    coalesce(module_key, ''),
    coalesce(environment_key, '')
  );

create index if not exists command_center_products_family_idx
  on private.command_center_products (family_key, registration_status, lifecycle_status);
create index if not exists command_center_modules_product_enabled_idx
  on private.command_center_modules (product_key, enabled, lifecycle_status);
create index if not exists command_center_navigation_product_order_idx
  on private.command_center_navigation_entries (product_key, display_order, navigation_id);
create index if not exists command_center_manifest_product_version_idx
  on private.command_center_manifest_versions (product_key, version desc);
create index if not exists command_center_manifest_validation_idx
  on private.command_center_manifest_versions (validation_status, submitted_at desc);
create index if not exists command_center_approvals_manifest_status_idx
  on private.command_center_approvals (manifest_id, status, expires_at);
create index if not exists command_center_grants_user_active_idx
  on private.command_center_admin_grants (user_id, permission_key, expires_at)
  where revoked_at is null;
create unique index if not exists command_center_grants_unique_active_idx
  on private.command_center_admin_grants (
    user_id,
    permission_key,
    coalesce(product_key, ''),
    coalesce(module_key, ''),
    coalesce(environment_key, ''),
    coalesce(region_key, ''),
    coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(data_classification, '')
  )
  where revoked_at is null;
create index if not exists command_center_audit_created_idx
  on private.command_center_registry_audit (created_at desc);
create index if not exists command_center_audit_actor_idx
  on private.command_center_registry_audit (actor_user_id, created_at desc)
  where actor_user_id is not null;
create index if not exists command_center_audit_product_idx
  on private.command_center_registry_audit (product_key, created_at desc)
  where product_key is not null;
create index if not exists command_center_audit_expires_idx
  on private.command_center_registry_audit (expires_at);

drop trigger if exists command_center_validation_results_append_only
  on private.command_center_validation_results;
create trigger command_center_validation_results_append_only
before update or delete on private.command_center_validation_results
for each row execute function private.reject_platform_audit_update();

drop trigger if exists command_center_registry_audit_append_only
  on private.command_center_registry_audit;
create trigger command_center_registry_audit_append_only
before update or delete on private.command_center_registry_audit
for each row execute function private.reject_platform_audit_update();

create or replace function private.command_center_admin_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, private
as $$
  select role
  from private.platform_admins
  where user_id = auth.uid()
    and disabled_at is null;
$$;

create or replace function private.validate_command_center_manifest(
  p_manifest jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_issues jsonb := '[]'::jsonb;
  v_item jsonb;
  v_nav jsonb;
  v_key text;
  v_module_key text;
  v_application_keys text[] := '{}';
  v_application_ids text[] := '{}';
  v_module_keys text[] := '{}';
  v_module_ids text[] := '{}';
  v_navigation_ids text[] := '{}';
  v_permission text;
  v_environment text;
begin
  if p_manifest is null or jsonb_typeof(p_manifest) <> 'object' then
    return jsonb_build_object(
      'valid', false,
      'issues', jsonb_build_array(
        jsonb_build_object('path', '$', 'code', 'invalid_manifest')
      )
    );
  end if;

  if p_manifest::text ~* '"(password|token|secret|card_number|cvv|bank_credential|raw_ip|customer_message|finance_content|payroll_content|inventory_content)"[[:space:]]*:' then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('path', '$', 'code', 'forbidden_sensitive_field')
    );
  end if;

  if p_manifest->>'schemaVersion' <> '1.0' then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('path', 'schemaVersion', 'code', 'unsupported_schema_version')
    );
  end if;

  if coalesce(p_manifest->>'productId', '') !~ '^prd_[a-z0-9_]{3,64}$' then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('path', 'productId', 'code', 'invalid_product_id')
    );
  end if;

  foreach v_key in array array['productKey', 'productFamilyKey', 'categoryKey']
  loop
    if coalesce(p_manifest->>v_key, '') !~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$' then
      v_issues := v_issues || jsonb_build_array(
        jsonb_build_object('path', v_key, 'code', 'invalid_key')
      );
    end if;
  end loop;

  foreach v_key in array array['name', 'description', 'iconKey']
  loop
    if char_length(trim(coalesce(p_manifest->>v_key, ''))) = 0 then
      v_issues := v_issues || jsonb_build_array(
        jsonb_build_object('path', v_key, 'code', 'required')
      );
    end if;
  end loop;

  if coalesce(p_manifest->>'lifecycleStatus', '') not in (
    'concept', 'internal_development', 'internal_testing', 'alpha', 'beta',
    'limited_release', 'public_release', 'maintenance', 'deprecated', 'retired'
  ) then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('path', 'lifecycleStatus', 'code', 'invalid_lifecycle_status')
    );
  end if;

  if coalesce(p_manifest->>'registrationStatus', '') not in (
    'draft', 'validation_pending', 'approved', 'active', 'suspended', 'rejected'
  ) then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('path', 'registrationStatus', 'code', 'invalid_registration_status')
    );
  end if;

  if jsonb_typeof(p_manifest->'availability') <> 'object' then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('path', 'availability', 'code', 'invalid_availability')
    );
  else
    if jsonb_typeof(p_manifest#>'{availability,environments}') <> 'array'
      or jsonb_array_length(p_manifest#>'{availability,environments}') = 0 then
      v_issues := v_issues || jsonb_build_array(
        jsonb_build_object('path', 'availability.environments', 'code', 'invalid_environments')
      );
    else
      for v_environment in
        select jsonb_array_elements_text(p_manifest#>'{availability,environments}')
      loop
        if v_environment not in ('development', 'preview', 'production') then
          v_issues := v_issues || jsonb_build_array(
            jsonb_build_object('path', 'availability.environments', 'code', 'invalid_environment')
          );
        end if;
      end loop;
    end if;

    foreach v_key in array array['countries', 'regions', 'currencies', 'languages', 'platforms']
    loop
      if jsonb_typeof(p_manifest#>array['availability', v_key]) <> 'array' then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'availability.' || v_key, 'code', 'invalid_array')
        );
      end if;
    end loop;
  end if;

  if jsonb_typeof(p_manifest->'applications') <> 'array' then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('path', 'applications', 'code', 'invalid_applications')
    );
  else
    for v_item in select value from jsonb_array_elements(p_manifest->'applications')
    loop
      if jsonb_typeof(v_item) <> 'object' then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'applications', 'code', 'invalid_application')
        );
        continue;
      end if;

      if coalesce(v_item->>'applicationId', '') !~ '^app_[a-z0-9_]{3,64}$' then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'applications.applicationId', 'code', 'invalid_application_id')
        );
      elsif v_item->>'applicationId' = any(v_application_ids) then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'applications.applicationId', 'code', 'duplicate_application_id')
        );
      else
        v_application_ids := array_append(v_application_ids, v_item->>'applicationId');
      end if;

      if coalesce(v_item->>'applicationKey', '') !~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$' then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'applications.applicationKey', 'code', 'invalid_key')
        );
      elsif v_item->>'applicationKey' = any(v_application_keys) then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'applications.applicationKey', 'code', 'duplicate_application_key')
        );
      else
        v_application_keys := array_append(v_application_keys, v_item->>'applicationKey');
      end if;

      if char_length(trim(coalesce(v_item->>'name', ''))) = 0
        or jsonb_typeof(v_item->'platforms') <> 'array'
        or jsonb_typeof(v_item->'currentVersions') <> 'array' then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'applications', 'code', 'invalid_application_contract')
        );
      end if;
    end loop;
  end if;

  if jsonb_typeof(p_manifest->'modules') <> 'array'
    or jsonb_array_length(p_manifest->'modules') = 0 then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('path', 'modules', 'code', 'invalid_modules')
    );
  else
    for v_item in select value from jsonb_array_elements(p_manifest->'modules')
    loop
      if jsonb_typeof(v_item) <> 'object' then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'modules', 'code', 'invalid_module')
        );
        continue;
      end if;

      if coalesce(v_item->>'moduleId', '') !~ '^mod_[a-z0-9_]{3,64}$' then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'modules.moduleId', 'code', 'invalid_module_id')
        );
      elsif v_item->>'moduleId' = any(v_module_ids) then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'modules.moduleId', 'code', 'duplicate_module_id')
        );
      else
        v_module_ids := array_append(v_module_ids, v_item->>'moduleId');
      end if;

      v_module_key := v_item->>'moduleKey';
      if coalesce(v_module_key, '') !~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$' then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'modules.moduleKey', 'code', 'invalid_key')
        );
      elsif v_module_key = any(v_module_keys) then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'modules.moduleKey', 'code', 'duplicate_module_key')
        );
      else
        v_module_keys := array_append(v_module_keys, v_module_key);
      end if;

      if jsonb_typeof(v_item->'requiredPermissions') <> 'array' then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'modules.requiredPermissions', 'code', 'invalid_permissions')
        );
      else
        for v_permission in select jsonb_array_elements_text(v_item->'requiredPermissions')
        loop
          if v_permission !~ '^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*){2,4}$' then
            v_issues := v_issues || jsonb_build_array(
              jsonb_build_object('path', 'modules.requiredPermissions', 'code', 'invalid_permission')
            );
          end if;
        end loop;
      end if;
    end loop;
  end if;

  if jsonb_typeof(p_manifest->'admin') <> 'object'
    or jsonb_typeof(p_manifest#>'{admin,navigation}') <> 'array'
    or jsonb_typeof(p_manifest#>'{admin,requiredPermissions}') <> 'array' then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('path', 'admin', 'code', 'invalid_admin_contract')
    );
  else
    for v_permission in
      select jsonb_array_elements_text(p_manifest#>'{admin,requiredPermissions}')
    loop
      if v_permission !~ '^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*){2,4}$' then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'admin.requiredPermissions', 'code', 'invalid_permission')
        );
      end if;
    end loop;

    for v_nav in select value from jsonb_array_elements(p_manifest#>'{admin,navigation}')
    loop
      v_key := v_nav->>'navigationId';
      if coalesce(v_key, '') !~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$' then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'admin.navigation.navigationId', 'code', 'invalid_navigation_id')
        );
      elsif v_key = any(v_navigation_ids) then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'admin.navigation.navigationId', 'code', 'duplicate_navigation_id')
        );
      else
        v_navigation_ids := array_append(v_navigation_ids, v_key);
      end if;

      if coalesce(v_nav->>'href', '') !~ '^/admin(/[a-z0-9][a-z0-9/_-]*)?$'
        or position('?' in coalesce(v_nav->>'href', '')) > 0
        or position('#' in coalesce(v_nav->>'href', '')) > 0 then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'admin.navigation.href', 'code', 'unsafe_route')
        );
      end if;

      if not (coalesce(v_nav->>'moduleKey', '') = any(v_module_keys)) then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'admin.navigation.moduleKey', 'code', 'unknown_module')
        );
      end if;

      if jsonb_typeof(v_nav->'requiredPermissions') <> 'array'
        or jsonb_typeof(v_nav->'environments') <> 'array'
        or jsonb_typeof(v_nav->'order') <> 'number' then
        v_issues := v_issues || jsonb_build_array(
          jsonb_build_object('path', 'admin.navigation', 'code', 'invalid_navigation_contract')
        );
      end if;
    end loop;
  end if;

  if jsonb_typeof(p_manifest->'dataGovernance') <> 'object'
    or coalesce(p_manifest#>>'{dataGovernance,classification}', '') not in (
      'public', 'internal', 'confidential', 'restricted'
    )
    or coalesce((p_manifest#>>'{dataGovernance,retentionDays}')::integer, 0) not between 1 and 3650
    or jsonb_typeof(p_manifest#>'{dataGovernance,residencyRegionKeys}') <> 'array' then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('path', 'dataGovernance', 'code', 'invalid_data_governance')
    );
  end if;

  if jsonb_typeof(p_manifest->'ownership') <> 'object'
    or coalesce(p_manifest#>>'{ownership,teamKey}', '') !~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$'
    or coalesce(p_manifest#>>'{ownership,documentationReference}', '') !~ '^docs/[a-z0-9][a-z0-9/_.-]*\.md$' then
    v_issues := v_issues || jsonb_build_array(
      jsonb_build_object('path', 'ownership', 'code', 'invalid_ownership')
    );
  end if;

  foreach v_key in array array[
    'serviceDependencies',
    'subscriptionPlanKeys',
    'analyticsMetricKeys',
    'eventSchemaKeys',
    'healthCheckKeys',
    'errorSourceKeys',
    'featureFlagKeys',
    'supportCategoryKeys',
    'securityPolicyKeys'
  ]
  loop
    if jsonb_typeof(p_manifest->v_key) <> 'array' then
      v_issues := v_issues || jsonb_build_array(
        jsonb_build_object('path', v_key, 'code', 'invalid_reference_array')
      );
    end if;
  end loop;

  return jsonb_build_object(
    'valid', jsonb_array_length(v_issues) = 0,
    'issues', v_issues
  );
exception
  when invalid_text_representation then
    return jsonb_build_object(
      'valid', false,
      'issues', jsonb_build_array(
        jsonb_build_object('path', 'dataGovernance.retentionDays', 'code', 'invalid_retention')
      )
    );
end;
$$;

create or replace function private.submit_command_center_manifest(
  p_manifest jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, private, extensions
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_validation jsonb;
  v_product_key text;
  v_version integer;
  v_manifest private.command_center_manifest_versions%rowtype;
begin
  if v_actor is null or v_role not in ('owner', 'admin') then
    raise exception 'command_center_registry_submit_forbidden' using errcode = '42501';
  end if;

  v_product_key := p_manifest->>'productKey';
  if coalesce(v_product_key, '') !~ '^[a-z][a-z0-9]*([_-][a-z0-9]+)*$' then
    raise exception 'command_center_product_key_invalid' using errcode = '22023';
  end if;

  v_validation := private.validate_command_center_manifest(p_manifest);

  select coalesce(max(version), 0) + 1
  into v_version
  from private.command_center_manifest_versions
  where product_key = v_product_key;

  insert into private.command_center_manifest_versions (
    product_key,
    version,
    schema_version,
    manifest_digest,
    manifest,
    validation_status,
    submitted_by
  ) values (
    v_product_key,
    v_version,
    '1.0',
    extensions.digest(convert_to(p_manifest::text, 'UTF8'), 'sha256'),
    p_manifest,
    case when (v_validation->>'valid')::boolean then 'passed' else 'failed' end,
    v_actor
  )
  returning * into v_manifest;

  insert into private.command_center_validation_results (
    manifest_id,
    status,
    issue_count,
    issues
  ) values (
    v_manifest.id,
    v_manifest.validation_status,
    jsonb_array_length(v_validation->'issues'),
    v_validation->'issues'
  );

  insert into private.command_center_registry_audit (
    actor_user_id,
    manifest_id,
    product_key,
    action,
    next_status
  ) values (
    v_actor,
    v_manifest.id,
    v_product_key,
    'manifest_submitted',
    v_manifest.validation_status
  );

  insert into private.command_center_registry_audit (
    actor_user_id,
    manifest_id,
    product_key,
    action,
    next_status
  ) values (
    v_actor,
    v_manifest.id,
    v_product_key,
    case when v_manifest.validation_status = 'passed'
      then 'manifest_validated'
      else 'manifest_rejected'
    end,
    v_manifest.validation_status
  );

  return jsonb_build_object(
    'manifestCode', v_manifest.manifest_code,
    'productKey', v_manifest.product_key,
    'version', v_manifest.version,
    'valid', (v_validation->>'valid')::boolean,
    'issues', v_validation->'issues'
  );
end;
$$;

create or replace function private.approve_command_center_manifest(
  p_manifest_code text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_manifest private.command_center_manifest_versions%rowtype;
  v_approval private.command_center_approvals%rowtype;
  v_replaced integer := 0;
begin
  if v_actor is null or v_role <> 'owner' then
    raise exception 'command_center_registry_owner_required' using errcode = '42501';
  end if;

  update private.command_center_approvals
  set status = 'expired'
  where status = 'active' and expires_at <= now();

  select * into v_manifest
  from private.command_center_manifest_versions
  where manifest_code = upper(trim(coalesce(p_manifest_code, '')))
    and validation_status = 'passed'
    and activated_at is null;

  if v_manifest.id is null then
    raise exception 'command_center_manifest_not_approvable' using errcode = 'P0002';
  end if;

  update private.command_center_approvals a
  set status = 'revoked', revoked_at = now()
  from private.command_center_manifest_versions m
  where a.manifest_id = m.id
    and m.product_key = v_manifest.product_key
    and a.status = 'active';
  get diagnostics v_replaced = row_count;

  insert into private.command_center_approvals (
    manifest_id,
    approved_by
  ) values (
    v_manifest.id,
    v_actor
  ) returning * into v_approval;

  insert into private.command_center_registry_audit (
    actor_user_id,
    manifest_id,
    approval_id,
    product_key,
    action,
    previous_status,
    next_status
  ) values (
    v_actor,
    v_manifest.id,
    v_approval.id,
    v_manifest.product_key,
    case when v_replaced > 0
      then 'manifest_approval_replaced'
      else 'manifest_approved'
    end,
    case when v_replaced > 0 then 'active' else null end,
    'active'
  );

  return jsonb_build_object(
    'approvalCode', v_approval.approval_code,
    'manifestCode', v_manifest.manifest_code,
    'expiresAt', v_approval.expires_at
  );
end;
$$;

create or replace function private.activate_command_center_manifest(
  p_approval_code text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, private, extensions
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_manifest private.command_center_manifest_versions%rowtype;
  v_approval private.command_center_approvals%rowtype;
  v_validation jsonb;
  v_data jsonb;
  v_item jsonb;
  v_product_key text;
  v_family_key text;
  v_environment text;
  v_region text;
  v_service text;
begin
  if v_actor is null or v_role <> 'owner' then
    raise exception 'command_center_registry_owner_required' using errcode = '42501';
  end if;

  update private.command_center_approvals
  set status = 'expired'
  where status = 'active' and expires_at <= now();

  select * into v_approval
  from private.command_center_approvals
  where approval_code = upper(trim(coalesce(p_approval_code, '')))
    and status = 'active'
    and expires_at > now();

  if v_approval.id is not null then
    select * into v_manifest
    from private.command_center_manifest_versions
    where id = v_approval.manifest_id
      and validation_status = 'passed'
      and activated_at is null;
  end if;

  if v_approval.id is null or v_manifest.id is null then
    raise exception 'command_center_approval_not_active' using errcode = 'P0002';
  end if;

  if v_manifest.manifest_digest <>
    extensions.digest(convert_to(v_manifest.manifest::text, 'UTF8'), 'sha256') then
    raise exception 'command_center_manifest_digest_mismatch' using errcode = '55000';
  end if;

  v_validation := private.validate_command_center_manifest(v_manifest.manifest);
  if not (v_validation->>'valid')::boolean then
    raise exception 'command_center_manifest_validation_stale' using errcode = '55000';
  end if;

  v_data := v_manifest.manifest;
  v_product_key := v_data->>'productKey';
  v_family_key := v_data->>'productFamilyKey';

  insert into private.command_center_product_families (
    family_key,
    name,
    description,
    created_by,
    updated_by
  ) values (
    v_family_key,
    initcap(replace(v_family_key, '-', ' ')),
    'Registered JALVORO product family.',
    v_actor,
    v_actor
  )
  on conflict (family_key) do update
  set updated_by = excluded.updated_by,
      updated_at = now();

  insert into private.command_center_products (
    product_key,
    product_id,
    family_key,
    category_key,
    name,
    description,
    icon_key,
    lifecycle_status,
    registration_status,
    data_classification,
    retention_days,
    team_key,
    documentation_reference,
    admin_required_permissions,
    current_manifest_version,
    created_by,
    updated_by,
    activated_at,
    suspended_at
  ) values (
    v_product_key,
    v_data->>'productId',
    v_family_key,
    v_data->>'categoryKey',
    v_data->>'name',
    v_data->>'description',
    v_data->>'iconKey',
    v_data->>'lifecycleStatus',
    'active',
    v_data#>>'{dataGovernance,classification}',
    (v_data#>>'{dataGovernance,retentionDays}')::integer,
    v_data#>>'{ownership,teamKey}',
    v_data#>>'{ownership,documentationReference}',
    array(
      select jsonb_array_elements_text(v_data#>'{admin,requiredPermissions}')
    ),
    v_manifest.version,
    v_actor,
    v_actor,
    now(),
    null
  )
  on conflict (product_key) do update
  set product_id = excluded.product_id,
      family_key = excluded.family_key,
      category_key = excluded.category_key,
      name = excluded.name,
      description = excluded.description,
      icon_key = excluded.icon_key,
      lifecycle_status = excluded.lifecycle_status,
      registration_status = 'active',
      data_classification = excluded.data_classification,
      retention_days = excluded.retention_days,
      team_key = excluded.team_key,
      documentation_reference = excluded.documentation_reference,
      admin_required_permissions = excluded.admin_required_permissions,
      current_manifest_version = excluded.current_manifest_version,
      updated_by = excluded.updated_by,
      updated_at = now(),
      activated_at = now(),
      suspended_at = null;

  delete from private.command_center_applications where product_key = v_product_key;
  delete from private.command_center_navigation_entries where product_key = v_product_key;
  delete from private.command_center_modules where product_key = v_product_key;
  delete from private.command_center_services where product_key = v_product_key;
  delete from private.command_center_product_environments where product_key = v_product_key;
  delete from private.command_center_product_regions where product_key = v_product_key;

  for v_item in select value from jsonb_array_elements(v_data->'applications')
  loop
    insert into private.command_center_applications (
      product_key,
      application_key,
      application_id,
      name,
      platforms,
      current_versions
    ) values (
      v_product_key,
      v_item->>'applicationKey',
      v_item->>'applicationId',
      v_item->>'name',
      array(select jsonb_array_elements_text(v_item->'platforms')),
      array(select jsonb_array_elements_text(v_item->'currentVersions'))
    );
  end loop;

  for v_item in select value from jsonb_array_elements(v_data->'modules')
  loop
    insert into private.command_center_modules (
      product_key,
      module_key,
      module_id,
      name,
      description,
      lifecycle_status,
      enabled,
      required_permissions
    ) values (
      v_product_key,
      v_item->>'moduleKey',
      v_item->>'moduleId',
      v_item->>'name',
      v_item->>'description',
      v_item->>'lifecycleStatus',
      (v_item->>'enabled')::boolean,
      array(select jsonb_array_elements_text(v_item->'requiredPermissions'))
    );
  end loop;

  for v_item in select value from jsonb_array_elements(v_data#>'{admin,navigation}')
  loop
    insert into private.command_center_navigation_entries (
      product_key,
      navigation_id,
      module_key,
      label,
      href,
      icon_key,
      display_order,
      required_permissions,
      environments
    ) values (
      v_product_key,
      v_item->>'navigationId',
      v_item->>'moduleKey',
      v_item->>'label',
      v_item->>'href',
      v_item->>'iconKey',
      (v_item->>'order')::integer,
      array(select jsonb_array_elements_text(v_item->'requiredPermissions')),
      array(select jsonb_array_elements_text(v_item->'environments'))
    );
  end loop;

  for v_service in select jsonb_array_elements_text(v_data->'serviceDependencies')
  loop
    insert into private.command_center_services (product_key, service_key)
    values (v_product_key, v_service);
  end loop;

  for v_environment in
    select jsonb_array_elements_text(v_data#>'{availability,environments}')
  loop
    insert into private.command_center_environments (environment_key, name)
    values (v_environment, initcap(v_environment))
    on conflict (environment_key) do update set active = true;

    insert into private.command_center_product_environments (
      product_key,
      environment_key
    ) values (
      v_product_key,
      v_environment
    );
  end loop;

  for v_region in
    select jsonb_array_elements_text(v_data#>'{availability,regions}')
  loop
    insert into private.command_center_regions (region_key, name)
    values (v_region, initcap(replace(v_region, '-', ' ')))
    on conflict (region_key) do update set active = true;

    insert into private.command_center_product_regions (
      product_key,
      region_key
    ) values (
      v_product_key,
      v_region
    );
  end loop;

  update private.command_center_manifest_versions
  set activated_at = now()
  where id = v_manifest.id;

  update private.command_center_approvals
  set status = 'consumed', consumed_at = now()
  where id = v_approval.id;

  insert into private.command_center_registry_audit (
    actor_user_id,
    manifest_id,
    approval_id,
    product_key,
    action,
    previous_status,
    next_status
  ) values (
    v_actor,
    v_manifest.id,
    v_approval.id,
    v_product_key,
    'manifest_activated',
    'approved',
    'active'
  );

  return jsonb_build_object(
    'productKey', v_product_key,
    'manifestCode', v_manifest.manifest_code,
    'version', v_manifest.version,
    'status', 'active'
  );
end;
$$;

create or replace function private.suspend_command_center_product(
  p_product_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_previous text;
begin
  if v_actor is null or v_role <> 'owner' then
    raise exception 'command_center_registry_owner_required' using errcode = '42501';
  end if;

  select registration_status into v_previous
  from private.command_center_products
  where product_key = p_product_key
  for update;

  if v_previous is null then
    raise exception 'command_center_product_missing' using errcode = 'P0002';
  end if;

  update private.command_center_products
  set registration_status = 'suspended',
      suspended_at = now(),
      updated_by = v_actor,
      updated_at = now()
  where product_key = p_product_key;

  insert into private.command_center_registry_audit (
    actor_user_id,
    product_key,
    action,
    previous_status,
    next_status
  ) values (
    v_actor,
    p_product_key,
    'product_suspended',
    v_previous,
    'suspended'
  );

  return jsonb_build_object(
    'productKey', p_product_key,
    'status', 'suspended'
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
set search_path = pg_catalog, private
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_grant private.command_center_admin_grants%rowtype;
begin
  if v_actor is null or v_role <> 'owner' then
    raise exception 'command_center_registry_owner_required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from private.platform_admins
    where user_id = p_user_id and disabled_at is null
  ) then
    raise exception 'command_center_admin_missing' using errcode = 'P0002';
  end if;

  if coalesce(p_permission_key, '') !~ '^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*){2,4}$' then
    raise exception 'command_center_permission_invalid' using errcode = '22023';
  end if;

  if p_product_key is not null and not exists (
    select 1 from private.command_center_products
    where product_key = p_product_key
  ) then
    raise exception 'command_center_product_missing' using errcode = 'P0002';
  end if;

  if p_module_key is not null and not exists (
    select 1 from private.command_center_modules
    where product_key = p_product_key and module_key = p_module_key
  ) then
    raise exception 'command_center_module_missing' using errcode = 'P0002';
  end if;

  if p_environment_key is not null
    and p_environment_key not in ('development', 'preview', 'production') then
    raise exception 'command_center_environment_invalid' using errcode = '22023';
  end if;

  if p_region_key is not null and not exists (
    select 1 from private.command_center_regions
    where region_key = p_region_key and active
  ) then
    raise exception 'command_center_region_missing' using errcode = 'P0002';
  end if;

  if p_data_classification is not null and p_data_classification not in (
    'public', 'internal', 'confidential', 'restricted'
  ) then
    raise exception 'command_center_classification_invalid' using errcode = '22023';
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'command_center_grant_expiry_invalid' using errcode = '22023';
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
  )
  returning * into v_grant;

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

  return jsonb_build_object(
    'grantCode', v_grant.grant_code,
    'userReference', private.platform_admin_reference(p_user_id),
    'permissionKey', v_grant.permission_key,
    'expiresAt', v_grant.expires_at
  );
exception
  when unique_violation then
    raise exception 'command_center_grant_already_active' using errcode = '23505';
end;
$$;

create or replace function private.revoke_command_center_permission(
  p_grant_code text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, private
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
  where grant_code = upper(trim(coalesce(p_grant_code, '')))
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

  return jsonb_build_object(
    'grantCode', v_grant.grant_code,
    'status', 'revoked'
  );
end;
$$;

create or replace function private.get_command_center_navigation(
  p_environment text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text := private.command_center_admin_role();
  v_navigation jsonb;
begin
  if v_user_id is null or v_role is null then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

  if p_environment not in ('development', 'preview', 'production') then
    raise exception 'command_center_environment_invalid' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'productKey', p.product_key,
        'productName', p.name,
        'navigationId', n.navigation_id,
        'moduleKey', n.module_key,
        'label', n.label,
        'href', n.href,
        'iconKey', n.icon_key,
        'order', n.display_order
      )
      order by n.display_order, p.name, n.label
    ),
    '[]'::jsonb
  )
  into v_navigation
  from private.command_center_navigation_entries n
  join private.command_center_products p
    on p.product_key = n.product_key
  join private.command_center_modules m
    on m.product_key = n.product_key
   and m.module_key = n.module_key
  join private.command_center_product_environments pe
    on pe.product_key = p.product_key
   and pe.environment_key = p_environment
  where p.registration_status = 'active'
    and p.lifecycle_status in (
      'limited_release', 'public_release', 'maintenance', 'deprecated'
    )
    and m.enabled
    and m.lifecycle_status in (
      'limited_release', 'public_release', 'maintenance', 'deprecated'
    )
    and p_environment = any(n.environments)
    and not exists (
      select 1
      from unnest(
        p.admin_required_permissions
        || m.required_permissions
        || n.required_permissions
      ) required(permission_key)
      where not exists (
        select 1
        from private.command_center_role_permissions rp
        where rp.role = v_role
          and rp.permission_key = required.permission_key
          and (rp.product_key is null or rp.product_key = p.product_key)
          and (rp.module_key is null or rp.module_key = m.module_key)
          and (rp.environment_key is null or rp.environment_key = p_environment)
        union all
        select 1
        from private.command_center_admin_grants g
        where g.user_id = v_user_id
          and g.permission_key = required.permission_key
          and g.revoked_at is null
          and (g.expires_at is null or g.expires_at > now())
          and (g.product_key is null or g.product_key = p.product_key)
          and (g.module_key is null or g.module_key = m.module_key)
          and (g.environment_key is null or g.environment_key = p_environment)
          and g.region_key is null
          and g.organization_id is null
          and (
            g.data_classification is null
            or g.data_classification = p.data_classification
          )
      )
    );

  return v_navigation;
end;
$$;

create or replace function private.get_command_center_registry_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text := private.command_center_admin_role();
begin
  if v_user_id is null or v_role not in ('owner', 'admin') then
    raise exception 'command_center_registry_access_required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'adminRole', v_role,
    'products', jsonb_build_object(
      'total', (select count(*) from private.command_center_products),
      'active', (select count(*) from private.command_center_products where registration_status = 'active'),
      'suspended', (select count(*) from private.command_center_products where registration_status = 'suspended')
    ),
    'manifests', jsonb_build_object(
      'submitted', (select count(*) from private.command_center_manifest_versions),
      'passed', (select count(*) from private.command_center_manifest_versions where validation_status = 'passed'),
      'failed', (select count(*) from private.command_center_manifest_versions where validation_status = 'failed'),
      'pendingActivation', (
        select count(*)
        from private.command_center_manifest_versions
        where validation_status = 'passed' and activated_at is null
      )
    ),
    'approvals', jsonb_build_object(
      'active', (
        select count(*)
        from private.command_center_approvals
        where status = 'active' and expires_at > now()
      )
    ),
    'grants', jsonb_build_object(
      'active', (
        select count(*)
        from private.command_center_admin_grants
        where revoked_at is null and (expires_at is null or expires_at > now())
      )
    ),
    'auditEvents30d', (
      select count(*)
      from private.command_center_registry_audit
      where created_at >= now() - interval '30 days'
    )
  );
end;
$$;

create or replace function public.get_command_center_navigation(
  p_environment text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.get_command_center_navigation(p_environment);
$$;

create or replace function public.get_command_center_registry_snapshot()
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.get_command_center_registry_snapshot();
$$;

create or replace function public.submit_command_center_manifest(
  p_manifest jsonb
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.submit_command_center_manifest(p_manifest);
$$;

create or replace function public.approve_command_center_manifest(
  p_manifest_code text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.approve_command_center_manifest(p_manifest_code);
$$;

create or replace function public.activate_command_center_manifest(
  p_approval_code text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.activate_command_center_manifest(p_approval_code);
$$;

create or replace function public.suspend_command_center_product(
  p_product_key text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.suspend_command_center_product(p_product_key);
$$;

create or replace function public.grant_command_center_permission(
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
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.grant_command_center_permission(
    p_user_id,
    p_permission_key,
    p_product_key,
    p_module_key,
    p_environment_key,
    p_region_key,
    p_organization_id,
    p_data_classification,
    p_expires_at
  );
$$;

create or replace function public.revoke_command_center_permission(
  p_grant_code text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, private
as $$
  select private.revoke_command_center_permission(p_grant_code);
$$;

do $$
declare
  v_signature regprocedure;
begin
  foreach v_signature in array array[
    'private.command_center_admin_role()'::regprocedure,
    'private.validate_command_center_manifest(jsonb)'::regprocedure,
    'private.submit_command_center_manifest(jsonb)'::regprocedure,
    'private.approve_command_center_manifest(text)'::regprocedure,
    'private.activate_command_center_manifest(text)'::regprocedure,
    'private.suspend_command_center_product(text)'::regprocedure,
    'private.grant_command_center_permission(uuid,text,text,text,text,text,uuid,text,timestamptz)'::regprocedure,
    'private.revoke_command_center_permission(text)'::regprocedure,
    'private.get_command_center_navigation(text)'::regprocedure,
    'private.get_command_center_registry_snapshot()'::regprocedure,
    'public.get_command_center_navigation(text)'::regprocedure,
    'public.get_command_center_registry_snapshot()'::regprocedure,
    'public.submit_command_center_manifest(jsonb)'::regprocedure,
    'public.approve_command_center_manifest(text)'::regprocedure,
    'public.activate_command_center_manifest(text)'::regprocedure,
    'public.suspend_command_center_product(text)'::regprocedure,
    'public.grant_command_center_permission(uuid,text,text,text,text,text,uuid,text,timestamptz)'::regprocedure,
    'public.revoke_command_center_permission(text)'::regprocedure
  ]
  loop
    execute format('revoke all on function %s from public, anon', v_signature);
    execute format('grant execute on function %s to authenticated, service_role', v_signature);
  end loop;
end;
$$;

insert into private.command_center_environments (environment_key, name)
values
  ('development', 'Development'),
  ('preview', 'Preview'),
  ('production', 'Production')
on conflict (environment_key) do update
set name = excluded.name, active = true;

insert into private.command_center_regions (region_key, name)
values ('global', 'Global')
on conflict (region_key) do update
set name = excluded.name, active = true;

insert into private.command_center_product_families (
  family_key,
  name,
  description
) values (
  'jalvoro-platform',
  'JALVORO Platform',
  'Shared JALVORO platform and internal operational systems.'
)
on conflict (family_key) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = now();

insert into private.command_center_products (
  product_key,
  product_id,
  family_key,
  category_key,
  name,
  description,
  icon_key,
  lifecycle_status,
  registration_status,
  data_classification,
  retention_days,
  team_key,
  documentation_reference,
  admin_required_permissions,
  current_manifest_version,
  activated_at
) values (
  'command-center',
  'prd_command_center',
  'jalvoro-platform',
  'internal-operations',
  'JALVORO Command Center',
  'Central internal administration, analytics, observability, security, billing, support, governance, configuration, and operational-control platform for the JALVORO ecosystem.',
  'jalvoro-shield-money',
  'public_release',
  'active',
  'restricted',
  730,
  'platform-operations',
  'docs/jalvoro-command-center-registry.md',
  array['command-center:platform:view'],
  1,
  now()
)
on conflict (product_key) do update
set product_id = excluded.product_id,
    family_key = excluded.family_key,
    category_key = excluded.category_key,
    name = excluded.name,
    description = excluded.description,
    icon_key = excluded.icon_key,
    lifecycle_status = excluded.lifecycle_status,
    registration_status = excluded.registration_status,
    data_classification = excluded.data_classification,
    retention_days = excluded.retention_days,
    team_key = excluded.team_key,
    documentation_reference = excluded.documentation_reference,
    admin_required_permissions = excluded.admin_required_permissions,
    current_manifest_version = excluded.current_manifest_version,
    activated_at = coalesce(private.command_center_products.activated_at, now()),
    suspended_at = null,
    updated_at = now();

insert into private.command_center_applications (
  product_key,
  application_key,
  application_id,
  name,
  platforms,
  current_versions
) values (
  'command-center',
  'command-center-web',
  'app_command_center_web',
  'JALVORO Command Center Web',
  array['web'],
  array['current']
)
on conflict (product_key, application_key) do update
set application_id = excluded.application_id,
    name = excluded.name,
    platforms = excluded.platforms,
    current_versions = excluded.current_versions,
    enabled = true,
    updated_at = now();

insert into private.command_center_modules (
  product_key,
  module_key,
  module_id,
  name,
  description,
  lifecycle_status,
  enabled,
  required_permissions
) values
  (
    'command-center',
    'global-overview',
    'mod_global_overview',
    'Global Overview',
    'Privacy-safe ecosystem, billing, user, security, incident, compliance, and release operations overview.',
    'public_release',
    true,
    array['command-center:overview:view']
  ),
  (
    'command-center',
    'icon-system',
    'mod_icon_system',
    'JALVORO Icon System',
    'Internal inspection surface for the official JALVORO icon scheme.',
    'public_release',
    true,
    array['command-center:icons:view']
  )
on conflict (product_key, module_key) do update
set module_id = excluded.module_id,
    name = excluded.name,
    description = excluded.description,
    lifecycle_status = excluded.lifecycle_status,
    enabled = excluded.enabled,
    required_permissions = excluded.required_permissions,
    updated_at = now();

insert into private.command_center_services (product_key, service_key)
values ('command-center', 'supabase-admin-snapshot')
on conflict do nothing;

insert into private.command_center_product_environments (
  product_key,
  environment_key
) values
  ('command-center', 'development'),
  ('command-center', 'preview'),
  ('command-center', 'production')
on conflict do nothing;

insert into private.command_center_product_regions (
  product_key,
  region_key
) values ('command-center', 'global')
on conflict do nothing;

insert into private.command_center_navigation_entries (
  product_key,
  navigation_id,
  module_key,
  label,
  href,
  icon_key,
  display_order,
  required_permissions,
  environments
) values
  (
    'command-center',
    'global-overview',
    'global-overview',
    'Global Overview',
    '/admin',
    'dashboard',
    10,
    array['command-center:overview:view'],
    array['development', 'preview', 'production']
  ),
  (
    'command-center',
    'icon-system',
    'icon-system',
    'Icon System',
    '/admin/icon-system',
    'grid',
    900,
    array['command-center:icons:view'],
    array['development', 'preview', 'production']
  )
on conflict (product_key, navigation_id) do update
set module_key = excluded.module_key,
    label = excluded.label,
    href = excluded.href,
    icon_key = excluded.icon_key,
    display_order = excluded.display_order,
    required_permissions = excluded.required_permissions,
    environments = excluded.environments,
    updated_at = now();


with bootstrap_manifest as (
  select jsonb_build_object(
    'schemaVersion', '1.0',
    'productId', 'prd_command_center',
    'productKey', 'command-center',
    'productFamilyKey', 'jalvoro-platform',
    'categoryKey', 'internal-operations',
    'name', 'JALVORO Command Center',
    'description', 'Central internal administration, analytics, observability, security, billing, support, governance, configuration, and operational-control platform for the JALVORO ecosystem.',
    'iconKey', 'jalvoro-shield-money',
    'lifecycleStatus', 'public_release',
    'registrationStatus', 'active',
    'availability', jsonb_build_object(
      'environments', jsonb_build_array('development', 'preview', 'production'),
      'countries', jsonb_build_array('*'),
      'regions', jsonb_build_array('global'),
      'currencies', jsonb_build_array('*'),
      'languages', jsonb_build_array('*'),
      'platforms', jsonb_build_array('web')
    ),
    'applications', jsonb_build_array(
      jsonb_build_object(
        'applicationId', 'app_command_center_web',
        'applicationKey', 'command-center-web',
        'name', 'JALVORO Command Center Web',
        'platforms', jsonb_build_array('web'),
        'currentVersions', jsonb_build_array('current')
      )
    ),
    'modules', jsonb_build_array(
      jsonb_build_object(
        'moduleId', 'mod_global_overview',
        'moduleKey', 'global-overview',
        'name', 'Global Overview',
        'description', 'Privacy-safe ecosystem, billing, user, security, incident, compliance, and release operations overview.',
        'lifecycleStatus', 'public_release',
        'enabled', true,
        'requiredPermissions', jsonb_build_array('command-center:overview:view')
      ),
      jsonb_build_object(
        'moduleId', 'mod_icon_system',
        'moduleKey', 'icon-system',
        'name', 'JALVORO Icon System',
        'description', 'Internal inspection surface for the official JALVORO icon scheme.',
        'lifecycleStatus', 'public_release',
        'enabled', true,
        'requiredPermissions', jsonb_build_array('command-center:icons:view')
      )
    ),
    'serviceDependencies', jsonb_build_array('supabase-admin-snapshot'),
    'subscriptionPlanKeys', '[]'::jsonb,
    'analyticsMetricKeys', jsonb_build_array(
      'active-users',
      'billing-segments',
      'privacy-requests',
      'security-posture'
    ),
    'eventSchemaKeys', jsonb_build_array('admin-audit-event'),
    'healthCheckKeys', jsonb_build_array('command-center-snapshot'),
    'errorSourceKeys', jsonb_build_array('command-center-runtime'),
    'featureFlagKeys', '[]'::jsonb,
    'supportCategoryKeys', jsonb_build_array('internal-command-center'),
    'securityPolicyKeys', jsonb_build_array(
      'least-privilege',
      'privacy-minimisation',
      'server-authorisation'
    ),
    'dataGovernance', jsonb_build_object(
      'classification', 'restricted',
      'retentionDays', 730,
      'residencyRegionKeys', jsonb_build_array('global-control-plane')
    ),
    'ownership', jsonb_build_object(
      'teamKey', 'platform-operations',
      'documentationReference', 'docs/jalvoro-command-center-registry.md'
    ),
    'admin', jsonb_build_object(
      'requiredPermissions', jsonb_build_array('command-center:platform:view'),
      'navigation', jsonb_build_array(
        jsonb_build_object(
          'navigationId', 'global-overview',
          'moduleKey', 'global-overview',
          'label', 'Global Overview',
          'href', '/admin',
          'iconKey', 'dashboard',
          'order', 10,
          'requiredPermissions', jsonb_build_array('command-center:overview:view'),
          'environments', jsonb_build_array('development', 'preview', 'production')
        ),
        jsonb_build_object(
          'navigationId', 'icon-system',
          'moduleKey', 'icon-system',
          'label', 'Icon System',
          'href', '/admin/icon-system',
          'iconKey', 'grid',
          'order', 900,
          'requiredPermissions', jsonb_build_array('command-center:icons:view'),
          'environments', jsonb_build_array('development', 'preview', 'production')
        )
      )
    )
  ) as manifest
)
insert into private.command_center_manifest_versions (
  product_key,
  version,
  schema_version,
  manifest_digest,
  manifest,
  validation_status,
  submitted_by,
  activated_at
)
select
  'command-center',
  1,
  '1.0',
  extensions.digest(convert_to(manifest::text, 'UTF8'), 'sha256'),
  manifest,
  'passed',
  null,
  now()
from bootstrap_manifest
on conflict (product_key, version) do nothing;

insert into private.command_center_validation_results (
  manifest_id,
  status,
  issue_count,
  issues
)
select
  m.id,
  'passed',
  0,
  '[]'::jsonb
from private.command_center_manifest_versions m
where m.product_key = 'command-center'
  and m.version = 1
  and not exists (
    select 1
    from private.command_center_validation_results r
    where r.manifest_id = m.id
  );

insert into private.command_center_role_permissions (
  role,
  permission_key,
  product_key,
  module_key
)
select role_name, permission_key, product_key, module_key
from (
  values
    ('owner', 'command-center:platform:view', 'command-center', null),
    ('owner', 'command-center:overview:view', 'command-center', 'global-overview'),
    ('owner', 'command-center:icons:view', 'command-center', 'icon-system'),
    ('admin', 'command-center:platform:view', 'command-center', null),
    ('admin', 'command-center:overview:view', 'command-center', 'global-overview'),
    ('admin', 'command-center:icons:view', 'command-center', 'icon-system'),
    ('analyst', 'command-center:platform:view', 'command-center', null),
    ('analyst', 'command-center:overview:view', 'command-center', 'global-overview'),
    ('analyst', 'command-center:icons:view', 'command-center', 'icon-system'),
    ('support', 'command-center:platform:view', 'command-center', null),
    ('support', 'command-center:overview:view', 'command-center', 'global-overview'),
    ('support', 'command-center:icons:view', 'command-center', 'icon-system')
) as seeded(role_name, permission_key, product_key, module_key)
on conflict do nothing;

insert into private.command_center_registry_audit (
  action,
  product_key,
  next_status
)
select 'registry_bootstrapped', 'command-center', 'active'
where not exists (
  select 1
  from private.command_center_registry_audit
  where action = 'registry_bootstrapped'
    and product_key = 'command-center'
);

commit;
