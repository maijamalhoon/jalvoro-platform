package com.jamalsfinance.nativeapp.ui

import androidx.compose.runtime.Composable
import com.jamalsfinance.shared.personal.PersonalPlatformRepository

@Composable
internal fun PrivacySecurityDashboard(
    email: String,
    repository: PersonalPlatformRepository,
    preferences: AndroidNativePreferences,
    onBack: () -> Unit,
    onSignOut: suspend () -> Unit,
) {
    JalvoroPrivacySecurityDashboard(
        email = email,
        repository = repository,
        preferences = preferences,
        onBack = onBack,
        onSignOut = onSignOut,
    )
}
