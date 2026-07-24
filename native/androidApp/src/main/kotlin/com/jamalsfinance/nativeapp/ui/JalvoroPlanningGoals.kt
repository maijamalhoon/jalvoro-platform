package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.finance.SupportedFinanceCurrencies
import com.jamalsfinance.shared.goals.*
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.launch

@Composable
internal fun GoalsScreen(
    snapshot: GoalsPayablesSnapshot,
    onEdit: (NativeGoal) -> Unit,
    onContribute: (NativeGoal) -> Unit,
    onDelete: (NativeGoal) -> Unit,
    onDeleteContribution: (GoalContribution) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 110.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            JalvoroEntrance(index = 0, key = "goals-hero") {
                PlanningHeroCard(
                    icon = JalvoroIcons.Target,
                    eyebrow = "Savings progress",
                    primary = formatPkr(snapshot.totalGoalSaved),
                    secondary = "Saved of ${formatPkr(snapshot.totalGoalTarget)}",
                    detail = "${snapshot.completedGoals} of ${snapshot.goals.size} goals completed",
                    progress = if (snapshot.totalGoalTarget > 0) snapshot.totalGoalSaved / snapshot.totalGoalTarget else 0.0,
                )
            }
        }
        if (snapshot.goals.isEmpty()) {
            item {
                JalvoroEntrance(index = 1, key = "goals-empty") {
                    PlanningEmpty(
                        icon = JalvoroIcons.Target,
                        title = "No goals yet",
                        body = "Create a savings target and track every real contribution.",
                    )
                }
            }
        } else {
            items(snapshot.goals.size, key = { index -> snapshot.goals[index].row.id }) { index ->
                val goal = snapshot.goals[index]
                JalvoroEntrance(
                    index = (index + 1).coerceAtMost(12),
                    key = goal.row.id,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    GoalCard(
                        goal = goal,
                        accounts = snapshot.accounts,
                        onEdit = onEdit,
                        onContribute = onContribute,
                        onDelete = onDelete,
                        onDeleteContribution = onDeleteContribution,
                    )
                }
            }
        }
    }
}

@Composable
internal fun GoalCard(
    goal: NativeGoal,
    accounts: List<ModuleAccount>,
    onEdit: (NativeGoal) -> Unit,
    onContribute: (NativeGoal) -> Unit,
    onDelete: (NativeGoal) -> Unit,
    onDeleteContribution: (GoalContribution) -> Unit,
) {
    var historyVisible by remember(goal.row.id) { mutableStateOf(false) }
    val animatedProgress = rememberJalvoroAnimatedProgress(
        target = goal.progress.toFloat(),
        label = "goal-${goal.row.id}-progress",
    )
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                PlanningIconTile(JalvoroIcons.Target)
                Column(Modifier.weight(1f)) {
                    Text(
                        text = goal.row.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.semantics { heading() },
                    )
                    Text(
                        text = when {
                            goal.completed -> "Completed"
                            goal.row.deadline.isNullOrBlank() -> "No deadline"
                            else -> "Due ${goal.row.deadline}"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                PlanningStatusPill(
                    text = if (goal.completed) "Completed" else "${(goal.progress * 100).toInt()}%",
                    tone = if (goal.completed) PlanningTone.Success else PlanningTone.Info,
                )
            }

            LinearProgressIndicator(
                progress = { animatedProgress },
                modifier = Modifier.fillMaxWidth(),
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                PlanningMetric("Saved", formatPkr(goal.currentAmount))
                PlanningMetric("Remaining", formatPkr(goal.remainingAmount), endAligned = true)
            }

            Text(
                text = "Target ${formatPkr(goal.row.targetAmount)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            goal.linkedAccount?.let {
                Text(
                    text = "Linked account: ${it.name}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Button(
                    onClick = { onContribute(goal) },
                    enabled = !goal.completed,
                    shape = RoundedCornerShape(13.dp),
                ) {
                    Icon(JalvoroIcons.Plus, null, Modifier.size(17.dp))
                    Spacer(Modifier.size(7.dp))
                    Text("Contribute")
                }
                OutlinedButton(
                    onClick = { onEdit(goal) },
                    shape = RoundedCornerShape(13.dp),
                ) {
                    Icon(JalvoroIcons.Settings, null, Modifier.size(17.dp))
                    Spacer(Modifier.size(7.dp))
                    Text("Edit")
                }
                TextButton(onClick = { onDelete(goal) }) {
                    Icon(JalvoroIcons.Warning, null, Modifier.size(17.dp))
                    Spacer(Modifier.size(7.dp))
                    Text("Delete")
                }
            }

            if (goal.contributions.isNotEmpty()) {
                OutlinedButton(
                    onClick = { historyVisible = !historyVisible },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(13.dp),
                ) {
                    Icon(JalvoroIcons.Transactions, null, Modifier.size(17.dp))
                    Spacer(Modifier.size(7.dp))
                    Text(if (historyVisible) "Hide contribution history" else "Contribution history (${goal.contributions.size})")
                }
                JalvoroAnimatedReveal(visible = historyVisible) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        goal.contributions.forEach { contribution ->
                            val accountName = contribution.accountId?.let { id ->
                                accounts.firstOrNull { it.id == id }?.name
                            }
                            PlanningHistoryRow(
                                icon = JalvoroIcons.Income,
                                amount = formatPkr(contribution.amount),
                                metadata = listOfNotNull(contribution.contributedAt, accountName).joinToString(" • "),
                                note = contribution.note,
                                removable = true,
                                onRemove = { onDeleteContribution(contribution) },
                            )
                        }
                    }
                }
            }
        }
    }
}
