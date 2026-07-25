package com.jamalsfinance.nativeapp.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

const val JALVORO_NAME = "JALVORO"
const val JALVORO_PERSONAL = "PERSONAL WORKSPACE"
const val JALVORO_TAGLINE = "Everything you run. One place."

/** Website-matched blue CircleDollarSign brand mark. */
@Composable
fun JalvoroBrandMark(
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
) {
    Surface(
        modifier = modifier.semantics {
            if (contentDescription != null) this.contentDescription = contentDescription
        },
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.primary,
        contentColor = Color.White,
        shadowElevation = 6.dp,
    ) {
        Canvas(modifier = Modifier.fillMaxSize().padding(9.dp)) {
            val stroke = 1.9.dp.toPx()
            drawCircle(
                color = Color.White,
                radius = size.minDimension * 0.44f,
                style = Stroke(width = stroke),
            )
            val centerX = size.width / 2f
            drawLine(
                color = Color.White,
                start = Offset(centerX, size.height * 0.20f),
                end = Offset(centerX, size.height * 0.80f),
                strokeWidth = stroke,
                cap = StrokeCap.Round,
            )
            val dollar = Path().apply {
                moveTo(size.width * 0.68f, size.height * 0.34f)
                cubicTo(
                    size.width * 0.58f,
                    size.height * 0.24f,
                    size.width * 0.35f,
                    size.height * 0.26f,
                    size.width * 0.34f,
                    size.height * 0.40f,
                )
                cubicTo(
                    size.width * 0.34f,
                    size.height * 0.53f,
                    size.width * 0.68f,
                    size.height * 0.45f,
                    size.width * 0.67f,
                    size.height * 0.62f,
                )
                cubicTo(
                    size.width * 0.66f,
                    size.height * 0.76f,
                    size.width * 0.42f,
                    size.height * 0.78f,
                    size.width * 0.31f,
                    size.height * 0.68f,
                )
            }
            drawPath(
                path = dollar,
                color = Color.White,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
        }
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
            modifier = Modifier.size(if (compact) 40.dp else 46.dp),
            contentDescription = "JALVORO logo",
        )
        Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
            Text(
                text = JALVORO_NAME,
                style = if (compact) MaterialTheme.typography.titleMedium else MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                letterSpacing = (-0.25).sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = subtitle.uppercase(),
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = if (compact) 9.sp else 10.sp,
                    letterSpacing = if (compact) 1.35.sp else 1.5.sp,
                ),
                fontWeight = FontWeight.Bold,
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
