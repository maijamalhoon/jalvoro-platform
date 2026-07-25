import { NextRequest, NextResponse } from "next/server";

import {
  BASE_CURRENCY,
  formatMoney,
  isSupportedCurrency,
  normalizeUsdToPkrRate,
  type SupportedCurrency,
} from "@/lib/currency";
import { getAppMonthRange } from "@/lib/dates";
import {
  getInsightActionTarget,
  getInsightAttention,
  type ActionableFinanceSummary,
  type ActionableInsightType,
  type InsightTopic,
} from "@/lib/ai-insights/actionable";
import { getAIInsightsCopy } from "@/lib/ai-insights/copy";
import { resolveRequestLanguage } from "@/lib/i18n/request-language";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RawRelation = { name?: string | null } | { name?: string | null }[] | null;
type RawTransaction = {
  amount?: number | string | null;
  date?: string | null;
  type?: string | null;
  categories?: RawRelation;
};
type RawGoal = {
  current_amount?: number | string | null;
  target_amount?: number | string | null;
  status?: string | null;
};
type RawPayable = {
  remaining_amount?: number | string | null;
  due_date?: string | null;
  status?: string | null;
};

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

function finite(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function relationName(value: RawRelation) {
  if (Array.isArray(value)) return value[0]?.name?.trim() || "Other";
  return value?.name?.trim() || "Other";
}

function currencyContext(request: NextRequest): CurrencyContext {
  const value = request.nextUrl.searchParams.get("currency");
  return {
    currency: isSupportedCurrency(value) ? value : BASE_CURRENCY,
    rate: normalizeUsdToPkrRate(Number(request.nextUrl.searchParams.get("rate"))),
  };
}

function money(value: number, context: CurrencyContext) {
  return formatMoney(value, {
    currency: context.currency,
    usdToPkrRate: context.rate,
  });
}

function isOverdue(payable: RawPayable, today: string) {
  const remaining = finite(payable.remaining_amount);
  if (remaining <= 0 || payable.status === "completed") return false;
  return Boolean(payable.due_date && payable.due_date < today);
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
  const { firstDay, lastDay } = getAppMonthRange();
  const today = new Date().toISOString().slice(0, 10);

  const [transactionResult, goalResult, payableResult, latestResult] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("amount, date, type, categories(name)")
        .gte("date", firstDay)
        .lte("date", lastDay)
        .is("deleted_at", null),
      supabase.from("goals").select("current_amount, target_amount, status"),
      supabase
        .from("liabilities")
        .select("remaining_amount, due_date, status"),
      supabase
        .from("transactions")
        .select("date")
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (transactionResult.error || goalResult.error || payableResult.error) {
    console.error("AI Insights workspace aggregate query failed", {
      transactions: transactionResult.error?.code,
      goals: goalResult.error?.code,
      payables: payableResult.error?.code,
    });
    return json(
      {
        error: "workspace_unavailable",
        message: "The intelligence workspace is temporarily unavailable.",
      },
      503,
    );
  }

  const transactions = (transactionResult.data ?? []) as RawTransaction[];
  const goals = (goalResult.data ?? []) as RawGoal[];
  const payables = (payableResult.data ?? []) as RawPayable[];
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + finite(transaction.amount), 0);
  const grossExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + finite(transaction.amount), 0);
  const refunds = transactions
    .filter((transaction) => transaction.type === "refund")
    .reduce((sum, transaction) => sum + finite(transaction.amount), 0);
  const expenses = grossExpenses - refunds;
  const net = income - expenses;
  const categoryMap = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense" && transaction.type !== "refund") continue;
    const category = relationName(transaction.categories ?? null);
    const direction = transaction.type === "refund" ? -1 : 1;
    categoryMap.set(
      category,
      (categoryMap.get(category) ?? 0) + direction * finite(transaction.amount),
    );
  }

  const topCategory =
    Array.from(categoryMap.entries())
      .filter(([, amount]) => amount > 0)
      .sort((left, right) => right[1] - left[1])[0] ?? null;
  const totalGoalTarget = goals.reduce(
    (sum, goal) => sum + finite(goal.target_amount),
    0,
  );
  const totalGoalSaved = goals.reduce(
    (sum, goal) => sum + finite(goal.current_amount),
    0,
  );
  const goalCompletion =
    totalGoalTarget > 0
      ? Math.round((totalGoalSaved / totalGoalTarget) * 100)
      : 0;
  const payableRemaining = payables.reduce(
    (sum, payable) => sum + finite(payable.remaining_amount),
    0,
  );
  const overdueCount = payables.filter((payable) =>
    isOverdue(payable, today),
  ).length;
  const summary: ActionableFinanceSummary = {
    currentMonth: { net: round(net) },
    goalsSummary: { count: goals.length },
    payablesSummary: {
      remaining: round(payableRemaining),
      overdueCount,
    },
  };
  const dataThrough =
    latestResult.error || !latestResult.data
      ? null
      : typeof latestResult.data.date === "string"
        ? latestResult.data.date
        : null;
  const evidenceConfidence = confidence(transactions.length);

  const rawSignals: Array<{
    topic: InsightTopic;
    type: ActionableInsightType;
    title: string;
    message: string;
    stateKey: string;
  }> = [
    {
      topic: "cash-flow",
      type: net >= 0 ? "positive" : "warning",
      title:
        net >= 0
          ? copy.deterministic.monthlyPositiveTitle
          : copy.deterministic.monthlyNegativeTitle,
      message:
        net >= 0
          ? copy.deterministic.monthlyPositiveMessage(money(net, context))
          : copy.deterministic.monthlyNegativeMessage(
              money(Math.abs(net), context),
            ),
      stateKey: `cash-flow:${net >= 0 ? "positive" : "negative"}:${round(net)}`,
    },
    {
      topic: "spending",
      type: "tip",
      title: topCategory
        ? copy.deterministic.categoryTitle(topCategory[0])
        : copy.deterministic.noCategoryTitle,
      message: topCategory
        ? copy.deterministic.categoryMessage(
            topCategory[0],
            money(topCategory[1], context),
          )
        : copy.deterministic.noCategoryMessage,
      stateKey: topCategory
        ? `spending:${statePart(topCategory[0])}:${round(topCategory[1])}`
        : "spending:none",
    },
    {
      topic: "goals",
      type: goals.length > 0 && goalCompletion >= 50 ? "positive" : "tip",
      title: copy.deterministic.goalsTitle,
      message: goals.length
        ? copy.deterministic.goalsMessage(goalCompletion, goals.length)
        : copy.deterministic.noGoalsMessage,
      stateKey: `goals:${goals.length}:${goalCompletion}:${round(totalGoalSaved)}:${round(totalGoalTarget)}`,
    },
    {
      topic: "payables",
      type:
        overdueCount > 0
          ? "warning"
          : payableRemaining > 0
            ? "tip"
            : "positive",
      title: copy.deterministic.payablesTitle,
      message:
        payableRemaining > 0
          ? copy.deterministic.payablesMessage(
              money(payableRemaining, context),
              overdueCount,
            )
          : copy.deterministic.noPayablesMessage,
      stateKey: `payables:${round(payableRemaining)}:${overdueCount}:${payables.length}`,
    },
  ];

  const generatedAt = new Date().toISOString();
  const insights = rawSignals.map((signal) => ({
    topic: signal.topic,
    attention: getInsightAttention({
      topic: signal.topic,
      type: signal.type,
      summary,
    }),
    actionTarget: getInsightActionTarget(signal.topic),
    title: signal.title,
    message: signal.message,
    confidence: evidenceConfidence,
    dataThrough,
    generatedAt,
    stateKey: signal.stateKey,
  }));

  return json({
    generatedAt,
    dataThrough,
    language: language.code,
    insights,
    summary: {
      currentMonth: {
        income: round(income),
        expenses: round(expenses),
        net: round(net),
      },
      payablesSummary: {
        remaining: round(payableRemaining),
      },
    },
    analysis: {
      deterministic: true,
      readOnly: true,
      providerRequestAdded: false,
      rawRowsSharedWithProvider: false,
      localeIndependentState: true,
    },
  });
}
