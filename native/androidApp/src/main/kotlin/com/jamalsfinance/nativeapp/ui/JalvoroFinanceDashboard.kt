package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.finance.AccountDraft
import com.jamalsfinance.shared.finance.AccountUpdate
import com.jamalsfinance.shared.finance.EditableTransaction
import com.jamalsfinance.shared.finance.FinanceAccount
import com.jamalsfinance.shared.finance.FinanceCategory
import com.jamalsfinance.shared.finance.FinanceRepository
import com.jamalsfinance.shared.finance.FinanceResult
import com.jamalsfinance.shared.finance.FinanceSnapshot
import com.jamalsfinance.shared.finance.FinanceState
import com.jamalsfinance.shared.finance.LedgerEntry
import com.jamalsfinance.shared.finance.SupportedFinanceCurrencies
import com.jamalsfinance.shared.finance.TransactionDraft
import com.jamalsfinance.shared.finance.TransferDraft
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import kotlinx.coroutines.launch

private enum class JalvoroMoneySection {
    Accounts,
    Transactions,
    Profile,
}

private enum class JalvoroLedgerFilter {
    All,
    Income,
    Expense,
    Transfer,
}

@Composable
fun JalvoroFinanceDashboard(
    email: String,
    financeRepository: FinanceRepository,
    onBack: () -> Unit,
    onSignOut: suspend () -> Unit,
) {
    val state by financeRepository.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var section by remember { mutableStateOf(JalvoroMoneySection.Accounts) }
    var newAccount by remember { mutableStateOf(false) }
    var editAccount by remember { mutableStateOf<FinanceAccount?>(null) }
    var transfer by remember { mutableStateOf(false) }
    var newTransaction by remember { mutableStateOf(false) }
    var editTransaction by remember { mutableStateOf<EditableTransaction?>(null) }
    var archiveAccount by remember { mutableStateOf<FinanceAccount?>(null) }
    var deleteEntry by remember { mutableStateOf<LedgerEntry?>(null) }

    LaunchedEffect(financeRepository) { financeRepository.refresh(force = true) }

    val snapshot = when (val current = state) {
        is FinanceState.Ready -> current.snapshot
        is FinanceState.Loading -> current.previous
        is FinanceState.Failure -> current.previous
        FinanceState.Idle -> null
    }

    fun report(result: FinanceResult, success: String) {
        scope.launch {
            snackbar.showSnackbar(
                when (result) {
                    FinanceResult.Success -> success
                    is FinanceResult.Failure -> result.message
                },
            )
        }
    }

    Scaffold(
        topBar = {
            JalvoroMoneyHeader(
                section = section,
                onBack = onBack,
                onRefresh = {
                    scope.launch {
                        report(
                            financeRepository.refresh(force = true),
                            "Finance data refreshed",
                        )
                    }
                },
            )
        },
        bottomBar = {
            JalvoroNavigationBar(
                destinations = listOf(
                    JalvoroNavigationDestination(
                        label = "Accounts",
                        icon = JalvoroIcons.Accounts,
                        selected = section == JalvoroMoneySection.Accounts,
                        onClick = { section = JalvoroMoneySection.Accounts },
                    ),
                    JalvoroNavigationDestination(
                        label = "Transactions",
                        icon = JalvoroIcons.Transactions,
                        selected = section == JalvoroMoneySection.Transactions,
                        onClick = { section = JalvoroMoneySection.Transactions },
                    ),
                    JalvoroNavigationDestination(
                        label = "Profile",
                        icon = JalvoroIcons.User,
                        selected = section == JalvoroMoneySection.Profile,
                        onClick = { section = JalvoroMoneySection.Profile },
                    ),
                ),
            )
        },
        floatingActionButton = {
            when (section) {
                JalvoroMoneySection.Accounts -> ExtendedFloatingActionButton(
                    onClick = { newAccount = true },
                    shape = RoundedCornerShape(16.dp),
                    text = { Text("Add account", fontWeight = FontWeight.Bold) },
                    icon = {
                        Icon(
                            imageVector = JalvoroIcons.Plus,
                            contentDescription = null,
                            modifier = Modifier.size(19.dp),
                        )
                    },
                )
                JalvoroMoneySection.Transactions -> ExtendedFloatingActionButton(
                    onClick = { newTransaction = true },
                    shape = RoundedCornerShape(16.dp),
                    text = { Text("Add transaction", fontWeight = FontWeight.Bold) },
                    icon = {
                        Icon(
                            imageVector = JalvoroIcons.Plus,
                            contentDescription = null,
                            modifier = Modifier.size(19.dp),
                        )
                    },
                )
                JalvoroMoneySection.Profile -> Unit
            }
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when {
                state is FinanceState.Loading && snapshot == null -> JalvoroMoneyProgress()
                state is FinanceState.Failure && snapshot == null -> JalvoroMoneyEmpty(
                    title = "Finance data could not load",
                    body = (state as FinanceState.Failure).message,
                    action = "Try again",
                    onAction = {
                        scope.launch { financeRepository.refresh(force = true) }
                    },
                )
                snapshot != null -> when (section) {
                    JalvoroMoneySection.Accounts -> JalvoroAccountsScreen(
                        snapshot = snapshot,
                        onEdit = { editAccount = it },
                        onArchive = { archiveAccount = it },
                        onTransfer = { transfer = true },
                    )
                    JalvoroMoneySection.Transactions -> JalvoroTransactionsScreen(
                        snapshot = snapshot,
                        onEdit = { entry ->
                            scope.launch {
                                val editable = financeRepository.loadEditableTransaction(entry.id)
                                if (editable == null) {
                                    snackbar.showSnackbar("Transaction could not be edited.")
                                } else {
                                    editTransaction = editable
                                }
                            }
                        },
                        onDelete = { deleteEntry = it },
                    )
                    JalvoroMoneySection.Profile -> JalvoroFinanceProfile(
                        email = email,
                        onSignOut = { scope.launch { onSignOut() } },
                    )
                }
                else -> JalvoroMoneyProgress()
            }
        }
    }

    if (newAccount) {
        JalvoroAccountDialog(
            account = null,
            onDismiss = { newAccount = false },
        ) { draft ->
            val result = financeRepository.createAccount(draft)
            if (result is FinanceResult.Success) newAccount = false
            report(result, "Account created")
        }
    }

    editAccount?.let { account ->
        JalvoroAccountDialog(
            account = account,
            onDismiss = { editAccount = null },
        ) { draft ->
            val result = financeRepository.updateAccount(
                account.id,
                AccountUpdate(
                    name = draft.name,
                    accountNumber = draft.accountNumber,
                    accountKind = draft.accountKind,
                ),
            )
            if (result is FinanceResult.Success) editAccount = null
            report(result, "Account updated")
        }
    }

    if (transfer && snapshot != null) {
        JalvoroTransferDialog(
            accounts = snapshot.activeAccounts,
            onDismiss = { transfer = false },
        ) { draft ->
            val result = financeRepository.createTransfer(draft)
            if (result is FinanceResult.Success) transfer = false
            report(result, "Transfer recorded")
        }
    }

    if (newTransaction && snapshot != null) {
        JalvoroTransactionDialog(
            editable = null,
            accounts = snapshot.activeAccounts,
            categories = snapshot.categories,
            onDismiss = { newTransaction = false },
        ) { draft ->
            val result = financeRepository.createTransaction(draft)
            if (result is FinanceResult.Success) newTransaction = false
            report(result, "Transaction saved")
        }
    }

    editTransaction?.let { editable ->
        if (snapshot != null) {
            JalvoroTransactionDialog(
                editable = editable,
                accounts = snapshot.activeAccounts,
                categories = snapshot.categories,
                onDismiss = { editTransaction = null },
            ) { draft ->
                val result = financeRepository.updateTransaction(editable.id, draft)
                if (result is FinanceResult.Success) editTransaction = null
                report(result, "Transaction updated")
            }
        }
    }

    archiveAccount?.let { account ->
        AlertDialog(
            onDismissRequest = { archiveAccount = null },
            icon = {
                Icon(
                    imageVector = JalvoroIcons.Accounts,
                    contentDescription = null,
                )
            },
            title = {
                Text(if (account.status == "active") "Archive account?" else "Restore account?")
            },
            text = {
                Text(
                    "Financial history remains preserved. Archived accounts cannot receive new ledger entries.",
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            val archived = account.status == "active"
                            val result = financeRepository.setAccountArchived(account.id, archived)
                            archiveAccount = null
                            report(
                                result,
                                if (archived) "Account archived" else "Account restored",
                            )
                        }
                    },
                ) {
                    Text(if (account.status == "active") "Archive" else "Restore")
                }
            },
            dismissButton = {
                TextButton(onClick = { archiveAccount = null }) { Text("Cancel") }
            },
        )
    }

    deleteEntry?.let { entry ->
        AlertDialog(
            onDismissRequest = { deleteEntry = null },
            icon = {
                Icon(
                    imageVector = JalvoroIcons.Transactions,
                    contentDescription = null,
                )
            },
            title = { Text("Delete ledger entry?") },
            text = {
                Text(
                    "It remains visible as deleted and secure database triggers recalculate balances.",
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            val result = financeRepository.softDelete(entry)
                            deleteEntry = null
                            report(result, "Ledger entry deleted")
                        }
                    },
                ) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { deleteEntry = null }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun JalvoroMoneyHeader(
    section: JalvoroMoneySection,
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
                subtitle = when (section) {
                    JalvoroMoneySection.Accounts -> "Accounts"
                    JalvoroMoneySection.Transactions -> "Transactions"
                    JalvoroMoneySection.Profile -> "Finance profile"
                },
                compact = true,
            )
            JalvoroIconAction(
                icon = JalvoroIcons.Refresh,
                label = "Refresh finance data",
                onClick = onRefresh,
            )
        }
    }
}

@Composable
private fun JalvoroAccountsScreen(
    snapshot: FinanceSnapshot,
    onEdit: (FinanceAccount) -> Unit,
    onArchive: (FinanceAccount) -> Unit,
    onTransfer: () -> Unit,
) {
    var archivedVisible by remember { mutableStateOf(false) }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 108.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            JalvoroSurfaceCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            contentColor = MaterialTheme.colorScheme.primary,
                        ) {
                            Icon(
                                imageVector = JalvoroIcons.Accounts,
                                contentDescription = null,
                                modifier = Modifier.padding(11.dp).size(23.dp),
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(
                                "Total active balance",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                formatPkr(snapshot.totalActiveBalance),
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                    Text(
                        "${snapshot.activeAccounts.size} active account${if (snapshot.activeAccounts.size == 1) "" else "s"}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedButton(
                        onClick = onTransfer,
                        enabled = snapshot.activeAccounts.size >= 2,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Icon(
                            imageVector = JalvoroIcons.Transfer,
                            contentDescription = null,
                            modifier = Modifier.size(19.dp),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("Transfer between accounts")
                    }
                }
            }
        }

        if (snapshot.activeAccounts.isEmpty()) {
            item {
                JalvoroMoneyEmpty(
                    title = "No active accounts",
                    body = "Use Add account to create your first account.",
                )
            }
        } else {
            items(snapshot.activeAccounts, key = { it.id }) { account ->
                JalvoroAccountCard(account, onEdit, onArchive)
            }
        }

        if (snapshot.archivedAccounts.isNotEmpty()) {
            item {
                TextButton(onClick = { archivedVisible = !archivedVisible }) {
                    Text(
                        if (archivedVisible) {
                            "Hide archived"
                        } else {
                            "Show archived (${snapshot.archivedAccounts.size})"
                        },
                    )
                }
            }
            if (archivedVisible) {
                items(snapshot.archivedAccounts, key = { "archived-${it.id}" }) { account ->
                    JalvoroAccountCard(account, onEdit, onArchive)
                }
            }
        }
    }
}

@Composable
private fun JalvoroAccountCard(
    account: FinanceAccount,
    onEdit: (FinanceAccount) -> Unit,
    onArchive: (FinanceAccount) -> Unit,
) {
    JalvoroSurfaceCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(44.dp),
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    contentColor = MaterialTheme.colorScheme.secondary,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = JalvoroIcons.Accounts,
                            contentDescription = null,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        account.name,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "${account.accountKind} • ${account.type}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    formatPkr(account.balance),
                    fontWeight = FontWeight.Bold,
                )
            }
            account.accountNumber?.takeLast(4)?.let { lastFour ->
                Text(
                    "•••• $lastFour",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                TextButton(
                    onClick = { onEdit(account) },
                    enabled = account.status == "active",
                ) {
                    Text("Edit")
                }
                TextButton(onClick = { onArchive(account) }) {
                    Text(if (account.status == "active") "Archive" else "Restore")
                }
            }
        }
    }
}

@Composable
private fun JalvoroTransactionsScreen(
    snapshot: FinanceSnapshot,
    onEdit: (LedgerEntry) -> Unit,
    onDelete: (LedgerEntry) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf(JalvoroLedgerFilter.All) }
    val rows = snapshot.ledger.filter { entry ->
        val filterMatch = when (filter) {
            JalvoroLedgerFilter.All -> true
            JalvoroLedgerFilter.Income -> entry.type == "income"
            JalvoroLedgerFilter.Expense -> entry.type == "expense"
            JalvoroLedgerFilter.Transfer -> entry.type == "transfer"
        }
        val needle = query.trim().lowercase()
        val searchMatch = needle.isBlank() || listOfNotNull(
            entry.type,
            entry.note,
            entry.reference,
            entry.sourceName,
            entry.personName,
            entry.itemName,
            entry.categories?.name,
            entry.accounts?.name,
        ).any { needle in it.lowercase() }
        filterMatch && searchMatch
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 108.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Search transactions") },
                leadingIcon = {
                    Icon(
                        imageVector = JalvoroIcons.Search,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                    )
                },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = jalvoroFinanceFieldColors(),
            )
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                JalvoroLedgerFilter.entries.forEach { option ->
                    FilterChip(
                        selected = filter == option,
                        onClick = { filter = option },
                        label = { Text(option.name) },
                        leadingIcon = if (filter == option) {
                            {
                                Icon(
                                    imageVector = JalvoroIcons.Check,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                )
                            }
                        } else {
                            null
                        },
                    )
                }
            }
        }
        if (rows.isEmpty()) {
            item {
                JalvoroMoneyEmpty(
                    title = "No matching transactions",
                    body = "Add income, expense or a transfer, or change the filters.",
                )
            }
        } else {
            items(rows, key = { "${it.type}-${it.id}" }) { entry ->
                JalvoroLedgerCard(entry, onEdit, onDelete)
            }
        }
    }
}

@Composable
private fun JalvoroLedgerCard(
    entry: LedgerEntry,
    onEdit: (LedgerEntry) -> Unit,
    onDelete: (LedgerEntry) -> Unit,
) {
    val positive = entry.type == "income" || entry.type == "refund"
    val sign = if (entry.type == "transfer") "" else if (positive) "+" else "−"
    val title = entry.accounts?.name
        ?: entry.categories?.name
        ?: entry.type.replaceFirstChar(Char::uppercase)
    val tone = when {
        entry.type == "expense" -> MaterialTheme.colorScheme.error
        positive -> MaterialTheme.colorScheme.tertiary
        else -> MaterialTheme.colorScheme.primary
    }
    val icon = when (entry.type) {
        "income" -> JalvoroIcons.Income
        "expense" -> JalvoroIcons.Expenses
        "transfer" -> JalvoroIcons.Transfer
        else -> JalvoroIcons.Transactions
    }

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (entry.isDeleted) {
                MaterialTheme.colorScheme.surfaceContainerLow.copy(alpha = 0.72f)
            } else {
                MaterialTheme.colorScheme.surfaceContainer
            },
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(15.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = tone.copy(alpha = 0.12f),
                    contentColor = tone,
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        modifier = Modifier.padding(9.dp).size(19.dp),
                    )
                }
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        title,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "${entry.date} • ${entry.type}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    "$sign${formatPkr(entry.amount)}",
                    fontWeight = FontWeight.Bold,
                    color = tone,
                )
            }
            listOfNotNull(
                entry.sourceName,
                entry.personName,
                entry.itemName,
                entry.note,
                entry.reference,
            ).firstOrNull { it.isNotBlank() }?.let {
                Text(
                    it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                )
            }
            if (entry.isDeleted) {
                Text(
                    "Deleted • history preserved",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.labelMedium,
                )
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (entry.canEditDirectly) {
                        TextButton(onClick = { onEdit(entry) }) { Text("Edit") }
                    }
                    if (entry.canDeleteSafely) {
                        TextButton(onClick = { onDelete(entry) }) { Text("Delete") }
                    }
                }
            }
        }
    }
}

@Composable
private fun JalvoroFinanceProfile(email: String, onSignOut: () -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 20.dp, 16.dp, 36.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            JalvoroSurfaceCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.primary,
                    ) {
                        Icon(
                            imageVector = JalvoroIcons.User,
                            contentDescription = null,
                            modifier = Modifier.padding(16.dp).size(32.dp),
                        )
                    }
                    Text(
                        "Native session active",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(email, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "Accounts and transactions use authenticated native networking. Chrome and WebView are not used.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedButton(
                        onClick = onSignOut,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Icon(
                            imageVector = JalvoroIcons.SignOut,
                            contentDescription = null,
                            modifier = Modifier.size(19.dp),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("Sign out")
                    }
                }
            }
        }
    }
}

@Composable
private fun JalvoroAccountDialog(
    account: FinanceAccount?,
    onDismiss: () -> Unit,
    onSave: suspend (AccountDraft) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var name by remember(account) { mutableStateOf(account?.name.orEmpty()) }
    var number by remember(account) { mutableStateOf(account?.accountNumber.orEmpty()) }
    var kind by remember(account) { mutableStateOf(account?.accountKind ?: "savings") }
    var amount by remember(account) {
        mutableStateOf(if (account == null) "" else account.openingBalanceOriginal.editable())
    }
    var currency by remember(account) { mutableStateOf(account?.openingCurrency ?: "PKR") }
    var rate by remember(account) {
        mutableStateOf(account?.openingExchangeRateToPkr?.editable() ?: "1")
    }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    JalvoroFormDialog(
        title = if (account == null) "New account" else "Edit account",
        icon = JalvoroIcons.Accounts,
        onDismiss = onDismiss,
        busy = busy,
        confirmLabel = if (account == null) "Create account" else "Update account",
        content = {
            JalvoroFinanceField(
                value = name,
                onValueChange = { name = it; error = null },
                label = "Account name",
            )
            JalvoroFinanceField(
                value = number,
                onValueChange = { number = it },
                label = "Account number (optional)",
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("savings", "current").forEach { value ->
                    FilterChip(
                        selected = kind == value,
                        onClick = { kind = value },
                        label = { Text(value.replaceFirstChar(Char::uppercase)) },
                    )
                }
            }
            if (account == null) {
                JalvoroFinanceField(
                    value = amount,
                    onValueChange = { amount = it; error = null },
                    label = "Opening balance",
                    keyboardType = KeyboardType.Decimal,
                )
                JalvoroChoiceField(
                    label = "Opening currency",
                    value = currency,
                    options = SupportedFinanceCurrencies,
                ) {
                    currency = it
                    if (it == "PKR") rate = "1"
                }
                if (currency != "PKR") {
                    JalvoroFinanceField(
                        value = rate,
                        onValueChange = { rate = it; error = null },
                        label = "1 $currency equals PKR",
                        keyboardType = KeyboardType.Decimal,
                    )
                }
            } else {
                JalvoroFeedbackCard(
                    message = "Balance is controlled by the secure ledger and cannot be edited directly.",
                    tone = JalvoroFeedbackTone.Info,
                )
            }
            error?.let {
                JalvoroFeedbackCard(it, JalvoroFeedbackTone.Danger)
            }
        },
        onConfirm = {
            val parsedAmount = if (account == null) amount.toDoubleOrNull() ?: 0.0 else 0.0
            val parsedRate = if (currency == "PKR") 1.0 else rate.toDoubleOrNull()
            error = when {
                name.isBlank() -> "Enter an account name."
                account == null && parsedAmount < 0 -> "Opening balance cannot be negative."
                account == null && (parsedRate == null || parsedRate <= 0) ->
                    "Enter a valid PKR exchange rate."
                else -> null
            }
            if (error == null) {
                scope.launch {
                    busy = true
                    onSave(
                        AccountDraft(
                            name = name.trim(),
                            accountNumber = number.trim().takeIf(String::isNotBlank),
                            accountKind = kind,
                            openingAmountOriginal = parsedAmount,
                            openingCurrency = currency,
                            exchangeRateToPkr = parsedRate ?: 1.0,
                        ),
                    )
                    busy = false
                }
            }
        },
    )
}

@Composable
private fun JalvoroTransactionDialog(
    editable: EditableTransaction?,
    accounts: List<FinanceAccount>,
    categories: List<FinanceCategory>,
    onDismiss: () -> Unit,
    onSave: suspend (TransactionDraft) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var type by remember(editable) { mutableStateOf(editable?.type ?: "expense") }
    var amount by remember(editable) {
        mutableStateOf(editable?.amountOriginal?.editable().orEmpty())
    }
    var currency by remember(editable) { mutableStateOf(editable?.currency ?: "PKR") }
    var rate by remember(editable) {
        mutableStateOf(editable?.exchangeRateToPkr?.editable() ?: "1")
    }
    var accountId by remember(editable, accounts) {
        mutableStateOf(editable?.accountId ?: accounts.firstOrNull()?.id.orEmpty())
    }
    var categoryId by remember(editable, categories) {
        mutableStateOf(
            editable?.categoryId
                ?: categories.firstOrNull { it.type == type }?.id.orEmpty(),
        )
    }
    var date by remember(editable) { mutableStateOf(editable?.date ?: today()) }
    var source by remember(editable) { mutableStateOf(editable?.sourceName.orEmpty()) }
    var person by remember(editable) { mutableStateOf(editable?.personName.orEmpty()) }
    var item by remember(editable) { mutableStateOf(editable?.itemName.orEmpty()) }
    var reference by remember(editable) { mutableStateOf(editable?.reference.orEmpty()) }
    var note by remember(editable) { mutableStateOf(editable?.note.orEmpty()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val accountOptions = accounts.map { it.id to "${it.name} • ${formatPkr(it.balance)}" }
    val categoryOptions = categories.filter { it.type == type }.map { category ->
        val parent = categories.firstOrNull { it.id == category.parentId }?.name
        category.id to if (parent == null) category.name else "$parent / ${category.name}"
    }

    JalvoroFormDialog(
        title = if (editable == null) "New transaction" else "Edit transaction",
        icon = JalvoroIcons.Transactions,
        onDismiss = onDismiss,
        busy = busy,
        confirmLabel = if (editable == null) "Save transaction" else "Update transaction",
        content = {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("income", "expense").forEach { value ->
                    FilterChip(
                        selected = type == value,
                        onClick = {
                            type = value
                            categoryId = categories.firstOrNull { it.type == value }?.id.orEmpty()
                        },
                        label = { Text(value.replaceFirstChar(Char::uppercase)) },
                        leadingIcon = {
                            Icon(
                                imageVector = if (value == "income") {
                                    JalvoroIcons.Income
                                } else {
                                    JalvoroIcons.Expenses
                                },
                                contentDescription = null,
                                modifier = Modifier.size(17.dp),
                            )
                        },
                    )
                }
            }
            JalvoroFinanceField(
                value = amount,
                onValueChange = { amount = it; error = null },
                label = "Amount",
                keyboardType = KeyboardType.Decimal,
            )
            JalvoroChoiceField("Currency", currency, SupportedFinanceCurrencies) {
                currency = it
                if (it == "PKR") rate = "1"
            }
            if (currency != "PKR") {
                JalvoroFinanceField(
                    value = rate,
                    onValueChange = { rate = it; error = null },
                    label = "1 $currency equals PKR",
                    keyboardType = KeyboardType.Decimal,
                )
            }
            JalvoroPairChoiceField("Account", accountId, accountOptions) { accountId = it }
            JalvoroPairChoiceField("Category", categoryId, categoryOptions) { categoryId = it }
            JalvoroFinanceField(
                value = date,
                onValueChange = { date = it; error = null },
                label = "Date (YYYY-MM-DD)",
            )
            if (type == "income") {
                JalvoroFinanceField(source, { source = it }, "Source (optional)")
            }
            JalvoroFinanceField(person, { person = it }, "Person (optional)")
            JalvoroFinanceField(item, { item = it }, "Item (optional)")
            JalvoroFinanceField(reference, { reference = it }, "Reference (optional)")
            JalvoroFinanceField(
                value = note,
                onValueChange = { note = it },
                label = "Note (optional)",
                minLines = 2,
                singleLine = false,
            )
            error?.let { JalvoroFeedbackCard(it, JalvoroFeedbackTone.Danger) }
        },
        onConfirm = {
            val parsedAmount = amount.toDoubleOrNull()
            val parsedRate = if (currency == "PKR") 1.0 else rate.toDoubleOrNull()
            error = when {
                parsedAmount == null || parsedAmount <= 0 -> "Enter an amount greater than 0."
                parsedRate == null || parsedRate <= 0 -> "Enter a valid PKR exchange rate."
                accountId.isBlank() -> "Select an account."
                categoryId.isBlank() -> "Select a category."
                !date.matches(Regex("""\d{4}-\d{2}-\d{2}""")) ->
                    "Enter a date as YYYY-MM-DD."
                else -> null
            }
            if (error == null) {
                scope.launch {
                    busy = true
                    onSave(
                        TransactionDraft(
                            type = type,
                            amountOriginal = parsedAmount ?: 0.0,
                            currency = currency,
                            exchangeRateToPkr = parsedRate ?: 1.0,
                            categoryId = categoryId,
                            accountId = accountId,
                            date = date,
                            note = note.trim().takeIf(String::isNotBlank),
                            sourceName = source.trim().takeIf(String::isNotBlank),
                            personName = person.trim().takeIf(String::isNotBlank),
                            itemName = item.trim().takeIf(String::isNotBlank),
                            reference = reference.trim().takeIf(String::isNotBlank),
                        ),
                    )
                    busy = false
                }
            }
        },
    )
}

@Composable
private fun JalvoroTransferDialog(
    accounts: List<FinanceAccount>,
    onDismiss: () -> Unit,
    onSave: suspend (TransferDraft) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var fromId by remember(accounts) { mutableStateOf(accounts.firstOrNull()?.id.orEmpty()) }
    var toId by remember(accounts) {
        mutableStateOf(accounts.firstOrNull { it.id != fromId }?.id.orEmpty())
    }
    var amount by remember { mutableStateOf("") }
    var currency by remember { mutableStateOf("PKR") }
    var rate by remember { mutableStateOf("1") }
    var date by remember { mutableStateOf(today()) }
    var note by remember { mutableStateOf("") }
    var reference by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val options = accounts.map { it.id to "${it.name} • ${formatPkr(it.balance)}" }

    JalvoroFormDialog(
        title = "Transfer",
        icon = JalvoroIcons.Transfer,
        onDismiss = onDismiss,
        busy = busy,
        confirmLabel = "Record transfer",
        content = {
            JalvoroPairChoiceField("From account", fromId, options) {
                fromId = it
                if (toId == it) {
                    toId = accounts.firstOrNull { row -> row.id != it }?.id.orEmpty()
                }
            }
            JalvoroPairChoiceField(
                "To account",
                toId,
                options.filter { it.first != fromId },
            ) { toId = it }
            JalvoroFinanceField(
                value = amount,
                onValueChange = { amount = it; error = null },
                label = "Amount",
                keyboardType = KeyboardType.Decimal,
            )
            JalvoroChoiceField("Currency", currency, SupportedFinanceCurrencies) {
                currency = it
                if (it == "PKR") rate = "1"
            }
            if (currency != "PKR") {
                JalvoroFinanceField(
                    value = rate,
                    onValueChange = { rate = it; error = null },
                    label = "1 $currency equals PKR",
                    keyboardType = KeyboardType.Decimal,
                )
            }
            JalvoroFinanceField(
                value = date,
                onValueChange = { date = it; error = null },
                label = "Date (YYYY-MM-DD)",
            )
            JalvoroFinanceField(reference, { reference = it }, "Reference (optional)")
            JalvoroFinanceField(
                value = note,
                onValueChange = { note = it },
                label = "Note (optional)",
                minLines = 2,
                singleLine = false,
            )
            error?.let { JalvoroFeedbackCard(it, JalvoroFeedbackTone.Danger) }
        },
        onConfirm = {
            val parsedAmount = amount.toDoubleOrNull()
            val parsedRate = if (currency == "PKR") 1.0 else rate.toDoubleOrNull()
            val canonical = (parsedAmount ?: 0.0) * (parsedRate ?: 0.0)
            val available = accounts.firstOrNull { it.id == fromId }?.balance
            error = when {
                accounts.size < 2 -> "Add at least two active accounts."
                fromId.isBlank() || toId.isBlank() || fromId == toId ->
                    "Select two different accounts."
                parsedAmount == null || parsedAmount <= 0 -> "Enter an amount greater than 0."
                parsedRate == null || parsedRate <= 0 -> "Enter a valid PKR exchange rate."
                available != null && canonical > available + 0.000001 ->
                    "Amount exceeds the available balance."
                !date.matches(Regex("""\d{4}-\d{2}-\d{2}""")) ->
                    "Enter a date as YYYY-MM-DD."
                else -> null
            }
            if (error == null) {
                scope.launch {
                    busy = true
                    onSave(
                        TransferDraft(
                            fromAccountId = fromId,
                            toAccountId = toId,
                            amountOriginal = parsedAmount ?: 0.0,
                            currency = currency,
                            exchangeRateToPkr = parsedRate ?: 1.0,
                            date = date,
                            note = note.trim().takeIf(String::isNotBlank),
                            reference = reference.trim().takeIf(String::isNotBlank),
                        ),
                    )
                    busy = false
                }
            }
        },
    )
}

@Composable
private fun JalvoroFormDialog(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onDismiss: () -> Unit,
    busy: Boolean,
    confirmLabel: String,
    content: @Composable () -> Unit,
    onConfirm: () -> Unit,
) {
    Dialog(onDismissRequest = { if (!busy) onDismiss() }) {
        Surface(
            modifier = Modifier.fillMaxWidth().heightIn(max = 720.dp),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surfaceContainer,
            tonalElevation = 0.dp,
            shadowElevation = 12.dp,
        ) {
            Column(
                modifier = Modifier.padding(20.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(13.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.primary,
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            modifier = Modifier.padding(10.dp).size(22.dp),
                        )
                    }
                    Spacer(Modifier.width(11.dp))
                    Text(
                        title,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.semantics { heading() },
                    )
                }
                content()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onDismiss, enabled = !busy) { Text("Cancel") }
                    Button(
                        onClick = onConfirm,
                        enabled = !busy,
                        shape = RoundedCornerShape(13.dp),
                    ) {
                        if (busy) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                            Spacer(Modifier.width(8.dp))
                        }
                        Text(if (busy) "Saving…" else confirmLabel)
                    }
                }
            }
        }
    }
}

@Composable
private fun JalvoroFinanceField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    minLines: Int = 1,
    singleLine: Boolean = true,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(label) },
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        minLines = minLines,
        singleLine = singleLine,
        shape = RoundedCornerShape(14.dp),
        colors = jalvoroFinanceFieldColors(),
    )
}

@Composable
private fun JalvoroChoiceField(
    label: String,
    value: String,
    options: List<String>,
    onSelected: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium)
        Surface(
            modifier = Modifier.fillMaxWidth().clickable { expanded = true },
            shape = RoundedCornerShape(14.dp),
            color = MaterialTheme.colorScheme.surfaceContainerLow,
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(value, modifier = Modifier.weight(1f))
                Icon(
                    imageVector = JalvoroIcons.More,
                    contentDescription = "Choose $label",
                    modifier = Modifier.size(18.dp),
                )
            }
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option) },
                    onClick = {
                        expanded = false
                        onSelected(option)
                    },
                )
            }
        }
    }
}

@Composable
private fun JalvoroPairChoiceField(
    label: String,
    selectedId: String,
    options: List<Pair<String, String>>,
    onSelected: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selected = options.firstOrNull { it.first == selectedId }?.second ?: "Select"
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium)
        Surface(
            modifier = Modifier.fillMaxWidth().clickable { expanded = true },
            shape = RoundedCornerShape(14.dp),
            color = MaterialTheme.colorScheme.surfaceContainerLow,
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    selected,
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
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
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

@Composable
private fun JalvoroMoneyEmpty(
    title: String,
    body: String,
    action: String? = null,
    onAction: (() -> Unit)? = null,
) {
    JalvoroSurfaceCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(9.dp),
        ) {
            Icon(
                imageVector = JalvoroIcons.Wallet,
                contentDescription = null,
                modifier = Modifier.size(28.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(title, fontWeight = FontWeight.Bold)
            Text(
                body,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium,
            )
            if (action != null && onAction != null) {
                Button(onClick = onAction) { Text(action) }
            }
        }
    }
}

@Composable
private fun JalvoroMoneyProgress() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(strokeWidth = 2.5.dp)
    }
}

@Composable
private fun jalvoroFinanceFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = MaterialTheme.colorScheme.primary,
    focusedLabelColor = MaterialTheme.colorScheme.primary,
    cursorColor = MaterialTheme.colorScheme.primary,
    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
    errorBorderColor = MaterialTheme.colorScheme.error,
)

private fun formatPkr(amount: Double): String =
    "PKR ${NumberFormat.getNumberInstance(Locale.US).apply { maximumFractionDigits = 2 }.format(amount)}"

private fun Double.editable(): String = if (!isFinite()) "" else toString().removeSuffix(".0")

private fun today(): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)
