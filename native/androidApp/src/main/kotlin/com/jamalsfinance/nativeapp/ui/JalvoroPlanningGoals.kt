package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.goals.GoalContribution
import com.jamalsfinance.shared.goals.GoalsPayablesSnapshot
import com.jamalsfinance.shared.goals.ModuleAccount
import com.jamalsfinance.shared.goals.NativeGoal
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

private data class GoalDeadlinePresentation(
    val label: String,
    val urgent: Boolean,
)

@Composable
internal fun GoalsScreen(
    snapshot: GoalsPayablesSnapshot,
    onEdit: (NativeGoal) -> Unit,
    onContribute: (NativeGoal) -> Unit,
    onDelete: (NativeGoal) -> Unit,
    onDeleteContribution: (GoalContribution) -> Unit,
) {
    val today = remember { todayIso() }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 110.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        if (snapshot.goals.isNotEmpty()) {
            item {
                JalvoroEntrance(index = 0, key = "goals-summary") {
                    JalvoroGoalsParityOverview(snapshot = snapshot)
                }
            }
        }

        if (snapshot.goals.isEmpty()) {
            item {
                JalvoroEntrance(index = 0, key = "goals-empty") {
                    PlanningEmpty(
                        icon = JalvoroIcons.Target,
                        title = "No goals yet",
                        body = "Create your first goal to see savings progress and deadlines here.",
                    )
                }
            }
        } else {
            items(
                items = snapshot.goals,
                key = { goal -> goal.row.id },
            ) { goal ->
                val index = snapshot.goals.indexOf(goal)
                JalvoroEntrance(
                    index = (index + 1).coerceAtMost(12),
                    key = goal.row.id,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    GoalCard(
                        goal = goal,
                        accounts = snapshot.accounts,
                        today = today,
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
    today: String,
    onEdit: (NativeGoal) -> Unit,
    onContribute: (NativeGoal) -> Unit,
    onDelete: (NativeGoal) -> Unit,
    onDeleteContribution: (GoalContribution) -> Unit,
) {
    var historyVisible by remember(goal.row.id) { mutableStateOf(false) }
    val deadline = remember(goal.row.deadline, goal.completed, today) {
        goalDeadlinePresentation(
            deadline = goal.row.deadline,
            completed = goal.completed,
            today = today,
        )
    }
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
                        text = deadline.label,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (deadline.urgent) {
                            MaterialTheme.colorScheme.error
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
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
                text = "of ${formatPkr(goal.row.targetAmount)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            goal.linkedAccount?.let { account ->
                Text(
                    text = "Linked to ${account.name}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (!goal.completed) {
                    Button(
                        onClick = { onContribute(goal) },
                        shape = RoundedCornerShape(13.dp),
                    ) {
                        Icon(JalvoroIcons.Plus, null, Modifier.size(17.dp))
                        Spacer(Modifier.size(7.dp))
                        Text("Add contribution")
                    }
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
                    Text(
                        if (historyVisible) {
                            "Hide history"
                        } else {
                            "History (${goal.contributions.size})"
                        },
                    )
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
                                metadata = listOfNotNull(
                                    formatPlanningDate(contribution.contributedAt),
                                    accountName,
                                ).joinToString(" • "),
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

private fun goalDeadlinePresentation(
    deadline: String?,
    completed: Boolean,
    today: String,
): GoalDeadlinePresentation {
    if (completed) {
        return GoalDeadlinePresentation(label = "Goal reached", urgent = false)
    }
    if (deadline.isNullOrBlank()) {
        return GoalDeadlinePresentation(label = "No deadline", urgent = false)
    }

    val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        isLenient = false
        timeZone = TimeZone.getTimeZone("UTC")
    }
    val dueDate = runCatching { formatter.parse(deadline) }.getOrNull()
    val todayDate = runCatching { formatter.parse(today) }.getOrNull()
    if (dueDate == null || todayDate == null) {
        return GoalDeadlinePresentation(label = "Due $deadline", urgent = false)
    }

    val daysLeft = ((dueDate.time - todayDate.time) / 86_400_000L).toInt()
    return when {
        daysLeft > 0 -> GoalDeadlinePresentation(
            label = "$daysLeft ${if (daysLeft == 1) "day" else "days"} left",
            urgent = daysLeft < 30,
        )
        daysLeft == 0 -> GoalDeadlinePresentation(label = "Due today", urgent = true)
        else -> GoalDeadlinePresentation(label = "Overdue", urgent = true)
    }
}

private fun formatPlanningDate(value: String?): String? {
    val raw = value?.take(10)?.takeIf { it.matches(Regex("""\d{4}-\d{2}-\d{2}""")) }
        ?: return value?.takeIf { it.isNotBlank() }
    val input = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        isLenient = false
        timeZone = TimeZone.getTimeZone("UTC")
    }
    val output = SimpleDateFormat("MMM d, yyyy", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    return runCatching { input.parse(raw) }
        .getOrNull()
        ?.let(output::format)
        ?: value
}
