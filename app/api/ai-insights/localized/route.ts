import { NextRequest, NextResponse } from "next/server";

import {
  BASE_CURRENCY,
  formatMoney,
  isSupportedCurrency,
  normalizeUsdToPkrRate,
  type SupportedCurrency,
} from "@/lib/currency";
import {
  getAIInsightsCopy,
  type AIInsightsCopy,
  type InsightConfidence,
  type InsightPriority,
} from "@/lib/ai-insights/copy";
import {
  getInsightActionTarget,
  getInsightAttention,
  getInsightTopic,
  type InsightActionTarget,
  type InsightAttention,
  type InsightTopic,
} from "@/lib/ai-insights/actionable";
import {
  buildAIResponseLanguageInstruction,
  resolveRequestLanguage,
} from "@/lib/i18n/request-language";

import { GET as getLegacyInsights } from "../route";
import { GET as getTrustContext } from "../context/route";

export const dynamic = "force-dynamic";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL_FALLBACK = "gemini-2.5-flash";

type InsightType = "positive" | "warning" | "tip";
type SummaryTone = "positive" | "warning" | "danger" | "info" | "neutral";
type UnknownRecord = Record<string, unknown>;

type FinanceSummary = {
  currentMonth: {
    income: number;
    expenses: number;
    net: number;
    savingsRate: number;
  };
  netBalance: {
    cashBalance: number;
    estimatedNetWorth: number;
  };
  categorySpendingTotals: { category: string; amount: number }[];
  goalsSummary: {
    count: number;
    completionPct: number;
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

type LegacyInsight = {
  type: InsightType;
  title: string;
  message: string;
};

type LegacyAction = {
  title: string;
  description: string;
  priority: InsightPriority;
};

type EvidenceItem = {
  label: string;
  value: string;
  source: "recorded-summary";
};

type ExplainableInsight = LegacyInsight & {
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

type TrustContext = {
  dataThrough: string | null;
  coverageConfidence: "high" | "medium" | "low" | "unknown";
  coverage: {
    transactions: number | null;
    goals: number | null;
    investments: number | null;
    payables: number | null;
    activeAccounts: number | null;
  };
};

type CurrencyContext = {
  currency: SupportedCurrency;
  rate: number;
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
  error?: {
    code?: number;
    status?: string;
  };
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const clean = value.replace(/\s+/g, " ").trim();
  return (clean || fallback).slice(0, maxLength);
}

function parseInsightType(value: unknown): InsightType {
  return value === "positive" || value === "warning" || value === "tip"
    ? value
    : "tip";
}

function parsePriority(value: unknown): InsightPriority {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

function parseFinanceSummary(value: unknown): FinanceSummary | null {
  if (!isRecord(value)) return null;
  const currentMonth = isRecord(value.currentMonth) ? value.currentMonth : null;
  const netBalance = isRecord(value.netBalance) ? value.netBalance : null;
  const goalsSummary = isRecord(value.goalsSummary) ? value.goalsSummary : null;
  const payablesSummary = isRecord(value.payablesSummary)
    ? value.payablesSummary
    : null;
  const categorySpendingTotals = Array.isArray(value.categorySpendingTotals)
    ? value.categorySpendingTotals
        .map((entry) => {
          if (!isRecord(entry)) return null;
          return {
            category: cleanText(entry.category, "Other", 80),
            amount: finiteNumber(entry.amount),
          };
        })
        .filter(
          (entry): entry is { category: string; amount: number } =>
            Boolean(entry),
        )
    : [];
  const recentTrendTotals = Array.isArray(value.recentTrendTotals)
    ? value.recentTrendTotals
        .map((entry) => {
          if (!isRecord(entry)) return null;
          return {
            month: cleanText(entry.month, "", 12),
            income: finiteNumber(entry.income),
            expenses: finiteNumber(entry.expenses),
            net: finiteNumber(entry.net),
          };
        })
        .filter(
          (
            entry,
          ): entry is {
            month: string;
            income: number;
            expenses: number;
            net: number;
          } => Boolean(entry),
        )
    : [];

  if (!currentMonth || !netBalance || !goalsSummary || !payablesSummary) {
    return null;
  }

  return {
    currentMonth: {
      income: finiteNumber(currentMonth.income),
      expenses: finiteNumber(currentMonth.expenses),
      net: finiteNumber(currentMonth.net),
      savingsRate: finiteNumber(currentMonth.savingsRate),
    },
    netBalance: {
      cashBalance: finiteNumber(netBalance.cashBalance),
      estimatedNetWorth: finiteNumber(netBalance.estimatedNetWorth),
    },
    categorySpendingTotals,
    goalsSummary: {
      count: Math.max(0, Math.round(finiteNumber(goalsSummary.count))),
      completionPct: finiteNumber(goalsSummary.completionPct),
    },
    payablesSummary: {
      count: Math.max(0, Math.round(finiteNumber(payablesSummary.count))),
      remaining: finiteNumber(payablesSummary.remaining),
      overdueCount: Math.max(
        0,
        Math.round(finiteNumber(payablesSummary.overdueCount)),
      ),
    },
    recentTrendTotals,
  };
}

function parseInsights(value: unknown): LegacyInsight[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): LegacyInsight | null => {
      if (!isRecord(entry)) return null;
      return {
        type: parseInsightType(entry.type),
        title: cleanText(entry.title, "Finance insight", 100),
        message: cleanText(entry.message, "Review your finance summary.", 360),
      };
    })
    .filter((entry): entry is LegacyInsight => Boolean(entry))
    .slice(0, 4);
}

function parseActions(value: unknown): LegacyAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): LegacyAction | null => {
      if (!isRecord(entry)) return null;
      return {
        title: cleanText(entry.title, "Review finances", 100),
        description: cleanText(
          entry.description,
          "Review the current finance summary before deciding the next step.",
          320,
        ),
        priority: parsePriority(entry.priority),
      };
    })
    .filter((entry): entry is LegacyAction => Boolean(entry))
    .slice(0, 5);
}

function parseTrustContext(value: unknown): TrustContext | null {
  if (!isRecord(value) || !isRecord(value.coverage)) return null;
  const confidence = value.coverageConfidence;
  const coverageConfidence =
    confidence === "high" ||
    confidence === "medium" ||
    confidence === "low" ||
    confidence === "unknown"
      ? confidence
      : "unknown";
  const coverage = value.coverage;
  const count = (entry: unknown) =>
    typeof entry === "number" && Number.isFinite(entry) && entry >= 0
      ? entry
      : null;

  return {
    dataThrough:
      typeof value.dataThrough === "string" ? value.dataThrough : null,
    coverageConfidence,
    coverage: {
      transactions: count(coverage.transactions),
      goals: count(coverage.goals),
      investments: count(coverage.investments),
      payables: count(coverage.payables),
      activeAccounts: count(coverage.activeAccounts),
    },
  };
}

function getCurrencyContext(request: NextRequest): CurrencyContext {
  const currencyValue = request.nextUrl.searchParams.get("currency");
  return {
    currency: isSupportedCurrency(currencyValue)
      ? currencyValue
      : BASE_CURRENCY,
    rate: normalizeUsdToPkrRate(
      Number(request.nextUrl.searchParams.get("rate")),
    ),
  };
}

function money(value: number, context: CurrencyContext) {
  return formatMoney(value, {
    currency: context.currency,
    usdToPkrRate: context.rate,
  });
}

function count(value: number, locale: string) {
  return Math.max(0, Math.round(value)).toLocaleString(locale);
}

function healthLabel(score: number, copy: AIInsightsCopy) {
  if (score >= 80) return copy.health.excellent;
  if (score >= 65) return copy.health.good;
  if (score >= 45) return copy.health.fair;
  return copy.health.attention;
}

function buildSummaryCards(
  summary: FinanceSummary,
  copy: AIInsightsCopy,
  context: CurrencyContext,
) {
  const trend = summary.recentTrendTotals;
  const previous = trend.length >= 2 ? trend[trend.length - 2] : null;
  const expenseDelta = previous
    ? summary.currentMonth.expenses - previous.expenses
    : 0;
  const expenseCaption =
    previous && expenseDelta !== 0
      ? expenseDelta > 0
        ? copy.summary.aboveLastMonth(money(Math.abs(expenseDelta), context))
        : copy.summary.belowLastMonth(money(Math.abs(expenseDelta), context))
      : copy.summary.currentSpending;

  return [
    {
      label: copy.summary.income,
      value: money(summary.currentMonth.income, context),
      caption: copy.summary.savingsRate(summary.currentMonth.savingsRate),
      tone: summary.currentMonth.income > 0 ? "positive" : "neutral",
    },
    {
      label: copy.summary.expenses,
      value: money(summary.currentMonth.expenses, context),
      caption: expenseCaption,
      tone: expenseDelta > 0 ? "warning" : "info",
    },
    {
      label: copy.summary.netBalance,
      value: money(summary.netBalance.estimatedNetWorth, context),
      caption: copy.summary.cashBalance(
        money(summary.netBalance.cashBalance, context),
      ),
      tone: summary.netBalance.estimatedNetWorth >= 0 ? "positive" : "danger",
    },
    {
      label: copy.summary.payables,
      value: money(summary.payablesSummary.remaining, context),
      caption: copy.summary.overdue(summary.payablesSummary.overdueCount),
      tone: summary.payablesSummary.overdueCount > 0 ? "danger" : "neutral",
    },
  ] satisfies {
    label: string;
    value: string;
    caption: string;
    tone: SummaryTone;
  }[];
}

function buildDeterministicInsights(
  summary: FinanceSummary,
  copy: AIInsightsCopy,
  context: CurrencyContext,
): LegacyInsight[] {
  const topCategory = summary.categorySpendingTotals[0] ?? null;
  return [
    {
      type: summary.currentMonth.net >= 0 ? "positive" : "warning",
      title:
        summary.currentMonth.net >= 0
          ? copy.deterministic.monthlyPositiveTitle
          : copy.deterministic.monthlyNegativeTitle,
      message:
        summary.currentMonth.net >= 0
          ? copy.deterministic.monthlyPositiveMessage(
              money(summary.currentMonth.net, context),
            )
          : copy.deterministic.monthlyNegativeMessage(
              money(Math.abs(summary.currentMonth.net), context),
            ),
    },
    topCategory
      ? {
          type: "tip",
          title: copy.deterministic.categoryTitle(topCategory.category),
          message: copy.deterministic.categoryMessage(
            topCategory.category,
            money(topCategory.amount, context),
          ),
        }
      : {
          type: "warning",
          title: copy.deterministic.noCategoryTitle,
          message: copy.deterministic.noCategoryMessage,
        },
    {
      type: summary.goalsSummary.count > 0 ? "positive" : "tip",
      title: copy.deterministic.goalsTitle,
      message:
        summary.goalsSummary.count > 0
          ? copy.deterministic.goalsMessage(
              summary.goalsSummary.completionPct,
              summary.goalsSummary.count,
            )
          : copy.deterministic.noGoalsMessage,
    },
    {
      type: summary.payablesSummary.overdueCount > 0 ? "warning" : "tip",
      title: copy.deterministic.payablesTitle,
      message:
        summary.payablesSummary.remaining > 0
          ? copy.deterministic.payablesMessage(
              money(summary.payablesSummary.remaining, context),
              summary.payablesSummary.overdueCount,
            )
          : copy.deterministic.noPayablesMessage,
    },
  ];
}

function buildDeterministicActions(
  summary: FinanceSummary,
  copy: AIInsightsCopy,
): LegacyAction[] {
  const topCategory = summary.categorySpendingTotals[0]?.category ?? null;
  return [
    {
      title:
        summary.currentMonth.net >= 0
          ? copy.deterministic.allocateSurplus
          : copy.deterministic.reduceCategory,
      description:
        summary.currentMonth.net >= 0
          ? copy.deterministic.allocateSurplusDetail
          : copy.deterministic.reduceCategoryDetail(topCategory),
      priority: summary.currentMonth.net >= 0 ? "medium" : "high",
    },
    {
      title: copy.deterministic.reviewPayables,
      description: copy.deterministic.reviewPayablesDetail,
      priority:
        summary.payablesSummary.overdueCount > 0 ? "high" : "low",
    },
    {
      title: copy.deterministic.keepRecordsCurrent,
      description: copy.deterministic.keepRecordsCurrentDetail,
      priority: "medium",
    },
  ];
}

function confidenceFor(
  index: number,
  summary: FinanceSummary,
  trust: TrustContext | null,
): InsightConfidence {
  const trustConfidence = trust?.coverageConfidence ?? "unknown";
  const strongCoverage = trustConfidence === "high";
  const usableCoverage =
    trustConfidence === "high" || trustConfidence === "medium";

  if (index === 0) {
    const hasFlow =
      summary.currentMonth.income !== 0 || summary.currentMonth.expenses !== 0;
    return hasFlow ? (strongCoverage ? "high" : "medium") : "low";
  }
  if (index === 1) {
    const hasCategory = summary.categorySpendingTotals.length > 0;
    return hasCategory ? (usableCoverage ? "high" : "medium") : "low";
  }
  if (index === 2) {
    return summary.goalsSummary.count > 0
      ? strongCoverage
        ? "high"
        : "medium"
      : "low";
  }
  if (index === 3) {
    return summary.payablesSummary.count > 0
      ? usableCoverage
        ? "high"
        : "medium"
      : "low";
  }
  return strongCoverage ? "high" : usableCoverage ? "medium" : "low";
}

function evidenceFor(
  index: number,
  summary: FinanceSummary,
  copy: AIInsightsCopy,
  context: CurrencyContext,
  locale: string,
): EvidenceItem[] {
  if (index === 0) {
    return [
      {
        label: copy.evidence.monthNet,
        value: money(summary.currentMonth.net, context),
        source: "recorded-summary",
      },
      {
        label: copy.evidence.monthIncome,
        value: money(summary.currentMonth.income, context),
        source: "recorded-summary",
      },
      {
        label: copy.evidence.monthExpenses,
        value: money(summary.currentMonth.expenses, context),
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
          ? `${topCategory.category} · ${money(topCategory.amount, context)}`
          : "—",
        source: "recorded-summary",
      },
      {
        label: copy.evidence.monthExpenses,
        value: money(summary.currentMonth.expenses, context),
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
  if (index === 3) {
    return [
      {
        label: copy.evidence.outstandingPayables,
        value: money(summary.payablesSummary.remaining, context),
        source: "recorded-summary",
      },
      {
        label: copy.evidence.overdueRecords,
        value: count(summary.payablesSummary.overdueCount, locale),
        source: "recorded-summary",
      },
    ];
  }
  return [
    {
      label: copy.evidence.savingsRate,
      value: `${summary.currentMonth.savingsRate}%`,
      source: "recorded-summary",
    },
    {
      label: copy.evidence.estimatedNetWorth,
      value: money(summary.netBalance.estimatedNetWorth, context),
      source: "recorded-summary",
    },
  ];
}

function whyFor(index: number, copy: AIInsightsCopy) {
  if (index === 0) return copy.why.monthlyNet;
  if (index === 1) return copy.why.spending;
  if (index === 2) return copy.why.goals;
  if (index === 3) return copy.why.payables;
  return copy.why.general;
}

function enrichInsights(
  insights: LegacyInsight[],
  summary: FinanceSummary,
  copy: AIInsightsCopy,
  trust: TrustContext | null,
  context: CurrencyContext,
  locale: string,
  generatedAt: string,
): ExplainableInsight[] {
  return insights.map((insight, index) => {
    const topic = getInsightTopic(index);

    return {
      ...insight,
      topic,
      attention: getInsightAttention({
        topic,
        type: insight.type,
        summary,
      }),
      actionTarget: getInsightActionTarget(topic),
      why: whyFor(index, copy),
      evidence: evidenceFor(index, summary, copy, context, locale),
      confidence: confidenceFor(index, summary, trust),
      dataThrough: trust?.dataThrough ?? null,
      generatedAt,
      limitations: ["recorded-data-only", "informational-not-advice"],
    };
  });
}

function parseTranslatedContent(
  value: unknown,
  originalInsights: LegacyInsight[],
  originalActions: LegacyAction[],
) {
  if (!isRecord(value)) return null;
  const translatedInsights = value.insights;
  const translatedActions = value.actions;
  if (!Array.isArray(translatedInsights) || !Array.isArray(translatedActions)) {
    return null;
  }

  const insights = originalInsights.map((original, index) => {
    const translated = translatedInsights[index];
    if (!isRecord(translated)) return original;
    return {
      ...original,
      title: cleanText(translated.title, original.title, 100),
      message: cleanText(translated.message, original.message, 360),
    };
  });
  const actions = originalActions.map((original, index) => {
    const translated = translatedActions[index];
    if (!isRecord(translated)) return original;
    return {
      ...original,
      title: cleanText(translated.title, original.title, 100),
      description: cleanText(
        translated.description,
        original.description,
        320,
      ),
    };
  });

  return { insights, actions };
}

async function translateGeneratedContent({
  languageInstruction,
  insights,
  actions,
}: {
  languageInstruction: string;
  insights: LegacyInsight[];
  actions: LegacyAction[];
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const model =
    process.env.GEMINI_MODEL?.trim().replace(/^models\//, "") ||
    GEMINI_MODEL_FALLBACK;
  const prompt = `${languageInstruction}\nTranslate the user-facing finance content below without changing any number, currency amount, factual claim, priority, or meaning. Do not add advice or new facts. Return only valid JSON with this exact shape: {"insights":[{"title":"","message":""}],"actions":[{"title":"","description":""}]}. Preserve array order and array length.\n\n${JSON.stringify({ insights, actions })}`;

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 1400,
            responseMimeType: "application/json",
          },
        }),
        cache: "no-store",
      },
    );
    const body = (await response.json()) as GeminiResponse;
    if (!response.ok || body.error) return null;
    const text =
      body.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";
    if (!text) return null;
    const parsed = JSON.parse(text) as unknown;
    return parseTranslatedContent(parsed, insights, actions);
  } catch (error) {
    console.error("AI Insights localization translation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : undefined,
    });
    return null;
  }
}

function json(payload: UnknownRecord, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: NextRequest) {
  const language = resolveRequestLanguage(request);
  const copy = getAIInsightsCopy(language.code);
  const currencyContext = getCurrencyContext(request);

  try {
    const [legacyResponse, trustResponse] = await Promise.all([
      getLegacyInsights(request),
      getTrustContext(request),
    ]);
    const legacyPayload = (await legacyResponse.json().catch(() => null)) as unknown;
    const trustPayload = (await trustResponse.json().catch(() => null)) as unknown;

    if (!legacyResponse.ok || !isRecord(legacyPayload)) {
      return json(
        {
          error:
            legacyResponse.status === 401
              ? "authentication_required"
              : "ai_insights_unavailable",
          message:
            legacyResponse.status === 401
              ? copy.server.authRequired
              : copy.server.unavailable,
        },
        legacyResponse.status === 401 ? 401 : 503,
      );
    }

    const summary = parseFinanceSummary(legacyPayload.financeSummary);
    if (!summary) {
      return json(
        {
          error: "invalid_finance_summary",
          message: copy.server.unavailable,
        },
        503,
      );
    }

    const trust = trustResponse.ok ? parseTrustContext(trustPayload) : null;
    const generatedAt =
      typeof legacyPayload.generatedAt === "string"
        ? legacyPayload.generatedAt
        : new Date().toISOString();
    const score = Math.max(
      0,
      Math.min(100, Math.round(finiteNumber(legacyPayload.healthScore))),
    );

    if (legacyPayload.empty === true) {
      return json({
        ...legacyPayload,
        message: copy.server.emptyMessage,
        language: language.code,
        locale: language.locale,
        healthLabel: healthLabel(score, copy),
        summaryCards: buildSummaryCards(summary, copy, currencyContext),
        insights: [],
        suggestedActions: [],
        dataThrough: trust?.dataThrough ?? null,
        explainabilityVersion: "jalvoro-ai-actionable-v2",
      });
    }

    const legacyInsights = parseInsights(legacyPayload.insights);
    const legacyActions = parseActions(legacyPayload.suggestedActions);
    const deterministicInsights = buildDeterministicInsights(
      summary,
      copy,
      currencyContext,
    );
    const deterministicActions = buildDeterministicActions(summary, copy);

    let localizedInsights = legacyInsights.length
      ? legacyInsights
      : deterministicInsights;
    let localizedActions = legacyActions.length
      ? legacyActions
      : deterministicActions;

    if (language.code !== "en" && legacyInsights.length && legacyActions.length) {
      const translated = await translateGeneratedContent({
        languageInstruction: buildAIResponseLanguageInstruction(language),
        insights: legacyInsights,
        actions: legacyActions,
      });
      localizedInsights = translated?.insights ?? deterministicInsights;
      localizedActions = translated?.actions ?? deterministicActions;
    }

    return json({
      ...legacyPayload,
      language: language.code,
      locale: language.locale,
      healthScore: score,
      healthLabel: healthLabel(score, copy),
      summaryCards: buildSummaryCards(summary, copy, currencyContext),
      insights: enrichInsights(
        localizedInsights,
        summary,
        copy,
        trust,
        currencyContext,
        language.locale,
        generatedAt,
      ),
      suggestedActions: localizedActions,
      dataThrough: trust?.dataThrough ?? null,
      explainabilityVersion: "jalvoro-ai-actionable-v2",
    });
  } catch (error) {
    console.error("Localized AI Insights route failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : undefined,
    });
    return json(
      {
        error: "ai_insights_unavailable",
        message: copy.server.unavailable,
      },
      503,
    );
  }
}
