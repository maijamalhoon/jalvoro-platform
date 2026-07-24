package com.jamalsfinance.nativeapp.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

const val JALVORO_NAME = "JALVORO"
const val JALVORO_PERSONAL = "Jalvoro Personal"
const val JALVORO_TAGLINE = "Everything you run. One place."

@Composable
fun JalvoroBrandMark(
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
) {
    Canvas(
        modifier = modifier.semantics {
            if (contentDescription != null) this.contentDescription = contentDescription
        },
    ) {
        val scale = size.minDimension / 64f
        drawRoundRect(
            color = Color(0xFF07365F),
            cornerRadius = CornerRadius(16f * scale, 16f * scale),
        )

        val upper = Path().apply {
            moveTo(18f * scale, 18f * scale)
            lineTo(18f * scale, 36f * scale)
            cubicTo(
                18f * scale,
                44f * scale,
                23f * scale,
                48f * scale,
                32f * scale,
                48f * scale,
            )
            cubicTo(
                41f * scale,
                48f * scale,
                46f * scale,
                44f * scale,
                46f * scale,
                36f * scale,
            )
            lineTo(46f * scale, 18f * scale)
        }
        drawPath(
            path = upper,
            color = Color.White,
            style = Stroke(
                width = 5f * scale,
                cap = StrokeCap.Round,
                join = StrokeJoin.Round,
            ),
        )

        val lower = Path().apply {
            moveTo(22f * scale, 31f * scale)
            lineTo(32f * scale, 41f * scale)
            lineTo(42f * scale, 31f * scale)
        }
        drawPath(
            path = lower,
            color = Color(0xFF7DD3FC),
            style = Stroke(
                width = 5f * scale,
                cap = StrokeCap.Round,
                join = StrokeJoin.Round,
            ),
        )
    }
}

@Composable
fun JalvoroBrandLockup(
    modifier: Modifier = Modifier,
    subtitle: String = JALVORO_PERSONAL,
    compact: Boolean = false,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(if (compact) 10.dp else 12.dp),
    ) {
        JalvoroBrandMark(
            modifier = Modifier.size(if (compact) 38.dp else 46.dp),
            contentDescription = "JALVORO logo",
        )
        Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
            Text(
                text = JALVORO_NAME,
                style = if (compact) MaterialTheme.typography.titleMedium else MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
fun JalvoroSurfaceCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = modifier.jalvoroAnimateContentSize(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        content()
    }
}

@Composable
fun JalvoroIconAction(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    IconButton(
        onClick = onClick,
        modifier = modifier.semantics { contentDescription = label },
        enabled = enabled,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(21.dp),
        )
    }
}

enum class JalvoroFeedbackTone {
    Info,
    Success,
    Warning,
    Danger,
}

@Composable
fun JalvoroFeedbackCard(
    message: String,
    tone: JalvoroFeedbackTone,
    modifier: Modifier = Modifier,
) {
    val container = when (tone) {
        JalvoroFeedbackTone.Info -> MaterialTheme.colorScheme.primaryContainer
        JalvoroFeedbackTone.Success -> MaterialTheme.colorScheme.tertiaryContainer
        JalvoroFeedbackTone.Warning -> Color(0xFFFBF1DA)
        JalvoroFeedbackTone.Danger -> MaterialTheme.colorScheme.errorContainer
    }
    val contentColor = when (tone) {
        JalvoroFeedbackTone.Info -> MaterialTheme.colorScheme.onPrimaryContainer
        JalvoroFeedbackTone.Success -> MaterialTheme.colorScheme.onTertiaryContainer
        JalvoroFeedbackTone.Warning -> Color(0xFF6F4707)
        JalvoroFeedbackTone.Danger -> MaterialTheme.colorScheme.onErrorContainer
    }
    Surface(
        modifier = modifier.fillMaxWidth().jalvoroAnimateContentSize(),
        shape = RoundedCornerShape(14.dp),
        color = container,
        contentColor = contentColor,
    ) {
        JalvoroAnimatedSwap(
            targetState = message,
            label = "jalvoro-feedback-message",
        ) { currentMessage ->
            Text(
                text = currentMessage,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

data class JalvoroNavigationDestination(
    val label: String,
    val icon: ImageVector,
    val selected: Boolean,
    val onClick: () -> Unit,
)

@Composable
fun JalvoroNavigationBar(
    destinations: List<JalvoroNavigationDestination>,
    modifier: Modifier = Modifier,
) {
    val motion = LocalJalvoroMotion.current
    NavigationBar(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        tonalElevation = 0.dp,
    ) {
        destinations.forEach { destination ->
            val iconScale by animateFloatAsState(
                targetValue = if (destination.selected) 1f else 0.94f,
                animationSpec = if (motion.enabled) {
                    tween(
                        durationMillis = motion.fastMillis,
                        easing = JalvoroMotionEasing,
                    )
                } else {
                    snap()
                },
                label = "${destination.label}-navigation-scale",
            )
            NavigationBarItem(
                selected = destination.selected,
                onClick = destination.onClick,
                icon = {
                    Icon(
                        imageVector = destination.icon,
                        contentDescription = destination.label,
                        modifier = Modifier
                            .size(22.dp)
                            .graphicsLayer {
                                scaleX = iconScale
                                scaleY = iconScale
                            },
                    )
                },
                label = {
                    Text(
                        text = destination.label,
                        maxLines = 1,
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.primary,
                    selectedTextColor = MaterialTheme.colorScheme.primary,
                    indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                ),
            )
        }
    }
}
