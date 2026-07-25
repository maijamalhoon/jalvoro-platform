"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BookmarkCheck,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Gauge,
  History,
  Minus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import {
  AIInsightStateControls,
  useSavedAIInsights,
} from "@/components/ai-insights/AIInsightsSavedProvider";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getAIInsightsCopy } from "@/lib/ai-insights/copy";
import { getAIInsightsWorkspaceCopy } from "@/lib/ai-insights/workspace-copy";
import {
  calculateIncomeShockScenario,
  calculatePayablePlanScenario,
  calculateSpendingReductionScenario,
  type DataQualityResult,
  type ScenarioSummary,
  type TimelineEvent,
  type WorkspaceInsight,
} from "@/lib/ai-insights/workspace";

export type IntelligenceWorkspaceInsight = WorkspaceInsight & {
  generatedAt: string;
  actionTarget?: string;
};

type WorkspaceResponse = {
  generatedAt?: string;
  dataThrough?: string | null;
  insights?: IntelligenceWorkspaceInsight[];
  summary?: ScenarioSummary;
  message?: string;
};

type QualityResponse = {
  quality?: DataQualityResult;
  message?: string;
};

type HistoryResponse = {
  available?: boolean;
  events?: TimelineEvent[];
  previousGeneratedAt?: string | null;
  message?: string;
};

type LoadedWorkspace = {
  generatedAt: string;
  dataThrough: string | null;
  insights: IntelligenceWorkspaceInsight[];
  summary: ScenarioSummary;
};

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function TimelineIcon({ type }: { type: TimelineEvent["type"] }) {
  if (type === "improved" || type === "quality-improved") {
    return <ArrowUpRight size={14} aria-hidden="true" />;
  }
  if (type === "worsened" || type === "quality-declined") {
    return <ArrowDownRight size={14} aria-hidden="true" />;
  }
  if (type === "resolved") {
    return <CheckCircle2 size={14} aria-hidden="true" />;
  }
  if (type === "stable") {
    return <Minus size={14} aria-hidden="true" />;
  }
  if (type === "baseline") {
    return <History size={14} aria-hidden="true" />;
  }
  return <Sparkles size={14} aria-hidden="true" />;
}

function timelineTone(type: TimelineEvent["type"]) {
  if (type === "improved" || type === "quality-improved" || type === "resolved") {
    return "bg-success/10 text-success";
  }
  if (type === "worsened" || type === "quality-declined") {
    return "bg-danger/10 text-danger";
  }
  if (type === "stable") return "bg-surface-secondary text-text-secondary";
  return "bg-info/10 text-info";
}

export default function AIInsightsIntelligenceWorkspace() {
  const { language, option } = useLanguage();
  const globalCopy = getAIInsightsCopy(language);
  const copy = getAIInsightsWorkspaceCopy(language);
  const { currency, rate, live, formatCurrency } = useCurrency();
  const { records, loading: savedLoading, error: savedError } =
    useSavedAIInsights();
  const [workspace, setWorkspace] = useState<LoadedWorkspace | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState("");
  const [quality, setQuality] = useState<DataQualityResult | null>(null);
  const [qualityError, setQualityError] = useState("");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [previousGeneratedAt, setPreviousGeneratedAt] = useState<string | null>(
    null,
  );
  const [historyAvailable, setHistoryAvailable] = useState(true);
  const [spendingReduction, setSpendingReduction] = useState(10);
  const [incomeReduction, setIncomeReduction] = useState(15);
  const [monthlyPayment, setMonthlyPayment] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadWorkspace() {
      setWorkspaceLoading(true);
      setWorkspaceError("");
      try {
        const params = new URLSearchParams({
          language,
          currency: String(currency),
          rate: String(rate),
          rateLive: String(live),
        });
        const response = await fetch(
          `/api/ai-insights/workspace?${params.toString()}`,
          { cache: "no-store", signal: controller.signal },
        );
        const body = (await response.json()) as WorkspaceResponse;
        if (
          !response.ok ||
          !body.generatedAt ||
          !Array.isArray(body.insights) ||
          !body.summary
        ) {
          throw new Error(body.message ?? copy.saved.unavailable);
        }
        setWorkspace({
          generatedAt: body.generatedAt,
          dataThrough: body.dataThrough ?? null,
          insights: body.insights,
          summary: body.summary,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setWorkspace(null);
        setWorkspaceError(
          error instanceof Error ? error.message : copy.saved.unavailable,
        );
      } finally {
        if (!controller.signal.aborted) setWorkspaceLoading(false);
      }
    }
    loadWorkspace();
    return () => controller.abort();
  }, [copy.saved.unavailable, currency, language, live, rate]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadQuality() {
      setQualityError("");
      try {
        const response = await fetch("/api/ai-insights/quality", {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json()) as QualityResponse;
        if (!response.ok || !body.quality) {
          throw new Error(body.message ?? copy.saved.unavailable);
        }
        setQuality(body.quality);
      } catch (error) {
        if (controller.signal.aborted) return;
        setQuality(null);
        setQualityError(
          error instanceof Error ? error.message : copy.saved.unavailable,
        );
      }
    }
    loadQuality();
    return () => controller.abort();
  }, [copy.saved.unavailable]);

  useEffect(() => {
    if (!quality || !workspace || workspace.insights.length === 0) return;
    const controller = new AbortController();

    async function syncHistory(
      currentWorkspace: LoadedWorkspace,
      currentQuality: DataQualityResult,
    ) {
      try {
        const response = await fetch("/api/ai-insights/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            insights: currentWorkspace.insights,
            generatedAt: currentWorkspace.generatedAt,
            dataThrough: currentWorkspace.dataThrough,
            qualityScore: currentQuality.score,
          }),
        });
        const body = (await response.json()) as HistoryResponse;
        if (!response.ok) throw new Error(body.message ?? "History unavailable");
        setHistoryAvailable(body.available !== false);
        setEvents(Array.isArray(body.events) ? body.events : []);
        setPreviousGeneratedAt(body.previousGeneratedAt ?? null);
      } catch {
        if (controller.signal.aborted) return;
        setHistoryAvailable(false);
        setEvents([]);
        setPreviousGeneratedAt(null);
      }
    }

    syncHistory(workspace, quality);
    return () => controller.abort();
  }, [quality, workspace]);

  useEffect(() => {
    const remaining = workspace?.summary.payablesSummary.remaining ?? 0;
    if (remaining <= 0) {
      setMonthlyPayment(0);
      return;
    }
    setMonthlyPayment((current) =>
      current > 0 ? current : Math.ceil(remaining / 12),
    );
  }, [workspace?.summary.payablesSummary.remaining]);

  const spendingScenario = useMemo(
    () =>
      workspace
        ? calculateSpendingReductionScenario(
            workspace.summary,
            spendingReduction,
          )
        : null,
    [spendingReduction, workspace],
  );
  const incomeScenario = useMemo(
    () =>
      workspace
        ? calculateIncomeShockScenario(workspace.summary, incomeReduction)
        : null,
    [incomeReduction, workspace],
  );
  const payableScenario = useMemo(
    () =>
      workspace
        ? calculatePayablePlanScenario(workspace.summary, monthlyPayment)
        : null,
    [monthlyPayment, workspace],
  );

  const saved = records.filter((record) => record.status === "saved");
  const resolved = records.filter((record) => record.status === "resolved");
  const previousLabel = formatDateTime(
    previousGeneratedAt,
    option.locale,
  );

  return (
    <section
      data-ai-intelligence-workspace
      dir={option.direction}
      aria-labelledby="ai-intelligence-workspace-title"
    >
      <header data-ai-workspace-header>
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-active">
            <Sparkles size={13} aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h2
            id="ai-intelligence-workspace-title"
            className="mt-2 text-balance text-xl font-semibold tracking-[-0.035em] text-text-primary sm:text-2xl"
          >
            {copy.title}
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-text-secondary sm:text-sm sm:leading-6">
            {copy.description}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-success">
          <ShieldCheck size={13} aria-hidden="true" />
          {globalCopy.toolbar.readOnly}
        </span>
      </header>

      {workspaceLoading ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-52 animate-pulse rounded-[20px] bg-skeleton"
            />
          ))}
        </div>
      ) : workspaceError || !workspace ? (
        <div className="mt-5 flex min-h-44 items-center justify-center rounded-[20px] border border-dashed border-border/70 bg-background/35 px-4 text-center text-xs text-warning">
          {workspaceError || copy.saved.unavailable}
        </div>
      ) : (
        <>
          <div data-ai-workspace-overview>
            <article data-ai-quality-card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-info">
                    <Gauge size={14} aria-hidden="true" />
                    {copy.quality.title}
                  </p>
                  <p className="mt-2 text-[11px] leading-4 text-text-secondary">
                    {copy.quality.description}
                  </p>
                </div>
                {quality ? (
                  <div
                    data-ai-quality-score
                    style={{
                      background: `conic-gradient(var(--active) ${quality.score * 3.6}deg, color-mix(in srgb, var(--border) 65%, transparent) 0deg)`,
                    }}
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={quality.score}
                  >
                    <span>{quality.score}</span>
                  </div>
                ) : (
                  <div className="size-16 animate-pulse rounded-full bg-skeleton" />
                )}
              </div>

              {quality ? (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-active/10 px-2.5 py-1.5 text-[10px] font-bold text-active">
                      {copy.quality.grades[quality.grade]}
                    </span>
                    <span className="rounded-full bg-surface-secondary px-2.5 py-1.5 text-[10px] font-semibold text-text-secondary">
                      {copy.quality.categoryComplete(
                        quality.categoryCompleteness,
                      )}
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">
                      {copy.quality.issuesTitle}
                    </p>
                    {quality.issues.length ? (
                      <ul className="mt-2 space-y-2">
                        {quality.issues.slice(0, 3).map((issue) => (
                          <li
                            key={issue}
                            className="flex items-start gap-2 text-[11px] leading-4 text-text-secondary"
                          >
                            <DatabaseZap
                              size={12}
                              className="mt-0.5 shrink-0 text-warning"
                              aria-hidden="true"
                            />
                            {copy.quality.issues[issue]}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[11px] leading-4 text-success">
                        {copy.quality.noIssues}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-[11px] text-warning">
                  {qualityError}
                </p>
              )}
            </article>

            <article data-ai-timeline-card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-investment">
                    <History size={14} aria-hidden="true" />
                    {copy.timeline.title}
                  </p>
                  <p className="mt-2 text-[11px] leading-4 text-text-secondary">
                    {copy.timeline.description}
                  </p>
                </div>
                <Clock3
                  size={17}
                  className="shrink-0 text-text-muted"
                  aria-hidden="true"
                />
              </div>

              {previousLabel ? (
                <p className="mt-3 text-[10px] font-medium text-text-muted">
                  {copy.timeline.previous(previousLabel)}
                </p>
              ) : null}

              <div className="mt-4 space-y-2.5">
                {events.length ? (
                  events.slice(0, 5).map((event, index) => (
                    <div
                      key={`${event.type}-${event.topic}-${index}`}
                      className="flex min-w-0 items-center gap-3 rounded-[14px] border border-border/55 bg-background/45 px-3 py-2.5"
                    >
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-[10px] ${timelineTone(event.type)}`}
                      >
                        <TimelineIcon type={event.type} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-text-primary">
                          {copy.timeline.events[event.type]}
                        </p>
                        <p className="mt-0.5 text-[10px] text-text-secondary">
                          {copy.timeline.topics[event.topic]}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex min-h-24 items-center justify-center text-center text-[11px] text-text-muted">
                    {historyAvailable
                      ? copy.timeline.events.stable
                      : copy.saved.unavailable}
                  </div>
                )}
              </div>
            </article>

            <article data-ai-saved-card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-success">
                    <BookmarkCheck size={14} aria-hidden="true" />
                    {copy.saved.title}
                  </p>
                  <p className="mt-2 text-[11px] leading-4 text-text-secondary">
                    {copy.saved.description}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <span className="rounded-full bg-active/10 px-2 py-1 text-[9px] font-bold text-active">
                    {saved.length} {copy.saved.saved}
                  </span>
                  <span className="rounded-full bg-success/10 px-2 py-1 text-[9px] font-bold text-success">
                    {resolved.length} {copy.saved.resolved}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {workspace.insights.map((insight) => (
                  <div
                    key={`${insight.topic}-${insight.title}`}
                    className="rounded-[14px] border border-border/55 bg-background/45 px-3 py-3"
                  >
                    <p className="truncate text-[11px] font-semibold text-text-primary">
                      {insight.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-text-secondary">
                      {insight.message}
                    </p>
                    <AIInsightStateControls insight={insight} />
                  </div>
                ))}
              </div>

              {!savedLoading && records.length ? (
                <div className="mt-4 border-t border-border/55 pt-3">
                  {records.slice(0, 3).map((record) => (
                    <div
                      key={record.insightKey}
                      className="flex min-w-0 items-center gap-2 py-1.5"
                    >
                      <CheckCircle2
                        size={12}
                        className={
                          record.status === "resolved"
                            ? "shrink-0 text-success"
                            : "shrink-0 text-active"
                        }
                        aria-hidden="true"
                      />
                      <p className="min-w-0 flex-1 truncate text-[10px] text-text-secondary">
                        {record.title}
                      </p>
                      <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-text-muted">
                        {record.status === "resolved"
                          ? copy.saved.resolved
                          : copy.saved.saved}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {savedError ? (
                <p className="mt-3 text-[10px] text-warning">{savedError}</p>
              ) : null}
            </article>
          </div>

          <div data-ai-scenario-lab>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-active">
                  <SlidersHorizontal size={14} aria-hidden="true" />
                  {copy.scenarios.title}
                </p>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-text-secondary">
                  {copy.scenarios.description}
                </p>
              </div>
              <span className="inline-flex max-w-xl shrink-0 items-center gap-2 text-[10px] font-semibold leading-4 text-text-muted sm:text-end">
                <Activity size={13} className="shrink-0" aria-hidden="true" />
                {copy.scenarios.calculationNotice}
              </span>
            </div>

            <div data-ai-scenario-grid>
              <article data-ai-scenario-card>
                <h3>{copy.scenarios.spendingTitle}</h3>
                <p>{copy.scenarios.spendingDescription}</p>
                <label>
                  <span>
                    {copy.scenarios.spendingReduction(spendingReduction)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={spendingReduction}
                    onChange={(event) =>
                      setSpendingReduction(Number(event.target.value))
                    }
                  />
                </label>
                <dl>
                  <div>
                    <dt>{copy.scenarios.monthlyImprovement}</dt>
                    <dd>
                      {formatCurrency(
                        spendingScenario?.monthlyImprovement ?? 0,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.scenarios.projectedNet}</dt>
                    <dd>
                      {formatCurrency(spendingScenario?.projectedNet ?? 0)}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.scenarios.annualImpact}</dt>
                    <dd>
                      {formatCurrency(spendingScenario?.annualImpact ?? 0)}
                    </dd>
                  </div>
                </dl>
              </article>

              <article data-ai-scenario-card>
                <h3>{copy.scenarios.incomeTitle}</h3>
                <p>{copy.scenarios.incomeDescription}</p>
                <label>
                  <span>
                    {copy.scenarios.incomeReduction(incomeReduction)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={incomeReduction}
                    onChange={(event) =>
                      setIncomeReduction(Number(event.target.value))
                    }
                  />
                </label>
                <dl>
                  <div>
                    <dt>{copy.scenarios.projectedIncome}</dt>
                    <dd>
                      {formatCurrency(incomeScenario?.projectedIncome ?? 0)}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.scenarios.projectedNet}</dt>
                    <dd>
                      {formatCurrency(incomeScenario?.projectedNet ?? 0)}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.scenarios.monthlyImpact}</dt>
                    <dd>
                      {formatCurrency(incomeScenario?.monthlyImpact ?? 0)}
                    </dd>
                  </div>
                </dl>
              </article>

              <article data-ai-scenario-card>
                <h3>{copy.scenarios.payablesTitle}</h3>
                <p>{copy.scenarios.payablesDescription}</p>
                <label>
                  <span>{copy.scenarios.monthlyPayment}</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={monthlyPayment || ""}
                    onChange={(event) =>
                      setMonthlyPayment(Number(event.target.value))
                    }
                  />
                </label>
                <dl>
                  <div>
                    <dt>{copy.scenarios.monthlyPayment}</dt>
                    <dd>
                      {formatCurrency(payableScenario?.monthlyPayment ?? 0)}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.scenarios.monthsToClear}</dt>
                    <dd>
                      {payableScenario?.monthsToClear
                        ? copy.scenarios.months(payableScenario.monthsToClear)
                        : copy.scenarios.unavailable}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.timeline.topics.payables}</dt>
                    <dd>
                      {formatCurrency(payableScenario?.remaining ?? 0)}
                    </dd>
                  </div>
                </dl>
              </article>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
