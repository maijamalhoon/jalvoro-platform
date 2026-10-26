import fs from "node:fs";
import path from "node:path";

const workspace = process.env.GITHUB_WORKSPACE;
if (!workspace) throw new Error("GITHUB_WORKSPACE is required.");

const overviewPath = path.join(
  workspace,
  "native",
  "androidApp",
  "src",
  "main",
  "kotlin",
  "com",
  "jamalsfinance",
  "nativeapp",
  "ui",
  "JalvoroOverviewDashboard.kt",
);

function replaceExactly(before, after, label) {
  const source = fs.readFileSync(overviewPath, "utf8");
  if (source.includes(after)) {
    console.log(`Verified ${label}.`);
    return;
  }
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one ${label} block, found ${count}.`);
  fs.writeFileSync(overviewPath, source.replace(before, after));
  console.log(`Applied ${label}.`);
}

const compactMetrics = `                    item {
                        JalvoroEntrance(index = 2, key = "overview-monthly-summary") {
                            JalvoroOverviewMonthlyPanel(
                                savings = currentMonth?.netSavings,
                                income = currentMonth?.income,
                                expenses = currentMonth?.expenses,
                                investment = investmentContribution,
                            )
                        }
                    }`;

const websiteMetrics = `                    itemsIndexed(
                        items = metricRows,
                        key = { _, row -> row.joinToString("|") { it.title } },
                    ) { rowIndex, row ->
                        JalvoroEntrance(
                            index = 2 + rowIndex,
                            key = row.joinToString("|") { "\${it.title}:\${it.amount}:\${it.previousAmount}" },
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                row.forEach { metric ->
                                    OverviewMetricCard(
                                        metric = metric,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                                if (twoColumns && row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }`;

replaceExactly(
  compactMetrics,
  websiteMetrics,
  "website-parity Overview month-to-date metric grid",
);

const compactPulse = `                    item {
                        JalvoroEntrance(index = 3, key = "overview-today-panel") {
                            JalvoroOverviewTodayPanel(
                                income = today?.income,
                                expenses = today?.expenses,
                                net = today?.netSavings,
                                daysRemaining = period.remainingDays,
                            )
                        }
                    }`;

const websitePulse = `                    item {
                        JalvoroEntrance(index = 4, key = "overview-pulse-heading") {
                            OverviewSectionHeading(
                                title = "Today’s financial pulse",
                                description = "Live values from today’s owner-scoped activity.",
                            )
                        }
                    }

                    itemsIndexed(
                        items = pulseRows,
                        key = { _, row -> row.joinToString("|") { it.title } },
                    ) { rowIndex, row ->
                        JalvoroEntrance(index = 5 + rowIndex, key = row.joinToString("|") { it.value }) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                row.forEach { pulse ->
                                    OverviewPulseCard(
                                        pulse = pulse,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                                if (wide && row.size < 4) {
                                    repeat(4 - row.size) { Spacer(Modifier.weight(1f)) }
                                }
                            }
                        }
                    }`;

replaceExactly(
  compactPulse,
  websitePulse,
  "website-parity Overview financial pulse",
);

const finalSource = fs.readFileSync(overviewPath, "utf8");
for (const token of [
  "OverviewMetricCard(",
  "OverviewPulseCard(",
  "Today’s financial pulse",
  "JalvoroOverviewHeroCard(",
  "JalvoroOverviewTopBar(",
]) {
  if (!finalSource.includes(token)) {
    throw new Error(`Required exact Overview parity token is missing: ${token}`);
  }
}

console.log("Website Overview hierarchy is enforced for the native build.");
