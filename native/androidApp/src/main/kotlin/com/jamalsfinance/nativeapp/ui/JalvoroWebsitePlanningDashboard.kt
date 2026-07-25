package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.goals.GoalContribution
import com.jamalsfinance.shared.goals.GoalsPayablesRepository
import com.jamalsfinance.shared.goals.GoalsPayablesResult
import com.jamalsfinance.shared.goals.GoalsPayablesState
import com.jamalsfinance.shared.goals.LiabilityPayment
import com.jamalsfinance.shared.goals.NativeGoal
import com.jamalsfinance.shared.goals.NativePayable
import kotlinx.coroutines.launch

@Composable
fun JalvoroWebsiteGoalsPayablesDashboard(
    email: String,
    repository: GoalsPayablesRepository,
    onOverview: () -> Unit,
    onMoney: () -> Unit,
    onInvestments: () -> Unit,
    onReports: () -> Unit,
    onSettings: () -> Unit,
    onMore: () -> Unit,
) {
    val state by repository.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var section by remember { mutableStateOf(GoalPayableSection.Goals) }
    var addGoal by remember { mutableStateOf(false) }
    var editGoal by remember { mutableStateOf<NativeGoal?>(null) }
    var contributionGoal by remember { mutableStateOf<NativeGoal?>(null) }
    var deleteGoal by remember { mutableStateOf<NativeGoal?>(null) }
    var deleteContribution by remember { mutableStateOf<GoalContribution?>(null) }
    var addPayable by remember { mutableStateOf(false) }
    var editPayable by remember { mutableStateOf<NativePayable?>(null) }
    var paymentPayable by remember { mutableStateOf<NativePayable?>(null) }
    var deletePayable by remember { mutableStateOf<NativePayable?>(null) }
    var deletePayment by remember { mutableStateOf<LiabilityPayment?>(null) }

    LaunchedEffect(repository) { repository.refresh(force = true) }

    val snapshot = when (val current = state) {
        is GoalsPayablesState.Ready -> current.snapshot
        is GoalsPayablesState.Loading -> current.previous
        is GoalsPayablesState.Failure -> current.previous
        GoalsPayablesState.Idle -> null
    }
    val refreshing = state is GoalsPayablesState.Loading

    fun report(result: GoalsPayablesResult, success: String) {
        scope.launch {
            snackbar.showSnackbar(
                when (result) {
                    GoalsPayablesResult.Success -> success
                    is GoalsPayablesResult.Failure -> result.message
                },
            )
        }
    }

    JalvoroWebsiteWorkspaceShell(
        email = email,
        selected = JalvoroWebsiteDestination.Planning,
        onOverview = onOverview,
        onMoney = onMoney,
        onPlanning = {},
        onInvestments = onInvestments,
        onReports = onReports,
        onSettings = onSettings,
        onMore = onMore,
    ) { shellPadding ->
        Scaffold(
            modifier = Modifier.fillMaxSize().padding(shellPadding),
            snackbarHost = { SnackbarHost(snackbar) },
            containerColor = Color.Transparent,
        ) { scaffoldPadding ->
            Column(modifier = Modifier.fillMaxSize().padding(scaffoldPadding)) {
                WebsitePlanningHeader(
                    section = section,
                    refreshing = refreshing,
                    onSection = { section = it },
                    onRefresh = {
                        scope.launch { report(repository.refresh(force = true), "Planning data refreshed") }
                    },
                    onAdd = {
                        if (section == GoalPayableSection.Goals) addGoal = true else addPayable = true
                    },
                )
                Box(
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    contentAlignment = Alignment.TopCenter,
                ) {
                    when {
                        state is GoalsPayablesState.Loading && snapshot == null -> PlanningProgress()
                        state is GoalsPayablesState.Failure && snapshot == null -> PlanningEmpty(
                            icon = JalvoroIcons.Warning,
                            title = "Planning data could not load",
                            body = (state as GoalsPayablesState.Failure).message,
                            action = "Try again",
                            onAction = { scope.launch { repository.refresh(force = true) } },
                        )
                        snapshot != null -> Column(
                            modifier = Modifier.fillMaxSize().widthIn(max = 1_000.dp),
                        ) {
                            if (state is GoalsPayablesState.Failure) {
                                JalvoroFeedbackCard(
                                    message = (state as GoalsPayablesState.Failure).message,
                                    tone = JalvoroFeedbackTone.Warning,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                )
                            }
                            JalvoroAnimatedSwap(
                                targetState = section,
                                modifier = Modifier.fillMaxSize(),
                                label = "website-planning-section",
                            ) { currentSection ->
                                if (currentSection == GoalPayableSection.Goals) {
                                    GoalsScreen(
                                        snapshot = snapshot,
                                        onEdit = { editGoal = it },
                                        onContribute = { contributionGoal = it },
                                        onDelete = { deleteGoal = it },
                                        onDeleteContribution = { deleteContribution = it },
                                    )
                                } else {
                                    PayablesScreen(
                                        snapshot = snapshot,
                                        onEdit = { editPayable = it },
                                        onPayment = { paymentPayable = it },
                                        onDelete = { deletePayable = it },
                                        onDeletePayment = { deletePayment = it },
                                    )
                                }
                            }
                        }
                        else -> PlanningProgress()
                    }
                }
            }
        }
    }

    if (addGoal && snapshot != null) {
        GoalDialog(existing = null, accounts = snapshot.activeAccounts, onDismiss = { addGoal = false }) { draft ->
            val result = repository.createGoal(draft)
            if (result is GoalsPayablesResult.Success) addGoal = false
            report(result, "Goal created")
        }
    }
    editGoal?.let { goal ->
        GoalDialog(existing = goal, accounts = snapshot?.activeAccounts.orEmpty(), onDismiss = { editGoal = null }) { draft ->
            val result = repository.updateGoal(goal, draft)
            if (result is GoalsPayablesResult.Success) editGoal = null
            report(result, "Goal updated")
        }
    }
    contributionGoal?.let { goal ->
        GoalContributionDialog(
            goal = goal,
            accounts = snapshot?.activeAccounts.orEmpty(),
            onDismiss = { contributionGoal = null },
        ) { draft ->
            val result = repository.recordGoalContribution(goal, draft)
            if (result is GoalsPayablesResult.Success) contributionGoal = null
            report(result, "Contribution recorded")
        }
    }
    if (addPayable && snapshot != null) {
        PayableDialog(existing = null, accounts = snapshot.activeAccounts, onDismiss = { addPayable = false }) { draft ->
            val result = repository.createPayable(draft)
            if (result is GoalsPayablesResult.Success) addPayable = false
            report(result, "Payable created")
        }
    }
    editPayable?.let { payable ->
        PayableDialog(
            existing = payable,
            accounts = snapshot?.activeAccounts.orEmpty(),
            onDismiss = { editPayable = null },
        ) { draft ->
            val result = repository.updatePayable(payable, draft)
            if (result is GoalsPayablesResult.Success) editPayable = null
            report(result, "Payable updated")
        }
    }
    paymentPayable?.let { payable ->
        LiabilityPaymentDialog(
            payable = payable,
            accounts = snapshot?.activeAccounts.orEmpty(),
            onDismiss = { paymentPayable = null },
        ) { draft ->
            val result = repository.recordLiabilityPayment(payable, draft)
            if (result is GoalsPayablesResult.Success) paymentPayable = null
            report(result, "Payment recorded")
        }
    }

    deleteGoal?.let { goal ->
        ConfirmPlanningAction(
            title = "Delete goal?",
            text = "${goal.row.name} and its contribution source records will be removed. Ledger history remains archived by the database.",
            confirmLabel = "Delete goal",
            onDismiss = { deleteGoal = null },
        ) {
            scope.launch {
                val result = repository.deleteGoal(goal.row.id)
                deleteGoal = null
                report(result, "Goal deleted")
            }
        }
    }
    deleteContribution?.let { contribution ->
        ConfirmPlanningAction(
            title = "Remove contribution?",
            text = "The goal total and linked ledger history will be recalculated securely.",
            confirmLabel = "Remove contribution",
            onDismiss = { deleteContribution = null },
        ) {
            scope.launch {
                val result = repository.deleteGoalContribution(contribution.id)
                deleteContribution = null
                report(result, "Contribution removed")
            }
        }
    }
    deletePayable?.let { payable ->
        ConfirmPlanningAction(
            title = "Delete payable?",
            text = "${payable.row.personName} will be removed. Linked transaction history remains archived.",
            confirmLabel = "Delete payable",
            onDismiss = { deletePayable = null },
        ) {
            scope.launch {
                val result = repository.deletePayable(payable.row.id)
                deletePayable = null
                report(result, "Payable deleted")
            }
        }
    }
    deletePayment?.let { payment ->
        ConfirmPlanningAction(
            title = "Remove payment?",
            text = "The payable balance and source account balance will be restored through the dedicated database RPC.",
            confirmLabel = "Remove payment",
            onDismiss = { deletePayment = null },
        ) {
            scope.launch {
                val result = repository.deleteLiabilityPayment(payment)
                deletePayment = null
                report(result, "Payment removed")
            }
        }
    }
}

@Composable
private fun WebsitePlanningHeader(
    section: GoalPayableSection,
    refreshing: Boolean,
    onSection: (GoalPayableSection) -> Unit,
    onRefresh: () -> Unit,
    onAdd: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "Planning",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.semantics { heading() },
                )
                Text(
                    text = if (section == GoalPayableSection.Goals) {
                        "Goals, contributions and savings targets"
                    } else {
                        "Payables, repayments and due-date status"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            JalvoroIconAction(
                icon = JalvoroIcons.Refresh,
                label = if (refreshing) "Refreshing planning" else "Refresh planning",
                enabled = !refreshing,
                onClick = onRefresh,
            )
            Button(onClick = onAdd, shape = RoundedCornerShape(14.dp)) {
                Icon(JalvoroIcons.Plus, contentDescription = null, modifier = Modifier.size(17.dp))
                Spacer(Modifier.size(7.dp))
                Text(if (section == GoalPayableSection.Goals) "Add goal" else "Add payable")
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            FilterChip(
                selected = section == GoalPayableSection.Goals,
                onClick = { onSection(GoalPayableSection.Goals) },
                modifier = Modifier.weight(1f),
                leadingIcon = { Icon(JalvoroIcons.Target, contentDescription = null, modifier = Modifier.size(16.dp)) },
                label = { Text("Goals", maxLines = 1, overflow = TextOverflow.Ellipsis) },
            )
            FilterChip(
                selected = section == GoalPayableSection.Payables,
                onClick = { onSection(GoalPayableSection.Payables) },
                modifier = Modifier.weight(1f),
                leadingIcon = { Icon(JalvoroIcons.Wallet, contentDescription = null, modifier = Modifier.size(16.dp)) },
                label = { Text("Payables", maxLines = 1, overflow = TextOverflow.Ellipsis) },
            )
        }
    }
}
