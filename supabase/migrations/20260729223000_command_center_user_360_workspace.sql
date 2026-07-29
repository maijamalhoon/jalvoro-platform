begin;

alter table private.admin_access_log
  drop constraint if exists admin_access_log_action_check;

alter table private.admin_access_log
  add constraint admin_access_log_action_check check (
    action in (
      'control_center_viewed',
      'billing_snapshot_viewed',
      'user_360_viewed'
    )
  );

create or replace function private.resolve_platform_user_reference(
  p_user_reference text
)
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, auth, private
as $$
declare
  v_reference text := upper(btrim(coalesce(p_user_reference, '')));
  v_user_id uuid;
begin
  if v_reference !~ '^USR-[A-F0-9]{12}$' then
    raise exception 'platform_user_reference_invalid' using errcode = '22023';
  end if;

  select au.id
    into v_user_id
  from auth.users au
  where au.deleted_at is null
    and private.platform_user_reference(au.id) = v_reference
  limit 1;

  if v_user_id is null then
    raise exception 'platform_user_not_found' using errcode = 'P0002';
  end if;

  return v_user_id;
end;
$$;

revoke all on function private.resolve_platform_user_reference(text)
  from public, anon, authenticated;
grant execute on function private.resolve_platform_user_reference(text)
  to service_role;

create or replace function public.get_command_center_user_360(
  p_user_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth, public, private, billing, telemetry
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_user_id uuid;
  v_result jsonb;
begin
  select pa.role
    into v_actor_role
  from private.platform_admins pa
  where pa.user_id = v_actor
    and pa.disabled_at is null;

  if v_actor is null or v_actor_role is null then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;

  v_user_id := private.resolve_platform_user_reference(p_user_reference);

  insert into private.admin_access_log (
    admin_user_id,
    action,
    route
  ) values (
    v_actor,
    'user_360_viewed',
    '/admin/user-360'
  );

  select jsonb_build_object(
    'generatedAt', now(),
    'viewerRole', v_actor_role,
    'identity', jsonb_build_object(
      'userReference', private.platform_user_reference(au.id),
      'email', case
        when v_actor_role in ('owner', 'admin') then au.email
        when au.email is null or btrim(au.email) = '' then 'u***@hidden.invalid'
        else private.mask_platform_admin_email(au.email)
      end,
      'emailVisibility', case
        when v_actor_role in ('owner', 'admin') then 'full'
        else 'masked'
      end,
      'maskedPhone', case
        when au.phone is null or btrim(au.phone) = '' then null
        when char_length(au.phone) <= 4 then repeat('*', char_length(au.phone))
        else repeat('*', char_length(au.phone) - 4) || right(au.phone, 4)
      end,
      'fullName', case
        when v_actor_role in ('owner', 'admin') then nullif(btrim(profile.full_name), '')
        else null
      end,
      'provider', coalesce(nullif(btrim(profile.provider), ''), 'unknown'),
      'preferredCurrency', coalesce(nullif(upper(btrim(profile.preferred_currency)), ''), 'PKR'),
      'onboardingStatus', case
        when coalesce(profile.onboarding_completed, false) then 'complete'
        else 'pending'
      end,
      'createdAt', au.created_at,
      'emailConfirmedAt', au.email_confirmed_at,
      'phoneConfirmedAt', au.phone_confirmed_at,
      'lastSignInAt', au.last_sign_in_at,
      'bannedUntil', au.banned_until,
      'accountStatus', case
        when au.banned_until is not null and au.banned_until > now() then 'banned'
        when au.email_confirmed_at is null then 'unconfirmed'
        else 'active'
      end
    ),
    'billing', coalesce((
      select jsonb_build_object(
        'planCode', coalesce(subscription.plan_code, 'free'),
        'planName', coalesce(plan.name, 'Free'),
        'planKind', coalesce(plan.plan_kind, 'free'),
        'status', coalesce(subscription.status, 'free'),
        'provider', coalesce(subscription.provider, 'none'),
        'trialEndsAt', subscription.trial_ends_at,
        'currentPeriodStart', subscription.current_period_start,
        'currentPeriodEnd', subscription.current_period_end,
        'cancelAtPeriodEnd', coalesce(subscription.cancel_at_period_end, false)
      )
      from (select 1) seed
      left join billing.subscriptions subscription
        on subscription.user_id = au.id
      left join billing.plans plan
        on plan.code = subscription.plan_code
    ), jsonb_build_object(
      'planCode', 'free',
      'planName', 'Free',
      'planKind', 'free',
      'status', 'free',
      'provider', 'none',
      'trialEndsAt', null,
      'currentPeriodStart', null,
      'currentPeriodEnd', null,
      'cancelAtPeriodEnd', false
    )),
    'activity', jsonb_build_object(
      'telemetryStatus', case
        when exists (
          select 1 from telemetry.subjects subject where subject.user_id = au.id
        ) then 'available'
        else 'not_observed'
      end,
      'lastSeenAt', (
        select subject.last_seen_at
        from telemetry.subjects subject
        where subject.user_id = au.id
      ),
      'sessions30d', (
        select count(distinct event.session_id)::bigint
        from telemetry.subjects subject
        join telemetry.events event on event.subject_id = subject.subject_id
        where subject.user_id = au.id
          and event.occurred_at >= now() - interval '30 days'
      ),
      'events30d', (
        select count(*)::bigint
        from telemetry.subjects subject
        join telemetry.events event on event.subject_id = subject.subject_id
        where subject.user_id = au.id
          and event.occurred_at >= now() - interval '30 days'
      ),
      'failedOperations30d', (
        select count(*)::bigint
        from telemetry.subjects subject
        join telemetry.events event on event.subject_id = subject.subject_id
        where subject.user_id = au.id
          and event.occurred_at >= now() - interval '30 days'
          and event.event_name = 'operation_failed'
      ),
      'lastRoute', (
        select event.route
        from telemetry.subjects subject
        join telemetry.events event on event.subject_id = subject.subject_id
        where subject.user_id = au.id
        order by event.occurred_at desc
        limit 1
      ),
      'topRoutes', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'route', route_rows.route,
            'events', route_rows.events,
            'lastSeenAt', route_rows.last_seen_at
          ) order by route_rows.events desc, route_rows.last_seen_at desc
        )
        from (
          select event.route,
                 count(*)::bigint as events,
                 max(event.occurred_at) as last_seen_at
          from telemetry.subjects subject
          join telemetry.events event on event.subject_id = subject.subject_id
          where subject.user_id = au.id
            and event.occurred_at >= now() - interval '30 days'
          group by event.route
          order by count(*) desc, max(event.occurred_at) desc
          limit 10
        ) route_rows
      ), '[]'::jsonb)
    ),
    'latestDevice', (
      select jsonb_build_object(
        'countryCode', event.country_code,
        'regionCode', event.region_code,
        'city', event.city,
        'locationPrecision', case
          when event.city is not null then 'approximate_city'
          when event.region_code is not null then 'approximate_region'
          when event.country_code is not null then 'country'
          else 'unknown'
        end,
        'deviceType', event.device_type,
        'osFamily', event.os_family,
        'browserFamily', event.browser_family,
        'appVersion', event.app_version,
        'route', event.route,
        'observedAt', event.occurred_at
      )
      from telemetry.subjects subject
      join telemetry.events event on event.subject_id = subject.subject_id
      where subject.user_id = au.id
      order by event.occurred_at desc
      limit 1
    ),
    'recentSessions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'sessionReference', 'SES-' || upper(substr(md5(session_rows.session_id::text), 1, 12)),
          'countryCode', session_rows.country_code,
          'regionCode', session_rows.region_code,
          'city', session_rows.city,
          'deviceType', session_rows.device_type,
          'osFamily', session_rows.os_family,
          'browserFamily', session_rows.browser_family,
          'appVersion', session_rows.app_version,
          'lastRoute', session_rows.route,
          'lastSeenAt', session_rows.observed_at
        ) order by session_rows.observed_at desc
      )
      from (
        select latest.*
        from (
          select distinct on (event.session_id)
            event.session_id,
            event.country_code,
            event.region_code,
            event.city,
            event.device_type,
            event.os_family,
            event.browser_family,
            event.app_version,
            event.route,
            event.occurred_at as observed_at
          from telemetry.subjects subject
          join telemetry.events event on event.subject_id = subject.subject_id
          where subject.user_id = au.id
            and event.occurred_at >= now() - interval '30 days'
          order by event.session_id, event.occurred_at desc
        ) latest
        order by latest.observed_at desc
        limit 12
      ) session_rows
    ), '[]'::jsonb),
    'organizations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'organizationCode', organization.organization_code,
          'displayName', organization.display_name,
          'organizationStatus', organization.status,
          'membershipCode', membership.membership_code,
          'membershipRole', membership.role,
          'membershipStatus', membership.status,
          'primaryCountryCode', organization.primary_country_code,
          'regionKey', organization.region_key,
          'dataClassification', organization.data_classification
        ) order by organization.display_name
      )
      from private.command_center_organization_memberships membership
      join private.command_center_organizations organization
        on organization.id = membership.organization_id
      where membership.user_id = au.id
    ), '[]'::jsonb),
    'riskSignals', jsonb_build_object(
      'emailUnconfirmed', au.email_confirmed_at is null,
      'neverSignedIn', au.last_sign_in_at is null,
      'inactive90d', au.last_sign_in_at is not null
        and au.last_sign_in_at < now() - interval '90 days',
      'currentlyBanned', au.banned_until is not null and au.banned_until > now(),
      'failedOperations30d', (
        select count(*)::bigint
        from telemetry.subjects subject
        join telemetry.events event on event.subject_id = subject.subject_id
        where subject.user_id = au.id
          and event.occurred_at >= now() - interval '30 days'
          and event.event_name = 'operation_failed'
      ),
      'telemetryUnavailable', not exists (
        select 1 from telemetry.subjects subject where subject.user_id = au.id
      )
    ),
    'privacyBoundary', jsonb_build_object(
      'rawIpReturned', false,
      'exactGpsReturned', false,
      'financeValuesReturned', false,
      'freeTextReturned', false,
      'sessionReplayReturned', false,
      'locationIsApproximate', true,
      'lookupAudited', true,
      'telemetryRetentionDays', 30
    )
  )
    into v_result
  from auth.users au
  left join public.profiles profile on profile.id = au.id
  where au.id = v_user_id
    and au.deleted_at is null;

  if v_result is null then
    raise exception 'platform_user_not_found' using errcode = 'P0002';
  end if;

  return v_result;
end;
$$;

revoke all on function public.get_command_center_user_360(text)
  from public, anon;
grant execute on function public.get_command_center_user_360(text)
  to authenticated;

comment on function public.get_command_center_user_360(text) is
  'Audited, role-aware User 360 view for the isolated JALVORO Command Center. Returns account, subscription, organization, privacy-minimised device, approximate location, session and product-activity context without raw IP, exact GPS, session replay, finance values or provider identifiers.';

create or replace function public.execute_command_center_operation(
  p_actor_user_id uuid,
  p_operation text,
  p_arguments jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_operation text := lower(btrim(coalesce(p_operation, '')));
  v_arguments jsonb := coalesce(p_arguments, '{}'::jsonb);
  v_claims jsonb;
  v_now_epoch bigint := extract(epoch from clock_timestamp())::bigint;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'command_center_gateway_service_role_required'
      using errcode = '42501';
  end if;

  if p_actor_user_id is null or not exists (
    select 1
    from auth.users u
    where u.id = p_actor_user_id
      and u.deleted_at is null
      and u.email_confirmed_at is not null
  ) then
    raise exception 'command_center_gateway_actor_invalid'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_arguments) <> 'object'
    or pg_column_size(v_arguments) > 16384 then
    raise exception 'command_center_gateway_arguments_invalid'
      using errcode = '22023';
  end if;

  v_claims := jsonb_build_object(
    'sub', p_actor_user_id,
    'role', 'authenticated',
    'aal', 'aal2',
    'command_center_gateway', true,
    'amr', jsonb_build_array(
      jsonb_build_object('method', 'password', 'timestamp', v_now_epoch),
      jsonb_build_object('method', 'totp', 'timestamp', v_now_epoch)
    )
  );
  perform set_config('request.jwt.claims', v_claims::text, true);

  case v_operation
    when 'get_platform_admin_snapshot' then
      return public.get_platform_admin_snapshot();
    when 'get_command_center_user_360' then
      return public.get_command_center_user_360(
        v_arguments->>'p_user_reference'
      );
    when 'get_command_center_navigation' then
      return public.get_command_center_navigation(v_arguments->>'p_environment');
    when 'get_command_center_organization_operations_snapshot' then
      return public.get_command_center_organization_operations_snapshot(
        nullif(v_arguments->>'p_organization_code', ''),
        coalesce((v_arguments->>'p_limit')::integer, 50),
        coalesce((v_arguments->>'p_offset')::integer, 0)
      );
    when 'create_command_center_organization_by_email' then
      return public.create_command_center_organization_by_email(
        v_arguments->>'p_organization_key',
        v_arguments->>'p_display_name',
        v_arguments->>'p_owner_email',
        nullif(v_arguments->>'p_primary_country_code', ''),
        nullif(v_arguments->>'p_region_key', ''),
        coalesce(nullif(v_arguments->>'p_data_classification', ''), 'confidential')
      );
    when 'transition_command_center_organization' then
      return public.transition_command_center_organization(
        v_arguments->>'p_organization_code',
        v_arguments->>'p_action'
      );
    when 'create_command_center_organization_membership_by_email' then
      return public.create_command_center_organization_membership_by_email(
        v_arguments->>'p_organization_code',
        v_arguments->>'p_member_email',
        v_arguments->>'p_role'
      );
    when 'transition_command_center_organization_membership' then
      return public.transition_command_center_organization_membership(
        v_arguments->>'p_membership_code',
        v_arguments->>'p_action',
        nullif(v_arguments->>'p_role', '')
      );
    when 'grant_command_center_organization_permission_by_email' then
      return public.grant_command_center_organization_permission_by_email(
        v_arguments->>'p_admin_email',
        v_arguments->>'p_permission_key',
        v_arguments->>'p_organization_code',
        nullif(v_arguments->>'p_expires_at', '')::timestamptz
      );
    when 'revoke_command_center_permission' then
      return public.revoke_command_center_permission(v_arguments->>'p_grant_code');
    when 'apply_billing_plan_operation' then
      return public.apply_billing_plan_operation(
        v_arguments->>'p_code',
        v_arguments->>'p_name',
        v_arguments->>'p_billing_interval',
        (v_arguments->>'p_price_major')::numeric,
        v_arguments->>'p_currency',
        coalesce((v_arguments->>'p_currency_exponent')::smallint, 2::smallint),
        coalesce((v_arguments->>'p_is_active')::boolean, true)
      );
    when 'apply_privacy_request_workflow' then
      return public.apply_privacy_request_workflow(
        v_arguments->>'p_request_code',
        v_arguments->>'p_status',
        v_arguments->>'p_verification_status',
        nullif(v_arguments->>'p_due_date', '')::date,
        coalesce((v_arguments->>'p_assign_to_self')::boolean, false)
      );
    when 'approve_admin_release' then
      return public.approve_admin_release(
        v_arguments->>'p_revision_sha',
        v_arguments->>'p_environment'
      );
    when 'revoke_admin_release' then
      return public.revoke_admin_release(v_arguments->>'p_release_code');
    when 'create_platform_security_incident' then
      return public.create_platform_security_incident(
        v_arguments->>'p_category',
        v_arguments->>'p_severity',
        v_arguments->>'p_source',
        nullif(v_arguments->>'p_source_reference', ''),
        nullif(v_arguments->>'p_due_at', '')::timestamptz
      );
    when 'apply_platform_security_incident_workflow' then
      return public.apply_platform_security_incident_workflow(
        v_arguments->>'p_incident_code',
        v_arguments->>'p_status',
        v_arguments->>'p_severity',
        nullif(v_arguments->>'p_due_at', '')::timestamptz,
        coalesce((v_arguments->>'p_assign_to_self')::boolean, false),
        nullif(v_arguments->>'p_resolution_code', '')
      );
    when 'apply_admin_compliance_review' then
      return public.apply_admin_compliance_review(
        v_arguments->>'p_event_code',
        v_arguments->>'p_status'
      );
    when 'create_platform_admin_invitation' then
      return public.create_platform_admin_invitation(
        v_arguments->>'p_email',
        v_arguments->>'p_role',
        v_arguments->>'p_token_sha256',
        coalesce((v_arguments->>'p_expires_in_hours')::integer, 72)
      );
    when 'apply_platform_admin_member_action' then
      return public.apply_platform_admin_member_action(
        v_arguments->>'p_admin_reference',
        v_arguments->>'p_action',
        nullif(v_arguments->>'p_role', '')
      );
    when 'revoke_platform_admin_invitation' then
      return public.revoke_platform_admin_invitation(
        v_arguments->>'p_invitation_code'
      );
    when 'accept_platform_admin_invitation' then
      return public.accept_platform_admin_invitation(
        v_arguments->>'p_token_sha256'
      );
    else
      raise exception 'command_center_gateway_operation_invalid'
        using errcode = '22023';
  end case;
end;
$$;

revoke all on function public.execute_command_center_operation(uuid,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.execute_command_center_operation(uuid,text,jsonb)
  to service_role;

commit;
