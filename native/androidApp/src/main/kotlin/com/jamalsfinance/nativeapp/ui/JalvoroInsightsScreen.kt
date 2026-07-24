package com.jamalsfinance.nativeapp.ui

import androidx.compose.runtime.Composable
import com.jamalsfinance.shared.reports.ReportsInsightsRepository
import com.jamalsfinance.shared.reports.ReportsInsightsSnapshot

@Composable
internal fun JalvoroInsightsScreen(
    snapshot: ReportsInsightsSnapshot,
    selectedCurrency: String,
    loading: Boolean,
    onCurrencyChange: (String) -> Unit,
    repository: ReportsInsightsRepository,
) {
    JalvoroAiAdvisorScreen(
        snapshot = snapshot,
        selectedCurrency = selectedCurrency,
        loading = loading,
        onCurrencyChange = onCurrencyChange,
        repository = repository,
    )
}
