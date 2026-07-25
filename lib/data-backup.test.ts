import { describe, expect, it } from "vitest";

import {
  FINANCE_BACKUP_DATA_KEYS,
  FINANCE_BACKUP_FORMAT,
  FINANCE_BACKUP_VERSION,
  LEGACY_FINANCE_BACKUP_FORMAT,
  LEGACY_FINANCE_BACKUP_SEAL_SCOPE,
  LEGACY_FINANCE_BACKUP_VERSION,
  type FinanceBackup,
  type LegacyFinanceBackup,
  getBackupRecordCount,
  parseFinanceImportResult,
  validateFinanceBackup,
} from "./data-backup";

function buildManifest(data: FinanceBackup["data"]): FinanceBackup["manifest"] {
  const recordCounts = Object.fromEntries(
    FINANCE_BACKUP_DATA_KEYS.map((key) => [key, data[key].length]),
  ) as FinanceBackup["manifest"]["recordCounts"];

  return {
    recordCounts,
    totalRecords: Object.values(recordCounts).reduce(
      (total, count) => total + count,
      0,
    ),
  };
}

function withTestManifest(backup: FinanceBackup): FinanceBackup {
  return {
    ...backup,
    manifest: buildManifest(backup.data),
  };
}

function makeBackup(): FinanceBackup {
  const data = Object.fromEntries(
    FINANCE_BACKUP_DATA_KEYS.map((key) => [key, [] as unknown[]]),
  ) as FinanceBackup["data"];

  return {
    format: FINANCE_BACKUP_FORMAT,
    version: FINANCE_BACKUP_VERSION,
    backupId: "11111111-1111-1111-1111-111111111111",
    exportedAt: "2026-07-22T12:00:00.000Z",
    source: {
      ownerId: "22222222-2222-2222-2222-222222222222",
      app: "jamals-finance",
    },
    data,
    manifest: buildManifest(data),
    seal: {
      issuer: "JALVORO",
      algorithm: "HMAC-SHA256",
      keyVersion: 1,
      signature: "a".repeat(64),
    },
  };
}

function makeLegacyBackup(): LegacyFinanceBackup {
  const current = makeBackup();

  return {
    ...current,
    format: LEGACY_FINANCE_BACKUP_FORMAT,
    version: LEGACY_FINANCE_BACKUP_VERSION,
    seal: {
      ...current.seal,
      scope: LEGACY_FINANCE_BACKUP_SEAL_SCOPE,
    },
  };
}

describe("finance backup validation", () => {
  it("accepts a complete versioned backup", () => {
    expect(validateFinanceBackup(makeBackup()).ok).toBe(true);
  });

  it("accepts a server-sealed version 1 bridge backup", () => {
    const backup = makeLegacyBackup();
    const validation = validateFinanceBackup(backup);

    expect(validation.ok).toBe(true);
    if (validation.ok) expect(getBackupRecordCount(validation.value)).toBe(0);
  });

  it("rejects unsigned historical version 1 files", () => {
    const backup = makeLegacyBackup();
    delete (backup as Partial<LegacyFinanceBackup>).seal;

    expect(validateFinanceBackup(backup)).toEqual({
      ok: false,
      error: "This backup file is not sealed by JALVORO.",
    });
  });

  it("rejects legacy files without the exact compatibility scope", () => {
    const backup = makeLegacyBackup();
    (backup.seal as Record<string, unknown>).scope = "wrong-scope";

    expect(validateFinanceBackup(backup)).toEqual({
      ok: false,
      error: "This legacy backup file has an unsupported security seal.",
    });
  });

  it("rejects a backup with a missing data section", () => {
    const backup = makeBackup();
    delete (backup.data as Record<string, unknown>).transactions;

    expect(validateFinanceBackup(backup)).toEqual({
      ok: false,
      error: "The transactions section in this backup is invalid.",
    });
  });

  it("counts all finance records", () => {
    const backup = makeBackup();
    backup.data.accounts.push({ id: "one" });
    backup.data.transactions.push({ id: "two" }, { id: "three" });

    const validation = validateFinanceBackup(withTestManifest(backup));
    expect(validation.ok).toBe(true);
    if (validation.ok) expect(getBackupRecordCount(validation.value)).toBe(3);
  });

  it("validates a complete-data manifest", () => {
    const backup = makeBackup();
    backup.data.accounts.push({ id: "one" });
    backup.data.goals.push({ id: "two" });

    const sealedBackup = withTestManifest(backup);
    expect(sealedBackup.manifest).toMatchObject({
      totalRecords: 2,
      recordCounts: { accounts: 1, goals: 1 },
    });
    expect(validateFinanceBackup(sealedBackup).ok).toBe(true);
  });

  it("rejects a backup whose manifest no longer matches its data", () => {
    const backup = withTestManifest(makeBackup());
    backup.data.transactions.push({ id: "added-after-export" });

    expect(validateFinanceBackup(backup)).toEqual({
      ok: false,
      error:
        "The transactions section did not pass the backup integrity check.",
    });
  });

  it("normalizes the import RPC response", () => {
    expect(
      parseFinanceImportResult({
        ok: true,
        alreadyImported: false,
        totalAdded: "3",
        added: { accounts: 1, transactions: "2" },
        skipped: { accounts: 0 },
        restored: { notificationPreferences: "1" },
        sealed: true,
      }),
    ).toMatchObject({
      totalAdded: 3,
      added: { accounts: 1, transactions: 2 },
      skipped: { accounts: 0 },
      restored: { notificationPreferences: 1 },
      sealed: true,
    });
  });
});
