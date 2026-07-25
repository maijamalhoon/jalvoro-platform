-- Finance backups are portable across JALVORO accounts, but they may never be
-- imported into the same account that created the export. The source identity is
-- accepted only after the registered payload hash and HMAC have been verified.

create or replace function private.import_finance_backup_v2_base(p_backup jsonb)
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
    raise exception 'This backup belongs to this account. Import it into a different JALVORO account.'
      using errcode = 'P0001';
  end if;

  return private.import_sealed_finance_backup_with_category_mapping(p_backup);
end;
$function$;

revoke all on function private.import_finance_backup_v2_base(jsonb)
  from public, anon, authenticated;

grant execute on function private.import_finance_backup_v2_base(jsonb)
  to service_role;

notify pgrst, 'reload schema';
