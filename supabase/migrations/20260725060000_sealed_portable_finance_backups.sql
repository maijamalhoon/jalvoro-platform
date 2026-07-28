-- JALVORO sealed finance backups.
-- Files may be renamed or reformatted, but any semantic content change invalidates the HMAC.

create table if not exists private.finance_backup_seal_keys (
  key_version smallint primary key,
  secret bytea not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  constraint finance_backup_seal_keys_version_positive check (key_version > 0),
  constraint finance_backup_seal_keys_secret_length check (octet_length(secret) >= 32),
  constraint finance_backup_seal_keys_retirement_consistent
    check ((active and retired_at is null) or (not active))
);

alter table private.finance_backup_seal_keys enable row level security;
revoke all on table private.finance_backup_seal_keys from public, anon, authenticated;

insert into private.finance_backup_seal_keys (key_version, secret, active)
select 1, extensions.gen_random_bytes(32), true
where not exists (select 1 from private.finance_backup_seal_keys);

create table if not exists private.finance_backup_exports (
  backup_id uuid primary key,
  source_user_id uuid not null,
  exported_at timestamptz not null,
  key_version smallint not null references private.finance_backup_seal_keys(key_version),
  payload_sha256 text not null,
  record_count integer not null,
  created_at timestamptz not null default now(),
  constraint finance_backup_exports_hash_shape
    check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  constraint finance_backup_exports_record_count_nonnegative
    check (record_count >= 0)
);

create index if not exists finance_backup_exports_source_user_idx
  on private.finance_backup_exports (source_user_id, exported_at desc);

alter table private.finance_backup_exports enable row level security;
revoke all on table private.finance_backup_exports from public, anon, authenticated;

create or replace function private.finance_backup_payload_sha256(p_payload jsonb)
returns text
language sql
immutable
strict
set search_path = pg_catalog, extensions
as $function$
  select encode(
    extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256'),
    'hex'
  );
$function$;

create or replace function private.finance_backup_payload_hmac(
  p_payload jsonb,
  p_key_version smallint
)
returns text
language sql
stable
strict
security definer
set search_path = pg_catalog, private, extensions
as $function$
  select encode(
    extensions.hmac(
      convert_to(p_payload::text, 'UTF8'),
      key.secret,
      'sha256'
    ),
    'hex'
  )
  from private.finance_backup_seal_keys key
  where key.key_version = p_key_version;
$function$;

revoke all on function private.finance_backup_payload_sha256(jsonb)
  from public, anon, authenticated;
revoke all on function private.finance_backup_payload_hmac(jsonb, smallint)
  from public, anon, authenticated;

drop function if exists public.export_finance_backup();
drop function if exists public.export_finance_backup(jsonb);

create function public.export_finance_backup(
  p_client_snapshot jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $function$
declare
  v_user_id uuid := auth.uid();
  v_exported_at timestamptz := clock_timestamp();
  v_backup_id uuid := gen_random_uuid();
  v_key_version smallint;
  v_data jsonb;
  v_record_counts jsonb;
  v_total_records integer;
  v_client jsonb;
  v_payload jsonb;
  v_signature text;
  v_payload_sha256 text;
  v_currency text;
  v_date_format text;
  v_theme_mode text;
  v_compact_mode boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_client_snapshot is null or jsonb_typeof(p_client_snapshot) <> 'object' then
    p_client_snapshot := '{}'::jsonb;
  end if;

  v_currency := upper(nullif(btrim(p_client_snapshot->>'currency'), ''));
  if v_currency is not null
    and not public.is_supported_financial_currency(v_currency)
  then
    v_currency := null;
  end if;

  v_date_format := case p_client_snapshot->>'dateFormat'
    when 'MMM d, yyyy' then 'MMM d, yyyy'
    when 'dd MMM yyyy' then 'dd MMM yyyy'
    when 'yyyy-MM-dd' then 'yyyy-MM-dd'
    else null
  end;

  v_theme_mode := case p_client_snapshot->>'themeMode'
    when 'light' then 'light'
    when 'dark' then 'dark'
    when 'system' then 'system'
    else null
  end;

  v_compact_mode := case
    when p_client_snapshot->>'compactMode' in ('true', 'false')
      then (p_client_snapshot->>'compactMode')::boolean
    else false
  end;

  v_client := jsonb_strip_nulls(jsonb_build_object(
    'currency', v_currency,
    'dateFormat', v_date_format,
    'compactMode', v_compact_mode,
    'themeMode', v_theme_mode
  ));

  v_data := jsonb_build_object(
    'accounts', coalesce((
      select jsonb_agg(to_jsonb(account) order by account.created_at nulls first, account.id)
      from public.accounts account
      where account.user_id = v_user_id
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(to_jsonb(category) order by category.created_at nulls first, category.id)
      from public.categories category
      where category.user_id = v_user_id
    ), '[]'::jsonb),
    'investments', coalesce((
      select jsonb_agg(to_jsonb(investment) order by investment.created_at nulls first, investment.id)
      from public.investments investment
      where investment.user_id = v_user_id
    ), '[]'::jsonb),
    'goals', coalesce((
      select jsonb_agg(to_jsonb(goal) order by goal.created_at nulls first, goal.id)
      from public.goals goal
      where goal.user_id = v_user_id
    ), '[]'::jsonb),
    'liabilities', coalesce((
      select jsonb_agg(to_jsonb(liability) order by liability.created_at nulls first, liability.id)
      from public.liabilities liability
      where liability.user_id = v_user_id
    ), '[]'::jsonb),
    'goalContributions', coalesce((
      select jsonb_agg(to_jsonb(contribution) order by contribution.created_at, contribution.id)
      from public.goal_contributions contribution
      where contribution.user_id = v_user_id
    ), '[]'::jsonb),
    'transactions', coalesce((
      select jsonb_agg(to_jsonb(transaction) order by transaction.created_at nulls first, transaction.id)
      from public.transactions transaction
      where transaction.user_id = v_user_id
    ), '[]'::jsonb),
    'accountTransfers', coalesce((
      select jsonb_agg(to_jsonb(transfer) order by transfer.created_at, transfer.id)
      from public.account_transfers transfer
      where transfer.user_id = v_user_id
    ), '[]'::jsonb),
    'liabilityPayments', coalesce((
      select jsonb_agg(to_jsonb(payment) order by payment.created_at nulls first, payment.id)
      from public.liability_payments payment
      where payment.user_id = v_user_id
    ), '[]'::jsonb),
    'investmentWithdrawals', coalesce((
      select jsonb_agg(to_jsonb(withdrawal) order by withdrawal.created_at, withdrawal.id)
      from public.investment_withdrawals withdrawal
      where withdrawal.user_id = v_user_id
    ), '[]'::jsonb)
  );

  v_record_counts := jsonb_build_object(
    'accounts', jsonb_array_length(v_data->'accounts'),
    'categories', jsonb_array_length(v_data->'categories'),
    'investments', jsonb_array_length(v_data->'investments'),
    'goals', jsonb_array_length(v_data->'goals'),
    'liabilities', jsonb_array_length(v_data->'liabilities'),
    'goalContributions', jsonb_array_length(v_data->'goalContributions'),
    'transactions', jsonb_array_length(v_data->'transactions'),
    'accountTransfers', jsonb_array_length(v_data->'accountTransfers'),
    'liabilityPayments', jsonb_array_length(v_data->'liabilityPayments'),
    'investmentWithdrawals', jsonb_array_length(v_data->'investmentWithdrawals')
  );

  v_total_records :=
    jsonb_array_length(v_data->'accounts') +
    jsonb_array_length(v_data->'categories') +
    jsonb_array_length(v_data->'investments') +
    jsonb_array_length(v_data->'goals') +
    jsonb_array_length(v_data->'liabilities') +
    jsonb_array_length(v_data->'goalContributions') +
    jsonb_array_length(v_data->'transactions') +
    jsonb_array_length(v_data->'accountTransfers') +
    jsonb_array_length(v_data->'liabilityPayments') +
    jsonb_array_length(v_data->'investmentWithdrawals');

  if v_total_records > 100000 then
    raise exception 'This account contains too many records to export safely.'
      using errcode = '54000';
  end if;

  v_payload := jsonb_build_object(
    'format', 'jalvoro-finance-backup',
    'version', 2,
    'backupId', v_backup_id,
    'exportedAt', v_exported_at,
    'source', jsonb_build_object(
      'ownerId', v_user_id,
      'app', 'jalvoro'
    ),
    'scope', 'complete-personal-finance-data-and-settings',
    'profileSnapshot', (
      select to_jsonb(profile)
      from public.profiles profile
      where profile.id = v_user_id
    ),
    'preferencesSnapshot', jsonb_build_object(
      'notifications', (
        select to_jsonb(preference)
        from public.notification_preferences preference
        where preference.user_id = v_user_id
      ),
      'notificationStates', coalesce((
        select jsonb_agg(to_jsonb(state) order by state.notification_id)
        from public.notification_states state
        where state.user_id = v_user_id
      ), '[]'::jsonb),
      'ai', (
        select to_jsonb(preference)
        from public.ai_preferences preference
        where preference.user_id = v_user_id
      ),
      'client', v_client
    ),
    'manifest', jsonb_build_object(
      'totalRecords', v_total_records,
      'recordCounts', v_record_counts
    ),
    'data', v_data
  );

  if pg_column_size(v_payload) > 25 * 1024 * 1024 then
    raise exception 'This backup is too large to export safely.'
      using errcode = '54000';
  end if;

  select key.key_version
  into v_key_version
  from private.finance_backup_seal_keys key
  where key.active
  order by key.key_version desc
  limit 1;

  if v_key_version is null then
    raise exception 'Backup sealing is temporarily unavailable.'
      using errcode = '55000';
  end if;

  v_payload_sha256 := private.finance_backup_payload_sha256(v_payload);
  v_signature := private.finance_backup_payload_hmac(v_payload, v_key_version);

  if v_signature is null then
    raise exception 'Backup sealing failed.'
      using errcode = '55000';
  end if;

  insert into private.finance_backup_exports (
    backup_id,
    source_user_id,
    exported_at,
    key_version,
    payload_sha256,
    record_count
  ) values (
    v_backup_id,
    v_user_id,
    v_exported_at,
    v_key_version,
    v_payload_sha256,
    v_total_records
  );

  return v_payload || jsonb_build_object(
    'seal', jsonb_build_object(
      'issuer', 'JALVORO',
      'algorithm', 'HMAC-SHA256',
      'keyVersion', v_key_version,
      'signature', v_signature
    )
  );
end;
$function$;

revoke all on function public.export_finance_backup(jsonb)
  from public, anon;
grant execute on function public.export_finance_backup(jsonb)
  to authenticated, service_role;

create or replace function public.import_finance_backup(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $function$
declare
  v_target_user_id uuid := auth.uid();
  v_backup_id uuid;
  v_source_owner_id uuid;
  v_exported_at timestamptz;
  v_key_version smallint;
  v_signature text;
  v_expected_signature text;
  v_unsigned jsonb;
  v_legacy_backup jsonb;
  v_result jsonb;
  v_registered private.finance_backup_exports%rowtype;
  v_has_finance_data boolean;
  v_notifications jsonb;
  v_ai jsonb;
  v_client jsonb;
  v_state jsonb;
  v_category jsonb;
  v_notification_preference_rows integer := 0;
  v_notification_state_rows integer := 0;
  v_ai_preference_rows integer := 0;
  v_profile_preference_rows integer := 0;
  v_currency text;
begin
  if v_target_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_backup is null or jsonb_typeof(p_backup) <> 'object' then
    raise exception 'This backup file is invalid.' using errcode = '22023';
  end if;

  if pg_column_size(p_backup) > 25 * 1024 * 1024 then
    raise exception 'This backup file is too large.' using errcode = '54000';
  end if;

  if p_backup->>'format' <> 'jalvoro-finance-backup'
    or coalesce(p_backup->>'version', '') !~ '^[0-9]+$'
    or (p_backup->>'version')::integer <> 2
  then
    raise exception 'This backup version is not supported. Export a new sealed JALVORO backup.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_backup->'seal') <> 'object'
    or p_backup#>>'{seal,issuer}' <> 'JALVORO'
    or p_backup#>>'{seal,algorithm}' <> 'HMAC-SHA256'
  then
    raise exception 'This backup is not sealed by JALVORO.'
      using errcode = '22023';
  end if;

  begin
    v_backup_id := (p_backup->>'backupId')::uuid;
    v_source_owner_id := (p_backup#>>'{source,ownerId}')::uuid;
    v_exported_at := (p_backup->>'exportedAt')::timestamptz;
    v_key_version := (p_backup#>>'{seal,keyVersion}')::smallint;
  exception
    when invalid_text_representation or invalid_datetime_format or numeric_value_out_of_range then
      raise exception 'Backup identity or seal is invalid.' using errcode = '22023';
  end;

  v_signature := lower(coalesce(p_backup#>>'{seal,signature}', ''));
  if v_signature !~ '^[0-9a-f]{64}$' then
    raise exception 'Backup signature is invalid.' using errcode = '22023';
  end if;

  v_unsigned := p_backup - 'seal';

  select registry.*
  into v_registered
  from private.finance_backup_exports registry
  where registry.backup_id = v_backup_id;

  if not found then
    raise exception 'This file was not issued by JALVORO or its export record is unavailable.'
      using errcode = '22023';
  end if;

  if v_registered.source_user_id <> v_source_owner_id
    or v_registered.exported_at <> v_exported_at
    or v_registered.key_version <> v_key_version
    or v_registered.payload_sha256 <> private.finance_backup_payload_sha256(v_unsigned)
  then
    raise exception 'This backup was changed after export.'
      using errcode = '22023';
  end if;

  v_expected_signature := private.finance_backup_payload_hmac(
    v_unsigned,
    v_key_version
  );

  if v_expected_signature is null
    or v_signature <> v_expected_signature
  then
    raise exception 'This backup was changed after export.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'jalvoro-backup:' || v_target_user_id::text || ':' || v_backup_id::text,
      0
    )
  );

  if v_target_user_id = v_source_owner_id then
    select exists (
      select 1 from public.accounts r where r.user_id = v_target_user_id
      union all
      select 1 from public.investments r where r.user_id = v_target_user_id
      union all
      select 1 from public.goals r where r.user_id = v_target_user_id
      union all
      select 1 from public.liabilities r where r.user_id = v_target_user_id
      union all
      select 1 from public.goal_contributions r where r.user_id = v_target_user_id
      union all
      select 1 from public.liability_payments r where r.user_id = v_target_user_id
      union all
      select 1 from public.investment_withdrawals r where r.user_id = v_target_user_id
      union all
      select 1 from public.transactions r
      where r.user_id = v_target_user_id and r.deleted_at is null
      union all
      select 1 from public.account_transfers r
      where r.user_id = v_target_user_id and r.deleted_at is null
    )
    into v_has_finance_data;

    if v_has_finance_data then
      raise exception 'This backup belongs to this account. Same-account import is recovery-only; delete all finance data first.'
        using errcode = 'P0001';
    end if;

    delete from public.account_transfers transfer
    where transfer.user_id = v_target_user_id
      and transfer.deleted_at is not null;

    delete from public.transactions transaction
    where transaction.user_id = v_target_user_id
      and transaction.deleted_at is not null;

    delete from private.finance_data_imports import
    where import.target_user_id = v_target_user_id
      and import.backup_id = v_backup_id;
  end if;

  v_legacy_backup := jsonb_set(
    jsonb_set(
      v_unsigned,
      '{format}',
      to_jsonb('jamals-finance-backup'::text),
      true
    ),
    '{version}',
    '1'::jsonb,
    true
  );

  v_result := private.import_finance_backup_internal(v_legacy_backup);
  v_result := private.restore_finance_backup_snapshot(v_legacy_backup, v_result);

  if v_target_user_id = v_source_owner_id then
    for v_category in
      select value from jsonb_array_elements(p_backup#>'{data,categories}')
    loop
      update public.categories category
      set
        name = v_category->>'name',
        type = v_category->>'type',
        color = v_category->>'color',
        parent_id = nullif(v_category->>'parent_id', '')::uuid,
        icon_key = nullif(v_category->>'icon_key', ''),
        archived_at = nullif(v_category->>'archived_at', '')::timestamptz,
        sort_order = coalesce(nullif(v_category->>'sort_order', '')::integer, category.sort_order)
      where category.id = (v_category->>'id')::uuid
        and category.user_id = v_target_user_id;
    end loop;
  end if;

  v_notifications := p_backup#>'{preferencesSnapshot,notifications}';
  if jsonb_typeof(v_notifications) = 'object' then
    insert into public.notification_preferences (
      user_id,
      goal_alerts_enabled,
      payable_alerts_enabled,
      updated_at
    ) values (
      v_target_user_id,
      case
        when v_notifications->>'goal_alerts_enabled' in ('true', 'false')
          then (v_notifications->>'goal_alerts_enabled')::boolean
        else true
      end,
      case
        when v_notifications->>'payable_alerts_enabled' in ('true', 'false')
          then (v_notifications->>'payable_alerts_enabled')::boolean
        else true
      end,
      now()
    )
    on conflict (user_id) do update
    set
      goal_alerts_enabled = excluded.goal_alerts_enabled,
      payable_alerts_enabled = excluded.payable_alerts_enabled,
      updated_at = now();

    get diagnostics v_notification_preference_rows = row_count;
  end if;

  if jsonb_typeof(p_backup#>'{preferencesSnapshot,notificationStates}') = 'array' then
    for v_state in
      select value
      from jsonb_array_elements(p_backup#>'{preferencesSnapshot,notificationStates}')
    loop
      if jsonb_typeof(v_state) <> 'object'
        or nullif(btrim(v_state->>'notification_id'), '') is null
        or char_length(v_state->>'notification_id') > 240
      then
        continue;
      end if;

      begin
        insert into public.notification_states (
          user_id,
          notification_id,
          read_at,
          dismissed_at,
          snoozed_until,
          updated_at
        ) values (
          v_target_user_id,
          v_state->>'notification_id',
          nullif(v_state->>'read_at', '')::timestamptz,
          nullif(v_state->>'dismissed_at', '')::timestamptz,
          nullif(v_state->>'snoozed_until', '')::timestamptz,
          coalesce(nullif(v_state->>'updated_at', '')::timestamptz, now())
        )
        on conflict (user_id, notification_id) do update
        set
          read_at = excluded.read_at,
          dismissed_at = excluded.dismissed_at,
          snoozed_until = excluded.snoozed_until,
          updated_at = excluded.updated_at;

        v_notification_state_rows := v_notification_state_rows + 1;
      exception
        when invalid_datetime_format then
          raise exception 'Backup contains an invalid notification timestamp.'
            using errcode = '22023';
      end;
    end loop;
  end if;

  v_ai := p_backup#>'{preferencesSnapshot,ai}';
  if jsonb_typeof(v_ai) = 'object' then
    insert into public.ai_preferences (
      user_id,
      response_length,
      tone,
      risk_style,
      custom_instructions,
      created_at,
      updated_at
    ) values (
      v_target_user_id,
      case v_ai->>'response_length'
        when 'short' then 'short'
        when 'balanced' then 'balanced'
        when 'detailed' then 'detailed'
        else 'short'
      end,
      case v_ai->>'tone'
        when 'simple' then 'simple'
        when 'professional' then 'professional'
        when 'friendly' then 'friendly'
        else 'simple'
      end,
      case v_ai->>'risk_style'
        when 'conservative' then 'conservative'
        when 'balanced' then 'balanced'
        when 'growth' then 'growth'
        else 'balanced'
      end,
      left(coalesce(v_ai->>'custom_instructions', ''), 2000),
      now(),
      now()
    )
    on conflict (user_id) do update
    set
      response_length = excluded.response_length,
      tone = excluded.tone,
      risk_style = excluded.risk_style,
      custom_instructions = excluded.custom_instructions,
      updated_at = now();

    get diagnostics v_ai_preference_rows = row_count;
  end if;

  v_currency := upper(nullif(btrim(p_backup#>>'{profileSnapshot,preferred_currency}'), ''));
  if v_currency is not null
    and public.is_supported_financial_currency(v_currency)
  then
    update public.profiles profile
    set preferred_currency = v_currency, updated_at = now()
    where profile.id = v_target_user_id;

    get diagnostics v_profile_preference_rows = row_count;
  end if;

  v_client := p_backup#>'{preferencesSnapshot,client}';
  if jsonb_typeof(v_client) <> 'object' then
    v_client := '{}'::jsonb;
  end if;

  return v_result || jsonb_build_object(
    'clientPreferences', v_client,
    'sourceUserId', v_source_owner_id,
    'targetUserId', v_target_user_id,
    'sealed', true,
    'restored',
      coalesce(v_result->'restored', '{}'::jsonb) ||
      jsonb_build_object(
        'notificationPreferences', v_notification_preference_rows,
        'notificationStates', v_notification_state_rows,
        'aiPreferences', v_ai_preference_rows,
        'profilePreferences', v_profile_preference_rows
      )
  );
end;
$function$;

revoke all on function public.import_finance_backup(jsonb)
  from public, anon;
grant execute on function public.import_finance_backup(jsonb)
  to authenticated, service_role;

revoke all on function private.import_finance_backup_internal(jsonb)
  from public, anon, authenticated;
revoke all on function private.restore_finance_backup_snapshot(jsonb, jsonb)
  from public, anon, authenticated;
