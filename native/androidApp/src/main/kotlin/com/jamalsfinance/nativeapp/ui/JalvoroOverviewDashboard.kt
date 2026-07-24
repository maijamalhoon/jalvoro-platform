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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
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

private data class OverviewMonthSummary(
    val income: Double,
    val expenses: Double,
    val netSavings: Double,
)

private enum class OverviewMetricTone {
    Brand,
    Income,
    Expense,
    Investment,
}

private data class OverviewMetric(
    val title: String,
    val amount: Double?,
    val helper: String,
    val icon: ImageVector,
    val tone: OverviewMetricTone,
)

private data class OverviewAction(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val onClick: () -> Unit,
)

@Composable
fun JalvoroOverviewDashboard(
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

    val financeSnapshot = financeState.overviewSnapshotOrNull()
    val goalsSnapshot = goalsState.overviewSnapshotOrNull()
    val investmentsSnapshot = investmentsState.overviewSnapshotOrNull()
    val refreshing =
        financeState is FinanceState.Loading ||
            goalsState is GoalsPayablesState.Loading ||
            investmentsState is InvestmentsAnalyticsState.Loading
    val failures = listOfNotNull(
        (financeState as? FinanceState.Failure)?.message?.let { "Money: $it" },
        (goalsState as? GoalsPayablesState.Failure)?.message?.let { "Planning: $it" },
        (investmentsState as? InvestmentsAnalyticsState.Failure)?.message?.let {
            "Investments: $it"
        },
    )

    val monthSummary = financeSnapshot?.overviewMonthSummary(todayKey)
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
            JalvoroOverviewHeader(
                refreshing = refreshing,
                onRefresh = { refreshRequest += 1 },
                onOpenSettings = onOpenSettings,
            )
        },
        bottomBar = {
            JalvoroNavigationBar(
                destinations = listOf(
                    JalvoroNavigationDestination(
                        label = "Overview",
                        icon = JalvoroIcons.Dashboard,
                        selected = true,
                        onClick = {},
                    ),
                    JalvoroNavigationDestination(
                        label = "Money",
                        icon = JalvoroIcons.Wallet,
                        selected = false,
                        onClick = onOpenFinance,
                    ),
                    JalvoroNavigationDestination(
                        label = "Planning",
                        icon = JalvoroIcons.Target,
                        selected = false,
                        onClick = onOpenPlanning,
                    ),
                    JalvoroNavigationDestination(
                        label = "More",
                        icon = JalvoroIcons.More,
                        selected = false,
                        onClick = onOpenMore,
                    ),
                ),
            )
        },
    ) { padding ->
        BoxWithConstraints(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentAlignment = Alignment.TopCenter,
        ) {
            val twoColumns = maxWidth >= 720.dp
            LazyColumn(
                modifier = Modifier.fillMaxSize().widthIn(max = 1_180.dp),
                contentPadding = PaddingValues(
                    start = if (twoColumns) 24.dp else 16.dp,
                    end = if (twoColumns) 24.dp else 16.dp,
                    top = 18.dp,
                    bottom = 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    OverviewGreeting(email = email)
                }

                if (failures.isNotEmpty()) {
                    item {
                        OverviewDataNotice(messages = failures)
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
                            modifier = Modifier.fillMaxWidth().padding(vertical = 72.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            CircularProgressIndicator(strokeWidth = 2.5.dp)
                        }
                    }
                } else {
                    item {
                        OverviewBalanceHero(
                            totalBalance = totalBalance,
                            accountBalance = accountBalance,
                            portfolioValue = portfolioValue,
                            onOpenFinance = onOpenFinance,
                            onOpenInvestments = onOpenInvestments,
                        )
                    }

                    val metrics = listOf(
                        OverviewMetric(
                            title = "Net savings",
                            amount = monthSummary?.netSavings,
                            helper = "Month to date",
                            icon = JalvoroIcons.Wallet,
                            tone = OverviewMetricTone.Brand,
                        ),
                        OverviewMetric(
                            title = "Income",
                            amount = monthSummary?.income,
                            helper = "Month to date",
                            icon = JalvoroIcons.Income,
                            tone = OverviewMetricTone.Income,
                        ),
                        OverviewMetric(
                            title = "Expenses",
                            amount = monthSummary?.expenses,
                            helper = "Refunds reduce expenses",
                            icon = JalvoroIcons.Expenses,
                            tone = OverviewMetricTone.Expense,
                        ),
                        OverviewMetric(
                            title = "Portfolio value",
                            amount = portfolioValue,
                            helper = investmentsSnapshot?.let {
                                "${it.holdings.size} holding${if (it.holdings.size == 1) "" else "s"}"
                            } ?: "Investment data unavailable",
                            icon = JalvoroIcons.Investments,
                            tone = OverviewMetricTone.Investment,
                        ),
                    )
                    items(
                        items = if (twoColumns) metrics.chunked(2) else metrics.map(::listOf),
                        key = { row -> row.joinToString("|") { it.title } },
                    ) { row ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            row.forEach { metric ->
                                OverviewMetricCard(
                                    metric = metric,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (twoColumns && row.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }

                    item {
                        OverviewSectionHeading(
                            title = "Your workspaces",
                            description = "Open the same finance areas available on the website.",
                        )
                    }

                    val actions = listOf(
                        OverviewAction(
                            title = "Accounts & transactions",
                            description = "Balances, income, expenses, transfers and history.",
                            icon = JalvoroIcons.Transactions,
                            onClick = onOpenFinance,
                        ),
                        OverviewAction(
                            title = "Goals & payables",
                            description = "Targets, contributions, repayments and due status.",
                            icon = JalvoroIcons.Target,
                            onClick = onOpenPlanning,
                        ),
                        OverviewAction(
                            title = "Investments & analytics",
                            description = "Holdings, market pricing, performance and cash flow.",
                            icon = JalvoroIcons.Investments,
                            onClick = onOpenInvestments,
                        ),
                        OverviewAction(
                            title = "Reports & insights",
                            description = "Date-range reports, exports and secure insights.",
                            icon = JalvoroIcons.Reports,
                            onClick = onOpenReports,
                        ),
                    )
                    items(
                        items = if (twoColumns) actions.chunked(2) else actions.map(::listOf),
                        key = { row -> row.joinToString("|") { it.title } },
                    ) { row ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            row.forEach { action ->
                                OverviewActionCard(
                                    action = action,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (twoColumns && row.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }

                    item {
                        OverviewGoalsCard(
                            snapshot = goalsSnapshot,
                            onOpenPlanning = onOpenPlanning,
                        )
                    }

                    item {
                        OverviewRecentActivity(
                            entries = recentEntries,
                            dataAvailable = financeSnapshot != null,
                            onOpenFinance = onOpenFinance,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun JalvoroOverviewHeader(
    refreshing: Boolean,
    onRefresh: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceContainer,
        shadowElevation = 0.dp,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            JalvoroBrandLockup(
                modifier = Modifier.weight(1f),
                subtitle = "Personal overview",
                compact = true,
            )
            JalvoroIconAction(
                icon = JalvoroIcons.Refresh,
                label = if (refreshing) "Refreshing data" else "Refresh data",
                onClick = onRefresh,
                enabled = !refreshing,
            )
            JalvoroIconAction(
                icon = JalvoroIcons.Settings,
                label = "Open settings",
                onClick = onOpenSettings,
            )
        }
    }
}

@Composable
private fun OverviewGreeting(email: String) {
    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(
            text = "Understand your money. Plan with clarity.",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.semantics { heading() },
        )
        Text(
            text = "Signed in as $email",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun OverviewDataNotice(messages: List<String>) {
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
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Icon(
                imageVector = JalvoroIcons.Warning,
                contentDescription = null,
                modifier = Modifier.size(22.dp),
            )
            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text(
                    text = "Some dashboard data is temporarily unavailable",
                    fontWeight = FontWeight.Bold,
                )
                messages.forEach { message ->
                    Text("• $message", style = MaterialTheme.typography.bodySmall)
                }
                Text(
                    text = "Available sections remain usable. Refresh when the connection is stable.",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@Composable
private fun OverviewBalanceHero(
    totalBalance: Double?,
    accountBalance: Double?,
    portfolioValue: Double?,
    onOpenFinance: () -> Unit,
    onOpenInvestments: () -> Unit,
) {
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
                        imageVector = JalvoroIcons.Wallet,
                        contentDescription = null,
                        modifier = Modifier.padding(12.dp).size(24.dp),
                    )
                }
                Spacer(Modifier.size(12.dp))
                Column {
                    Text(
                        text = when {
                            totalBalance == null -> "Balance unavailable"
                            accountBalance == null || portfolioValue == null -> "Partial balance"
                            else -> "Total net balance"
                        },
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = formatPkrOrUnavailable(totalBalance),
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            Text(
                text = when {
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

            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onOpenFinance,
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Icon(
                        imageVector = JalvoroIcons.Accounts,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.size(8.dp))
                    Text("Open money")
                }
                OutlinedButton(
                    onClick = onOpenInvestments,
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Icon(
                        imageVector = JalvoroIcons.Investments,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.size(8.dp))
                    Text("Investments")
                }
            }
        }
    }
}

@Composable
private fun OverviewMetricCard(
    metric: OverviewMetric,
    modifier: Modifier = Modifier,
) {
    val toneColor = overviewToneColor(metric.tone)
    JalvoroSurfaceCard(modifier = modifier) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = toneColor.copy(alpha = 0.12f),
                contentColor = toneColor,
            ) {
                Icon(
                    imageVector = metric.icon,
                    contentDescription = null,
                    modifier = Modifier.padding(9.dp).size(20.dp),
                )
            }
            Text(
                text = metric.title,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = formatPkrOrUnavailable(metric.amount),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = metric.helper,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun OverviewActionCard(
    action: OverviewAction,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = action.onClick,
        modifier = modifier.semantics(mergeDescendants = true) {
            contentDescription = "${action.title}. ${action.description}"
        },
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(17.dp),
            verticalArrangement = Arrangement.spacedBy(9.dp),
        ) {
            Icon(
                imageVector = action.icon,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = action.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = action.description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Open",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
                Spacer(Modifier.size(6.dp))
                Icon(
                    imageVector = JalvoroIcons.ArrowRight,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
            }
        }
    }
}

@Composable
private fun OverviewGoalsCard(
    snapshot: GoalsPayablesSnapshot?,
    onOpenPlanning: () -> Unit,
) {
    JalvoroSurfaceCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = JalvoroIcons.Target,
                    contentDescription = null,
                    modifier = Modifier.size(22.dp),
                    tint = MaterialTheme.colorScheme.secondary,
                )
                Spacer(Modifier.size(9.dp))
                Text(
                    text = "Goals progress",
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
                OutlinedButton(onClick = onOpenPlanning) {
                    Text("View all")
                }
            }

            if (snapshot == null) {
                Text(
                    text = "Goals data is unavailable.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else if (snapshot.goals.isEmpty()) {
                Text(
                    text = "No goals yet. Create a savings target from Planning.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                val overallProgress = if (snapshot.totalGoalTarget > 0) {
                    (snapshot.totalGoalSaved / snapshot.totalGoalTarget).coerceIn(0.0, 1.0)
                } else {
                    0.0
                }
                Text(
                    text = "${formatPkrOrUnavailable(snapshot.totalGoalSaved)} of ${formatPkrOrUnavailable(snapshot.totalGoalTarget)} saved",
                    fontWeight = FontWeight.SemiBold,
                )
                LinearProgressIndicator(
                    progress = { overallProgress.toFloat() },
                    modifier = Modifier.fillMaxWidth().height(8.dp),
                    color = MaterialTheme.colorScheme.secondary,
                    trackColor = MaterialTheme.colorScheme.secondaryContainer,
                )
                Text(
                    text = "${snapshot.completedGoals} of ${snapshot.goals.size} goals completed",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                snapshot.goals.take(3).forEach { goal ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = goal.row.name,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        Text(
                            text = "${(goal.progress * 100).toInt()}%",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.secondary,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun OverviewRecentActivity(
    entries: List<LedgerEntry>,
    dataAvailable: Boolean,
    onOpenFinance: () -> Unit,
) {
    JalvoroSurfaceCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = JalvoroIcons.Transactions,
                    contentDescription = null,
                    modifier = Modifier.size(22.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
                Spacer(Modifier.size(9.dp))
                Text(
                    text = "Recent activity",
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
                OutlinedButton(onClick = onOpenFinance) {
                    Text("View all")
                }
            }

            when {
                !dataAvailable -> Text(
                    text = "Recent activity is unavailable.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                entries.isEmpty() -> Text(
                    text = "No financial activity has been recorded yet.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                else -> entries.forEachIndexed { index, entry ->
                    RecentActivityRow(entry = entry)
                    if (index != entries.lastIndex) {
                        Surface(
                            modifier = Modifier.fillMaxWidth().height(1.dp),
                            color = MaterialTheme.colorScheme.outlineVariant,
                        ) {}
                    }
                }
            }
        }
    }
}

@Composable
private fun RecentActivityRow(entry: LedgerEntry) {
    val expense = entry.type == "expense"
    val refund = entry.type == "refund"
    val tone = when {
        expense -> MaterialTheme.colorScheme.error
        refund || entry.type == "income" -> MaterialTheme.colorScheme.tertiary
        else -> MaterialTheme.colorScheme.primary
    }
    val icon = when (entry.type) {
        "income" -> JalvoroIcons.Income
        "expense" -> JalvoroIcons.Expenses
        "transfer" -> JalvoroIcons.Transfer
        else -> JalvoroIcons.Transactions
    }
    val title = listOfNotNull(
        entry.itemName?.trim()?.takeIf(String::isNotBlank),
        entry.sourceName?.trim()?.takeIf(String::isNotBlank),
        entry.personName?.trim()?.takeIf(String::isNotBlank),
        entry.categories?.name?.trim()?.takeIf(String::isNotBlank),
        entry.note?.trim()?.takeIf(String::isNotBlank),
    ).firstOrNull() ?: entry.type.replaceFirstChar(Char::uppercase)

    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(11.dp),
    ) {
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
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = listOfNotNull(
                    entry.date.takeIf(String::isNotBlank),
                    entry.accounts?.name?.takeIf(String::isNotBlank),
                ).joinToString(" • "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Text(
            text = when {
                expense -> "−${formatPkrOrUnavailable(entry.amount)}"
                refund || entry.type == "income" -> "+${formatPkrOrUnavailable(entry.amount)}"
                else -> formatPkrOrUnavailable(entry.amount)
            },
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = tone,
        )
    }
}

@Composable
private fun OverviewSectionHeading(title: String, description: String) {
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.semantics { heading() },
        )
        Text(
            text = description,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun overviewToneColor(tone: OverviewMetricTone): Color {
    val dark = MaterialTheme.colorScheme.background.luminance() < 0.35f
    return when (tone) {
        OverviewMetricTone.Brand -> MaterialTheme.colorScheme.primary
        OverviewMetricTone.Income -> MaterialTheme.colorScheme.tertiary
        OverviewMetricTone.Expense -> MaterialTheme.colorScheme.error
        OverviewMetricTone.Investment -> if (dark) Color(0xFFB39AF2) else Color(0xFF6849B8)
    }
}

private fun FinanceState.overviewSnapshotOrNull(): FinanceSnapshot? = when (this) {
    is FinanceState.Ready -> snapshot
    is FinanceState.Loading -> previous
    is FinanceState.Failure -> previous
    FinanceState.Idle -> null
}

private fun GoalsPayablesState.overviewSnapshotOrNull(): GoalsPayablesSnapshot? = when (this) {
    is GoalsPayablesState.Ready -> snapshot
    is GoalsPayablesState.Loading -> previous
    is GoalsPayablesState.Failure -> previous
    GoalsPayablesState.Idle -> null
}

private fun InvestmentsAnalyticsState.overviewSnapshotOrNull(): InvestmentsAnalyticsSnapshot? = when (this) {
    is InvestmentsAnalyticsState.Ready -> snapshot
    is InvestmentsAnalyticsState.Loading -> previous
    is InvestmentsAnalyticsState.Failure -> previous
    InvestmentsAnalyticsState.Idle -> null
}

private fun FinanceSnapshot.overviewMonthSummary(todayKey: String): OverviewMonthSummary {
    val monthPrefix = todayKey.take(7)
    var income = 0.0
    var expenses = 0.0
    ledger.asSequence()
        .filterNot(LedgerEntry::isDeleted)
        .filter { it.date.startsWith(monthPrefix) }
        .forEach { entry ->
            when (entry.type.lowercase()) {
                "income" -> if (entry.amount.isFinite() && entry.amount > 0) income += entry.amount
                "expense" -> if (entry.amount.isFinite() && entry.amount > 0) expenses += entry.amount
                "refund" -> if (entry.amount.isFinite() && entry.amount > 0) expenses -= entry.amount
            }
        }
    return OverviewMonthSummary(
        income = income,
        expenses = expenses,
        netSavings = income - expenses,
    )
}

private fun formatPkrOrUnavailable(value: Double?): String {
    if (value == null || !value.isFinite()) return "Unavailable"
    return runCatching {
        NumberFormat.getCurrencyInstance(Locale("en", "PK")).apply {
            currency = Currency.getInstance("PKR")
            maximumFractionDigits = if (value % 1.0 == 0.0) 0 else 2
        }.format(value)
    }.getOrElse { "PKR ${"%,.2f".format(Locale.US, value)}" }
}
