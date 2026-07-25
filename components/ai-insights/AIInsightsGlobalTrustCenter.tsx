"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Database,
  Globe2,
  Info,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getAIInsightsCopy } from "@/lib/ai-insights/copy";
import {
  formatAIInsightsDateTime,
  getAIInsightsLocaleLabel,
  getWeekStartLabel,
  resolveAIInsightsLocale,
  type AIInsightsLocaleContext,
} from "@/lib/ai-insights/locale";

type CoverageConfidence = "high" | "medium" | "low" | "unknown";

type TrustContext = {
  generatedAt: string;
  dataThrough: string | null;
  coverage: {
    transactions: number | null;
    goals: number | null;
    investments: number | null;
    payables: number | null;
    activeAccounts: number | null;
  };
  sourceCount: number;
  coverageConfidence: CoverageConfidence;
};

const CONFIDENCE_CLASS: Record<CoverageConfidence, string> = {
  high: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  low: "bg-surface-secondary text-text-secondary",
  unknown: "bg-danger/10 text-danger",
};

export default function AIInsightsGlobalTrustCenter() {
  const { language, option } = useLanguage();
  const copy = getAIInsightsCopy(language);
  const {
    currency,
    live,
    stale,
    ratesReady,
    updatedAt,
    getCurrencyLabel,
  } = useCurrency();
  const [localeContext, setLocaleContext] = useState<AIInsightsLocaleContext>(() =>
    resolveAIInsightsLocale({ locales: [option.locale] }),
  );
  const [trustContext, setTrustContext] = useState<TrustContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setLocaleContext(
      resolveAIInsightsLocale({ locales: [option.locale], timeZone }),
    );
  }, [option.locale]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTrustContext() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          currency: String(currency),
          rateLive: String(live),
          language,
        });
        const response = await fetch(
          `/api/ai-insights/context?${params.toString()}`,
          { cache: "no-store", signal: controller.signal },
        );
        const body = (await response.json()) as
          | TrustContext
          | { error?: string; message?: string };
        if (!response.ok || !("coverage" in body)) {
          throw new Error(copy.trust.unavailable);
        }
        setTrustContext(body);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setTrustContext(null);
        setError(
          loadError instanceof Error ? loadError.message : copy.trust.unavailable,
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadTrustContext();
    return () => controller.abort();
  }, [copy.trust.unavailable, currency, language, live]);

  const localeLabel = useMemo(
    () => getAIInsightsLocaleLabel(localeContext),
    [localeContext],
  );
  const weekStartLabel = useMemo(
    () => getWeekStartLabel(localeContext.weekStartsOn, localeContext.locale),
    [localeContext.locale, localeContext.weekStartsOn],
  );
  const confidenceKey = trustContext?.coverageConfidence ?? "unknown";
  const confidenceLabel =
    confidenceKey === "unknown"
      ? copy.trust.coverageUnavailable
      : copy.confidence[confidenceKey];
  const dataThrough = trustContext?.dataThrough
    ? formatAIInsightsDateTime(
        `${trustContext.dataThrough}T12:00:00Z`,
        localeContext,
        { dateStyle: "medium" },
      )
    : copy.trust.noTransactionDate;
  const generatedAt = trustContext
    ? formatAIInsightsDateTime(trustContext.generatedAt, localeContext)
    : "—";
  const rateUpdatedAt =
    ratesReady && Number.isFinite(Date.parse(updatedAt)) && Date.parse(updatedAt) > 0
      ? formatAIInsightsDateTime(updatedAt, localeContext)
      : null;
  const rateState =
    ratesReady && live && !stale
      ? copy.trust.liveRate
      : ratesReady
        ? copy.trust.savedRate
        : copy.trust.unavailableRate;

  return (
    <section
      data-ai-insights-trust-center
      dir={option.direction}
      aria-labelledby="ai-insights-global-trust-title"
      className="mb-8 min-w-0 rounded-[24px] border border-border/70 bg-surface px-4 py-4 shadow-[var(--shadow-card)] sm:px-5 sm:py-5"
    >
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-[15px] bg-info/10 text-info">
            <BadgeCheck size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id="ai-insights-global-trust-title"
              className="text-sm font-semibold tracking-tight text-text-primary"
            >
              {copy.trust.title}
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-text-secondary">
              {copy.trust.description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-success">
            <ShieldCheck size={12} aria-hidden="true" />
            {copy.trust.readOnly}
          </span>
          <span
            className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] ${CONFIDENCE_CLASS[confidenceKey]}`}
          >
            {confidenceLabel}
          </span>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ContextCard icon={Globe2} label={copy.trust.locale}>
          <p className="break-words text-xs font-semibold text-text-primary">
            {localeLabel}
          </p>
          <p className="mt-1 break-words text-[11px] leading-4 text-text-secondary">
            {localeContext.timeZone} · {copy.trust.weekStarts(weekStartLabel)}
          </p>
        </ContextCard>

        <ContextCard icon={RefreshCw} label={copy.trust.currency}>
          <p className="break-words text-xs font-semibold text-text-primary">
            {String(currency)} · {getCurrencyLabel(currency)}
          </p>
          <p className="mt-1 break-words text-[11px] leading-4 text-text-secondary">
            {rateState}
            {rateUpdatedAt ? ` · ${rateUpdatedAt}` : ""}
          </p>
        </ContextCard>

        <ContextCard icon={Database} label={copy.trust.coverage}>
          <p className="text-xs font-semibold text-text-primary">
            {loading
              ? copy.trust.checkingRecords
              : trustContext
                ? copy.trust.activeSources(trustContext.sourceCount)
                : copy.trust.coverageUnavailable}
          </p>
          <p className="mt-1 text-[11px] leading-4 text-text-secondary">
            {trustContext
              ? [
                  copy.trust.transactions(trustContext.coverage.transactions),
                  copy.trust.accounts(trustContext.coverage.activeAccounts),
                  copy.trust.goals(trustContext.coverage.goals),
                ].join(" · ")
              : copy.trust.coverageUnavailable}
          </p>
        </ContextCard>

        <ContextCard icon={CalendarDays} label={copy.trust.freshness}>
          <p className="break-words text-xs font-semibold text-text-primary">
            {copy.trust.dataThrough(dataThrough)}
          </p>
          <p className="mt-1 break-words text-[11px] leading-4 text-text-secondary">
            {copy.trust.contextChecked(generatedAt)}
          </p>
        </ContextCard>
      </div>

      {error ? (
        <p
          className="mt-4 rounded-[16px] bg-warning/10 px-3.5 py-3 text-xs leading-5 text-warning"
          role="status"
        >
          {error} {copy.trust.localeRemainsActive}
        </p>
      ) : null}

      <details className="group mt-4 rounded-[18px] border border-border/60 bg-background/40 px-3.5 py-3">
        <summary className="finance-focus flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-text-primary">
          <Info size={14} className="shrink-0 text-info" aria-hidden="true" />
          {copy.trust.whyWrong}
          <span className="ms-auto text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted group-open:hidden">
            {copy.trust.review}
          </span>
          <span className="ms-auto hidden text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted group-open:inline">
            {copy.trust.close}
          </span>
        </summary>
        <div className="mt-3 grid gap-3 text-xs leading-5 text-text-secondary lg:grid-cols-2">
          <div>
            <p className="font-semibold text-text-primary">
              {copy.trust.analysisBoundary}
            </p>
            <p className="mt-1">{copy.trust.analysisBoundaryDetail}</p>
          </div>
          <div>
            <p className="font-semibold text-text-primary">
              {copy.trust.limitations}
            </p>
            <ul className="mt-1 space-y-1.5">
              <li>{copy.trust.recordOnly}</li>
              <li>{copy.trust.categoryQuality}</li>
              <li>{copy.trust.informational}</li>
            </ul>
          </div>
        </div>
      </details>
    </section>
  );
}

function ContextCard({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Globe2;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[18px] bg-surface-secondary/70 px-3.5 py-3">
      <div className="mb-2 flex items-center gap-2 text-info">
        <Icon size={14} aria-hidden="true" />
        <p className="text-[10px] font-bold uppercase tracking-[0.08em]">
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}
