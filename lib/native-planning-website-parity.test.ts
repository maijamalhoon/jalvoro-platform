import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const uiRoot = join(
  process.cwd(),
  "native/androidApp/src/main/kotlin/com/jamalsfinance/nativeapp/ui",
);

const goalsSource = readFileSync(
  join(uiRoot, "JalvoroPlanningGoals.kt"),
  "utf8",
);
const payablesSource = readFileSync(
  join(uiRoot, "JalvoroPlanningPayables.kt"),
  "utf8",
);
const dashboardSource = readFileSync(
  join(uiRoot, "JalvoroPlanningDashboard.kt"),
  "utf8",
);

describe("native Planning website parity", () => {
  it("keeps truthful website goal deadline and completion states", () => {
    expect(goalsSource).toContain('label = "Goal reached"');
    expect(goalsSource).toContain('label = "Due today"');
    expect(goalsSource).toContain('label = "Overdue"');
    expect(goalsSource).toContain('"day" else "days"} left');
    expect(goalsSource).toContain('Text("Add contribution")');
    expect(goalsSource).toContain('"History (${goal.contributions.size})"');
  });

  it("keeps the website repayment summary, counted filters and empty states", () => {
    expect(payablesSource).toContain('text = "Repayment pulse"');
    expect(payablesSource).toContain('label = "Already paid"');
    expect(payablesSource).toContain('label = "Still remaining"');
    expect(payablesSource).toContain("statusCounts[item.name.lowercase()]");
    expect(payablesSource).toContain('title = "No payables yet"');
    expect(payablesSource).toContain('title = "No payables found"');
    expect(payablesSource).toContain('"Payment history (${payable.payments.size})"');
    expect(payablesSource).toContain('text = "No payments recorded yet."');
  });

  it("preserves repository-backed contribution and payment mutations", () => {
    expect(dashboardSource).toContain("repository.recordGoalContribution(goal, draft)");
    expect(dashboardSource).toContain("repository.deleteGoalContribution(contribution.id)");
    expect(dashboardSource).toContain("repository.recordLiabilityPayment(payable, draft)");
    expect(dashboardSource).toContain("repository.deleteLiabilityPayment(payment)");
  });
});
