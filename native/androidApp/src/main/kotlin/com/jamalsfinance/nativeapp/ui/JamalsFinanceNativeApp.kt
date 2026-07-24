package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.auth.AuthRepository
import com.jamalsfinance.shared.auth.AuthState
import com.jamalsfinance.shared.finance.FinanceRepository
import com.jamalsfinance.shared.goals.GoalsPayablesRepository
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsRepository
import com.jamalsfinance.shared.personal.PersonalPlatformRepository
import com.jamalsfinance.shared.reports.ReportsInsightsRepository
import com.jamalsfinance.shared.resilience.NetworkMonitor

@Composable
fun JamalsFinanceNativeApp(
    authRepository: AuthRepository?,
    financeRepository: FinanceRepository?,
    goalsPayablesRepository: GoalsPayablesRepository?,
    investmentsAnalyticsRepository: InvestmentsAnalyticsRepository?,
    reportsInsightsRepository: ReportsInsightsRepository?,
    personalPlatformRepository: PersonalPlatformRepository?,
    nativePreferences: AndroidNativePreferences,
    networkMonitor: NetworkMonitor,
    onSecureWindowChanged: (Boolean) -> Unit,
) {
    val localPreferences by nativePreferences.state.collectAsStateWithLifecycle()
    val online by networkMonitor.online.collectAsStateWithLifecycle()

    LaunchedEffect(localPreferences.blockScreenshots, onSecureWindowChanged) {
        onSecureWindowChanged(localPreferences.blockScreenshots)
    }

    JamalsFinanceTheme(
        themeMode = localPreferences.themeMode,
        highContrast = localPreferences.highContrast,
    ) {
        JalvoroMotionProvider(mode = localPreferences.motionMode) {
            Surface(modifier = Modifier.fillMaxSize()) {
                if (
                    authRepository == null ||
                    financeRepository == null ||
                    goalsPayablesRepository == null ||
                    investmentsAnalyticsRepository == null ||
                    reportsInsightsRepository == null ||
                    personalPlatformRepository == null
                ) {
                    ConfigurationRequired()
                } else {
                    val state by authRepository.state.collectAsStateWithLifecycle()
                    LaunchedEffect(authRepository) { authRepository.restoreSession() }

                    Column(modifier = Modifier.fillMaxSize()) {
                        if (!online && state is AuthState.SignedIn) {
                            OfflineModeBanner()
                        }
                        Box(modifier = Modifier.fillMaxWidth().weight(1f)) {
                            when (val current = state) {
                                AuthState.Restoring -> CenteredProgress("Restoring your secure session")
                                AuthState.SignedOut -> NativeAuthScreen(
                                    repository = authRepository,
                                    online = online,
                                )
                                is AuthState.SignedIn -> NativeAppLockGate(
                                    preferences = nativePreferences,
                                ) {
                                    NativeModuleRootShell(
                                        email = current.session.user.email ?: "Signed in",
                                        financeRepository = financeRepository,
                                        goalsPayablesRepository = goalsPayablesRepository,
                                        investmentsAnalyticsRepository = investmentsAnalyticsRepository,
                                        reportsInsightsRepository = reportsInsightsRepository,
                                        personalPlatformRepository = personalPlatformRepository,
                                        nativePreferences = nativePreferences,
                                        onSignOut = { authRepository.signOut() },
                                    )
                                }
                                is AuthState.Failure -> NativeAuthScreen(
                                    repository = authRepository,
                                    online = online,
                                    initialMessage = current.message,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OfflineModeBanner() {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .semantics { liveRegion = LiveRegionMode.Polite },
        color = MaterialTheme.colorScheme.tertiaryContainer,
        contentColor = MaterialTheme.colorScheme.onTertiaryContainer,
    ) {
        Text(
            text = "Offline mode — securely saved data is read-only. Connect to refresh or make changes.",
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
            style = MaterialTheme.typography.labelLarge,
        )
    }
}

@Composable
private fun ConfigurationRequired() {
    Box(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        JalvoroSurfaceCard(modifier = Modifier.fillMaxWidth().widthIn(max = 560.dp)) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(22.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                JalvoroBrandLockup()
                Text(
                    text = "Native configuration required",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "Add JAMALS_SUPABASE_URL and JAMALS_SUPABASE_PUBLISHABLE_KEY to native/local.properties.",
                    modifier = Modifier.semantics {
                        liveRegion = LiveRegionMode.Assertive
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun CenteredProgress(label: String) {
    Box(
        Modifier
            .fillMaxSize()
            .semantics {
                contentDescription = label
                liveRegion = LiveRegionMode.Polite
            },
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            JalvoroBrandMark(modifier = Modifier.size(56.dp))
            Spacer(Modifier.height(22.dp))
            CircularProgressIndicator(strokeWidth = 2.5.dp)
            Spacer(Modifier.height(12.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
