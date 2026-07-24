package com.jamalsfinance.nativeapp.ui

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.personal.BackupExportResult
import com.jamalsfinance.shared.personal.BackupImportResult
import com.jamalsfinance.shared.personal.BackupValidationResult
import com.jamalsfinance.shared.personal.MAX_AVATAR_BYTES
import com.jamalsfinance.shared.personal.MAX_FINANCE_BACKUP_BYTES
import com.jamalsfinance.shared.personal.PersonalPlatformRepository
import com.jamalsfinance.shared.personal.PersonalPlatformResult
import com.jamalsfinance.shared.personal.PersonalPlatformSnapshot
import com.jamalsfinance.shared.personal.PersonalPlatformState
import com.jamalsfinance.shared.personal.SUPPORTED_PERSONAL_CURRENCIES
import com.jamalsfinance.shared.personal.validateBackupPayload
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class PendingJalvoroPersonalImport(
    val raw: String,
    val recordCount: Int,
    val fileName: String,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun JalvoroPersonalSettingsScreen(
    repository: PersonalPlatformRepository,
    preferences: AndroidNativePreferences,
    onBack: () -> Unit,
    onSignOut: suspend () -> Unit,
) {
    val state by repository.state.collectAsStateWithLifecycle()
    val localPreferences by preferences.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    val snapshot = state.jalvoroSnapshotOrNull()

    var busy by remember { mutableStateOf<String?>(null) }
    var avatarBitmap by remember { mutableStateOf<ImageBitmap?>(null) }
    var nameDialog by remember { mutableStateOf(false) }
    var passwordDialog by remember { mutableStateOf(false) }
    var currencyDialog by remember { mutableStateOf(false) }
    var themeDialog by remember { mutableStateOf(false) }
    var dateDialog by remember { mutableStateOf(false) }
    var importDialog by remember { mutableStateOf(false) }
    var draftName by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmation by remember { mutableStateOf("") }
    var pendingExport by remember { mutableStateOf<BackupExportResult.Success?>(null) }
    var pendingImport by remember { mutableStateOf<PendingJalvoroPersonalImport?>(null) }

    fun announce(message: String) {
        scope.launch { snackbar.showSnackbar(message) }
    }

    fun runAction(
        key: String,
        success: String,
        action: suspend () -> PersonalPlatformResult,
    ) {
        if (busy != null) return
        scope.launch {
            busy = key
            when (val result = action()) {
                PersonalPlatformResult.Success -> announce(success)
                is PersonalPlatformResult.Failure -> announce(result.message)
            }
            busy = null
        }
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
                    context.contentResolver.openOutputStream(uri, "wt")?.use {
                        it.write(export.contents.encodeToByteArray())
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

    val openBackup = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            busy = "read-backup"
            val result = runCatching {
                withContext(Dispatchers.IO) {
                    val raw = readJalvoroPersonalUri(context, uri, MAX_FINANCE_BACKUP_BYTES).decodeToString()
                    when (val validation = validateBackupPayload(raw)) {
                        is BackupValidationResult.Valid -> PendingJalvoroPersonalImport(
                            raw = raw,
                            recordCount = validation.recordCount,
                            fileName = uri.lastPathSegment?.substringAfterLast('/') ?: "backup.jfinance",
                        )
                        is BackupValidationResult.Invalid -> error(validation.message)
                    }
                }
            }
            busy = null
            result.onSuccess {
                pendingImport = it
                importDialog = true
            }.onFailure {
                announce(it.message ?: "This backup could not be opened.")
            }
        }
    }

    val chooseAvatar = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            busy = "avatar"
            val selected = runCatching {
                withContext(Dispatchers.IO) {
                    val bytes = readJalvoroPersonalUri(context, uri, MAX_AVATAR_BYTES)
                    val mime = context.contentResolver.getType(uri).orEmpty()
                    Triple(bytes, mime, jalvoroAvatarExtension(mime, uri))
                }
            }
            if (selected.isFailure) {
                busy = null
                announce(selected.exceptionOrNull()?.message ?: "Profile image could not be opened.")
                return@launch
            }
            val (bytes, mime, extension) = selected.getOrThrow()
            when (val result = repository.uploadAvatar(bytes, mime, extension)) {
                PersonalPlatformResult.Success -> {
                    avatarBitmap = decodeJalvoroBitmap(bytes)
                    announce("Profile image updated.")
                }
                is PersonalPlatformResult.Failure -> announce(result.message)
            }
            busy = null
        }
    }

    LaunchedEffect(repository) {
        repository.refresh(jalvoroTodayKey(), force = true)
    }

    LaunchedEffect(snapshot?.profile?.avatarPath) {
        if (snapshot?.profile?.avatarPath == null) {
            avatarBitmap = null
        } else if (avatarBitmap == null) {
            avatarBitmap = withContext(Dispatchers.IO) {
                repository.downloadAvatar()?.let(::decodeJalvoroBitmap)
            }
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
                title = {
                    Column {
                        Text(
                            "Personal Settings",
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.semantics { heading() },
                        )
                        Text(
                            "JALVORO account and device preferences",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                actions = {
                    TextButton(
                        enabled = busy == null,
                        onClick = {
                            scope.launch {
                                busy = "refresh"
                                when (val result = repository.refresh(jalvoroTodayKey(), force = true)) {
                                    PersonalPlatformResult.Success -> announce("Settings refreshed.")
                                    is PersonalPlatformResult.Failure -> announce(result.message)
                                }
                                busy = null
                            }
                        },
                    ) { Text("Refresh") }
                },
            )
        },
    ) { padding ->
        when {
            snapshot == null && state is PersonalPlatformState.Loading -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .semantics { liveRegion = LiveRegionMode.Polite },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    CircularProgressIndicator()
                    Spacer(Modifier.height(12.dp))
                    Text("Loading JALVORO Personal settings…")
                }
            }
            snapshot == null && state is PersonalPlatformState.Failure -> {
                Column(
                    modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        (state as PersonalPlatformState.Failure).message,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Assertive },
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = {
                        scope.launch { repository.refresh(jalvoroTodayKey(), force = true) }
                    }) { Text("Try again") }
                }
            }
            snapshot != null -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(
                        start = 18.dp,
                        end = 18.dp,
                        top = if (localPreferences.compactMode) 8.dp else 16.dp,
                        bottom = 32.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(
                        if (localPreferences.compactMode) 9.dp else 14.dp,
                    ),
                ) {
                    item {
                        PersonalSettingsSummaryCard(
                            snapshot = snapshot,
                            local = localPreferences,
                        )
                    }
                    item { PersonalSectionLabel("Profile") }
                    item {
                        PersonalProfileCard(
                            snapshot = snapshot,
                            avatarBitmap = avatarBitmap,
                            busy = busy != null,
                            onChoosePhoto = {
                                chooseAvatar.launch(arrayOf("image/jpeg", "image/png", "image/webp"))
                            },
                            onEditName = {
                                draftName = snapshot.profile.displayName
                                nameDialog = true
                            },
                        )
                    }
                    item { PersonalSectionLabel("Preferences") }
                    item {
                        PersonalPreferencesCard(
                            snapshot = snapshot,
                            local = localPreferences,
                            busy = busy != null,
                            onCurrency = { currencyDialog = true },
                            onTheme = { themeDialog = true },
                            onDateFormat = { dateDialog = true },
                            onCompactChanged = {
                                preferences.setCompactMode(it)
                                announce(if (it) "Compact spacing enabled." else "Comfortable spacing enabled.")
                            },
                        )
                    }
                    item { PersonalSectionLabel("Notifications") }
                    item {
                        PersonalNotificationCard(
                            snapshot = snapshot,
                            busy = busy != null,
                            onGoalAlerts = { enabled ->
                                runAction("goal-alerts", "Goal alerts updated.") {
                                    repository.updateNotificationPreferences(
                                        goalAlertsEnabled = enabled,
                                        payableAlertsEnabled = snapshot.notificationPreferences.payableAlertsEnabled,
                                    )
                                }
                            },
                            onPayableAlerts = { enabled ->
                                runAction("payable-alerts", "Payable alerts updated.") {
                                    repository.updateNotificationPreferences(
                                        goalAlertsEnabled = snapshot.notificationPreferences.goalAlertsEnabled,
                                        payableAlertsEnabled = enabled,
                                    )
                                }
                            },
                            onAlertClick = { alert ->
                                if (!alert.read) {
                                    runAction("alert", "Notification marked as read.") {
                                        repository.markAlertRead(alert.id)
                                    }
                                }
                            },
                        )
                    }
                    item { PersonalSectionLabel("Data portability") }
                    item {
                        PersonalDataCard(
                            busy = busy != null,
                            onExport = {
                                if (busy == null) scope.launch {
                                    busy = "export"
                                    when (val result = repository.exportBackup(preferences.clientPreferences())) {
                                        is BackupExportResult.Success -> {
                                            pendingExport = result
                                            createBackup.launch(
                                                "jalvoro-personal-backup-${jalvoroTodayKey()}.jfinance",
                                            )
                                        }
                                        is BackupExportResult.Failure -> announce(result.message)
                                    }
                                    busy = null
                                }
                            },
                            onImport = { if (busy == null) openBackup.launch(arrayOf("*/*")) },
                        )
                    }
                    item { PersonalSectionLabel("Account security") }
                    item {
                        PersonalSecurityCard(
                            email = snapshot.profile.email,
                            busy = busy != null,
                            onPassword = {
                                password = ""
                                confirmation = ""
                                passwordDialog = true
                            },
                            onSignOut = {
                                if (busy == null) scope.launch {
                                    busy = "sign-out"
                                    onSignOut()
                                    busy = null
                                }
                            },
                        )
                    }
                    if (state is PersonalPlatformState.Failure) {
                        item {
                            Text(
                                (state as PersonalPlatformState.Failure).message,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                            )
                        }
                    }
                }
            }
        }
    }

    if (nameDialog) {
        PersonalNameDialog(
            value = draftName,
            busy = busy != null,
            onValueChange = { draftName = it },
            onConfirm = {
                nameDialog = false
                runAction("profile", "Profile updated.") { repository.updateDisplayName(draftName) }
            },
            onDismiss = { nameDialog = false },
        )
    }

    if (passwordDialog) {
        PersonalPasswordDialog(
            password = password,
            confirmation = confirmation,
            busy = busy != null,
            onPasswordChange = { password = it },
            onConfirmationChange = { confirmation = it },
            onConfirm = {
                if (password != confirmation) {
                    announce("Passwords do not match.")
                } else {
                    passwordDialog = false
                    runAction("password", "Password updated successfully.") {
                        repository.updatePassword(password)
                    }
                }
            },
            onDismiss = { passwordDialog = false },
        )
    }

    if (currencyDialog && snapshot != null) {
        PersonalChoiceDialog(
            title = "Preferred account currency",
            values = SUPPORTED_PERSONAL_CURRENCIES,
            selected = snapshot.profile.preferredCurrency,
            label = { it },
            onSelect = {
                currencyDialog = false
                runAction("currency", "Currency set to $it.") { repository.updateCurrency(it) }
            },
            onDismiss = { currencyDialog = false },
        )
    }

    if (themeDialog) {
        PersonalChoiceDialog(
            title = "Appearance on this device",
            values = NativeThemeMode.entries.toList(),
            selected = localPreferences.themeMode,
            label = {
                when (it) {
                    NativeThemeMode.System -> "Follow Android system"
                    NativeThemeMode.Light -> "Light"
                    NativeThemeMode.Dark -> "Dark"
                }
            },
            onSelect = {
                preferences.setThemeMode(it)
                themeDialog = false
                announce("Appearance updated on this device.")
            },
            onDismiss = { themeDialog = false },
        )
    }

    if (dateDialog) {
        PersonalChoiceDialog(
            title = "Date format on this device",
            values = NativeDateFormat.entries.toList(),
            selected = localPreferences.dateFormat,
            label = { "${it.sample} · ${it.storageValue}" },
            onSelect = {
                preferences.setDateFormat(it)
                dateDialog = false
                announce("Date format updated on this device.")
            },
            onDismiss = { dateDialog = false },
        )
    }

    val selectedImport = pendingImport
    if (importDialog && selectedImport != null) {
        PersonalImportDialog(
            fileName = selectedImport.fileName,
            recordCount = selectedImport.recordCount,
            busy = busy != null,
            onConfirm = {
                importDialog = false
                scope.launch {
                    busy = "import"
                    when (val result = repository.importBackup(selectedImport.raw)) {
                        is BackupImportResult.Success -> announce(
                            if (result.alreadyImported) {
                                "This backup was already imported. No duplicates were added."
                            } else {
                                "Import complete — ${result.totalAdded} records added."
                            },
                        )
                        is BackupImportResult.Failure -> announce(result.message)
                    }
                    busy = null
                    pendingImport = null
                }
            },
            onDismiss = {
                importDialog = false
                pendingImport = null
            },
        )
    }
}

private fun PersonalPlatformState.jalvoroSnapshotOrNull(): PersonalPlatformSnapshot? = when (this) {
    is PersonalPlatformState.Ready -> snapshot
    is PersonalPlatformState.Loading -> previous
    is PersonalPlatformState.Failure -> previous
    PersonalPlatformState.Idle -> null
}

private fun jalvoroTodayKey(): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

private fun jalvoroAvatarExtension(mimeType: String, uri: Uri): String = when (mimeType.lowercase()) {
    "image/jpeg" -> "jpg"
    "image/png" -> "png"
    "image/webp" -> "webp"
    else -> uri.lastPathSegment?.substringAfterLast('.', "")?.lowercase().orEmpty()
}

private fun decodeJalvoroBitmap(bytes: ByteArray): ImageBitmap? =
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap()

private fun readJalvoroPersonalUri(context: Context, uri: Uri, maxBytes: Int): ByteArray {
    val output = ByteArrayOutputStream()
    context.contentResolver.openInputStream(uri)?.use { input ->
        val buffer = ByteArray(16 * 1024)
        while (true) {
            val count = input.read(buffer)
            if (count < 0) break
            if (output.size() + count > maxBytes) error("This file is too large.")
            output.write(buffer, 0, count)
        }
    } ?: error("This file could not be opened.")
    val bytes = output.toByteArray()
    if (bytes.isEmpty()) error("This file is empty.")
    return bytes
}
