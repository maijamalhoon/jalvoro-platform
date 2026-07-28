import fs from "node:fs";
import path from "node:path";

const workspace = process.env.GITHUB_WORKSPACE;
if (!workspace) throw new Error("GITHUB_WORKSPACE is required.");

const uiRoot = path.join(
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
);

function replaceExactly(fileName, before, after, label) {
  const filePath = path.join(uiRoot, fileName);
  const source = fs.readFileSync(filePath, "utf8");
  if (source.includes(after)) {
    console.log(`Verified ${label}.`);
    return;
  }
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one ${label} block, found ${count}.`);
  fs.writeFileSync(filePath, source.replace(before, after));
  console.log(`Applied ${label}.`);
}

replaceExactly(
  "JalvoroPlanningGoals.kt",
`                    PlanningHeroCard(
                        icon = JalvoroIcons.Target,
                        eyebrow = "Savings progress",
                        primary = formatPkr(snapshot.totalGoalSaved),
                        secondary = "Saved of \${formatPkr(snapshot.totalGoalTarget)}",
                        detail = "\${snapshot.completedGoals} of \${snapshot.goals.size} goals completed",
                        progress = if (snapshot.totalGoalTarget > 0) {
                            snapshot.totalGoalSaved / snapshot.totalGoalTarget
                        } else {
                            0.0
                        },
                    )`,
`                    JalvoroGoalsParityOverview(snapshot = snapshot)`,
  "website Goals pulse summary",
);

replaceExactly(
  "JalvoroPlanningPayables.kt",
`                    PayablesPulseCard(
                        snapshot = snapshot,
                        overdueCount = statusCounts["overdue"] ?: 0,
                    )`,
`                    JalvoroPayablesParityOverview(
                        snapshot = snapshot,
                        overdueCount = statusCounts["overdue"] ?: 0,
                    )`,
  "website Payables repayment pulse",
);

replaceExactly(
  "JalvoroPlanningPayables.kt",
`            item {
                JalvoroEntrance(index = 1, key = "payables-search") {
                    OutlinedTextField(
                        value = search,
                        onValueChange = { search = it },
                        modifier = Modifier.fillMaxWidth(),
                        leadingIcon = {
                            Icon(
                                imageVector = JalvoroIcons.Search,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                            )
                        },
                        label = { Text("Search payables") },
                        placeholder = { Text("Person, item, reason, or notes") },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                    )
                }
            }
            item {
                JalvoroEntrance(index = 2, key = "payables-filters") {
                    Row(
                        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        PayableFilter.entries.forEach { item ->
                            val count = if (item == PayableFilter.All) {
                                snapshot.payables.size
                            } else {
                                statusCounts[item.name.lowercase()] ?: 0
                            }
                            FilterChip(
                                selected = filter == item,
                                onClick = { filter = item },
                                label = { Text("\${item.name} \$count") },
                            )
                        }
                    }
                }
            }`,
`            item {
                JalvoroEntrance(index = 1, key = "payables-filters") {
                    Row(
                        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        PayableFilter.entries.forEach { item ->
                            val count = if (item == PayableFilter.All) {
                                snapshot.payables.size
                            } else {
                                statusCounts[item.name.lowercase()] ?: 0
                            }
                            FilterChip(
                                selected = filter == item,
                                onClick = { filter = item },
                                label = { Text("\${item.name} \$count") },
                            )
                        }
                    }
                }
            }
            item {
                JalvoroEntrance(index = 2, key = "payables-search") {
                    OutlinedTextField(
                        value = search,
                        onValueChange = { search = it },
                        modifier = Modifier.fillMaxWidth(),
                        leadingIcon = {
                            Icon(
                                imageVector = JalvoroIcons.Search,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                            )
                        },
                        label = { Text("Search payables") },
                        placeholder = { Text("Person, item, reason, or notes") },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                    )
                }
            }`,
  "website Payables filter-before-search order",
);

const planningOverviewPath = path.join(uiRoot, "JalvoroPlanningParityOverview.kt");
const invalidWeightImport = "import androidx.compose.foundation.layout.weight\n";
const planningOverviewSource = fs.readFileSync(planningOverviewPath, "utf8");
if (planningOverviewSource.includes(invalidWeightImport)) {
  fs.writeFileSync(
    planningOverviewPath,
    planningOverviewSource.replace(invalidWeightImport, ""),
  );
  console.log("Removed invalid explicit Compose weight import.");
} else {
  console.log("Verified Compose weight uses RowScope and ColumnScope member extensions.");
}

for (const [fileName, requiredTokens] of [
  ["JalvoroPlanningGoals.kt", ["JalvoroGoalsParityOverview(snapshot = snapshot)"]],
  ["JalvoroPlanningPayables.kt", ["JalvoroPayablesParityOverview(", "key = \"payables-filters\"", "key = \"payables-search\""]],
  ["JalvoroPlanningParityOverview.kt", ["Goals pulse", "Repayment pulse", "PlanningParityProgressRing", "Total target", "Still remaining"]],
]) {
  const source = fs.readFileSync(path.join(uiRoot, fileName), "utf8");
  for (const token of requiredTokens) {
    if (!source.includes(token)) {
      throw new Error(`Required exact Planning parity token is missing from ${fileName}: ${token}`);
    }
  }
}

const finalPlanningOverview = fs.readFileSync(planningOverviewPath, "utf8");
if (finalPlanningOverview.includes(invalidWeightImport)) {
  throw new Error("Invalid explicit Compose weight import remains in Planning parity source.");
}

console.log("Website Planning overview hierarchy is enforced for the native build.");