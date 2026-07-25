"use client";

import { APP_NAME } from "@/lib/brand";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  Loader2,
  LogOut,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  MAX_FINANCE_BACKUP_BYTES,
  OPEN_FINANCE_DATA_IMPORT_EVENT,
  isRecord,
  validateFinanceBackup,
} from "@/lib/data-backup";
import { mapAuthError } from "@/lib/settings/security";
import { createClient } from "@/lib/supabase/client";
import { getStoredThemePreference } from "@/lib/theme";

type DateFormat = "MMM d, yyyy" | "dd MMM yyyy" | "yyyy-MM-dd";
type ExportAnimationPhase = "idle" | "preparing" | "complete";

type SettingsDataTransferSectionProps = {
  email: string;
  displayName: string;
};

type DataActionRowProps = {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
};

function DataActionRow({
  icon,
  title,
  description,
  onClick,
  disabled = false,
}: DataActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="finance-focus settings-reference-row settings-reference-row-button"
    >
      <span className="settings-reference-row-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="settings-reference-row-copy">
        <span className="settings-reference-row-title">{title}</span>
        <span className="settings-reference-row-description">{description}</span>
      </span>
      <ChevronRight
        size={18}
        strokeWidth={2.35}
        className="settings-reference-row-chevron"
        aria-hidden="true"
      />
    </button>
  );
}

function getExportCompletionDelay() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 280
    : 1_350;
}

export default function SettingsDataTransferSection({
  email,
  displayName,
}: SettingsDataTransferSectionProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const { currency } = useCurrency();
  const [profileName, setProfileName] = useState(
    displayName.trim() || email.split("@")[0]?.replace(/[._-]/g, " ") || "Jamal",
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportPhase, setExportPhase] =
    useState<ExportAnimationPhase>("idle");
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    function handleProfileUpdate(event: Event) {
      const detail = (event as CustomEvent<{ displayName?: string }>).detail;
      if (detail?.displayName) setProfileName(detail.displayName);
    }

    window.addEventListener("jamal-profile-updated", handleProfileUpdate);
    return () =>
      window.removeEventListener("jamal-profile-updated", handleProfileUpdate);
  }, []);

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    setExportPhase("preparing");

    try {
      const storedDateFormat = window.localStorage.getItem("jamal-date-format");
      const dateFormat: DateFormat =
        storedDateFormat === "dd MMM yyyy" ||
        storedDateFormat === "yyyy-MM-dd"
          ? storedDateFormat
          : "MMM d, yyyy";
      const compactMode =
        window.localStorage.getItem("jamal-compact-dashboard") === "true";
      const themeMode = getStoredThemePreference();

      // The server builds and seals the final payload. Nothing is appended or
      // rewritten in the browser after the HMAC has been generated.
      const { data, error } = await supabase.rpc("export_finance_backup", {
        p_client_snapshot: {
          currency,
          dateFormat,
          compactMode,
          themeMode,
          displayName: profileName,
          email,
        },
      });
      if (error || !isRecord(data)) {
        throw error ?? new Error("Backup could not be prepared.");
      }

      const validation = validateFinanceBackup(data);
      if (!validation.ok) throw new Error(validation.error);

      const serialized = JSON.stringify(validation.value);
      const blob = new Blob([serialized], {
        type: "application/vnd.jalvoro.backup+json",
      });

      if (blob.size > MAX_FINANCE_BACKUP_BYTES) {
        throw new Error(
          "Your complete backup is currently too large to download safely.",
        );
      }

      const url = window.URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `jalvoro-finance-backup-${new Date()
          .toISOString()
          .slice(0, 10)}.jalvoro`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        window.URL.revokeObjectURL(url);
      }

      setExportPhase("complete");
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, getExportCompletionDelay());
      });
      toast.success("Sealed JALVORO finance backup downloaded.");
    } catch (error) {
      setExportPhase("idle");
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Could not export your finance data. Please try again.";
      toast.error(message);
    } finally {
      setIsExporting(false);
      setExportPhase("idle");
    }
  }

  function handleUpload() {
    window.dispatchEvent(new Event(OPEN_FINANCE_DATA_IMPORT_EVENT));
  }

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    setIsSigningOut(false);

    if (error) {
      toast.error(
        mapAuthError(error, "Could not sign out this device. Please try again."),
      );
      return;
    }

    toast.success("Signed out successfully.");
    router.replace("/login");
    router.refresh();
  }

  const dataActionsDisabled = isExporting || isSigningOut;
  const exportVisible = exportPhase !== "idle";

  return (
    <>
      <div
        className={`finance-export-overlay ${exportVisible ? "is-visible" : ""}`}
        data-phase={exportPhase}
        aria-hidden={!exportVisible}
        aria-live="polite"
        aria-busy={exportPhase === "preparing"}
      >
        <div className="finance-export-field" aria-hidden="true">
          <span className="finance-export-ring finance-export-ring-one" />
          <span className="finance-export-ring finance-export-ring-two" />
          <span className="finance-export-ring finance-export-ring-three" />
          <span className="finance-export-ring finance-export-ring-four" />
          <span className="finance-export-orb">
            {exportPhase === "complete" ? (
              <CheckCircle2 size={42} strokeWidth={2.1} />
            ) : (
              <Upload size={42} strokeWidth={2.1} />
            )}
          </span>
        </div>
        <span className="sr-only" role="status">
          {exportPhase === "complete"
            ? "Sealed finance backup downloaded."
            : "Preparing and cryptographically sealing your complete finance backup."}
        </span>
      </div>

      <section className="settings-reference-section settings-reference-data">
        <h2 className="settings-reference-section-heading">
          <span aria-hidden="true">
            <Download size={19} strokeWidth={2.35} />
          </span>
          Data
        </h2>

        <div className="settings-reference-group">
          <DataActionRow
            icon={
              isExporting ? (
                <Loader2 size={21} className="animate-spin" />
              ) : (
                <Download size={21} strokeWidth={2.35} />
              )
            }
            title={isExporting ? "Sealing Complete Backup…" : "Export Data"}
            description="Download every account, goal, payable, investment, transaction, linked record and finance setting"
            onClick={() => void handleExport()}
            disabled={dataActionsDisabled}
          />
        </div>

        <div className="settings-data-upload-launch">
          <button
            type="button"
            onClick={handleUpload}
            disabled={dataActionsDisabled}
            className="finance-focus settings-data-upload-button"
            aria-label={`Import a ${APP_NAME} backup`}
            title="Import data"
          >
            <span className="settings-data-upload-pulse" aria-hidden="true" />
            <span className="settings-data-upload-orbit" aria-hidden="true" />
            <Upload size={25} strokeWidth={2.3} aria-hidden="true" />
          </button>
          <span className="sr-only">
            Choose a backup file with any name, or drag and drop it anywhere on
            this screen.
          </span>
        </div>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={isSigningOut || isExporting}
          className="finance-focus settings-reference-logout"
        >
          {isSigningOut ? (
            <Loader2 size={19} className="animate-spin" aria-hidden="true" />
          ) : (
            <LogOut size={19} strokeWidth={2.35} aria-hidden="true" />
          )}
          {isSigningOut ? "Signing Out..." : "Log Out"}
        </button>
      </section>
    </>
  );
}
