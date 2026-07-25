"use client";

import { APP_NAME } from "@/lib/brand";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  FINANCE_DATA_IMPORTED_EVENT,
  MAX_FINANCE_BACKUP_BYTES,
  OPEN_FINANCE_DATA_IMPORT_EVENT,
  getBackupRecordCount,
  parseFinanceImportResult,
  validateFinanceBackup,
} from "@/lib/data-backup";
import { createClient } from "@/lib/supabase/client";

type TransferPhase =
  | "idle"
  | "dragging"
  | "validating"
  | "importing"
  | "revealing"
  | "success"
  | "error";

const ACCEPTED_FILE_EXTENSIONS = [".jfinance", ".json"];
const IMPORT_REVEAL_DURATION_MS = 4_000;

function hasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function hasAcceptedBackupExtension(fileName: string) {
  const originalDownloadName = fileName
    .trim()
    .replace(/\s*\(\d+\)$/, "")
    .toLowerCase();

  return ACCEPTED_FILE_EXTENSIONS.some((extension) =>
    originalDownloadName.endsWith(extension),
  );
}

function getFriendlyImportError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "";

  if (/too large|too many records/i.test(message)) {
    return "This backup is too large to import safely.";
  }

  if (/version/i.test(message)) {
    return "This backup version is not supported.";
  }

  if (/integrity|complete-data|did not pass/i.test(message)) {
    return "This backup is incomplete or was changed after export. No data was added.";
  }

  if (/relation|reference|foreign key|incomplete/i.test(message)) {
    return "This backup is incomplete or damaged. No data was changed.";
  }

  if (/fetch|network|timeout|connection|could not be verified/i.test(message)) {
    return "The import result could not be confirmed. Drop the same backup again; duplicate protection will verify it safely.";
  }

  return "This backup file is invalid or damaged. No data was changed.";
}

function getRevealDelay() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 450
    : IMPORT_REVEAL_DURATION_MS;
}

export default function FinanceDataTransfer() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const busyRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<TransferPhase>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const busy =
    phase === "validating" ||
    phase === "importing" ||
    phase === "revealing";

  const clearResetTimer = useCallback(() => {
    if (!resetTimerRef.current) return;
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  }, []);

  const clearRevealTimer = useCallback(() => {
    if (!revealTimerRef.current) return;
    clearTimeout(revealTimerRef.current);
    revealTimerRef.current = null;
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

  const playReveal = useCallback(async () => {
    clearRevealTimer();
    await new Promise<void>((resolve) => {
      revealTimerRef.current = setTimeout(() => {
        revealTimerRef.current = null;
        resolve();
      }, getRevealDelay());
    });
  }, [clearRevealTimer]);

  const importFile = useCallback(
    async (file: File) => {
      if (busyRef.current) return;
      busyRef.current = true;

      clearResetTimer();
      clearRevealTimer();

      let revealPromise: Promise<void> | null = null;

      try {
        if (!hasAcceptedBackupExtension(file.name)) {
          const error = "Choose a .jfinance backup file.";
          setStatusMessage(error);
          setPhase("error");
          toast.error(error);
          scheduleReset(2200);
          return;
        }

        if (file.size <= 0 || file.size > MAX_FINANCE_BACKUP_BYTES) {
          const error = "This backup is empty or too large to import safely.";
          setStatusMessage(error);
          setPhase("error");
          toast.error(error);
          scheduleReset(2200);
          return;
        }

        // Start the single cardless full-screen effect immediately after a
        // valid file is selected or dropped. Validation and import run behind it.
        setStatusMessage("Importing finance backup.");
        setPhase("validating");
        revealPromise = playReveal();

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

        setPhase("importing");

        const { data, error } = await supabase.rpc("import_finance_backup", {
          p_backup: validation.value,
        });
        if (error) throw error;

        const result = parseFinanceImportResult(data);
        if (!result) {
          throw new Error("Data import could not be verified.");
        }

        setPhase("revealing");
        await revealPromise;

        window.dispatchEvent(
          new CustomEvent(FINANCE_DATA_IMPORTED_EVENT, { detail: result }),
        );
        router.refresh();

        setStatusMessage(
          result.alreadyImported
            ? "Backup already imported. No duplicate data was added."
            : "Import complete.",
        );
        setPhase("success");
        scheduleReset();
      } catch (error) {
        clearRevealTimer();
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
      clearResetTimer,
      clearRevealTimer,
      playReveal,
      router,
      scheduleReset,
      supabase,
    ],
  );

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>("[data-dashboard-shell]");
    if (busy) {
      shell?.classList.add("is-finance-water-impact");
    } else {
      shell?.classList.remove("is-finance-water-impact");
    }

    return () => shell?.classList.remove("is-finance-water-impact");
  }, [busy]);

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
      clearRevealTimer();
    };
  }, [
    clearResetTimer,
    clearRevealTimer,
    importFile,
    scheduleReset,
  ]);

  const visible = busy;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".jfinance,.json,application/json"
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
        <span className="sr-only" role="status">
          {statusMessage}
        </span>
      </div>
    </>
  );
}
