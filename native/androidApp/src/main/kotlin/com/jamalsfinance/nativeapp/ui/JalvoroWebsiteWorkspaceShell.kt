package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
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
                onClose = { scope.launch { drawerState.close() } },
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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background),
        ) {
            content(
                PaddingValues(
                    top = 76.dp,
                    bottom = 24.dp,
                ),
            )
            JalvoroWebsiteFloatingHeader(
                onMenu = { scope.launch { drawerState.open() } },
                onSettings = onSettings,
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter),
            )
        }
    }
}

@Composable
private fun JalvoroWebsiteDrawer(
    email: String,
    selected: JalvoroWebsiteDestination,
    onClose: () -> Unit,
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
        modifier = Modifier
            .fillMaxHeight()
            .fillMaxWidth(0.9f)
            .widthIn(max = 360.dp)
            .navigationBarsPadding(),
        drawerShape = RoundedCornerShape(topEnd = 28.dp, bottomEnd = 28.dp),
        drawerContainerColor = MaterialTheme.colorScheme.surfaceContainer,
        drawerTonalElevation = 0.dp,
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                JalvoroWebsiteBrandLockup(
                    modifier = Modifier.weight(1f),
                    compact = true,
                )
                Surface(
                    onClick = onClose,
                    modifier = Modifier
                        .size(48.dp)
                        .semantics { contentDescription = "Close navigation menu" },
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerLow,
                    contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    border = BorderStroke(
                        1.dp,
                        MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.72f),
                    ),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = JalvoroIcons.Close,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }
            }

            HorizontalDivider(
                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.72f),
            )

            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
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

            HorizontalDivider(
                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.72f),
            )
            JalvoroWebsiteAccountSummary(email = email)
        }
    }
}

@Composable
private fun JalvoroWebsiteDrawerGroupLabel(label: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = label.uppercase(Locale.US),
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 10.sp,
                letterSpacing = 1.25.sp,
            ),
            fontWeight = FontWeight.Black,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        HorizontalDivider(
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.58f),
        )
    }
}

@Composable
private fun JalvoroWebsiteDrawerItem(
    item: JalvoroWebsiteNavigationItem,
    selected: Boolean,
    modifier: Modifier = Modifier,
) {
    NavigationDrawerItem(
        label = {
            Text(
                text = item.label,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        icon = {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = if (selected) {
                    MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                } else {
                    MaterialTheme.colorScheme.surfaceContainerHigh
                },
                contentColor = if (selected) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
            ) {
                Icon(
                    imageVector = item.icon,
                    contentDescription = null,
                    modifier = Modifier.padding(9.dp).size(19.dp),
                )
            }
        },
        selected = selected,
        onClick = item.onClick,
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp),
        shape = RoundedCornerShape(18.dp),
        colors = NavigationDrawerItemDefaults.colors(
            selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
            selectedIconColor = MaterialTheme.colorScheme.primary,
            selectedTextColor = MaterialTheme.colorScheme.onPrimaryContainer,
            unselectedContainerColor = MaterialTheme.colorScheme.surfaceContainerLow.copy(alpha = 0.72f),
            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
        ),
    )
}

@Composable
private fun JalvoroWebsiteAccountSummary(email: String) {
    val initial = email.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "J"
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(14.dp),
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        border = BorderStroke(
            1.dp,
            MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.72f),
        ),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                modifier = Modifier.size(40.dp),
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = initial,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Black,
                    )
                }
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Signed in",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = email,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun JalvoroWebsiteFloatingHeader(
    onMenu: () -> Unit,
    onSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .statusBarsPadding()
            .padding(horizontal = 14.dp, vertical = 6.dp)
            .heightIn(min = 48.dp),
    ) {
        Surface(
            onClick = onMenu,
            modifier = Modifier
                .size(48.dp)
                .align(Alignment.CenterStart)
                .semantics { contentDescription = "Open navigation menu" },
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.98f),
            contentColor = MaterialTheme.colorScheme.onSurface,
            border = BorderStroke(
                1.dp,
                MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.82f),
            ),
            shadowElevation = 1.dp,
        ) {
            val lineColor = MaterialTheme.colorScheme.onSurface
            Canvas(modifier = Modifier.fillMaxSize().padding(13.dp)) {
                val stroke = 2.2.dp.toPx()
                drawLine(
                    color = lineColor,
                    start = Offset(0f, size.height * 0.34f),
                    end = Offset(size.width, size.height * 0.34f),
                    strokeWidth = stroke,
                    cap = StrokeCap.Round,
                )
                drawLine(
                    color = lineColor,
                    start = Offset(0f, size.height * 0.68f),
                    end = Offset(size.width * 0.64f, size.height * 0.68f),
                    strokeWidth = stroke,
                    cap = StrokeCap.Round,
                )
            }
        }

        JalvoroWebsiteBrandLockup(
            modifier = Modifier
                .align(Alignment.Center)
                .widthIn(max = 154.dp),
            subtitle = "Personal",
            compact = true,
        )

        Surface(
            onClick = onSettings,
            modifier = Modifier
                .size(48.dp)
                .align(Alignment.CenterEnd)
                .semantics { contentDescription = "Open profile and settings" },
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.98f),
            contentColor = MaterialTheme.colorScheme.onSurface,
            border = BorderStroke(
                1.dp,
                MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.82f),
            ),
            shadowElevation = 1.dp,
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = JalvoroIcons.User,
                    contentDescription = null,
                    modifier = Modifier.size(21.dp),
                )
            }
        }
    }
}
