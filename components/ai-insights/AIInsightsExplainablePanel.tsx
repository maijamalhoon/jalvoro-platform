"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Database,
  Eye,
  Flame,
  Lightbulb,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getAIInsightsActionableCopy } from "@/lib/ai-insights/actionable-copy";
import type {
  InsightActionTarget,
  InsightAttention,
  InsightTopic,
} from "@/lib/ai-insights/actionable";
import {
  getAIInsightsCopy,
  type AIInsightsCopy,
  type InsightConfidence,
  type InsightPriority,
} from "@/lib/ai-insights/copy";

type InsightType = "positive" | "warning" | "tip";
type SummaryTone = "positive" | "warning" | "danger" | "info" | "neutral";

type EvidenceItem = {
  label: string;
  value: string;
  source: "recorded-summary";
};

type Insight = {
  type: InsightType;
  topic: InsightTopic;
  attention: InsightAttention;
  actionTarget: InsightActionTarget;
  title: string;
  message: string;
  why: string;
  evidence: EvidenceItem[];
  confidence: InsightConfidence;
  dataThrough: string | null;
  generatedAt: string;
  limitations: string[];
};

type SuggestedAction = {
  title: string;
  description: string;
  priority: InsightPriority;
};

type SummaryCard = {
  label: string;
  value: string;
  caption: string;
  tone: SummaryTone;
};

type FinanceSummary = {
  currentMonth: {
    income: number;
    expenses: number;
    net: number;
    savingsRate: number;
  };
  netBalance: {
    estimatedNetWorth: number;
  };
  categorySpendingTotals: { category: string; amount: number }[];
  goalsSummary: {
    count: number;
    completionPct: number;
  };
  investmentSummary: {
    count: number;
    currentValue: number;
    totalPnL: number;
  };
  payablesSummary: {
    count: number;
    remaining: number;
    overdueCount: number;
  };
  recentTrendTotals: {
    month: string;
    income: number;
    expenses: number;
    net: number;
  }[];
};

type AIData = {
  healthScore: number;
  healthLabel: string;
  insights: Insight[];
  suggestedActions: SuggestedAction[];
  summaryCards: SummaryCard[];
  financeSummary: FinanceSummary;
  provider: string;
  model: string;
  aiAvailable: boolean;
  intelligenceMode?: "ai-assisted" | "local-calculation";
  generatedAt: string;
  dataThrough?: string | null;
  language?: string;
  locale?: string;
  message?: string;
};

type AIEmptyData = {
  empty: true;
  message?: string;
  insights: [];
  suggestedActions: [];
  summaryCards: SummaryCard[];
  financeSummary: FinanceSummary;
  aiAvailable: boolean;
  generatedAt?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const INSIGHT_STYLE = {
  positive: {
    icon: TrendingUp,
    color: "text-success",
    wash: "bg-success/10",
    border: "border-success/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    wash: "bg-warning/10",
    border: "border-warning/20",
  },
  tip: {
    icon: Lightbulb,
    color: "text-active",
    wash: "bg-active/10",
    border: "border-active/20",
  },
};

const SUMMARY_TONE: Record<SummaryTone, string> = {
  positive: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-text-secondary",
};

const PRIORITY_STYLE: Record<InsightPriority, string> = {
  high: "bg-danger/10 text-danger",
  medium: "bg-warning/10 text-warning",
  low: "bg-success/10 text-success",
};

const CONFIDENCE_STYLE: Record<InsightConfidence, string> = {
  high: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  low: "bg-surface-secondary text-text-secondary",
};

const ATTENTION_ORDER: InsightAttention[] = [
  "act-now",
  "watch-closely",
  "doing-well",
];

const ATTENTION_STYLE = {
  "act-now": {
    icon: Flame,
    tone: "text-danger",
    wash: "bg-danger/10",
    border: "border-danger/20",
  },
  "watch-closely": {
    icon: Eye,
    tone: "text-warning",
    wash: "bg-warning/10",
    border: "border-warning/20",
  },
  "doing-well": {
    icon: CheckCircle2,
    tone: "text-success",
    wash: "bg-success/10",
    border: "border-success/20",
  },
} satisfies Record<
  InsightAttention,
  {
    icon: typeof Flame;
    tone: string;
    wash: string;
    border: string;
  }
>;

function parseDate(value: string | null | undefined, locale: string) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function parseDateTime(value: string | null | undefined, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMonth(value: string, locale: string) {
  const date = new Date(`${value}-01T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function HealthMeter({
  score,
  label,
  title,
  ariaLabel,
}: {
  score: number;
  label: string;
  title: string;
  ariaLabel: string;
}) {
  const color =
    score >= 80
      ? "var(--success)"
      : score >= 40
        ? "var(--warning)"
        : "var(--danger)";
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex min-w-0 items-center gap-4 sm:gap-5 md:flex-col md:items-start md:gap-4">
      <div
        className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28"
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            {score}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
          {title}
        </p>
        <p className="mt-1.5 text-lg font-semibold tracking-tight text-text-primary">
          {label}
        </p>
      </div>
    </div>
  );
}

function OverviewSkeleton({ label }: { label: string }) {
  return (
    <section
      className="grid min-w-0 gap-7 py-2 md:grid-cols-[220px_minmax(0,1fr)] md:items-center md:gap-8 lg:grid-cols-[240px_minmax(0,1fr)] xl:gap-12"
      aria-label={label}
    >
      <div className="flex items-center gap-4 md:flex-col md:items-start">
        <div className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-skeleton sm:h-28 sm:w-28" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-skeleton" />
          <div className="h-6 w-36 animate-pulse rounded-full bg-skeleton" />
          <div className="h-3 w-full max-w-52 animate-pulse rounded-full bg-skeleton" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:gap-x-10 xl:grid-cols-4 xl:gap-x-8">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="min-w-0 space-y-3">
            <div className="h-3 w-20 animate-pulse rounded-full bg-skeleton" />
            <div className="h-6 w-full max-w-36 animate-pulse rounded-full bg-skeleton" />
            <div className="h-3 w-24 animate-pulse rounded-full bg-skeleton" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AIInsightsExplainablePanel() {
  const { language, option } = useLanguage();
  const copy = getAIInsightsCopy(language);
  const actionableCopy = getAIInsightsActionableCopy(language);
  const { currency, formatCurrency, live, rate } = useCurrency();
  const [data, setData] = useState<AIData | null>(null);
  const [summaryCards, setSummaryCards] = useState<SummaryCard[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [emptyMessage, setEmptyMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatPrompts, setChatPrompts] = useState<string[]>([
    ...copy.starterPrompts,
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    setChatPrompts([...copy.starterPrompts]);
  }, [copy.starterPrompts]);

  const topCategories = useMemo(
    () => summary?.categorySpendingTotals.slice(0, 4) ?? [],
    [summary],
  );
  const maxCategoryAmount = useMemo(
    () => Math.max(...topCategories.map((category) => category.amount), 1),
    [topCategories],
  );
  const insightBuckets = useMemo<Record<InsightAttention, Insight[]>>(() => {
    const buckets: Record<InsightAttention, Insight[]> = {
      "act-now": [],
      "watch-closely": [],
      "doing-well": [],
    };

    for (const insight of data?.insights ?? []) {
      buckets[insight.attention].push(insight);
    }

    return buckets;
  }, [data]);

  const load = useCallback(
    async ({ regenerate = false } = {}) => {
      if (regenerate) setRegenerating(true);
      else setLoading(true);
      setError("");
      setEmptyMessage("");

      try {
        const params = new URLSearchParams({
          currency: String(currency),
          rate: String(rate),
          rateLive: String(live),
          language,
          regenerate: String(regenerate),
        });
        const response = await fetch(
          `/api/ai-insights/localized?${params.toString()}`,
          { cache: "no-store" },
        );
        const body = (await response.json()) as
          | AIData
          | AIEmptyData
          | { error?: string; message?: string };

        if (!response.ok || "error" in body) {
          throw new Error(body.message ?? copy.panel.unavailable);
        }
        if ("summaryCards" in body) setSummaryCards(body.summaryCards);
        if ("financeSummary" in body) setSummary(body.financeSummary);
        if ("empty" in body && body.empty) {
          setData(null);
          setEmptyMessage(body.message ?? copy.server.emptyMessage);
          return;
        }
        setData(body as AIData);
      } catch (loadError) {
        setData(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : copy.panel.unavailable,
        );
      } finally {
        setLoading(false);
        setRegenerating(false);
      }
    },
    [copy.panel.unavailable, copy.server.emptyMessage, currency, language, live, rate],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || chatLoading) return;

    setQuestion("");
    setChatError("");
    setChatLoading(true);
    setChatMessages((messages) => [
      ...messages,
      { role: "user", content: trimmed },
    ]);

    try {
      const response = await fetch("/api/ai-insights/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          currency,
          rate,
          rateLive: live,
          language,
        }),
      });
      const body = (await response.json()) as
        | { answer?: string; followUps?: string[]; message?: string }
        | { error?: string; message?: string };
      if (!response.ok || !("answer" in body) || !body.answer) {
        throw new Error(body.message ?? copy.panel.unavailable);
      }
      setChatMessages((messages) => [
        ...messages,
        { role: "assistant", content: body.answer ?? copy.panel.unavailable },
      ]);
      if (Array.isArray(body.followUps) && body.followUps.length) {
        setChatPrompts(body.followUps.slice(0, 3));
      }
    } catch (chatSubmitError) {
      setChatError(
        chatSubmitError instanceof Error
          ? chatSubmitError.message
          : copy.panel.unavailable,
      );
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div
      dir={option.direction}
      className="min-w-0 space-y-8 sm:space-y-10 xl:space-y-12"
    >
      {loading ? (
        <OverviewSkeleton label={copy.panel.loadingOverview} />
      ) : data || summaryCards.length > 0 ? (
        <section
          className="grid min-w-0 gap-7 py-2 md:grid-cols-[220px_minmax(0,1fr)] md:items-center md:gap-8 lg:grid-cols-[240px_minmax(0,1fr)] xl:gap-12"
          aria-label={copy.panel.health}
        >
          <div className="min-w-0">
            {data ? (
              <HealthMeter
                score={data.healthScore}
                label={data.healthLabel}
                title={copy.panel.health}
                ariaLabel={copy.panel.healthAria}
              />
            ) : (
              <div className="flex min-h-28 items-center text-sm text-text-secondary">
                {copy.panel.healthPending}
              </div>
            )}
          </div>

          {summaryCards.length ? (
            <div
              data-mobile-summary-grid
              className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-7 sm:gap-x-10 xl:grid-cols-4 xl:items-center xl:gap-x-8"
            >
              {summaryCards.map((card) => (
                <div key={card.label} className="min-w-0">
                  <p
                    className={`truncate text-[11px] font-semibold uppercase tracking-[0.08em] ${SUMMARY_TONE[card.tone]}`}
                  >
                    {card.label}
                  </p>
                  <p className="mt-2 break-words text-base font-semibold tracking-tight text-text-primary [overflow-wrap:anywhere] sm:text-lg">
                    {card.value}
                  </p>
                  <p className="mt-1 break-words text-[11px] leading-relaxed text-text-secondary">
                    {card.caption}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)] lg:gap-10 xl:gap-14">
        <section className="min-w-0">
          <div className="mb-6 flex min-w-0 items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-text-primary">
                {copy.panel.briefing}
              </h2>
              {data?.generatedAt ? (
                <p className="mt-1 text-[10px] text-text-muted">
                  {copy.panel.generated(
                    parseDateTime(data.generatedAt, option.locale) ?? "—",
                  )}
                </p>
              ) : null}
            </div>
            <button
              onClick={() => load({ regenerate: true })}
              disabled={loading || regenerating}
              className="finance-focus inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-surface-secondary px-3.5 text-xs font-semibold text-text-primary transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={copy.panel.refreshAria}
              type="button"
            >
              <RefreshCw
                size={14}
                className={regenerating ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">{copy.panel.refresh}</span>
            </button>
          </div>

          {data && !data.aiAvailable ? (
            <div className="mb-5 flex items-start gap-3 rounded-[18px] bg-warning/10 px-4 py-3.5">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-warning"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-semibold text-warning">
                  {copy.panel.providerUnavailable}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {copy.panel.localFallback}
                </p>
              </div>
            </div>
          ) : null}

          {loading ? (
            <InsightSkeleton />
          ) : error ? (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold text-text-primary">{error}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {copy.panel.tryAgainLater}
              </p>
              <button
                onClick={() => load()}
                className="finance-focus mt-4 rounded-full bg-surface-secondary px-4 py-2.5 text-xs font-semibold text-text-primary hover:bg-hover"
                type="button"
              >
                {copy.panel.tryAgain}
              </button>
            </div>
          ) : emptyMessage ? (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold text-text-primary">
                {copy.panel.briefingReadyToGrow}
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-text-secondary">
                {emptyMessage}
              </p>
            </div>
          ) : data?.insights.length ? (
            <div data-ai-priority-queue className="space-y-5">
              <div className="max-w-2xl">
                <h3 className="text-sm font-semibold tracking-tight text-text-primary">
                  {actionableCopy.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  {actionableCopy.description}
                </p>
              </div>

              <div className="grid gap-4">
                {ATTENTION_ORDER.map((attention) => {
                  const items = insightBuckets[attention];
                  const attentionStyle = ATTENTION_STYLE[attention];
                  const AttentionIcon = attentionStyle.icon;

                  return (
                    <section
                      key={attention}
                      data-ai-priority-bucket={attention}
                      className={`min-w-0 rounded-[22px] border ${attentionStyle.border} bg-surface-secondary/25 p-3.5 sm:p-4`}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-[13px] ${attentionStyle.wash} ${attentionStyle.tone}`}
                        >
                          <AttentionIcon size={16} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                            <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-text-primary">
                              {actionableCopy.buckets[attention]}
                            </h4>
                            <span className="rounded-full bg-background/70 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-text-secondary">
                              {actionableCopy.count(items.length)}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-4 text-text-secondary">
                            {actionableCopy.bucketDescriptions[attention]}
                          </p>
                        </div>
                      </div>

                      {items.length ? (
                        <div className="mt-3 grid gap-3">
                          {items.map((insight, index) => (
                            <ExplainableInsightCard
                              key={`${attention}-${insight.topic}-${insight.title}-${index}`}
                              insight={insight}
                              locale={option.locale}
                              copy={copy}
                              actionLabel={
                                actionableCopy.actionLabels[insight.topic]
                              }
                              actionSafety={actionableCopy.actionSafety}
                              whyLabel={actionableCopy.whyAmISeeingThis}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-[16px] border border-dashed border-border/60 px-3 py-4 text-center text-[11px] text-text-muted">
                          {actionableCopy.empty}
                        </p>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex min-h-56 items-center justify-center text-center">
              <p className="max-w-sm text-sm text-text-secondary">
                {copy.panel.addRecords}
              </p>
            </div>
          )}
        </section>

        <aside className="min-w-0">
          <h2 className="mb-6 text-base font-semibold tracking-tight text-text-primary">
            {copy.panel.nextMoves}
          </h2>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="space-y-2 py-2">
                  <div className="h-3 w-32 animate-pulse rounded-full bg-skeleton" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-skeleton" />
                </div>
              ))}
            </div>
          ) : data?.suggestedActions.length ? (
            <ol className="space-y-4">
              {data.suggestedActions.map((action, index) => (
                <li key={`${action.priority}-${action.title}`} className="min-w-0 py-1">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-active/10 text-[11px] font-bold text-active">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <h3 className="min-w-0 break-words text-xs font-semibold leading-5 text-text-primary">
                          {action.title}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${PRIORITY_STYLE[action.priority]}`}
                        >
                          {copy.priority[action.priority]}
                        </span>
                      </div>
                      <p className="mt-1.5 break-words text-xs leading-5 text-text-secondary">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex min-h-48 items-center justify-center text-center">
              <p className="max-w-xs text-xs leading-relaxed text-text-secondary">
                {copy.panel.actionsPending}
              </p>
            </div>
          )}
        </aside>
      </div>

      {summary ? (
        <section className="grid min-w-0 gap-8 md:grid-cols-2 md:gap-10 xl:gap-16">
          <div className="min-w-0">
            <h2 className="mb-6 text-sm font-semibold text-text-primary">
              {copy.panel.spendingFocus}
            </h2>
            {topCategories.length ? (
              <div className="space-y-4">
                {topCategories.map((category) => (
                  <div key={category.category} className="min-w-0">
                    <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                      <p className="truncate text-xs font-medium text-text-primary">
                        {category.category}
                      </p>
                      <p className="shrink-0 text-xs font-semibold text-text-primary">
                        {formatCurrency(category.amount)}
                      </p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                      <div
                        className="h-full rounded-full bg-active transition-[width] duration-700"
                        style={{
                          width: `${Math.max(
                            (category.amount / maxCategoryAmount) * 100,
                            5,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-text-secondary">
                {copy.panel.categoriesPending}
              </p>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="mb-6 text-sm font-semibold text-text-primary">
              {copy.panel.recentPulse}
            </h2>
            {summary.recentTrendTotals.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
                {summary.recentTrendTotals.map((trend) => (
                  <div key={trend.month} className="min-w-0 py-1">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                        {formatMonth(trend.month, option.locale)}
                      </p>
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${trend.net >= 0 ? "bg-success" : "bg-danger"}`}
                      />
                    </div>
                    <p
                      className={`mt-2 break-words text-sm font-semibold [overflow-wrap:anywhere] ${trend.net >= 0 ? "text-success" : "text-danger"}`}
                    >
                      {formatCurrency(trend.net)}
                    </p>
                    <p className="mt-1 text-[10px] text-text-secondary">
                      {formatCurrency(trend.income)} {copy.panel.moneyIn} ·{" "}
                      {formatCurrency(trend.expenses)} {copy.panel.moneyOut}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-text-secondary">
                {copy.panel.trendsPending}
              </p>
            )}
          </div>
        </section>
      ) : null}

      <section className="min-w-0">
        <h2 className="mb-6 text-base font-semibold tracking-tight text-text-primary">
          {copy.panel.askFinances}
        </h2>
        <div
          className={`mb-4 max-h-[420px] overflow-y-auto ${chatMessages.length === 0 ? "" : "min-h-[180px] space-y-3 py-2"}`}
          aria-live="polite"
        >
          {chatMessages.length === 0 ? (
            <div className="flex min-h-[190px] flex-col items-center justify-center px-4 py-6 text-center">
              <p className="text-sm font-semibold text-text-primary">
                {copy.panel.askTitle}
              </p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-text-secondary">
                {copy.panel.askDescription}
              </p>
              <div className="mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
                {chatPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setQuestion(prompt)}
                    className="finance-focus rounded-full bg-surface-secondary px-3.5 py-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-[20px] px-4 py-3 text-xs leading-5 sm:max-w-[75%] ${message.role === "user" ? "bg-active text-text-inverse" : "bg-surface-secondary text-text-secondary"}`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
          {chatLoading ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-[20px] bg-surface-secondary px-4 py-3 text-xs text-text-secondary">
                <Loader2 size={14} className="animate-spin" />
                {copy.panel.thinking}
              </div>
            </div>
          ) : null}
        </div>

        {chatError ? (
          <div className="mb-3 rounded-[16px] bg-danger/10 px-4 py-3 text-xs font-semibold text-danger">
            {chatError}
          </div>
        ) : null}

        <form
          onSubmit={submitQuestion}
          className="finance-focus flex min-w-0 items-center gap-2 rounded-[20px] bg-surface-secondary p-1.5"
        >
          <input
            value={question}
            onChange={(event: { target: { value: string } }) => setQuestion(event.target.value)}
            className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
            placeholder={copy.panel.placeholder}
            aria-label={copy.panel.questionAria}
            maxLength={500}
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={!question.trim() || chatLoading}
            className="primary-action h-11 min-h-11 w-11 min-w-11 shrink-0 rounded-[16px] p-0 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={copy.panel.sendAria}
          >
            {chatLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>
      </section>
    </div>
  );
}

function ExplainableInsightCard({
  insight,
  locale,
  copy,
  actionLabel,
  actionSafety,
  whyLabel,
}: {
  insight: Insight;
  locale: string;
  copy: AIInsightsCopy;
  actionLabel: string;
  actionSafety: string;
  whyLabel: string;
}) {
  const config = INSIGHT_STYLE[insight.type] ?? INSIGHT_STYLE.tip;
  const Icon = config.icon;
  const dataThrough =
    parseDate(insight.dataThrough, locale) ?? copy.metadata.noDate;
  const generatedAt =
    parseDateTime(insight.generatedAt, locale) ?? copy.metadata.noDate;

  return (
    <article
      className={`min-w-0 rounded-[20px] border ${config.border} bg-surface-secondary/35 px-4 py-4`}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.wash}`}
        >
          <Icon size={16} className={config.color} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <h3 className="break-words text-sm font-semibold text-text-primary">
              {insight.title}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${CONFIDENCE_STYLE[insight.confidence]}`}
            >
              {copy.metadata.confidence}: {copy.confidence[insight.confidence]}
            </span>
          </div>
          <p className="mt-1.5 break-words text-xs leading-5 text-text-secondary">
            {insight.message}
          </p>
          <div className="mt-3 flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={insight.actionTarget}
              className="finance-focus inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-active px-3.5 text-[11px] font-semibold text-text-inverse transition-transform hover:-translate-y-0.5"
            >
              {actionLabel}
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
            <p className="max-w-sm text-[9px] leading-4 text-text-muted sm:text-end">
              {actionSafety}
            </p>
          </div>
        </div>
      </div>

      <details className="group mt-3 border-t border-border/55 pt-3">
        <summary className="finance-focus flex cursor-pointer list-none items-center gap-2 text-[11px] font-semibold text-info">
          <Database size={13} aria-hidden="true" />
          {whyLabel}
          <ChevronDown
            size={13}
            className="ms-auto transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">
              {copy.metadata.why}
            </p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              {insight.why}
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-text-muted">
              <ShieldCheck size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              {copy.metadata.accuracyNotice}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">
              {copy.metadata.evidence}
            </p>
            <dl className="mt-1.5 space-y-2">
              {insight.evidence.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="flex min-w-0 items-start justify-between gap-3 text-xs"
                >
                  <dt className="text-text-secondary">{item.label}</dt>
                  <dd className="max-w-[55%] break-words text-end font-semibold text-text-primary">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[10px] leading-4 text-text-muted">
              {copy.metadata.dataThrough}: {dataThrough} ·{" "}
              {copy.metadata.generatedAt}: {generatedAt}
            </p>
          </div>
        </div>
      </details>
    </article>
  );
}

function InsightSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="rounded-[20px] border border-border/50 px-4 py-4"
        >
          <div className="flex gap-3">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-skeleton" />
            <div className="min-w-0 flex-1 space-y-2 py-1">
              <div className="h-3 w-32 animate-pulse rounded-full bg-skeleton" />
              <div className="h-3 w-full animate-pulse rounded-full bg-skeleton" />
              <div className="h-3 w-4/5 animate-pulse rounded-full bg-skeleton" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
