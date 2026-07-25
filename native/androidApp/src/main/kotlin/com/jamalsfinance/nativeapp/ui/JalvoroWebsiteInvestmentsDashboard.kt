package com.jamalsfinance.nativeapp.ui

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
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsRepository
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsResult
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsSnapshot
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsState
import kotlinx.coroutines.launch

private enum class WebsiteGrowthTab {
    Investments,
    Analytics,
}

@Composable
fun JalvoroWebsiteInvestmentsAnalyticsDashboard(
    email: String,
    repository: InvestmentsAnalyticsRepository,
    onOverview: () -> Unit,
    onMoney: () -> Unit,
    onPlanning: () -> Unit,
    onReports: () -> Unit,
    onSettings: () -> Unit,
    onMore: () -> Unit,
) {
    val state by repository.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val today = remember { growthTodayDateKey() }
    var tab by remember { mutableStateOf(WebsiteGrowthTab.Investments) }
    var message by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(repository, today) {
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

    fun refresh() {
        scope.launch {
            message = null
            when (val result = repository.refresh(today, force = true)) {
                InvestmentsAnalyticsResult.Success -> Unit
                is InvestmentsAnalyticsResult.Failure -> message = result.message
            }
        }
    }

    JalvoroWebsiteWorkspaceShell(
        email = email,
        selected = JalvoroWebsiteDestination.Investments,
        onOverview = onOverview,
        onMoney = onMoney,
        onPlanning = onPlanning,
        onInvestments = {},
        onReports = onReports,
        onSettings = onSettings,
        onMore = onMore,
    ) { shellPadding ->
        Scaffold(
            modifier = Modifier.fillMaxSize().padding(shellPadding),
            containerColor = Color.Transparent,
        ) { scaffoldPadding ->
            Column(modifier = Modifier.fillMaxSize().padding(scaffoldPadding)) {
                WebsiteGrowthHeader(
                    tab = tab,
                    loading = loading,
                    onTab = { tab = it },
                    onRefresh = ::refresh,
                )
                Box(modifier = Modifier.fillMaxWidth().weight(1f)) {
                    when {
                        snapshot == null && loading -> GrowthProgress()
                        snapshot == null -> Column(
                            modifier = Modifier.fillMaxSize().padding(18.dp),
                            verticalArrangement = Arrangement.Center,
                        ) {
                            GrowthEmptyState(
                                icon = JalvoroIcons.Warning,
                                title = "Growth workspace unavailable",
                                description = message ?: failure ?: "Refresh to load your investments and analytics.",
                                actionLabel = "Try again",
                                onAction = ::refresh,
                            )
                        }
                        else -> Column(modifier = Modifier.fillMaxSize()) {
                            (message ?: failure)?.let { problem ->
                                JalvoroFeedbackCard(
                                    message = problem,
                                    tone = JalvoroFeedbackTone.Danger,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                )
                            }
                            JalvoroAnimatedSwap(
                                targetState = tab,
                                modifier = Modifier.fillMaxSize(),
                                label = "website-growth-tab",
                            ) { currentTab ->
                                when (currentTab) {
                                    WebsiteGrowthTab.Investments -> JalvoroPortfolioScreen(
                                        snapshot = snapshot,
                                        repository = repository,
                                        loading = loading,
                                        onMessage = { message = it },
                                    )
                                    WebsiteGrowthTab.Analytics -> JalvoroAnalyticsScreen(
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
    }
}

@Composable
private fun WebsiteGrowthHeader(
    tab: WebsiteGrowthTab,
    loading: Boolean,
    onTab: (WebsiteGrowthTab) -> Unit,
    onRefresh: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "Investments",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.semantics { heading() },
                )
                Text(
                    text = if (tab == WebsiteGrowthTab.Investments) {
                        "Portfolio, holdings and market value"
                    } else {
                        "Cash-flow and portfolio analytics"
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
                selected = tab == WebsiteGrowthTab.Investments,
                onClick = { onTab(WebsiteGrowthTab.Investments) },
                modifier = Modifier.weight(1f),
                leadingIcon = {
                    Icon(JalvoroIcons.Investments, contentDescription = null, modifier = Modifier.size(16.dp))
                },
                label = {
                    Text("Portfolio", maxLines = 1, overflow = TextOverflow.Ellipsis)
                },
            )
            FilterChip(
                selected = tab == WebsiteGrowthTab.Analytics,
                onClick = { onTab(WebsiteGrowthTab.Analytics) },
                modifier = Modifier.weight(1f),
                leadingIcon = {
                    Icon(JalvoroIcons.Reports, contentDescription = null, modifier = Modifier.size(16.dp))
                },
                label = {
                    Text("Analytics", maxLines = 1, overflow = TextOverflow.Ellipsis)
                },
            )
        }
    }
}
