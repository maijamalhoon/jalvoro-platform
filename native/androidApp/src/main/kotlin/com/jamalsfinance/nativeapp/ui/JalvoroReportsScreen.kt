package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.reports.ReportAccountActivity
import com.jamalsfinance.shared.reports.ReportBreakdown
import com.jamalsfinance.shared.reports.ReportCashFlowPoint
import com.jamalsfinance.shared.reports.ReportPeriod
import com.jamalsfinance.shared.reports.ReportSummary
import com.jamalsfinance.shared.reports.ReportsInsightsSnapshot
import com.jamalsfinance.shared.reports.formatReportMoney
import java.text.NumberFormat
import java.util.Locale
import kotlin.math.max

@Composable
internal fun JalvoroReportsScreen(
    snapshot: ReportsInsightsSnapshot,
    period: ReportPeriod,
    customStart: String,
    customEnd: String,
    selectedCurrency: String,
    loading: Boolean,
    onPeriodChange: (ReportPeriod) -> Unit,
    onCustomStartChange: (String) -> Unit,
    onCustomEndChange: (String) -> Unit,
    onApplyCustom: () -> Unit,
    onCurrencyChange: (String) -> Unit,
    onExport: () -> Unit,
) {
    val report = snapshot.report
    val money: (Double) -> String = { value ->
        formatReportMoney(value, selectedCurrency, snapshot.exchangeRates)
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, top = 12.dp, end = 16.dp, bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            JalvoroReportHeading(report = report, financialDataAvailable = report.financialDataAvailable)
        }
        item {
            JalvoroReportControls(
                period = period,
                customStart = customStart,
                customEnd = customEnd,
                selectedCurrency = selectedCurrency,
                loading = loading,
                onPeriodChange = onPeriodChange,
                onCustomStartChange = onCustomStartChange,
                onCustomEndChange = onCustomEndChange,
                onApplyCustom = onApplyCustom,
                onCurrencyChange = onCurrencyChange,
                onExport = onExport,
            )
        }
        if (!report.financialDataAvailable) {
            item {
                JalvoroFeedbackCard(
                    message = "This report could not be prepared. Check your connection and try again; saved records were not changed.",
                    tone = JalvoroFeedbackTone.Danger,
                )
            }
        } else if (report.partialAreas.isNotEmpty()) {
            item {
                JalvoroFeedbackCard(
                    message = "Report prepared with partial data. Unavailable sections: ${report.partialAreas.joinToString()}.",
                    tone = JalvoroFeedbackTone.Warning,
                )
            }
        }
        item {
            JalvoroReportMetrics(report = report, money = money)
        }
        if (
            report.financialDataAvailable &&
            report.incomeCount == 0 &&
            report.expenseCount == 0 &&
            report.transferCount == 0
        ) {
            item { JalvoroEmptyReportRange() }
        }
        item {
            JalvoroReportSection(
                icon = JalvoroIcons.Investments,
                title = "Cash flow",
                subtitle = "${report.rangeLabel} · income is green and expenses are red.",
            ) {
                JalvoroReportCashFlowChart(
                    rows = if (report.financialDataAvailable) report.cashFlow else emptyList(),
                )
            }
        }
        item {
            JalvoroReportSection(
                icon = JalvoroIcons.Expenses,
                title = "Expense categories",
                subtitle = "Refunds reduce the category that originally carried the expense.",
            ) {
                JalvoroReportBreakdownList(
                    rows = if (report.financialDataAvailable) report.expenseCategories.take(8) else emptyList(),
                    money = money,
                    emptyMessage = if (report.financialDataAvailable) {
                        "No expense categories in this range."
                    } else {
                        "Expense-category data is unavailable."
                    },
                    amountTone = MaterialTheme.colorScheme.error,
                )
            }
        }
        item {
            JalvoroReportSection(
                icon = JalvoroIcons.Income,
                title = "Income sources",
                subtitle = "Largest verified sources are listed first.",
            ) {
                JalvoroReportBreakdownList(
                    rows = if (report.financialDataAvailable) report.incomeSources.take(8) else emptyList(),
                    money = money,
                    emptyMessage = if (report.financialDataAvailable) {
                        "No income sources in this range."
                    } else {
                        "Income-source data is unavailable."
                    },
                    amountTone = Color(0xFF17815F),
                )
            }
        }
        item {
            JalvoroReportSection(
                icon = JalvoroIcons.Accounts,
                title = "Account activity",
                subtitle = "Income, expenses and transfers remain separate.",
            ) {
                JalvoroAccountActivityList(
                    rows = if (report.financialDataAvailable) report.accountActivity.take(8) else emptyList(),
                    money = money,
                    unavailable = !report.financialDataAvailable,
                )
            }
        }
        item {
            JalvoroModuleOverviewGrid(report = report, money = money)
        }
        item {
            JalvoroReportSection(
                icon = JalvoroIcons.Reports,
                title = "Report integrity",
                subtitle = "Canonical finance values stay in PKR; display conversion happens only at the final boundary.",
            ) {
                JalvoroReportKeyValue("Average daily income", reportValue(report.financialDataAvailable) { money(report.averageDailyIncome) })
                JalvoroReportKeyValue("Transfer volume", reportValue(report.financialDataAvailable && !report.hasPartial("transfers")) { money(report.transferVolume) })
                JalvoroReportKeyValue("Export rows", reportValue(report.financialDataAvailable) { report.exportRows.size.toString() })
                JalvoroReportKeyValue("Exchange rate", if (snapshot.rateLive) "Live" else "Cached / fallback")
            }
        }
    }
}

@Composable
private fun JalvoroReportHeading(
    report: ReportSummary,
    financialDataAvailable: Boolean,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Reports",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.semantics { heading() },
                )
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = if (financialDataAvailable) Color(0x1817855F) else MaterialTheme.colorScheme.errorContainer,
                    contentColor = if (financialDataAvailable) Color(0xFF17815F) else MaterialTheme.colorScheme.onErrorContainer,
                ) {
                    Text(
                        text = if (financialDataAvailable) "READY" else "UNAVAILABLE",
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Black,
                    )
                }
            }
            Text(
                text = buildString {
                    append(report.rangeLabel)
                    append(" · ")
                    append(report.incomeCount + report.expenseCount)
                    append(" income and expense entries")
                    if (report.refundCount > 0) append(" · ${report.refundCount} refunds")
                    if (!report.hasPartial("transfers")) append(" · ${report.transferCount} transfers")
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun JalvoroReportControls(
    period: ReportPeriod,
    customStart: String,
    customEnd: String,
    selectedCurrency: String,
    loading: Boolean,
    onPeriodChange: (ReportPeriod) -> Unit,
    onCustomStartChange: (String) -> Unit,
    onCustomEndChange: (String) -> Unit,
    onApplyCustom: () -> Unit,
    onCurrencyChange: (String) -> Unit,
    onExport: () -> Unit,
) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(
                    listOf(
                        ReportPeriod.Week to "Week",
                        ReportPeriod.Month to "Month",
                        ReportPeriod.SixMonths to "6 months",
                        ReportPeriod.Year to "Year",
                        ReportPeriod.Custom to "Custom",
                    ),
                ) { (value, label) ->
                    FilterChip(
                        selected = period == value,
                        onClick = { onPeriodChange(value) },
                        label = { Text(label) },
                        enabled = !loading,
                    )
                }
            }
            if (period == ReportPeriod.Custom) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    OutlinedTextField(
                        value = customStart,
                        onValueChange = onCustomStartChange,
                        modifier = Modifier.weight(1f),
                        label = { Text("Start") },
                        supportingText = { Text("YYYY-MM-DD") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    )
                    OutlinedTextField(
                        value = customEnd,
                        onValueChange = onCustomEndChange,
                        modifier = Modifier.weight(1f),
                        label = { Text("End") },
                        supportingText = { Text("YYYY-MM-DD") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    )
                }
                Button(
                    onClick = onApplyCustom,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !loading,
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Text("Apply custom range")
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                JalvoroCurrencyMenu(
                    selected = selectedCurrency,
                    enabled = !loading,
                    onSelected = onCurrencyChange,
                    modifier = Modifier.weight(1f),
                )
                OutlinedButton(
                    onClick = onExport,
                    enabled = !loading,
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Icon(JalvoroIcons.Reports, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(7.dp))
                    Text("Export CSV")
                }
            }
        }
    }
}

@Composable
internal fun JalvoroCurrencyMenu(
    selected: String,
    enabled: Boolean,
    onSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier) {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth(),
            enabled = enabled,
            shape = RoundedCornerShape(14.dp),
        ) {
            Text("Currency · $selected", maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            JalvoroReportCurrencies.forEach { currency ->
                DropdownMenuItem(
                    text = { Text(currency) },
                    onClick = {
                        expanded = false
                        onSelected(currency)
                    },
                )
            }
        }
    }
}

@Composable
private fun JalvoroReportMetrics(
    report: ReportSummary,
    money: (Double) -> String,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            JalvoroReportMetricCard(
                icon = JalvoroIcons.Income,
                label = "Income",
                value = reportValue(report.financialDataAvailable) { money(report.totalIncome) },
                helper = reportValue(report.financialDataAvailable) { "${report.incomeCount} entries" },
                tone = Color(0xFF17815F),
                modifier = Modifier.weight(1f),
            )
            JalvoroReportMetricCard(
                icon = JalvoroIcons.Expenses,
                label = "Expenses",
                value = reportValue(report.financialDataAvailable) { money(report.totalExpenses) },
                helper = reportValue(report.financialDataAvailable) { "${report.refundCount} refunds applied" },
                tone = MaterialTheme.colorScheme.error,
                modifier = Modifier.weight(1f),
            )
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            JalvoroReportMetricCard(
                icon = JalvoroIcons.Transfer,
                label = "Net result",
                value = reportValue(report.financialDataAvailable) { money(report.netResult) },
                helper = reportValue(report.financialDataAvailable) {
                    if (report.netResult >= 0) "Positive cash flow" else "Negative cash flow"
                },
                tone = if (report.netResult >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                modifier = Modifier.weight(1f),
            )
            JalvoroReportMetricCard(
                icon = JalvoroIcons.Dashboard,
                label = "Daily spending",
                value = reportValue(report.financialDataAvailable) { money(report.averageDailySpending) },
                helper = reportValue(report.financialDataAvailable) { "${report.inclusiveDays} days" },
                tone = MaterialTheme.colorScheme.tertiary,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun JalvoroReportMetricCard(
    icon: ImageVector,
    label: String,
    value: String,
    helper: String,
    tone: Color,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.fillMaxWidth().padding(15.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                Icon(icon, contentDescription = null, tint = tone, modifier = Modifier.size(17.dp))
                Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(
                value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = if (value == "Unavailable") MaterialTheme.colorScheme.onSurfaceVariant else tone,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(helper, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun JalvoroEmptyReportRange() {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(JalvoroIcons.Reports, contentDescription = null, modifier = Modifier.size(30.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("No report activity in this range", fontWeight = FontWeight.Bold)
            Text(
                "Choose another period or add financial activity. No values have been invented.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun JalvoroReportSection(
    icon: ImageVector,
    title: String,
    subtitle: String,
    content: @Composable () -> Unit,
) {
    JalvoroSurfaceCard {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(icon, contentDescription = null, modifier = Modifier.padding(9.dp).size(19.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            content()
        }
    }
}

@Composable
private fun JalvoroReportCashFlowChart(rows: List<ReportCashFlowPoint>) {
    if (rows.isEmpty()) {
        JalvoroReportEmptyText("No cash-flow activity is available in this range.")
        return
    }
    val incomeColor = Color(0xFF17815F)
    val expenseColor = Color(0xFFD34D59)
    val maxValue = max(
        rows.maxOfOrNull { it.income } ?: 0.0,
        rows.maxOfOrNull { it.expenses } ?: 0.0,
    ).coerceAtLeast(1.0)

    Canvas(
        modifier = Modifier
            .fillMaxWidth()
            .height(218.dp)
            .background(MaterialTheme.colorScheme.surfaceContainerLow, RoundedCornerShape(18.dp))
            .padding(12.dp),
    ) {
        val baseline = size.height - 10.dp.toPx()
        val usableHeight = baseline - 10.dp.toPx()
        val groupWidth = size.width / rows.size.coerceAtLeast(1)
        val barWidth = (groupWidth * 0.23f).coerceIn(3.dp.toPx(), 16.dp.toPx())
        rows.forEachIndexed { index, row ->
            val center = groupWidth * index + groupWidth / 2f
            val incomeHeight = (row.income / maxValue).toFloat() * usableHeight
            val expenseHeight = (row.expenses / maxValue).toFloat() * usableHeight
            drawRoundRect(
                color = incomeColor,
                topLeft = Offset(center - barWidth - 2.dp.toPx(), baseline - incomeHeight),
                size = Size(barWidth, incomeHeight.coerceAtLeast(2.dp.toPx())),
                cornerRadius = CornerRadius(barWidth / 2f),
            )
            drawRoundRect(
                color = expenseColor,
                topLeft = Offset(center + 2.dp.toPx(), baseline - expenseHeight),
                size = Size(barWidth, expenseHeight.coerceAtLeast(2.dp.toPx())),
                cornerRadius = CornerRadius(barWidth / 2f),
            )
        }
    }
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
        horizontalArrangement = Arrangement.Center,
    ) {
        JalvoroLegendDot(incomeColor, "Income")
        Spacer(Modifier.width(18.dp))
        JalvoroLegendDot(expenseColor, "Expenses")
    }
}

@Composable
private fun JalvoroLegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(8.dp).background(color, CircleShape))
        Spacer(Modifier.width(6.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun JalvoroReportBreakdownList(
    rows: List<ReportBreakdown>,
    money: (Double) -> String,
    emptyMessage: String,
    amountTone: Color,
) {
    if (rows.isEmpty()) {
        JalvoroReportEmptyText(emptyMessage)
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(13.dp)) {
        rows.forEach { row ->
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(Modifier.weight(1f)) {
                        Text(row.name, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        row.helper?.takeIf(String::isNotBlank)?.let {
                            Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "${money(row.amount)} · ${jalvoroReportPercent(row.percentage)}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                        color = amountTone,
                    )
                }
                LinearProgressIndicator(
                    progress = { (row.percentage / 100.0).toFloat().coerceIn(0f, 1f) },
                    modifier = Modifier.fillMaxWidth().height(6.dp),
                    color = amountTone,
                    trackColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                    strokeCap = StrokeCap.Round,
                )
            }
        }
    }
}

@Composable
private fun JalvoroAccountActivityList(
    rows: List<ReportAccountActivity>,
    money: (Double) -> String,
    unavailable: Boolean,
) {
    if (rows.isEmpty()) {
        JalvoroReportEmptyText(if (unavailable) "Account activity is unavailable." else "No account activity in this range.")
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        rows.forEach { account ->
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surfaceContainerLow,
            ) {
                Column(Modifier.fillMaxWidth().padding(13.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(account.name, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("In ${money(account.income)}", color = Color(0xFF17815F), style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                        Text("Out ${money(account.expenses)}", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Transfer in ${money(account.transfersIn)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                        Text("Transfer out ${money(account.transfersOut)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun JalvoroModuleOverviewGrid(
    report: ReportSummary,
    money: (Double) -> String,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            JalvoroReportModuleCard(
                icon = JalvoroIcons.Target,
                title = "Goals overview",
                value = reportValue(!report.hasPartial("goals")) { money(report.goals.saved) },
                helper = reportValue(!report.hasPartial("goals")) { "toward ${money(report.goals.target)}" },
                status = reportValue(!report.hasPartial("goals")) { "${report.goals.completedCount} of ${report.goals.count} completed" },
                tone = MaterialTheme.colorScheme.primary,
                modifier = Modifier.weight(1f),
            )
            JalvoroReportModuleCard(
                icon = JalvoroIcons.Expenses,
                title = "Payables overview",
                value = reportValue(!report.hasPartial("payables")) { money(report.payables.remaining) },
                helper = reportValue(!report.hasPartial("payables")) { "remaining across ${report.payables.count} payables" },
                status = reportValue(!report.hasPartial("payables")) { "${report.payables.overdueCount} overdue" },
                tone = if (report.payables.overdueCount > 0) MaterialTheme.colorScheme.error else Color(0xFF17815F),
                modifier = Modifier.weight(1f),
            )
        }
        JalvoroReportModuleCard(
            icon = JalvoroIcons.Investments,
            title = "Investment overview",
            value = reportValue(!report.hasPartial("investments")) { money(report.investments.currentValue) },
            helper = reportValue(!report.hasPartial("investments")) { "${money(report.investments.invested)} invested" },
            status = reportValue(!report.hasPartial("investments")) {
                if (report.investments.partialPricing) {
                    "Market result unavailable · partial pricing"
                } else {
                    "${if (report.investments.pnl >= 0) "+" else "-"}${money(kotlin.math.abs(report.investments.pnl))} · ${jalvoroReportPercent(kotlin.math.abs(report.investments.pnlPercentage))}"
                }
            },
            tone = if (report.investments.pnl < 0) MaterialTheme.colorScheme.error else Color(0xFF17815F),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun JalvoroReportModuleCard(
    icon: ImageVector,
    title: String,
    value: String,
    helper: String,
    status: String,
    tone: Color,
    modifier: Modifier = Modifier,
) {
    JalvoroSurfaceCard(modifier) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                Icon(icon, contentDescription = null, tint = tone, modifier = Modifier.size(18.dp))
                Text(title, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
            }
            Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = if (value == "Unavailable") MaterialTheme.colorScheme.onSurfaceVariant else tone)
            Text(helper, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(status, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = if (status == "Unavailable") MaterialTheme.colorScheme.onSurfaceVariant else tone)
        }
    }
}

@Composable
private fun JalvoroReportKeyValue(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
        Spacer(Modifier.width(12.dp))
        Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun JalvoroReportEmptyText(message: String) {
    Text(
        text = message,
        modifier = Modifier.fillMaxWidth().padding(vertical = 18.dp),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

private inline fun reportValue(available: Boolean, value: () -> String): String =
    if (available) value() else "Unavailable"

private fun ReportSummary.hasPartial(area: String): Boolean =
    partialAreas.any { it.equals(area, ignoreCase = true) }

private fun jalvoroReportPercent(value: Double): String =
    "${NumberFormat.getNumberInstance(Locale.US).apply { maximumFractionDigits = 1 }.format(value)}%"
