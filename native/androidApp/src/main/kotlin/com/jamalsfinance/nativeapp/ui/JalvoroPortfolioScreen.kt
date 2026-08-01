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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.investments.InvestmentHolding
import com.jamalsfinance.shared.investments.InvestmentRow
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsRepository
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsResult
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsSnapshot
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.max

@Composable
internal fun JalvoroPortfolioScreen(
    snapshot: InvestmentsAnalyticsSnapshot,
    repository: InvestmentsAnalyticsRepository,
    loading: Boolean,
    onMessage: (String?) -> Unit,
) {
    val scope = rememberCoroutineScope()
    val expanded = remember { mutableStateMapOf<String, Boolean>() }
    var adding by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<InvestmentRow?>(null) }
    var deleting by remember { mutableStateOf<InvestmentRow?>(null) }
    var cashingOut by remember { mutableStateOf<InvestmentRow?>(null) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 30.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            GrowthSectionHeader(
                icon = JalvoroIcons.Investments,
                eyebrow = "Growth",
                title = "Your portfolio",
                description = "Each asset appears once. Open its purchase history to manage every separate buy.",
                trailing = {
                    Button(
                        onClick = { adding = true },
                        enabled = !loading,
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Icon(JalvoroIcons.Plus, null, Modifier.size(18.dp))
                        Spacer(Modifier.width(7.dp))
                        Text("Add")
                    }
                },
            )
        }

        if (snapshot.investments.isEmpty()) {
            item {
                GrowthEmptyState(
                    icon = JalvoroIcons.Investments,
                    title = "No investments yet",
                    description = "Add your first purchase to see portfolio value, performance, allocation and analytics.",
                    actionLabel = "Add investment",
                    onAction = { adding = true },
                )
            }
        } else {
            item { PortfolioOverviewCard(snapshot) }

            if (snapshot.holdings.isEmpty()) {
                item {
                    GrowthEmptyState(
                        icon = JalvoroIcons.Warning,
                        title = "No active holdings",
                        description = "Stored investment records do not currently form a positive active position. Add or review a purchase lot.",
                    )
                }
            } else {
                item { PortfolioComparisonCard(snapshot.holdings) }
                item { PortfolioAllocationCard(snapshot.holdings) }
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                text = "Your holdings",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.semantics { heading() },
                            )
                            Text(
                                text = "${snapshot.investments.size} purchase${if (snapshot.investments.size == 1) "" else "s"} across ${snapshot.holdings.size} asset${if (snapshot.holdings.size == 1) "" else "s"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
                items(snapshot.holdings, key = { it.key }) { holding ->
                    PortfolioHoldingCard(
                        holding = holding,
                        expanded = expanded[holding.key] == true,
                        onToggle = { expanded[holding.key] = expanded[holding.key] != true },
                        onEdit = { editing = it },
                        onDelete = { deleting = it },
                        onCashOut = { cashingOut = it },
                    )
                }
            }
        }
    }

    if (adding || editing != null) {
        JalvoroInvestmentEditorDialog(
            repository = repository,
            snapshot = snapshot,
            investment = editing,
            onDismiss = {
                adding = false
                editing = null
            },
            onMessage = onMessage,
        )
    }

    deleting?.let { investment ->
        ConfirmPlanningAction(
            title = "Delete investment?",
            text = "Delete ${investment.name}? The secure investment workflow preserves linked ledger history.",
            confirmLabel = "Delete",
            onDismiss = { deleting = null },
            onConfirm = {
                scope.launch {
                    when (val result = repository.deleteInvestment(investment.id)) {
                        InvestmentsAnalyticsResult.Success -> {
                            deleting = null
                            onMessage(null)
                        }
                        is InvestmentsAnalyticsResult.Failure -> onMessage(result.message)
                    }
                }
            },
        )
    }

    cashingOut?.let { investment ->
        JalvoroInvestmentCashOutDialog(
            investment = investment,
            snapshot = snapshot,
            repository = repository,
            onDismiss = { cashingOut = null },
            onMessage = onMessage,
        )
    }
}

@Composable
private fun PortfolioOverviewCard(snapshot: InvestmentsAnalyticsSnapshot) {
    val profitable = snapshot.totalPnl >= 0
    val liveCount = snapshot.holdings.count { it.livePriced }
    val manualCount = snapshot.holdings.size - liveCount

    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        text = "PORTFOLIO OVERVIEW",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Black,
                    )
                    Text(
                        text = growthFormatPkr(snapshot.totalValue),
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = "$liveCount live priced · $manualCount manual",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                GrowthStatusPill(
                    label = "${if (profitable) "+" else "-"}${growthFormatPkr(abs(snapshot.totalPnl))} · ${if (profitable) "+" else "-"}${growthFormatPercent(abs(snapshot.totalPnlPct))}",
                    positive = profitable,
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                GrowthMetricTile(
                    label = "Invested",
                    value = growthFormatPkr(snapshot.totalInvested),
                    helper = "Total cost basis",
                    modifier = Modifier.weight(1f),
                )
                GrowthMetricTile(
                    label = "Holdings",
                    value = snapshot.holdings.size.toString(),
                    helper = "Grouped assets",
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun PortfolioComparisonCard(holdings: List<InvestmentHolding>) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            GrowthSectionHeader(
                icon = JalvoroIcons.Reports,
                eyebrow = "Performance",
                title = "Current value vs cost",
                description = "Expense red shows invested cost. Income green shows current value.",
            )
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                PortfolioLegendDot(GrowthExpense, "Cost")
                PortfolioLegendDot(GrowthProfit, "Current")
            }
            PortfolioValueComparisonChart(
                holdings = holdings.take(6),
                modifier = Modifier.fillMaxWidth().height(220.dp),
            )
            holdings.take(6).forEach { holding ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = holding.symbol ?: holding.name,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        text = "${growthFormatPkr(holding.totalInvested)} → ${growthFormatPkr(holding.currentValue)}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

@Composable
private fun PortfolioLegendDot(color: Color, label: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Surface(modifier = Modifier.size(8.dp), shape = RoundedCornerShape(999.dp), color = color) {}
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun PortfolioValueComparisonChart(
    holdings: List<InvestmentHolding>,
    modifier: Modifier = Modifier,
) {
    Canvas(
        modifier = modifier.semantics {
            contentDescription = "Bar chart comparing invested cost and current value for ${holdings.size} holdings"
        },
    ) {
        if (holdings.isEmpty()) return@Canvas
        val maxValue = holdings.maxOf { max(it.totalInvested, it.currentValue) }.coerceAtLeast(1.0)
        val rowHeight = size.height / holdings.size
        val usableWidth = size.width * 0.96f
        holdings.forEachIndexed { index, holding ->
            val top = index * rowHeight + rowHeight * 0.15f
            val barHeight = rowHeight * 0.24f
            drawRoundRect(
                color = GrowthExpense,
                topLeft = Offset(0f, top),
                size = Size((holding.totalInvested / maxValue * usableWidth).toFloat(), barHeight),
                cornerRadius = CornerRadius(barHeight / 2, barHeight / 2),
            )
            drawRoundRect(
                color = GrowthProfit,
                topLeft = Offset(0f, top + barHeight + rowHeight * 0.08f),
                size = Size((holding.currentValue / maxValue * usableWidth).toFloat(), barHeight),
                cornerRadius = CornerRadius(barHeight / 2, barHeight / 2),
            )
        }
    }
}

@Composable
private fun PortfolioAllocationCard(holdings: List<InvestmentHolding>) {
    val displayed = holdings.take(6)
    val total = holdings.sumOf { it.currentValue }
    val topHolding = displayed.firstOrNull()

    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            GrowthSectionHeader(
                icon = JalvoroIcons.Investments,
                eyebrow = "Allocation",
                title = "Portfolio mix",
                description = "One allocation segment per asset, even when it contains several purchases.",
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(18.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    PortfolioAllocationDonut(displayed, Modifier.size(142.dp))
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "CURRENT",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = growthFormatPkr(total),
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        topHolding?.let {
                            Text(
                                text = "Top: ${it.symbol ?: it.name}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    displayed.take(5).forEachIndexed { index, holding ->
                        val percentage = if (total > 0) holding.currentValue / total * 100 else 0.0
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Surface(
                                    modifier = Modifier.size(9.dp),
                                    shape = RoundedCornerShape(999.dp),
                                    color = GrowthPalette[index % GrowthPalette.size],
                                ) {}
                                Text(
                                    text = holding.name,
                                    modifier = Modifier.weight(1f),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Text(
                                    text = growthFormatPercent(percentage),
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                            Surface(
                                modifier = Modifier.fillMaxWidth().height(5.dp),
                                shape = RoundedCornerShape(999.dp),
                                color = MaterialTheme.colorScheme.surfaceContainerHighest,
                            ) {
                                Row {
                                    Surface(
                                        modifier = Modifier.fillMaxWidth((percentage / 100).toFloat().coerceIn(0f, 1f)),
                                        color = GrowthPalette[index % GrowthPalette.size],
                                    ) {}
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PortfolioAllocationDonut(
    holdings: List<InvestmentHolding>,
    modifier: Modifier = Modifier,
) {
    val total = holdings.sumOf { it.currentValue }
    Canvas(
        modifier = modifier.semantics {
            contentDescription = "Donut chart showing allocation across ${holdings.size} holdings"
        },
    ) {
        val stroke = size.minDimension * 0.14f
        drawArc(
            color = GrowthSlate.copy(alpha = 0.14f),
            startAngle = -90f,
            sweepAngle = 360f,
            useCenter = false,
            style = Stroke(stroke, cap = StrokeCap.Round),
        )
        if (total <= 0) return@Canvas
        var start = -90f
        holdings.forEachIndexed { index, holding ->
            val sweep = (holding.currentValue / total * 360).toFloat()
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
private fun PortfolioHoldingCard(
    holding: InvestmentHolding,
    expanded: Boolean,
    onToggle: () -> Unit,
    onEdit: (InvestmentRow) -> Unit,
    onDelete: (InvestmentRow) -> Unit,
    onCashOut: (InvestmentRow) -> Unit,
) {
    val profitable = holding.totalPnl >= 0
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(JalvoroIcons.Investments, null, Modifier.padding(11.dp).size(23.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        text = holding.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = "${holding.symbol ?: holding.type.uppercase()} · ${holding.lots.size} buy${if (holding.lots.size == 1) "" else "s"} · Qty ${growthFormatQuantity(holding.quantity)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                GrowthStatusPill(
                    label = if (holding.livePriced) "Live" else "Manual",
                    positive = if (holding.livePriced) true else null,
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                GrowthMetricTile(
                    label = "Invested",
                    value = growthFormatPkr(holding.totalInvested),
                    helper = "Avg ${growthFormatPkr(holding.averageBuyPrice)}",
                    modifier = Modifier.weight(1f),
                )
                GrowthMetricTile(
                    label = "Current",
                    value = growthFormatPkr(holding.currentValue),
                    helper = "Unit ${growthFormatPkr(holding.currentPrice)}",
                    modifier = Modifier.weight(1f),
                )
            }
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = if (profitable) GrowthProfit.copy(alpha = 0.10f) else MaterialTheme.colorScheme.errorContainer,
                contentColor = if (profitable) GrowthProfit else MaterialTheme.colorScheme.error,
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(13.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Profit / loss", fontWeight = FontWeight.SemiBold)
                    Text(
                        text = "${if (profitable) "+" else "-"}${growthFormatPkr(abs(holding.totalPnl))} · ${if (profitable) "+" else "-"}${growthFormatPercent(abs(holding.totalPnlPct))}",
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            holding.priceChange24h?.let { change ->
                GrowthStatusPill(
                    label = "24h ${if (change >= 0) "+" else ""}${growthFormatPercent(change)}",
                    positive = change >= 0,
                )
            }
            OutlinedButton(
                onClick = onToggle,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
            ) {
                Text(if (expanded) "Hide purchase history" else "Manage purchase history (${holding.lots.size})")
            }
            if (expanded) {
                holding.lots.forEach { lot ->
                    PortfolioLotRow(
                        lot = lot,
                        onEdit = { onEdit(lot) },
                        onDelete = { onDelete(lot) },
                        onCashOut = { onCashOut(lot) },
                    )
                }
            }
        }
    }
}

@Composable
private fun PortfolioLotRow(
    lot: InvestmentRow,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onCashOut: () -> Unit,
) {
    val position = lot.position
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(13.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(lot.purchasedAt ?: "Purchase date unavailable", fontWeight = FontWeight.SemiBold)
                    Text(
                        text = "Qty ${growthFormatQuantity(lot.quantity)} · Buy ${growthFormatPkr(lot.purchasePrice)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    text = position?.let { growthFormatPkr(it.currentValue) } ?: "Unavailable",
                    fontWeight = FontWeight.Bold,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                TextButton(onClick = onEdit) { Text("Edit") }
                TextButton(
                    onClick = onCashOut,
                    enabled = lot.quantity > 0 && lot.currentPrice > 0,
                ) { Text("Cash out") }
                TextButton(onClick = onDelete) { Text("Delete") }
            }
        }
    }
}
