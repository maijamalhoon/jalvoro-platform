package com.jamalsfinance.nativeapp.ui

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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.finance.FinanceRepository
import com.jamalsfinance.shared.finance.FinanceSnapshot
import com.jamalsfinance.shared.finance.FinanceState
import com.jamalsfinance.shared.finance.LedgerEntry
import com.jamalsfinance.shared.goals.GoalsPayablesRepository
import com.jamalsfinance.shared.goals.GoalsPayablesSnapshot
import com.jamalsfinance.shared.goals.GoalsPayablesState
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsRepository
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsSnapshot
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsState
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Currency
import java.util.Date
import java.util.Locale

private data class NativeMonthSummary(
    val income: Double,
    val expenses: Double,
    val netSavings: Double,
)

private data class NativeOverviewMetric(
    val title: String,
    val amount: Double?,
    val helper: String,
    val tone: NativeMetricTone,
)

private enum class NativeMetricTone {
    Brand,
    Income,
    Expense,
    Investment,
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NativeOverviewDashboard(
    email: String,
    financeRepository: FinanceRepository,
    goalsPayablesRepository: GoalsPayablesRepository,
    investmentsAnalyticsRepository: InvestmentsAnalyticsRepository,
    onOpenFinance: () -> Unit,
    onOpenPlanning: () -> Unit,
    onOpenInvestments: () -> Unit,
    onOpenReports: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenMore: () -> Unit,
) {
    val financeState by financeRepository.state.collectAsStateWithLifecycle()
    val goalsState by goalsPayablesRepository.state.collectAsStateWithLifecycle()
    val investmentsState by investmentsAnalyticsRepository.state.collectAsStateWithLifecycle()
    var refreshRequest by remember { mutableIntStateOf(0) }
    val todayKey = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()) }

    LaunchedEffect(
        financeRepository,
        goalsPayablesRepository,
        investmentsAnalyticsRepository,
        refreshRequest,
    ) {
        val force = refreshRequest > 0
        financeRepository.refresh(force = force)
        goalsPayablesRepository.refresh(force = force)
        investmentsAnalyticsRepository.refresh(nowDate = todayKey, force = force)
    }

    val financeSnapshot = financeState.snapshotOrNull()
    val goalsSnapshot = goalsState.snapshotOrNull()
    val investmentsSnapshot = investmentsState.snapshotOrNull()
    val refreshing =
        financeState is FinanceState.Loading ||
            goalsState is GoalsPayablesState.Loading ||
            investmentsState is InvestmentsAnalyticsState.Loading
    val failures = listOfNotNull(
        (financeState as? FinanceState.Failure)?.message?.let { "Money: $it" },
        (goalsState as? GoalsPayablesState.Failure)?.message?.let { "Planning: $it" },
        (investmentsState as? InvestmentsAnalyticsState.Failure)?.message?.let { "Investments: $it" },
    )
    val monthSummary = financeSnapshot?.monthSummary(todayKey)
    val accountBalance = financeSnapshot?.totalActiveBalance
    val portfolioValue = investmentsSnapshot?.totalValue
    val totalBalance = when {
        accountBalance == null && portfolioValue == null -> null
        else -> (accountBalance ?: 0.0) + (portfolioValue ?: 0.0)
    }
    val recentEntries = financeSnapshot
        ?.ledger
        ?.asSequence()
        ?.filterNot(LedgerEntry::isDeleted)
        ?.take(5)
        ?.toList()
        .orEmpty()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "Jamal's Finance",
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.semantics { heading() },
                        )
                        Text(
                            "Overview",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                actions = {
                    TextButton(
                        enabled = !refreshing,
                        onClick = { refreshRequest += 1 },
                    ) {
                        Text(if (refreshing) "Refreshing…" else "Refresh")
                    }
                },
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = true,
                    onClick = {},
                    icon = { Text("D", fontWeight = FontWeight.Bold) },
                    label = { Text("Dashboard") },
                )
                NavigationBarItem(
                    selected = false,
                    onClick = onOpenFinance,
                    icon = { Text("M", fontWeight = FontWeight.Bold) },
                    label = { Text("Money") },
                )
                NavigationBarItem(
                    selected = false,
                    onClick = onOpenPlanning,
                    icon = { Text("P", fontWeight = FontWeight.Bold) },
                    label = { Text("Planning") },
                )
                NavigationBarItem(
                    selected = false,
                    onClick = onOpenMore,
                    icon = { Text("•••", fontWeight = FontWeight.Bold) },
                    label = { Text("More") },
                )
            }
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .widthIn(max = 1_200.dp),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Column {
                    Text(
                        "Understand your money. Plan with clarity.",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.semantics { heading() },
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Signed in as $email",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }

            if (failures.isNotEmpty()) {
                item {
                    NativeDataNotice(failures)
                }
            }

            if (
                financeSnapshot == null &&
                goalsSnapshot == null &&
                investmentsSnapshot == null &&
                refreshing
            ) {
                item {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 56.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }
            } else {
                item {
                    NativeBalanceHero(
                        totalBalance = totalBalance,
                        accountBalance = accountBalance,
                        portfolioValue = portfolioValue,
                        onOpenFinance = onOpenFinance,
                        onOpenInvestments = onOpenInvestments,
                    )
                }

                item {
                    NativeMetricGrid(
                        metrics = listOf(
                            NativeOverviewMetric(
                                title = "Net savings",
                                amount = monthSummary?.netSavings,
                                helper = "Month to date",
                                tone = NativeMetricTone.Brand,
                            ),
                            NativeOverviewMetric(
                                title = "Month-to-date income",
                                amount = monthSummary?.income,
                                helper = "Recorded income",
                                tone = NativeMetricTone.Income,
                            ),
                            NativeOverviewMetric(
                                title = "Month-to-date expenses",
                                amount = monthSummary?.expenses,
                                helper = "Refunds reduce expenses",
                                tone = NativeMetricTone.Expense,
                            ),
                            NativeOverviewMetric(
                                title = "Portfolio value",
                                amount = portfolioValue,
                                helper = investmentsSnapshot?.let {
                                    "${it.holdings.size} holding${if (it.holdings.size == 1) "" else "s"}"
                                } ?: "Investment data unavailable",
                                tone = NativeMetricTone.Investment,
                            ),
                        ),
                    )
                }

                item {
                    NativeWorkspaceGrid(
                        onOpenPlanning = onOpenPlanning,
                        onOpenInvestments = onOpenInvestments,
                        onOpenReports = onOpenReports,
                        onOpenSettings = onOpenSettings,
                    )
                }

                item {
                    NativeGoalsSummary(
                        snapshot = goalsSnapshot,
                        onOpenPlanning = onOpenPlanning,
                    )
                }

                item {
                    NativeRecentActivity(
                        entries = recentEntries,
                        dataAvailable = financeSnapshot != null,
                        onOpenFinance = onOpenFinance,
                    )
                }
            }
        }
    }
}

@Composable
private fun NativeDataNotice(messages: List<String>) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .semantics { liveRegion = LiveRegionMode.Polite },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer,
            contentColor = MaterialTheme.colorScheme.onErrorContainer,
        ),
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text(
                "Some dashboard data is temporarily unavailable",
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(6.dp))
            messages.forEach { message ->
                Text("• $message", style = MaterialTheme.typography.bodySmall)
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "Available sections remain usable. Refresh when the connection is stable.",
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

@Composable
private fun NativeBalanceHero(
    totalBalance: Double?,
    accountBalance: Double?,
    portfolioValue: Double?,
    onOpenFinance: () -> Unit,
    onOpenInvestments: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(Modifier.fillMaxWidth().padding(20.dp)) {
            Text(
                when {
                    totalBalance == null -> "Balance unavailable"
                    accountBalance == null || portfolioValue == null -> "Partial balance"
                    else -> "Total net balance"
                },
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                formatPkrOrUnavailable(totalBalance),
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                when {
                    totalBalance == null ->
                        "Account and investment values could not be loaded."
                    accountBalance == null ->
                        "Portfolio value is available; account balances are unavailable."
                    portfolioValue == null ->
                        "Account balances are available; portfolio value is unavailable."
                    else ->
                        "Accounts ${formatPkrOrUnavailable(accountBalance)} • Investments ${formatPkrOrUnavailable(portfolioValue)}"
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(18.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onOpenFinance,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Text("Open money")
                }
                OutlinedButton(
                    onClick = onOpenInvestments,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Text("Investments")
                }
            }
        }
    }
}

@Composable
private fun NativeMetricGrid(metrics: List<NativeOverviewMetric>) {
    BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
        val columns = when {
            maxWidth >= 900.dp -> 4
            maxWidth >= 520.dp -> 2
            else -> 1
        }
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            metrics.chunked(columns).forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    row.forEach { metric ->
                        NativeMetricCard(
                            metric = metric,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    repeat(columns - row.size) {
                        Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun NativeMetricCard(
    metric: NativeOverviewMetric,
    modifier: Modifier = Modifier,
) {
    val accent = when (metric.tone) {
        NativeMetricTone.Brand -> MaterialTheme.colorScheme.primary
        NativeMetricTone.Income -> MaterialTheme.colorScheme.tertiary
        NativeMetricTone.Expense -> MaterialTheme.colorScheme.error
        NativeMetricTone.Investment -> MaterialTheme.colorScheme.secondary
    }
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text(
                metric.title,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(10.dp))
            Text(
                formatPkrOrUnavailable(metric.amount),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = if (metric.amount == null) {
                    MaterialTheme.colorScheme.onSurfaceVariant
                } else {
                    accent
                },
            )
            Spacer(Modifier.height(4.dp))
            Text(
                metric.helper,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun NativeWorkspaceGrid(
    onOpenPlanning: () -> Unit,
    onOpenInvestments: () -> Unit,
    onOpenReports: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    Column {
        Text(
            "Workspaces",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.semantics { heading() },
        )
        Spacer(Modifier.height(10.dp))
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            val columns = if (maxWidth >= 680.dp) 2 else 1
            val items = listOf(
                Triple("Goals & payables", "Plan targets, contributions, dues and repayments.", onOpenPlanning),
                Triple("Investments & analytics", "Review holdings, profit/loss and cash-flow intelligence.", onOpenInvestments),
                Triple("Reports & AI insights", "Open reports, financial health and secure insights.", onOpenReports),
                Triple("Settings", "Profile, currency, alerts, backup, privacy and display.", onOpenSettings),
            )
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items.chunked(columns).forEach { row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        row.forEach { item ->
                            NativeWorkspaceCard(
                                title = item.first,
                                description = item.second,
                                onClick = item.third,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        repeat(columns - row.size) {
                            Spacer(Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NativeWorkspaceCard(
    title: String,
    description: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text(title, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text(
                description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                "Open",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun NativeGoalsSummary(
    snapshot: GoalsPayablesSnapshot?,
    onOpenPlanning: () -> Unit,
) {
    val progress = snapshot?.let {
        if (it.totalGoalTarget > 0) {
            (it.totalGoalSaved / it.totalGoalTarget).coerceIn(0.0, 1.0)
        } else {
            0.0
        }
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Goals progress", fontWeight = FontWeight.Bold)
                    Text(
                        when {
                            snapshot == null -> "Planning data unavailable"
                            snapshot.goals.isEmpty() -> "No goals yet"
                            else -> "${snapshot.completedGoals}/${snapshot.goals.size} goals completed"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                TextButton(onClick = onOpenPlanning) {
                    Text("View")
                }
            }
            Spacer(Modifier.height(10.dp))
            if (snapshot == null) {
                Text(
                    "Refresh to check savings goals.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Text(
                    "${formatPkrOrUnavailable(snapshot.totalGoalSaved)} of ${formatPkrOrUnavailable(snapshot.totalGoalTarget)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(10.dp))
                LinearProgressIndicator(
                    progress = { progress?.toFloat() ?: 0f },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun NativeRecentActivity(
    entries: List<LedgerEntry>,
    dataAvailable: Boolean,
    onOpenFinance: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Recent transactions", fontWeight = FontWeight.Bold)
                    Text(
                        "Latest available ledger activity",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                TextButton(onClick = onOpenFinance) {
                    Text("View all")
                }
            }
            Spacer(Modifier.height(8.dp))
            when {
                !dataAvailable -> Text(
                    "Recent activity is unavailable.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                entries.isEmpty() -> Text(
                    "No transactions yet.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                else -> entries.forEachIndexed { index, entry ->
                    if (index > 0) Spacer(Modifier.height(12.dp))
                    NativeRecentEntry(entry)
                }
            }
        }
    }
}

@Composable
private fun NativeRecentEntry(entry: LedgerEntry) {
    val title = entry.note
        ?.trim()
        ?.takeIf(String::isNotBlank)
        ?: entry.categories?.name
        ?: when (entry.type) {
            "income" -> "Income"
            "expense" -> "Expense"
            "refund" -> "Refund"
            "transfer" -> "Transfer"
            "investment" -> "Investment"
            else -> "Transaction"
        }
    val amountPrefix = when (entry.type) {
        "income", "refund" -> "+"
        "expense", "investment" -> "−"
        else -> ""
    }
    val amountColor = when (entry.type) {
        "income", "refund" -> MaterialTheme.colorScheme.tertiary
        "expense" -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onSurface
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                title,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                listOfNotNull(entry.accounts?.name, entry.date.takeIf(String::isNotBlank))
                    .joinToString(" • "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Text(
            "$amountPrefix${formatPkrOrUnavailable(entry.amount)}",
            fontWeight = FontWeight.Bold,
            color = amountColor,
        )
    }
}

private fun FinanceState.snapshotOrNull(): FinanceSnapshot? = when (this) {
    is FinanceState.Ready -> snapshot
    is FinanceState.Loading -> previous
    is FinanceState.Failure -> previous
    FinanceState.Idle -> null
}

private fun GoalsPayablesState.snapshotOrNull(): GoalsPayablesSnapshot? = when (this) {
    is GoalsPayablesState.Ready -> snapshot
    is GoalsPayablesState.Loading -> previous
    is GoalsPayablesState.Failure -> previous
    GoalsPayablesState.Idle -> null
}

private fun InvestmentsAnalyticsState.snapshotOrNull(): InvestmentsAnalyticsSnapshot? = when (this) {
    is InvestmentsAnalyticsState.Ready -> snapshot
    is InvestmentsAnalyticsState.Loading -> previous
    is InvestmentsAnalyticsState.Failure -> previous
    InvestmentsAnalyticsState.Idle -> null
}

private fun FinanceSnapshot.monthSummary(todayKey: String): NativeMonthSummary {
    val monthPrefix = todayKey.take(7)
    var income = 0.0
    var expenses = 0.0
    ledger.asSequence()
        .filterNot(LedgerEntry::isDeleted)
        .filter { it.date.startsWith(monthPrefix) && it.date <= todayKey }
        .forEach { entry ->
            val amount = entry.amount.takeIf { it.isFinite() && it > 0 } ?: return@forEach
            when (entry.type.trim().lowercase()) {
                "income" -> income += amount
                "expense" -> expenses += amount
                "refund" -> expenses -= amount
            }
        }
    return NativeMonthSummary(
        income = income,
        expenses = expenses,
        netSavings = income - expenses,
    )
}

private fun formatPkrOrUnavailable(value: Double?): String {
    if (value == null || !value.isFinite()) return "Unavailable"
    val formatter = NumberFormat.getCurrencyInstance(Locale("en", "PK")).apply {
        currency = Currency.getInstance("PKR")
        maximumFractionDigits = 0
        minimumFractionDigits = 0
    }
    return formatter.format(value)
}
