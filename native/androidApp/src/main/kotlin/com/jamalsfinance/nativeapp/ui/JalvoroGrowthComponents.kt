package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

internal val GrowthProfit = Color(0xFF16856B)
internal val GrowthExpense = Color(0xFFE35D6A)
internal val GrowthInvestment = Color(0xFF6849B8)
internal val GrowthAmber = Color(0xFFE69A2D)
internal val GrowthBlue = Color(0xFF3B82F6)
internal val GrowthSlate = Color(0xFF64748B)
internal val GrowthPalette = listOf(
    GrowthInvestment,
    GrowthProfit,
    GrowthAmber,
    GrowthBlue,
    GrowthExpense,
    GrowthSlate,
)

@Composable
internal fun GrowthSectionHeader(
    icon: ImageVector,
    eyebrow: String,
    title: String,
    description: String,
    modifier: Modifier = Modifier,
    trailing: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Surface(
            shape = RoundedCornerShape(15.dp),
            color = MaterialTheme.colorScheme.primaryContainer,
            contentColor = MaterialTheme.colorScheme.primary,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.padding(10.dp).size(21.dp),
            )
        }
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text(
                text = eyebrow.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Black,
            )
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
        trailing?.invoke()
    }
}

@Composable
internal fun GrowthMetricTile(
    label: String,
    value: String,
    helper: String,
    modifier: Modifier = Modifier,
    tone: GrowthMetricTone = GrowthMetricTone.Default,
) {
    val valueColor = when (tone) {
        GrowthMetricTone.Default -> MaterialTheme.colorScheme.onSurface
        GrowthMetricTone.Positive -> GrowthProfit
        GrowthMetricTone.Negative -> MaterialTheme.colorScheme.error
    }
    Surface(
        modifier = modifier.jalvoroAnimateContentSize(),
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 13.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Bold,
            )
            JalvoroAnimatedSwap(
                targetState = value,
                label = "$label-growth-value",
            ) { currentValue ->
                Text(
                    text = currentValue,
                    style = MaterialTheme.typography.titleMedium,
                    color = valueColor,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            JalvoroAnimatedSwap(
                targetState = helper,
                label = "$label-growth-helper",
            ) { currentHelper ->
                Text(
                    text = currentHelper,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

internal enum class GrowthMetricTone { Default, Positive, Negative }

@Composable
internal fun GrowthStatusPill(
    label: String,
    positive: Boolean? = null,
    modifier: Modifier = Modifier,
) {
    val container = when (positive) {
        true -> GrowthProfit.copy(alpha = 0.12f)
        false -> MaterialTheme.colorScheme.errorContainer
        null -> MaterialTheme.colorScheme.surfaceContainerLow
    }
    val content = when (positive) {
        true -> GrowthProfit
        false -> MaterialTheme.colorScheme.error
        null -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Surface(
        modifier = modifier.jalvoroAnimateContentSize(),
        shape = RoundedCornerShape(999.dp),
        color = container,
        contentColor = content,
    ) {
        JalvoroAnimatedSwap(
            targetState = label,
            label = "growth-status-pill",
        ) { currentLabel ->
            Text(
                text = currentLabel,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
internal fun GrowthFormDialog(
    title: String,
    icon: ImageVector,
    onDismiss: () -> Unit,
    dismissEnabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    Dialog(onDismissRequest = { if (dismissEnabled) onDismiss() }) {
        JalvoroEntrance(
            key = "growth-dialog:$title",
            modifier = Modifier.fillMaxWidth(),
        ) {
            Surface(
                modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp),
                shape = RoundedCornerShape(26.dp),
                color = MaterialTheme.colorScheme.surfaceContainer,
                tonalElevation = 0.dp,
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 760.dp)
                        .verticalScroll(rememberScrollState())
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Surface(
                            shape = RoundedCornerShape(15.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            contentColor = MaterialTheme.colorScheme.primary,
                        ) {
                            Icon(icon, null, Modifier.padding(10.dp).size(21.dp))
                        }
                        Text(
                            text = title,
                            modifier = Modifier.weight(1f).semantics { heading() },
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                        JalvoroIconAction(
                            icon = JalvoroIcons.Close,
                            label = "Close",
                            enabled = dismissEnabled,
                            onClick = onDismiss,
                        )
                    }
                    content()
                }
            }
        }
    }
}

@Composable
internal fun GrowthSelectionField(
    label: String,
    options: List<String>,
    selected: String,
    modifier: Modifier = Modifier.fillMaxWidth(),
    placeholder: String = "Select",
    optionLabel: (String) -> String = { it },
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier) {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            enabled = options.isNotEmpty(),
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.Start,
            ) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                val selectedLabel = selected.takeIf(String::isNotBlank)?.let(optionLabel) ?: placeholder
                JalvoroAnimatedSwap(
                    targetState = selectedLabel,
                    label = "$label-growth-selection",
                ) { currentSelection ->
                    Text(
                        text = currentSelection,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(optionLabel(option)) },
                    onClick = {
                        onSelect(option)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
internal fun GrowthEmptyState(
    icon: ImageVector,
    title: String,
    description: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    JalvoroEntrance(key = "growth-empty:$title") {
        JalvoroSurfaceCard {
            Column(
                modifier = Modifier.fillMaxWidth().padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(9.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(icon, null, Modifier.padding(13.dp).size(26.dp))
                }
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
                if (actionLabel != null && onAction != null) {
                    Button(onClick = onAction, shape = RoundedCornerShape(14.dp)) {
                        Text(actionLabel)
                    }
                }
            }
        }
    }
}

@Composable
internal fun GrowthProgress() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

private val investmentPkrFormatter = NumberFormat.getNumberInstance(Locale.forLanguageTag("en-PK")).apply {
    minimumFractionDigits = 0
    maximumFractionDigits = 2
}

internal fun growthFormatPkr(value: Double): String =
    if (value.isFinite()) "Rs ${investmentPkrFormatter.format(value)}" else "Unavailable"

internal fun growthFormatPercent(value: Double): String =
    if (value.isFinite()) {
        "${NumberFormat.getNumberInstance(Locale.US).apply { maximumFractionDigits = 1 }.format(value)}%"
    } else {
        "Unavailable"
    }

internal fun growthFormatQuantity(value: Double): String =
    if (value.isFinite()) {
        NumberFormat.getNumberInstance(Locale.US).apply {
            maximumFractionDigits = if (value >= 1) 4 else 8
        }.format(value)
    } else {
        "Unavailable"
    }

internal fun growthEditableDecimal(value: Double): String =
    if (!value.isFinite()) "" else NumberFormat.getNumberInstance(Locale.US).apply {
        isGroupingUsed = false
        minimumFractionDigits = 0
        maximumFractionDigits = 12
    }.format(value)

internal fun growthTodayDateKey(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
    timeZone = TimeZone.getTimeZone("Asia/Karachi")
}.format(Date())

internal fun growthFormatUtcTimestamp(epochMs: Long): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date(epochMs))
