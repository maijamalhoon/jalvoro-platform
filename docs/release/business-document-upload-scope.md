# Business document upload scope

Status: excluded from this launch candidate.

Existing tenant-isolated business documents remain readable and downloadable by authorized members. Creating new document folders, uploading files, and uploading new versions are not launch capabilities until a server-side quarantine pipeline and malware scanner have been implemented and certified.

## Enforced controls

- The application does not render upload or new-version controls.
- The client handler fails closed even if called unexpectedly.
- Migration `20260726120000_disable_business_document_uploads_until_scanning.sql` denies direct inserts into the `business-documents` bucket.
- The same migration revokes authenticated access to the internal prepare and finalize functions.
- Public prepare and finalize RPCs return a controlled rejection.
- Existing objects are not deleted or modified.

The database migration must not be applied to production until the backup and isolated replay gates pass. Until that happens, production retains its current behavior and the release remains not ready.

## Re-enablement gate

Re-enablement requires a separate reviewed migration and all of the following evidence:

1. authenticated server-only upload endpoint;
2. quarantine storage that is not user-downloadable;
3. signature, MIME, and extension agreement;
4. corrupt-file and parser failure handling;
5. executable and polyglot rejection;
6. malware scan with explicit clean verdict;
7. archive entry-count, decompressed-size, and nesting limits if archives are supported;
8. image decode and normalized re-encoding where applicable;
9. deletion of every rejected or abandoned quarantined object;
10. cross-tenant, authorization, rate-limit, and audit-log tests.

## Rollback

Before production activation, rollback is deletion of the unapplied migration commit. After a verified database deployment, rollback requires a reviewed forward migration that restores the exact insert policy and RPC grants from `20260723055116_business_company_documents_records_engine.sql`; do not edit migration history or manually bypass the gate.
