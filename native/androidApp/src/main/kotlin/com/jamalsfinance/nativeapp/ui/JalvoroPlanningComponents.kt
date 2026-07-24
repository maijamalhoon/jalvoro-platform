package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
internal fun PlanningFormDialog(
    title: String,
    icon: ImageVector,
    onDismiss: () -> Unit,
    content: @Composable () -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier.fillMaxWidth().widthIn(max = 560.dp),
            shape = RoundedCornerShape(26.dp),
            color = MaterialTheme.colorScheme.surfaceContainer,
            tonalElevation = 0.dp,
        ) {
            Column(
                modifier = Modifier.fillMaxWidth()
                    .heightIn(max = 720.dp)
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    PlanningIconTile(icon)
                    Text(
                        title,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f).semantics { heading() },
                    )
                    JalvoroIconAction(
                        icon = JalvoroIcons.Close,
                        label = "Close",
                        onClick = onDismiss,
                    )
                }
                content()
            }
        }
    }
}

@Composable
internal fun ConfirmPlanningAction(
    title: String,
    text: String,
    confirmLabel: String,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Icon(
                imageVector = JalvoroIcons.Warning,
                contentDescription = null,
            )
        },
        title = { Text(title) },
        text = { Text(text) },
        confirmButton = {
            Button(onClick = onConfirm, shape = RoundedCornerShape(13.dp)) {
                Text(confirmLabel)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
        shape = RoundedCornerShape(24.dp),
    )
}

@Composable
internal fun PlanningEmpty(
    icon: ImageVector,
    title: String,
    body: String,
    action: String? = null,
    onAction: (() -> Unit)? = null,
) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            PlanningIconTile(icon)
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { heading() },
            )
            Text(
                body,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium,
            )
            if (action != null && onAction != null) {
                Button(
                    onClick = onAction,
                    shape = RoundedCornerShape(13.dp),
                ) {
                    Text(action)
                }
            }
        }
    }
}

@Composable
internal fun PlanningProgress() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator()
    }
}

internal fun formatPkr(value: Number): String {
    val amount = value.toDouble()
    return NumberFormat.getCurrencyInstance(Locale("en", "PK")).apply {
        currency = java.util.Currency.getInstance("PKR")
        maximumFractionDigits = 2
    }.format(if (amount.isFinite()) amount else 0.0)
}

internal fun Number.editable(): String {
    val value = toDouble()
    return if (!value.isFinite()) "" else value.toString().removeSuffix(".0")
}

internal fun todayIso(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
