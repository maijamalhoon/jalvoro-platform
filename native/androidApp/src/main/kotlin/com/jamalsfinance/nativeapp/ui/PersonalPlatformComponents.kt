package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamalsfinance.shared.personal.AlertSource
import com.jamalsfinance.shared.personal.AlertTone
import com.jamalsfinance.shared.personal.AlertUrgency
import com.jamalsfinance.shared.personal.PersonalAlert
import com.jamalsfinance.shared.personal.PersonalPlatformSnapshot

@Composable
internal fun PersonalSectionLabel(title: String) {
    Text(
        title.uppercase(),
        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp).semantics { heading() },
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.Black,
        color = MaterialTheme.colorScheme.primary,
    )
}

@Composable
private fun PersonalPanel(content: @Composable () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().jalvoroAnimateContentSize(),
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surfaceContainer,
        tonalElevation = 1.dp,
    ) { content() }
}

@Composable
internal fun PersonalSettingsSummaryCard(
    snapshot: PersonalPlatformSnapshot,
    local: NativeLocalPreferences,
) {
    PersonalPanel {
        Column(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                JalvoroBrandMark(
                    modifier = Modifier.size(48.dp),
                    contentDescription = "JALVORO logo",
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "JALVORO Personal Settings",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.semantics { heading() },
                    )
                    Text(
                        "Account, alerts, local display and portable finance data",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                SettingsStatusChip(
                    label = "Account",
                    value = snapshot.profile.preferredCurrency,
                    modifier = Modifier.weight(1f),
                )
                SettingsStatusChip(
                    label = "Alerts",
                    value = if (snapshot.unreadAlertCount == 0) "Clear" else "${snapshot.unreadAlertCount} unread",
                    modifier = Modifier.weight(1f),
                )
                SettingsStatusChip(
                    label = "Theme",
                    value = when (local.themeMode) {
                        NativeThemeMode.System -> "System"
                        NativeThemeMode.Light -> "Light"
                        NativeThemeMode.Dark -> "Dark"
                    },
                    modifier = Modifier.weight(1f),
                )
            }
            Text(
                "Profile, currency and alert preferences sync through your authenticated account. Theme, date format and spacing stay on this Android device.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun SettingsStatusChip(label: String, value: String, modifier: Modifier) {
    Surface(
        modifier = modifier.semantics { contentDescription = "$label: $value" },
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 11.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            JalvoroAnimatedSwap(
                targetState = value,
                label = "settings-status-$label",
            ) { current ->
                Text(current, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
        }
    }
}

@Composable
internal fun PersonalProfileCard(
    snapshot: PersonalPlatformSnapshot,
    avatarBitmap: ImageBitmap?,
    busy: Boolean,
    onChoosePhoto: () -> Unit,
    onEditName: () -> Unit,
) {
    PersonalPanel {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(15.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Surface(
                    modifier = Modifier
                        .size(70.dp)
                        .semantics { contentDescription = "Change profile image" }
                        .clickable(enabled = !busy, onClick = onChoosePhoto),
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primaryContainer,
                ) {
                    if (avatarBitmap == null) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                initials(snapshot.profile.displayName),
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                            )
                        }
                    } else {
                        Image(
                            bitmap = avatarBitmap,
                            contentDescription = "Profile image for ${snapshot.profile.displayName}",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.size(70.dp),
                        )
                    }
                }
                Column(modifier = Modifier.weight(1f)) {
                    JalvoroAnimatedSwap(
                        targetState = snapshot.profile.displayName,
                        label = "settings-display-name",
                    ) { displayName ->
                        Text(
                            displayName,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    Text(
                        snapshot.profile.email,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "Authenticated personal account",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick = onEditName,
                    enabled = !busy,
                    modifier = Modifier.weight(1f),
                ) { Text("Edit display name") }
                OutlinedButton(
                    onClick = onChoosePhoto,
                    enabled = !busy,
                    modifier = Modifier.weight(1f),
                ) { Text("Change photo") }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Stat("Accounts", snapshot.profile.accounts, Modifier.weight(1f))
                Stat("Transactions", snapshot.profile.transactions, Modifier.weight(1f))
                Stat("Categories", snapshot.profile.categories, Modifier.weight(1f))
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Stat("Goals", snapshot.profile.goals, Modifier.weight(1f))
                Stat("Investments", snapshot.profile.investments, Modifier.weight(1f))
                Stat("Currency", snapshot.profile.preferredCurrency, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun Stat(label: String, value: Any, modifier: Modifier) {
    Surface(
        modifier = modifier.semantics { contentDescription = "$label: $value" },
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 11.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            JalvoroAnimatedSwap(
                targetState = value.toString(),
                label = "settings-stat-$label",
            ) { current ->
                Text(current, fontWeight = FontWeight.Bold, maxLines = 1)
            }
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
        }
    }
}

@Composable
internal fun PersonalPreferencesCard(
    snapshot: PersonalPlatformSnapshot,
    local: NativeLocalPreferences,
    busy: Boolean,
    onCurrency: () -> Unit,
    onTheme: () -> Unit,
    onDateFormat: () -> Unit,
    onCompactChanged: (Boolean) -> Unit,
) {
    PersonalPanel {
        Column {
            PersonalCardHeading(
                title = "Account and device preferences",
                description = "Cloud-synced finance defaults are separated from local display choices.",
            )
            HorizontalDivider()
            ActionRow(
                title = "Preferred currency",
                description = "Cloud-synced account default used by Personal finance views",
                value = snapshot.profile.preferredCurrency,
                badge = "SYNCED",
                enabled = !busy,
                onClick = onCurrency,
            )
            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            ActionRow(
                title = "Appearance",
                description = "System, light or dark theme on this Android device",
                value = when (local.themeMode) {
                    NativeThemeMode.System -> "System"
                    NativeThemeMode.Light -> "Light"
                    NativeThemeMode.Dark -> "Dark"
                },
                badge = "DEVICE",
                enabled = !busy,
                onClick = onTheme,
            )
            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            ActionRow(
                title = "Date format",
                description = "Changes how dates are presented on this device",
                value = local.dateFormat.sample,
                badge = "DEVICE",
                enabled = !busy,
                onClick = onDateFormat,
            )
            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            ToggleRow(
                title = "Compact spacing",
                description = "Reduce visual spacing while preserving minimum touch targets",
                checked = local.compactMode,
                enabled = !busy,
                badge = "DEVICE",
                onCheckedChange = onCompactChanged,
            )
        }
    }
}

@Composable
internal fun PersonalNotificationCard(
    snapshot: PersonalPlatformSnapshot,
    busy: Boolean,
    onGoalAlerts: (Boolean) -> Unit,
    onPayableAlerts: (Boolean) -> Unit,
    onAlertClick: (PersonalAlert) -> Unit,
) {
    PersonalPanel {
        Column {
            PersonalCardHeading(
                title = "Planning alerts",
                description = "Derived from your owner-scoped goals and payables. No marketing notifications are configured here.",
                trailing = if (snapshot.unreadAlertCount == 0) "ALL READ" else "${snapshot.unreadAlertCount} UNREAD",
            )
            HorizontalDivider()
            ToggleRow(
                title = "Goal deadline alerts",
                description = "Overdue, due today and next-seven-day goal reminders",
                checked = snapshot.notificationPreferences.goalAlertsEnabled,
                enabled = !busy,
                badge = "SYNCED",
                onCheckedChange = onGoalAlerts,
            )
            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            ToggleRow(
                title = "Payable due alerts",
                description = "Outstanding payables due within the next seven days",
                checked = snapshot.notificationPreferences.payableAlertsEnabled,
                enabled = !busy,
                badge = "SYNCED",
                onCheckedChange = onPayableAlerts,
            )
            HorizontalDivider()
            if (snapshot.alerts.isEmpty()) {
                Text(
                    "All caught up. No goal or payable alerts are active right now.",
                    modifier = Modifier.padding(18.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                snapshot.alerts.forEachIndexed { index, alert ->
                    if (index > 0) HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
                    AlertRow(alert, !busy) { onAlertClick(alert) }
                }
            }
        }
    }
}

@Composable
private fun AlertRow(alert: PersonalAlert, enabled: Boolean, onClick: () -> Unit) {
    val color = when (alert.tone) {
        AlertTone.Danger -> MaterialTheme.colorScheme.error
        AlertTone.Warning -> MaterialTheme.colorScheme.tertiary
        AlertTone.Info -> MaterialTheme.colorScheme.primary
    }
    val source = if (alert.source == AlertSource.Goal) "Goal" else "Payable"
    val state = if (alert.read) "Read" else "Unread"
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "$state $source alert. ${alert.title}. ${urgency(alert.urgency)}. ${alert.dateKey}"
            }
            .clickable(enabled = enabled && !alert.read, onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Surface(
            modifier = Modifier.size(10.dp),
            shape = CircleShape,
            color = if (alert.read) MaterialTheme.colorScheme.outlineVariant else color,
        ) {}
        Column(modifier = Modifier.weight(1f)) {
            Text(alert.title, fontWeight = if (alert.read) FontWeight.Medium else FontWeight.Bold)
            Text(
                "$source · ${urgency(alert.urgency)} · ${alert.dateKey}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        JalvoroAnimatedSwap(
            targetState = if (alert.read) "Read" else "Mark read",
            label = "settings-alert-${alert.id}",
        ) { current ->
            Text(
                current,
                style = MaterialTheme.typography.labelSmall,
                color = if (alert.read) MaterialTheme.colorScheme.onSurfaceVariant else color,
            )
        }
    }
}

@Composable
internal fun PersonalDataCard(busy: Boolean, onExport: () -> Unit, onImport: () -> Unit) {
    PersonalPanel {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                "Complete Personal finance backup",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { heading() },
            )
            Text(
                "Exports owner-scoped accounts, categories, transactions, goals, payables, investments and supported settings to a validated .jfinance file.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
            ) {
                Text(
                    "Imports are additive and duplicate-safe. Existing finance records are not erased by this restore flow.",
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Button(onClick = onExport, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                Text("Export validated .jfinance backup")
            }
            OutlinedButton(onClick = onImport, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                Text("Review and import a backup")
            }
        }
    }
}

@Composable
internal fun PersonalSecurityCard(
    email: String,
    busy: Boolean,
    onPassword: () -> Unit,
    onSignOut: () -> Unit,
) {
    PersonalPanel {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                "Account security",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { heading() },
            )
            Text("Signed in as", style = MaterialTheme.typography.labelSmall)
            Text(email, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                "Password changes apply to this authenticated JALVORO account. Sign out below ends the current device session only.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            OutlinedButton(onClick = onPassword, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                Text("Change account password")
            }
            OutlinedButton(onClick = onSignOut, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                Text("Sign out this device")
            }
        }
    }
}

@Composable
private fun PersonalCardHeading(
    title: String,
    description: String,
    trailing: String? = null,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(18.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { heading() },
            )
            Text(
                description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (trailing != null) {
            JalvoroAnimatedSwap(
                targetState = trailing,
                label = "settings-heading-trailing",
            ) { current ->
                Text(
                    current,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }
    }
}

@Composable
private fun ActionRow(
    title: String,
    description: String,
    value: String,
    badge: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics { contentDescription = "$title. $description. Current value $value. $badge setting." }
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(
                description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                badge,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Black,
            )
        }
        JalvoroAnimatedSwap(
            targetState = value,
            label = "settings-action-$title",
        ) { current ->
            Text(
                current,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
                maxLines = 2,
            )
        }
    }
}

@Composable
private fun ToggleRow(
    title: String,
    description: String,
    checked: Boolean,
    enabled: Boolean,
    badge: String,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics {
                stateDescription = if (checked) "$title enabled" else "$title disabled"
            }
            .toggleable(
                value = checked,
                enabled = enabled,
                role = Role.Switch,
                onValueChange = onCheckedChange,
            )
            .padding(horizontal = 18.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(
                description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                badge,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Black,
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = null,
            enabled = enabled,
        )
    }
}

private fun initials(name: String): String = name.trim().split(Regex("\\s+"))
    .filter(String::isNotBlank)
    .take(2)
    .mapNotNull { it.firstOrNull()?.uppercaseChar() }
    .joinToString("")
    .ifBlank { "JP" }

private fun urgency(value: AlertUrgency): String = when (value) {
    AlertUrgency.Overdue -> "Overdue"
    AlertUrgency.DueToday -> "Due today"
    AlertUrgency.DueSoon -> "Due soon"
}
