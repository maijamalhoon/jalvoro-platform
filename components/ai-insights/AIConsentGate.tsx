"use client";

import { BrainCircuit, Loader2, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { APP_NAME } from "@/lib/brand";
import {
  AI_CONSENT_STORAGE_KEY,
  LEGACY_AI_CONSENT_STORAGE_KEY,
  type AIConsentState,
} from "@/lib/ai-insights/consent";
import { getAIInsightsConsentCopy } from "@/lib/ai-insights/consent-copy";

type ConsentResponse = {
  consent?: AIConsentState;
  message?: string;
};

function readLegacyConsent() {
  try {
    return (
      window.localStorage.getItem(LEGACY_AI_CONSENT_STORAGE_KEY) ===
      "accepted"
    );
  } catch {
    return false;
  }
}

function persistConsentHint(enabled: boolean) {
  try {
    if (enabled) {
      window.localStorage.setItem(AI_CONSENT_STORAGE_KEY, "accepted");
      window.localStorage.removeItem(LEGACY_AI_CONSENT_STORAGE_KEY);
    } else {
      window.localStorage.removeItem(AI_CONSENT_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_AI_CONSENT_STORAGE_KEY);
    }
  } catch {
    // Server consent remains authoritative when browser storage is unavailable.
  }
}

async function readConsent(signal?: AbortSignal) {
  const response = await fetch("/api/ai-insights/consent", {
    cache: "no-store",
    signal,
  });
  const body = (await response.json().catch(() => null)) as ConsentResponse | null;
  if (!response.ok || !body?.consent) {
    throw new Error(body?.message ?? "AI consent is temporarily unavailable.");
  }
  return body.consent;
}

async function saveConsent(migratedFrom?: string) {
  const response = await fetch("/api/ai-insights/consent", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ migratedFrom: migratedFrom ?? null }),
  });
  const body = (await response.json().catch(() => null)) as ConsentResponse | null;
  if (!response.ok || !body?.consent?.accepted) {
    throw new Error(body?.message ?? "AI consent could not be saved.");
  }
  return body.consent;
}

export default function AIConsentGate({ children }: { children: ReactNode }) {
  const { language, option } = useLanguage();
  const copy = getAIInsightsConsentCopy(language);
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setError("");
      try {
        let consent = await readConsent(controller.signal);
        if (!consent.accepted && readLegacyConsent()) {
          consent = await saveConsent("local-storage-v1");
        }
        if (controller.signal.aborted) return;
        setEnabled(consent.accepted);
        persistConsentHint(consent.accepted);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setEnabled(false);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "AI consent is temporarily unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) setReady(true);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  async function enable() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await saveConsent();
      persistConsentHint(true);
      setEnabled(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "AI consent could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function disable() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/ai-insights/consent", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const body = (await response.json().catch(() => null)) as
        | ConsentResponse
        | null;
      if (!response.ok) {
        throw new Error(body?.message ?? "AI Insights could not be disabled.");
      }
      persistConsentHint(false);
      setEnabled(false);
    } catch (disableError) {
      setError(
        disableError instanceof Error
          ? disableError.message
          : "AI Insights could not be disabled.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <div
        dir={option.direction}
        className="mx-auto grid min-h-[55vh] w-full max-w-3xl place-items-center px-4"
      >
        <div
          className="h-24 w-full animate-pulse rounded-[24px] bg-skeleton"
          aria-label={copy.loading}
        />
      </div>
    );
  }

  if (!enabled) {
    return (
      <section
        dir={option.direction}
        className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-1 py-8 sm:px-4"
      >
        <div className="w-full rounded-[28px] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-7 lg:p-9">
          <span className="grid size-12 place-items-center rounded-[18px] bg-active/10 text-active">
            <BrainCircuit size={24} aria-hidden="true" />
          </span>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-active">
            {copy.eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            {copy.description(APP_NAME)}
          </p>

          <div className="mt-5 rounded-[20px] bg-surface-secondary px-4 py-4 text-sm leading-6 text-text-secondary sm:px-5">
            <p className="font-semibold text-text-primary">
              {copy.summaryTitle}
            </p>
            <ul className="mt-2 list-disc space-y-1.5 ps-5 marker:text-active">
              {copy.summaryItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-3">{copy.excluded}</p>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-[18px] bg-info/10 px-4 py-3.5 text-sm leading-6 text-text-secondary">
            <ShieldCheck
              className="mt-0.5 shrink-0 text-info"
              size={17}
              aria-hidden="true"
            />
            <p>{copy.warning}</p>
          </div>

          {error ? (
            <p className="mt-4 rounded-[16px] bg-danger/10 px-4 py-3 text-sm text-danger" role="status">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={enable}
              disabled={saving}
              className="finance-focus primary-action min-h-12 flex-1 rounded-[18px] px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  {copy.loading}
                </span>
              ) : (
                copy.enable
              )}
            </button>
            <Link
              href="/dashboard"
              className="finance-focus inline-flex min-h-12 flex-1 items-center justify-center rounded-[18px] bg-surface-secondary px-5 text-sm font-semibold text-text-primary hover:bg-hover"
            >
              {copy.notNow}
            </Link>
          </div>

          <p className="mt-5 text-xs leading-5 text-text-tertiary">
            {copy.read}{" "}
            <Link
              className="finance-focus font-semibold text-active"
              href="/privacy#ai"
            >
              {copy.privacyNotice}
            </Link>{" "}
            {copy.and}{" "}
            <Link
              className="finance-focus font-semibold text-active"
              href="/disclosures#ai"
            >
              {copy.disclosures}
            </Link>
            .
          </p>
        </div>
      </section>
    );
  }

  return (
    <div dir={option.direction} className="min-w-0">
      <div className="mb-6 flex min-w-0 items-start justify-between gap-3 rounded-[18px] bg-info/10 px-4 py-3 text-xs leading-5 text-text-secondary sm:items-center">
        <div className="min-w-0">
          <p>{copy.enabled}</p>
          {error ? (
            <p className="mt-1 text-danger" role="status">
              {error}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={disable}
          disabled={saving}
          className="finance-focus inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-background/70 px-3 font-semibold text-text-primary hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={copy.disableAria}
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <X size={14} aria-hidden="true" />
          )}
          {copy.disable}
        </button>
      </div>
      {children}
    </div>
  );
}
