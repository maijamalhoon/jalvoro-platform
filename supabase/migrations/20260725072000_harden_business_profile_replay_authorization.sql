create or replace function public.update_business_profile_v1(
  p_business_id uuid,
  p_expected_version bigint,
  p_idempotency_key text,
  p_name text,
  p_description text,
  p_timezone text,
  p_fiscal_year_start_month smallint
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  command_operation_name constant text := 'organization.profile.update.v1';
  current_user_id uuid := auth.uid();
  authorized_member_user_id uuid;
  normalized_name text := btrim(coalesce(p_name, ''));
  normalized_description text := nullif(btrim(coalesce(p_description, '')), '');
  normalized_timezone text := btrim(coalesce(p_timezone, ''));
  normalized_key text := btrim(coalesce(p_idempotency_key, ''));
  calculated_fingerprint text;
  existing_fingerprint text;
  existing_actor_user_id uuid;
  existing_response jsonb;
  current_business public.businesses%rowtype;
  previous_profile jsonb;
  next_profile jsonb;
  response_body jsonb;
begin
  if current_user_id is null then
    return jsonb_build_object('code', 'forbidden');
  end if;

  if p_business_id is null
    or p_expected_version is null
    or p_expected_version < 1
    or char_length(normalized_key) not between 16 and 128
    or normalized_key !~ '^[A-Za-z0-9._:-]+$'
    or char_length(normalized_name) not between 2 and 120
    or char_length(coalesce(normalized_description, '')) > 1000
    or char_length(normalized_timezone) not between 1 and 80
    or p_fiscal_year_start_month is null
    or p_fiscal_year_start_month not between 1 and 12
    or not exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = normalized_timezone
    )
  then
    return jsonb_build_object('code', 'validation_failed');
  end if;

  calculated_fingerprint := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'actorUserId', current_user_id,
          'businessId', p_business_id,
          'expectedVersion', p_expected_version,
          'name', normalized_name,
          'description', normalized_description,
          'timezone', normalized_timezone,
          'fiscalYearStartMonth', p_fiscal_year_start_month
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_business_id::text || ':' || command_operation_name || ':' || normalized_key,
      0
    )
  );

  select *
  into current_business
  from public.businesses
  where id = p_business_id
  for update;

  if not found then
    return jsonb_build_object('code', 'not_found');
  end if;

  if current_business.owner_user_id <> current_user_id then
    return jsonb_build_object('code', 'forbidden');
  end if;

  select membership.user_id
  into authorized_member_user_id
  from public.business_members as membership
  where membership.business_id = p_business_id
    and membership.user_id = current_user_id
    and membership.role = 'owner'
    and membership.status = 'active'
  for key share;

  if not found or authorized_member_user_id <> current_user_id then
    return jsonb_build_object('code', 'forbidden');
  end if;

  delete from private.business_command_idempotency as stored
  where stored.business_id = p_business_id
    and stored.operation_name = command_operation_name
    and stored.expires_at <= now();

  select
    stored.request_fingerprint,
    stored.actor_user_id,
    stored.response_body
  into
    existing_fingerprint,
    existing_actor_user_id,
    existing_response
  from private.business_command_idempotency as stored
  where stored.business_id = p_business_id
    and stored.operation_name = command_operation_name
    and stored.idempotency_key = normalized_key;

  if found then
    if existing_actor_user_id <> current_user_id
      or existing_fingerprint <> calculated_fingerprint
    then
      return jsonb_build_object('code', 'idempotency_conflict');
    end if;

    return jsonb_set(existing_response, '{code}', '"replayed"'::jsonb, false);
  end if;

  if current_business.profile_version <> p_expected_version then
    return jsonb_build_object(
      'code', 'version_conflict',
      'currentVersion', current_business.profile_version
    );
  end if;

  previous_profile := jsonb_build_object(
    'name', current_business.name,
    'description', current_business.description,
    'timezone', current_business.timezone,
    'fiscalYearStartMonth', current_business.fiscal_year_start_month
  );

  update public.businesses
  set name = normalized_name,
      description = normalized_description,
      timezone = normalized_timezone,
      fiscal_year_start_month = p_fiscal_year_start_month,
      profile_version = current_business.profile_version + 1
  where id = p_business_id
  returning * into current_business;

  next_profile := jsonb_build_object(
    'name', current_business.name,
    'description', current_business.description,
    'timezone', current_business.timezone,
    'fiscalYearStartMonth', current_business.fiscal_year_start_month
  );

  response_body := jsonb_build_object(
    'code', 'updated',
    'tenantId', current_business.id,
    'profileVersion', current_business.profile_version,
    'name', current_business.name,
    'description', current_business.description,
    'timezone', current_business.timezone,
    'fiscalYearStartMonth', current_business.fiscal_year_start_month
  );

  insert into private.business_command_idempotency (
    business_id,
    operation_name,
    idempotency_key,
    request_fingerprint,
    actor_user_id,
    response_body,
    expires_at
  ) values (
    p_business_id,
    command_operation_name,
    normalized_key,
    calculated_fingerprint,
    current_user_id,
    response_body,
    now() + interval '7 days'
  );

  insert into private.business_profile_command_audit (
    business_id,
    actor_user_id,
    idempotency_key,
    previous_version,
    next_version,
    previous_profile,
    next_profile
  ) values (
    p_business_id,
    current_user_id,
    normalized_key,
    p_expected_version,
    current_business.profile_version,
    previous_profile,
    next_profile
  );

  return response_body;
end;
$$;

revoke all on function public.update_business_profile_v1(
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  smallint
) from public, anon, service_role;

grant execute on function public.update_business_profile_v1(
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  smallint
) to authenticated;

comment on function public.update_business_profile_v1(
  uuid,
  bigint,
  text,
  text,
  text,
  text,
  smallint
) is
  'Owner-only atomic organization profile update with authorization-before-replay, actor-bound idempotency, optimistic concurrency, and audit evidence.';
