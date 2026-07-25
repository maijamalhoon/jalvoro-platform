export type InsightTopic =
  | "cash-flow"
  | "spending"
  | "goals"
  | "payables"
  | "overview";

export type InsightAttention =
  | "act-now"
  | "watch-closely"
  | "doing-well";

export type InsightActionTarget =
  | "/dashboard/transactions"
  | "/dashboard/analytics"
  | "/dashboard/goals"
  | "/dashboard/payables";

export type ActionableInsightType = "positive" | "warning" | "tip";

export type ActionableFinanceSummary = {
  currentMonth: {
    net: number;
  };
  goalsSummary: {
    count: number;
  };
  payablesSummary: {
    remaining: number;
    overdueCount: number;
  };
};

const TOPICS: InsightTopic[] = [
  "cash-flow",
  "spending",
  "goals",
  "payables",
];

export function getInsightTopic(index: number): InsightTopic {
  return TOPICS[index] ?? "overview";
}

export function getInsightActionTarget(
  topic: InsightTopic,
): InsightActionTarget {
  if (topic === "cash-flow") return "/dashboard/transactions";
  if (topic === "spending") return "/dashboard/analytics";
  if (topic === "goals") return "/dashboard/goals";
  if (topic === "payables") return "/dashboard/payables";
  return "/dashboard/analytics";
}

export function getInsightAttention({
  topic,
  type,
  summary,
}: {
  topic: InsightTopic;
  type: ActionableInsightType;
  summary: ActionableFinanceSummary;
}): InsightAttention {
  if (topic === "payables" && summary.payablesSummary.overdueCount > 0) {
    return "act-now";
  }

  if (topic === "cash-flow" && summary.currentMonth.net < 0) {
    return "act-now";
  }

  if (type === "warning") return "act-now";
  if (type === "positive") return "doing-well";
  return "watch-closely";
}
