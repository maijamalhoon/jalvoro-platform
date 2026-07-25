import {
  FINANCE_BACKUP_DATA_KEYS,
  isRecord,
  validateFinanceBackup,
  type FinanceBackup,
  type FinanceBackupManifest,
} from "./data-backup";

export const LEGACY_FINANCE_BACKUP_FORMAT = "jamals-finance-backup";
export const LEGACY_FINANCE_BACKUP_VERSION = 1;
export const LEGACY_FINANCE_BACKUP_SEAL_SCOPE = "legacy-client-bridge-v1";

type BackupDataKey = (typeof FINANCE_BACKUP_DATA_KEYS)[number];
type JsonRecord = Record<string, unknown>;

export type LegacyFinanceBackup = JsonRecord & {
  format: typeof LEGACY_FINANCE_BACKUP_FORMAT;
  version: typeof LEGACY_FINANCE_BACKUP_VERSION;
  backupId: string;
  exportedAt: string;
  source: JsonRecord & {
    ownerId: string;
  };
  data: Record<BackupDataKey, unknown[]>;
  manifest: FinanceBackupManifest;
  seal: JsonRecord & {
    issuer: "JALVORO";
    algorithm: "HMAC-SHA256";
    keyVersion: number;
    scope: typeof LEGACY_FINANCE_BACKUP_SEAL_SCOPE;
    signature: string;
  };
};

export type ImportableFinanceBackup = FinanceBackup | LegacyFinanceBackup;

export type ImportableBackupValidationResult =
  | { ok: true; value: ImportableFinanceBackup }
  | { ok: false; error: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/i;

function normalizeNonNegativeInteger(value: unknown) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : null;
}

function validateLegacyManifest(
  value: JsonRecord,
  data: Record<BackupDataKey, unknown[]>,
): string | null {
  if (!isRecord(value.manifest) || !isRecord(value.manifest.recordCounts)) {
    return "This legacy backup file is missing its sealed integrity summary.";
  }

  for (const key of FINANCE_BACKUP_DATA_KEYS) {
    const expected = normalizeNonNegativeInteger(
      value.manifest.recordCounts[key],
    );
    if (expected === null || expected !== data[key].length) {
      return `The ${key} section did not pass the backup integrity check.`;
    }
  }

  const totalRecords = normalizeNonNegativeInteger(value.manifest.totalRecords);
  const actualTotal = FINANCE_BACKUP_DATA_KEYS.reduce(
    (total, key) => total + data[key].length,
    0,
  );

  if (totalRecords === null || totalRecords !== actualTotal) {
    return "This backup file did not pass the complete-data integrity check.";
  }

  return null;
}

function validateLegacyFinanceBackup(
  value: JsonRecord,
): ImportableBackupValidationResult {
  if (value.version !== LEGACY_FINANCE_BACKUP_VERSION) {
    return {
      ok: false,
      error: "This backup version is not supported. Export a new JALVORO backup.",
    };
  }

  if (
    typeof value.backupId !== "string" ||
    !UUID_PATTERN.test(value.backupId)
  ) {
    return { ok: false, error: "This backup file has an invalid identity." };
  }

  if (
    typeof value.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(value.exportedAt))
  ) {
    return { ok: false, error: "This backup file has an invalid export date." };
  }

  if (
    !isRecord(value.source) ||
    typeof value.source.ownerId !== "string" ||
    !UUID_PATTERN.test(value.source.ownerId)
  ) {
    return { ok: false, error: "This backup file has an invalid owner identity." };
  }

  if (!isRecord(value.data)) {
    return { ok: false, error: "This backup file does not contain finance data." };
  }

  for (const key of FINANCE_BACKUP_DATA_KEYS) {
    if (!Array.isArray(value.data[key])) {
      return {
        ok: false,
        error: `The ${key} section in this backup is invalid.`,
      };
    }
  }

  const data = value.data as Record<BackupDataKey, unknown[]>;
  const manifestError = validateLegacyManifest(value, data);
  if (manifestError) return { ok: false, error: manifestError };

  if (!isRecord(value.seal)) {
    return {
      ok: false,
      error: "This legacy backup is not sealed by JALVORO.",
    };
  }

  if (
    value.seal.issuer !== "JALVORO" ||
    value.seal.algorithm !== "HMAC-SHA256" ||
    value.seal.scope !== LEGACY_FINANCE_BACKUP_SEAL_SCOPE
  ) {
    return {
      ok: false,
      error: "This legacy backup has an unsupported security seal.",
    };
  }

  const keyVersion = normalizeNonNegativeInteger(value.seal.keyVersion);
  if (keyVersion === null || keyVersion < 1) {
    return {
      ok: false,
      error: "This legacy backup has an invalid security key version.",
    };
  }

  if (
    typeof value.seal.signature !== "string" ||
    !SIGNATURE_PATTERN.test(value.seal.signature)
  ) {
    return {
      ok: false,
      error: "This legacy backup has an invalid security signature.",
    };
  }

  return { ok: true, value: value as LegacyFinanceBackup };
}

export function validateImportableFinanceBackup(
  value: unknown,
): ImportableBackupValidationResult {
  if (!isRecord(value)) {
    return { ok: false, error: "This backup file is invalid or damaged." };
  }

  if (value.format === LEGACY_FINANCE_BACKUP_FORMAT) {
    return validateLegacyFinanceBackup(value);
  }

  return validateFinanceBackup(value);
}

export function getImportableBackupRecordCount(
  backup: ImportableFinanceBackup,
) {
  return FINANCE_BACKUP_DATA_KEYS.reduce(
    (total, key) => total + backup.data[key].length,
    0,
  );
}

export function parseBackupFileText(text: string): unknown {
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}
