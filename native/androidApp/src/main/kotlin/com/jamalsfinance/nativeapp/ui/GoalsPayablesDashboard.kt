package com.jamalsfinance.nativeapp.ui

import androidx.compose.runtime.Composable
import com.jamalsfinance.shared.goals.GoalsPayablesRepository

@Composable
fun GoalsPayablesDashboard(
    repository: GoalsPayablesRepository,
    onBack: () -> Unit,
) {
    JalvoroGoalsPayablesDashboard(
        repository = repository,
        onBack = onBack,
    )
}
