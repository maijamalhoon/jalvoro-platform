begin;

create or replace function private.admin_release_database_state()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, auth, private, billing, telemetry, supabase_migrations
as $$
  with required_migrations(canonical_name, aliases) as (
    values
      ('privacy_governance_control_center'::text, array['privacy_governance_control_center']::text[]),
      ('privacy_request_operations', array['privacy_request_operations']::text[]),
      ('billing_plan_operations', array['billing_plan_operations']::text[]),
      ('admin_team_access_security', array['admin_team_access_security']::text[]),
      (
        'admin_user_account_operations',
        array['admin_user_account_operations', 'admin_user_account_operations_backfill']::text[]
      ),
      ('admin_incident_alert_operations', array['admin_incident_alert_operations']::text[]),
      ('harden_admin_incident_operations', array['harden_admin_incident_operations']::text[]),
      ('require_incident_resolution_code', array['require_incident_resolution_code']::text[]),
      ('index_incident_foreign_keys', array['index_incident_foreign_keys']::text[]),
      ('admin_compliance_audit_review_center', array['admin_compliance_audit_review_center']::text[]),
      ('admin_release_readiness_center', array['admin_release_readiness_center']::text[]),
      (
        'harden_admin_release_migration_aliases',
        array['harden_admin_release_migration_aliases']::text[]
      )
  ),
  required_tables(name) as (
    values
      ('private.platform_admins'::text),
      ('private.platform_admin_invitations'),
      ('private.platform_admin_access_audit'),
      ('private.privacy_requests'),
      ('private.privacy_request_audit'),
      ('private.platform_security_incidents'),
      ('private.platform_security_incident_audit'),
      ('private.admin_compliance_audit_reviews'),
      ('private.admin_compliance_review_audit'),
      ('private.admin_release_approvals'),
      ('private.admin_release_approval_audit')
  ),
  required_triggers(name) as (
    values
      ('privacy_request_audit_append_only'::text),
      ('billing_plan_audit_append_only'),
      ('platform_admin_access_audit_append_only'),
      ('platform_security_incident_audit_append_only'),
      ('admin_compliance_review_audit_append_only'),
      ('admin_release_approval_audit_append_only')
  ),
  required_functions(signature) as (
    values
      ('public.get_platform_admin_snapshot()'::text),
      ('private.get_admin_release_readiness_snapshot()'),
      ('public.approve_admin_release(text,text)'),
      ('public.revoke_admin_release(text)'),
      ('private.purge_expired_admin_release_approvals()'),
      ('private.admin_release_database_state()'),
      ('private.admin_release_database_state_digest()'),
      ('private.get_admin_compliance_audit_snapshot()')
  ),
  permission_checks(passed) as (
    values
      (not has_function_privilege('anon', 'public.get_platform_admin_snapshot()', 'execute')),
      (not has_function_privilege('anon', 'public.approve_admin_release(text,text)', 'execute')),
      (not has_function_privilege('anon', 'public.revoke_admin_release(text)', 'execute')),
      (not has_function_privilege('authenticated', 'private.purge_expired_admin_release_approvals()', 'execute')),
      (not has_function_privilege('authenticated', 'private.purge_expired_admin_compliance_reviews()', 'execute')),
      (not has_function_privilege('authenticated', 'private.purge_expired_platform_security_incidents()', 'execute')),
      (not has_function_privilege('anon', 'public.apply_admin_compliance_review(text,text)', 'execute')),
      (not has_function_privilege('anon', 'public.apply_platform_security_incident_workflow(text,text,text,timestamptz,boolean,text)', 'execute'))
  ),
  controls as (
    select
      (select count(*)::bigint from required_migrations) as migrations_total,
      (
        select count(*)::bigint
        from required_migrations r
        where exists (
          select 1
          from supabase_migrations.schema_migrations m
          where m.name = any(r.aliases)
        )
      ) as migrations_applied,
      (select count(*)::bigint from required_tables) as rls_total,
      (
        select count(*)::bigint
        from required_tables r
        where coalesce((
          select c.relrowsecurity
          from pg_class c
          where c.oid = to_regclass(r.name)
        ), false)
      ) as rls_protected,
      (select count(*)::bigint from required_tables) as direct_access_total,
      (
        select count(*)::bigint
        from required_tables r
        where to_regclass(r.name) is not null
          and not has_table_privilege('anon', r.name, 'select')
          and not has_table_privilege('authenticated', r.name, 'select')
      ) as direct_access_denied,
      (select count(*)::bigint from required_triggers) as append_only_expected,
      (
        select count(*)::bigint
        from required_triggers r
        where exists (
          select 1
          from pg_trigger t
          where not t.tgisinternal and t.tgname = r.name
        )
      ) as append_only_present,
      (select count(*)::bigint from required_functions) as functions_total,
      (
        select count(*)::bigint
        from required_functions r
        where to_regprocedure(r.signature) is not null
      ) as functions_present,
      (select count(*)::bigint from permission_checks) as permissions_total,
      (select count(*)::bigint from permission_checks where passed) as permissions_passed
  ),
  blockers as (
    select
      (
        select count(*)::bigint
        from private.privacy_requests
        where status in ('pending', 'identity_verification', 'in_progress')
          and due_at < now()
      ) as overdue_privacy,
      (
        select count(*)::bigint
        from private.platform_security_incidents
        where severity = 'critical'
          and status not in ('resolved', 'dismissed')
      ) as critical_incidents,
      (
        select count(*)::bigint
        from private.platform_security_incidents
        where due_at < now()
          and status not in ('resolved', 'dismissed')
      ) as overdue_incidents,
      (
        select count(*)::bigint
        from private.admin_compliance_event_rows() e
        join private.admin_compliance_audit_reviews r
          on r.event_code = e.event_code
        where r.source_digest <> e.event_digest
      ) as integrity_mismatches,
      (
        select count(*)::bigint
        from billing.webhook_events
        where processing_status = 'failed'
          and received_at >= now() - interval '24 hours'
      ) as failed_webhooks_24h,
      (
        select count(*)::bigint
        from telemetry.events
        where result = 'failed'
          and occurred_at >= now() - interval '7 days'
      ) as failed_operations_7d,
      (
        select count(*)::bigint
        from private.platform_admins
        where role = 'owner' and disabled_at is null
      ) as active_owners
  )
  select jsonb_build_object(
    'database', jsonb_build_object(
      'requiredMigrationsApplied', c.migrations_applied,
      'requiredMigrationsTotal', c.migrations_total,
      'rlsTablesProtected', c.rls_protected,
      'rlsTablesTotal', c.rls_total,
      'directAccessDenied', c.direct_access_denied,
      'directAccessChecksTotal', c.direct_access_total,
      'appendOnlyTriggers', c.append_only_present,
      'appendOnlyTriggersExpected', c.append_only_expected,
      'requiredFunctionsPresent', c.functions_present,
      'requiredFunctionsTotal', c.functions_total,
      'permissionChecksPassed', c.permissions_passed,
      'permissionChecksTotal', c.permissions_total
    ),
    'blockers', jsonb_build_object(
      'overduePrivacy', b.overdue_privacy,
      'criticalIncidents', b.critical_incidents,
      'overdueIncidents', b.overdue_incidents,
      'integrityMismatches', b.integrity_mismatches,
      'failedWebhooks24h', b.failed_webhooks_24h,
      'failedOperations7d', b.failed_operations_7d,
      'activeOwners', b.active_owners
    )
  )
  from controls c cross join blockers b;
$$;

revoke all on function private.admin_release_database_state()
  from public, anon, authenticated;
grant execute on function private.admin_release_database_state()
  to service_role;

commit;
