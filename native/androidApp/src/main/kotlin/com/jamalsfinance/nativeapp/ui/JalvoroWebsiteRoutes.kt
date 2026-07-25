package com.jamalsfinance.nativeapp.ui

import androidx.compose.runtime.Composable
import com.jamalsfinance.shared.goals.GoalsPayablesRepository
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsRepository
import com.jamalsfinance.shared.personal.PersonalPlatformRepository
import com.jamalsfinance.shared.reports.ReportsInsightsRepository

@Composable
internal fun JalvoroWebsitePlanningRoute(
    email: String,
    repository: GoalsPayablesRepository,
    onOverview: () -> Unit,
    onMoney: () -> Unit,
    onInvestments: () -> Unit,
    onReports: () -> Unit,
    onSettings: () -> Unit,
    onMore: () -> Unit,
) = JalvoroWebsiteGoalsPayablesDashboard(
    email = email,
    repository = repository,
    onOverview = onOverview,
    onMoney = onMoney,
    onInvestments = onInvestments,
    onReports = onReports,
    onSettings = onSettings,
    onMore = onMore,
)

@Composable
internal fun JalvoroWebsiteInvestmentsRoute(
    repository: InvestmentsAnalyticsRepository,
    onBack: () -> Unit,
) = JalvoroInvestmentsAnalyticsDashboard(
    repository = repository,
    onBack = onBack,
)

@Composable
internal fun JalvoroWebsiteReportsRoute(
    repository: ReportsInsightsRepository,
    onBack: () -> Unit,
) = ReportsInsightsDashboard(
    repository = repository,
    onBack = onBack,
)

@Composable
internal fun JalvoroWebsiteSettingsRoute(
    repository: PersonalPlatformRepository,
    preferences: AndroidNativePreferences,
    onBack: () -> Unit,
    onSignOut: suspend () -> Unit,
) = PersonalPlatformDashboard(
    repository = repository,
    preferences = preferences,
    onBack = onBack,
    onSignOut = onSignOut,
)

@Composable
internal fun JalvoroWebsitePrivacyRoute(
    email: String,
    repository: PersonalPlatformRepository,
    preferences: AndroidNativePreferences,
    onBack: () -> Unit,
    onSignOut: suspend () -> Unit,
) = PrivacySecurityDashboard(
    email = email,
    repository = repository,
    preferences = preferences,
    onBack = onBack,
    onSignOut = onSignOut,
)

@Composable
internal fun JalvoroWebsiteAccessibilityRoute(
    preferences: AndroidNativePreferences,
    onBack: () -> Unit,
) = AccessibilityDisplayDashboard(
    preferences = preferences,
    onBack = onBack,
)

@Composable
internal fun JalvoroWebsiteMotionRoute(
    preferences: AndroidNativePreferences,
    onBack: () -> Unit,
) = JalvoroMotionSettingsDashboard(
    preferences = preferences,
    onBack = onBack,
)
