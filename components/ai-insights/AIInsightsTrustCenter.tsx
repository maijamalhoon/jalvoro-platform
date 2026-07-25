"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  formatAIInsightsDateTime,
  getAIInsightsLocaleLabel,
  getBrowserAIInsightsLocale,
  getWeekStartLabel,
  resolveAIInsightsLocale,
  type AIInsightsLocaleContext,
} from "@/lib/ai-insights/locale";

type CoverageConfidence = "high" | "medium" | "low" | "unknown";
type CoverageStatus = "complete" | "partial";

type TrustContext = {
  generatedAt: string;
  dataThrough: string | null;
  period: {
    currentMonthStart: string;
    currentMonthEnd: string;
    trendStart: string;
  };
  coverage: {
    transactions: number | null;
    goals: number | null;
    investments: number | null;
    payables: number | null;
    activeAccounts: number | null;
  };
  coverageStatus: CoverageStatus;
  sourceCount: number;
  coverageConfidence: CoverageConfidence;
  analysis: {
    scope: "aggregated-finance-summary";
    readOnly: true;
    rawRowsSharedWithProvider: false;
    providerMode: "gemini" | "safe-local-fallback";
  };
  display: {
    currency: string;
    exchangeRateLive: boolean;
  };
  limitations: Array<
    | "recorded-data-only"
    | "categorized-data-quality"
    | "informational-not-advice"
  >;
};

const CONFIDENCE_COPY: Record<
  CoverageConfidence,
  { label: string; className: string }
> = {
  high: {
    label: "High data coverage",
    className: "bg-success/10 text-success",
  },
  medium: {
    label: "Medium data coverage",
    className: "bg-warning/10 text-warning",
  },
  low: {
    label: "Low data coverage",
    className: "bg-surface-secondary text-text-secondary",
  },
  unknown: {
    label: "Coverage incomplete",
    className: "bg-danger/10 text-danger",
  },
};

const LIMITATION_COPY: Record<TrustContext["limitations"][number], string> = {
  "recorded-data-only":
    "Insights only reflect finance records currently stored in JALVORO.",
  "categorized-data-quality":
    "Missing or incorrect categories can reduce the quality of spending signals.",
  "informational-not-advice":
    "JALVORO AI provides informational analysis, not financial, tax, or legal advice.",
};

function countLabel(value: number | null, singular: string, plural: string) {
  if (value === null) return `${plural} unavailable`;
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

function CoverageSummary({ context }: { context: TrustContext | null }) {
  if (!context) {
    return (
      <p className="text-xs leading-5 text-text-secondary">
        Finance coverage is unavailable right now.
      </p>
    );
  }

  const { coverage } = context;
  return (
    <p className="text-xs leading-5 text-text-secondary">
      {[
        countLabel(coverage.transactions, "transaction", "transactions"),
        countLabel(coverage.activeAccounts, "active account", "active accounts"),
        countLabel(coverage.goals, "goal", "goals"),
      ].join(" · ")}
    </p>
  );
}

export default function AIInsightsTrustCenter() {
  const {
    currency,
    live,
    stale,
    ratesReady,
    source,
    updatedAt,
    getCurrencyLabel,
  } = useCurrency();
  const [localeContext, setLocaleContext] = useState<AIInsightsLocaleContext>(() =>
    resolveAIInsightsLocale(),
  );
  const [trustContext, setTrustContext] = useState<TrustContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLocaleContext(getBrowserAIInsightsLocale());
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTrustContext() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          currency: String(currency),
          rateLive: String(live),
        });
        const response = await fetch(
          `/api/ai-insights/context?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const body = (await response.json()) as
          | TrustContext
          | { error?: string; message?: string };

        if (!response.ok || !("coverage" in body)) {
          throw new Error(
            "message" in body && body.message
              ? body.message
              : "Trust context is temporarily unavailable.",
          );
        }

        setTrustContext(body);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setTrustContext(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Trust context is temporarily unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadTrustContext();
    return () => controller.abort();
  }, [currency, live]);

  const localeLabel = useMemo(
    () => getAIInsightsLocaleLabel(localeContext),
    [localeContext],
  );
  const weekStartLabel = useMemo(
    () =>
      getWeekStartLabel(localeContext.weekStartsOn, localeContext.locale),
    [localeContext.locale, localeContext.weekStartsOn],
  );
  const confidence = CONFIDENCE_COPY[
    trustContext?.coverageConfidence ?? "unknown"
  ];
  const dataThrough = trustContext?.dataThrough
    ? formatAIInsightsDateTime(
        `${trustContext.dataThrough}T12:00:00Z`,
        localeContext,
        { dateStyle: "medium" },
      )
    : "No transaction date available";
  const generatedAt = trustContext
    ? formatAIInsightsDateTime(trustContext.generatedAt, localeContext)
    : "—";
  const rateUpdatedAt =
    ratesReady && Number.isFinite(Date.parse(updatedAt)) && Date.parse(updatedAt) > 0
      ? formatAIInsightsDateTime(updatedAt, localeContext)
      : null;
  const rateState =
    ratesReady && live && !stale
      ? "Live exchange rate"
      : ratesReady
        ? "Saved exchange rate"
        : "Exchange rate unavailable";

  return (
    <section
      data-ai-insights-trust-center
      data-locale-direction={localeContext.direction}
      dir={localeContext.direction}
      aria-labelledby="ai-insights-trust-title"
      className="mb-8 min-w-0 rounded-[24px] border border-border/70 bg-surface px-4 py-4 shadow-[var(--shadow-card)] sm:px-5 sm:py-5"
    >
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-[15px] bg-info/10 text-info">
            <BadgeCheck size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id="ai-insights-trust-title"
              className="text-sm font-semibold tracking-tight text-text-primary"
            >
              Global intelligence context
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-text-secondary">
              JALVORO localizes presentation to your device and explains the
              recorded-data coverage behind this briefing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-success">
            <ShieldCheck size={12} aria-hidden="true" />
            Read-only
          </span>
          <span
            className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] ${confidence.className}`}
          >
            {confidence.label}
          </span>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 rounded-[18px] bg-surface-secondary/70 px-3.5 py-3">
          <div className="flex items-center gap-2 text-info">
            <Globe2 size={14} aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-[0.08em]">
              Locale
            </p>
          </div>
          <p className="mt-2 break-words text-xs font-semibold text-text-primary">
            {localeLabel}
          </p>
          <p className="mt-1 break-words text-[11px] leading-4 text-text-secondary">
            {localeContext.timeZone} · Week starts {weekStartLabel}
          </p>
        </div>

        <div className="min-w-0 rounded-[18px] bg-surface-secondary/70 px-3.5 py-3">
          <div className="flex items-center gap-2 text-info">
            <RefreshCw size={14} aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-[0.08em]">
              Currency
            </p>
          </div>
          <p className="mt-2 break-words text-xs font-semibold text-text-primary">
            {String(currency)} · {getCurrencyLabel(currency)}
          </p>
          <p className="mt-1 break-words text-[11px] leading-4 text-text-secondary">
            {rateState}
            {rateUpdatedAt ? ` · ${rateUpdatedAt}` : ""}
          </p>
        </div>

        <div className="min-w-0 rounded-[18px] bg-surface-secondary/70 px-3.5 py-3">
          <div className="flex items-center gap-2 text-info">
            <Database size={14} aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-[0.08em]">
              Recorded coverage
            </p>
          </div>
          <p className="mt-2 text-xs font-semibold text-text-primary">
            {loading
              ? "Checking finance records…"
              : trustContext
                ? `${trustContext.sourceCount} active finance source${trustContext.sourceCount === 1 ? "" : "s"}`
                : "Coverage unavailable"}
          </p>
          <div className="mt-1">
            <CoverageSummary context={trustContext} />
          </div>
        </div>

        <div className="min-w-0 rounded-[18px] bg-surface-secondary/70 px-3.5 py-3">
          <div className="flex items-center gap-2 text-info">
            <CalendarDays size={14} aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-[0.08em]">
              Freshness
            </p>
          </div>
          <p className="mt-2 break-words text-xs font-semibold text-text-primary">
            Data through {dataThrough}
          </p>
          <p className="mt-1 break-words text-[11px] leading-4 text-text-secondary">
            Context checked {generatedAt}
          </p>
        </div>
      </div>

      {error ? (
        <p
          className="mt-4 rounded-[16px] bg-warning/10 px-3.5 py-3 text-xs leading-5 text-warning"
          role="status"
        >
          {error} Locale and currency settings remain active.
        </p>
      ) : null}

      <details className="group mt-4 rounded-[18px] border border-border/60 bg-background/40 px-3.5 py-3">
        <summary className="finance-focus flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-text-primary">
          <Info size={14} className="shrink-0 text-info" aria-hidden="true" />
          Why this briefing can still be wrong
          <span className="ms-auto text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted group-open:hidden">
            Review
          </span>
          <span className="ms-auto hidden text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted group-open:inline">
            Close
          </span>
        </summary>
        <div className="mt-3 grid gap-3 text-xs leading-5 text-text-secondary lg:grid-cols-2">
          <div>
            <p className="font-semibold text-text-primary">Analysis boundary</p>
            <p className="mt-1">
              The AI receives an aggregated finance summary. Raw transaction rows
              are not included in the provider prompt, and this page cannot move
              money or edit records.
            </p>
          </div>
          <div>
            <p className="font-semibold text-text-primary">Known limitations</p>
            <ul className="mt-1 space-y-1.5">
              {(trustContext?.limitations ?? [
                "recorded-data-only",
                "categorized-data-quality",
                "informational-not-advice",
              ]).map((limitation) => (
                <li key={limitation} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-text-muted" />
                  <span>{LIMITATION_COPY[limitation]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-4 text-text-muted">
          Coverage confidence measures the amount and variety of recorded data;
          it is not a guarantee that an insight is correct. Rate source: {source}.
        </p>
      </details>
    </section>
  );
}
