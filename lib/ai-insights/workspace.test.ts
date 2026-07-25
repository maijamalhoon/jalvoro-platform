import { describe, expect, it } from "vitest";

import {
  buildInsightKey,
  buildSnapshotKey,
  calculateDataQuality,
  calculateIncomeShockScenario,
  calculatePayablePlanScenario,
  calculateSpendingReductionScenario,
  compareWorkspaceSnapshots,
  type WorkspaceSnapshot,
} from "./workspace";

const cashFlowInsight = {
  topic: "cash-flow" as const,
  attention: "act-now" as const,
  title: "Monthly net needs attention",
  message: "Recorded expenses are above income.",
  confidence: "high" as const,
  dataThrough: "2026-07-24",
  stateKey: "cash-flow:negative:-500",
};

function snapshot(
  overrides: Partial<WorkspaceSnapshot> = {},
): WorkspaceSnapshot {
  const insightKey = buildInsightKey(cashFlowInsight);
  return {
    generatedAt: "2026-07-25T10:00:00.000Z",
    dataThrough: "2026-07-24",
    qualityScore: 70,
    insights: [
      {
        ...cashFlowInsight,
        insightKey,
        stateKey: cashFlowInsight.stateKey,
      },
    ],
    ...overrides,
  };
}

describe("AI Insights data quality", () => {
  it("rewards fresh, categorized, sufficiently deep records", () => {
    const quality = calculateDataQuality({
      transactionCount: 40,
      expenseCount: 20,
      uncategorizedExpenseCount: 2,
      incomeCount: 4,
      activeAccountCount: 2,
      monthCount: 8,
      latestTransactionDate: "2026-07-24",
      now: new Date("2026-07-25T12:00:00.000Z"),
    });

    expect(quality.score).toBe(98);
    expect(quality.grade).toBe("excellent");
    expect(quality.categoryCompleteness).toBe(90);
    expect(quality.ageDays).toBe(1);
    expect(quality.issues).toEqual([]);
  });

  it("describes limited data instead of inflating confidence", () => {
    const quality = calculateDataQuality({
      transactionCount: 2,
      expenseCount: 2,
      uncategorizedExpenseCount: 2,
      incomeCount: 0,
      activeAccountCount: 0,
      monthCount: 1,
      latestTransactionDate: "2026-03-01",
      now: new Date("2026-07-25T12:00:00.000Z"),
    });

    expect(quality.grade).toBe("limited");
    expect(quality.categoryCompleteness).toBe(0);
    expect(quality.issues).toEqual(
      expect.arrayContaining([
        "stale-records",
        "low-volume",
        "uncategorized",
        "no-income",
        "no-active-account",
        "short-history",
      ]),
    );
  });
});

describe("AI Insights workspace history", () => {
  it("keeps saved insight identity stable across language and date changes", () => {
    expect(buildInsightKey(cashFlowInsight)).toBe("jalvoro-cash-flow");
    expect(
      buildInsightKey({
        ...cashFlowInsight,
        title: "ماہانہ نیٹ پر توجہ درکار ہے",
        message: "ریکارڈ شدہ اخراجات آمدنی سے زیادہ ہیں۔",
        dataThrough: "2026-07-25",
      }),
    ).toBe("jalvoro-cash-flow");
  });

  it("creates stable snapshot keys from locale-independent signal state", () => {
    const english = snapshot();
    const translated = snapshot({
      insights: [
        {
          ...cashFlowInsight,
          title: "El neto mensual requiere atención",
          message: "Los gastos registrados superan los ingresos.",
          insightKey: "jalvoro-cash-flow",
          stateKey: cashFlowInsight.stateKey,
        },
      ],
    });

    expect(buildSnapshotKey(english)).toBe(buildSnapshotKey(translated));
  });

  it("classifies attention improvements, resolutions, and quality changes", () => {
    const previous = snapshot();
    const improvedInsight = {
      ...cashFlowInsight,
      attention: "doing-well" as const,
      title: "Positive monthly net",
      message: "Recorded income is now ahead of expenses.",
      stateKey: "cash-flow:positive:750",
    };
    const current = snapshot({
      generatedAt: "2026-07-25T12:00:00.000Z",
      qualityScore: 82,
      insights: [
        {
          ...improvedInsight,
          insightKey: buildInsightKey(improvedInsight),
          stateKey: improvedInsight.stateKey,
        },
      ],
    });

    expect(compareWorkspaceSnapshots(previous, current)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "resolved", topic: "cash-flow" }),
        expect.objectContaining({
          type: "quality-improved",
          topic: "quality",
          previousQuality: 70,
          currentQuality: 82,
        }),
      ]),
    );
  });

  it("detects a material state update without treating translation as change", () => {
    const previous = snapshot();
    const current = snapshot({
      insights: [
        {
          ...cashFlowInsight,
          insightKey: "jalvoro-cash-flow",
          stateKey: "cash-flow:negative:-250",
        },
      ],
    });

    expect(compareWorkspaceSnapshots(previous, current)).toEqual([
      { type: "changed", topic: "cash-flow" },
    ]);
  });

  it("returns a baseline event for the first private snapshot", () => {
    expect(compareWorkspaceSnapshots(null, snapshot())).toEqual([
      { type: "baseline", topic: "overview" },
    ]);
  });
});

describe("AI Insights Scenario Lab", () => {
  const summary = {
    currentMonth: {
      income: 5000,
      expenses: 4000,
      net: 1000,
    },
    payablesSummary: {
      remaining: 2400,
    },
  };

  it("calculates spending reduction without mutating records", () => {
    expect(calculateSpendingReductionScenario(summary, 10)).toEqual({
      percentage: 10,
      monthlyImprovement: 400,
      projectedNet: 1400,
      annualImpact: 4800,
    });
  });

  it("calculates an income stress case deterministically", () => {
    expect(calculateIncomeShockScenario(summary, 20)).toEqual({
      percentage: 20,
      projectedIncome: 4000,
      projectedNet: 0,
      monthlyImpact: 1000,
    });
  });

  it("uses whole months for a straight-line payables plan", () => {
    expect(calculatePayablePlanScenario(summary, 500)).toEqual({
      remaining: 2400,
      monthlyPayment: 500,
      monthsToClear: 5,
    });
    expect(calculatePayablePlanScenario(summary, 0).monthsToClear).toBeNull();
  });
});
