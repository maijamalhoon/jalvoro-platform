package com.jamalsfinance.nativeapp.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
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

private enum class JalvoroWebsiteWorkspace {
    Overview,
    Money,
    Planning,
    Investments,
    Reports,
    Settings,
    Privacy,
    Accessibility,
    Motion,
    More,
}

private data class JalvoroWebsiteModuleItem(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val tone: Color,
    val onClick: () -> Unit,
)

@Composable
fun JalvoroWebsiteModuleRootShell(
    email: String,
    financeRepository: FinanceRepository,
    goalsPayablesRepository: GoalsPayablesRepository,
    investmentsAnalyticsRepository: InvestmentsAnalyticsRepository,
    reportsInsightsRepository: ReportsInsightsRepository,
    personalPlatformRepository: PersonalPlatformRepository,
    nativePreferences: AndroidNativePreferences,
    onSignOut: suspend () -> Unit,
) {
    var workspace by remember { mutableStateOf(JalvoroWebsiteWorkspace.Overview) }

    BackHandler(enabled = workspace != JalvoroWebsiteWorkspace.Overview) {
        workspace = when (workspace) {
            JalvoroWebsiteWorkspace.Motion -> JalvoroWebsiteWorkspace.More
            else -> JalvoroWebsiteWorkspace.Overview
        }
    }

    JalvoroAnimatedWorkspace(
        targetState = workspace,
        modifier = Modifier.fillMaxSize(),
    ) { current ->
        when (current) {
            JalvoroWebsiteWorkspace.Overview -> JalvoroOverviewDashboard(
                email = email,
                financeRepository = financeRepository,
                goalsPayablesRepository = goalsPayablesRepository,
                investmentsAnalyticsRepository = investmentsAnalyticsRepository,
                onOpenFinance = { workspace = JalvoroWebsiteWorkspace.Money },
                onOpenPlanning = { workspace = JalvoroWebsiteWorkspace.Planning },
                onOpenInvestments = { workspace = JalvoroWebsiteWorkspace.Investments },
                onOpenReports = { workspace = JalvoroWebsiteWorkspace.Reports },
                onOpenSettings = { workspace = JalvoroWebsiteWorkspace.Settings },
                onOpenMore = { workspace = JalvoroWebsiteWorkspace.More },
            )
            JalvoroWebsiteWorkspace.Money -> JalvoroWebsiteFinanceDashboard(
                email = email,
                financeRepository = financeRepository,
                onOverview = { workspace = JalvoroWebsiteWorkspace.Overview },
                onPlanning = { workspace = JalvoroWebsiteWorkspace.Planning },
                onInvestments = { workspace = JalvoroWebsiteWorkspace.Investments },
                onReports = { workspace = JalvoroWebsiteWorkspace.Reports },
                onSettings = { workspace = JalvoroWebsiteWorkspace.Settings },
                onMore = { workspace = JalvoroWebsiteWorkspace.More },
                onSignOut = onSignOut,
            )
            JalvoroWebsiteWorkspace.Planning -> JalvoroWebsitePlanningRoute(
                email = email,
                repository = goalsPayablesRepository,
                onOverview = { workspace = JalvoroWebsiteWorkspace.Overview },
                onMoney = { workspace = JalvoroWebsiteWorkspace.Money },
                onInvestments = { workspace = JalvoroWebsiteWorkspace.Investments },
                onReports = { workspace = JalvoroWebsiteWorkspace.Reports },
                onSettings = { workspace = JalvoroWebsiteWorkspace.Settings },
                onMore = { workspace = JalvoroWebsiteWorkspace.More },
            )
            JalvoroWebsiteWorkspace.Investments -> JalvoroWebsiteInvestmentsRoute(
                email = email,
                repository = investmentsAnalyticsRepository,
                onOverview = { workspace = JalvoroWebsiteWorkspace.Overview },
                onMoney = { workspace = JalvoroWebsiteWorkspace.Money },
                onPlanning = { workspace = JalvoroWebsiteWorkspace.Planning },
                onReports = { workspace = JalvoroWebsiteWorkspace.Reports },
                onSettings = { workspace = JalvoroWebsiteWorkspace.Settings },
                onMore = { workspace = JalvoroWebsiteWorkspace.More },
            )
            JalvoroWebsiteWorkspace.Reports -> JalvoroWebsiteReportsRoute(
                email = email,
                repository = reportsInsightsRepository,
                onOverview = { workspace = JalvoroWebsiteWorkspace.Overview },
                onMoney = { workspace = JalvoroWebsiteWorkspace.Money },
                onPlanning = { workspace = JalvoroWebsiteWorkspace.Planning },
                onInvestments = { workspace = JalvoroWebsiteWorkspace.Investments },
                onSettings = { workspace = JalvoroWebsiteWorkspace.Settings },
                onMore = { workspace = JalvoroWebsiteWorkspace.More },
            )
            JalvoroWebsiteWorkspace.Settings -> JalvoroWebsiteSettingsRoute(
                repository = personalPlatformRepository,
                preferences = nativePreferences,
                onBack = { workspace = JalvoroWebsiteWorkspace.Overview },
                onSignOut = onSignOut,
            )
            JalvoroWebsiteWorkspace.Privacy -> JalvoroWebsitePrivacyRoute(
                email = email,
                repository = personalPlatformRepository,
                preferences = nativePreferences,
                onBack = { workspace = JalvoroWebsiteWorkspace.More },
                onSignOut = onSignOut,
            )
            JalvoroWebsiteWorkspace.Accessibility -> JalvoroWebsiteAccessibilityRoute(
                preferences = nativePreferences,
                onBack = { workspace = JalvoroWebsiteWorkspace.More },
            )
            JalvoroWebsiteWorkspace.Motion -> JalvoroWebsiteMotionRoute(
                preferences = nativePreferences,
                onBack = { workspace = JalvoroWebsiteWorkspace.More },
            )
            JalvoroWebsiteWorkspace.More -> JalvoroWebsiteMoreWorkspace(
                email = email,
                onOverview = { workspace = JalvoroWebsiteWorkspace.Overview },
                onMoney = { workspace = JalvoroWebsiteWorkspace.Money },
                onPlanning = { workspace = JalvoroWebsiteWorkspace.Planning },
                onInvestments = { workspace = JalvoroWebsiteWorkspace.Investments },
                onReports = { workspace = JalvoroWebsiteWorkspace.Reports },
                onSettings = { workspace = JalvoroWebsiteWorkspace.Settings },
                onPrivacy = { workspace = JalvoroWebsiteWorkspace.Privacy },
                onAccessibility = { workspace = JalvoroWebsiteWorkspace.Accessibility },
                onMotion = { workspace = JalvoroWebsiteWorkspace.Motion },
                onSignOut = onSignOut,
            )
        }
    }
}

@Composable
private fun JalvoroWebsiteMoreWorkspace(
    email: String,
    onOverview: () -> Unit,
    onMoney: () -> Unit,
    onPlanning: () -> Unit,
    onInvestments: () -> Unit,
    onReports: () -> Unit,
    onSettings: () -> Unit,
    onPrivacy: () -> Unit,
    onAccessibility: () -> Unit,
    onMotion: () -> Unit,
    onSignOut: suspend () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val modules = listOf(
        JalvoroWebsiteModuleItem(
            title = "Privacy & security",
            description = "App Lock, screenshot protection, account security and privacy controls.",
            icon = JalvoroIcons.Privacy,
            tone = MaterialTheme.colorScheme.primary,
            onClick = onPrivacy,
        ),
        JalvoroWebsiteModuleItem(
            title = "Accessibility & display",
            description = "High contrast, large-text protection and Android accessibility settings.",
            icon = JalvoroIcons.Accessibility,
            tone = MaterialTheme.colorScheme.secondary,
            onClick = onAccessibility,
        ),
        JalvoroWebsiteModuleItem(
            title = "Motion & interactions",
            description = "Standard, fast and no-animation behavior without changing final values.",
            icon = JalvoroIcons.Refresh,
            tone = Color(0xFF6849B8),
            onClick = onMotion,
        ),
    )

    JalvoroWebsiteWorkspaceShell(
        email = email,
        selected = JalvoroWebsiteDestination.More,
        onOverview = onOverview,
        onMoney = onMoney,
        onPlanning = onPlanning,
        onInvestments = onInvestments,
        onReports = onReports,
        onSettings = onSettings,
        onMore = {},
    ) { shellPadding ->
        BoxWithConstraints(
            modifier = Modifier.fillMaxSize().padding(shellPadding),
            contentAlignment = Alignment.TopCenter,
        ) {
            val fontScale = LocalDensity.current.fontScale
            val widthDp = maxWidth.value.toInt()
            val layout = selectPersonalAdaptiveLayout(widthDp, fontScale)
            val horizontalPadding = personalHorizontalPaddingDp(widthDp).dp
            val rows = if (layout == PersonalAdaptiveLayout.TwoColumn) modules.chunked(2) else modules.map(::listOf)

            LazyColumn(
                modifier = Modifier.fillMaxSize().widthIn(max = 1_000.dp),
                contentPadding = PaddingValues(
                    start = horizontalPadding,
                    end = horizontalPadding,
                    top = 12.dp,
                    bottom = 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "More",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier.semantics { heading() },
                        )
                        Text(
                            text = "Security, accessibility and interaction preferences.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                rows.forEachIndexed { rowIndex, row ->
                    item(key = row.joinToString("|") { it.title }) {
                        JalvoroEntrance(index = rowIndex + 1) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(14.dp),
                            ) {
                                row.forEach { item ->
                                    JalvoroWebsiteModuleCard(item, Modifier.weight(1f))
                                }
                                if (row.size == 1 && layout == PersonalAdaptiveLayout.TwoColumn) {
                                    Spacer(Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
                item {
                    OutlinedButton(
                        onClick = { scope.launch { onSignOut() } },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Icon(JalvoroIcons.SignOut, contentDescription = null, modifier = Modifier.size(19.dp))
                        Spacer(Modifier.size(8.dp))
                        Text("Sign out", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun JalvoroWebsiteModuleCard(
    item: JalvoroWebsiteModuleItem,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = item.onClick,
        modifier = modifier.semantics(mergeDescendants = true) {
            contentDescription = "${item.title}. ${item.description}"
        },
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f)),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Surface(shape = CircleShape, color = item.tone, contentColor = Color.White) {
                Icon(item.icon, contentDescription = null, modifier = Modifier.padding(10.dp).size(21.dp))
            }
            Text(
                text = item.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = item.description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Open",
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
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
