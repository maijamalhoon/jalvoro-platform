package com.jamalsfinance.nativeapp.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.personal.BackupExportResult
import com.jamalsfinance.shared.personal.PersonalPlatformRepository
import com.jamalsfinance.shared.personal.PersonalPlatformResult
import com.jamalsfinance.shared.privacy.PrivacyLockTimeout
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val JALVORO_WEB_BASE = "https://jamals-finance-sable.vercel.app"

@Composable
internal fun JalvoroPrivacySecurityDashboard(
    email: String,
    repository: PersonalPlatformRepository,
    preferences: AndroidNativePreferences,
    onBack: () -> Unit,
    onSignOut: suspend () -> Unit,
) {
    val local by preferences.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val uriHandler = LocalUriHandler.current
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var busy by remember { mutableStateOf<String?>(null) }
    var timeoutDialog by remember { mutableStateOf(false) }
    var passwordDialog by remember { mutableStateOf(false) }
    var password by remember { mutableStateOf("") }
    var confirmation by remember { mutableStateOf("") }
    var pendingExport by remember { mutableStateOf<BackupExportResult.Success?>(null) }

    fun announce(message: String) {
        scope.launch { snackbar.showSnackbar(message) }
    }

    fun openWebsite(path: String) {
        runCatching { uriHandler.openUri("$JALVORO_WEB_BASE$path") }
            .onFailure { announce("The secure website could not be opened on this device.") }
    }

    val createBackup = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/vnd.jamals-finance.backup+json"),
    ) { uri ->
        val export = pendingExport
        pendingExport = null
        if (uri == null || export == null) return@rememberLauncherForActivityResult
        scope.launch {
            busy = "write-backup"
            val result = runCatching {
                withContext(Dispatchers.IO) {
                    context.contentResolver.openOutputStream(uri, "wt")?.use { stream ->
                        stream.write(export.contents.encodeToByteArray())
                    } ?: error("Backup destination could not be opened.")
                }
            }
            busy = null
            announce(
                if (result.isSuccess) {
                    "Complete backup saved — ${export.recordCount} finance records."
                } else {
                    result.exceptionOrNull()?.message ?: "Backup could not be saved."
                },
            )
        }
    }

    fun exportBackup() {
        if (busy != null) return
        scope.launch {
            busy = "export"
            when (val result = repository.exportBackup(preferences.clientPreferences())) {
                is BackupExportResult.Success -> {
                    pendingExport = result
                    createBackup.launch("jalvoro-personal-backup-${jalvoroPrivacyTodayKey()}.jfinance")
                }
                is BackupExportResult.Failure -> announce(result.message)
            }
            busy = null
        }
    }

    fun updatePassword() {
        if (busy != null) return
        if (password != confirmation) {
            announce("Passwords do not match.")
            return
        }
        scope.launch {
            busy = "password"
            when (val result = repository.updatePassword(password)) {
                PersonalPlatformResult.Success -> {
                    passwordDialog = false
                    password = ""
                    confirmation = ""
                    announce("Password updated successfully.")
                }
                is PersonalPlatformResult.Failure -> announce(result.message)
            }
            busy = null
        }
    }

    LaunchedEffect(repository) {
        repository.refresh(jalvoroPrivacyTodayKey(), force = false)
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            Surface(
                color = MaterialTheme.colorScheme.surfaceContainer,
                shadowElevation = 0.dp,
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    JalvoroIconAction(
                        icon = JalvoroIcons.ArrowLeft,
                        label = "Back to overview",
                        onClick = onBack,
                    )
                    JalvoroBrandLockup(
                        modifier = Modifier.weight(1f),
                        subtitle = "Privacy & security",
                        compact = true,
                    )
                    if (busy != null) {
                        CircularProgressIndicator(
                            modifier = Modifier.padding(horizontal = 13.dp).size(20.dp),
                            strokeWidth = 2.dp,
                        )
                    }
                }
            }
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(start = 16.dp, top = 14.dp, end = 16.dp, bottom = 36.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(
                        text = "Privacy & security",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.semantics { heading() },
                    )
                    Text(
                        text = "Control this device, secure your account and understand where personal finance data is processed.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            item {
                JalvoroPrivacyPostureCard(
                    email = email,
                    appLockEnabled = local.appLockEnabled,
                    screenshotsBlocked = local.blockScreenshots,
                )
            }

            item { PersonalSectionLabel("Device protection") }
            item {
                PersonalPrivacyCard(
                    local = local,
                    deviceSecurityAvailable = preferences.deviceSecurityAvailable,
                    busy = busy != null,
                    onAppLockChanged = { enabled ->
                        if (enabled && !preferences.deviceSecurityAvailable) {
                            announce("Set a PIN, pattern, password, or biometric screen lock in Android settings first.")
                        } else {
                            preferences.setAppLockEnabled(enabled)
                            announce(if (enabled) "App Lock enabled on this device." else "App Lock disabled on this device.")
                        }
                    },
                    onTimeout = { timeoutDialog = true },
                    onScreenshotsChanged = { enabled ->
                        preferences.setBlockScreenshots(enabled)
                        announce(
                            if (enabled) {
                                "Screenshots and recent-app previews are blocked."
                            } else {
                                "Screenshot protection disabled on this device."
                            },
                        )
                    },
                    onLockNow = preferences::requestLockNow,
                )
            }

            item { PersonalSectionLabel("Account security") }
            item {
                JalvoroPrivacySectionCard(
                    icon = JalvoroIcons.Shield,
                    title = "Secure your account",
                    subtitle = "Authentication changes remain separate from finance records.",
                ) {
                    JalvoroPrivacyActionRow(
                        icon = JalvoroIcons.Lock,
                        title = "Change password",
                        description = "Update the password for $email.",
                        action = "Update",
                        enabled = busy == null,
                        onClick = {
                            password = ""
                            confirmation = ""
                            passwordDialog = true
                        },
                    )
                    JalvoroPrivacyActionRow(
                        icon = JalvoroIcons.User,
                        title = "Other signed-in sessions",
                        description = "Remote session controls are managed through authenticated website settings.",
                        action = "Open website",
                        enabled = busy == null,
                        onClick = { openWebsite("/settings") },
                    )
                    JalvoroPrivacyActionRow(
                        icon = JalvoroIcons.SignOut,
                        title = "Sign out this device",
                        description = "Remove the current local session without deleting finance records.",
                        action = "Sign out",
                        enabled = busy == null,
                        danger = true,
                        onClick = {
                            scope.launch {
                                busy = "sign-out"
                                onSignOut()
                                busy = null
                            }
                        },
                    )
                }
            }

            item { PersonalSectionLabel("Your data") }
            item {
                JalvoroPrivacySectionCard(
                    icon = JalvoroIcons.Reports,
                    title = "Access and portability",
                    subtitle = "Use real export tools and published privacy channels.",
                ) {
                    JalvoroPrivacyActionRow(
                        icon = JalvoroIcons.Reports,
                        title = "Download complete backup",
                        description = "Prepare an authenticated owner-scoped backup of supported personal finance records.",
                        action = "Export",
                        enabled = busy == null,
                        onClick = ::exportBackup,
                    )
                    JalvoroPrivacyActionRow(
                        icon = JalvoroIcons.Privacy,
                        title = "Privacy notice",
                        description = "Review collection, providers, retention, rights and international processing.",
                        action = "Read",
                        enabled = busy == null,
                        onClick = { openWebsite("/privacy") },
                    )
                    JalvoroPrivacyActionRow(
                        icon = JalvoroIcons.Mail,
                        title = "Privacy or deletion request",
                        description = "Use the published support channel for verified account-level requests.",
                        action = "Support",
                        enabled = busy == null,
                        onClick = { openWebsite("/support") },
                    )
                }
            }

            item { PersonalSectionLabel("Processing choices") }
            item {
                JalvoroPrivacySectionCard(
                    icon = JalvoroIcons.Investments,
                    title = "AI remains optional",
                    subtitle = "Core finance tracking and reports do not require an external AI model.",
                ) {
                    JalvoroPrivacyBoundaryRow("Core finance", "Supabase-backed records and deterministic calculations")
                    JalvoroPrivacyBoundaryRow("External AI", "Used only when you open AI Insights and submit a question")
                    JalvoroPrivacyBoundaryRow("AI context", "Summarized totals, categories, goals, payables, investments and trends")
                    JalvoroPrivacyBoundaryRow("Never included", "Passwords, access tokens, service-role keys or banking credentials")
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { openWebsite("/privacy#ai") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        enabled = busy == null,
                    ) {
                        Icon(JalvoroIcons.Privacy, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Review AI privacy details")
                    }
                }
            }

            item { PersonalSectionLabel("Security architecture") }
            item {
                JalvoroPrivacySectionCard(
                    icon = JalvoroIcons.Privacy,
                    title = "Layered protection",
                    subtitle = "No single control is presented as absolute security.",
                ) {
                    JalvoroPrivacyBoundaryRow("Transport", "Encrypted HTTPS connections")
                    JalvoroPrivacyBoundaryRow("Authentication", "Supabase user access token")
                    JalvoroPrivacyBoundaryRow("Database", "Owner-scoped Row Level Security")
                    JalvoroPrivacyBoundaryRow("Saved session", "Android Keystore-backed secure storage")
                    JalvoroPrivacyBoundaryRow("Local preferences", "Theme, display and lock choices only")
                    JalvoroPrivacyBoundaryRow("Screenshots", if (local.blockScreenshots) "Blocked on this device" else "Allowed on this device")
                    JalvoroFeedbackCard(
                        message = "JALVORO never asks for online-banking passwords, payment-card security codes or brokerage login credentials. Do not place those secrets in notes, AI questions, support messages or backup files.",
                        tone = JalvoroFeedbackTone.Warning,
                        modifier = Modifier.padding(top = 10.dp),
                    )
                }
            }
        }
    }

    if (timeoutDialog) {
        PersonalChoiceDialog(
            title = "Auto-lock timing",
            values = PrivacyLockTimeout.entries.toList(),
            selected = local.autoLockTimeout,
            label = { it.label },
            onSelect = {
                preferences.setAutoLockTimeout(it)
                timeoutDialog = false
                announce("Auto-lock set to ${it.label.lowercase()}.")
            },
            onDismiss = { timeoutDialog = false },
        )
    }

    if (passwordDialog) {
        PersonalPasswordDialog(
            password = password,
            confirmation = confirmation,
            busy = busy != null,
            onPasswordChange = { password = it.take(128) },
            onConfirmationChange = { confirmation = it.take(128) },
            onConfirm = ::updatePassword,
            onDismiss = {
                if (busy == null) {
                    passwordDialog = false
                    password = ""
                    confirmation = ""
                }
            },
        )
    }
}

@Composable
private fun JalvoroPrivacyPostureCard(
    email: String,
    appLockEnabled: Boolean,
    screenshotsBlocked: Boolean,
) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(
                        imageVector = JalvoroIcons.Shield,
                        contentDescription = null,
                        modifier = Modifier.padding(11.dp).size(23.dp),
                    )
                }
                Column(Modifier.weight(1f)) {
                    Text("Privacy posture", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        email,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                JalvoroPrivacyStatusPill("AUTHENTICATED", Color(0xFF17815F))
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                JalvoroPrivacyMiniStatus(
                    label = "Database",
                    value = "Owner scoped",
                    secure = true,
                    modifier = Modifier.weight(1f),
                )
                JalvoroPrivacyMiniStatus(
                    label = "App Lock",
                    value = if (appLockEnabled) "Enabled" else "Off",
                    secure = appLockEnabled,
                    modifier = Modifier.weight(1f),
                )
                JalvoroPrivacyMiniStatus(
                    label = "Screenshots",
                    value = if (screenshotsBlocked) "Blocked" else "Allowed",
                    secure = screenshotsBlocked,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun JalvoroPrivacyMiniStatus(
    label: String,
    value: String,
    secure: Boolean,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(Modifier.padding(11.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                value,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = if (secure) Color(0xFF17815F) else MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun JalvoroPrivacyStatusPill(label: String, tone: Color) {
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
private fun JalvoroPrivacySectionCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    content: @Composable () -> Unit,
) {
    JalvoroSurfaceCard {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(icon, contentDescription = null, modifier = Modifier.padding(9.dp).size(19.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Spacer(Modifier.height(13.dp))
            content()
        }
    }
}

@Composable
private fun JalvoroPrivacyActionRow(
    icon: ImageVector,
    title: String,
    description: String,
    action: String,
    enabled: Boolean,
    onClick: () -> Unit,
    danger: Boolean = false,
) {
    Surface(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        shape = RoundedCornerShape(15.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(13.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(11.dp),
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = if (danger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
            )
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(title, fontWeight = FontWeight.SemiBold)
                Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (danger) {
                OutlinedButton(onClick = onClick, enabled = enabled, shape = RoundedCornerShape(12.dp)) {
                    Text(action, color = MaterialTheme.colorScheme.error)
                }
            } else {
                Button(onClick = onClick, enabled = enabled, shape = RoundedCornerShape(12.dp)) {
                    Text(action)
                }
            }
        }
    }
}

@Composable
private fun JalvoroPrivacyBoundaryRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            label,
            modifier = Modifier.weight(0.38f),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.width(12.dp))
        Text(
            value,
            modifier = Modifier.weight(0.62f),
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

private fun jalvoroPrivacyTodayKey(): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("Asia/Karachi")
    }.format(Date())
