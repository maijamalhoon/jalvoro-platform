package com.jamalsfinance.nativeapp.ui

import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
internal fun PersonalPrivacyCard(
    local: NativeLocalPreferences,
    deviceSecurityAvailable: Boolean,
    busy: Boolean,
    onAppLockChanged: (Boolean) -> Unit,
    onTimeout: () -> Unit,
    onScreenshotsChanged: (Boolean) -> Unit,
    onLockNow: () -> Unit,
) {
    val context = LocalContext.current
    JalvoroSurfaceCard {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(18.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(
                        imageVector = JalvoroIcons.Lock,
                        contentDescription = null,
                        modifier = Modifier.padding(11.dp).size(23.dp),
                    )
                }
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("App Lock", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        text = "Android verifies identity before personal finance screens are shown.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                AppLockStatusPill(
                    label = when {
                        local.appLockEnabled -> "ACTIVE"
                        !deviceSecurityAvailable -> "SETUP NEEDED"
                        else -> "OFF"
                    },
                    active = local.appLockEnabled,
                    warning = !deviceSecurityAvailable,
                )
            }

            HorizontalDivider()
            AppLockFactRow(
                title = "Android device security",
                description = if (deviceSecurityAvailable) {
                    "A PIN, pattern, password or supported biometric is ready."
                } else {
                    "Configure a secure Android screen lock before enabling App Lock."
                },
                value = if (deviceSecurityAvailable) "Ready" else "Required",
                positive = deviceSecurityAvailable,
            )

            if (!deviceSecurityAvailable) {
                OutlinedButton(
                    onClick = {
                        runCatching {
                            context.startActivity(
                                Intent(Settings.ACTION_SECURITY_SETTINGS)
                                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                            )
                        }
                    },
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Icon(JalvoroIcons.Settings, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Open Android security settings")
                }
            }

            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            AppLockToggleRow(
                icon = JalvoroIcons.Shield,
                title = "Require device authentication",
                description = if (deviceSecurityAvailable) {
                    "Use biometrics or the Android device credential."
                } else {
                    "Unavailable until Android device security is configured."
                },
                checked = local.appLockEnabled,
                enabled = !busy && (deviceSecurityAvailable || local.appLockEnabled),
                onCheckedChange = onAppLockChanged,
            )

            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(
                        enabled = local.appLockEnabled && !busy,
                        onClick = onTimeout,
                    )
                    .semantics {
                        contentDescription = "Auto-lock timing. ${local.autoLockTimeout.label}."
                    }
                    .padding(horizontal = 18.dp, vertical = 15.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(11.dp),
            ) {
                Icon(
                    imageVector = JalvoroIcons.Refresh,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = if (local.appLockEnabled) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("Auto-lock timing", fontWeight = FontWeight.SemiBold)
                    Text(
                        "Measured after JALVORO leaves the foreground; a fresh process always starts locked.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    local.autoLockTimeout.label,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (local.appLockEnabled) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
            }

            HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
            AppLockToggleRow(
                icon = JalvoroIcons.EyeOff,
                title = "Block screenshots and previews",
                description = "Apply Android FLAG_SECURE to finance screens and the recent-app snapshot.",
                checked = local.blockScreenshots,
                enabled = !busy,
                onCheckedChange = onScreenshotsChanged,
            )

            if (local.appLockEnabled) {
                HorizontalDivider()
                Column(
                    modifier = Modifier.fillMaxWidth().padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    JalvoroFeedbackCard(
                        message = "App Lock is active. Unlock success is kept only for the current foreground session and is cleared according to your selected timeout.",
                        tone = JalvoroFeedbackTone.Success,
                    )
                    Button(
                        onClick = onLockNow,
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Icon(JalvoroIcons.Lock, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Lock JALVORO now")
                    }
                }
            }
        }
    }
}

@Composable
private fun AppLockStatusPill(
    label: String,
    active: Boolean,
    warning: Boolean,
) {
    val tone = when {
        active -> Color(0xFF17815F)
        warning -> Color(0xFF9B650A)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = tone.copy(alpha = 0.1f),
        contentColor = tone,
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Black,
        )
    }
}

@Composable
private fun AppLockFactRow(
    title: String,
    description: String,
    value: String,
    positive: Boolean,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(11.dp),
    ) {
        Icon(
            imageVector = JalvoroIcons.Shield,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = if (positive) Color(0xFF17815F) else MaterialTheme.colorScheme.error,
        )
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(
            value,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = if (positive) Color(0xFF17815F) else MaterialTheme.colorScheme.error,
        )
    }
}

@Composable
private fun AppLockToggleRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    description: String,
    checked: Boolean,
    enabled: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(11.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = if (enabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            enabled = enabled,
        )
    }
}

@Composable
internal fun PrivacyPanel(content: @Composable () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surfaceContainer,
    ) {
        content()
    }
}
