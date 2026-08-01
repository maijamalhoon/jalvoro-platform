import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  calculateKpisForRanges,
  getCurrentAndPreviousRange,
  type AnalyticsTransactionData,
} from "./analytics/calculations";
import {
  convertMoney,
  type CurrencyRates,
  type SupportedCurrency,
} from "./currency";
import { calculateInvestmentPosition } from "./investments/calculations";
import {
  calculateGoalProgress,
  calculatePayableProgress,
  resolvePayableStatus,
} from "./planning/calculations";

type FixtureTransaction = {
  id: string;
  amount: number;
  date: string;
  type: string;
  categoryId: string;
  categoryName: string;
  sourceName?: string;
  itemName?: string;
};

type FinanceParityFixture = {
  contractVersion: number;
  today: string;
  rates: CurrencyRates;
  monthRange: {
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
  };
  transactions: FixtureTransaction[];
  transactionSummary: {
    currentIncome: number;
    currentExpenses: number;
    currentNetSavings: number;
    currentSavingsRate: number;
    previousIncome: number;
    previousExpenses: number;
    previousNetSavings: number;
    previousSavingsRate: number;
  };
  investments: Array<{
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    expected: {
      totalInvested: number;
      currentValue: number;
      totalPnl: number;
      totalPnlPct: number;
    };
  }>;
  currencyConversions: Array<{
    amount: number;
    from: SupportedCurrency;
    to: SupportedCurrency;
    expected: number;
  }>;
  goals: Array<{
    current: number;
    target: number;
    expected: {
      ratio: number;
      percentage: number;
      remaining: number;
      completed: boolean;
    };
  }>;
  payables: Array<{
    paid: number;
    total: number;
    remaining: number;
    dueDate: string | null;
    expected: {
      ratio: number;
      percentage: number;
      status: "pending" | "partial" | "overdue" | "completed";
    };
  }>;
};

const fixture = JSON.parse(
  readFileSync(
    join(process.cwd(), "contracts/finance-parity/v1.json"),
    "utf8",
  ),
) as FinanceParityFixture;

const transactions: AnalyticsTransactionData[] = fixture.transactions.map(
  (transaction) => ({
    ...transaction,
    categoryColor: null,
    accountId: null,
    accountName: null,
    personName: null,
  }),
);

describe("JALVORO finance parity contract v1", () => {
  it("uses the canonical contract version", () => {
    expect(fixture.contractVersion).toBe(1);
  });

  it("keeps website month-to-date ranges aligned with the contract", () => {
    const ranges = getCurrentAndPreviousRange("month", fixture.today);

    expect(ranges).toEqual({
      current: {
        start: fixture.monthRange.currentStart,
        end: fixture.monthRange.currentEnd,
      },
      previous: {
        start: fixture.monthRange.previousStart,
        end: fixture.monthRange.previousEnd,
      },
    });
  });

  it("keeps income, refund-adjusted expenses and savings aligned", () => {
    const ranges = getCurrentAndPreviousRange("month", fixture.today);
    const summary = calculateKpisForRanges(transactions, ranges);

    expect(summary.totalIncome).toBeCloseTo(
      fixture.transactionSummary.currentIncome,
      10,
    );
    expect(summary.totalExpenses).toBeCloseTo(
      fixture.transactionSummary.currentExpenses,
      10,
    );
    expect(summary.netSavings).toBeCloseTo(
      fixture.transactionSummary.currentNetSavings,
      10,
    );
    expect(summary.savingsRate).toBeCloseTo(
      fixture.transactionSummary.currentSavingsRate,
      10,
    );
  });

  it("keeps investment cost, value and P&L aligned", () => {
    for (const investment of fixture.investments) {
      const position = calculateInvestmentPosition(
        investment.quantity,
        investment.purchasePrice,
        investment.currentPrice,
      );

      expect(position).not.toBeNull();
      expect(position?.totalInvested).toBeCloseTo(
        investment.expected.totalInvested,
        10,
      );
      expect(position?.currentValue).toBeCloseTo(
        investment.expected.currentValue,
        10,
      );
      expect(position?.totalPnL).toBeCloseTo(
        investment.expected.totalPnl,
        10,
      );
      expect(position?.totalPnLPct).toBeCloseTo(
        investment.expected.totalPnlPct,
        10,
      );
    }
  });

  it("keeps currency conversion on the single USD pivot", () => {
    for (const conversion of fixture.currencyConversions) {
      expect(
        convertMoney(
          conversion.amount,
          conversion.from,
          conversion.to,
          fixture.rates,
        ),
      ).toBeCloseTo(conversion.expected, 10);
    }
  });

  it("keeps goal progress bounded and truthful", () => {
    for (const goal of fixture.goals) {
      const progress = calculateGoalProgress(goal.current, goal.target);

      expect(progress.ratio).toBeCloseTo(goal.expected.ratio, 10);
      expect(progress.percentage).toBeCloseTo(
        goal.expected.percentage,
        10,
      );
      expect(progress.remaining).toBeCloseTo(goal.expected.remaining, 10);
      expect(progress.completed).toBe(goal.expected.completed);
    }
  });

  it("keeps payable progress and status priority aligned", () => {
    for (const payable of fixture.payables) {
      const progress = calculatePayableProgress(payable.paid, payable.total);
      const status = resolvePayableStatus(
        {
          paidAmount: payable.paid,
          remainingAmount: payable.remaining,
          dueDate: payable.dueDate,
        },
        fixture.today,
      );

      expect(progress.ratio).toBeCloseTo(payable.expected.ratio, 10);
      expect(progress.percentage).toBeCloseTo(
        payable.expected.percentage,
        10,
      );
      expect(status).toBe(payable.expected.status);
    }
  });
});
