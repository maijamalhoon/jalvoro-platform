package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.jamalsfinance.shared.finance.AccountDraft
import com.jamalsfinance.shared.finance.EditableTransaction
import com.jamalsfinance.shared.finance.FinanceAccount
import com.jamalsfinance.shared.finance.FinanceCategory
import com.jamalsfinance.shared.finance.SupportedFinanceCurrencies
import com.jamalsfinance.shared.finance.TransactionDraft
import com.jamalsfinance.shared.finance.TransferDraft
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
internal fun JalvoroWebsiteAccountDialog(
    account: FinanceAccount?,
    onDismiss: () -> Unit,
    onSubmit: suspend (AccountDraft) -> Unit,
) {
    var name by remember(account?.id) { mutableStateOf(account?.name.orEmpty()) }
    var accountNumber by remember(account?.id) { mutableStateOf(account?.accountNumber.orEmpty()) }
    var accountKind by remember(account?.id) { mutableStateOf(account?.accountKind ?: "savings") }
    var openingAmount by remember(account?.id) {
        mutableStateOf(if (account == null) "0" else account.openingBalanceOriginal.moneyInput())
    }
    var currency by remember(account?.id) { mutableStateOf(account?.openingCurrency ?: "PKR") }
    var exchangeRate by remember(account?.id) {
        mutableStateOf(if (account == null) "1" else account.openingExchangeRateToPkr.moneyInput())
    }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    JalvoroWebsiteFormDialog(
        title = if (account == null) "Add account" else "Edit account",
        description = if (account == null) {
            "Create an owner-scoped account. Opening balance is converted to PKR once."
        } else {
            "Update account identity. Existing balance and ledger history remain unchanged."
        },
        busy = busy,
        error = error,
        submitLabel = if (account == null) "Add account" else "Save changes",
        onDismiss = onDismiss,
        onSubmit = {
            val cleanName = name.trim()
            val opening = openingAmount.toDoubleOrNull()
            val rate = exchangeRate.toDoubleOrNull()
            error = when {
                cleanName.isBlank() -> "Enter an account name."
                account == null && (opening == null || opening < 0) -> "Enter a valid opening amount."
                account == null && currency != "PKR" && (rate == null || rate <= 0) -> "Enter a valid PKR exchange rate."
                else -> null
            }
            if (error == null) {
                busy = true
                try {
                    onSubmit(
                        AccountDraft(
                            name = cleanName,
                            accountNumber = accountNumber.trim().ifBlank { null },
                            accountKind = accountKind,
                            openingAmountOriginal = if (account == null) opening ?: 0.0 else account.openingBalanceOriginal,
                            openingCurrency = if (account == null) currency else account.openingCurrency,
                            exchangeRateToPkr = if (account == null) {
                                if (currency == "PKR") 1.0 else rate ?: 1.0
                            } else {
                                account.openingExchangeRateToPkr
                            },
                        ),
                    )
                } finally {
                    busy = false
                }
            }
        },
    ) {
        JalvoroWebsiteTextField(
            value = name,
            onValueChange = { name = it },
            label = "Account name",
            enabled = !busy,
        )
        JalvoroWebsiteTextField(
            value = accountNumber,
            onValueChange = { accountNumber = it },
            label = "Account number (optional)",
            enabled = !busy,
        )
        Text("Account type", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("savings" to "Savings", "current" to "Current").forEach { option ->
                FilterChip(
                    selected = accountKind == option.first,
                    onClick = { accountKind = option.first },
                    enabled = !busy,
                    label = { Text(option.second) },
                )
            }
        }
        if (account == null) {
            JalvoroWebsiteTextField(
                value = openingAmount,
                onValueChange = { openingAmount = it },
                label = "Opening amount",
                enabled = !busy,
                keyboardType = KeyboardType.Decimal,
            )
            JalvoroWebsiteChoiceField(
                label = "Currency",
                selectedKey = currency,
                options = SupportedFinanceCurrencies.map { it to it },
                enabled = !busy,
                onSelected = { currency = it },
            )
            if (currency != "PKR") {
                JalvoroWebsiteTextField(
                    value = exchangeRate,
                    onValueChange = { exchangeRate = it },
                    label = "Exchange rate to PKR",
                    enabled = !busy,
                    keyboardType = KeyboardType.Decimal,
                )
            }
        }
    }
}

@Composable
internal fun JalvoroWebsiteTransferDialog(
    accounts: List<FinanceAccount>,
    onDismiss: () -> Unit,
    onSubmit: suspend (TransferDraft) -> Unit,
) {
    var fromId by remember(accounts) { mutableStateOf(accounts.firstOrNull()?.id.orEmpty()) }
    var toId by remember(accounts) { mutableStateOf(accounts.drop(1).firstOrNull()?.id.orEmpty()) }
    var amount by remember { mutableStateOf("") }
    var currency by remember { mutableStateOf("PKR") }
    var exchangeRate by remember { mutableStateOf("1") }
    var date by remember { mutableStateOf(todayKey()) }
    var note by remember { mutableStateOf("") }
    var reference by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    JalvoroWebsiteFormDialog(
        title = "Transfer funds",
        description = "Move money between active accounts without changing income or expense totals.",
        busy = busy,
        error = error,
        submitLabel = "Record transfer",
        onDismiss = onDismiss,
        onSubmit = {
            val parsedAmount = amount.toDoubleOrNull()
            val parsedRate = exchangeRate.toDoubleOrNull()
            error = when {
                fromId.isBlank() || toId.isBlank() -> "Choose both accounts."
                fromId == toId -> "Choose two different accounts."
                parsedAmount == null || parsedAmount <= 0 -> "Enter a valid amount."
                currency != "PKR" && (parsedRate == null || parsedRate <= 0) -> "Enter a valid PKR exchange rate."
                !isDateKey(date) -> "Use a valid YYYY-MM-DD date."
                else -> null
            }
            if (error == null) {
                busy = true
                try {
                    onSubmit(
                        TransferDraft(
                            fromAccountId = fromId,
                            toAccountId = toId,
                            amountOriginal = parsedAmount ?: 0.0,
                            currency = currency,
                            exchangeRateToPkr = if (currency == "PKR") 1.0 else parsedRate ?: 1.0,
                            date = date,
                            note = note.trim().ifBlank { null },
                            reference = reference.trim().ifBlank { null },
                        ),
                    )
                } finally {
                    busy = false
                }
            }
        },
    ) {
        val accountOptions = accounts.map { it.id to "${it.name} • ${formatPkrCompact(it.balance)}" }
        JalvoroWebsiteChoiceField(
            label = "From account",
            selectedKey = fromId,
            options = accountOptions,
            enabled = !busy,
            onSelected = { fromId = it },
        )
        JalvoroWebsiteChoiceField(
            label = "To account",
            selectedKey = toId,
            options = accountOptions,
            enabled = !busy,
            onSelected = { toId = it },
        )
        JalvoroWebsiteTextField(amount, { amount = it }, "Amount", !busy, KeyboardType.Decimal)
        JalvoroWebsiteChoiceField(
            label = "Currency",
            selectedKey = currency,
            options = SupportedFinanceCurrencies.map { it to it },
            enabled = !busy,
            onSelected = { currency = it },
        )
        if (currency != "PKR") {
            JalvoroWebsiteTextField(
                exchangeRate,
                { exchangeRate = it },
                "Exchange rate to PKR",
                !busy,
                KeyboardType.Decimal,
            )
        }
        JalvoroWebsiteTextField(date, { date = it }, "Date (YYYY-MM-DD)", !busy)
        JalvoroWebsiteTextField(note, { note = it }, "Note (optional)", !busy)
        JalvoroWebsiteTextField(reference, { reference = it }, "Reference (optional)", !busy)
    }
}

@Composable
internal fun JalvoroWebsiteTransactionDialog(
    editable: EditableTransaction?,
    accounts: List<FinanceAccount>,
    categories: List<FinanceCategory>,
    onDismiss: () -> Unit,
    onSubmit: suspend (TransactionDraft) -> Unit,
) {
    var type by remember(editable?.id) { mutableStateOf(editable?.type ?: "income") }
    var amount by remember(editable?.id) { mutableStateOf(editable?.amountOriginal?.moneyInput().orEmpty()) }
    var currency by remember(editable?.id) { mutableStateOf(editable?.currency ?: "PKR") }
    var exchangeRate by remember(editable?.id) {
        mutableStateOf(editable?.exchangeRateToPkr?.moneyInput() ?: "1")
    }
    var categoryId by remember(editable?.id) { mutableStateOf(editable?.categoryId.orEmpty()) }
    var accountId by remember(editable?.id) {
        mutableStateOf(editable?.accountId ?: accounts.firstOrNull()?.id.orEmpty())
    }
    var date by remember(editable?.id) { mutableStateOf(editable?.date ?: todayKey()) }
    var note by remember(editable?.id) { mutableStateOf(editable?.note.orEmpty()) }
    var sourceName by remember(editable?.id) { mutableStateOf(editable?.sourceName.orEmpty()) }
    var personName by remember(editable?.id) { mutableStateOf(editable?.personName.orEmpty()) }
    var itemName by remember(editable?.id) { mutableStateOf(editable?.itemName.orEmpty()) }
    var reference by remember(editable?.id) { mutableStateOf(editable?.reference.orEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    val matchingCategories = categories.filter { it.type == type }
    if (categoryId.isBlank() || matchingCategories.none { it.id == categoryId }) {
        categoryId = matchingCategories.firstOrNull()?.id.orEmpty()
    }

    JalvoroWebsiteFormDialog(
        title = if (editable == null) "Add transaction" else "Edit transaction",
        description = "Record owner-scoped income or expense. PKR conversion and balance updates remain server-authoritative.",
        busy = busy,
        error = error,
        submitLabel = if (editable == null) "Save transaction" else "Save changes",
        onDismiss = onDismiss,
        onSubmit = {
            val parsedAmount = amount.toDoubleOrNull()
            val parsedRate = exchangeRate.toDoubleOrNull()
            error = when {
                type !in setOf("income", "expense") -> "Choose income or expense."
                parsedAmount == null || parsedAmount <= 0 -> "Enter a valid amount."
                accountId.isBlank() -> "Choose an account."
                categoryId.isBlank() -> "Choose a category."
                currency != "PKR" && (parsedRate == null || parsedRate <= 0) -> "Enter a valid PKR exchange rate."
                !isDateKey(date) -> "Use a valid YYYY-MM-DD date."
                else -> null
            }
            if (error == null) {
                busy = true
                try {
                    onSubmit(
                        TransactionDraft(
                            type = type,
                            amountOriginal = parsedAmount ?: 0.0,
                            currency = currency,
                            exchangeRateToPkr = if (currency == "PKR") 1.0 else parsedRate ?: 1.0,
                            categoryId = categoryId,
                            accountId = accountId,
                            date = date,
                            note = note.trim().ifBlank { null },
                            sourceName = sourceName.trim().ifBlank { null },
                            personName = personName.trim().ifBlank { null },
                            itemName = itemName.trim().ifBlank { null },
                            reference = reference.trim().ifBlank { null },
                        ),
                    )
                } finally {
                    busy = false
                }
            }
        },
    ) {
        Text("Transaction type", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("income" to "Income", "expense" to "Expense").forEach { option ->
                FilterChip(
                    selected = type == option.first,
                    onClick = {
                        type = option.first
                        categoryId = categories.firstOrNull { it.type == option.first }?.id.orEmpty()
                    },
                    enabled = !busy,
                    label = { Text(option.second) },
                )
            }
        }
        JalvoroWebsiteTextField(amount, { amount = it }, "Amount", !busy, KeyboardType.Decimal)
        JalvoroWebsiteChoiceField(
            label = "Currency",
            selectedKey = currency,
            options = SupportedFinanceCurrencies.map { it to it },
            enabled = !busy,
            onSelected = { currency = it },
        )
        if (currency != "PKR") {
            JalvoroWebsiteTextField(
                exchangeRate,
                { exchangeRate = it },
                "Exchange rate to PKR",
                !busy,
                KeyboardType.Decimal,
            )
        }
        JalvoroWebsiteChoiceField(
            label = "Account",
            selectedKey = accountId,
            options = accounts.map { it.id to it.name },
            enabled = !busy,
            onSelected = { accountId = it },
        )
        JalvoroWebsiteChoiceField(
            label = "Category",
            selectedKey = categoryId,
            options = matchingCategories.map { it.id to it.name },
            enabled = !busy,
            onSelected = { categoryId = it },
        )
        JalvoroWebsiteTextField(date, { date = it }, "Date (YYYY-MM-DD)", !busy)
        if (type == "income") {
            JalvoroWebsiteTextField(sourceName, { sourceName = it }, "Income source (optional)", !busy)
        } else {
            JalvoroWebsiteTextField(itemName, { itemName = it }, "Item (optional)", !busy)
            JalvoroWebsiteTextField(personName, { personName = it }, "Person or merchant (optional)", !busy)
        }
        JalvoroWebsiteTextField(note, { note = it }, "Note (optional)", !busy)
        JalvoroWebsiteTextField(reference, { reference = it }, "Reference (optional)", !busy)
    }
}

@Composable
private fun JalvoroWebsiteFormDialog(
    title: String,
    description: String,
    busy: Boolean,
    error: String?,
    submitLabel: String,
    onDismiss: () -> Unit,
    onSubmit: () -> Unit,
    content: @Composable () -> Unit,
) {
    Dialog(onDismissRequest = { if (!busy) onDismiss() }) {
        Surface(
            modifier = Modifier.fillMaxWidth().heightIn(max = 700.dp),
            shape = RoundedCornerShape(22.dp),
            color = MaterialTheme.colorScheme.surfaceContainer,
            tonalElevation = 0.dp,
            shadowElevation = 12.dp,
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(13.dp),
            ) {
                Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                Text(
                    description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (error != null) {
                    JalvoroFeedbackCard(error, JalvoroFeedbackTone.Danger)
                }
                content()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onDismiss, enabled = !busy) { Text("Cancel") }
                    Spacer(Modifier.size(8.dp))
                    Button(onClick = onSubmit, enabled = !busy) { Text(submitLabel) }
                }
            }
        }
    }
}

@Composable
private fun JalvoroWebsiteTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    enabled: Boolean,
    keyboardType: KeyboardType = KeyboardType.Text,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth(),
        enabled = enabled,
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = MaterialTheme.colorScheme.primary,
            focusedLabelColor = MaterialTheme.colorScheme.primary,
            cursorColor = MaterialTheme.colorScheme.primary,
            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
        ),
    )
}

@Composable
private fun JalvoroWebsiteChoiceField(
    label: String,
    selectedKey: String,
    options: List<Pair<String, String>>,
    enabled: Boolean,
    onSelected: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.firstOrNull { it.first == selectedKey }?.second ?: "Choose"
    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
        Box {
            Surface(
                modifier = Modifier.fillMaxWidth().clickable(enabled = enabled) { expanded = true },
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.surface,
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    MaterialTheme.colorScheme.outlineVariant,
                ),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        selectedLabel,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Icon(
                        imageVector = JalvoroIcons.More,
                        contentDescription = "Choose $label",
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option.second) },
                        onClick = {
                            expanded = false
                            onSelected(option.first)
                        },
                    )
                }
            }
        }
    }
}

private fun Double.moneyInput(): String = if (isFinite()) toString().removeSuffix(".0") else ""

private fun todayKey(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

private fun isDateKey(value: String): Boolean = runCatching {
    val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { isLenient = false }
    formatter.parse(value)
}.getOrNull() != null

private fun formatPkrCompact(value: Double): String = "PKR ${"%,.2f".format(Locale.US, value)}"
