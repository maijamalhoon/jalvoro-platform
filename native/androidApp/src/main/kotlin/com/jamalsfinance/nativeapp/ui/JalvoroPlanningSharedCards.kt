package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
internal fun PlanningHeroCard(
    icon: ImageVector,
    eyebrow: String,
    primary: String,
    secondary: String,
    detail: String,
    progress: Double,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.primaryContainer,
        contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, Modifier.size(22.dp))
                Spacer(Modifier.size(9.dp))
                Text(eyebrow, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            }
            Text(primary, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            Text(secondary, style = MaterialTheme.typography.bodyMedium)
            Text(detail, style = MaterialTheme.typography.bodySmall)
            LinearProgressIndicator(
                progress = { progress.coerceIn(0.0, 1.0).toFloat() },
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

internal enum class PlanningTone { Info, Success, Warning, Danger }

@Composable
internal fun PlanningStatusPill(text: String, tone: PlanningTone) {
    val container = when (tone) {
        PlanningTone.Info -> MaterialTheme.colorScheme.primaryContainer
        PlanningTone.Success -> MaterialTheme.colorScheme.tertiaryContainer
        PlanningTone.Warning -> Color(0xFFFBF1DA)
        PlanningTone.Danger -> MaterialTheme.colorScheme.errorContainer
    }
    val content = when (tone) {
        PlanningTone.Info -> MaterialTheme.colorScheme.onPrimaryContainer
        PlanningTone.Success -> MaterialTheme.colorScheme.onTertiaryContainer
        PlanningTone.Warning -> Color(0xFF6F4707)
        PlanningTone.Danger -> MaterialTheme.colorScheme.onErrorContainer
    }
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = container,
        contentColor = content,
    ) {
        Text(
            text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
internal fun PlanningIconTile(icon: ImageVector) {
    Surface(
        shape = RoundedCornerShape(13.dp),
        color = MaterialTheme.colorScheme.primaryContainer,
        contentColor = MaterialTheme.colorScheme.primary,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.padding(10.dp).size(22.dp),
        )
    }
}

@Composable
internal fun PlanningMetric(label: String, value: String, endAligned: Boolean = false) {
    Column(horizontalAlignment = if (endAligned) Alignment.End else Alignment.Start) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = FontWeight.Bold)
    }
}

@Composable
internal fun PlanningHistoryRow(
    icon: ImageVector,
    amount: String,
    metadata: String,
    note: String?,
    removable: Boolean,
    onRemove: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHighest,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(icon, null, Modifier.size(20.dp), tint = MaterialTheme.colorScheme.primary)
            Column(Modifier.weight(1f)) {
                Text(amount, fontWeight = FontWeight.Bold)
                Text(metadata, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                note?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall)
                }
            }
            TextButton(onClick = onRemove, enabled = removable) {
                Text("Remove")
            }
        }
    }
}
