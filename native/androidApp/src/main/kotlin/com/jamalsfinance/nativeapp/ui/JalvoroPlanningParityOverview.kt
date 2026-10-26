package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.goals.GoalsPayablesSnapshot
import kotlin.math.max

@Composable
internal fun JalvoroGoalsParityOverview(snapshot: GoalsPayablesSnapshot) {
    val progress = if (snapshot.totalGoalTarget > 0.0) {
        (snapshot.totalGoalSaved / snapshot.totalGoalTarget).coerceAtLeast(0.0)
    } else {
        0.0
    }
    val remaining = max(snapshot.totalGoalTarget - snapshot.totalGoalSaved, 0.0)
    PlanningParityPulseCard(
        eyebrow = "Goals pulse",
        title = "Savings progress",
        description = "One clear view of what is saved, what remains, and how many goals are complete.",
        progress = progress,
        progressLabel = "Progress",
        progressTone = MaterialTheme.colorScheme.primary,
        metrics = listOf(
            PlanningParityMetric(
                label = "Total target",
                value = formatPkr(snapshot.totalGoalTarget),
                helper = "${snapshot.goals.size} ${if (snapshot.goals.size == 1) "goal" else "goals"}",
                icon = JalvoroIcons.Target,
                tone = MaterialTheme.colorScheme.primary,
            ),
            PlanningParityMetric(
                label = "Saved",
                value = formatPkr(snapshot.totalGoalSaved),
                helper = if (remaining > 0.0) "${formatPkr(remaining)} remaining" else "Target covered",
                icon = JalvoroIcons.Wallet,
                tone = Color(0xFF147A55),
            ),
            PlanningParityMetric(
                label = "Completed",
                value = "${snapshot.completedGoals} / ${snapshot.goals.size}",
                helper = if (snapshot.completedGoals == snapshot.goals.size && snapshot.goals.isNotEmpty()) {
                    "All goals reached"
                } else {
                    "${max(snapshot.goals.size - snapshot.completedGoals, 0)} active"
                },
                icon = JalvoroIcons.Success,
                tone = Color(0xFF147A55),
            ),
        ),
    )
}

@Composable
internal fun JalvoroPayablesParityOverview(
    snapshot: GoalsPayablesSnapshot,
    overdueCount: Int,
) {
    val progress = if (snapshot.totalPayableValue > 0.0) {
        (snapshot.totalPayablePaid / snapshot.totalPayableValue).coerceIn(0.0, 1.0)
    } else {
        0.0
    }
    PlanningParityPulseCard(
        eyebrow = "Repayment pulse",
        title = "Payables at a glance",
        description = "Track what is settled, what remains, and which payments need attention.",
        progress = progress,
        progressLabel = "Repaid",
        progressTone = Color(0xFFB57816),
        metrics = listOf(
            PlanningParityMetric(
                label = "Total value",
                value = formatPkr(snapshot.totalPayableValue),
                helper = "${snapshot.payables.size} ${if (snapshot.payables.size == 1) "payable" else "payables"}",
                icon = JalvoroIcons.Wallet,
                tone = MaterialTheme.colorScheme.onSurface,
            ),
            PlanningParityMetric(
                label = "Already paid",
                value = formatPkr(snapshot.totalPayablePaid),
                helper = "${(progress * 100.0).formatOneDecimal()}% settled",
                icon = JalvoroIcons.Success,
                tone = Color(0xFF147A55),
            ),
            PlanningParityMetric(
                label = "Still remaining",
                value = formatPkr(snapshot.totalPayableRemaining),
                helper = if (overdueCount > 0) "$overdueCount overdue" else "No overdue balance",
                icon = JalvoroIcons.Warning,
                tone = if (overdueCount > 0) MaterialTheme.colorScheme.error else Color(0xFFB57816),
            ),
        ),
    )
}

private data class PlanningParityMetric(
    val label: String,
    val value: String,
    val helper: String,
    val icon: ImageVector,
    val tone: Color,
)

@Composable
private fun PlanningParityPulseCard(
    eyebrow: String,
    title: String,
    description: String,
    progress: Double,
    progressLabel: String,
    progressTone: Color,
    metrics: List<PlanningParityMetric>,
) {
    val normalized = progress.coerceIn(0.0, 1.0).toFloat()
    val animated = rememberJalvoroAnimatedProgress(
        target = normalized,
        label = "planning-parity-$eyebrow",
    )
    JalvoroSurfaceCard {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            val wide = maxWidth >= 720.dp
            if (wide) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(20.dp),
                    horizontalArrangement = Arrangement.spacedBy(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    PlanningParityPulseIntro(
                        eyebrow = eyebrow,
                        title = title,
                        description = description,
                        progress = animated,
                        progressLabel = progressLabel,
                        progressTone = progressTone,
                        modifier = Modifier.weight(0.78f),
                    )
                    PlanningParityMetrics(
                        metrics = metrics,
                        horizontal = true,
                        modifier = Modifier.weight(1.22f),
                    )
                }
            } else {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(18.dp),
                ) {
                    PlanningParityPulseIntro(
                        eyebrow = eyebrow,
                        title = title,
                        description = description,
                        progress = animated,
                        progressLabel = progressLabel,
                        progressTone = progressTone,
                    )
                    PlanningParityMetrics(
                        metrics = metrics,
                        horizontal = false,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}

@Composable
private fun PlanningParityPulseIntro(
    eyebrow: String,
    title: String,
    description: String,
    progress: Float,
    progressLabel: String,
    progressTone: Color,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PlanningParityProgressRing(
            progress = progress,
            label = progressLabel,
            tone = progressTone,
        )
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Text(
                text = eyebrow.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Black,
                color = progressTone,
            )
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun PlanningParityProgressRing(
    progress: Float,
    label: String,
    tone: Color,
) {
    val track = MaterialTheme.colorScheme.surfaceContainerHighest
    Box(
        modifier = Modifier
            .size(116.dp)
            .semantics {
                progressBarRangeInfo = ProgressBarRangeInfo(progress, 0f..1f)
            },
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
            drawArc(
                color = tone,
                startAngle = -90f,
                sweepAngle = progress.coerceIn(0f, 1f) * 360f,
                useCenter = false,
                style = Stroke(stroke, cap = StrokeCap.Round),
            )
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "${(progress * 100f).toDouble().formatOneDecimal()}%",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
            )
            Text(
                text = label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun PlanningParityMetrics(
    metrics: List<PlanningParityMetric>,
    horizontal: Boolean,
    modifier: Modifier = Modifier,
) {
    if (horizontal) {
        Row(
            modifier = modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            metrics.forEach { metric ->
                PlanningParityMetricTile(metric, Modifier.weight(1f))
            }
        }
    } else {
        Column(
            modifier = modifier,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            metrics.forEach { metric ->
                PlanningParityMetricTile(metric, Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun PlanningParityMetricTile(
    metric: PlanningParityMetric,
    modifier: Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 15.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = metric.icon,
                    contentDescription = null,
                    modifier = Modifier.size(17.dp),
                    tint = metric.tone,
                )
                Text(
                    text = metric.label.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                text = metric.value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = metric.tone,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = metric.helper,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

private fun Double.formatOneDecimal(): String = String.format(java.util.Locale.US, "%.1f", this)
