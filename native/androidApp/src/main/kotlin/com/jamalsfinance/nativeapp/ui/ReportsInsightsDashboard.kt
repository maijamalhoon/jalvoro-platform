package com.jamalsfinance.nativeapp.ui

import androidx.compose.runtime.Composable
import com.jamalsfinance.shared.reports.ReportsInsightsRepository

@Composable
fun ReportsInsightsDashboard(
    repository: ReportsInsightsRepository,
    onBack: () -> Unit,
) {
    JalvoroReportsInsightsDashboard(
        repository = repository,
        onBack = onBack,
    )
}
