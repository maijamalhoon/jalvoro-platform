package com.jamalsfinance.nativeapp.ui

import androidx.compose.runtime.Composable
import com.jamalsfinance.shared.personal.PersonalPlatformRepository

/**
 * Compatibility entry point retained for the existing native module route.
 */
@Composable
fun PersonalPlatformDashboard(
    repository: PersonalPlatformRepository,
    preferences: AndroidNativePreferences,
    onBack: () -> Unit,
    onSignOut: suspend () -> Unit,
) {
    JalvoroPersonalSettingsScreen(
        repository = repository,
        preferences = preferences,
        onBack = onBack,
        onSignOut = onSignOut,
    )
}
