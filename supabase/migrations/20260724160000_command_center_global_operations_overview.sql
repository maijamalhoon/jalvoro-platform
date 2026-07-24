create or replace function private.get_command_center_global_operations_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'auth', 'private', 'billing', 'telemetry'
as $$
declare
  v_admin_user_id uuid := auth.uid();
  v_admin_role text;
  v_product_items jsonb := '[]'::jsonb;
  v_environment_items jsonb := '[]'::jsonb;
  v_configured_region_items jsonb := '[]'::jsonb;
  v_country_items jsonb := '[]'::jsonb;
  v_region_code_items jsonb := '[]'::jsonb;
  v_device_items jsonb := '[]'::jsonb;
  v_os_items jsonb := '[]'::jsonb;
  v_browser_items jsonb := '[]'::jsonb;
  v_version_items jsonb := '[]'::jsonb;
begin
  select role
  into v_admin_role
  from private.platform_admins
  where user_id = v_admin_user_id
    and disabled_at is null;

  if v_admin_user_id is null or v_admin_role is null then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(product_rows) order by product_rows."name"),
    '[]'::jsonb
  )
  into v_product_items
  from (
    select
      p.product_key as "productKey",
      p.name,
      f.name as "familyName",
      p.category_key as "categoryKey",
      p.lifecycle_status as "lifecycleStatus",
      p.registration_status as "registrationStatus",
      p.data_classification as "dataClassification",
      p.retention_days as "retentionDays",
      (select count(*)::bigint from private.command_center_applications a where a.product_key = p.product_key) as applications,
      (select count(*)::bigint from private.command_center_applications a where a.product_key = p.product_key and a.enabled) as "enabledApplications",
      (select count(*)::bigint from private.command_center_modules m where m.product_key = p.product_key) as modules,
      (select count(*)::bigint from private.command_center_modules m where m.product_key = p.product_key and m.enabled) as "enabledModules",
      (select count(*)::bigint from private.command_center_services s where s.product_key = p.product_key) as services,
      coalesce((
        select jsonb_agg(pe.environment_key order by pe.environment_key)
        from private.command_center_product_environments pe
        where pe.product_key = p.product_key
      ), '[]'::jsonb) as environments,
      coalesce((
        select jsonb_agg(pr.region_key order by pr.region_key)
        from private.command_center_product_regions pr
        where pr.product_key = p.product_key
      ), '[]'::jsonb) as regions,
      coalesce((
        select jsonb_agg(platform_rows.platform order by platform_rows.platform)
        from (
          select distinct unnest(a.platforms) as platform
          from private.command_center_applications a
          where a.product_key = p.product_key
        ) platform_rows
      ), '[]'::jsonb) as platforms
    from private.command_center_products p
    join private.command_center_product_families f on f.family_key = p.family_key
    order by p.name
    limit 50
  ) product_rows;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'environmentKey', environment_rows.environment_key,
      'name', environment_rows.name,
      'active', environment_rows.active,
      'products', environment_rows.products
    ) order by environment_rows.environment_key),
    '[]'::jsonb
  )
  into v_environment_items
  from (
    select
      e.environment_key,
      e.name,
      e.active,
      count(pe.product_key)::bigint as products
    from private.command_center_environments e
    left join private.command_center_product_environments pe
      on pe.environment_key = e.environment_key
    group by e.environment_key, e.name, e.active
  ) environment_rows;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'regionKey', configured_region_rows.region_key,
      'name', configured_region_rows.name,
      'active', configured_region_rows.active,
      'products', configured_region_rows.products
    ) order by configured_region_rows.region_key),
    '[]'::jsonb
  )
  into v_configured_region_items
  from (
    select
      r.region_key,
      r.name,
      r.active,
      count(pr.product_key)::bigint as products
    from private.command_center_regions r
    left join private.command_center_product_regions pr
      on pr.region_key = r.region_key
    group by r.region_key, r.name, r.active
  ) configured_region_rows;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'countryCode', country_rows.country_code,
      'activeUsers', country_rows.active_users,
      'events', country_rows.events
    ) order by country_rows.active_users desc, country_rows.country_code),
    '[]'::jsonb
  )
  into v_country_items
  from (
    select
      country_code,
      count(distinct subject_id)::bigint as active_users,
      count(*)::bigint as events
    from telemetry.events
    where occurred_at >= now() - interval '30 days'
      and country_code is not null
    group by country_code
    order by active_users desc, country_code
    limit 12
  ) country_rows;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'regionCode', region_code_rows.region_code,
      'activeUsers', region_code_rows.active_users,
      'events', region_code_rows.events
    ) order by region_code_rows.active_users desc, region_code_rows.region_code),
    '[]'::jsonb
  )
  into v_region_code_items
  from (
    select
      region_code,
      count(distinct subject_id)::bigint as active_users,
      count(*)::bigint as events
    from telemetry.events
    where occurred_at >= now() - interval '30 days'
      and region_code is not null
    group by region_code
    order by active_users desc, region_code
    limit 12
  ) region_code_rows;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'key', device_rows.device_type,
      'activeUsers', device_rows.active_users,
      'events', device_rows.events
    ) order by device_rows.active_users desc, device_rows.device_type),
    '[]'::jsonb
  )
  into v_device_items
  from (
    select
      device_type,
      count(distinct subject_id)::bigint as active_users,
      count(*)::bigint as events
    from telemetry.events
    where occurred_at >= now() - interval '30 days'
    group by device_type
    order by active_users desc, device_type
    limit 12
  ) device_rows;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'key', os_rows.os_family,
      'activeUsers', os_rows.active_users,
      'events', os_rows.events
    ) order by os_rows.active_users desc, os_rows.os_family),
    '[]'::jsonb
  )
  into v_os_items
  from (
    select
      os_family,
      count(distinct subject_id)::bigint as active_users,
      count(*)::bigint as events
    from telemetry.events
    where occurred_at >= now() - interval '30 days'
    group by os_family
    order by active_users desc, os_family
    limit 12
  ) os_rows;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'key', browser_rows.browser_family,
      'activeUsers', browser_rows.active_users,
      'events', browser_rows.events
    ) order by browser_rows.active_users desc, browser_rows.browser_family),
    '[]'::jsonb
  )
  into v_browser_items
  from (
    select
      browser_family,
      count(distinct subject_id)::bigint as active_users,
      count(*)::bigint as events
    from telemetry.events
    where occurred_at >= now() - interval '30 days'
    group by browser_family
    order by active_users desc, browser_family
    limit 12
  ) browser_rows;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'key', version_rows.app_version,
      'activeUsers', version_rows.active_users,
      'events', version_rows.events
    ) order by version_rows.active_users desc, version_rows.app_version),
    '[]'::jsonb
  )
  into v_version_items
  from (
    select
      app_version,
      count(distinct subject_id)::bigint as active_users,
      count(*)::bigint as events
    from telemetry.events
    where occurred_at >= now() - interval '30 days'
      and app_version is not null
    group by app_version
    order by active_users desc, app_version
    limit 12
  ) version_rows;

  return jsonb_build_object(
    'generatedAt', now(),
    'adminRole', v_admin_role,
    'products', jsonb_build_object(
      'total', (select count(*)::bigint from private.command_center_products),
      'active', (select count(*)::bigint from private.command_center_products where registration_status = 'active'),
      'suspended', (select count(*)::bigint from private.command_center_products where registration_status = 'suspended'),
      'families', (select count(*)::bigint from private.command_center_product_families),
      'applications', (select count(*)::bigint from private.command_center_applications),
      'enabledApplications', (select count(*)::bigint from private.command_center_applications where enabled),
      'modules', (select count(*)::bigint from private.command_center_modules),
      'enabledModules', (select count(*)::bigint from private.command_center_modules where enabled),
      'services', (select count(*)::bigint from private.command_center_services),
      'items', v_product_items,
      'environments', v_environment_items
    ),
    'organizations', jsonb_build_object(
      'sourceStatus', 'not_registered',
      'reason', 'organization_data_source_not_registered',
      'total', 0,
      'active', 0,
      'suspended', 0
    ),
    'subscriptions', jsonb_build_object(
      'total', (select count(*)::bigint from billing.subscriptions),
      'free', (select count(*)::bigint from billing.subscriptions where status = 'free'),
      'trialing', (select count(*)::bigint from billing.subscriptions where status = 'trialing'),
      'activePaid', (select count(*)::bigint from billing.subscriptions s join billing.plans p on p.code = s.plan_code where s.status = 'active' and p.plan_kind = 'paid'),
      'pastDue', (select count(*)::bigint from billing.subscriptions where status = 'past_due'),
      'cancelled', (select count(*)::bigint from billing.subscriptions where status in ('cancelled', 'expired')),
      'cancelAtPeriodEnd', (select count(*)::bigint from billing.subscriptions where cancel_at_period_end)
    ),
    'regionalOperations', jsonb_build_object(
      'configuredRegions', v_configured_region_items,
      'countries30d', v_country_items,
      'regionCodes30d', v_region_code_items,
      'rawIpStored', false
    ),
    'platformAnalytics', jsonb_build_object(
      'devices30d', v_device_items,
      'operatingSystems30d', v_os_items,
      'browsers30d', v_browser_items,
      'applicationVersions30d', v_version_items,
      'sessionReplayEnabled', false
    )
  );
end;
$$;

revoke all on function private.get_command_center_global_operations_snapshot() from public, anon, authenticated;

create or replace function private.get_platform_admin_snapshot()
returns jsonb
language sql
security definer
set search_path = 'pg_catalog', 'private'
as $$
  select private.get_platform_admin_snapshot_base()
    || jsonb_build_object(
      'privacy', private.get_privacy_governance_snapshot()
    )
    || jsonb_build_object(
      'billingOperations', private.get_billing_operations_snapshot()
    )
    || jsonb_build_object(
      'globalOperations', private.get_command_center_global_operations_snapshot()
    );
$$;
