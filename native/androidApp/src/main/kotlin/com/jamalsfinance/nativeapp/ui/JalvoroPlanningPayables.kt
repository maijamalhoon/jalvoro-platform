package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.finance.SupportedFinanceCurrencies
import com.jamalsfinance.shared.goals.*
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.launch

@Composable
internal fun PayablesScreen(
    snapshot: GoalsPayablesSnapshot,
    onEdit: (NativePayable) -> Unit,
    onPayment: (NativePayable) -> Unit,
    onDelete: (NativePayable) -> Unit,
    onDeletePayment: (LiabilityPayment) -> Unit,
) {
    var filter by remember { mutableStateOf(PayableFilter.All) }
    var search by remember { mutableStateOf("") }
    val today = remember { todayIso() }
    val filtered = snapshot.payables.filter { payable ->
        val status = payable.displayStatus(today)
        val matchesStatus = filter == PayableFilter.All || status.equals(filter.name, ignoreCase = true)
        val text = listOfNotNull(
            payable.row.personName,
            payable.row.itemName,
            payable.row.reason,
            payable.row.notes,
        ).joinToString(" ").lowercase()
        matchesStatus && (search.isBlank() || text.contains(search.trim().lowercase()))
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 110.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            JalvoroEntrance(index = 0, key = "payables-hero") {
                PlanningHeroCard(
                    icon = JalvoroIcons.Wallet,
                    eyebrow = "Repayment progress",
                    primary = formatPkr(snapshot.totalPayableRemaining),
                    secondary = "Remaining balance",
                    detail = "${formatPkr(snapshot.totalPayablePaid)} paid of ${formatPkr(snapshot.totalPayableValue)}",
                    progress = if (snapshot.totalPayableValue > 0) snapshot.totalPayablePaid / snapshot.totalPayableValue else 0.0,
                )
            }
        }
        item {
            JalvoroEntrance(index = 1, key = "payables-search") {
                OutlinedTextField(
                    value = search,
                    onValueChange = { search = it },
                    modifier = Modifier.fillMaxWidth(),
                    leadingIcon = {
                        Icon(
                            imageVector = JalvoroIcons.Search,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                        )
                    },
                    label = { Text("Search payables") },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                )
            }
        }
        item {
            JalvoroEntrance(index = 2, key = "payables-filters") {
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    PayableFilter.entries.forEach { item ->
                        FilterChip(
                            selected = filter == item,
                            onClick = { filter = item },
                            label = { Text(item.name) },
                        )
                    }
                }
            }
        }
        if (filtered.isEmpty()) {
            item {
                JalvoroEntrance(
                    index = 3,
                    key = "payables-empty:${filter.name}:${search.trim()}",
                ) {
                    PlanningEmpty(
                        icon = JalvoroIcons.Search,
                        title = "No matching payables",
                        body = "Change the search or filter, or add a new payable.",
                    )
                }
            }
        } else {
            items(filtered.size, key = { index -> filtered[index].row.id }) { index ->
                val payable = filtered[index]
                JalvoroEntrance(
                    index = (index + 3).coerceAtMost(12),
                    key = "${filter.name}:${search.trim()}:${payable.row.id}",
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    PayableCard(
                        payable = payable,
                        accounts = snapshot.accounts,
                        today = today,
                        onEdit = onEdit,
                        onPayment = onPayment,
                        onDelete = onDelete,
                        onDeletePayment = onDeletePayment,
                    )
                }
            }
        }
    }
}

@Composable
internal fun PayableCard(
    payable: NativePayable,
    accounts: List<ModuleAccount>,
    today: String,
    onEdit: (NativePayable) -> Unit,
    onPayment: (NativePayable) -> Unit,
    onDelete: (NativePayable) -> Unit,
    onDeletePayment: (LiabilityPayment) -> Unit,
) {
    var historyVisible by remember(payable.row.id) { mutableStateOf(false) }
    val status = payable.displayStatus(today)
    val statusTone = when (status) {
        "completed" -> PlanningTone.Success
        "overdue" -> PlanningTone.Danger
        "partial" -> PlanningTone.Warning
        else -> PlanningTone.Info
    }
    val animatedProgress = rememberJalvoroAnimatedProgress(
        target = payable.progress.toFloat(),
        label = "payable-${payable.row.id}-progress",
    )

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
                PlanningIconTile(JalvoroIcons.Wallet)
                Column(Modifier.weight(1f)) {
                    Text(
                        payable.row.personName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.semantics { heading() },
                    )
                    Text(
                        payable.row.reason,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                PlanningStatusPill(
                    text = status.replaceFirstChar { it.uppercase() },
                    tone = statusTone,
                )
            }

            payable.row.itemName?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.bodySmall)
            }

            LinearProgressIndicator(
                progress = { animatedProgress },
                modifier = Modifier.fillMaxWidth(),
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                PlanningMetric("Paid", formatPkr(payable.row.paidAmount))
                PlanningMetric("Remaining", formatPkr(payable.remainingAmount), endAligned = true)
            }

            Text(
                "Original value ${formatPkr(payable.row.originalValue)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            payable.row.dueDate?.takeIf { it.isNotBlank() }?.let {
                Text(
                    "Due $it",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (status == "overdue") MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            payable.linkedAccount?.let {
                Text(
                    "Default account: ${it.name}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            payable.row.notes?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.bodySmall)
            }

            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Button(
                    onClick = { onPayment(payable) },
                    enabled = payable.remainingAmount > 0 && accounts.any { it.status == "active" },
                    shape = RoundedCornerShape(13.dp),
                ) {
                    Icon(JalvoroIcons.Transfer, null, Modifier.size(17.dp))
                    Spacer(Modifier.size(7.dp))
                    Text("Record payment")
                }
                OutlinedButton(
                    onClick = { onEdit(payable) },
                    shape = RoundedCornerShape(13.dp),
                ) {
                    Icon(JalvoroIcons.Settings, null, Modifier.size(17.dp))
                    Spacer(Modifier.size(7.dp))
                    Text("Edit")
                }
                TextButton(onClick = { onDelete(payable) }) {
                    Icon(JalvoroIcons.Warning, null, Modifier.size(17.dp))
                    Spacer(Modifier.size(7.dp))
                    Text("Delete")
                }
            }

            if (payable.payments.isNotEmpty()) {
                OutlinedButton(
                    onClick = { historyVisible = !historyVisible },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(13.dp),
                ) {
                    Icon(JalvoroIcons.Transactions, null, Modifier.size(17.dp))
                    Spacer(Modifier.size(7.dp))
                    Text(if (historyVisible) "Hide payment history" else "Payment history (${payable.payments.size})")
                }
                JalvoroAnimatedReveal(visible = historyVisible) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        payable.payments.forEach { payment ->
                            val accountName = payment.accountId?.let { id ->
                                accounts.firstOrNull { it.id == id }?.name
                            }
                            PlanningHistoryRow(
                                icon = JalvoroIcons.Expenses,
                                amount = formatPkr(payment.amount),
                                metadata = listOfNotNull(payment.paidAt, accountName).joinToString(" • "),
                                note = payment.note,
                                removable = payment.transactionId != null,
                                onRemove = { onDeletePayment(payment) },
                            )
                        }
                    }
                }
            }
        }
    }
}
