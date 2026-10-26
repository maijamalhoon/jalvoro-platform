package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.investments.AnalyticsBreakdown
import com.jamalsfinance.shared.investments.AnalyticsPeriod
import com.jamalsfinance.shared.investments.AnalyticsSummary
import com.jamalsfinance.shared.investments.CashFlowPoint
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsRepository
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsResult
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsSnapshot
import com.jamalsfinance.shared.investments.LargestAnalyticsEntry
import com.jamalsfinance.shared.investments.analyticsSelection
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.max

@Composable
internal fun JalvoroAnalyticsScreen(
    snapshot: InvestmentsAnalyticsSnapshot,
    repository: InvestmentsAnalyticsRepository,
    loading: Boolean,
    onMessage: (String?) -> Unit,
) {
    val scope = rememberCoroutineScope()
    val summary = snapshot.analytics
    var customRangeOpen by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 30.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            GrowthSectionHeader(
                icon = JalvoroIcons.Reports,
                eyebrow = "Intelligence",
                title = "Financial analytics",
                description = "Range-based income, spending, savings, cash flow and portfolio context from your stored records.",
            )
        }
        item {
            AnalyticsPeriodPicker(
                selected = summary?.selection?.period ?: AnalyticsPeriod.Month,
                enabled = !loading,
                onSelect = { period ->
                    if (period == AnalyticsPeriod.Custom) {
                        customRangeOpen = true
                    } else {
                        scope.launch {
                            when (val result = repository.refreshAnalytics(analyticsSelection(period, snapshot.nowDate))) {
                                InvestmentsAnalyticsResult.Success -> onMessage(null)
                                is InvestmentsAnalyticsResult.Failure -> onMessage(result.message)
                            }
                        }
                    }
                },
            )
        }

        if (summary == null) {
            item {
                GrowthEmptyState(
                    icon = JalvoroIcons.Warning,
                    title = "Analytics unavailable",
                    description = "Refresh the workspace to calculate analytics for the selected period.",
                )
            }
        } else {
            item { AnalyticsTruthfulNotice(summary) }
            item { AnalyticsKpiGrid(summary) }
            item { AnalyticsPeriodContext(summary) }
            item { AnalyticsCashFlowCard(summary.cashFlow) }
            item { AnalyticsExpenseCard(summary.expenseCategories) }
            item {
                AnalyticsBreakdownCard(
                    title = "Income sources",
                    description = "Where income in this period came from.",
                    icon = JalvoroIcons.Income,
                    items = summary.incomeSources,
                    emptyMessage = "No income sources in this period.",
                )
            }
            item {
                AnalyticsBreakdownCard(
                    title = "Account spending",
                    description = "Expense activity grouped by account.",
                    icon = JalvoroIcons.Accounts,
                    items = summary.accountSpending,
                    emptyMessage = "No account spending in this period.",
                )
            }
            item { AnalyticsTransferCard(summary) }
            item { AnalyticsPortfolioSnapshot(summary) }
            item {
                AnalyticsLargestEntriesCard(
                    title = "Largest income",
                    icon = JalvoroIcons.Income,
                    entries = summary.largestIncome,
                    emptyMessage = "No income entries in this period.",
                )
            }
            item {
                AnalyticsLargestEntriesCard(
                    title = "Largest expenses",
                    icon = JalvoroIcons.Expenses,
                    entries = summary.largestExpenses,
                    emptyMessage = "No expense entries in this period.",
                )
            }
        }
    }

    if (customRangeOpen) {
        JalvoroCustomAnalyticsRangeDialog(
            nowDate = snapshot.nowDate,
            onDismiss = { customRangeOpen = false },
            onApply = { start, end ->
                scope.launch {
                    runCatching { analyticsSelection(AnalyticsPeriod.Custom, snapshot.nowDate, start, end) }
                        .onSuccess { selection ->
                            when (val result = repository.refreshAnalytics(selection)) {
                                InvestmentsAnalyticsResult.Success -> {
                                    onMessage(null)
                                    customRangeOpen = false
                                }
                                is InvestmentsAnalyticsResult.Failure -> onMessage(result.message)
                            }
                        }
                        .onFailure { onMessage(it.message ?: "Invalid analytics range.") }
                }
            },
        )
    }
}

@Composable
private fun AnalyticsPeriodPicker(
    selected: AnalyticsPeriod,
    enabled: Boolean,
    onSelect: (AnalyticsPeriod) -> Unit,
) {
    val options = listOf(
        AnalyticsPeriod.Today to "Today",
        AnalyticsPeriod.Week to "7 days",
        AnalyticsPeriod.Month to "Month",
        AnalyticsPeriod.SixMonths to "6 months",
        AnalyticsPeriod.Year to "Year",
        AnalyticsPeriod.Custom to "Custom",
    )
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(end = 8.dp),
    ) {
        items(options, key = { it.first.name }) { (period, label) ->
            FilterChip(
                selected = selected == period,
                onClick = { onSelect(period) },
                enabled = enabled,
                label = { Text(label) },
            )
        }
    }
}

@Composable
private fun AnalyticsTruthfulNotice(summary: AnalyticsSummary) {
    val hasActivity = summary.incomeCount > 0 || summary.expenseCount > 0 || summary.transferCount > 0
    when {
        !hasActivity -> JalvoroFeedbackCard(
            message = "No activity in this period. Choose another range or add income and expenses.",
            tone = JalvoroFeedbackTone.Info,
        )
        summary.expenseCount == 0 -> JalvoroFeedbackCard(
            message = "Income-only period. Spending sections have no expense data.",
            tone = JalvoroFeedbackTone.Info,
        )
        summary.incomeCount == 0 -> JalvoroFeedbackCard(
            message = "Expense-only period. Savings rate is unavailable.",
            tone = JalvoroFeedbackTone.Warning,
        )
    }
}

@Composable
private fun AnalyticsKpiGrid(summary: AnalyticsSummary) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            AnalyticsKpiTile(
                label = "Income",
                value = growthFormatPkr(summary.totalIncome),
                change = summary.incomeChange.label,
                favorable = summary.incomeChange.favorable,
                modifier = Modifier.weight(1f),
            )
            AnalyticsKpiTile(
                label = "Expenses",
                value = growthFormatPkr(summary.totalExpenses),
                change = summary.expensesChange.label,
                favorable = summary.expensesChange.favorable,
                modifier = Modifier.weight(1f),
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            AnalyticsKpiTile(
                label = "Net savings",
                value = growthFormatPkr(summary.netSavings),
                change = summary.netSavingsChange.label,
                favorable = summary.netSavingsChange.favorable,
                modifier = Modifier.weight(1f),
            )
            AnalyticsKpiTile(
                label = "Savings rate",
                value = summary.savingsRate?.let(::growthFormatPercent) ?: "Unavailable",
                change = summary.savingsRateChange.label,
                favorable = summary.savingsRateChange.favorable,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun AnalyticsKpiTile(
    label: String,
    value: String,
    change: String,
    favorable: Boolean?,
    modifier: Modifier = Modifier,
) {
    val tone = when (favorable) {
        true -> GrowthMetricTone.Positive
        false -> GrowthMetricTone.Negative
        null -> GrowthMetricTone.Default
    }
    JalvoroSurfaceCard(modifier) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(15.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Text(
                text = label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                color = when (tone) {
                    GrowthMetricTone.Positive -> GrowthProfit
                    GrowthMetricTone.Negative -> MaterialTheme.colorScheme.error
                    GrowthMetricTone.Default -> MaterialTheme.colorScheme.onSurface
                },
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = change,
                style = MaterialTheme.typography.bodySmall,
                color = when (favorable) {
                    true -> GrowthProfit
                    false -> MaterialTheme.colorScheme.error
                    null -> MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
        }
    }
}

@Composable
private fun AnalyticsPeriodContext(summary: AnalyticsSummary) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            GrowthSectionHeader(
                icon = JalvoroIcons.Transactions,
                eyebrow = "Period context",
                title = "Activity facts",
                description = "${summary.selection.currentStart} to ${summary.selection.currentEnd}",
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                GrowthMetricTile(
                    label = "Entries",
                    value = "${summary.incomeCount + summary.expenseCount}",
                    helper = "${summary.incomeCount} income · ${summary.expenseCount} expenses",
                    modifier = Modifier.weight(1f),
                )
                GrowthMetricTile(
                    label = "Transfers",
                    value = summary.transferCount.toString(),
                    helper = "${growthFormatPkr(summary.transferVolume)} moved",
                    modifier = Modifier.weight(1f),
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                GrowthMetricTile(
                    label = "Daily income",
                    value = growthFormatPkr(summary.averageDailyIncome),
                    helper = "Average per day",
                    modifier = Modifier.weight(1f),
                )
                GrowthMetricTile(
                    label = "Daily spending",
                    value = growthFormatPkr(summary.averageDailySpending),
                    helper = "Average per day",
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun AnalyticsCashFlowCard(points: List<CashFlowPoint>) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            GrowthSectionHeader(
                icon = JalvoroIcons.Reports,
                eyebrow = "Cash flow",
                title = "Income, expenses & cumulative net",
                description = "${points.size} chronological bucket${if (points.size == 1) "" else "s"} from the selected period.",
            )
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                AnalyticsLegend(GrowthProfit, "Income")
                AnalyticsLegend(GrowthExpense, "Expenses")
                AnalyticsLegend(GrowthInvestment, "Net")
            }
            if (points.isEmpty()) {
                Text(
                    text = "No cash-flow data in this period.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                AnalyticsCashFlowChart(points, Modifier.fillMaxWidth().height(240.dp))
                points.takeLast(6).forEach { point ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            text = point.label,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = "${growthFormatPkr(point.income)} · ${growthFormatPkr(point.expenses)} · Net ${growthFormatPkr(point.cumulativeNet)}",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AnalyticsLegend(color: androidx.compose.ui.graphics.Color, label: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Surface(modifier = Modifier.size(8.dp), shape = RoundedCornerShape(999.dp), color = color) {}
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun AnalyticsCashFlowChart(
    points: List<CashFlowPoint>,
    modifier: Modifier = Modifier,
) {
    Canvas(
        modifier = modifier.semantics {
            contentDescription = "Cash-flow chart with income, expenses and cumulative net for ${points.size} buckets"
        },
    ) {
        if (points.isEmpty()) return@Canvas
        val maxBar = points.maxOf { max(it.income, it.expenses) }.coerceAtLeast(1.0)
        val maxNet = points.maxOf { abs(it.cumulativeNet) }.coerceAtLeast(1.0)
        val slot = size.width / points.size
        val barWidth = max(3f, slot * 0.22f)
        val chartHeight = size.height * 0.74f
        val baseY = size.height * 0.86f
        val netPoints = mutableListOf<Offset>()

        points.forEachIndexed { index, point ->
            val center = slot * index + slot / 2f
            val incomeHeight = (point.income / maxBar * chartHeight).toFloat()
            val expenseHeight = (point.expenses / maxBar * chartHeight).toFloat()
            drawRoundRect(
                color = GrowthProfit,
                topLeft = Offset(center - barWidth - 2f, baseY - incomeHeight),
                size = Size(barWidth, incomeHeight),
                cornerRadius = CornerRadius(barWidth / 2, barWidth / 2),
            )
            drawRoundRect(
                color = GrowthExpense,
                topLeft = Offset(center + 2f, baseY - expenseHeight),
                size = Size(barWidth, expenseHeight),
                cornerRadius = CornerRadius(barWidth / 2, barWidth / 2),
            )
            val normalized = ((point.cumulativeNet / maxNet) + 1.0) / 2.0
            netPoints += Offset(center, (baseY - normalized * chartHeight).toFloat())
        }
        netPoints.zipWithNext().forEach { (start, end) ->
            drawLine(GrowthInvestment, start, end, strokeWidth = 4f, cap = StrokeCap.Round)
        }
        netPoints.forEach { point -> drawCircle(GrowthInvestment, radius = 5f, center = point) }
    }
}

@Composable
private fun AnalyticsExpenseCard(items: List<AnalyticsBreakdown>) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            GrowthSectionHeader(
                icon = JalvoroIcons.Expenses,
                eyebrow = "Spending analysis",
                title = "Expense categories",
                description = "Refunds reduce the category that originally carried the expense.",
            )
            if (items.isEmpty()) {
                Text("No spending in this period.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        AnalyticsBreakdownDonut(items.take(6), Modifier.size(138.dp))
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "SPENDING",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                text = growthFormatPkr(items.sumOf { it.amount }),
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(9.dp),
                    ) {
                        items.take(6).forEachIndexed { index, item ->
                            AnalyticsBreakdownRow(item, index)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AnalyticsBreakdownDonut(
    items: List<AnalyticsBreakdown>,
    modifier: Modifier = Modifier,
) {
    Canvas(
        modifier = modifier.semantics {
            contentDescription = "Expense category donut chart with ${items.size} categories"
        },
    ) {
        val stroke = size.minDimension * 0.15f
        drawArc(
            color = GrowthSlate.copy(alpha = 0.14f),
            startAngle = -90f,
            sweepAngle = 360f,
            useCenter = false,
            style = Stroke(stroke, cap = StrokeCap.Round),
        )
        var start = -90f
        items.forEachIndexed { index, item ->
            val sweep = (item.percentage / 100.0 * 360.0).toFloat()
            drawArc(
                color = GrowthPalette[index % GrowthPalette.size],
                startAngle = start,
                sweepAngle = max(1f, sweep - 2f),
                useCenter = false,
                style = Stroke(stroke, cap = StrokeCap.Round),
            )
            start += sweep
        }
    }
}

@Composable
private fun AnalyticsBreakdownRow(item: AnalyticsBreakdown, index: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(7.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                modifier = Modifier.size(9.dp),
                shape = RoundedCornerShape(999.dp),
                color = GrowthPalette[index % GrowthPalette.size],
            ) {}
            Text(
                text = item.name,
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = growthFormatPercent(item.percentage),
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Bold,
            )
        }
        Text(
            text = growthFormatPkr(item.amount),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun AnalyticsBreakdownCard(
    title: String,
    description: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    items: List<AnalyticsBreakdown>,
    emptyMessage: String,
) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            GrowthSectionHeader(
                icon = icon,
                eyebrow = "Breakdown",
                title = title,
                description = description,
            )
            if (items.isEmpty()) {
                Text(emptyMessage, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                items.take(6).forEachIndexed { index, item ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Surface(
                            modifier = Modifier.size(9.dp),
                            shape = RoundedCornerShape(999.dp),
                            color = GrowthPalette[index % GrowthPalette.size],
                        ) {}
                        Column(Modifier.weight(1f)) {
                            Text(
                                text = item.name,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            item.helper?.let { helper ->
                                Text(
                                    text = helper,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(growthFormatPkr(item.amount), fontWeight = FontWeight.Bold)
                            Text(
                                growthFormatPercent(item.percentage),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AnalyticsTransferCard(summary: AnalyticsSummary) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            GrowthSectionHeader(
                icon = JalvoroIcons.Transfer,
                eyebrow = "Account activity",
                title = "Transfer activity",
                description = "Transfers move money between your accounts and do not count as income or expenses.",
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                GrowthMetricTile(
                    label = "Transfers",
                    value = summary.transferCount.toString(),
                    helper = "Completed in this period",
                    modifier = Modifier.weight(1f),
                )
                GrowthMetricTile(
                    label = "Volume",
                    value = growthFormatPkr(summary.transferVolume),
                    helper = "Moved between accounts",
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun AnalyticsPortfolioSnapshot(summary: AnalyticsSummary) {
    val profitable = summary.portfolioPnl >= 0
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            GrowthSectionHeader(
                icon = JalvoroIcons.Investments,
                eyebrow = "Investments",
                title = "Portfolio snapshot",
                description = "Current investment position shown beside your financial period.",
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                GrowthMetricTile(
                    label = "Current value",
                    value = growthFormatPkr(summary.portfolioValue),
                    helper = "Across active holdings",
                    modifier = Modifier.weight(1f),
                )
                GrowthMetricTile(
                    label = "Invested",
                    value = growthFormatPkr(summary.portfolioInvested),
                    helper = "Total cost basis",
                    modifier = Modifier.weight(1f),
                )
            }
            GrowthStatusPill(
                label = "${if (profitable) "+" else "-"}${growthFormatPkr(abs(summary.portfolioPnl))} total P/L",
                positive = profitable,
            )
            if (summary.portfolioHoldings.isEmpty()) {
                Text("No active investment holdings.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                summary.portfolioHoldings.take(6).forEach { holding ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            text = holding.symbol ?: holding.name,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(growthFormatPkr(holding.currentValue), fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun AnalyticsLargestEntriesCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    entries: List<LargestAnalyticsEntry>,
    emptyMessage: String,
) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            GrowthSectionHeader(
                icon = icon,
                eyebrow = "Notable activity",
                title = title,
                description = "Largest matching records in the selected period.",
            )
            if (entries.isEmpty()) {
                Text(emptyMessage, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                entries.forEach { entry ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                text = entry.title,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                text = "${entry.date} · ${entry.categoryName}${entry.accountName?.let { " · $it" } ?: ""}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        Text(growthFormatPkr(entry.amount), fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun JalvoroCustomAnalyticsRangeDialog(
    nowDate: String,
    onDismiss: () -> Unit,
    onApply: (String, String) -> Unit,
) {
    var start by remember { mutableStateOf(nowDate.take(8) + "01") }
    var end by remember { mutableStateOf(nowDate) }
    var error by remember { mutableStateOf<String?>(null) }

    GrowthFormDialog(
        title = "Custom analytics range",
        icon = JalvoroIcons.Reports,
        onDismiss = onDismiss,
    ) {
        Text(
            text = "Choose an inclusive date range. Invalid or future ranges are rejected by the analytics engine.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall,
        )
        OutlinedTextField(
            value = start,
            onValueChange = { start = it; error = null },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Start date YYYY-MM-DD") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
        )
        OutlinedTextField(
            value = end,
            onValueChange = { end = it; error = null },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("End date YYYY-MM-DD") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
        )
        error?.let { JalvoroFeedbackCard(it, JalvoroFeedbackTone.Danger) }
        Button(
            onClick = {
                if (start.isBlank() || end.isBlank()) {
                    error = "Enter both start and end dates."
                } else {
                    onApply(start, end)
                }
            },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
        ) {
            Text("Apply range")
        }
    }
}
