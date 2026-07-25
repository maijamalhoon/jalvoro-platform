import { describe, expect, it } from "vitest";

import {
  getInsightActionTarget,
  getInsightAttention,
  getInsightTopic,
  type ActionableFinanceSummary,
} from "./actionable";

const summary: ActionableFinanceSummary = {
  currentMonth: { net: 250 },
  goalsSummary: { count: 1 },
  payablesSummary: { remaining: 0, overdueCount: 0 },
};

describe("AI Insights actionable metadata", () => {
  it("assigns stable topics by insight contract order", () => {
    expect([0, 1, 2, 3, 4].map(getInsightTopic)).toEqual([
      "cash-flow",
      "spending",
      "goals",
      "payables",
      "overview",
    ]);
  });

  it("maps topics only to existing read-only dashboard routes", () => {
    expect(getInsightActionTarget("cash-flow")).toBe(
      "/dashboard/transactions",
    );
    expect(getInsightActionTarget("spending")).toBe("/dashboard/analytics");
    expect(getInsightActionTarget("goals")).toBe("/dashboard/goals");
    expect(getInsightActionTarget("payables")).toBe("/dashboard/payables");
    expect(getInsightActionTarget("overview")).toBe("/dashboard/analytics");
  });

  it("promotes negative cash flow and overdue payables to act now", () => {
    expect(
      getInsightAttention({
        topic: "cash-flow",
        type: "tip",
        summary: { ...summary, currentMonth: { net: -1 } },
      }),
    ).toBe("act-now");

    expect(
      getInsightAttention({
        topic: "payables",
        type: "tip",
        summary: {
          ...summary,
          payablesSummary: { remaining: 100, overdueCount: 1 },
        },
      }),
    ).toBe("act-now");
  });

  it("uses the verified insight type for the remaining buckets", () => {
    expect(
      getInsightAttention({ topic: "spending", type: "warning", summary }),
    ).toBe("act-now");
    expect(
      getInsightAttention({ topic: "spending", type: "tip", summary }),
    ).toBe("watch-closely");
    expect(
      getInsightAttention({ topic: "goals", type: "positive", summary }),
    ).toBe("doing-well");
  });
});
