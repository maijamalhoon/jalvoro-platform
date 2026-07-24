package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.goals.*
import kotlinx.coroutines.launch

@Composable
internal fun GoalDialog(
    existing: NativeGoal?,
    accounts: List<ModuleAccount>,
    onDismiss: () -> Unit,
    onSave: suspend (GoalDraft) -> Unit,
) {
    var name by remember(existing) { mutableStateOf(existing?.row?.name.orEmpty()) }
    var target by remember(existing) { mutableStateOf(existing?.row?.targetAmountOriginal?.editable().orEmpty()) }
    var current by remember(existing) { mutableStateOf(if (existing == null) "0" else existing.currentAmount.editable()) }
    var currency by remember(existing) { mutableStateOf(existing?.row?.currency ?: "PKR") }
    var rate by remember(existing) { mutableStateOf(existing?.row?.exchangeRateToPkr?.editable() ?: "1") }
    var deadline by remember(existing) { mutableStateOf(existing?.row?.deadline.orEmpty()) }
    var accountId by remember(existing) { mutableStateOf(existing?.row?.accountId.orEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    PlanningFormDialog(
        title = if (existing == null) "Create goal" else "Edit goal",
        icon = JalvoroIcons.Target,
        onDismiss = onDismiss,
    ) {
        OutlinedTextField(
            value = name,
            onValueChange = { name = it; error = null },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Goal name") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
        )
        PlanningMoneyFields(target, { target = it }, currency, { currency = it }, rate, { rate = it })
        if (existing == null) {
            OutlinedTextField(
                value = current,
                onValueChange = { current = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Saved amount") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
            )
        } else {
            JalvoroFeedbackCard(
                message = "Already saved: ${formatPkr(existing.currentAmount)}",
                tone = JalvoroFeedbackTone.Info,
            )
        }
        PlanningSelectionField(
            label = "Linked account (optional)",
            value = accountId,
            options = accounts.map { it.id to it.name },
            placeholder = "No linked account",
            allowEmpty = true,
            onSelect = { accountId = it },
        )
        OutlinedTextField(
            value = deadline,
            onValueChange = { deadline = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Deadline YYYY-MM-DD (optional)") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
        )
        error?.let { JalvoroFeedbackCard(it, JalvoroFeedbackTone.Danger) }
        Button(
            onClick = {
                val targetValue = target.toDoubleOrNull()
                val currentValue = current.toDoubleOrNull()
                val rateValue = rate.toDoubleOrNull()
                when {
                    name.isBlank() -> error = "Enter a goal name."
                    targetValue == null || currentValue == null || rateValue == null ->
                        error = "Enter valid amounts and exchange rate."
                    else -> scope.launch {
                        saving = true
                        onSave(
                            GoalDraft(
                                name = name,
                                targetAmountOriginal = targetValue,
                                currentAmountOriginal = currentValue,
                                currency = currency,
                                exchangeRateToPkr = rateValue,
                                deadline = deadline,
                                accountId = accountId,
                            ),
                        )
                        saving = false
                    }
                }
            },
            enabled = !saving,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
        ) {
            if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            else Text(if (existing == null) "Create goal" else "Update goal")
        }
    }
}

@Composable
internal fun GoalContributionDialog(
    goal: NativeGoal,
    accounts: List<ModuleAccount>,
    onDismiss: () -> Unit,
    onSave: suspend (GoalContributionDraft) -> Unit,
) {
    var amount by remember { mutableStateOf("") }
    var currency by remember { mutableStateOf("PKR") }
    var rate by remember { mutableStateOf("1") }
    var accountId by remember { mutableStateOf(goal.row.accountId.orEmpty()) }
    var date by remember { mutableStateOf(todayIso()) }
    var note by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    PlanningFormDialog("Add contribution", JalvoroIcons.Income, onDismiss) {
        Text(goal.row.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text("Remaining ${formatPkr(goal.remainingAmount)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
        PlanningMoneyFields(amount, { amount = it }, currency, { currency = it }, rate, { rate = it })
        PlanningSelectionField(
            "Source account (optional)",
            accountId,
            accounts.map { it.id to "${it.name} • ${formatPkr(it.balance)}" },
            "No linked account",
            allowEmpty = true,
            onSelect = { accountId = it },
        )
        OutlinedTextField(
            value = date,
            onValueChange = { date = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Contribution date YYYY-MM-DD") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
        )
        OutlinedTextField(
            value = note,
            onValueChange = { note = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Note (optional)") },
            minLines = 2,
            shape = RoundedCornerShape(14.dp),
        )
        error?.let { JalvoroFeedbackCard(it, JalvoroFeedbackTone.Danger) }
        Button(
            onClick = {
                val amountValue = amount.toDoubleOrNull()
                val rateValue = rate.toDoubleOrNull()
                if (amountValue == null || rateValue == null) {
                    error = "Enter a valid amount and exchange rate."
                } else {
                    scope.launch {
                        saving = true
                        onSave(
                            GoalContributionDraft(
                                goalId = goal.row.id,
                                accountId = accountId,
                                amountOriginal = amountValue,
                                currency = currency,
                                exchangeRateToPkr = rateValue,
                                contributedAt = date,
                                note = note,
                            ),
                        )
                        saving = false
                    }
                }
            },
            enabled = !saving && goal.remainingAmount > 0,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
        ) {
            if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            else Text("Save contribution")
        }
    }
}
