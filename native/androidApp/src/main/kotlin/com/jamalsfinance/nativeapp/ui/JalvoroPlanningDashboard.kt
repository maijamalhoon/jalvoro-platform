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

internal enum class GoalPayableSection { Goals, Payables }
internal enum class PayableFilter { All, Pending, Partial, Overdue, Completed }

@Composable
fun JalvoroGoalsPayablesDashboard(
    repository: GoalsPayablesRepository,
    onBack: () -> Unit,
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

    Scaffold(
        topBar = {
            JalvoroPlanningHeader(
                section = section,
                onBack = onBack,
                onRefresh = {
                    scope.launch {
                        report(repository.refresh(force = true), "Planning data refreshed")
                    }
                },
            )
        },
        bottomBar = {
            JalvoroNavigationBar(
                destinations = listOf(
                    JalvoroNavigationDestination(
                        label = "Goals",
                        icon = JalvoroIcons.Target,
                        selected = section == GoalPayableSection.Goals,
                        onClick = { section = GoalPayableSection.Goals },
                    ),
                    JalvoroNavigationDestination(
                        label = "Payables",
                        icon = JalvoroIcons.Wallet,
                        selected = section == GoalPayableSection.Payables,
                        onClick = { section = GoalPayableSection.Payables },
                    ),
                ),
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = {
                    if (section == GoalPayableSection.Goals) addGoal = true else addPayable = true
                },
                shape = RoundedCornerShape(16.dp),
                text = {
                    Text(
                        if (section == GoalPayableSection.Goals) "Add goal" else "Add payable",
                        fontWeight = FontWeight.Bold,
                    )
                },
                icon = {
                    Icon(
                        imageVector = JalvoroIcons.Plus,
                        contentDescription = null,
                        modifier = Modifier.size(19.dp),
                    )
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Box(
            modifier = Modifier.fillMaxSize().padding(padding),
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
                    modifier = Modifier.fillMaxSize().widthIn(max = 920.dp),
                ) {
                    if (state is GoalsPayablesState.Failure) {
                        JalvoroFeedbackCard(
                            message = (state as GoalsPayablesState.Failure).message,
                            tone = JalvoroFeedbackTone.Warning,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        )
                    }
                    if (section == GoalPayableSection.Goals) {
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
                else -> PlanningProgress()
            }
        }
    }

    if (addGoal && snapshot != null) {
        GoalDialog(
            existing = null,
            accounts = snapshot.activeAccounts,
            onDismiss = { addGoal = false },
        ) { draft ->
            val result = repository.createGoal(draft)
            if (result is GoalsPayablesResult.Success) addGoal = false
            report(result, "Goal created")
        }
    }

    editGoal?.let { goal ->
        GoalDialog(
            existing = goal,
            accounts = snapshot?.activeAccounts.orEmpty(),
            onDismiss = { editGoal = null },
        ) { draft ->
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
        PayableDialog(
            existing = null,
            accounts = snapshot.activeAccounts,
            onDismiss = { addPayable = false },
        ) { draft ->
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
internal fun JalvoroPlanningHeader(
    section: GoalPayableSection,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceContainer,
        shadowElevation = 0.dp,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            JalvoroIconAction(
                icon = JalvoroIcons.ArrowLeft,
                label = "Back to overview",
                onClick = onBack,
            )
            JalvoroBrandLockup(
                modifier = Modifier.weight(1f),
                subtitle = if (section == GoalPayableSection.Goals) "Goals & savings" else "Payables & repayments",
                compact = true,
            )
            JalvoroIconAction(
                icon = JalvoroIcons.Refresh,
                label = "Refresh planning data",
                onClick = onRefresh,
            )
        }
    }
}
