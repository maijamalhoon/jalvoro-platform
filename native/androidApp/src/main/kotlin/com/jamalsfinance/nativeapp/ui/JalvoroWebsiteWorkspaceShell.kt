package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.util.Locale
import kotlinx.coroutines.launch

internal enum class JalvoroWebsiteDestination {
    Overview,
    Money,
    Planning,
    Investments,
    Reports,
    Settings,
    More,
}

private data class JalvoroWebsiteNavigationItem(
    val destination: JalvoroWebsiteDestination,
    val label: String,
    val icon: ImageVector,
    val onClick: () -> Unit,
)

/**
 * Shared native counterpart of the website's compact dashboard shell.
 *
 * The website keeps navigation in a floating menu and a left drawer rather
 * than reserving permanent top and bottom bars. Screens render inside the
 * supplied content padding and keep their repository/mutation logic isolated.
 */
@Composable
internal fun JalvoroWebsiteWorkspaceShell(
    email: String,
    selected: JalvoroWebsiteDestination,
    onOverview: () -> Unit,
    onMoney: () -> Unit,
    onPlanning: () -> Unit,
    onInvestments: () -> Unit,
    onReports: () -> Unit,
    onSettings: () -> Unit,
    onMore: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable (PaddingValues) -> Unit,
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    fun select(action: () -> Unit) {
        scope.launch {
            drawerState.close()
            action()
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            JalvoroWebsiteDrawer(
                email = email,
                selected = selected,
                onOverview = { select(onOverview) },
                onMoney = { select(onMoney) },
                onPlanning = { select(onPlanning) },
                onInvestments = { select(onInvestments) },
                onReports = { select(onReports) },
                onSettings = { select(onSettings) },
                onMore = { select(onMore) },
            )
        },
        modifier = modifier,
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            content(
                PaddingValues(
                    top = 80.dp,
                    bottom = 24.dp,
                ),
            )
            JalvoroWebsiteFloatingHeader(
                onMenu = { scope.launch { drawerState.open() } },
                onSettings = onSettings,
                modifier = Modifier.fillMaxWidth().align(Alignment.TopCenter),
            )
        }
    }
}

@Composable
private fun JalvoroWebsiteDrawer(
    email: String,
    selected: JalvoroWebsiteDestination,
    onOverview: () -> Unit,
    onMoney: () -> Unit,
    onPlanning: () -> Unit,
    onInvestments: () -> Unit,
    onReports: () -> Unit,
    onSettings: () -> Unit,
    onMore: () -> Unit,
) {
    val workspaceItems = listOf(
        JalvoroWebsiteNavigationItem(
            destination = JalvoroWebsiteDestination.Overview,
            label = "Overview",
            icon = JalvoroIcons.Dashboard,
            onClick = onOverview,
        ),
        JalvoroWebsiteNavigationItem(
            destination = JalvoroWebsiteDestination.Money,
            label = "Money",
            icon = JalvoroIcons.Wallet,
            onClick = onMoney,
        ),
        JalvoroWebsiteNavigationItem(
            destination = JalvoroWebsiteDestination.Planning,
            label = "Planning",
            icon = JalvoroIcons.Target,
            onClick = onPlanning,
        ),
        JalvoroWebsiteNavigationItem(
            destination = JalvoroWebsiteDestination.Investments,
            label = "Investments",
            icon = JalvoroIcons.Investments,
            onClick = onInvestments,
        ),
        JalvoroWebsiteNavigationItem(
            destination = JalvoroWebsiteDestination.Reports,
            label = "Reports & insights",
            icon = JalvoroIcons.Reports,
            onClick = onReports,
        ),
    )
    val accountItems = listOf(
        JalvoroWebsiteNavigationItem(
            destination = JalvoroWebsiteDestination.Settings,
            label = "Settings",
            icon = JalvoroIcons.Settings,
            onClick = onSettings,
        ),
        JalvoroWebsiteNavigationItem(
            destination = JalvoroWebsiteDestination.More,
            label = "More",
            icon = JalvoroIcons.More,
            onClick = onMore,
        ),
    )

    ModalDrawerSheet(
        modifier = Modifier.fillMaxHeight().widthIn(max = 320.dp),
        drawerShape = RoundedCornerShape(topEnd = 26.dp, bottomEnd = 26.dp),
        drawerContainerColor = MaterialTheme.colorScheme.surfaceContainer,
        drawerTonalElevation = 0.dp,
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            JalvoroWebsiteBrandLockup(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 18.dp, vertical = 16.dp),
                compact = true,
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f))
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                item { JalvoroWebsiteDrawerGroupLabel("Workspace") }
                workspaceItems.forEach { item ->
                    item(key = item.destination.name) {
                        JalvoroWebsiteDrawerItem(
                            item = item,
                            selected = selected == item.destination,
                        )
                    }
                }
                item {
                    Spacer(Modifier.size(8.dp))
                    JalvoroWebsiteDrawerGroupLabel("Account")
                }
                accountItems.forEach { item ->
                    item(key = item.destination.name) {
                        JalvoroWebsiteDrawerItem(
                            item = item,
                            selected = selected == item.destination,
                        )
                    }
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f))
            Text(
                text = email,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 16.dp),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun JalvoroWebsiteDrawerGroupLabel(label: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = label.uppercase(Locale.US),
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 9.sp,
                letterSpacing = 1.4.sp,
            ),
            fontWeight = FontWeight.Black,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        HorizontalDivider(
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f),
        )
    }
}

@Composable
private fun JalvoroWebsiteDrawerItem(
    item: JalvoroWebsiteNavigationItem,
    selected: Boolean,
) {
    NavigationDrawerItem(
        label = { Text(item.label, fontWeight = FontWeight.Bold) },
        icon = {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = if (selected) Color.White.copy(alpha = 0.14f) else MaterialTheme.colorScheme.surface,
                contentColor = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
            ) {
                Icon(
                    imageVector = item.icon,
                    contentDescription = null,
                    modifier = Modifier.padding(8.dp).size(17.dp),
                )
            }
        },
        selected = selected,
        onClick = item.onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = NavigationDrawerItemDefaults.colors(
            selectedContainerColor = MaterialTheme.colorScheme.primary,
            selectedIconColor = Color.White,
            selectedTextColor = Color.White,
            unselectedContainerColor = Color.Transparent,
            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
        ),
    )
}

@Composable
private fun JalvoroWebsiteFloatingHeader(
    onMenu: () -> Unit,
    onSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.statusBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Surface(
            onClick = onMenu,
            modifier = Modifier.size(44.dp).semantics {
                contentDescription = "Open navigation menu"
            },
            shape = RoundedCornerShape(14.dp),
            color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.96f),
            contentColor = MaterialTheme.colorScheme.onSurface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
            shadowElevation = 8.dp,
        ) {
            Canvas(modifier = Modifier.fillMaxSize().padding(12.dp)) {
                val stroke = 2.2.dp.toPx()
                drawLine(
                    color = MaterialTheme.colorScheme.onSurface,
                    start = Offset(0f, size.height * 0.34f),
                    end = Offset(size.width, size.height * 0.34f),
                    strokeWidth = stroke,
                    cap = StrokeCap.Round,
                )
                drawLine(
                    color = MaterialTheme.colorScheme.onSurface,
                    start = Offset(0f, size.height * 0.68f),
                    end = Offset(size.width * 0.62f, size.height * 0.68f),
                    strokeWidth = stroke,
                    cap = StrokeCap.Round,
                )
            }
        }
        Surface(
            onClick = onSettings,
            modifier = Modifier.size(44.dp).semantics {
                contentDescription = "Open profile and settings"
            },
            shape = RoundedCornerShape(14.dp),
            color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.96f),
            contentColor = MaterialTheme.colorScheme.onSurface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
            shadowElevation = 8.dp,
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = JalvoroIcons.User,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}
