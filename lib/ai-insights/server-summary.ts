import type { createClient } from "@/lib/supabase/server";
import {
  formatDateKey,
  getAppDateKey,
  getAppMonthRange,
  getDaysInMonth,
} from "@/lib/dates";
import { getPayableStatus } from "@/lib/finance-options";

export type AIInsightsFinanceSummary = {
  currency: "PKR";
  baseCurrency: "PKR";
  displayCurrency: string;
  exchangeRate: {
    usdToPkr: number;
    live: boolean;
  };
  period: {
    currentMonth: string;
    currentMonthStart: string;
    currentMonthEnd: string;
  };
  currentMonth: {
    income: number;
    expenses: number;
    net: number;
    savingsRate: number;
  };
  netBalance: {
    cashBalance: number;
    investmentValue: number;
    payableRemaining: number;
    estimatedNetWorth: number;
  };
  categorySpendingTotals: { category: string; amount: number }[];
  goalsSummary: {
    count: number;
    completedCount: number;
    totalTarget: number;
    totalSaved: number;
    completionPct: number;
  };
  investmentSummary: {
    count: number;
    totalInvested: number;
    currentValue: number;
    totalPnL: number;
    totalPnLPct: number;
    byType: { type: string; currentValue: number; totalInvested: number }[];
  };
  payablesSummary: {
    count: number;
    totalOriginal: number;
    paid: number;
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

export type AIInsightsCoverage = {
  transactions: number;
  goals: number;
  investments: number;
  payables: number;
  activeAccounts: number;
};

export type AIInsightsServerData = {
  summary: AIInsightsFinanceSummary;
  coverage: AIInsightsCoverage;
  dataThrough: string | null;
  hasFinanceData: boolean;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type Relation = { name?: string | null } | { name?: string | null }[] | null;
type TransactionRow = {
  amount?: number | string | null;
  date?: string | null;
  type?: string | null;
  categories?: Relation;
};
type GoalRow = {
  current_amount?: number | string | null;
  target_amount?: number | string | null;
  status?: string | null;
};
type InvestmentRow = {
  type?: string | null;
  quantity?: number | string | null;
  purchase_price?: number | string | null;
  current_price?: number | string | null;
};
type PayableRow = {
  original_value?: number | string | null;
  paid_amount?: number | string | null;
  remaining_amount?: number | string | null;
  due_date?: string | null;
  status?: string | null;
};
type AccountRow = { balance?: number | string | null };

export class AIInsightsSourceError extends Error {
  readonly source: string;
  readonly code?: string;

  constructor(source: string, error: unknown) {
    super(`AI Insights source unavailable: ${source}`);
    this.name = "AIInsightsSourceError";
    this.source = source;
    this.code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : undefined;
  }
}

function finite(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPct(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
}

function relationName(value: Relation) {
  if (Array.isArray(value)) return value[0]?.name?.trim() || "Other";
  return value?.name?.trim() || "Other";
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getMonthRanges(year: number, month: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const absoluteMonth = year * 12 + month - 1 - (count - 1 - index);
    const rangeYear = Math.floor(absoluteMonth / 12);
    const rangeMonth = (absoluteMonth % 12) + 1;
    return {
      key: `${rangeYear}-${String(rangeMonth).padStart(2, "0")}`,
      firstDay: formatDateKey(rangeYear, rangeMonth, 1),
      lastDay: formatDateKey(
        rangeYear,
        rangeMonth,
        getDaysInMonth(rangeYear, rangeMonth),
      ),
    };
  });
}

async function requiredRows<T>(
  source: string,
  request: PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const { data, error } = await request;
  if (error) throw new AIInsightsSourceError(source, error);
  return data ?? [];
}

export async function loadAIInsightsServerData(
  supabase: SupabaseClient,
): Promise<AIInsightsServerData> {
  const { year, month, firstDay, lastDay } = getAppMonthRange();
  const monthRanges = getMonthRanges(year, month, 3);
  const trendStart = monthRanges[0]?.firstDay ?? firstDay;
  const today = getAppDateKey();

  const [transactions, goals, investments, payables, accounts, latestResult] =
    await Promise.all([
      requiredRows<TransactionRow>(
        "transactions",
        supabase
          .from("transactions")
          .select("amount, date, type, categories(name)")
          .gte("date", trendStart)
          .lte("date", lastDay)
          .is("deleted_at", null),
      ),
      requiredRows<GoalRow>(
        "goals",
        supabase.from("goals").select("current_amount, target_amount, status"),
      ),
      requiredRows<InvestmentRow>(
        "investments",
        supabase
          .from("investments")
          .select("type, quantity, purchase_price, current_price"),
      ),
      requiredRows<PayableRow>(
        "payables",
        supabase
          .from("liabilities")
          .select(
            "original_value, paid_amount, remaining_amount, due_date, status",
          ),
      ),
      requiredRows<AccountRow>(
        "accounts",
        supabase
          .from("accounts")
          .select("balance")
          .eq("status", "active"),
      ),
      supabase
        .from("transactions")
        .select("date")
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (latestResult.error) {
    throw new AIInsightsSourceError("latest_transaction", latestResult.error);
  }

  const currentTransactions = transactions.filter(
    (transaction) =>
      typeof transaction.date === "string" &&
      transaction.date >= firstDay &&
      transaction.date <= lastDay,
  );
  const income = currentTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + finite(transaction.amount), 0);
  const grossExpenses = currentTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + finite(transaction.amount), 0);
  const refunds = currentTransactions
    .filter((transaction) => transaction.type === "refund")
    .reduce((sum, transaction) => sum + finite(transaction.amount), 0);
  const expenses = Math.max(0, grossExpenses - refunds);
  const net = income - expenses;
  const categoryMap = new Map<string, number>();

  for (const transaction of currentTransactions) {
    if (transaction.type !== "expense" && transaction.type !== "refund") {
      continue;
    }
    const category = relationName(transaction.categories ?? null);
    const direction = transaction.type === "refund" ? -1 : 1;
    categoryMap.set(
      category,
      (categoryMap.get(category) ?? 0) + direction * finite(transaction.amount),
    );
  }

  const recentTrendTotals = monthRanges.map((range) => {
    const rows = transactions.filter(
      (transaction) =>
        typeof transaction.date === "string" &&
        transaction.date >= range.firstDay &&
        transaction.date <= range.lastDay,
    );
    const rangeIncome = rows
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + finite(transaction.amount), 0);
    const rangeGrossExpenses = rows
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + finite(transaction.amount), 0);
    const rangeRefunds = rows
      .filter((transaction) => transaction.type === "refund")
      .reduce((sum, transaction) => sum + finite(transaction.amount), 0);
    const rangeExpenses = Math.max(0, rangeGrossExpenses - rangeRefunds);
    return {
      month: range.key,
      income: roundMoney(rangeIncome),
      expenses: roundMoney(rangeExpenses),
      net: roundMoney(rangeIncome - rangeExpenses),
    };
  });

  const totalTarget = goals.reduce(
    (sum, goal) => sum + Math.max(0, finite(goal.target_amount)),
    0,
  );
  const totalSaved = goals.reduce(
    (sum, goal) => sum + Math.max(0, finite(goal.current_amount)),
    0,
  );
  const completedCount = goals.filter(
    (goal) =>
      goal.status === "completed" ||
      (finite(goal.target_amount) > 0 &&
        finite(goal.current_amount) >= finite(goal.target_amount)),
  ).length;

  let totalInvested = 0;
  let investmentValue = 0;
  const byType = new Map<
    string,
    { type: string; currentValue: number; totalInvested: number }
  >();
  for (const investment of investments) {
    const quantity = Math.max(0, finite(investment.quantity));
    const invested = quantity * Math.max(0, finite(investment.purchase_price));
    const value = quantity * Math.max(0, finite(investment.current_price));
    const type = titleCase(investment.type || "Other") || "Other";
    const current = byType.get(type) ?? {
      type,
      currentValue: 0,
      totalInvested: 0,
    };
    current.currentValue += value;
    current.totalInvested += invested;
    byType.set(type, current);
    totalInvested += invested;
    investmentValue += value;
  }

  const normalizedPayables = payables.map((payable) => ({
    ...payable,
    status: getPayableStatus({
      status: payable.status ?? "pending",
      remaining_amount: Math.max(0, finite(payable.remaining_amount)),
      due_date: payable.due_date ?? null,
      today,
    }),
  }));
  const totalOriginal = normalizedPayables.reduce(
    (sum, payable) => sum + Math.max(0, finite(payable.original_value)),
    0,
  );
  const totalPaid = normalizedPayables.reduce(
    (sum, payable) => sum + Math.max(0, finite(payable.paid_amount)),
    0,
  );
  const remaining = normalizedPayables.reduce(
    (sum, payable) => sum + Math.max(0, finite(payable.remaining_amount)),
    0,
  );
  const overdueCount = normalizedPayables.filter(
    (payable) => payable.status === "overdue",
  ).length;
  const cashBalance = accounts.reduce(
    (sum, account) => sum + finite(account.balance),
    0,
  );
  const dataThrough =
    latestResult.data && typeof latestResult.data.date === "string"
      ? latestResult.data.date
      : null;

  const summary: AIInsightsFinanceSummary = {
    currency: "PKR",
    baseCurrency: "PKR",
    displayCurrency: "PKR",
    exchangeRate: { usdToPkr: 1, live: false },
    period: {
      currentMonth: `${year}-${String(month).padStart(2, "0")}`,
      currentMonthStart: firstDay,
      currentMonthEnd: lastDay,
    },
    currentMonth: {
      income: roundMoney(income),
      expenses: roundMoney(expenses),
      net: roundMoney(net),
      savingsRate: income > 0 ? roundPct((net / income) * 100) : 0,
    },
    netBalance: {
      cashBalance: roundMoney(cashBalance),
      investmentValue: roundMoney(investmentValue),
      payableRemaining: roundMoney(remaining),
      estimatedNetWorth: roundMoney(cashBalance + investmentValue - remaining),
    },
    categorySpendingTotals: Array.from(categoryMap.entries())
      .filter(([, amount]) => amount > 0)
      .map(([category, amount]) => ({ category, amount: roundMoney(amount) }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 8),
    goalsSummary: {
      count: goals.length,
      completedCount,
      totalTarget: roundMoney(totalTarget),
      totalSaved: roundMoney(totalSaved),
      completionPct:
        totalTarget > 0 ? roundPct((totalSaved / totalTarget) * 100) : 0,
    },
    investmentSummary: {
      count: investments.length,
      totalInvested: roundMoney(totalInvested),
      currentValue: roundMoney(investmentValue),
      totalPnL: roundMoney(investmentValue - totalInvested),
      totalPnLPct:
        totalInvested > 0
          ? roundPct(((investmentValue - totalInvested) / totalInvested) * 100)
          : 0,
      byType: Array.from(byType.values())
        .map((entry) => ({
          type: entry.type,
          currentValue: roundMoney(entry.currentValue),
          totalInvested: roundMoney(entry.totalInvested),
        }))
        .sort((left, right) => right.currentValue - left.currentValue)
        .slice(0, 6),
    },
    payablesSummary: {
      count: payables.length,
      totalOriginal: roundMoney(totalOriginal),
      paid: roundMoney(totalPaid),
      remaining: roundMoney(remaining),
      overdueCount,
    },
    recentTrendTotals,
  };

  const coverage: AIInsightsCoverage = {
    transactions: transactions.length,
    goals: goals.length,
    investments: investments.length,
    payables: payables.length,
    activeAccounts: accounts.length,
  };

  return {
    summary,
    coverage,
    dataThrough,
    hasFinanceData:
      transactions.length > 0 ||
      goals.length > 0 ||
      investments.length > 0 ||
      payables.length > 0 ||
      accounts.some((account) => finite(account.balance) !== 0),
  };
}
