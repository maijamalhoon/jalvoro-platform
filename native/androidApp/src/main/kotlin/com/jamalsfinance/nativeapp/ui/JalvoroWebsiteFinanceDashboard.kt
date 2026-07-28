package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.finance.AccountUpdate
import com.jamalsfinance.shared.finance.EditableTransaction
import com.jamalsfinance.shared.finance.FinanceAccount
import com.jamalsfinance.shared.finance.FinanceRepository
import com.jamalsfinance.shared.finance.FinanceResult
import com.jamalsfinance.shared.finance.FinanceSnapshot
import com.jamalsfinance.shared.finance.FinanceState
import com.jamalsfinance.shared.finance.LedgerEntry
import java.text.NumberFormat
import java.util.Currency
import java.util.Locale
import kotlinx.coroutines.launch

private enum class WebsiteMoneySection {
    Accounts,
    Transactions,
    Profile,
}

private enum class WebsiteLedgerFilter(val label: String) {
    All("All"),
    Income("Income"),
    Expense("Expense"),
    Transfer("Transfer"),
}

private data class WebsiteMoneyTab(
    val section: WebsiteMoneySection,
    val label: String,
    val icon: ImageVector,
)

@Composable
fun JalvoroWebsiteFinanceDashboard(
    email: String,
    financeRepository: FinanceRepository,
    onOverview: () -> Unit,
    onPlanning: () -> Unit,
    onInvestments: () -> Unit,
    onReports: () -> Unit,
    onSettings: () -> Unit,
    onMore: () -> Unit,
    onSignOut: suspend () -> Unit,
) {
    val state by financeRepository.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var section by remember { mutableStateOf(WebsiteMoneySection.Accounts) }
    var addAccount by remember { mutableStateOf(false) }
    var editAccount by remember { mutableStateOf<FinanceAccount?>(null) }
    var transfer by remember { mutableStateOf(false) }
    var addTransaction by remember { mutableStateOf(false) }
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
    val refreshing = state is FinanceState.Loading

    fun showResult(result: FinanceResult, success: String) {
        scope.launch {
            snackbar.showSnackbar(
                when (result) {
                    FinanceResult.Success -> success
                    is FinanceResult.Failure -> result.message
                },
            )
        }
    }

    JalvoroWebsiteWorkspaceShell(
        email = email,
        selected = JalvoroWebsiteDestination.Money,
        onOverview = onOverview,
        onMoney = {},
        onPlanning = onPlanning,
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
            Column(
                modifier = Modifier.fillMaxSize().padding(scaffoldPadding),
            ) {
                WebsiteMoneyHeader(
                    section = section,
                    refreshing = refreshing,
                    onSection = { section = it },
                    onRefresh = {
                        scope.launch {
                            showResult(financeRepository.refresh(force = true), "Money refreshed")
                        }
                    },
                )
                Box(modifier = Modifier.fillMaxWidth().weight(1f)) {
                    when {
                        state is FinanceState.Loading && snapshot == null -> WebsiteMoneyProgress()
                        state is FinanceState.Failure && snapshot == null -> WebsiteMoneyFailure(
                            message = (state as FinanceState.Failure).message,
                            onRetry = {
                                scope.launch { financeRepository.refresh(force = true) }
                            },
                        )
                        snapshot != null -> JalvoroAnimatedSwap(
                            targetState = section,
                            modifier = Modifier.fillMaxSize(),
                            label = "website-money-section",
                        ) { currentSection ->
                            when (currentSection) {
                                WebsiteMoneySection.Accounts -> WebsiteAccountsPage(
                                    snapshot = snapshot,
                                    onAdd = { addAccount = true },
                                    onTransfer = { transfer = true },
                                    onEdit = { editAccount = it },
                                    onArchive = { archiveAccount = it },
                                )
                                WebsiteMoneySection.Transactions -> WebsiteTransactionsPage(
                                    snapshot = snapshot,
                                    onAdd = { addTransaction = true },
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
                                WebsiteMoneySection.Profile -> WebsiteMoneyProfile(
                                    email = email,
                                    onSettings = onSettings,
                                    onSignOut = { scope.launch { onSignOut() } },
                                )
                            }
                        }
                        else -> WebsiteMoneyProgress()
                    }
                }
            }
        }
    }

    if (addAccount) {
        JalvoroWebsiteAccountDialog(
            account = null,
            onDismiss = { addAccount = false },
            onSubmit = financeRepository::createAccount,
        )
    }
    editAccount?.let { account ->
        JalvoroWebsiteAccountDialog(
            account = account,
            onDismiss = { editAccount = null },
            onSubmit = { draft ->
                financeRepository.updateAccount(
                    account.id,
                    AccountUpdate(
                        name = draft.name,
                        accountNumber = draft.accountNumber,
                        accountKind = draft.accountKind,
                    ),
                )
            },
        )
    }
    if (transfer && snapshot != null) {
        JalvoroWebsiteTransferDialog(
            accounts = snapshot.activeAccounts,
            onDismiss = { transfer = false },
            onSubmit = financeRepository::createTransfer,
        )
    }
    if (addTransaction && snapshot != null) {
        JalvoroWebsiteTransactionDialog(
            editable = null,
            accounts = snapshot.activeAccounts,
            categories = snapshot.categories,
            onDismiss = { addTransaction = false },
            onSubmit = financeRepository::createTransaction,
        )
    }
    editTransaction?.let { editable ->
        if (snapshot != null) {
            JalvoroWebsiteTransactionDialog(
                editable = editable,
                accounts = snapshot.activeAccounts,
                categories = snapshot.categories,
                onDismiss = { editTransaction = null },
                onSubmit = { draft -> financeRepository.updateTransaction(editable.id, draft) },
            )
        }
    }
    archiveAccount?.let { account ->
        AlertDialog(
            onDismissRequest = { archiveAccount = null },
            icon = { Icon(JalvoroIcons.Accounts, contentDescription = null) },
            title = { Text(if (account.status == "active") "Archive account?" else "Restore account?") },
            text = {
                Text("Financial history remains preserved. Archived accounts cannot receive new entries.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            val archived = account.status == "active"
                            val result = financeRepository.setAccountArchived(account.id, archived)
                            archiveAccount = null
                            showResult(result, if (archived) "Account archived" else "Account restored")
                        }
                    },
                ) { Text(if (account.status == "active") "Archive" else "Restore") }
            },
            dismissButton = { TextButton(onClick = { archiveAccount = null }) { Text("Cancel") } },
        )
    }
    deleteEntry?.let { entry ->
        AlertDialog(
            onDismissRequest = { deleteEntry = null },
            icon = { Icon(JalvoroIcons.Transactions, contentDescription = null) },
            title = { Text("Delete ledger entry?") },
            text = {
                Text("The row remains auditable as deleted and secure database triggers recalculate balances.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            val result = financeRepository.softDelete(entry)
                            deleteEntry = null
                            showResult(result, "Ledger entry deleted")
                        }
                    },
                ) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { deleteEntry = null }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun WebsiteMoneyHeader(
    section: WebsiteMoneySection,
    refreshing: Boolean,
    onSection: (WebsiteMoneySection) -> Unit,
    onRefresh: () -> Unit,
) {
    val tabs = listOf(
        WebsiteMoneyTab(WebsiteMoneySection.Accounts, "Accounts", JalvoroIcons.Accounts),
        WebsiteMoneyTab(WebsiteMoneySection.Transactions, "Transactions", JalvoroIcons.Transactions),
    )
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "Money",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.semantics { heading() },
                )
                Text(
                    text = "Accounts, transactions and balances",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            JalvoroIconAction(
                icon = JalvoroIcons.Refresh,
                label = if (refreshing) "Refreshing Money" else "Refresh Money",
                enabled = !refreshing,
                onClick = onRefresh,
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            tabs.forEach { tab ->
                FilterChip(
                    selected = section == tab.section,
                    onClick = { onSection(tab.section) },
                    modifier = Modifier.weight(1f),
                    label = {
                        Text(
                            text = tab.label,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    },
                    leadingIcon = {
                        Icon(tab.icon, contentDescription = null, modifier = Modifier.size(16.dp))
                    },
                )
            }
        }
    }
}

@Composable
private fun WebsiteAccountsPage(
    snapshot: FinanceSnapshot,
    onAdd: () -> Unit,
    onTransfer: () -> Unit,
    onEdit: (FinanceAccount) -> Unit,
    onArchive: (FinanceAccount) -> Unit,
) {
    var showArchived by remember { mutableStateOf(false) }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedButton(
                    onClick = onTransfer,
                    enabled = snapshot.activeAccounts.size >= 2,
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Icon(JalvoroIcons.Transfer, contentDescription = null, modifier = Modifier.size(17.dp))
                    Spacer(Modifier.size(7.dp))
                    Text("Transfer")
                }
                Spacer(Modifier.size(8.dp))
                Button(onClick = onAdd, shape = RoundedCornerShape(14.dp)) {
                    Icon(JalvoroIcons.Plus, contentDescription = null, modifier = Modifier.size(17.dp))
                    Spacer(Modifier.size(7.dp))
                    Text("Add account")
                }
            }
        }
        item {
            WebsiteBalanceSummary(snapshot)
        }
        if (snapshot.activeAccounts.isEmpty()) {
            item {
                WebsiteMoneyEmpty(
                    icon = JalvoroIcons.Accounts,
                    title = "No accounts yet",
                    description = "Add your first account to see balances and activity here.",
                    action = "Add an account",
                    onAction = onAdd,
                )
            }
        } else {
            item {
                WebsiteAccountGrid(
                    accounts = snapshot.activeAccounts,
                    onEdit = onEdit,
                    onArchive = onArchive,
                )
            }
        }
        if (snapshot.archivedAccounts.isNotEmpty()) {
            item {
                TextButton(onClick = { showArchived = !showArchived }) {
                    Text(
                        if (showArchived) {
                            "Hide archived accounts"
                        } else {
                            "Show archived accounts (${snapshot.archivedAccounts.size})"
                        },
                    )
                }
            }
            if (showArchived) {
                item {
                    WebsiteAccountGrid(
                        accounts = snapshot.archivedAccounts,
                        onEdit = onEdit,
                        onArchive = onArchive,
                    )
                }
            }
        }
    }
}

@Composable
private fun WebsiteBalanceSummary(snapshot: FinanceSnapshot) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surfaceContainer,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f)),
        shadowElevation = 4.dp,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Text(
                text = "TOTAL ACTIVE BALANCE",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = formatPkrWebsite(snapshot.totalActiveBalance),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Black,
            )
            Text(
                text = "${snapshot.activeAccounts.size} active account${if (snapshot.activeAccounts.size == 1) "" else "s"}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun WebsiteAccountGrid(
    accounts: List<FinanceAccount>,
    onEdit: (FinanceAccount) -> Unit,
    onArchive: (FinanceAccount) -> Unit,
) {
    BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
        val columns = if (maxWidth >= 680.dp) 2 else 1
        val rows = accounts.chunked(columns)
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            rows.forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    row.forEach { account ->
                        WebsiteAccountCard(
                            account = account,
                            onEdit = { onEdit(account) },
                            onArchive = { onArchive(account) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                    if (columns == 2 && row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun WebsiteAccountCard(
    account: FinanceAccount,
    onEdit: () -> Unit,
    onArchive: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f)),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(17.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primary,
                    contentColor = Color.White,
                ) {
                    Icon(
                        JalvoroIcons.Accounts,
                        contentDescription = null,
                        modifier = Modifier.padding(9.dp).size(19.dp),
                    )
                }
                Spacer(Modifier.size(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        account.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        listOf(account.accountKind.replaceFirstChar(Char::uppercase), account.status.replaceFirstChar(Char::uppercase))
                            .joinToString(" • "),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Text(
                formatPkrWebsite(account.balance),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Black,
            )
            if (!account.accountNumber.isNullOrBlank()) {
                Text(
                    "•••• ${account.accountNumber.takeLast(4)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                "Opened ${account.openingCurrency} ${formatNumberWebsite(account.openingBalanceOriginal)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onEdit, modifier = Modifier.weight(1f)) { Text("Edit") }
                OutlinedButton(onClick = onArchive, modifier = Modifier.weight(1f)) {
                    Text(if (account.status == "active") "Archive" else "Restore")
                }
            }
        }
    }
}

@Composable
private fun WebsiteTransactionsPage(
    snapshot: FinanceSnapshot,
    onAdd: () -> Unit,
    onEdit: (LedgerEntry) -> Unit,
    onDelete: (LedgerEntry) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf(WebsiteLedgerFilter.All) }
    val cleanQuery = query.trim().lowercase()
    val rows = snapshot.ledger.filter { entry ->
        val typeMatches = when (filter) {
            WebsiteLedgerFilter.All -> true
            WebsiteLedgerFilter.Income -> entry.type == "income"
            WebsiteLedgerFilter.Expense -> entry.type == "expense" || entry.type == "refund"
            WebsiteLedgerFilter.Transfer -> entry.type == "transfer"
        }
        val haystack = listOfNotNull(
            entry.type,
            entry.note,
            entry.reference,
            entry.sourceName,
            entry.personName,
            entry.itemName,
            entry.categories?.name,
            entry.accounts?.name,
            if (entry.isDeleted) "deleted" else null,
        ).joinToString(" ").lowercase()
        typeMatches && (cleanQuery.isBlank() || haystack.contains(cleanQuery))
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Transactions",
                    modifier = Modifier.weight(1f).semantics { heading() },
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Black,
                )
                Button(onClick = onAdd, shape = RoundedCornerShape(14.dp)) {
                    Icon(JalvoroIcons.Plus, contentDescription = null, modifier = Modifier.size(17.dp))
                    Spacer(Modifier.size(7.dp))
                    Text("Add transaction")
                }
            }
        }
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                color = MaterialTheme.colorScheme.surfaceContainer,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f)),
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    OutlinedTextField(
                        value = query,
                        onValueChange = { query = it },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        label = { Text("Search transactions") },
                        leadingIcon = { Icon(JalvoroIcons.Search, contentDescription = null) },
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            focusedLabelColor = MaterialTheme.colorScheme.primary,
                            cursorColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                        ),
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(7.dp),
                    ) {
                        WebsiteLedgerFilter.entries.forEach { option ->
                            FilterChip(
                                selected = filter == option,
                                onClick = { filter = option },
                                modifier = Modifier.weight(1f),
                                label = {
                                    Text(option.label, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                },
                            )
                        }
                    }
                }
            }
        }
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                color = MaterialTheme.colorScheme.surfaceContainer,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f)),
                shadowElevation = 4.dp,
            ) {
                if (rows.isEmpty()) {
                    WebsiteMoneyEmpty(
                        icon = JalvoroIcons.Transactions,
                        title = if (query.isBlank() && filter == WebsiteLedgerFilter.All) {
                            "No transactions yet"
                        } else {
                            "No transactions found"
                        },
                        description = if (query.isBlank() && filter == WebsiteLedgerFilter.All) {
                            "Your account activity will appear here."
                        } else {
                            "Try changing the filters or search."
                        },
                        action = if (query.isBlank() && filter == WebsiteLedgerFilter.All) "Add a transaction" else null,
                        onAction = if (query.isBlank() && filter == WebsiteLedgerFilter.All) onAdd else null,
                    )
                } else {
                    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp)) {
                        rows.take(100).forEachIndexed { index, entry ->
                            WebsiteTransactionRow(entry, onEdit, onDelete)
                            if (index != rows.take(100).lastIndex) {
                                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun WebsiteTransactionRow(
    entry: LedgerEntry,
    onEdit: (LedgerEntry) -> Unit,
    onDelete: (LedgerEntry) -> Unit,
) {
    val tone = when (entry.type) {
        "income", "refund" -> Color(0xFF147A55)
        "expense" -> Color(0xFFB84F4A)
        "transfer" -> Color(0xFF2366B1)
        "investment" -> Color(0xFF6849B8)
        else -> MaterialTheme.colorScheme.primary
    }
    val title = transactionTitle(entry)
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Surface(shape = CircleShape, color = tone.copy(alpha = 0.12f), contentColor = tone) {
            Icon(
                imageVector = when (entry.type) {
                    "income" -> JalvoroIcons.Income
                    "expense", "refund" -> JalvoroIcons.Expenses
                    "transfer" -> JalvoroIcons.Transfer
                    "investment" -> JalvoroIcons.Investments
                    else -> JalvoroIcons.Transactions
                },
                contentDescription = null,
                modifier = Modifier.padding(9.dp).size(18.dp),
            )
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    title,
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (entry.isDeleted) {
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.errorContainer,
                        contentColor = MaterialTheme.colorScheme.onErrorContainer,
                    ) {
                        Text(
                            "DELETED",
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Black,
                        )
                    }
                }
            }
            Text(
                listOfNotNull(entry.date, entry.accounts?.name, entry.categories?.name)
                    .filter(String::isNotBlank)
                    .joinToString(" • "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (!entry.isDeleted && (entry.canEditDirectly || entry.canDeleteSafely)) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (entry.canEditDirectly) {
                        TextButton(onClick = { onEdit(entry) }, contentPadding = PaddingValues(horizontal = 4.dp)) {
                            Text("Edit")
                        }
                    }
                    if (entry.canDeleteSafely) {
                        TextButton(onClick = { onDelete(entry) }, contentPadding = PaddingValues(horizontal = 4.dp)) {
                            Text("Delete")
                        }
                    }
                }
            }
        }
        Text(
            text = transactionAmount(entry),
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Black,
            color = tone,
            maxLines = 1,
        )
    }
}

@Composable
private fun WebsiteMoneyProfile(
    email: String,
    onSettings: () -> Unit,
    onSignOut: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.TopCenter) {
        Surface(
            modifier = Modifier.fillMaxWidth().widthIn(max = 620.dp),
            shape = RoundedCornerShape(18.dp),
            color = MaterialTheme.colorScheme.surfaceContainer,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f)),
            shadowElevation = 4.dp,
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primary, contentColor = Color.White) {
                    Icon(JalvoroIcons.User, contentDescription = null, modifier = Modifier.padding(14.dp).size(26.dp))
                }
                Text("Finance profile", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Text(
                    email,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Button(onClick = onSettings, modifier = Modifier.fillMaxWidth()) { Text("Open settings") }
                OutlinedButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) {
                    Icon(JalvoroIcons.SignOut, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.size(8.dp))
                    Text("Sign out")
                }
            }
        }
    }
}

@Composable
private fun WebsiteMoneyEmpty(
    icon: ImageVector,
    title: String,
    description: String,
    action: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(9.dp),
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(30.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(
            description,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (action != null && onAction != null) Button(onClick = onAction) { Text(action) }
    }
}

@Composable
private fun WebsiteMoneyFailure(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
        JalvoroFeedbackCard(message, JalvoroFeedbackTone.Danger)
        Button(onClick = onRetry, modifier = Modifier.align(Alignment.BottomCenter)) { Text("Try again") }
    }
}

@Composable
private fun WebsiteMoneyProgress() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(strokeWidth = 2.5.dp)
    }
}

private fun transactionTitle(entry: LedgerEntry): String = listOfNotNull(
    entry.itemName?.trim()?.takeIf(String::isNotBlank),
    entry.sourceName?.trim()?.takeIf(String::isNotBlank),
    entry.personName?.trim()?.takeIf(String::isNotBlank),
    entry.categories?.name?.trim()?.takeIf(String::isNotBlank),
    entry.note?.trim()?.takeIf(String::isNotBlank),
    entry.accounts?.name?.trim()?.takeIf(String::isNotBlank),
).firstOrNull() ?: entry.type.replaceFirstChar(Char::uppercase)

private fun transactionAmount(entry: LedgerEntry): String = when (entry.type) {
    "income", "refund" -> "+${formatPkrWebsite(entry.amount)}"
    "expense" -> "−${formatPkrWebsite(entry.amount)}"
    else -> formatPkrWebsite(entry.amount)
}

private fun formatPkrWebsite(value: Double): String {
    val fractionDigits = if (value % 1.0 == 0.0) 0 else 2
    val formatted = NumberFormat.getNumberInstance(Locale.US).apply {
        minimumFractionDigits = fractionDigits
        maximumFractionDigits = fractionDigits
        isGroupingUsed = true
    }.format(value)
    return "Rs $formatted"
}

private fun formatNumberWebsite(value: Double): String =
    NumberFormat.getNumberInstance(Locale.US).apply { maximumFractionDigits = 2 }.format(value)
