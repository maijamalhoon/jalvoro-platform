package com.jamalsfinance.nativeapp.ui

import androidx.compose.runtime.Composable

@Composable
internal fun AccessibilityDisplayDashboard(
    preferences: AndroidNativePreferences,
    onBack: () -> Unit,
) {
    JalvoroAccessibilityDisplayDashboard(
        preferences = preferences,
        onBack = onBack,
    )
}
