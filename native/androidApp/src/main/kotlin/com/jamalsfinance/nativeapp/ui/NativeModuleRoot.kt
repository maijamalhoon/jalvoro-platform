package com.jamalsfinance.nativeapp.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.accessibility.PersonalAdaptiveLayout
import com.jamalsfinance.shared.accessibility.personalHorizontalPaddingDp
import com.jamalsfinance.shared.accessibility.selectPersonalAdaptiveLayout
import com.jamalsfinance.shared.finance.FinanceRepository
import com.jamalsfinance.shared.goals.GoalsPayablesRepository
import com.jamalsfinance.shared.investments.InvestmentsAnalyticsRepository
import com.jamalsfinance.shared.personal.PersonalPlatformRepository
import com.jamalsfinance.shared.reports.ReportsInsightsRepository
import kotlinx.coroutines.launch

private enum class NativeWorkspace {
    Overview,
    AccountsTransactions,
    GoalsPayables,
    InvestmentsAnalytics,
    ReportsInsights,
    PersonalPlatform,
    PrivacySecurity,
    AccessibilityDisplay,
    More,
}

private data class NativeModuleItem(
    val title: String,
    val description: String,
    val action: String,
    val onClick: () -> Unit,
)

@Composable
fun NativeModuleRootShell(
    email: String,
    financeRepository: FinanceRepository,
    goalsPayablesRepository: GoalsPayablesRepository,
    investmentsAnalyticsRepository: InvestmentsAnalyticsRepository,
    reportsInsightsRepository: ReportsInsightsRepository,
    personalPlatformRepository: PersonalPlatformRepository,
    nativePreferences: AndroidNativePreferences,
    onSignOut: suspend () -> Unit,
) {
    var workspace by remember { mutableStateOf(NativeWorkspace.Overview) }
    BackHandler(enabled = workspace != NativeWorkspace.Overview) {
        workspace = NativeWorkspace.Overview
    }

    when (workspace) {
        NativeWorkspace.Overview -> NativeOverviewDashboard(
            email = email,
            financeRepository = financeRepository,
            goalsPayablesRepository = goalsPayablesRepository,
            investmentsAnalyticsRepository = investmentsAnalyticsRepository,
            onOpenFinance = { workspace = NativeWorkspace.AccountsTransactions },
            onOpenPlanning = { workspace = NativeWorkspace.GoalsPayables },
            onOpenInvestments = { workspace = NativeWorkspace.InvestmentsAnalytics },
            onOpenReports = { workspace = NativeWorkspace.ReportsInsights },
            onOpenSettings = { workspace = NativeWorkspace.PersonalPlatform },
            onOpenMore = { workspace = NativeWorkspace.More },
        )
        NativeWorkspace.AccountsTransactions -> NativeDashboardShell(
            email = email,
            financeRepository = financeRepository,
            onSignOut = onSignOut,
        )
        NativeWorkspace.GoalsPayables -> GoalsPayablesDashboard(
            repository = goalsPayablesRepository,
            onBack = { workspace = NativeWorkspace.Overview },
        )
        NativeWorkspace.InvestmentsAnalytics -> InvestmentsAnalyticsDashboard(
            repository = investmentsAnalyticsRepository,
            onBack = { workspace = NativeWorkspace.Overview },
        )
        NativeWorkspace.ReportsInsights -> ReportsInsightsDashboard(
            repository = reportsInsightsRepository,
            onBack = { workspace = NativeWorkspace.Overview },
        )
        NativeWorkspace.PersonalPlatform -> PersonalPlatformDashboard(
            repository = personalPlatformRepository,
            preferences = nativePreferences,
            onBack = { workspace = NativeWorkspace.Overview },
            onSignOut = onSignOut,
        )
        NativeWorkspace.PrivacySecurity -> PrivacySecurityDashboard(
            preferences = nativePreferences,
            onBack = { workspace = NativeWorkspace.Overview },
        )
        NativeWorkspace.AccessibilityDisplay -> AccessibilityDisplayDashboard(
            preferences = nativePreferences,
            onBack = { workspace = NativeWorkspace.Overview },
        )
        NativeWorkspace.More -> NativeModuleLauncher(
            email = email,
            onOverview = { workspace = NativeWorkspace.Overview },
            onAccountsTransactions = { workspace = NativeWorkspace.AccountsTransactions },
            onGoalsPayables = { workspace = NativeWorkspace.GoalsPayables },
            onInvestmentsAnalytics = { workspace = NativeWorkspace.InvestmentsAnalytics },
            onReportsInsights = { workspace = NativeWorkspace.ReportsInsights },
            onPersonalPlatform = { workspace = NativeWorkspace.PersonalPlatform },
            onPrivacySecurity = { workspace = NativeWorkspace.PrivacySecurity },
            onAccessibilityDisplay = { workspace = NativeWorkspace.AccessibilityDisplay },
            onSignOut = onSignOut,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NativeModuleLauncher(
    email: String,
    onOverview: () -> Unit,
    onAccountsTransactions: () -> Unit,
    onGoalsPayables: () -> Unit,
    onInvestmentsAnalytics: () -> Unit,
    onReportsInsights: () -> Unit,
    onPersonalPlatform: () -> Unit,
    onPrivacySecurity: () -> Unit,
    onAccessibilityDisplay: () -> Unit,
    onSignOut: suspend () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val modules = listOf(
        NativeModuleItem(
            title = "Accounts & Transactions",
            description = "Accounts, balances, income, expenses, transfers, search and deleted history.",
            action = "Open core finance",
            onClick = onAccountsTransactions,
        ),
        NativeModuleItem(
            title = "Goals & Payables",
            description = "Savings goals, contribution history, payables, repayments and due-status tracking.",
            action = "Open goals & payables",
            onClick = onGoalsPayables,
        ),
        NativeModuleItem(
            title = "Investments & Analytics",
            description = "Portfolio lots, live market prices, profit/loss, cash out, cash-flow and spending intelligence.",
            action = "Open investments & analytics",
            onClick = onInvestmentsAnalytics,
        ),
        NativeModuleItem(
            title = "Reports & AI Insights",
            description = "Date-range reports, native CSV export, financial health, secure insights and finance chat.",
            action = "Open reports & AI insights",
            onClick = onReportsInsights,
        ),
        NativeModuleItem(
            title = "Profile, Alerts & Data",
            description = "Profile image and name, currency, theme, deadline alerts, password and complete backup/restore.",
            action = "Open personal settings",
            onClick = onPersonalPlatform,
        ),
        NativeModuleItem(
            title = "Privacy & App Lock",
            description = "Biometric or device-credential lock, auto-lock timing, secure screenshots and recent-app protection.",
            action = "Open privacy protection",
            onClick = onPrivacySecurity,
        ),
        NativeModuleItem(
            title = "Accessibility & Display",
            description = "High contrast, adaptive tablet layout, large-text protection and Android accessibility controls.",
            action = "Open accessibility settings",
            onClick = onAccessibilityDisplay,
        ),
    )

    Scaffold(
        topBar = {
            TopAppBar(
                navigationIcon = {
                    TextButton(onClick = onOverview) {
                        Text("Overview")
                    }
                },
                title = {
                    Column {
                        Text(
                            "More",
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.semantics { heading() },
                        )
                        Text(
                            "All personal finance workspaces",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
            )
        },
    ) { padding ->
        BoxWithConstraints(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentAlignment = Alignment.TopCenter,
        ) {
            val widthDp = maxWidth.value.toInt()
            val fontScale = LocalDensity.current.fontScale
            val layout = selectPersonalAdaptiveLayout(widthDp, fontScale)
            val horizontalPadding = personalHorizontalPaddingDp(widthDp).dp
            val moduleRows = if (layout == PersonalAdaptiveLayout.TwoColumn) {
                modules.chunked(2)
            } else {
                modules.map(::listOf)
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize().widthIn(max = 1_100.dp),
                contentPadding = PaddingValues(
                    start = horizontalPadding,
                    end = horizontalPadding,
                    top = 16.dp,
                    bottom = 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    Text("Signed in as", style = MaterialTheme.typography.labelLarge)
                    Text(
                        email,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.semantics {
                            contentDescription = "Signed in as $email"
                        },
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Every workspace uses your real Supabase-backed finance data. Business software stays separate.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                items(
                    items = moduleRows,
                    key = { row -> row.joinToString("|") { it.title } },
                ) { row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        row.forEach { item ->
                            ModuleCard(
                                title = item.title,
                                description = item.description,
                                action = item.action,
                                onClick = item.onClick,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        if (row.size == 1 && layout == PersonalAdaptiveLayout.TwoColumn) {
                            Spacer(Modifier.weight(1f))
                        }
                    }
                }

                item {
                    OutlinedButton(
                        onClick = { scope.launch { onSignOut() } },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        Text("Sign out")
                    }
                }
            }
        }
    }
}

@Composable
private fun ModuleCard(
    title: String,
    description: String,
    action: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        modifier = modifier.semantics(mergeDescendants = true) {
            contentDescription = "$title. $description. $action"
        },
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
    ) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { heading() },
            )
            Spacer(Modifier.height(8.dp))
            Text(
                description,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium,
            )
            Spacer(Modifier.height(16.dp))
            Text(
                action,
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}
