export const FINANCE_BACKUP_FORMAT = "jalvoro-finance-backup";
export const FINANCE_BACKUP_VERSION = 2;
export const LEGACY_FINANCE_BACKUP_FORMAT = "jamals-finance-backup";
export const LEGACY_FINANCE_BACKUP_VERSION = 1;
export const LEGACY_FINANCE_BACKUP_SEAL_SCOPE = "legacy-client-bridge-v1";
export const MAX_FINANCE_BACKUP_BYTES = 25 * 1024 * 1024;
export const OPEN_FINANCE_DATA_IMPORT_EVENT = "jamal-open-data-import";
export const FINANCE_DATA_IMPORTED_EVENT = "jamal-finance-data-imported";

export const FINANCE_BACKUP_DATA_KEYS = [
  "accounts",
  "categories",
  "investments",
  "goals",
  "liabilities",
  "goalContributions",
  "transactions",
  "accountTransfers",
  "liabilityPayments",
  "investmentWithdrawals",
] as const;

type BackupDataKey = (typeof FINANCE_BACKUP_DATA_KEYS)[number];

type JsonRecord = Record<string, unknown>;

export type FinanceBackupManifest = {
  totalRecords: number;
  recordCounts: Record<BackupDataKey, number>;
};

export type FinanceBackupSeal = {
  issuer: "JALVORO";
  algorithm: "HMAC-SHA256";
  keyVersion: number;
  signature: string;
};

export type LegacyFinanceBackupSeal = FinanceBackupSeal & {
  scope: typeof LEGACY_FINANCE_BACKUP_SEAL_SCOPE;
};

export type FinanceBackupClientPreferences = {
  currency?: string;
  dateFormat?: string;
  compactMode?: boolean;
  themeMode?: string;
};

export type FinanceBackup = JsonRecord & {
  format: typeof FINANCE_BACKUP_FORMAT;
  version: typeof FINANCE_BACKUP_VERSION;
  backupId: string;
  exportedAt: string;
  source: JsonRecord & {
    ownerId: string;
  };
  data: Record<BackupDataKey, unknown[]>;
  manifest: FinanceBackupManifest;
  seal: FinanceBackupSeal;
};

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
  seal: LegacyFinanceBackupSeal;
};

export type ImportableFinanceBackup = FinanceBackup | LegacyFinanceBackup;

export type FinanceImportResult = {
  ok: boolean;
  alreadyImported: boolean;
  backupId?: string;
  totalAdded: number;
  added: Record<string, number>;
  skipped: Record<string, number>;
  restored?: Record<string, number>;
  clientPreferences?: FinanceBackupClientPreferences;
  sealed: boolean;
};

export type BackupValidationResult =
  | { ok: true; value: ImportableFinanceBackup }
  | { ok: false; error: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/i;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNonNegativeInteger(value: unknown) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : null;
}

export function getBackupRecordCount(backup: ImportableFinanceBackup) {
  return FINANCE_BACKUP_DATA_KEYS.reduce(
    (total, key) => total + backup.data[key].length,
    0,
  );
}

function validateManifest(
  value: JsonRecord,
  data: Record<BackupDataKey, unknown[]>,
): string | null {
  if (!isRecord(value.manifest) || !isRecord(value.manifest.recordCounts)) {
    return "This backup file is missing its sealed integrity summary.";
  }

  for (const key of FINANCE_BACKUP_DATA_KEYS) {
    const expected = normalizeNonNegativeInteger(
      value.manifest.recordCounts[key],
    );
    if (expected === null || expected !== data[key].length) {
      return `The ${key} section did not pass the backup integrity check.`;
    }
  }

  const totalRecords = normalizeNonNegativeInteger(
    value.manifest.totalRecords,
  );
  const actualTotal = FINANCE_BACKUP_DATA_KEYS.reduce(
    (total, key) => total + data[key].length,
    0,
  );

  if (totalRecords === null || totalRecords !== actualTotal) {
    return "This backup file did not pass the complete-data integrity check.";
  }

  return null;
}

function validateSeal(value: JsonRecord, legacy: boolean): string | null {
  if (!isRecord(value.seal)) {
    return "This backup file is not sealed by JALVORO.";
  }

  if (
    value.seal.issuer !== "JALVORO" ||
    value.seal.algorithm !== "HMAC-SHA256"
  ) {
    return "This backup file has an unsupported security seal.";
  }

  if (
    legacy &&
    value.seal.scope !== LEGACY_FINANCE_BACKUP_SEAL_SCOPE
  ) {
    return "This legacy backup file has an unsupported security seal.";
  }

  const keyVersion = normalizeNonNegativeInteger(value.seal.keyVersion);
  if (keyVersion === null || keyVersion < 1) {
    return "This backup file has an invalid security key version.";
  }

  if (
    typeof value.seal.signature !== "string" ||
    !SIGNATURE_PATTERN.test(value.seal.signature)
  ) {
    return "This backup file has an invalid security signature.";
  }

  return null;
}

export function validateFinanceBackup(value: unknown): BackupValidationResult {
  if (!isRecord(value)) {
    return { ok: false, error: "This backup file is invalid or damaged." };
  }

  const legacy = value.format === LEGACY_FINANCE_BACKUP_FORMAT;
  if (!legacy && value.format !== FINANCE_BACKUP_FORMAT) {
    return { ok: false, error: "This is not a sealed JALVORO backup file." };
  }

  const supportedVersion = legacy
    ? value.version === LEGACY_FINANCE_BACKUP_VERSION
    : value.version === FINANCE_BACKUP_VERSION;
  if (!supportedVersion) {
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
  const manifestError = validateManifest(value, data);
  if (manifestError) return { ok: false, error: manifestError };

  const sealError = validateSeal(value, legacy);
  if (sealError) return { ok: false, error: sealError };

  return {
    ok: true,
    value: value as ImportableFinanceBackup,
  };
}

export function parseFinanceImportResult(value: unknown): FinanceImportResult | null {
  if (!isRecord(value) || value.ok !== true) return null;

  const added = isRecord(value.added) ? value.added : {};
  const skipped = isRecord(value.skipped) ? value.skipped : {};
  const restored = isRecord(value.restored) ? value.restored : {};
  const clientPreferences = isRecord(value.clientPreferences)
    ? value.clientPreferences
    : undefined;

  const normalizeCounts = (counts: JsonRecord) =>
    Object.fromEntries(
      Object.entries(counts).map(([key, count]) => [
        key,
        Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0,
      ]),
    );

  const parsedAdded = normalizeCounts(added);
  const totalAdded = Number(value.totalAdded);

  return {
    ok: true,
    alreadyImported: value.alreadyImported === true,
    backupId: typeof value.backupId === "string" ? value.backupId : undefined,
    totalAdded: Number.isFinite(totalAdded)
      ? Math.max(0, totalAdded)
      : Object.values(parsedAdded).reduce((sum, count) => sum + count, 0),
    added: parsedAdded,
    skipped: normalizeCounts(skipped),
    restored: normalizeCounts(restored),
    clientPreferences:
      clientPreferences as FinanceBackupClientPreferences | undefined,
    sealed: value.sealed === true,
  };
}
