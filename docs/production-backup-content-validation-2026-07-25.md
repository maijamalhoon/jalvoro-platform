# Production backup content-validation deployment

Date: 2026-07-25

This checkpoint promotes the current hardened `main` baseline to production with the sealed finance backup contract already present in source.

Required behavior:

- The import path ignores the uploaded file name and extension.
- The complete JSON payload is parsed and validated by its internal format, version, identity, manifest, required data sections, record counts, and JALVORO HMAC seal.
- The server remains authoritative for signature and export-registry verification.
- A backup whose semantic content changed after export is rejected without changing user data.
- A valid sealed backup is portable only to a different JALVORO account.
- The browser exports the final server-sealed payload without appending or rewriting fields after sealing.
- Signed legacy bridge backups remain supported; unsigned historical version-1 files remain rejected.

Production verification must use a fresh export from the source account and import that untouched payload into a different authenticated account. Renaming the file must not affect acceptance.
