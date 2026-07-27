package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.goals.GoalsPayablesSnapshot
import com.jamalsfinance.shared.goals.LiabilityPayment
import com.jamalsfinance.shared.goals.ModuleAccount
import com.jamalsfinance.shared.goals.NativePayable
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

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
    val statusCounts = remember(snapshot.payables, today) {
        snapshot.payables
            .groupingBy { payable -> payable.displayStatus(today) }
            .eachCount()
    }
    val filtered = snapshot.payables.filter { payable ->
        val status = payable.displayStatus(today)
        val matchesStatus = filter == PayableFilter.All ||
            status.equals(filter.name, ignoreCase = true)
        val text = listOfNotNull(
            payable.row.personName,
            payable.row.itemName,
            payable.row.reason,
            payable.row.notes,
            payable.row.status,
        ).joinToString(" ").lowercase()
        matchesStatus && (search.isBlank() || text.contains(search.trim().lowercase()))
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 110.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        if (snapshot.payables.isEmpty()) {
            item {
                JalvoroEntrance(index = 0, key = "payables-empty") {
                    PlanningEmpty(
                        icon = JalvoroIcons.Wallet,
                        title = "No payables yet",
                        body = "Add your first payable to see repayment progress here.",
                    )
                }
            }
        } else {
            item {
                JalvoroEntrance(index = 0, key = "payables-pulse") {
                    PayablesPulseCard(
                        snapshot = snapshot,
                        overdueCount = statusCounts["overdue"] ?: 0,
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
                        placeholder = { Text("Person, item, reason, or notes") },
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
                            val count = if (item == PayableFilter.All) {
                                snapshot.payables.size
                            } else {
                                statusCounts[item.name.lowercase()] ?: 0
                            }
                            FilterChip(
                                selected = filter == item,
                                onClick = { filter = item },
                                label = { Text("${item.name} $count") },
                            )
                        }
                    }
                }
            }

            if (filtered.isEmpty()) {
                item {
                    JalvoroEntrance(
                        index = 3,
                        key = "payables-no-match:${filter.name}:${search.trim()}",
                    ) {
                        PlanningEmpty(
                            icon = JalvoroIcons.Search,
                            title = "No payables found",
                            body = "Try a different person, item, reason, or status filter.",
                        )
                    }
                }
            } else {
                items(
                    items = filtered,
                    key = { payable -> payable.row.id },
                ) { payable ->
                    val index = filtered.indexOf(payable)
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
}

@Composable
private fun PayablesPulseCard(
    snapshot: GoalsPayablesSnapshot,
    overdueCount: Int,
) {
    val progress = if (snapshot.totalPayableValue > 0) {
        (snapshot.totalPayablePaid / snapshot.totalPayableValue).coerceIn(0.0, 1.0)
    } else {
        0.0
    }
    val animatedProgress = rememberJalvoroAnimatedProgress(
        target = progress.toFloat(),
        label = "payables-pulse-progress",
    )

    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                PlanningIconTile(JalvoroIcons.Wallet)
                Column(Modifier.weight(1f)) {
                    Text(
                        text = "Repayment pulse",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Payables at a glance",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.semantics { heading() },
                    )
                }
                PlanningStatusPill(
                    text = "${(progress * 100).toInt()}% repaid",
                    tone = if (overdueCount > 0) PlanningTone.Danger else PlanningTone.Info,
                )
            }

            LinearProgressIndicator(
                progress = { animatedProgress },
                modifier = Modifier.fillMaxWidth(),
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                PayablesPulseMetric(
                    label = "Total value",
                    value = formatPkr(snapshot.totalPayableValue),
                    helper = "${snapshot.payables.size} ${if (snapshot.payables.size == 1) "payable" else "payables"}",
                    modifier = Modifier.weight(1f),
                )
                PayablesPulseMetric(
                    label = "Already paid",
                    value = formatPkr(snapshot.totalPayablePaid),
                    helper = "${(progress * 100).toInt()}% settled",
                    modifier = Modifier.weight(1f),
                )
            }

            PayablesPulseMetric(
                label = "Still remaining",
                value = formatPkr(snapshot.totalPayableRemaining),
                helper = if (overdueCount > 0) {
                    "$overdueCount overdue"
                } else {
                    "No overdue balance"
                },
                modifier = Modifier.fillMaxWidth(),
                danger = overdueCount > 0,
            )
        }
    }
}

@Composable
private fun PayablesPulseMetric(
    label: String,
    value: String,
    helper: String,
    modifier: Modifier,
    danger: Boolean = false,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHighest,
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = if (danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = helper,
                style = MaterialTheme.typography.bodySmall,
                color = if (danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
            )
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
        "partial" -> PlanningTone.Info
        else -> PlanningTone.Warning
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
                        text = buildString {
                            append(payable.row.reason)
                            payable.row.itemName?.takeIf { it.isNotBlank() }?.let { item ->
                                append(" - ")
                                append(item)
                            }
                        },
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                PlanningStatusPill(
                    text = status.replaceFirstChar { character -> character.uppercase() },
                    tone = statusTone,
                )
            }

            payable.row.dueDate?.takeIf { it.isNotBlank() }?.let { dueDate ->
                Text(
                    text = "Due ${formatPayableDate(dueDate)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (status == "overdue") {
                        MaterialTheme.colorScheme.error
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
            }

            Text(
                text = "Paid ${formatPkr(payable.row.paidAmount)}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.tertiary,
            )

            LinearProgressIndicator(
                progress = { animatedProgress },
                modifier = Modifier.fillMaxWidth(),
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                PayableAmountTile(
                    label = "Actual value",
                    value = formatPkr(payable.row.originalValue),
                    modifier = Modifier.weight(1f),
                )
                PayableAmountTile(
                    label = "Remaining",
                    value = formatPkr(payable.remainingAmount),
                    modifier = Modifier.weight(1f),
                    warning = payable.remainingAmount > 0,
                )
            }

            payable.linkedAccount?.let { account ->
                Text(
                    text = "Default account: ${account.name}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            payable.row.notes?.takeIf { it.isNotBlank() }?.let { notes ->
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHighest,
                ) {
                    Text(
                        text = notes,
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
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

            payable.row.createdAt?.let { createdAt ->
                Text(
                    text = "Added ${formatPayableDate(createdAt)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            OutlinedButton(
                onClick = { historyVisible = !historyVisible },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(13.dp),
            ) {
                Icon(JalvoroIcons.Transactions, null, Modifier.size(17.dp))
                Spacer(Modifier.size(7.dp))
                Text(
                    if (historyVisible) {
                        "Hide payment history"
                    } else {
                        "Payment history (${payable.payments.size})"
                    },
                )
            }

            JalvoroAnimatedReveal(visible = historyVisible) {
                if (payable.payments.isEmpty()) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        color = MaterialTheme.colorScheme.surfaceContainerHighest,
                    ) {
                        Text(
                            text = "No payments recorded yet.",
                            modifier = Modifier.padding(12.dp),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        payable.payments.forEach { payment ->
                            val accountName = payment.accountId?.let { id ->
                                accounts.firstOrNull { it.id == id }?.name
                            } ?: "Account removed"
                            PlanningHistoryRow(
                                icon = JalvoroIcons.Expenses,
                                amount = formatPkr(payment.amount),
                                metadata = listOf(
                                    formatPayableDate(payment.paidAt),
                                    accountName,
                                ).joinToString(" • "),
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

@Composable
private fun PayableAmountTile(
    label: String,
    value: String,
    modifier: Modifier,
    warning: Boolean = false,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHighest,
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = if (warning) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

private fun formatPayableDate(value: String): String {
    val raw = value.take(10)
    if (!raw.matches(Regex("""\d{4}-\d{2}-\d{2}"""))) {
        return value
    }
    val input = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        isLenient = false
        timeZone = TimeZone.getTimeZone("UTC")
    }
    val output = SimpleDateFormat("MMM d, yyyy", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    return runCatching { input.parse(raw) }
        .getOrNull()
        ?.let(output::format)
        ?: value
}
