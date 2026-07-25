"use client";

import { BrainCircuit, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getAIInsightsConsentCopy } from "@/lib/ai-insights/consent-copy";
import { APP_NAME } from "@/lib/brand";

const AI_CONSENT_KEY = "jamals-finance-ai-summary-consent-v1";

export default function AIConsentGate({ children }: { children: ReactNode }) {
  const { language, option } = useLanguage();
  const copy = getAIInsightsConsentCopy(language);
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(window.localStorage.getItem(AI_CONSENT_KEY) === "accepted");
    setReady(true);
  }, []);

  function enable() {
    window.localStorage.setItem(AI_CONSENT_KEY, "accepted");
    setEnabled(true);
  }

  function disable() {
    window.localStorage.removeItem(AI_CONSENT_KEY);
    setEnabled(false);
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

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={enable}
              className="finance-focus primary-action min-h-12 flex-1 rounded-[18px] px-5 text-sm font-semibold"
            >
              {copy.enable}
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
        <p className="min-w-0">{copy.enabled}</p>
        <button
          type="button"
          onClick={disable}
          className="finance-focus inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-background/70 px-3 font-semibold text-text-primary hover:bg-hover"
          aria-label={copy.disableAria}
        >
          <X size={14} aria-hidden="true" />
          {copy.disable}
        </button>
      </div>
      {children}
    </div>
  );
}
