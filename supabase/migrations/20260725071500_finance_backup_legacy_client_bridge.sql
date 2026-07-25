-- Temporary secure bridge for the previously deployed version-1 browser client.
-- New clients use the explicit jsonb export argument and receive version 2.
-- Old clients call the zero-argument overload and receive a version-1 envelope
-- whose finance core is HMAC sealed. Their locally appended auth/client display
-- preferences are ignored; import restores the original registered v2 payload.

alter table private.finance_backup_exports
  add column if not exists sealed_payload jsonb;

create or replace function private.finance_backup_legacy_core(p_backup jsonb)
returns jsonb
language sql
immutable
strict
set search_path = pg_catalog
as $function$
  select jsonb_build_object(
    'backupId', p_backup->'backupId',
    'exportedAt', p_backup->'exportedAt',
    'source', p_backup->'source',
    'scope', p_backup->'scope',
    'data', p_backup->'data',
    'manifest', p_backup->'manifest',
    'profileSnapshot',
      coalesce(p_backup->'profileSnapshot', '{}'::jsonb) - 'auth',
    'preferencesSnapshot', jsonb_build_object(
      'notifications', p_backup#>'{preferencesSnapshot,notifications}',
      'notificationStates', p_backup#>'{preferencesSnapshot,notificationStates}',
      'ai', p_backup#>'{preferencesSnapshot,ai}'
    )
  );
$function$;

revoke all on function private.finance_backup_legacy_core(jsonb)
  from public, anon, authenticated;

alter function public.export_finance_backup(jsonb)
  rename to export_finance_backup_v2_base;
alter function public.export_finance_backup_v2_base(jsonb)
  set schema private;

revoke all on function private.export_finance_backup_v2_base(jsonb)
  from public, anon, authenticated;

create function public.export_finance_backup(p_client_snapshot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_payload jsonb;
  v_backup_id uuid;
begin
  v_payload := private.export_finance_backup_v2_base(
    coalesce(p_client_snapshot, '{}'::jsonb)
  );
  v_backup_id := (v_payload->>'backupId')::uuid;

  update private.finance_backup_exports registry
  set sealed_payload = v_payload
  where registry.backup_id = v_backup_id
    and registry.source_user_id = auth.uid();

  if not found then
    raise exception 'The sealed backup registry could not be finalized.'
      using errcode = '55000';
  end if;

  return v_payload;
end;
$function$;

revoke all on function public.export_finance_backup(jsonb)
  from public, anon;
grant execute on function public.export_finance_backup(jsonb)
  to authenticated, service_role;

create function public.export_finance_backup()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_v2 jsonb;
  v_core jsonb;
  v_key_version smallint;
  v_signature text;
begin
  v_v2 := public.export_finance_backup('{}'::jsonb);
  v_key_version := (v_v2#>>'{seal,keyVersion}')::smallint;
  v_core := private.finance_backup_legacy_core(v_v2);
  v_signature := private.finance_backup_payload_hmac(v_core, v_key_version);

  if v_signature is null then
    raise exception 'Legacy client backup sealing failed.'
      using errcode = '55000';
  end if;

  return jsonb_set(
    jsonb_set(
      v_v2,
      '{format}',
      to_jsonb('jamals-finance-backup'::text),
      true
    ),
    '{version}',
    '1'::jsonb,
    true
  ) || jsonb_build_object(
    'seal', jsonb_build_object(
      'issuer', 'JALVORO',
      'algorithm', 'HMAC-SHA256',
      'keyVersion', v_key_version,
      'scope', 'legacy-client-bridge-v1',
      'signature', v_signature
    )
  );
end;
$function$;

revoke all on function public.export_finance_backup()
  from public, anon;
grant execute on function public.export_finance_backup()
  to authenticated, service_role;

alter function public.import_finance_backup(jsonb)
  rename to import_finance_backup_v2_base;
alter function public.import_finance_backup_v2_base(jsonb)
  set schema private;

revoke all on function private.import_finance_backup_v2_base(jsonb)
  from public, anon, authenticated;

create function public.import_finance_backup(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_backup_id uuid;
  v_source_owner_id uuid;
  v_exported_at timestamptz;
  v_key_version smallint;
  v_signature text;
  v_expected_signature text;
  v_file_core jsonb;
  v_registered_core jsonb;
  v_registered private.finance_backup_exports%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_backup is null or jsonb_typeof(p_backup) <> 'object' then
    raise exception 'This backup file is invalid.' using errcode = '22023';
  end if;

  if p_backup->>'format' = 'jalvoro-finance-backup'
    and p_backup->>'version' = '2'
  then
    return private.import_finance_backup_v2_base(p_backup);
  end if;

  if p_backup->>'format' <> 'jamals-finance-backup'
    or p_backup->>'version' <> '1'
    or p_backup#>>'{seal,issuer}' <> 'JALVORO'
    or p_backup#>>'{seal,algorithm}' <> 'HMAC-SHA256'
    or p_backup#>>'{seal,scope}' <> 'legacy-client-bridge-v1'
  then
    raise exception 'This backup version is not supported. Export a new sealed JALVORO backup.'
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

  select registry.*
  into v_registered
  from private.finance_backup_exports registry
  where registry.backup_id = v_backup_id;

  if not found or v_registered.sealed_payload is null then
    raise exception 'This legacy backup was not issued by the current JALVORO backup service.'
      using errcode = '22023';
  end if;

  if v_registered.source_user_id <> v_source_owner_id
    or v_registered.exported_at <> v_exported_at
    or v_registered.key_version <> v_key_version
  then
    raise exception 'This backup was changed after export.'
      using errcode = '22023';
  end if;

  v_file_core := private.finance_backup_legacy_core(p_backup);
  v_registered_core := private.finance_backup_legacy_core(
    v_registered.sealed_payload
  );
  v_expected_signature := private.finance_backup_payload_hmac(
    v_file_core,
    v_key_version
  );

  if v_expected_signature is null
    or v_signature <> v_expected_signature
    or private.finance_backup_payload_sha256(v_file_core)
      <> private.finance_backup_payload_sha256(v_registered_core)
  then
    raise exception 'This backup was changed after export.'
      using errcode = '22023';
  end if;

  return private.import_finance_backup_v2_base(
    v_registered.sealed_payload
  );
end;
$function$;

revoke all on function public.import_finance_backup(jsonb)
  from public, anon;
grant execute on function public.import_finance_backup(jsonb)
  to authenticated, service_role;

notify pgrst, 'reload schema';
