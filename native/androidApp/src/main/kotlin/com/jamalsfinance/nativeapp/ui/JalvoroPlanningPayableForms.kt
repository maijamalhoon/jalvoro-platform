package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.goals.*
import kotlinx.coroutines.launch

@Composable
internal fun PayableDialog(
    existing: NativePayable?,
    accounts: List<ModuleAccount>,
    onDismiss: () -> Unit,
    onSave: suspend (PayableDraft) -> Unit,
) {
    var person by remember(existing) { mutableStateOf(existing?.row?.personName.orEmpty()) }
    var item by remember(existing) { mutableStateOf(existing?.row?.itemName.orEmpty()) }
    var reason by remember(existing) { mutableStateOf(existing?.row?.reason.orEmpty()) }
    var amount by remember(existing) { mutableStateOf(existing?.row?.originalValueInput?.editable().orEmpty()) }
    var currency by remember(existing) { mutableStateOf(existing?.row?.currency ?: "PKR") }
    var rate by remember(existing) { mutableStateOf(existing?.row?.exchangeRateToPkr?.editable() ?: "1") }
    var accountId by remember(existing, accounts) {
        mutableStateOf(existing?.row?.accountId ?: accounts.firstOrNull()?.id.orEmpty())
    }
    var dueDate by remember(existing) { mutableStateOf(existing?.row?.dueDate.orEmpty()) }
    var notes by remember(existing) { mutableStateOf(existing?.row?.notes.orEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    PlanningFormDialog(
        if (existing == null) "Add payable" else "Edit payable",
        JalvoroIcons.Wallet,
        onDismiss,
    ) {
        PlanningMoneyFields(amount, { amount = it }, currency, { currency = it }, rate, { rate = it })
        OutlinedTextField(person, { person = it }, Modifier.fillMaxWidth(), label = { Text("Name") }, singleLine = true, shape = RoundedCornerShape(14.dp))
        OutlinedTextField(reason, { reason = it }, Modifier.fillMaxWidth(), label = { Text("Purpose") }, singleLine = true, shape = RoundedCornerShape(14.dp))
        OutlinedTextField(item, { item = it }, Modifier.fillMaxWidth(), label = { Text("Item (optional)") }, singleLine = true, shape = RoundedCornerShape(14.dp))
        PlanningSelectionField(
            "Account",
            accountId,
            accounts.map { it.id to "${it.name} • ${formatPkr(it.balance)}" },
            "Select account",
            onSelect = { accountId = it },
        )
        OutlinedTextField(dueDate, { dueDate = it }, Modifier.fillMaxWidth(), label = { Text("Due date YYYY-MM-DD (optional)") }, singleLine = true, shape = RoundedCornerShape(14.dp))
        OutlinedTextField(notes, { notes = it }, Modifier.fillMaxWidth(), label = { Text("Notes (optional)") }, minLines = 2, shape = RoundedCornerShape(14.dp))
        existing?.let {
            JalvoroFeedbackCard(
                message = "Already paid: ${formatPkr(it.row.paidAmount)}",
                tone = JalvoroFeedbackTone.Info,
            )
        }
        error?.let { JalvoroFeedbackCard(it, JalvoroFeedbackTone.Danger) }
        Button(
            onClick = {
                val amountValue = amount.toDoubleOrNull()
                val rateValue = rate.toDoubleOrNull()
                when {
                    person.isBlank() -> error = "Enter a name."
                    reason.isBlank() -> error = "Enter the payable purpose."
                    amountValue == null || rateValue == null -> error = "Enter a valid amount and exchange rate."
                    else -> scope.launch {
                        saving = true
                        onSave(
                            PayableDraft(
                                personName = person,
                                itemName = item,
                                reason = reason,
                                originalValueInput = amountValue,
                                currency = currency,
                                exchangeRateToPkr = rateValue,
                                accountId = accountId,
                                dueDate = dueDate,
                                notes = notes,
                            ),
                        )
                        saving = false
                    }
                }
            },
            enabled = !saving && accounts.isNotEmpty(),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
        ) {
            if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            else Text(if (existing == null) "Save payable" else "Update payable")
        }
    }
}

@Composable
internal fun LiabilityPaymentDialog(
    payable: NativePayable,
    accounts: List<ModuleAccount>,
    onDismiss: () -> Unit,
    onSave: suspend (LiabilityPaymentDraft) -> Unit,
) {
    var amount by remember { mutableStateOf("") }
    var currency by remember { mutableStateOf("PKR") }
    var rate by remember { mutableStateOf("1") }
    var accountId by remember(accounts) {
        mutableStateOf(payable.row.accountId ?: accounts.firstOrNull()?.id.orEmpty())
    }
    var date by remember { mutableStateOf(todayIso()) }
    var note by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    PlanningFormDialog("Record payment", JalvoroIcons.Transfer, onDismiss) {
        Text(payable.row.personName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text("Remaining ${formatPkr(payable.remainingAmount)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
        PlanningMoneyFields(amount, { amount = it }, currency, { currency = it }, rate, { rate = it })
        PlanningSelectionField(
            "Paid from account",
            accountId,
            accounts.map { it.id to "${it.name} • ${formatPkr(it.balance)}" },
            "Select account",
            onSelect = { accountId = it },
        )
        OutlinedTextField(date, { date = it }, Modifier.fillMaxWidth(), label = { Text("Payment date YYYY-MM-DD") }, singleLine = true, shape = RoundedCornerShape(14.dp))
        OutlinedTextField(note, { note = it }, Modifier.fillMaxWidth(), label = { Text("Note (optional)") }, minLines = 2, shape = RoundedCornerShape(14.dp))
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
                            LiabilityPaymentDraft(
                                liabilityId = payable.row.id,
                                accountId = accountId,
                                amountOriginal = amountValue,
                                currency = currency,
                                exchangeRateToPkr = rateValue,
                                paidAt = date,
                                note = note,
                            ),
                        )
                        saving = false
                    }
                }
            },
            enabled = !saving && accounts.isNotEmpty() && payable.remainingAmount > 0,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
        ) {
            if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            else Text("Record payment")
        }
    }
}
