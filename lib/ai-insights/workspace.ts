import type {
  InsightAttention,
  InsightTopic,
} from "@/lib/ai-insights/actionable";

export type WorkspaceInsight = {
  topic: InsightTopic;
  attention: InsightAttention;
  title: string;
  message: string;
  confidence?: "high" | "medium" | "low";
  dataThrough?: string | null;
  stateKey?: string;
};

export type SavedInsightStatus = "saved" | "resolved";

export type SavedInsightRecord = {
  insightKey: string;
  topic: InsightTopic;
  title: string;
  message: string;
  status: SavedInsightStatus;
  sourceGeneratedAt: string | null;
  dataThrough: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QualityIssueCode =
  | "no-records"
  | "stale-records"
  | "low-volume"
  | "uncategorized"
  | "no-income"
  | "no-active-account"
  | "short-history";

export type DataQualityInput = {
  transactionCount: number;
  expenseCount: number;
  uncategorizedExpenseCount: number;
  incomeCount: number;
  activeAccountCount: number;
  monthCount: number;
  latestTransactionDate: string | null;
  now?: Date;
};

export type DataQualityResult = {
  score: number;
  grade: "excellent" | "good" | "fair" | "limited";
  categoryCompleteness: number;
  ageDays: number | null;
  issues: QualityIssueCode[];
  metrics: Omit<DataQualityInput, "now">;
};

export type TimelineEventType =
  | "baseline"
  | "new"
  | "improved"
  | "worsened"
  | "resolved"
  | "changed"
  | "quality-improved"
  | "quality-declined"
  | "stable";

export type TimelineEvent = {
  type: TimelineEventType;
  topic: InsightTopic | "quality" | "overview";
  previousAttention?: InsightAttention;
  currentAttention?: InsightAttention;
  previousQuality?: number;
  currentQuality?: number;
};

export type WorkspaceSnapshotInsight = WorkspaceInsight & {
  insightKey: string;
  stateKey: string;
};

export type WorkspaceSnapshot = {
  generatedAt: string;
  dataThrough: string | null;
  qualityScore: number;
  insights: WorkspaceSnapshotInsight[];
};

export type ScenarioSummary = {
  currentMonth: {
    income: number;
    expenses: number;
    net: number;
  };
  payablesSummary: {
    remaining: number;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toSafeNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeKeyPart(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hashKey(source: string) {
  let hash = 5381;
  for (let index = 0; index < source.length; index += 1) {
    hash = (Math.imul(hash, 33) ^ source.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

export function buildInsightKey(insight: WorkspaceInsight) {
  return `jalvoro-${insight.topic}`;
}

export function buildSnapshotKey(snapshot: WorkspaceSnapshot) {
  const signalState = snapshot.insights
    .map(
      (insight) =>
        `${insight.topic}:${insight.attention}:${normalizeKeyPart(insight.stateKey)}`,
    )
    .sort()
    .join("|");
  const source = `${snapshot.dataThrough ?? ""}|${snapshot.qualityScore}|${signalState}`;

  return `workspace-${hashKey(source)}`;
}

export function calculateDataQuality(input: DataQualityInput): DataQualityResult {
  const transactionCount = Math.max(
    0,
    Math.round(toSafeNumber(input.transactionCount)),
  );
  const expenseCount = Math.max(0, Math.round(toSafeNumber(input.expenseCount)));
  const uncategorizedExpenseCount = clamp(
    Math.round(toSafeNumber(input.uncategorizedExpenseCount)),
    0,
    expenseCount,
  );
  const incomeCount = Math.max(0, Math.round(toSafeNumber(input.incomeCount)));
  const activeAccountCount = Math.max(
    0,
    Math.round(toSafeNumber(input.activeAccountCount)),
  );
  const monthCount = Math.max(0, Math.round(toSafeNumber(input.monthCount)));
  const now = input.now ?? new Date();
  const latest = input.latestTransactionDate
    ? new Date(`${input.latestTransactionDate}T12:00:00Z`)
    : null;
  const ageDays =
    latest && Number.isFinite(latest.getTime())
      ? Math.max(
          0,
          Math.floor((now.getTime() - latest.getTime()) / 86_400_000),
        )
      : null;

  const categoryCompleteness =
    expenseCount > 0
      ? Math.round(
          ((expenseCount - uncategorizedExpenseCount) / expenseCount) * 100,
        )
      : 100;

  let score = 0;
  const issues: QualityIssueCode[] = [];

  if (transactionCount === 0) {
    issues.push("no-records");
  }

  if (ageDays === null) {
    score += 0;
  } else if (ageDays <= 7) {
    score += 25;
  } else if (ageDays <= 30) {
    score += 18;
  } else if (ageDays <= 90) {
    score += 9;
    issues.push("stale-records");
  } else {
    issues.push("stale-records");
  }

  if (transactionCount >= 30) score += 20;
  else if (transactionCount >= 12) score += 15;
  else if (transactionCount >= 4) {
    score += 8;
    issues.push("low-volume");
  } else if (transactionCount > 0) {
    score += 3;
    issues.push("low-volume");
  }

  score += Math.round((categoryCompleteness / 100) * 20);
  if (categoryCompleteness < 85) issues.push("uncategorized");

  if (incomeCount > 0) score += 15;
  else issues.push("no-income");

  if (activeAccountCount > 0) score += 10;
  else issues.push("no-active-account");

  if (monthCount >= 6) score += 10;
  else if (monthCount >= 3) score += 7;
  else if (monthCount >= 1) {
    score += 3;
    issues.push("short-history");
  } else {
    issues.push("short-history");
  }

  const roundedScore = clamp(Math.round(score), 0, 100);
  const grade =
    roundedScore >= 85
      ? "excellent"
      : roundedScore >= 70
        ? "good"
        : roundedScore >= 50
          ? "fair"
          : "limited";

  return {
    score: roundedScore,
    grade,
    categoryCompleteness,
    ageDays,
    issues: Array.from(new Set(issues)),
    metrics: {
      transactionCount,
      expenseCount,
      uncategorizedExpenseCount,
      incomeCount,
      activeAccountCount,
      monthCount,
      latestTransactionDate: input.latestTransactionDate,
    },
  };
}

const ATTENTION_RANK: Record<InsightAttention, number> = {
  "doing-well": 0,
  "watch-closely": 1,
  "act-now": 2,
};

export function compareWorkspaceSnapshots(
  previous: WorkspaceSnapshot | null,
  current: WorkspaceSnapshot,
): TimelineEvent[] {
  if (!previous) {
    return [{ type: "baseline", topic: "overview" }];
  }

  const events: TimelineEvent[] = [];
  const previousByTopic = new Map(
    previous.insights.map((insight) => [insight.topic, insight]),
  );

  for (const insight of current.insights) {
    const prior = previousByTopic.get(insight.topic);
    if (!prior) {
      events.push({ type: "new", topic: insight.topic });
      continue;
    }

    const priorRank = ATTENTION_RANK[prior.attention];
    const currentRank = ATTENTION_RANK[insight.attention];

    if (prior.attention === "act-now" && insight.attention === "doing-well") {
      events.push({
        type: "resolved",
        topic: insight.topic,
        previousAttention: prior.attention,
        currentAttention: insight.attention,
      });
    } else if (currentRank > priorRank) {
      events.push({
        type: "worsened",
        topic: insight.topic,
        previousAttention: prior.attention,
        currentAttention: insight.attention,
      });
    } else if (currentRank < priorRank) {
      events.push({
        type: "improved",
        topic: insight.topic,
        previousAttention: prior.attention,
        currentAttention: insight.attention,
      });
    } else if (prior.stateKey !== insight.stateKey) {
      events.push({ type: "changed", topic: insight.topic });
    }
  }

  const qualityDelta = current.qualityScore - previous.qualityScore;
  if (qualityDelta >= 8) {
    events.push({
      type: "quality-improved",
      topic: "quality",
      previousQuality: previous.qualityScore,
      currentQuality: current.qualityScore,
    });
  } else if (qualityDelta <= -8) {
    events.push({
      type: "quality-declined",
      topic: "quality",
      previousQuality: previous.qualityScore,
      currentQuality: current.qualityScore,
    });
  }

  return events.length ? events : [{ type: "stable", topic: "overview" }];
}

export function calculateSpendingReductionScenario(
  summary: ScenarioSummary,
  reductionPct: number,
) {
  const percentage = clamp(toSafeNumber(reductionPct), 0, 50);
  const monthlyImprovement =
    summary.currentMonth.expenses * (percentage / 100);
  return {
    percentage,
    monthlyImprovement,
    projectedNet: summary.currentMonth.net + monthlyImprovement,
    annualImpact: monthlyImprovement * 12,
  };
}

export function calculateIncomeShockScenario(
  summary: ScenarioSummary,
  reductionPct: number,
) {
  const percentage = clamp(toSafeNumber(reductionPct), 0, 80);
  const projectedIncome =
    summary.currentMonth.income * (1 - percentage / 100);
  return {
    percentage,
    projectedIncome,
    projectedNet: projectedIncome - summary.currentMonth.expenses,
    monthlyImpact: summary.currentMonth.income - projectedIncome,
  };
}

export function calculatePayablePlanScenario(
  summary: ScenarioSummary,
  monthlyPayment: number,
) {
  const remaining = Math.max(
    0,
    toSafeNumber(summary.payablesSummary.remaining),
  );
  const payment = Math.max(0, toSafeNumber(monthlyPayment));
  return {
    remaining,
    monthlyPayment: payment,
    monthsToClear:
      remaining > 0 && payment > 0 ? Math.ceil(remaining / payment) : null,
  };
}
