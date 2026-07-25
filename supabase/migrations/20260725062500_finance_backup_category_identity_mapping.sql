-- Reuse an existing active target category when a portable backup contains the
-- same normalized category name and type. This prevents duplicate-category
-- failures while keeping every imported transaction linked to a valid target ID.

create table if not exists private.finance_import_id_overrides (
  target_user_id uuid not null,
  source_owner_id uuid not null,
  source_table text not null,
  source_record_id uuid not null,
  target_record_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (
    target_user_id,
    source_owner_id,
    source_table,
    source_record_id
  ),
  constraint finance_import_id_overrides_table_name
    check (source_table in ('categories'))
);

create index if not exists finance_import_id_overrides_target_record_idx
  on private.finance_import_id_overrides (
    target_user_id,
    source_table,
    target_record_id
  );

alter table private.finance_import_id_overrides enable row level security;
revoke all on table private.finance_import_id_overrides
  from public, anon, authenticated;

create or replace function private.finance_import_uuid(
  p_target_user_id uuid,
  p_source_owner_id uuid,
  p_source_table text,
  p_source_record_id uuid
)
returns uuid
language plpgsql
stable
strict
set search_path = pg_catalog, private
as $function$
declare
  v_override_id uuid;
  v_digest text;
begin
  if p_target_user_id = p_source_owner_id then
    return p_source_record_id;
  end if;

  select mapping.target_record_id
  into v_override_id
  from private.finance_import_id_overrides mapping
  where mapping.target_user_id = p_target_user_id
    and mapping.source_owner_id = p_source_owner_id
    and mapping.source_table = p_source_table
    and mapping.source_record_id = p_source_record_id;

  if found then
    return v_override_id;
  end if;

  v_digest := md5(
    p_target_user_id::text || '|' ||
    p_source_owner_id::text || '|' ||
    p_source_table || '|' ||
    p_source_record_id::text
  );

  return (
    substr(v_digest, 1, 8) || '-' ||
    substr(v_digest, 9, 4) || '-' ||
    substr(v_digest, 13, 4) || '-' ||
    substr(v_digest, 17, 4) || '-' ||
    substr(v_digest, 21, 12)
  )::uuid;
end;
$function$;

revoke all on function private.finance_import_uuid(uuid, uuid, text, uuid)
  from public, anon, authenticated;

alter function public.import_finance_backup(jsonb)
  rename to import_sealed_finance_backup_base;
alter function public.import_sealed_finance_backup_base(jsonb)
  set schema private;

revoke all on function private.import_sealed_finance_backup_base(jsonb)
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
  v_category jsonb;
  v_source_category_id uuid;
  v_existing_category_id uuid;
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

  if v_target_user_id <> v_source_owner_id then
    if jsonb_typeof(p_backup#>'{data,categories}') <> 'array' then
      raise exception 'The categories section in this backup is invalid.'
        using errcode = '22023';
    end if;

    for v_category in
      select value
      from jsonb_array_elements(p_backup#>'{data,categories}')
    loop
      if jsonb_typeof(v_category) <> 'object' then
        raise exception 'Backup contains an invalid category row.'
          using errcode = '22023';
      end if;

      begin
        v_source_category_id := (v_category->>'id')::uuid;
      exception
        when invalid_text_representation then
          raise exception 'Backup contains an invalid category identity.'
            using errcode = '22023';
      end;

      v_existing_category_id := null;

      if nullif(v_category->>'archived_at', '') is null
        and nullif(btrim(v_category->>'name'), '') is not null
        and nullif(btrim(v_category->>'type'), '') is not null
      then
        select category.id
        into v_existing_category_id
        from public.categories category
        where category.user_id = v_target_user_id
          and category.type = v_category->>'type'
          and lower(btrim(category.name)) = lower(btrim(v_category->>'name'))
          and category.archived_at is null
        order by category.created_at nulls first, category.id
        limit 1;
      end if;

      if v_existing_category_id is not null then
        insert into private.finance_import_id_overrides (
          target_user_id,
          source_owner_id,
          source_table,
          source_record_id,
          target_record_id,
          updated_at
        ) values (
          v_target_user_id,
          v_source_owner_id,
          'categories',
          v_source_category_id,
          v_existing_category_id,
          now()
        )
        on conflict (
          target_user_id,
          source_owner_id,
          source_table,
          source_record_id
        ) do update
        set
          target_record_id = excluded.target_record_id,
          updated_at = now();
      end if;
    end loop;
  end if;

  return private.import_sealed_finance_backup_base(p_backup);
end;
$function$;

revoke all on function public.import_finance_backup(jsonb)
  from public, anon;
grant execute on function public.import_finance_backup(jsonb)
  to authenticated, service_role;

notify pgrst, 'reload schema';
