import { NextRequest, NextResponse } from "next/server";

import {
  getInsightActionTarget,
  getInsightAttention,
  getInsightTopic,
  type InsightActionTarget,
  type InsightAttention,
  type InsightTopic,
} from "@/lib/ai-insights/actionable";
import {
  getAIInsightsCopy,
  type InsightConfidence,
  type InsightPriority,
} from "@/lib/ai-insights/copy";
import {
  BASE_CURRENCY,
  formatMoney,
  isSupportedCurrency,
  normalizeUsdToPkrRate,
} from "@/lib/currency";
import { resolveRequestLanguage } from "@/lib/i18n/request-language";

import { GET as getOverview } from "../overview/route";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;
type FinanceSummary = {
  currentMonth: {
    income: number;
    expenses: number;
    net: number;
    savingsRate: number;
  };
  netBalance: { cashBalance: number; estimatedNetWorth: number };
  categorySpendingTotals: { category: string; amount: number }[];
  goalsSummary: { count: number; completionPct: number };
  payablesSummary: { count: number; remaining: number; overdueCount: number };
  recentTrendTotals: {
    month: string;
    income: number;
    expenses: number;
    net: number;
  }[];
};
type Coverage = {
  transactions: number;
  goals: number;
  investments: number;
  payables: number;
  activeAccounts: number;
};
type BaseInsight = {
  type: "positive" | "warning" | "tip";
  title: string;
  message: string;
};
type SuggestedAction = {
  title: string;
  description: string;
  priority: InsightPriority;
};
type EvidenceItem = {
  label: string;
  value: string;
  source: "recorded-summary";
};
type ExplainableInsight = BaseInsight & {
  topic: InsightTopic;
  attention: InsightAttention;
  actionTarget: InsightActionTarget;
  why: string;
  evidence: EvidenceItem[];
  confidence: InsightConfidence;
  dataThrough: string | null;
  generatedAt: string;
  limitations: ["recorded-data-only", "informational-not-advice"];
};

function json(payload: UnknownRecord, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function finite(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const clean = value.replace(/\s+/g, " ").trim();
  return (clean || fallback).slice(0, maxLength);
}

function parseSummary(value: unknown): FinanceSummary | null {
  if (!isRecord(value)) return null;
  const currentMonth = isRecord(value.currentMonth) ? value.currentMonth : null;
  const netBalance = isRecord(value.netBalance) ? value.netBalance : null;
  const goalsSummary = isRecord(value.goalsSummary) ? value.goalsSummary : null;
  const payablesSummary = isRecord(value.payablesSummary)
    ? value.payablesSummary
    : null;
  if (!currentMonth || !netBalance || !goalsSummary || !payablesSummary) {
    return null;
  }

  const categorySpendingTotals = Array.isArray(value.categorySpendingTotals)
    ? value.categorySpendingTotals
        .map((entry) =>
          isRecord(entry)
            ? {
                category: cleanText(entry.category, "Other", 80),
                amount: finite(entry.amount),
              }
            : null,
        )
        .filter(
          (entry): entry is { category: string; amount: number } =>
            entry !== null,
        )
    : [];
  const recentTrendTotals = Array.isArray(value.recentTrendTotals)
    ? value.recentTrendTotals
        .map((entry) =>
          isRecord(entry)
            ? {
                month: cleanText(entry.month, "", 12),
                income: finite(entry.income),
                expenses: finite(entry.expenses),
                net: finite(entry.net),
              }
            : null,
        )
        .filter(
          (
            entry,
          ): entry is {
            month: string;
            income: number;
            expenses: number;
            net: number;
          } => entry !== null,
        )
    : [];

  return {
    currentMonth: {
      income: finite(currentMonth.income),
      expenses: finite(currentMonth.expenses),
      net: finite(currentMonth.net),
      savingsRate: finite(currentMonth.savingsRate),
    },
    netBalance: {
      cashBalance: finite(netBalance.cashBalance),
      estimatedNetWorth: finite(netBalance.estimatedNetWorth),
    },
    categorySpendingTotals,
    goalsSummary: {
      count: Math.max(0, Math.round(finite(goalsSummary.count))),
      completionPct: finite(goalsSummary.completionPct),
    },
    payablesSummary: {
      count: Math.max(0, Math.round(finite(payablesSummary.count))),
      remaining: finite(payablesSummary.remaining),
      overdueCount: Math.max(
        0,
        Math.round(finite(payablesSummary.overdueCount)),
      ),
    },
    recentTrendTotals,
  };
}

function parseCoverage(value: unknown): Coverage {
  const coverage = isRecord(value) ? value : {};
  const count = (entry: unknown) => Math.max(0, Math.round(finite(entry)));
  return {
    transactions: count(coverage.transactions),
    goals: count(coverage.goals),
    investments: count(coverage.investments),
    payables: count(coverage.payables),
    activeAccounts: count(coverage.activeAccounts),
  };
}

function parseInsights(value: unknown): BaseInsight[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): BaseInsight | null => {
      if (!isRecord(entry)) return null;
      const type =
        entry.type === "positive" ||
        entry.type === "warning" ||
        entry.type === "tip"
          ? entry.type
          : "tip";
      return {
        type,
        title: cleanText(entry.title, "Finance insight", 100),
        message: cleanText(
          entry.message,
          "Review your finance summary.",
          360,
        ),
      };
    })
    .filter((entry): entry is BaseInsight => entry !== null)
    .slice(0, 4);
}

function parseActions(value: unknown): SuggestedAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): SuggestedAction | null => {
      if (!isRecord(entry)) return null;
      const priority =
        entry.priority === "high" ||
        entry.priority === "medium" ||
        entry.priority === "low"
          ? entry.priority
          : "medium";
      return {
        title: cleanText(entry.title, "Review finances", 100),
        description: cleanText(
          entry.description,
          "Review the current finance summary before deciding the next step.",
          320,
        ),
        priority,
      };
    })
    .filter((entry): entry is SuggestedAction => entry !== null)
    .slice(0, 5);
}

function confidenceFor(index: number, coverage: Coverage): InsightConfidence {
  const sourceCount = Object.values(coverage).filter((count) => count > 0).length;
  const strong = coverage.transactions >= 30 && sourceCount >= 3;
  const usable = coverage.transactions >= 8 || sourceCount >= 2;

  if (index === 0) {
    return coverage.transactions > 0 ? (strong ? "high" : "medium") : "low";
  }
  if (index === 1) {
    return coverage.transactions > 0 ? (usable ? "high" : "medium") : "low";
  }
  if (index === 2) {
    return coverage.goals > 0 ? (strong ? "high" : "medium") : "low";
  }
  if (index === 3) {
    return coverage.payables > 0 ? (usable ? "high" : "medium") : "low";
  }
  return strong ? "high" : usable ? "medium" : "low";
}

function count(value: number, locale: string) {
  return Math.max(0, Math.round(value)).toLocaleString(locale);
}

function evidenceFor(
  index: number,
  summary: FinanceSummary,
  copy: ReturnType<typeof getAIInsightsCopy>,
  locale: string,
  money: (value: number) => string,
): EvidenceItem[] {
  if (index === 0) {
    return [
      {
        label: copy.evidence.monthNet,
        value: money(summary.currentMonth.net),
        source: "recorded-summary",
      },
      {
        label: copy.evidence.monthIncome,
        value: money(summary.currentMonth.income),
        source: "recorded-summary",
      },
      {
        label: copy.evidence.monthExpenses,
        value: money(summary.currentMonth.expenses),
        source: "recorded-summary",
      },
    ];
  }
  if (index === 1) {
    const topCategory = summary.categorySpendingTotals[0];
    return [
      {
        label: copy.evidence.topCategory,
        value: topCategory
          ? `${topCategory.category} · ${money(topCategory.amount)}`
          : "—",
        source: "recorded-summary",
      },
      {
        label: copy.evidence.monthExpenses,
        value: money(summary.currentMonth.expenses),
        source: "recorded-summary",
      },
    ];
  }
  if (index === 2) {
    return [
      {
        label: copy.evidence.goalsProgress,
        value: `${summary.goalsSummary.completionPct}%`,
        source: "recorded-summary",
      },
      {
        label: copy.evidence.activeGoals,
        value: count(summary.goalsSummary.count, locale),
        source: "recorded-summary",
      },
    ];
  }
  return [
    {
      label: copy.evidence.outstandingPayables,
      value: money(summary.payablesSummary.remaining),
      source: "recorded-summary",
    },
    {
      label: copy.evidence.overdueRecords,
      value: count(summary.payablesSummary.overdueCount, locale),
      source: "recorded-summary",
    },
  ];
}

function whyFor(index: number, copy: ReturnType<typeof getAIInsightsCopy>) {
  if (index === 0) return copy.why.monthlyNet;
  if (index === 1) return copy.why.spending;
  if (index === 2) return copy.why.goals;
  if (index === 3) return copy.why.payables;
  return copy.why.general;
}

export async function GET(request: NextRequest) {
  const language = resolveRequestLanguage(request);
  const copy = getAIInsightsCopy(language.code);
  const overviewResponse = await getOverview(request);
  const payload = (await overviewResponse.json().catch(() => null)) as unknown;

  if (!overviewResponse.ok || !isRecord(payload)) {
    return json(
      {
        error:
          overviewResponse.status === 401
            ? "authentication_required"
            : "ai_insights_unavailable",
        message:
          overviewResponse.status === 401
            ? copy.server.authRequired
            : copy.server.unavailable,
      },
      overviewResponse.status === 401 ? 401 : 503,
    );
  }

  const summary = parseSummary(payload.financeSummary);
  if (!summary) {
    return json(
      { error: "invalid_finance_summary", message: copy.server.unavailable },
      503,
    );
  }

  const currencyValue =
    isRecord(payload.financeSummary) &&
    typeof payload.financeSummary.displayCurrency === "string"
      ? payload.financeSummary.displayCurrency
      : BASE_CURRENCY;
  const currency = isSupportedCurrency(currencyValue)
    ? currencyValue
    : BASE_CURRENCY;
  const rate = normalizeUsdToPkrRate(
    isRecord(payload.financeSummary) &&
      isRecord(payload.financeSummary.exchangeRate)
      ? Number(payload.financeSummary.exchangeRate.usdToPkr)
      : Number.NaN,
  );
  const money = (value: number) =>
    formatMoney(value, {
      currency,
      fromCurrency: BASE_CURRENCY,
      usdToPkrRate: rate,
    });
  const generatedAt =
    typeof payload.generatedAt === "string"
      ? payload.generatedAt
      : new Date().toISOString();
  const dataThrough =
    typeof payload.dataThrough === "string" ? payload.dataThrough : null;
  const coverage = parseCoverage(payload.coverage);
  const insights = parseInsights(payload.insights);
  const actions = parseActions(payload.suggestedActions);
  const actionableSummary = {
    currentMonth: { net: summary.currentMonth.net },
    goalsSummary: { count: summary.goalsSummary.count },
    payablesSummary: {
      remaining: summary.payablesSummary.remaining,
      overdueCount: summary.payablesSummary.overdueCount,
    },
  };
  const enriched: ExplainableInsight[] = insights.map((insight, index) => {
    const topic = getInsightTopic(index);
    return {
      ...insight,
      topic,
      attention: getInsightAttention({
        topic,
        type: insight.type,
        summary: actionableSummary,
      }),
      actionTarget: getInsightActionTarget(topic),
      why: whyFor(index, copy),
      evidence: evidenceFor(index, summary, copy, language.locale, money),
      confidence: confidenceFor(index, coverage),
      dataThrough,
      generatedAt,
      limitations: ["recorded-data-only", "informational-not-advice"],
    };
  });

  return json({
    ...payload,
    provider: "local-calculator",
    model: "deterministic-finance-briefing-v2",
    intelligenceMode: "local-calculation",
    responseAvailable: true,
    language: language.code,
    locale: language.locale,
    insights: payload.empty === true ? [] : enriched,
    suggestedActions: payload.empty === true ? [] : actions,
    dataThrough,
    explainabilityVersion: "jalvoro-ai-actionable-v3",
    analysis: {
      deterministic: true,
      readOnly: true,
      providerRequestAdded: false,
      rawRowsSharedWithProvider: false,
      translatedByProvider: false,
      canonicalCurrencyEngine: true,
    },
  });
}
