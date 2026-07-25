-- Cover the private export registry foreign key used during seal-key rotation.
create index if not exists finance_backup_exports_key_version_idx
  on private.finance_backup_exports (key_version);
