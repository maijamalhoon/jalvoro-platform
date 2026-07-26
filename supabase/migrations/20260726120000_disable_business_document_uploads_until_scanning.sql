begin;

-- Launch scope: existing business documents remain readable, but new uploads
-- stay disabled until a server-side quarantine and malware scanner are
-- implemented and certified. This migration does not delete stored objects.
drop policy if exists business_documents_storage_insert on storage.objects;
create policy business_documents_storage_insert_disabled
  on storage.objects
  for insert
  to authenticated
  with check (false);

revoke execute on function private.prepare_business_document_upload_internal(
  uuid, uuid, text, text, uuid, text, text, bigint, text, text[], text, uuid, text
) from authenticated;
revoke execute on function private.finalize_business_document_upload_internal(
  uuid, uuid, text
) from authenticated;

create or replace function public.prepare_business_document_upload(
  p_business_id uuid,
  p_document_id uuid,
  p_title text,
  p_document_type text,
  p_folder_id uuid,
  p_original_file_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_description text default null,
  p_tags text[] default '{}',
  p_related_type text default null,
  p_related_id uuid default null,
  p_version_notes text default null
)
returns jsonb
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'New business document uploads are unavailable until malware scanning is certified.'
    using errcode = '55000';
end;
$$;

create or replace function public.finalize_business_document_upload(
  p_business_id uuid,
  p_version_id uuid,
  p_checksum_sha256 text default null
)
returns jsonb
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'New business document uploads are unavailable until malware scanning is certified.'
    using errcode = '55000';
end;
$$;

revoke all on function public.prepare_business_document_upload(
  uuid, uuid, text, text, uuid, text, text, bigint, text, text[], text, uuid, text
) from public, anon;
revoke all on function public.finalize_business_document_upload(
  uuid, uuid, text
) from public, anon;
grant execute on function public.prepare_business_document_upload(
  uuid, uuid, text, text, uuid, text, text, bigint, text, text[], text, uuid, text
) to authenticated;
grant execute on function public.finalize_business_document_upload(
  uuid, uuid, text
) to authenticated;

comment on function public.prepare_business_document_upload(
  uuid, uuid, text, text, uuid, text, text, bigint, text, text[], text, uuid, text
) is 'Launch safety gate: rejects uploads until malware scanning is certified.';
comment on function public.finalize_business_document_upload(
  uuid, uuid, text
) is 'Launch safety gate: rejects upload finalization until malware scanning is certified.';

commit;
