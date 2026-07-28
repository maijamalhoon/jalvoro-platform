package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.NumberFormat
import java.util.Locale
import kotlin.math.abs

private val RedesignIncome = Color(0xFF17845F)
private val RedesignExpense = Color(0xFFC5524D)
private val RedesignTransfer = Color(0xFF2D72C4)
private val RedesignInvestment = Color(0xFF7452C6)

@Composable
internal fun JalvoroOverviewTopBar(
    refreshing: Boolean,
    onMenu: () -> Unit,
    onRefresh: () -> Unit,
    onSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier
            .statusBarsPadding()
            .padding(horizontal = 12.dp, vertical = 7.dp),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.98f),
        contentColor = MaterialTheme.colorScheme.onSurface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.82f)),
        shadowElevation = 2.dp,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().heightIn(min = 58.dp).padding(horizontal = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OverviewTopBarAction(
                label = "Open navigation menu",
                onClick = onMenu,
            ) {
                val lineColor = MaterialTheme.colorScheme.onSurface
                Canvas(modifier = Modifier.fillMaxSize().padding(13.dp)) {
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
                        end = Offset(size.width * 0.68f, size.height * 0.68f),
                        strokeWidth = stroke,
                        cap = StrokeCap.Round,
                    )
                }
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(1.dp),
            ) {
                Text(
                    text = "Overview",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.ExtraBold,
                )
                Text(
                    text = "Personal workspace",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                )
            }
            OverviewTopBarAction(
                label = if (refreshing) "Refreshing data" else "Refresh data",
                enabled = !refreshing,
                onClick = onRefresh,
            ) {
                Icon(
                    imageVector = JalvoroIcons.Refresh,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                )
            }
            OverviewTopBarAction(
                label = "Open profile and settings",
                onClick = onSettings,
            ) {
                Icon(
                    imageVector = JalvoroIcons.User,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}

@Composable
private fun OverviewTopBarAction(
    label: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.size(48.dp).semantics { contentDescription = label },
        shape = RoundedCornerShape(15.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHighest.copy(alpha = 0.72f),
        contentColor = MaterialTheme.colorScheme.onSurface,
    ) {
        Box(contentAlignment = Alignment.Center, content = { content() })
    }
}

@Composable
internal fun JalvoroOverviewHeroCard(
    totalBalance: Double?,
    accountBalance: Double?,
    portfolioValue: Double?,
    compact: Boolean,
    onIncome: () -> Unit,
    onExpense: () -> Unit,
    onTransfer: () -> Unit,
    onInvest: () -> Unit,
) {
    val primary = MaterialTheme.colorScheme.primary
    val tertiary = MaterialTheme.colorScheme.tertiary
    val shape = RoundedCornerShape(26.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        primary.copy(alpha = 0.28f),
                        tertiary.copy(alpha = 0.16f),
                        MaterialTheme.colorScheme.surfaceContainer,
                    ),
                ),
                shape = shape,
            )
            .border(
                width = 1.dp,
                color = primary.copy(alpha = 0.32f),
                shape = shape,
            )
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = when {
                    totalBalance == null -> "BALANCE UNAVAILABLE"
                    accountBalance == null || portfolioValue == null -> "PARTIAL NET BALANCE"
                    else -> "TOTAL NET BALANCE"
                },
                style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 1.35.sp),
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = redesignPkr(totalBalance),
                modifier = Modifier.fillMaxWidth(),
                style = MaterialTheme.typography.displaySmall.copy(
                    fontSize = when {
                        totalBalance == null -> 28.sp
                        abs(totalBalance) >= 1_000_000_000 -> if (compact) 34.sp else 44.sp
                        else -> if (compact) 40.sp else 48.sp
                    },
                    lineHeight = 46.sp,
                    letterSpacing = (-1.2).sp,
                ),
                fontWeight = FontWeight.Black,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            OverviewBalancePart(
                label = "Accounts",
                value = redesignPkr(accountBalance),
                tone = RedesignTransfer,
                modifier = Modifier.weight(1f),
            )
            OverviewBalancePart(
                label = "Investments",
                value = redesignPkr(portfolioValue),
                tone = RedesignInvestment,
                modifier = Modifier.weight(1f),
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OverviewDockAction("Income", JalvoroIcons.Income, RedesignIncome, onIncome, Modifier.weight(1f))
            OverviewDockAction("Expense", JalvoroIcons.Expenses, RedesignExpense, onExpense, Modifier.weight(1f))
            OverviewDockAction("Transfer", JalvoroIcons.Transfer, RedesignTransfer, onTransfer, Modifier.weight(1f))
            OverviewDockAction("Invest", JalvoroIcons.Investments, RedesignInvestment, onInvest, Modifier.weight(1f))
        }
    }
}

@Composable
private fun OverviewBalancePart(
    label: String,
    value: String,
    tone: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.48f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.52f)),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 13.dp, vertical = 11.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                Surface(modifier = Modifier.size(7.dp), shape = CircleShape, color = tone) {}
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                text = value,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun OverviewDockAction(
    label: String,
    icon: ImageVector,
    tone: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        onClick = onClick,
        modifier = modifier.height(64.dp).semantics { contentDescription = label },
        shape = RoundedCornerShape(15.dp),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.56f),
        contentColor = MaterialTheme.colorScheme.onSurface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(vertical = 9.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(21.dp), tint = tone)
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
            )
        }
    }
}

@Composable
internal fun JalvoroOverviewMonthlyPanel(
    savings: Double?,
    income: Double?,
    expenses: Double?,
    investment: Double?,
) {
    JalvoroSurfaceCard {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp)) {
            Text(
                text = "This month",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                text = "Verified month-to-date totals",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(8.dp))
            OverviewSummaryRow("Net savings", savings, if ((savings ?: 0.0) < 0) RedesignExpense else RedesignIncome)
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            OverviewSummaryRow("Income", income, RedesignIncome)
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            OverviewSummaryRow("Expenses", expenses, RedesignExpense)
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            OverviewSummaryRow("Investment contributions", investment, RedesignInvestment)
        }
    }
}

@Composable
private fun OverviewSummaryRow(label: String, value: Double?, tone: Color) {
    Row(
        modifier = Modifier.fillMaxWidth().heightIn(min = 58.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Surface(
            modifier = Modifier.size(36.dp),
            shape = RoundedCornerShape(12.dp),
            color = tone.copy(alpha = 0.13f),
            contentColor = tone,
        ) {
            Box(contentAlignment = Alignment.Center) {
                Surface(modifier = Modifier.size(9.dp), shape = CircleShape, color = tone) {}
            }
        }
        Text(
            text = label,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = redesignPkr(value),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.ExtraBold,
            textAlign = TextAlign.End,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
internal fun JalvoroOverviewTodayPanel(
    income: Double?,
    expenses: Double?,
    net: Double?,
    daysRemaining: Int,
) {
    JalvoroSurfaceCard {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(
                text = "Today",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                text = "Live activity and month timing",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                OverviewTodayCell("Income", redesignPkr(income), "Recorded today", RedesignIncome, Modifier.weight(1f))
                OverviewTodayCell("Expenses", redesignPkr(expenses), "Refund adjusted", RedesignExpense, Modifier.weight(1f))
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            Row(modifier = Modifier.fillMaxWidth()) {
                OverviewTodayCell(
                    "Net",
                    redesignPkr(net),
                    "Income minus expenses",
                    when {
                        net == null -> RedesignTransfer
                        net > 0 -> RedesignIncome
                        net < 0 -> RedesignExpense
                        else -> RedesignTransfer
                    },
                    Modifier.weight(1f),
                )
                OverviewTodayCell(
                    "Month left",
                    daysRemaining.toString(),
                    if (daysRemaining == 1) "Day remaining" else "Days remaining",
                    RedesignTransfer,
                    Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun OverviewTodayCell(
    label: String,
    value: String,
    helper: String,
    tone: Color,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.padding(horizontal = 8.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            Surface(modifier = Modifier.size(7.dp), shape = CircleShape, color = tone) {}
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.ExtraBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = helper,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
        )
    }
}

private fun redesignPkr(value: Double?): String {
    if (value == null || !value.isFinite()) return "Unavailable"
    val fractionDigits = if (value % 1.0 == 0.0) 0 else 2
    val formatted = NumberFormat.getNumberInstance(Locale.US).apply {
        minimumFractionDigits = fractionDigits
        maximumFractionDigits = fractionDigits
        isGroupingUsed = true
    }.format(value)
    return "Rs $formatted"
}
