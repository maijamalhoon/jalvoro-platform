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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
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
    MotionInteractions,
    More,
}

private data class NativeModuleItem(
    val title: String,
    val description: String,
    val action: String,
    val icon: ImageVector,
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
        workspace = if (workspace == NativeWorkspace.MotionInteractions) {
            NativeWorkspace.More
        } else {
            NativeWorkspace.Overview
        }
    }

    JalvoroAnimatedWorkspace(
        targetState = workspace,
        modifier = Modifier.fillMaxSize(),
    ) { currentWorkspace ->
        when (currentWorkspace) {
            NativeWorkspace.Overview -> JalvoroOverviewDashboard(
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
            NativeWorkspace.AccountsTransactions -> JalvoroFinanceDashboard(
                email = email,
                financeRepository = financeRepository,
                onBack = { workspace = NativeWorkspace.Overview },
                onSignOut = onSignOut,
            )
            NativeWorkspace.GoalsPayables -> GoalsPayablesDashboard(
                repository = goalsPayablesRepository,
                onBack = { workspace = NativeWorkspace.Overview },
            )
            NativeWorkspace.InvestmentsAnalytics -> JalvoroInvestmentsAnalyticsDashboard(
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
                email = email,
                repository = personalPlatformRepository,
                preferences = nativePreferences,
                onBack = { workspace = NativeWorkspace.Overview },
                onSignOut = onSignOut,
            )
            NativeWorkspace.AccessibilityDisplay -> AccessibilityDisplayDashboard(
                preferences = nativePreferences,
                onBack = { workspace = NativeWorkspace.Overview },
            )
            NativeWorkspace.MotionInteractions -> JalvoroMotionSettingsDashboard(
                preferences = nativePreferences,
                onBack = { workspace = NativeWorkspace.More },
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
                onMotionInteractions = { workspace = NativeWorkspace.MotionInteractions },
                onSignOut = onSignOut,
            )
        }
    }
}

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
    onMotionInteractions: () -> Unit,
    onSignOut: suspend () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val modules = listOf(
        NativeModuleItem(
            title = "Accounts & transactions",
            description = "Accounts, balances, income, expenses, transfers, search and deleted history.",
            action = "Open core finance",
            icon = JalvoroIcons.Transactions,
            onClick = onAccountsTransactions,
        ),
        NativeModuleItem(
            title = "Goals & payables",
            description = "Savings goals, contribution history, payables, repayments and due-status tracking.",
            action = "Open planning",
            icon = JalvoroIcons.Target,
            onClick = onGoalsPayables,
        ),
        NativeModuleItem(
            title = "Investments & analytics",
            description = "Portfolio lots, live market prices, profit/loss, cash out, cash-flow and spending intelligence.",
            action = "Open growth",
            icon = JalvoroIcons.Investments,
            onClick = onInvestmentsAnalytics,
        ),
        NativeModuleItem(
            title = "Reports & AI insights",
            description = "Date-range reports, native CSV export, financial health, secure insights and finance chat.",
            action = "Open intelligence",
            icon = JalvoroIcons.Reports,
            onClick = onReportsInsights,
        ),
        NativeModuleItem(
            title = "Profile, alerts & data",
            description = "Profile, currency, theme, deadline alerts, password and complete backup or restore.",
            action = "Open settings",
            icon = JalvoroIcons.Settings,
            onClick = onPersonalPlatform,
        ),
        NativeModuleItem(
            title = "Privacy & security",
            description = "Privacy posture, account security, data export, processing choices, App Lock and screenshot protection.",
            action = "Open privacy",
            icon = JalvoroIcons.Privacy,
            onClick = onPrivacySecurity,
        ),
        NativeModuleItem(
            title = "Accessibility & display",
            description = "High contrast, adaptive tablet layout, large-text protection and Android accessibility controls.",
            action = "Open accessibility",
            icon = JalvoroIcons.Accessibility,
            onClick = onAccessibilityDisplay,
        ),
        NativeModuleItem(
            title = "Motion & interactions",
            description = "Website-equivalent transitions, progress reveals, fast motion and a no-animation accessibility mode.",
            action = "Open motion settings",
            icon = JalvoroIcons.Refresh,
            onClick = onMotionInteractions,
        ),
    )

    Scaffold(
        topBar = {
            Surface(
                color = MaterialTheme.colorScheme.surfaceContainer,
                shadowElevation = 0.dp,
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    JalvoroIconAction(
                        icon = JalvoroIcons.ArrowLeft,
                        label = "Back to overview",
                        onClick = onOverview,
                    )
                    JalvoroBrandLockup(
                        modifier = Modifier.weight(1f),
                        subtitle = "All personal workspaces",
                        compact = true,
                    )
                }
            }
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
                    top = 18.dp,
                    bottom = 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    JalvoroEntrance(index = 0) {
                        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Text(
                                text = "More",
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.semantics { heading() },
                            )
                            Text(
                                text = "Signed in as $email",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.semantics {
                                    contentDescription = "Signed in as $email"
                                },
                            )
                            Text(
                                text = "Every workspace uses real owner-scoped finance data. Business software remains separate from Jalvoro Personal.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                items(
                    items = moduleRows,
                    key = { row -> row.joinToString("|") { it.title } },
                ) { row ->
                    JalvoroEntrance(index = moduleRows.indexOf(row) + 1) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(14.dp),
                        ) {
                            row.forEach { item ->
                                ModuleCard(
                                    item = item,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (row.size == 1 && layout == PersonalAdaptiveLayout.TwoColumn) {
                                Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }

                item {
                    JalvoroEntrance(index = moduleRows.size + 1) {
                        OutlinedButton(
                            onClick = { scope.launch { onSignOut() } },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                        ) {
                            Icon(
                                imageVector = JalvoroIcons.SignOut,
                                contentDescription = null,
                                modifier = Modifier.size(19.dp),
                            )
                            Spacer(Modifier.size(8.dp))
                            Text("Sign out")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ModuleCard(
    item: NativeModuleItem,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = item.onClick,
        modifier = modifier.semantics(mergeDescendants = true) {
            contentDescription = "${item.title}. ${item.description}. ${item.action}"
        },
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(9.dp),
        ) {
            Surface(
                shape = RoundedCornerShape(13.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.primary,
            ) {
                Icon(
                    imageVector = item.icon,
                    contentDescription = null,
                    modifier = Modifier.padding(10.dp).size(22.dp),
                )
            }
            Text(
                text = item.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { heading() },
            )
            Text(
                text = item.description,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium,
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = item.action,
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.size(6.dp))
                Icon(
                    imageVector = JalvoroIcons.ArrowRight,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
            }
        }
    }
}
