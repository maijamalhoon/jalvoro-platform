import type {
  AIInsightsCopy,
  InsightPriority,
} from "@/lib/ai-insights/copy";
import type { AIInsightsFinanceSummary } from "@/lib/ai-insights/server-summary";

export type DeterministicInsightType = "positive" | "warning" | "tip";
export type DeterministicInsight = {
  type: DeterministicInsightType;
  title: string;
  message: string;
};
export type DeterministicAction = {
  title: string;
  description: string;
  priority: InsightPriority;
};
export type DeterministicSummaryCard = {
  label: string;
  value: string;
  caption: string;
  tone: "positive" | "warning" | "danger" | "info" | "neutral";
};

export function calculateFinanceHealthScore(summary: AIInsightsFinanceSummary) {
  const positiveNet = summary.currentMonth.net >= 0;
  const savingsComponent = Math.max(
    0,
    Math.min(40, positiveNet ? 20 + summary.currentMonth.savingsRate : 5),
  );
  const goalsComponent = Math.min(25, summary.goalsSummary.completionPct / 4);
  const payableComponent =
    summary.payablesSummary.remaining <= 0
      ? 25
      : Math.max(0, 20 - summary.payablesSummary.overdueCount * 8);
  const recordComponent =
    summary.currentMonth.income !== 0 || summary.currentMonth.expenses !== 0
      ? 10
      : 2;

  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        savingsComponent + goalsComponent + payableComponent + recordComponent,
      ),
    ),
  );
}

export function buildDeterministicSummaryCards(
  summary: AIInsightsFinanceSummary,
  copy: AIInsightsCopy,
  money: (value: number) => string,
): DeterministicSummaryCard[] {
  const trend = summary.recentTrendTotals;
  const previous = trend.length >= 2 ? trend[trend.length - 2] : null;
  const expenseDelta = previous
    ? summary.currentMonth.expenses - previous.expenses
    : 0;
  const expenseCaption =
    previous && expenseDelta !== 0
      ? expenseDelta > 0
        ? copy.summary.aboveLastMonth(money(Math.abs(expenseDelta)))
        : copy.summary.belowLastMonth(money(Math.abs(expenseDelta)))
      : copy.summary.currentSpending;

  return [
    {
      label: copy.summary.income,
      value: money(summary.currentMonth.income),
      caption: copy.summary.savingsRate(summary.currentMonth.savingsRate),
      tone: summary.currentMonth.income > 0 ? "positive" : "neutral",
    },
    {
      label: copy.summary.expenses,
      value: money(summary.currentMonth.expenses),
      caption: expenseCaption,
      tone: expenseDelta > 0 ? "warning" : "info",
    },
    {
      label: copy.summary.netBalance,
      value: money(summary.netBalance.estimatedNetWorth),
      caption: copy.summary.cashBalance(money(summary.netBalance.cashBalance)),
      tone: summary.netBalance.estimatedNetWorth >= 0 ? "positive" : "danger",
    },
    {
      label: copy.summary.payables,
      value: money(summary.payablesSummary.remaining),
      caption: copy.summary.overdue(summary.payablesSummary.overdueCount),
      tone: summary.payablesSummary.overdueCount > 0 ? "danger" : "neutral",
    },
  ];
}

export function buildDeterministicInsights(
  summary: AIInsightsFinanceSummary,
  copy: AIInsightsCopy,
  money: (value: number) => string,
): DeterministicInsight[] {
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
              money(summary.currentMonth.net),
            )
          : copy.deterministic.monthlyNegativeMessage(
              money(Math.abs(summary.currentMonth.net)),
            ),
    },
    topCategory
      ? {
          type: "tip",
          title: copy.deterministic.categoryTitle(topCategory.category),
          message: copy.deterministic.categoryMessage(
            topCategory.category,
            money(topCategory.amount),
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
              money(summary.payablesSummary.remaining),
              summary.payablesSummary.overdueCount,
            )
          : copy.deterministic.noPayablesMessage,
    },
  ];
}

export function buildDeterministicActions(
  summary: AIInsightsFinanceSummary,
  copy: AIInsightsCopy,
): DeterministicAction[] {
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
