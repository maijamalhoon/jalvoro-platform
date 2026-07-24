package com.jamalsfinance.nativeapp.ui

import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
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

internal enum class JalvoroReportsDestination { Reports, Insights }

internal val JalvoroReportCurrencies = listOf("PKR", "USD", "INR", "EUR", "GBP", "JPY", "CNY")

@Composable
fun JalvoroReportsInsightsDashboard(
    repository: ReportsInsightsRepository,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    val state by repository.state.collectAsStateWithLifecycle()
    val today = remember { jalvoroReportsTodayKey() }
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
        if (next != ReportPeriod.Custom) {
            refresh(selection = reportSelection(next, today))
        }
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

    BackHandler { onBack() }
    LaunchedEffect(repository) {
        repository.refresh(
            nowDate = today,
            selection = reportSelection(ReportPeriod.Month, today),
            currency = currency,
        )
    }

    Scaffold(
        topBar = {
            Surface(
                color = MaterialTheme.colorScheme.surfaceContainer,
                shadowElevation = 0.dp,
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    JalvoroIconAction(
                        icon = JalvoroIcons.ArrowLeft,
                        label = "Back to overview",
                        onClick = onBack,
                    )
                    JalvoroAnimatedSwap(
                        targetState = destination,
                        modifier = Modifier.weight(1f),
                        label = "reports-header-destination",
                    ) { currentDestination ->
                        JalvoroBrandLockup(
                            subtitle = if (currentDestination == JalvoroReportsDestination.Reports) {
                                "Reports"
                            } else {
                                "Financial insights"
                            },
                            compact = true,
                        )
                    }
                    JalvoroIconAction(
                        icon = JalvoroIcons.Refresh,
                        label = "Refresh reports and insights",
                        enabled = !loading,
                        onClick = { refresh() },
                    )
                }
            }
        },
        bottomBar = {
            JalvoroNavigationBar(
                destinations = listOf(
                    JalvoroNavigationDestination(
                        label = "Reports",
                        icon = JalvoroIcons.Reports,
                        selected = destination == JalvoroReportsDestination.Reports,
                        onClick = { destination = JalvoroReportsDestination.Reports },
                    ),
                    JalvoroNavigationDestination(
                        label = "Insights",
                        icon = JalvoroIcons.Investments,
                        selected = destination == JalvoroReportsDestination.Insights,
                        onClick = { destination = JalvoroReportsDestination.Insights },
                    ),
                ),
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when {
                snapshot == null && loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                snapshot == null && failure != null -> JalvoroReportsFailure(
                    message = failure,
                    onRetry = { refresh() },
                    modifier = Modifier.align(Alignment.Center),
                )
                snapshot == null -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                else -> Column(Modifier.fillMaxSize()) {
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

@Composable
private fun JalvoroReportsFailure(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        JalvoroFeedbackCard(message, JalvoroFeedbackTone.Danger)
        androidx.compose.material3.TextButton(onClick = onRetry) {
            androidx.compose.material3.Text("Try again")
        }
    }
}

private fun jalvoroReportsTodayKey(): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("Asia/Karachi")
    }.format(Date())
