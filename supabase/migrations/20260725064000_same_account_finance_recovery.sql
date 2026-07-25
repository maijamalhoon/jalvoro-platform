-- Same-account restore follows JALVORO's history-preserving deletion model:
-- accounts are archived and ledger rows are soft-deleted. A sealed backup may
-- recover the source account only when no live finance data remains.

create or replace function private.prepare_same_account_finance_recovery(
  p_user_id uuid,
  p_backup_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_original_claim text := current_setting('request.jwt.claim.sub', true);
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Finance recovery ownership could not be verified.'
      using errcode = '42501';
  end if;

  -- User-facing DELETE triggers intentionally soft-delete ledger rows. During
  -- a verified recovery only, clear the claim so those triggers permit an
  -- actual purge before the original sealed IDs are restored.
  perform set_config('request.jwt.claim.sub', '', true);

  begin
    delete from public.investment_withdrawals withdrawal
    where withdrawal.user_id = p_user_id;

    delete from public.liability_payments payment
    where payment.user_id = p_user_id;

    delete from public.account_transfers transfer
    where transfer.user_id = p_user_id;

    delete from public.transactions transaction
    where transaction.user_id = p_user_id
      and transaction.refund_of_transaction_id is not null;

    delete from public.transactions transaction
    where transaction.user_id = p_user_id;

    delete from public.goal_contributions contribution
    where contribution.user_id = p_user_id;

    delete from public.goals goal
    where goal.user_id = p_user_id;

    delete from public.liabilities liability
    where liability.user_id = p_user_id;

    delete from public.investments investment
    where investment.user_id = p_user_id;

    delete from public.accounts account
    where account.user_id = p_user_id;

    delete from private.finance_data_imports import
    where import.target_user_id = p_user_id
      and import.backup_id = p_backup_id;
  exception
    when others then
      perform set_config(
        'request.jwt.claim.sub',
        coalesce(v_original_claim, ''),
        true
      );
      raise;
  end;

  perform set_config(
    'request.jwt.claim.sub',
    coalesce(v_original_claim, ''),
    true
  );
end;
$function$;

revoke all on function private.prepare_same_account_finance_recovery(uuid, uuid)
  from public, anon, authenticated;

alter function public.import_finance_backup(jsonb)
  rename to import_sealed_finance_backup_with_category_mapping;
alter function public.import_sealed_finance_backup_with_category_mapping(jsonb)
  set schema private;

revoke all on function private.import_sealed_finance_backup_with_category_mapping(jsonb)
  from public, anon, authenticated;

create function public.import_finance_backup(p_backup jsonb)
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
  v_registered private.finance_backup_exports%rowtype;
  v_has_live_finance_data boolean;
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
    when invalid_text_representation
      or invalid_datetime_format
      or numeric_value_out_of_range
    then
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
    or v_registered.payload_sha256
      <> private.finance_backup_payload_sha256(v_unsigned)
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

  if v_target_user_id = v_source_owner_id then
    select exists (
      select 1
      from public.accounts account
      where account.user_id = v_target_user_id
        and account.status = 'active'
        and account.archived_at is null
      union all
      select 1
      from public.transactions transaction
      where transaction.user_id = v_target_user_id
        and transaction.deleted_at is null
      union all
      select 1
      from public.account_transfers transfer
      where transfer.user_id = v_target_user_id
        and transfer.deleted_at is null
      union all
      select 1 from public.investments investment
      where investment.user_id = v_target_user_id
      union all
      select 1 from public.goals goal
      where goal.user_id = v_target_user_id
      union all
      select 1 from public.liabilities liability
      where liability.user_id = v_target_user_id
      union all
      select 1 from public.goal_contributions contribution
      where contribution.user_id = v_target_user_id
      union all
      select 1 from public.liability_payments payment
      where payment.user_id = v_target_user_id
      union all
      select 1 from public.investment_withdrawals withdrawal
      where withdrawal.user_id = v_target_user_id
    )
    into v_has_live_finance_data;

    if v_has_live_finance_data then
      raise exception 'This backup belongs to this account. Same-account import is recovery-only; delete all live finance data first.'
        using errcode = 'P0001';
    end if;

    perform private.prepare_same_account_finance_recovery(
      v_target_user_id,
      v_backup_id
    );
  end if;

  return private.import_sealed_finance_backup_with_category_mapping(p_backup);
end;
$function$;

revoke all on function public.import_finance_backup(jsonb)
  from public, anon;
grant execute on function public.import_finance_backup(jsonb)
  to authenticated, service_role;

notify pgrst, 'reload schema';
