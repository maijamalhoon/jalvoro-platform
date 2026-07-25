package com.jamalsfinance.nativeapp.ui

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.reports.ReportPeriod
import com.jamalsfinance.shared.reports.ReportSelection
import com.jamalsfinance.shared.reports.ReportsInsightsRepository
import com.jamalsfinance.shared.reports.ReportsInsightsResult
import com.jamalsfinance.shared.reports.ReportsInsightsState
import com.jamalsfinance.shared.reports.reportSelection
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.launch

@Composable
fun JalvoroWebsiteReportsInsightsDashboard(
    email: String,
    repository: ReportsInsightsRepository,
    onOverview: () -> Unit,
    onMoney: () -> Unit,
    onPlanning: () -> Unit,
    onInvestments: () -> Unit,
    onSettings: () -> Unit,
    onMore: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    val state by repository.state.collectAsStateWithLifecycle()
    val today = remember { websiteReportsTodayKey() }
    var destination by remember { mutableStateOf(JalvoroReportsDestination.Reports) }
    var period by remember { mutableStateOf(ReportPeriod.Month) }
    var customStart by remember { mutableStateOf(today.take(8) + "01") }
    var customEnd by remember { mutableStateOf(today) }
    var currency by remember { mutableStateOf("PKR") }
    var pendingCsv by remember { mutableStateOf<String?>(null) }

    val exportLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("text/csv"),
    ) { uri ->
        val csv = pendingCsv
        if (uri != null && csv != null) {
            runCatching {
                context.contentResolver.openOutputStream(uri)?.use { stream ->
                    stream.write(byteArrayOf(0xEF.toByte(), 0xBB.toByte(), 0xBF.toByte()))
                    stream.write(csv.toByteArray(Charsets.UTF_8))
                } ?: error("File could not be opened.")
            }.onSuccess {
                Toast.makeText(context, "JALVORO report exported", Toast.LENGTH_SHORT).show()
            }.onFailure {
                Toast.makeText(context, "Report could not be exported", Toast.LENGTH_LONG).show()
            }
        }
        pendingCsv = null
    }

    fun selectionFor(
        selectedPeriod: ReportPeriod = period,
        start: String = customStart,
        end: String = customEnd,
    ): ReportSelection? = runCatching {
        reportSelection(
            period = selectedPeriod,
            nowDate = today,
            customStart = start.takeIf(String::isNotBlank),
            customEnd = end.takeIf(String::isNotBlank),
        )
    }.getOrNull()

    fun refresh(
        force: Boolean = true,
        selection: ReportSelection? = selectionFor(),
        selectedCurrency: String = currency,
    ) {
        if (selection == null) {
            scope.launch { snackbar.showSnackbar("Enter a valid report range in YYYY-MM-DD format.") }
            return
        }
        scope.launch {
            when (
                val result = repository.refresh(
                    nowDate = today,
                    selection = selection,
                    currency = selectedCurrency,
                    force = force,
                )
            ) {
                ReportsInsightsResult.Success -> Unit
                is ReportsInsightsResult.Failure -> snackbar.showSnackbar(result.message)
            }
        }
    }

    fun selectPeriod(next: ReportPeriod) {
        period = next
        if (next != ReportPeriod.Custom) refresh(selection = reportSelection(next, today))
    }

    fun selectCurrency(next: String) {
        currency = next
        refresh(selectedCurrency = next)
    }

    val snapshot = when (val current = state) {
        is ReportsInsightsState.Ready -> current.snapshot
        is ReportsInsightsState.Loading -> current.previous
        is ReportsInsightsState.Failure -> current.previous
        ReportsInsightsState.Idle -> null
    }
    val loading = state is ReportsInsightsState.Loading
    val failure = (state as? ReportsInsightsState.Failure)?.message

    LaunchedEffect(repository, today) {
        repository.refresh(
            nowDate = today,
            selection = reportSelection(ReportPeriod.Month, today),
            currency = currency,
        )
    }

    JalvoroWebsiteWorkspaceShell(
        email = email,
        selected = JalvoroWebsiteDestination.Reports,
        onOverview = onOverview,
        onMoney = onMoney,
        onPlanning = onPlanning,
        onInvestments = onInvestments,
        onReports = {},
        onSettings = onSettings,
        onMore = onMore,
    ) { shellPadding ->
        Scaffold(
            modifier = Modifier.fillMaxSize().padding(shellPadding),
            snackbarHost = { SnackbarHost(snackbar) },
            containerColor = Color.Transparent,
        ) { scaffoldPadding ->
            Column(modifier = Modifier.fillMaxSize().padding(scaffoldPadding)) {
                WebsiteReportsHeader(
                    destination = destination,
                    loading = loading,
                    onDestination = { destination = it },
                    onRefresh = { refresh() },
                )
                Box(modifier = Modifier.fillMaxWidth().weight(1f)) {
                    when {
                        snapshot == null && loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                        snapshot == null && failure != null -> WebsiteReportsFailure(
                            message = failure,
                            onRetry = { refresh() },
                            modifier = Modifier.align(Alignment.Center),
                        )
                        snapshot == null -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                        else -> Column(modifier = Modifier.fillMaxSize()) {
                            JalvoroAnimatedReveal(visible = failure != null) {
                                failure?.let {
                                    JalvoroFeedbackCard(
                                        message = it,
                                        tone = JalvoroFeedbackTone.Danger,
                                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                    )
                                }
                            }
                            JalvoroAnimatedWorkspace(
                                targetState = destination,
                                modifier = Modifier.fillMaxSize(),
                            ) { currentDestination ->
                                when (currentDestination) {
                                    JalvoroReportsDestination.Reports -> JalvoroReportsScreen(
                                        snapshot = snapshot,
                                        period = period,
                                        customStart = customStart,
                                        customEnd = customEnd,
                                        selectedCurrency = currency,
                                        loading = loading,
                                        onPeriodChange = ::selectPeriod,
                                        onCustomStartChange = { customStart = it.take(10) },
                                        onCustomEndChange = { customEnd = it.take(10) },
                                        onApplyCustom = { refresh(selection = selectionFor(ReportPeriod.Custom)) },
                                        onCurrencyChange = ::selectCurrency,
                                        onExport = {
                                            pendingCsv = snapshot.csv(currency)
                                            exportLauncher.launch(
                                                "jalvoro-personal-$currency-${snapshot.report.selection.start}-to-${snapshot.report.selection.end}.csv",
                                            )
                                        },
                                    )
                                    JalvoroReportsDestination.Insights -> JalvoroInsightsScreen(
                                        snapshot = snapshot,
                                        selectedCurrency = currency,
                                        loading = loading,
                                        onCurrencyChange = ::selectCurrency,
                                        repository = repository,
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
private fun WebsiteReportsHeader(
    destination: JalvoroReportsDestination,
    loading: Boolean,
    onDestination: (JalvoroReportsDestination) -> Unit,
    onRefresh: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = if (destination == JalvoroReportsDestination.Reports) "Reports" else "Financial insights",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.semantics { heading() },
                )
                Text(
                    text = if (destination == JalvoroReportsDestination.Reports) {
                        "Cash flow, categories and exportable financial summaries"
                    } else {
                        "Verified financial health and authenticated guidance"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Button(
                onClick = onRefresh,
                enabled = !loading,
                shape = androidx.compose.foundation.shape.RoundedCornerShape(14.dp),
            ) {
                Icon(JalvoroIcons.Refresh, contentDescription = null, modifier = Modifier.size(17.dp))
                Spacer(Modifier.size(7.dp))
                Text(if (loading) "Refreshing" else "Refresh")
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            FilterChip(
                selected = destination == JalvoroReportsDestination.Reports,
                onClick = { onDestination(JalvoroReportsDestination.Reports) },
                modifier = Modifier.weight(1f),
                leadingIcon = {
                    Icon(JalvoroIcons.Reports, contentDescription = null, modifier = Modifier.size(16.dp))
                },
                label = { Text("Reports", maxLines = 1, overflow = TextOverflow.Ellipsis) },
            )
            FilterChip(
                selected = destination == JalvoroReportsDestination.Insights,
                onClick = { onDestination(JalvoroReportsDestination.Insights) },
                modifier = Modifier.weight(1f),
                leadingIcon = {
                    Icon(JalvoroIcons.Investments, contentDescription = null, modifier = Modifier.size(16.dp))
                },
                label = { Text("Insights", maxLines = 1, overflow = TextOverflow.Ellipsis) },
            )
        }
    }
}

@Composable
private fun WebsiteReportsFailure(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        JalvoroFeedbackCard(message, JalvoroFeedbackTone.Danger)
        TextButton(onClick = onRetry) { Text("Try again") }
    }
}

private fun websiteReportsTodayKey(): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("Asia/Karachi")
    }.format(Date())
