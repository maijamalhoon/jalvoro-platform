"use client";

import { APP_NAME } from "@/lib/brand";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  CURRENCY_CHANGE_EVENT,
  CURRENCY_STORAGE_KEY,
  isSupportedCurrency,
} from "@/lib/currency";
import {
  FINANCE_DATA_IMPORTED_EVENT,
  MAX_FINANCE_BACKUP_BYTES,
  OPEN_FINANCE_DATA_IMPORT_EVENT,
  getBackupRecordCount,
  parseFinanceImportResult,
  validateFinanceBackup,
  type FinanceBackupClientPreferences,
} from "@/lib/data-backup";
import { createClient } from "@/lib/supabase/client";
import { applyThemePreference, isThemePreference } from "@/lib/theme";

type TransferPhase =
  | "idle"
  | "dragging"
  | "impact"
  | "whiteout"
  | "revealing"
  | "error";

const IMPORT_IMPACT_DURATION_MS = 4_200;
const IMPORT_REFRESH_SETTLE_MS = 180;
const IMPORT_REVEAL_DURATION_MS = 1_450;
const DATE_FORMAT_STORAGE_KEY = "jamal-date-format";
const COMPACT_MODE_STORAGE_KEY = "jamal-compact-dashboard";
const DATE_FORMATS = new Set(["MMM d, yyyy", "dd MMM yyyy", "yyyy-MM-dd"]);

function hasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function getFriendlyImportError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "";

  if (
    /belongs to this account|same-account|recovery-only|delete all finance data/i.test(
      message,
    )
  ) {
    return "This backup was exported from this account. Import it into a different JALVORO account.";
  }

  if (
    /seal|signature|issued by JALVORO|changed after export|tamper/i.test(message)
  ) {
    return "This backup is not an original sealed JALVORO export or its contents were changed. No data was added.";
  }

  if (/too large|too many records/i.test(message)) {
    return "This backup is too large to import safely.";
  }

  if (/version/i.test(message)) {
    return "This backup version is not supported. Export a new sealed JALVORO backup.";
  }

  if (/integrity|complete-data|did not pass/i.test(message)) {
    return "This backup is incomplete or was changed after export. No data was added.";
  }

  if (/relation|reference|foreign key|incomplete/i.test(message)) {
    return "This backup is incomplete or damaged. No data was changed.";
  }

  if (/fetch|network|timeout|connection|could not be verified/i.test(message)) {
    return "The import result could not be confirmed. Drop the same sealed backup again; duplicate protection will verify it safely.";
  }

  return "This backup file is invalid or damaged. No data was changed.";
}

function applyImportedClientPreferences(
  preferences: FinanceBackupClientPreferences | undefined,
) {
  if (!preferences) return;

  if (isSupportedCurrency(preferences.currency)) {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, preferences.currency);
    window.dispatchEvent(
      new CustomEvent(CURRENCY_CHANGE_EVENT, {
        detail: { currency: preferences.currency },
      }),
    );
  }

  if (
    typeof preferences.dateFormat === "string" &&
    DATE_FORMATS.has(preferences.dateFormat)
  ) {
    window.localStorage.setItem(
      DATE_FORMAT_STORAGE_KEY,
      preferences.dateFormat,
    );
  }

  if (typeof preferences.compactMode === "boolean") {
    window.localStorage.setItem(
      COMPACT_MODE_STORAGE_KEY,
      String(preferences.compactMode),
    );
  }

  if (isThemePreference(preferences.themeMode)) {
    applyThemePreference(preferences.themeMode);
  }
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getImpactDelay() {
  return prefersReducedMotion() ? 320 : IMPORT_IMPACT_DURATION_MS;
}

function getRefreshSettleDelay() {
  return prefersReducedMotion() ? 50 : IMPORT_REFRESH_SETTLE_MS;
}

function getRevealDelay() {
  return prefersReducedMotion() ? 360 : IMPORT_REVEAL_DURATION_MS;
}

export default function FinanceDataTransfer() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const busyRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cinematicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<TransferPhase>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const busy =
    phase === "impact" || phase === "whiteout" || phase === "revealing";

  const clearResetTimer = useCallback(() => {
    if (!resetTimerRef.current) return;
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  }, []);

  const clearCinematicTimer = useCallback(() => {
    if (!cinematicTimerRef.current) return;
    clearTimeout(cinematicTimerRef.current);
    cinematicTimerRef.current = null;
  }, []);

  const scheduleReset = useCallback(
    (delay = 500) => {
      clearResetTimer();
      resetTimerRef.current = setTimeout(() => {
        setPhase("idle");
        setStatusMessage("");
        resetTimerRef.current = null;
      }, delay);
    },
    [clearResetTimer],
  );

  const waitForCinematicDelay = useCallback(
    (delay: number) =>
      new Promise<void>((resolve) => {
        clearCinematicTimer();
        cinematicTimerRef.current = setTimeout(() => {
          cinematicTimerRef.current = null;
          resolve();
        }, delay);
      }),
    [clearCinematicTimer],
  );

  const playImpactToWhiteout = useCallback(async () => {
    setPhase("impact");
    await waitForCinematicDelay(getImpactDelay());
    setPhase("whiteout");
  }, [waitForCinematicDelay]);

  const playContentReveal = useCallback(async () => {
    await waitForCinematicDelay(getRefreshSettleDelay());
    setPhase("revealing");
    await waitForCinematicDelay(getRevealDelay());
  }, [waitForCinematicDelay]);

  const importFile = useCallback(
    async (file: File) => {
      if (busyRef.current) return;
      busyRef.current = true;

      clearResetTimer();
      clearCinematicTimer();

      let impactPromise: Promise<void> | null = null;

      try {
        // The filename and extension are intentionally ignored. Only the
        // signed internal JALVORO payload decides whether the file is accepted.
        if (file.size <= 0 || file.size > MAX_FINANCE_BACKUP_BYTES) {
          const error = "This backup is empty or too large to import safely.";
          setStatusMessage(error);
          setPhase("error");
          toast.error(error);
          scheduleReset(2200);
          return;
        }

        // One uninterrupted cinematic starts immediately. Parsing, validation,
        // duplicate protection and the RPC all run behind the same cardless layer.
        setStatusMessage("Importing sealed finance backup.");
        impactPromise = playImpactToWhiteout();

        let parsed: unknown;
        try {
          parsed = JSON.parse(await file.text());
        } catch {
          throw new Error("This backup file is invalid or damaged.");
        }

        const validation = validateFinanceBackup(parsed);
        if (!validation.ok) {
          throw new Error(validation.error);
        }

        const recordCount = getBackupRecordCount(validation.value);
        if (recordCount > 100_000) {
          throw new Error("This backup contains too many records to import safely.");
        }

        const { data, error } = await supabase.rpc("import_finance_backup", {
          p_backup: validation.value,
        });
        if (error) throw error;

        const result = parseFinanceImportResult(data);
        if (!result || !result.sealed) {
          throw new Error("The sealed import result could not be verified.");
        }

        // Never expose stale page content. The screen reaches full white first,
        // then waits there until the verified import has completed.
        await impactPromise;

        applyImportedClientPreferences(result.clientPreferences);
        window.dispatchEvent(
          new CustomEvent(FINANCE_DATA_IMPORTED_EVENT, { detail: result }),
        );
        router.refresh();

        setStatusMessage(
          result.alreadyImported
            ? "Backup already imported. No duplicate data was added."
            : "Import complete.",
        );
        await playContentReveal();

        setPhase("idle");
        setStatusMessage("");
      } catch (error) {
        clearCinematicTimer();
        const friendlyError = getFriendlyImportError(error);
        setStatusMessage(friendlyError);
        setPhase("error");
        toast.error(friendlyError);
        scheduleReset(3200);
      } finally {
        busyRef.current = false;
      }
    },
    [
      clearCinematicTimer,
      clearResetTimer,
      playContentReveal,
      playImpactToWhiteout,
      router,
      scheduleReset,
      supabase,
    ],
  );

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>("[data-dashboard-shell]");
    const cinematicPhase =
      phase === "impact" || phase === "whiteout" || phase === "revealing"
        ? phase
        : null;

    if (cinematicPhase) {
      shell?.setAttribute("data-finance-import-phase", cinematicPhase);
    } else {
      shell?.removeAttribute("data-finance-import-phase");
    }

    return () => shell?.removeAttribute("data-finance-import-phase");
  }, [phase]);

  useEffect(() => {
    function openPicker() {
      if (busyRef.current) return;
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.click();
      }
    }

    function handleDragEnter(event: DragEvent) {
      if (!hasFiles(event) || busyRef.current) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setPhase("dragging");
    }

    function handleDragOver(event: DragEvent) {
      if (!hasFiles(event) || busyRef.current) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    }

    function handleDragLeave(event: DragEvent) {
      if (busyRef.current || dragDepthRef.current === 0) return;
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setPhase("idle");
      }
    }

    function handleDrop(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current = 0;

      if (busyRef.current) return;
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length !== 1) {
        const error = `Drop one ${APP_NAME} backup file at a time.`;
        setStatusMessage(error);
        setPhase("error");
        toast.error(error);
        scheduleReset(2200);
        return;
      }

      void importFile(files[0]);
    }

    window.addEventListener(OPEN_FINANCE_DATA_IMPORT_EVENT, openPicker);
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener(OPEN_FINANCE_DATA_IMPORT_EVENT, openPicker);
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
      clearResetTimer();
      clearCinematicTimer();
    };
  }, [
    clearCinematicTimer,
    clearResetTimer,
    importFile,
    scheduleReset,
  ]);

  const visible = phase === "dragging" || busy;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void importFile(file);
          event.currentTarget.value = "";
        }}
      />

      <div
        className={`finance-transfer-overlay ${visible ? "is-visible" : ""}`}
        data-phase={phase}
        aria-hidden={!visible}
        aria-live="polite"
        aria-busy={busy}
      >
        <div className="finance-transfer-water" aria-hidden="true">
          <span className="finance-transfer-wave finance-transfer-wave-one" />
          <span className="finance-transfer-wave finance-transfer-wave-two" />
          <span className="finance-transfer-wave finance-transfer-wave-three" />
          <span className="finance-transfer-ripple finance-transfer-ripple-one" />
          <span className="finance-transfer-ripple finance-transfer-ripple-two" />
        </div>

        <div className="finance-transfer-cinematic" aria-hidden="true">
          <span className="finance-transfer-cinematic-mist" />
          <span className="finance-transfer-cinematic-vortex" />
          <span className="finance-transfer-cinematic-core" />
          <span className="finance-transfer-cinematic-surge" />
          <span className="finance-transfer-cinematic-shock finance-transfer-cinematic-shock-one" />
          <span className="finance-transfer-cinematic-shock finance-transfer-cinematic-shock-two" />
          <span className="finance-transfer-cinematic-shock finance-transfer-cinematic-shock-three" />
          <span className="finance-transfer-cinematic-whiteout" />
        </div>

        <span className="sr-only" role="status">
          {statusMessage}
        </span>
      </div>
    </>
  );
}
