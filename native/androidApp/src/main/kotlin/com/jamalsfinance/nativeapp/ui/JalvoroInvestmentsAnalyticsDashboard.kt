package com.jamalsfinance.nativeapp.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsRepository
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsResult
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsSnapshot
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsState
import kotlinx.coroutines.launch

private enum class JalvoroGrowthTab { Investments, Analytics }

@Composable
fun JalvoroInvestmentsAnalyticsDashboard(
    repository: InvestmentsAnalyticsRepository,
    onBack: () -> Unit,
) {
    val state by repository.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val today = remember { growthTodayDateKey() }
    var tab by remember { mutableStateOf(JalvoroGrowthTab.Investments) }
    var message by remember { mutableStateOf<String?>(null) }

    BackHandler { onBack() }
    LaunchedEffect(repository) {
        when (val result = repository.refresh(today)) {
            InvestmentsAnalyticsResult.Success -> Unit
            is InvestmentsAnalyticsResult.Failure -> message = result.message
        }
    }

    val snapshot: InvestmentsAnalyticsSnapshot? = when (val current = state) {
        is InvestmentsAnalyticsState.Ready -> current.snapshot
        is InvestmentsAnalyticsState.Loading -> current.previous
        is InvestmentsAnalyticsState.Failure -> current.previous
        InvestmentsAnalyticsState.Idle -> null
    }
    val loading = state is InvestmentsAnalyticsState.Loading
    val failure = (state as? InvestmentsAnalyticsState.Failure)?.message

    Scaffold(
        topBar = {
            Surface(
                color = MaterialTheme.colorScheme.surfaceContainer,
                shadowElevation = 0.dp,
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 9.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    JalvoroIconAction(
                        icon = JalvoroIcons.ArrowLeft,
                        label = "Back to overview",
                        onClick = onBack,
                    )
                    JalvoroBrandLockup(
                        modifier = Modifier.weight(1f),
                        subtitle = if (tab == JalvoroGrowthTab.Investments) {
                            "Portfolio & market value"
                        } else {
                            "Cash-flow intelligence"
                        },
                        compact = true,
                    )
                    JalvoroIconAction(
                        icon = JalvoroIcons.Refresh,
                        label = "Refresh investments and analytics",
                        enabled = !loading,
                        onClick = {
                            scope.launch {
                                message = null
                                when (val result = repository.refresh(today, force = true)) {
                                    InvestmentsAnalyticsResult.Success -> Unit
                                    is InvestmentsAnalyticsResult.Failure -> message = result.message
                                }
                            }
                        },
                    )
                }
            }
        },
        bottomBar = {
            JalvoroNavigationBar(
                destinations = listOf(
                    JalvoroNavigationDestination(
                        label = "Investments",
                        icon = JalvoroIcons.Investments,
                        selected = tab == JalvoroGrowthTab.Investments,
                        onClick = { tab = JalvoroGrowthTab.Investments },
                    ),
                    JalvoroNavigationDestination(
                        label = "Analytics",
                        icon = JalvoroIcons.Reports,
                        selected = tab == JalvoroGrowthTab.Analytics,
                        onClick = { tab = JalvoroGrowthTab.Analytics },
                    ),
                ),
            )
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when {
                snapshot == null && loading -> GrowthProgress()
                snapshot == null -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(18.dp),
                        verticalArrangement = Arrangement.Center,
                    ) {
                        GrowthEmptyState(
                            icon = JalvoroIcons.Warning,
                            title = "Growth workspace unavailable",
                            description = message ?: failure ?: "Refresh to load your investments and analytics.",
                            actionLabel = "Try again",
                            onAction = {
                                scope.launch {
                                    message = null
                                    when (val result = repository.refresh(today, force = true)) {
                                        InvestmentsAnalyticsResult.Success -> Unit
                                        is InvestmentsAnalyticsResult.Failure -> message = result.message
                                    }
                                }
                            },
                        )
                    }
                }
                else -> {
                    Column(Modifier.fillMaxSize()) {
                        (message ?: failure)?.let { problem ->
                            JalvoroFeedbackCard(
                                message = problem,
                                tone = JalvoroFeedbackTone.Danger,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            )
                        }
                        when (tab) {
                            JalvoroGrowthTab.Investments -> JalvoroPortfolioScreen(
                                snapshot = snapshot,
                                repository = repository,
                                loading = loading,
                                onMessage = { message = it },
                            )
                            JalvoroGrowthTab.Analytics -> JalvoroAnalyticsScreen(
                                snapshot = snapshot,
                                repository = repository,
                                loading = loading,
                                onMessage = { message = it },
                            )
                        }
                    }
                }
            }
        }
    }
}
