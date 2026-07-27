package com.jamalsfinance.nativeapp

import android.content.res.Configuration
import android.graphics.Color
import android.os.Bundle
import android.os.StrictMode
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import com.jamalsfinance.nativeapp.resilience.AndroidEncryptedSnapshotStore
import com.jamalsfinance.nativeapp.resilience.AndroidNetworkMonitor
import com.jamalsfinance.nativeapp.resilience.ResilientFinanceRepository
import com.jamalsfinance.nativeapp.resilience.ResilientGoalsPayablesRepository
import com.jamalsfinance.nativeapp.resilience.ResilientInvestmentsAnalyticsRepository
import com.jamalsfinance.nativeapp.security.AndroidKeystoreSessionStore
import com.jamalsfinance.nativeapp.ui.AndroidNativePreferences
import com.jamalsfinance.nativeapp.ui.JamalsFinanceNativeApp
import com.jamalsfinance.nativeapp.ui.NativeThemeMode
import com.jamalsfinance.shared.auth.SupabaseAuthRepository
import com.jamalsfinance.shared.core.AppConfig
import com.jamalsfinance.shared.finance.FinanceRepository
import com.jamalsfinance.shared.finance.SupabaseFinanceRepository
import com.jamalsfinance.shared.goals.GoalsPayablesRepository
import com.jamalsfinance.shared.goals.SupabaseGoalsPayablesRepository
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsRepository
import com.jamalsfinance.shared.investments.SupabaseInvestmentsAnalyticsRepository
import com.jamalsfinance.shared.network.platformHttpClient
import com.jamalsfinance.shared.personal.PersonalPlatformRepository
import com.jamalsfinance.shared.personal.SealedBackupPersonalPlatformRepository
import com.jamalsfinance.shared.personal.SupabasePersonalPlatformRepository
import com.jamalsfinance.shared.reports.SupabaseReportsInsightsRepository

private data class NativeRepositories(
    val auth: SupabaseAuthRepository,
    val finance: FinanceRepository,
    val goalsPayables: GoalsPayablesRepository,
    val investmentsAnalytics: InvestmentsAnalyticsRepository,
    val reportsInsights: SupabaseReportsInsightsRepository,
    val personalPlatform: PersonalPlatformRepository,
)

class MainActivity : ComponentActivity() {
    private var activeNetworkMonitor: AndroidNetworkMonitor? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (BuildConfig.DEBUG) enableDebugStrictMode()

        val nativePreferences = AndroidNativePreferences(applicationContext)
        if (BuildConfig.DEBUG && nativePreferences.state.value.blockScreenshots) {
            nativePreferences.setBlockScreenshots(false)
        }
        setSystemBars(resolveDarkTheme(nativePreferences.state.value.themeMode))

        val networkMonitor = AndroidNetworkMonitor(applicationContext).also {
            activeNetworkMonitor = it
        }
        val snapshotStore = AndroidEncryptedSnapshotStore(applicationContext)
        setSecureWindow(nativePreferences.state.value.blockScreenshots)
        val configured = BuildConfig.SUPABASE_URL.isNotBlank() &&
            BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank()

        val repositories = if (configured) {
            val config = AppConfig(
                supabaseUrl = BuildConfig.SUPABASE_URL,
                supabasePublishableKey = BuildConfig.SUPABASE_PUBLISHABLE_KEY,
            )
            val baseClient = platformHttpClient()
            val authRepository = SupabaseAuthRepository(
                baseClient = baseClient,
                config = config,
                sessionStore = AndroidKeystoreSessionStore(applicationContext),
            )
            val financeDelegate = SupabaseFinanceRepository(
                baseClient = baseClient,
                config = config,
                authRepository = authRepository,
            )
            val goalsDelegate = SupabaseGoalsPayablesRepository(
                baseClient = baseClient,
                config = config,
                authRepository = authRepository,
            )
            val investmentsDelegate = SupabaseInvestmentsAnalyticsRepository(
                baseClient = baseClient,
                config = config,
                authRepository = authRepository,
            )
            val personalDelegate = SupabasePersonalPlatformRepository(
                baseClient = baseClient,
                config = config,
                authRepository = authRepository,
            )
            NativeRepositories(
                auth = authRepository,
                finance = ResilientFinanceRepository(
                    delegate = financeDelegate,
                    authRepository = authRepository,
                    store = snapshotStore,
                    network = networkMonitor,
                ),
                goalsPayables = ResilientGoalsPayablesRepository(
                    delegate = goalsDelegate,
                    authRepository = authRepository,
                    store = snapshotStore,
                    network = networkMonitor,
                ),
                investmentsAnalytics = ResilientInvestmentsAnalyticsRepository(
                    delegate = investmentsDelegate,
                    authRepository = authRepository,
                    store = snapshotStore,
                    network = networkMonitor,
                ),
                reportsInsights = SupabaseReportsInsightsRepository(
                    baseClient = baseClient,
                    config = config,
                    authRepository = authRepository,
                ),
                personalPlatform = SealedBackupPersonalPlatformRepository(
                    baseClient = baseClient,
                    config = config,
                    authRepository = authRepository,
                    delegate = personalDelegate,
                ),
            )
        } else {
            null
        }

        setContent {
            JamalsFinanceNativeApp(
                authRepository = repositories?.auth,
                financeRepository = repositories?.finance,
                goalsPayablesRepository = repositories?.goalsPayables,
                investmentsAnalyticsRepository = repositories?.investmentsAnalytics,
                reportsInsightsRepository = repositories?.reportsInsights,
                personalPlatformRepository = repositories?.personalPlatform,
                nativePreferences = nativePreferences,
                networkMonitor = networkMonitor,
                onSecureWindowChanged = ::setSecureWindow,
                onSystemBarsChanged = ::setSystemBars,
            )
        }
    }

    override fun onDestroy() {
        activeNetworkMonitor?.close()
        activeNetworkMonitor = null
        super.onDestroy()
    }

    private fun enableDebugStrictMode() {
        StrictMode.setThreadPolicy(
            StrictMode.ThreadPolicy.Builder()
                .detectAll()
                .penaltyLog()
                .build(),
        )
        StrictMode.setVmPolicy(
            StrictMode.VmPolicy.Builder()
                .detectAll()
                .penaltyLog()
                .build(),
        )
    }

    private fun resolveDarkTheme(mode: NativeThemeMode): Boolean = when (mode) {
        NativeThemeMode.System ->
            resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK ==
                Configuration.UI_MODE_NIGHT_YES
        NativeThemeMode.Light -> false
        NativeThemeMode.Dark -> true
    }

    private fun setSystemBars(dark: Boolean) {
        val barColor = if (dark) Color.rgb(10, 18, 32) else Color.rgb(246, 248, 252)
        window.statusBarColor = barColor
        window.navigationBarColor = barColor
        WindowCompat.getInsetsController(window, window.decorView).apply {
            isAppearanceLightStatusBars = !dark
            isAppearanceLightNavigationBars = !dark
        }
    }

    private fun setSecureWindow(enabled: Boolean) {
        if (enabled) {
            window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }
}
