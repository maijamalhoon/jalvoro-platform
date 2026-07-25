# Finance backup security contract

JALVORO personal-finance backups use format version 2.

- The final payload is built and sealed on the server.
- The seal uses a versioned server-only HMAC-SHA256 key and a canonical SHA-256 payload digest.
- Backup issuance is recorded in a private export registry.
- File names and extensions are not trusted; signed internal content is authoritative.
- Any semantic content change after export causes import rejection before finance data is mutated.
- Cross-account imports preserve existing target data, deterministically remap linked identities, and reuse matching active target categories.
- Same-account import is recovery-only and is blocked while live finance data remains.
- Recovery supports JALVORO's history-preserving deletion model: archived accounts, soft-deleted ledger rows, and removed source modules.
- Raw import helpers, seal keys, registries, mapping overrides, and recovery purge functions are private and unavailable to authenticated clients.

The import animation is presentation-only and remains independent from this backend security contract.
