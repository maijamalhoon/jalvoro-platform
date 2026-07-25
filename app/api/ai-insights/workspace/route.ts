import { NextRequest, NextResponse } from "next/server";

import {
  BASE_CURRENCY,
  formatMoney,
  isSupportedCurrency,
  normalizeUsdToPkrRate,
  type SupportedCurrency,
} from "@/lib/currency";
import {
  getInsightActionTarget,
  getInsightAttention,
  type ActionableFinanceSummary,
  type ActionableInsightType,
  type InsightTopic,
} from "@/lib/ai-insights/actionable";
import { getAIInsightsCopy } from "@/lib/ai-insights/copy";
import {
  AIInsightsSourceError,
  loadAIInsightsServerData,
} from "@/lib/ai-insights/server-summary";
import { resolveRequestLanguage } from "@/lib/i18n/request-language";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CurrencyContext = {
  currency: SupportedCurrency;
  rate: number;
};

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function statePart(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 80);
}

function currencyContext(request: NextRequest): CurrencyContext {
  const value = request.nextUrl.searchParams.get("currency");
  return {
    currency: isSupportedCurrency(value) ? value : BASE_CURRENCY,
    rate: normalizeUsdToPkrRate(
      Number(request.nextUrl.searchParams.get("rate")),
    ),
  };
}

function confidence(transactionCount: number) {
  return transactionCount >= 30
    ? ("high" as const)
    : transactionCount >= 8
      ? ("medium" as const)
      : ("low" as const);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return json(
      {
        error: "authentication_required",
        message: "Please log in before using the AI Insights workspace.",
      },
      401,
    );
  }

  const language = resolveRequestLanguage(request);
  const copy = getAIInsightsCopy(language.code);
  const context = currencyContext(request);
  const money = (value: number) =>
    formatMoney(value, {
      currency: context.currency,
      usdToPkrRate: context.rate,
    });

  try {
    const data = await loadAIInsightsServerData(supabase);
    const finance = data.summary;
    const topCategory = finance.categorySpendingTotals[0] ?? null;
    const actionableSummary: ActionableFinanceSummary = {
      currentMonth: { net: finance.currentMonth.net },
      goalsSummary: { count: finance.goalsSummary.count },
      payablesSummary: {
        remaining: finance.payablesSummary.remaining,
        overdueCount: finance.payablesSummary.overdueCount,
      },
    };
    const evidenceConfidence = confidence(data.coverage.transactions);
    const rawSignals: Array<{
      topic: InsightTopic;
      type: ActionableInsightType;
      title: string;
      message: string;
      stateKey: string;
    }> = [
      {
        topic: "cash-flow",
        type: finance.currentMonth.net >= 0 ? "positive" : "warning",
        title:
          finance.currentMonth.net >= 0
            ? copy.deterministic.monthlyPositiveTitle
            : copy.deterministic.monthlyNegativeTitle,
        message:
          finance.currentMonth.net >= 0
            ? copy.deterministic.monthlyPositiveMessage(
                money(finance.currentMonth.net),
              )
            : copy.deterministic.monthlyNegativeMessage(
                money(Math.abs(finance.currentMonth.net)),
              ),
        stateKey: `cash-flow:${finance.currentMonth.net >= 0 ? "positive" : "negative"}:${round(finance.currentMonth.net)}`,
      },
      {
        topic: "spending",
        type: "tip",
        title: topCategory
          ? copy.deterministic.categoryTitle(topCategory.category)
          : copy.deterministic.noCategoryTitle,
        message: topCategory
          ? copy.deterministic.categoryMessage(
              topCategory.category,
              money(topCategory.amount),
            )
          : copy.deterministic.noCategoryMessage,
        stateKey: topCategory
          ? `spending:${statePart(topCategory.category)}:${round(topCategory.amount)}`
          : "spending:none",
      },
      {
        topic: "goals",
        type:
          finance.goalsSummary.count > 0 &&
          finance.goalsSummary.completionPct >= 50
            ? "positive"
            : "tip",
        title: copy.deterministic.goalsTitle,
        message: finance.goalsSummary.count
          ? copy.deterministic.goalsMessage(
              finance.goalsSummary.completionPct,
              finance.goalsSummary.count,
            )
          : copy.deterministic.noGoalsMessage,
        stateKey: `goals:${finance.goalsSummary.count}:${finance.goalsSummary.completionPct}:${round(finance.goalsSummary.totalSaved)}:${round(finance.goalsSummary.totalTarget)}`,
      },
      {
        topic: "payables",
        type:
          finance.payablesSummary.overdueCount > 0
            ? "warning"
            : finance.payablesSummary.remaining > 0
              ? "tip"
              : "positive",
        title: copy.deterministic.payablesTitle,
        message:
          finance.payablesSummary.remaining > 0
            ? copy.deterministic.payablesMessage(
                money(finance.payablesSummary.remaining),
                finance.payablesSummary.overdueCount,
              )
            : copy.deterministic.noPayablesMessage,
        stateKey: `payables:${round(finance.payablesSummary.remaining)}:${finance.payablesSummary.overdueCount}:${finance.payablesSummary.count}`,
      },
    ];
    const generatedAt = new Date().toISOString();
    const insights = rawSignals.map((signal) => ({
      topic: signal.topic,
      attention: getInsightAttention({
        topic: signal.topic,
        type: signal.type,
        summary: actionableSummary,
      }),
      actionTarget: getInsightActionTarget(signal.topic),
      title: signal.title,
      message: signal.message,
      confidence: evidenceConfidence,
      dataThrough: data.dataThrough,
      generatedAt,
      stateKey: signal.stateKey,
    }));

    return json({
      generatedAt,
      dataThrough: data.dataThrough,
      language: language.code,
      insights,
      summary: {
        currentMonth: {
          income: finance.currentMonth.income,
          expenses: finance.currentMonth.expenses,
          net: finance.currentMonth.net,
        },
        payablesSummary: {
          remaining: finance.payablesSummary.remaining,
        },
      },
      analysis: {
        deterministic: true,
        readOnly: true,
        providerRequestAdded: false,
        rawRowsSharedWithProvider: false,
        localeIndependentState: true,
        sharedFinanceReadModel: true,
        sourceFailuresBecomeZero: false,
      },
    });
  } catch (error) {
    console.error("AI Insights workspace unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
      source: error instanceof AIInsightsSourceError ? error.source : undefined,
      code: error instanceof AIInsightsSourceError ? error.code : undefined,
    });
    return json(
      {
        error: "workspace_unavailable",
        message: "The intelligence workspace is temporarily unavailable.",
      },
      503,
    );
  }
}
