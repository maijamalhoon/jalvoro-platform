package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import java.util.Calendar
import java.util.Currency
import java.util.Date
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max
import kotlinx.coroutines.launch

private val OverviewIncome = Color(0xFF147A55)
private val OverviewExpense = Color(0xFFB84F4A)
private val OverviewTransfer = Color(0xFF2366B1)
private val OverviewInvestment = Color(0xFF6849B8)
private val OverviewGoals = Color(0xFF0B777B)

private data class OverviewPeriodContext(
    val todayKey: String,
    val currentPrefix: String,
    val previousPrefix: String,
    val currentDay: Int,
    val previousComparableDay: Int,
    val remainingDays: Int,
)

private data class OverviewMonthSummary(
    val income: Double,
    val expenses: Double,
    val netSavings: Double,
)

private data class OverviewMetric(
    val title: String,
    val amount: Double?,
    val previousAmount: Double?,
    val tone: Color,
)

private data class OverviewPulse(
    val title: String,
    val value: String,
    val helper: String,
    val tone: Color,
)

private data class OverviewQuickAction(
    val label: String,
    val description: String,
    val icon: ImageVector,
    val tone: Color,
    val onClick: () -> Unit,
)

private data class OverviewBreakdown(
    val name: String,
    val amount: Double,
)

private data class OverviewCashFlowPoint(
    val key: String,
    val income: Double,
    val expenses: Double,
)

private enum class OverviewTrendDirection {
    Up,
    Down,
    Flat,
    None,
}

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
    val now = remember { Date() }
    val period = remember(now) { overviewPeriodContext(now) }

    LaunchedEffect(
        financeRepository,
        goalsPayablesRepository,
        investmentsAnalyticsRepository,
        refreshRequest,
    ) {
        val force = refreshRequest > 0
        financeRepository.refresh(force = force)
        goalsPayablesRepository.refresh(force = force)
        investmentsAnalyticsRepository.refresh(nowDate = period.todayKey, force = force)
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

    val currentMonth = financeSnapshot?.overviewSummary(
        prefix = period.currentPrefix,
        endDay = period.currentDay,
    )
    val previousMonth = financeSnapshot?.overviewSummary(
        prefix = period.previousPrefix,
        endDay = period.previousComparableDay,
    )
    val today = financeSnapshot?.overviewSummaryForDate(period.todayKey)
    val accountBalance = financeSnapshot?.totalActiveBalance
    val portfolioValue = investmentsSnapshot?.totalValue
    val totalBalance = when {
        accountBalance == null && portfolioValue == null -> null
        else -> (accountBalance ?: 0.0) + (portfolioValue ?: 0.0)
    }
    val investmentContribution = investmentsSnapshot?.overviewInvestmentContribution(
        prefix = period.currentPrefix,
        endDay = period.currentDay,
    )
    val previousInvestmentContribution = investmentsSnapshot?.overviewInvestmentContribution(
        prefix = period.previousPrefix,
        endDay = period.previousComparableDay,
    )
    val recentEntries = financeSnapshot
        ?.ledger
        ?.asSequence()
        ?.filterNot(LedgerEntry::isDeleted)
        ?.take(5)
        ?.toList()
        .orEmpty()
    val spendingBreakdown = financeSnapshot?.overviewSpendingBreakdown(period).orEmpty()
    val cashFlow = financeSnapshot?.overviewCashFlow(now).orEmpty()
    val dailySpend = currentMonth?.expenses?.div(max(period.currentDay, 1))

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    fun closeThen(action: () -> Unit) {
        scope.launch {
            drawerState.close()
            action()
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            OverviewNavigationDrawer(
                email = email,
                onOverview = { scope.launch { drawerState.close() } },
                onMoney = { closeThen(onOpenFinance) },
                onPlanning = { closeThen(onOpenPlanning) },
                onInvestments = { closeThen(onOpenInvestments) },
                onReports = { closeThen(onOpenReports) },
                onSettings = { closeThen(onOpenSettings) },
                onMore = { closeThen(onOpenMore) },
            )
        },
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val twoColumns = maxWidth >= 360.dp
            val wide = maxWidth >= 720.dp
            val horizontalPadding = if (wide) 24.dp else 16.dp
            val metrics = listOf(
                OverviewMetric(
                    title = "Savings",
                    amount = currentMonth?.netSavings,
                    previousAmount = previousMonth?.netSavings,
                    tone = if ((currentMonth?.netSavings ?: 0.0) < 0) {
                        OverviewExpense
                    } else {
                        OverviewIncome
                    },
                ),
                OverviewMetric(
                    title = "Income",
                    amount = currentMonth?.income,
                    previousAmount = previousMonth?.income,
                    tone = OverviewIncome,
                ),
                OverviewMetric(
                    title = "Expense",
                    amount = currentMonth?.expenses,
                    previousAmount = previousMonth?.expenses,
                    tone = OverviewExpense,
                ),
                OverviewMetric(
                    title = "Investment",
                    amount = investmentContribution,
                    previousAmount = previousInvestmentContribution,
                    tone = OverviewInvestment,
                ),
            )
            val metricRows = if (twoColumns) metrics.chunked(2) else metrics.map(::listOf)
            val pulses = listOf(
                OverviewPulse(
                    title = "Today income",
                    value = formatPkrOrUnavailable(today?.income),
                    helper = "Recorded today",
                    tone = OverviewIncome,
                ),
                OverviewPulse(
                    title = "Today expense",
                    value = formatPkrOrUnavailable(today?.expenses),
                    helper = "Refund adjusted",
                    tone = OverviewExpense,
                ),
                OverviewPulse(
                    title = "Today net",
                    value = formatPkrOrUnavailable(today?.netSavings),
                    helper = "Income minus expense",
                    tone = when {
                        today == null -> OverviewTransfer
                        today.netSavings > 0 -> OverviewIncome
                        today.netSavings < 0 -> OverviewExpense
                        else -> OverviewTransfer
                    },
                ),
                OverviewPulse(
                    title = "Month left",
                    value = period.remainingDays.toString(),
                    helper = if (period.remainingDays == 1) "Day remaining" else "Days remaining",
                    tone = OverviewTransfer,
                ),
            )
            val pulseRows = if (wide) listOf(pulses) else pulses.chunked(2)

            LazyColumn(
                modifier = Modifier.fillMaxSize().widthIn(max = 1_180.dp).align(Alignment.TopCenter),
                contentPadding = PaddingValues(
                    start = horizontalPadding,
                    end = horizontalPadding,
                    top = 92.dp,
                    bottom = 36.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                if (failures.isNotEmpty()) {
                    item {
                        JalvoroEntrance(index = 0, key = failures.joinToString("|")) {
                            OverviewDataNotice(messages = failures)
                        }
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
                            modifier = Modifier.fillMaxWidth().padding(vertical = 96.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            CircularProgressIndicator(strokeWidth = 2.5.dp)
                        }
                    }
                } else {
                    item {
                        JalvoroEntrance(index = 1, key = "overview-balance:$totalBalance") {
                            JalvoroOverviewHeroCard(
                                totalBalance = totalBalance,
                                accountBalance = accountBalance,
                                portfolioValue = portfolioValue,
                                compact = !wide,
                                onIncome = onOpenFinance,
                                onExpense = onOpenFinance,
                                onTransfer = onOpenFinance,
                                onInvest = onOpenInvestments,
                            )
                        }
                    }

                    itemsIndexed(
                        items = metricRows,
                        key = { _, row -> row.joinToString("|") { it.title } },
                    ) { rowIndex, row ->
                        JalvoroEntrance(
                            index = 2 + rowIndex,
                            key = row.joinToString("|") { "${it.title}:${it.amount}:${it.previousAmount}" },
                        ) {
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
                    }

                    item {
                        JalvoroEntrance(index = 4, key = "overview-pulse-heading") {
                            OverviewSectionHeading(
                                title = "Today’s financial pulse",
                                description = "Live values from today’s owner-scoped activity.",
                            )
                        }
                    }

                    itemsIndexed(
                        items = pulseRows,
                        key = { _, row -> row.joinToString("|") { it.title } },
                    ) { rowIndex, row ->
                        JalvoroEntrance(index = 5 + rowIndex, key = row.joinToString("|") { it.value }) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                row.forEach { pulse ->
                                    OverviewPulseCard(
                                        pulse = pulse,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                                if (wide && row.size < 4) {
                                    repeat(4 - row.size) { Spacer(Modifier.weight(1f)) }
                                }
                            }
                        }
                    }

                    item {
                        JalvoroEntrance(index = 8, key = "overview-spend-invest") {
                            if (wide) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    OverviewSpendRecordCard(
                                        monthlySpend = currentMonth?.expenses,
                                        dailySpend = dailySpend,
                                        cashFlow = cashFlow,
                                        modifier = Modifier.weight(1f),
                                    )
                                    OverviewInvestmentCard(
                                        snapshot = investmentsSnapshot,
                                        onOpenInvestments = onOpenInvestments,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                            } else {
                                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    OverviewSpendRecordCard(
                                        monthlySpend = currentMonth?.expenses,
                                        dailySpend = dailySpend,
                                        cashFlow = cashFlow,
                                    )
                                    OverviewInvestmentCard(
                                        snapshot = investmentsSnapshot,
                                        onOpenInvestments = onOpenInvestments,
                                    )
                                }
                            }
                        }
                    }

                    item {
                        JalvoroEntrance(index = 9, key = "overview-cash-flow:${cashFlow.joinToString { it.key }}") {
                            OverviewCashFlowCard(cashFlow = cashFlow)
                        }
                    }

                    item {
                        JalvoroEntrance(index = 10, key = "overview-lower-cards") {
                            if (wide) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.Top,
                                ) {
                                    OverviewSpendingBreakdownCard(
                                        breakdown = spendingBreakdown,
                                        total = currentMonth?.expenses,
                                        modifier = Modifier.weight(1f),
                                    )
                                    OverviewGoalsCard(
                                        snapshot = goalsSnapshot,
                                        onOpenPlanning = onOpenPlanning,
                                        modifier = Modifier.weight(1f),
                                    )
                                    OverviewRecentActivity(
                                        entries = recentEntries,
                                        dataAvailable = financeSnapshot != null,
                                        onOpenFinance = onOpenFinance,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                            } else {
                                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    OverviewSpendingBreakdownCard(
                                        breakdown = spendingBreakdown,
                                        total = currentMonth?.expenses,
                                    )
                                    OverviewGoalsCard(
                                        snapshot = goalsSnapshot,
                                        onOpenPlanning = onOpenPlanning,
                                    )
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

            JalvoroOverviewTopBar(
                refreshing = refreshing,
                onMenu = { scope.launch { drawerState.open() } },
                onRefresh = { refreshRequest += 1 },
                onSettings = onOpenSettings,
                modifier = Modifier.fillMaxWidth().align(Alignment.TopCenter),
            )
        }
    }
}

@Composable
private fun OverviewNavigationDrawer(
    email: String,
    onOverview: () -> Unit,
    onMoney: () -> Unit,
    onPlanning: () -> Unit,
    onInvestments: () -> Unit,
    onReports: () -> Unit,
    onSettings: () -> Unit,
    onMore: () -> Unit,
) {
    ModalDrawerSheet(
        modifier = Modifier.fillMaxHeight().widthIn(max = 320.dp),
        drawerShape = RoundedCornerShape(topEnd = 26.dp, bottomEnd = 26.dp),
        drawerContainerColor = MaterialTheme.colorScheme.surfaceContainer,
        drawerTonalElevation = 0.dp,
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 18.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                JalvoroBrandLockup(
                    modifier = Modifier.weight(1f),
                    subtitle = "Personal workspace",
                    compact = true,
                )
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f))
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                item { DrawerGroupLabel("Workspace") }
                item {
                    OverviewDrawerItem(
                        label = "Overview",
                        icon = JalvoroIcons.Dashboard,
                        selected = true,
                        onClick = onOverview,
                    )
                }
                item {
                    OverviewDrawerItem(
                        label = "Money",
                        icon = JalvoroIcons.Wallet,
                        selected = false,
                        onClick = onMoney,
                    )
                }
                item {
                    OverviewDrawerItem(
                        label = "Planning",
                        icon = JalvoroIcons.Target,
                        selected = false,
                        onClick = onPlanning,
                    )
                }
                item {
                    OverviewDrawerItem(
                        label = "Investments",
                        icon = JalvoroIcons.Investments,
                        selected = false,
                        onClick = onInvestments,
                    )
                }
                item {
                    OverviewDrawerItem(
                        label = "Reports & insights",
                        icon = JalvoroIcons.Reports,
                        selected = false,
                        onClick = onReports,
                    )
                }
                item {
                    Spacer(Modifier.height(8.dp))
                    DrawerGroupLabel("Account")
                }
                item {
                    OverviewDrawerItem(
                        label = "Settings",
                        icon = JalvoroIcons.Settings,
                        selected = false,
                        onClick = onSettings,
                    )
                }
                item {
                    OverviewDrawerItem(
                        label = "More",
                        icon = JalvoroIcons.More,
                        selected = false,
                        onClick = onMore,
                    )
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f))
            Text(
                text = email,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 16.dp),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun DrawerGroupLabel(label: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = label.uppercase(Locale.US),
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 9.sp,
                letterSpacing = 1.4.sp,
            ),
            fontWeight = FontWeight.Black,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        HorizontalDivider(
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f),
        )
    }
}

@Composable
private fun OverviewDrawerItem(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit,
) {
    NavigationDrawerItem(
        label = { Text(label, fontWeight = FontWeight.Bold) },
        icon = {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = if (selected) Color.White.copy(alpha = 0.14f) else MaterialTheme.colorScheme.surface,
                contentColor = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.padding(8.dp).size(17.dp),
                )
            }
        },
        selected = selected,
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = NavigationDrawerItemDefaults.colors(
            selectedContainerColor = MaterialTheme.colorScheme.primary,
            selectedIconColor = Color.White,
            selectedTextColor = Color.White,
            unselectedContainerColor = Color.Transparent,
            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
        ),
    )
}

@Composable
private fun OverviewFloatingControls(
    refreshing: Boolean,
    onMenu: () -> Unit,
    onRefresh: () -> Unit,
    onSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.statusBarsPadding().padding(horizontal = 14.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        OverviewFloatingMenuButton(onClick = onMenu)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OverviewFloatingIconButton(
                icon = JalvoroIcons.Refresh,
                label = if (refreshing) "Refreshing data" else "Refresh data",
                enabled = !refreshing,
                onClick = onRefresh,
            )
            OverviewFloatingIconButton(
                icon = JalvoroIcons.User,
                label = "Open profile and settings",
                onClick = onSettings,
            )
        }
    }
}

@Composable
private fun OverviewFloatingMenuButton(onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = Modifier.size(48.dp).semantics {
            contentDescription = "Open navigation menu"
        },
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.96f),
        contentColor = MaterialTheme.colorScheme.onSurface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        shadowElevation = 2.dp,
    ) {
        val lineColor = MaterialTheme.colorScheme.onSurface
        Canvas(modifier = Modifier.fillMaxSize().padding(12.dp)) {
            val stroke = 2.2.dp.toPx()
            drawLine(
                color = lineColor,
                start = Offset(0f, size.height * 0.34f),
                end = Offset(size.width, size.height * 0.34f),
                strokeWidth = stroke,
                cap = StrokeCap.Round,
            )
            drawLine(
                color = lineColor,
                start = Offset(0f, size.height * 0.68f),
                end = Offset(size.width * 0.62f, size.height * 0.68f),
                strokeWidth = stroke,
                cap = StrokeCap.Round,
            )
        }
    }
}

@Composable
private fun OverviewFloatingIconButton(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.size(48.dp).semantics { contentDescription = label },
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.96f),
        contentColor = MaterialTheme.colorScheme.onSurface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        shadowElevation = 2.dp,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun OverviewBalanceHero(
    totalBalance: Double?,
    accountBalance: Double?,
    portfolioValue: Double?,
    compact: Boolean,
    actions: List<OverviewQuickAction>,
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalAlignment = if (compact) Alignment.CenterHorizontally else Alignment.Start,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = when {
                    totalBalance == null -> "BALANCE UNAVAILABLE"
                    accountBalance == null || portfolioValue == null -> "PARTIAL NET BALANCE"
                    else -> "TOTAL NET BALANCE"
                },
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 10.sp,
                    letterSpacing = 1.5.sp,
                ),
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (totalBalance != null && (accountBalance == null || portfolioValue == null)) {
                Surface(
                    shape = CircleShape,
                    color = Color(0xFFFBF1DA),
                    contentColor = Color(0xFF6F4707),
                ) {
                    Text(
                        text = "PARTIAL",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                        fontWeight = FontWeight.Black,
                    )
                }
            }
        }
        JalvoroAnimatedSwap(
            targetState = formatPkrOrUnavailable(totalBalance),
            label = "overview-total-balance",
        ) { value ->
            Text(
                text = value,
                modifier = Modifier.fillMaxWidth(),
                style = MaterialTheme.typography.displaySmall.copy(
                    fontSize = when {
                        value.length > 22 -> 31.sp
                        value.length > 16 -> 38.sp
                        compact -> 48.sp
                        else -> 58.sp
                    },
                    lineHeight = 54.sp,
                    letterSpacing = (-1.8).sp,
                ),
                fontWeight = FontWeight.Black,
                textAlign = if (compact) TextAlign.Center else TextAlign.Start,
                maxLines = 1,
                overflow = TextOverflow.Clip,
            )
        }
        Text(
            text = when {
                totalBalance == null -> "Account and investment values could not be loaded."
                accountBalance == null -> "Portfolio value is available; account balances are unavailable."
                portfolioValue == null -> "Account balances are available; portfolio value is unavailable."
                else -> "Accounts ${formatPkrOrUnavailable(accountBalance)} • Investments ${formatPkrOrUnavailable(portfolioValue)}"
            },
            modifier = Modifier.fillMaxWidth(),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = if (compact) TextAlign.Center else TextAlign.Start,
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = if (compact) Arrangement.SpaceEvenly else Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.Top,
        ) {
            actions.forEach { action ->
                OverviewQuickActionButton(action = action)
            }
        }
    }
}

@Composable
private fun OverviewQuickActionButton(action: OverviewQuickAction) {
    Column(
        modifier = Modifier.width(68.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Surface(
            onClick = action.onClick,
            modifier = Modifier.size(48.dp).semantics {
                contentDescription = action.description
            },
            shape = CircleShape,
            color = action.tone,
            contentColor = Color.White,
            shadowElevation = 4.dp,
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = action.icon,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
        Text(
            text = action.label,
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
        )
    }
}

@Composable
private fun OverviewMetricCard(
    metric: OverviewMetric,
    modifier: Modifier = Modifier,
) {
    val direction = overviewTrendDirection(metric.amount, metric.previousAmount)
    Card(
        modifier = modifier.height(128.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.78f)),
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(14.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = metric.title.uppercase(Locale.US),
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 10.sp,
                    letterSpacing = 1.25.sp,
                ),
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
            JalvoroAnimatedSwap(
                targetState = formatPkrOrUnavailable(metric.amount),
                label = "overview-${metric.title}-amount",
            ) { value ->
                Text(
                    text = value,
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontSize = when {
                            value.length > 17 -> 15.sp
                            value.length > 11 -> 18.sp
                            else -> 22.sp
                        },
                        letterSpacing = (-0.65).sp,
                    ),
                    fontWeight = FontWeight.ExtraBold,
                    maxLines = 1,
                    overflow = TextOverflow.Clip,
                )
            }
            OverviewTrendLine(
                direction = direction,
                strength = overviewTrendStrength(metric.amount, metric.previousAmount),
                tone = metric.tone,
                modifier = Modifier.fillMaxWidth().height(24.dp),
            )
        }
    }
}

@Composable
private fun OverviewTrendLine(
    direction: OverviewTrendDirection,
    strength: Float,
    tone: Color,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier) {
        val template = when (direction) {
            OverviewTrendDirection.Up -> listOf(0.74f, 0.71f, 0.63f, 0.52f, 0.57f, 0.38f, 0.34f, 0.18f)
            OverviewTrendDirection.Down -> listOf(0.18f, 0.27f, 0.31f, 0.44f, 0.51f, 0.66f, 0.70f, 0.82f)
            OverviewTrendDirection.Flat -> listOf(0.50f, 0.48f, 0.52f, 0.50f, 0.49f, 0.52f, 0.50f, 0.50f)
            OverviewTrendDirection.None -> List(8) { 0.50f }
        }
        val path = Path()
        template.forEachIndexed { index, raw ->
            val x = size.width * index / (template.size - 1).coerceAtLeast(1)
            val yValue = 0.5f + (raw - 0.5f) * strength
            val y = size.height * yValue.coerceIn(0.08f, 0.92f)
            if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        drawPath(
            path = path,
            color = tone,
            style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round),
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
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun OverviewPulseCard(
    pulse: OverviewPulse,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.height(118.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.72f)),
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
        ) {
            Box(modifier = Modifier.fillMaxWidth().height(3.dp).background(pulse.tone))
            Column(
                modifier = Modifier.fillMaxSize().padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                Text(
                    text = pulse.title,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                )
                Text(
                    text = pulse.value,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.ExtraBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = pulse.helper,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
private fun OverviewSpendRecordCard(
    monthlySpend: Double?,
    dailySpend: Double?,
    cashFlow: List<OverviewCashFlowPoint>,
    modifier: Modifier = Modifier,
) {
    OverviewDashboardCard(modifier = modifier) {
        OverviewCardHeading(
            title = "Spend record",
            subtitle = "Month-to-date expense pace",
            icon = JalvoroIcons.Expenses,
            tone = OverviewExpense,
        )
        Spacer(Modifier.height(14.dp))
        Text(
            text = formatPkrOrUnavailable(monthlySpend),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.ExtraBold,
        )
        Text(
            text = "Average ${formatPkrOrUnavailable(dailySpend)} per day",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))
        OverviewSparkBars(
            values = cashFlow.map(OverviewCashFlowPoint::expenses),
            tone = OverviewExpense,
            modifier = Modifier.fillMaxWidth().height(54.dp),
        )
    }
}

@Composable
private fun OverviewInvestmentCard(
    snapshot: InvestmentsAnalyticsSnapshot?,
    onOpenInvestments: () -> Unit,
    modifier: Modifier = Modifier,
) {
    OverviewDashboardCard(modifier = modifier) {
        OverviewCardHeading(
            title = "Investment overview",
            subtitle = "Portfolio value and performance",
            icon = JalvoroIcons.Investments,
            tone = OverviewInvestment,
            action = "View all",
            onAction = onOpenInvestments,
        )
        Spacer(Modifier.height(14.dp))
        if (snapshot == null) {
            Text(
                text = "Investment data is unavailable.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            Text(
                text = formatPkrOrUnavailable(snapshot.totalValue),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                text = "${snapshot.holdings.size} holding${if (snapshot.holdings.size == 1) "" else "s"}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(10.dp))
            val pnlTone = when {
                snapshot.totalPnl > 0 -> OverviewIncome
                snapshot.totalPnl < 0 -> OverviewExpense
                else -> OverviewTransfer
            }
            Surface(
                shape = CircleShape,
                color = pnlTone.copy(alpha = 0.12f),
                contentColor = pnlTone,
            ) {
                Text(
                    text = "${signedPkr(snapshot.totalPnl)} • ${formatPercent(snapshot.totalPnlPct)}",
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

@Composable
private fun OverviewCashFlowCard(cashFlow: List<OverviewCashFlowPoint>) {
    OverviewDashboardCard {
        OverviewCardHeading(
            title = "Income and expense",
            subtitle = "Last seven days",
            icon = JalvoroIcons.Reports,
            tone = OverviewTransfer,
        )
        Spacer(Modifier.height(14.dp))
        if (cashFlow.isEmpty()) {
            Text(
                text = "Cash-flow data is unavailable.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            OverviewCashFlowChart(
                points = cashFlow,
                modifier = Modifier.fillMaxWidth().height(150.dp),
            )
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OverviewLegendDot(OverviewIncome)
                Text("Income", style = MaterialTheme.typography.labelSmall)
                Spacer(Modifier.width(18.dp))
                OverviewLegendDot(OverviewExpense)
                Text("Expense", style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
private fun OverviewCashFlowChart(
    points: List<OverviewCashFlowPoint>,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier) {
        val maxValue = points.maxOfOrNull { max(it.income, it.expenses) }?.takeIf { it > 0 } ?: 1.0
        val slot = size.width / points.size.coerceAtLeast(1)
        val barWidth = slot * 0.25f
        points.forEachIndexed { index, point ->
            val center = slot * (index + 0.5f)
            val incomeHeight = (point.income / maxValue * size.height * 0.85f).toFloat()
            val expenseHeight = (point.expenses / maxValue * size.height * 0.85f).toFloat()
            drawRoundRect(
                color = OverviewIncome,
                topLeft = Offset(center - barWidth - 2.dp.toPx(), size.height - incomeHeight),
                size = androidx.compose.ui.geometry.Size(barWidth, incomeHeight),
                cornerRadius = CornerRadius(6.dp.toPx()),
            )
            drawRoundRect(
                color = OverviewExpense,
                topLeft = Offset(center + 2.dp.toPx(), size.height - expenseHeight),
                size = androidx.compose.ui.geometry.Size(barWidth, expenseHeight),
                cornerRadius = CornerRadius(6.dp.toPx()),
            )
        }
    }
}

@Composable
private fun OverviewSparkBars(
    values: List<Double>,
    tone: Color,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier) {
        if (values.isEmpty()) return@Canvas
        val maxValue = values.maxOrNull()?.takeIf { it > 0 } ?: 1.0
        val slot = size.width / values.size
        val barWidth = slot * 0.58f
        values.forEachIndexed { index, value ->
            val height = (value / maxValue * size.height).toFloat().coerceAtLeast(3.dp.toPx())
            drawRoundRect(
                color = tone.copy(alpha = 0.82f),
                topLeft = Offset(slot * index + (slot - barWidth) / 2f, size.height - height),
                size = androidx.compose.ui.geometry.Size(barWidth, height),
                cornerRadius = CornerRadius(5.dp.toPx()),
            )
        }
    }
}

@Composable
private fun OverviewLegendDot(color: Color) {
    Canvas(modifier = Modifier.padding(end = 5.dp).size(7.dp)) {
        drawCircle(color)
    }
}

@Composable
private fun OverviewSpendingBreakdownCard(
    breakdown: List<OverviewBreakdown>,
    total: Double?,
    modifier: Modifier = Modifier,
) {
    OverviewDashboardCard(modifier = modifier) {
        OverviewCardHeading(
            title = "Spending breakdown",
            subtitle = "Current month categories",
            icon = JalvoroIcons.Expenses,
            tone = OverviewExpense,
        )
        Spacer(Modifier.height(12.dp))
        when {
            total == null -> Text(
                text = "Spending data is unavailable.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            breakdown.isEmpty() -> Text(
                text = "No month-to-date expenses recorded.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            else -> breakdown.take(4).forEachIndexed { index, item ->
                val ratio = if (total > 0) (item.amount / total).coerceIn(0.0, 1.0) else 0.0
                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = item.name,
                            modifier = Modifier.weight(1f),
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = formatPkrOrUnavailable(item.amount),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    LinearProgressIndicator(
                        progress = { ratio.toFloat() },
                        modifier = Modifier.fillMaxWidth().height(5.dp),
                        color = OverviewExpense,
                        trackColor = OverviewExpense.copy(alpha = 0.12f),
                    )
                }
                if (index != breakdown.take(4).lastIndex) Spacer(Modifier.height(10.dp))
            }
        }
    }
}

@Composable
private fun OverviewGoalsCard(
    snapshot: GoalsPayablesSnapshot?,
    onOpenPlanning: () -> Unit,
    modifier: Modifier = Modifier,
) {
    OverviewDashboardCard(modifier = modifier) {
        OverviewCardHeading(
            title = "Goals progress",
            subtitle = "Savings targets",
            icon = JalvoroIcons.Target,
            tone = OverviewGoals,
            action = "View all",
            onAction = onOpenPlanning,
        )
        Spacer(Modifier.height(12.dp))
        when {
            snapshot == null -> Text(
                text = "Goals data is unavailable.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            snapshot.goals.isEmpty() -> Text(
                text = "No goals yet. Create a savings target from Planning.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            else -> {
                val overall = if (snapshot.totalGoalTarget > 0) {
                    (snapshot.totalGoalSaved / snapshot.totalGoalTarget).coerceIn(0.0, 1.0)
                } else {
                    0.0
                }
                Text(
                    text = "${formatPkrOrUnavailable(snapshot.totalGoalSaved)} of ${formatPkrOrUnavailable(snapshot.totalGoalTarget)}",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(6.dp))
                val animated = rememberJalvoroAnimatedProgress(
                    target = overall.toFloat(),
                    label = "overview-goals-progress",
                )
                LinearProgressIndicator(
                    progress = { animated },
                    modifier = Modifier.fillMaxWidth().height(7.dp),
                    color = OverviewGoals,
                    trackColor = OverviewGoals.copy(alpha = 0.12f),
                )
                Spacer(Modifier.height(10.dp))
                snapshot.goals.take(3).forEachIndexed { index, goal ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = goal.row.name,
                            modifier = Modifier.weight(1f),
                            style = MaterialTheme.typography.bodySmall,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = "${(goal.progress * 100).toInt()}%",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = OverviewGoals,
                        )
                    }
                    if (index != snapshot.goals.take(3).lastIndex) Spacer(Modifier.height(8.dp))
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
    modifier: Modifier = Modifier,
) {
    OverviewDashboardCard(modifier = modifier) {
        OverviewCardHeading(
            title = "Recent activity",
            subtitle = "Latest owner-scoped finance records",
            icon = JalvoroIcons.Transactions,
            tone = OverviewTransfer,
            action = "View all",
            onAction = onOpenFinance,
        )
        Spacer(Modifier.height(10.dp))
        when {
            !dataAvailable -> Text(
                text = "Recent activity is unavailable.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            entries.isEmpty() -> Text(
                text = "No financial activity has been recorded yet.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            else -> entries.forEachIndexed { index, entry ->
                RecentActivityRow(entry = entry)
                if (index != entries.lastIndex) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f))
                }
            }
        }
    }
}

@Composable
private fun OverviewDashboardCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.76f)),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            content = content,
        )
    }
}

@Composable
private fun OverviewCardHeading(
    title: String,
    subtitle: String,
    icon: ImageVector,
    tone: Color,
    action: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
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
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        if (action != null && onAction != null) {
            TextButton(onClick = onAction) {
                Text(action, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun OverviewDataNotice(messages: List<String>) {
    Card(
        modifier = Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite },
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
private fun RecentActivityRow(entry: LedgerEntry) {
    val expense = entry.type == "expense"
    val refund = entry.type == "refund"
    val tone = when {
        expense -> OverviewExpense
        refund || entry.type == "income" -> OverviewIncome
        else -> OverviewTransfer
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
        modifier = Modifier.fillMaxWidth().padding(vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Surface(
            shape = RoundedCornerShape(11.dp),
            color = tone.copy(alpha = 0.12f),
            contentColor = tone,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.padding(8.dp).size(18.dp),
            )
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = listOfNotNull(
                    entry.date.takeIf(String::isNotBlank),
                    entry.accounts?.name?.takeIf(String::isNotBlank),
                ).joinToString(" • "),
                style = MaterialTheme.typography.labelSmall,
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
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = tone,
            maxLines = 1,
        )
    }
}

private fun overviewPeriodContext(now: Date): OverviewPeriodContext {
    val keyFormatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val prefixFormatter = SimpleDateFormat("yyyy-MM", Locale.US)
    val current = Calendar.getInstance().apply { time = now }
    val previous = (current.clone() as Calendar).apply { add(Calendar.MONTH, -1) }
    val currentDay = current.get(Calendar.DAY_OF_MONTH)
    val previousComparableDay = currentDay.coerceAtMost(previous.getActualMaximum(Calendar.DAY_OF_MONTH))
    return OverviewPeriodContext(
        todayKey = keyFormatter.format(current.time),
        currentPrefix = prefixFormatter.format(current.time),
        previousPrefix = prefixFormatter.format(previous.time),
        currentDay = currentDay,
        previousComparableDay = previousComparableDay,
        remainingDays = (current.getActualMaximum(Calendar.DAY_OF_MONTH) - currentDay).coerceAtLeast(0),
    )
}

private fun FinanceSnapshot.overviewSummary(
    prefix: String,
    endDay: Int,
): OverviewMonthSummary {
    var income = 0.0
    var expenses = 0.0
    ledger.asSequence()
        .filterNot(LedgerEntry::isDeleted)
        .filter { entry ->
            entry.date.startsWith(prefix) &&
                entry.date.takeLast(2).toIntOrNull()?.let { it <= endDay } == true
        }
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

private fun FinanceSnapshot.overviewSummaryForDate(dateKey: String): OverviewMonthSummary {
    var income = 0.0
    var expenses = 0.0
    ledger.asSequence()
        .filterNot(LedgerEntry::isDeleted)
        .filter { it.date == dateKey }
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

private fun FinanceSnapshot.overviewSpendingBreakdown(
    period: OverviewPeriodContext,
): List<OverviewBreakdown> {
    val totals = linkedMapOf<String, Double>()
    ledger.asSequence()
        .filterNot(LedgerEntry::isDeleted)
        .filter { entry ->
            entry.date.startsWith(period.currentPrefix) &&
                entry.date.takeLast(2).toIntOrNull()?.let { it <= period.currentDay } == true
        }
        .forEach { entry ->
            val category = entry.categories?.name?.trim().orEmpty().ifBlank { "Other" }
            when (entry.type.lowercase()) {
                "expense" -> if (entry.amount.isFinite() && entry.amount > 0) {
                    totals[category] = (totals[category] ?: 0.0) + entry.amount
                }
                "refund" -> if (entry.amount.isFinite() && entry.amount > 0) {
                    totals[category] = (totals[category] ?: 0.0) - entry.amount
                }
            }
        }
    return totals.entries
        .mapNotNull { (name, amount) -> amount.takeIf { it > 0 }?.let { OverviewBreakdown(name, it) } }
        .sortedByDescending(OverviewBreakdown::amount)
}

private fun FinanceSnapshot.overviewCashFlow(now: Date): List<OverviewCashFlowPoint> {
    val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val calendar = Calendar.getInstance().apply { time = now }
    val keys = (6 downTo 0).map { offset ->
        val day = (calendar.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, -offset) }
        formatter.format(day.time)
    }
    val byDate = ledger.asSequence()
        .filterNot(LedgerEntry::isDeleted)
        .filter { it.date in keys }
        .groupBy(LedgerEntry::date)
    return keys.map { key ->
        var income = 0.0
        var expenses = 0.0
        byDate[key].orEmpty().forEach { entry ->
            when (entry.type.lowercase()) {
                "income" -> if (entry.amount.isFinite() && entry.amount > 0) income += entry.amount
                "expense" -> if (entry.amount.isFinite() && entry.amount > 0) expenses += entry.amount
                "refund" -> if (entry.amount.isFinite() && entry.amount > 0) expenses -= entry.amount
            }
        }
        OverviewCashFlowPoint(key = key, income = income, expenses = expenses.coerceAtLeast(0.0))
    }
}

private fun InvestmentsAnalyticsSnapshot.overviewInvestmentContribution(
    prefix: String,
    endDay: Int,
): Double = investments.asSequence()
    .filter { row ->
        val date = (row.purchasedAt ?: row.createdAt).orEmpty().take(10)
        date.startsWith(prefix) && date.takeLast(2).toIntOrNull()?.let { it <= endDay } == true
    }
    .mapNotNull { it.position?.totalInvested }
    .filter { it.isFinite() && it >= 0 }
    .sum()

private fun overviewTrendDirection(current: Double?, previous: Double?): OverviewTrendDirection {
    if (current == null || previous == null || !current.isFinite() || !previous.isFinite()) {
        return OverviewTrendDirection.None
    }
    val delta = current - previous
    val tolerance = max(abs(current), abs(previous)).coerceAtLeast(1.0) * 0.005
    return when {
        abs(delta) <= tolerance -> OverviewTrendDirection.Flat
        delta > 0 -> OverviewTrendDirection.Up
        else -> OverviewTrendDirection.Down
    }
}

private fun overviewTrendStrength(current: Double?, previous: Double?): Float {
    if (current == null || previous == null || !current.isFinite() || !previous.isFinite()) return 0.55f
    val denominator = abs(previous).coerceAtLeast(1.0)
    val percent = (abs(current - previous) / denominator).coerceAtMost(2.0)
    return (0.55 + percent * 0.35).toFloat().coerceIn(0.55f, 1.25f)
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

private fun formatPkrOrUnavailable(value: Double?): String {
    if (value == null || !value.isFinite()) return "Unavailable"
    val fractionDigits = if (value % 1.0 == 0.0) 0 else 2
    val formatted = NumberFormat.getNumberInstance(Locale.US).apply {
        minimumFractionDigits = fractionDigits
        maximumFractionDigits = fractionDigits
        isGroupingUsed = true
    }.format(value)
    return "Rs $formatted"
}

private fun signedPkr(value: Double): String = when {
    value > 0 -> "+${formatPkrOrUnavailable(value)}"
    value < 0 -> "−${formatPkrOrUnavailable(abs(value))}"
    else -> formatPkrOrUnavailable(value)
}

private fun formatPercent(value: Double): String = when {
    value > 0 -> "+${"%.2f".format(Locale.US, value)}%"
    value < 0 -> "${"%.2f".format(Locale.US, value)}%"
    else -> "0.00%"
}
