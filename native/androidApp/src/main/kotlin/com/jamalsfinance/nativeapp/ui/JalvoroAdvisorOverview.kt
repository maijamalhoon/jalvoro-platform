package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.reports.AiInsight
import com.jamalsfinance.shared.reports.AiInsightsPayload
import com.jamalsfinance.shared.reports.AiSuggestedAction
import com.jamalsfinance.shared.reports.ReportSummary
import kotlin.math.max

@Composable
internal fun JalvoroAdvisorOverview(
    insights: AiInsightsPayload,
    loading: Boolean,
) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                JalvoroAdvisorHealthRing(
                    score = insights.healthScore,
                    loading = loading,
                )
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(5.dp),
                ) {
                    Text(
                        text = "FINANCIAL HEALTH",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Text(
                        text = if (loading && insights.empty) "Reviewing records" else insights.healthLabel,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = if (insights.aiAvailable) {
                            "Server AI reviewed a verified, owner-scoped finance summary."
                        } else {
                            "Secure deterministic rules are providing finance guidance."
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            if (insights.summaryCards.isNotEmpty()) {
                BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
                    if (maxWidth < 560.dp) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            insights.summaryCards.take(4).forEach { card ->
                                JalvoroAdvisorMetric(
                                    label = card.label,
                                    value = card.value,
                                    helper = card.caption,
                                    tone = jalvoroAdvisorTone(card.tone),
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            }
                        }
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            insights.summaryCards.take(4).chunked(2).forEach { row ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    row.forEach { card ->
                                        JalvoroAdvisorMetric(
                                            label = card.label,
                                            value = card.value,
                                            helper = card.caption,
                                            tone = jalvoroAdvisorTone(card.tone),
                                            modifier = Modifier.weight(1f),
                                        )
                                    }
                                    if (row.size == 1) Spacer(Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            } else {
                Text(
                    text = "Verified summary cards will appear after enough finance activity is available.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun JalvoroAdvisorHealthRing(
    score: Int,
    loading: Boolean,
) {
    val normalized = score.coerceIn(0, 100)
    val tone = when {
        normalized >= 75 -> Color(0xFF17815F)
        normalized >= 50 -> Color(0xFFB57816)
        else -> MaterialTheme.colorScheme.error
    }
    val track = MaterialTheme.colorScheme.surfaceContainerHighest

    Box(
        modifier = Modifier.size(100.dp),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val stroke = 9.dp.toPx()
            drawArc(
                color = track,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                style = Stroke(stroke, cap = StrokeCap.Round),
            )
            if (!loading || normalized > 0) {
                drawArc(
                    color = tone,
                    startAngle = -90f,
                    sweepAngle = normalized * 3.6f,
                    useCenter = false,
                    style = Stroke(stroke, cap = StrokeCap.Round),
                )
            }
        }
        if (loading && normalized == 0) {
            CircularProgressIndicator(Modifier.size(30.dp), strokeWidth = 3.dp)
        } else {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = normalized.toString(),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Black,
                )
                Text(
                    text = "/ 100",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun JalvoroAdvisorMetric(
    label: String,
    value: String,
    helper: String,
    tone: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(13.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Text(
                text = label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Black,
                color = tone,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 3,
            )
            Text(
                text = helper,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
internal fun JalvoroAdvisorBriefing(
    insights: AiInsightsPayload,
    loading: Boolean,
    onRefresh: () -> Unit,
) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        text = "Financial briefing",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = if (insights.aiAvailable) {
                            "Personalized observations from the server-side provider."
                        } else {
                            "Safe local guidance while the external provider is unavailable."
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Spacer(Modifier.width(10.dp))
                OutlinedButton(
                    onClick = onRefresh,
                    enabled = !loading,
                    shape = RoundedCornerShape(999.dp),
                ) {
                    Icon(
                        imageVector = JalvoroIcons.Refresh,
                        contentDescription = null,
                        modifier = Modifier.size(17.dp),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text("Regenerate")
                }
            }

            if (!insights.aiAvailable) {
                JalvoroFeedbackCard(
                    message = "The AI provider is currently unavailable. Deterministic finance guidance remains active and no saved records were changed.",
                    tone = JalvoroFeedbackTone.Warning,
                )
            }

            if (insights.insights.isEmpty()) {
                JalvoroAdvisorEmpty(
                    icon = JalvoroIcons.Reports,
                    title = "Your briefing is ready to grow",
                    message = "Add finance records and refresh to generate grounded observations. No insight has been invented.",
                )
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(13.dp)) {
                    insights.insights.forEach { insight ->
                        JalvoroAdvisorInsightRow(insight)
                    }
                }
            }

            Text(
                text = "Next best moves",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            if (insights.suggestedActions.isEmpty()) {
                JalvoroAdvisorEmpty(
                    icon = JalvoroIcons.Target,
                    title = "No next action yet",
                    message = "Suggested actions will appear when verified finance activity supports them.",
                )
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    insights.suggestedActions.forEachIndexed { index, action ->
                        JalvoroAdvisorActionRow(
                            index = index + 1,
                            action = action,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun JalvoroAdvisorInsightRow(insight: AiInsight) {
    val tone = jalvoroAdvisorTone(insight.type)
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Surface(
            shape = CircleShape,
            color = tone.copy(alpha = 0.12f),
            contentColor = tone,
        ) {
            Icon(
                imageVector = when (insight.type.trim().lowercase()) {
                    "positive" -> JalvoroIcons.Income
                    "warning" -> JalvoroIcons.Warning
                    else -> JalvoroIcons.Investments
                },
                contentDescription = null,
                modifier = Modifier.padding(9.dp).size(18.dp),
            )
        }
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text(insight.title, fontWeight = FontWeight.Bold)
            Text(
                text = insight.message,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun JalvoroAdvisorActionRow(
    index: Int,
    action: AiSuggestedAction,
) {
    val tone = jalvoroAdvisorTone(action.priority)
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(11.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.primary,
            ) {
                Box(
                    modifier = Modifier.size(30.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = index.toString(),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Black,
                    )
                }
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top,
                ) {
                    Text(
                        text = action.title,
                        modifier = Modifier.weight(1f),
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(999.dp),
                        color = tone.copy(alpha = 0.12f),
                        contentColor = tone,
                    ) {
                        Text(
                            text = action.priority.uppercase(),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Black,
                        )
                    }
                }
                Text(
                    text = action.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
internal fun JalvoroAdvisorContext(
    report: ReportSummary,
    money: (Double) -> String,
) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Text(
                text = "Verified finance context",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "These sections are calculated from the selected report range and are not generated by the language model.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Text(
                text = "Spending focus",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
            )
            when {
                !report.financialDataAvailable -> JalvoroAdvisorContextUnavailable("Spending data is unavailable.")
                report.expenseCategories.isEmpty() -> JalvoroAdvisorContextUnavailable("Category totals appear after expenses are categorized.")
                else -> {
                    val top = report.expenseCategories.take(4)
                    val maximum = top.maxOfOrNull { it.amount }?.coerceAtLeast(1.0) ?: 1.0
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        top.forEach { category ->
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text(
                                        text = category.name,
                                        modifier = Modifier.weight(1f),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                    Spacer(Modifier.width(10.dp))
                                    Text(money(category.amount), fontWeight = FontWeight.Bold)
                                }
                                LinearProgressIndicator(
                                    progress = { (category.amount / maximum).toFloat().coerceIn(0f, 1f) },
                                    modifier = Modifier.fillMaxWidth().height(7.dp),
                                    strokeCap = StrokeCap.Round,
                                )
                            }
                        }
                    }
                }
            }

            Text(
                text = "Recent pulse",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
            )
            when {
                !report.financialDataAvailable -> JalvoroAdvisorContextUnavailable("Cash-flow data is unavailable.")
                report.cashFlow.isEmpty() -> JalvoroAdvisorContextUnavailable("Recent trends appear after you add transactions.")
                else -> {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        report.cashFlow.takeLast(3).forEach { point ->
                            val positive = point.net >= 0
                            Surface(
                                shape = RoundedCornerShape(15.dp),
                                color = MaterialTheme.colorScheme.surfaceContainerLow,
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxWidth().padding(13.dp),
                                    verticalArrangement = Arrangement.spacedBy(5.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            text = point.label,
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.Bold,
                                        )
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .background(
                                                    if (positive) Color(0xFF17815F) else MaterialTheme.colorScheme.error,
                                                    CircleShape,
                                                ),
                                        )
                                    }
                                    Text(
                                        text = money(point.net),
                                        fontWeight = FontWeight.Bold,
                                        color = if (positive) Color(0xFF17815F) else MaterialTheme.colorScheme.error,
                                    )
                                    Text(
                                        text = "${money(point.income)} in · ${money(point.expenses)} out",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
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
private fun JalvoroAdvisorContextUnavailable(message: String) {
    Text(
        text = message,
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
internal fun JalvoroAdvisorSafetyBoundary(
    aiAvailable: Boolean,
    provider: String,
    model: String,
    generatedAt: String?,
) {
    val providerReady = provider.isNotBlank() && model.isNotBlank()
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(9.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(9.dp),
            ) {
                Icon(
                    imageVector = JalvoroIcons.Privacy,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                )
                Text(
                    text = "Privacy and guidance",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
            JalvoroAdvisorKeyValue("Data used", "Your authenticated finance summary only")
            JalvoroAdvisorKeyValue(
                "Guidance mode",
                if (aiAvailable && providerReady) "Secure server guidance" else "Private deterministic fallback",
            )
            generatedAt?.takeIf(String::isNotBlank)?.let {
                JalvoroAdvisorKeyValue("Last updated", it)
            }
            Text(
                text = "Your saved records are not changed by the advisor. Verify guidance before major financial, tax, legal or investment decisions.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun JalvoroAdvisorKeyValue(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            text = label,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.width(12.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.SemiBold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun JalvoroAdvisorEmpty(
    icon: ImageVector,
    title: String,
    message: String,
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(7.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(28.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(title, fontWeight = FontWeight.Bold)
        Text(
            text = message,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
internal fun jalvoroAdvisorTone(raw: String): Color {
    return when (raw.trim().lowercase()) {
        "success", "positive", "good", "low" -> Color(0xFF17815F)
        "danger", "negative", "critical", "high", "loss" -> MaterialTheme.colorScheme.error
        "warning", "medium", "caution" -> Color(0xFFB57816)
        "neutral" -> MaterialTheme.colorScheme.onSurfaceVariant
        else -> MaterialTheme.colorScheme.primary
    }
}
