package com.jamalsfinance.nativeapp.ui

import android.content.Intent
import android.provider.Settings
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.jamalsfinance.shared.accessibility.PersonalAdaptiveLayout
import com.jamalsfinance.shared.accessibility.PersonalTextScale
import com.jamalsfinance.shared.accessibility.classifyPersonalTextScale
import com.jamalsfinance.shared.accessibility.personalContentMaxWidthDp
import com.jamalsfinance.shared.accessibility.personalHorizontalPaddingDp
import com.jamalsfinance.shared.accessibility.selectPersonalAdaptiveLayout
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

private data class JalvoroAccessibilityStatus(
    val label: String,
    val value: String,
    val description: String,
)

@Composable
internal fun JalvoroAccessibilityDisplayDashboard(
    preferences: AndroidNativePreferences,
    onBack: () -> Unit,
) {
    val local by preferences.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val density = LocalDensity.current
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var resetDialog by remember { mutableStateOf(false) }

    fun announce(message: String) {
        scope.launch { snackbar.showSnackbar(message) }
    }

    fun openAndroidSettings(action: String, failure: String) {
        runCatching {
            context.startActivity(
                Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        }.onFailure { announce(failure) }
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
                        subtitle = "Accessibility & display",
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
            val fontScale = density.fontScale
            val adaptiveLayout = selectPersonalAdaptiveLayout(widthDp, fontScale)
            val textScale = classifyPersonalTextScale(fontScale)
            val horizontalPadding = personalHorizontalPaddingDp(widthDp).dp
            val contentMaxWidth = personalContentMaxWidthDp(fontScale).dp
            val compactGap = if (local.compactMode) 10.dp else 15.dp

            LazyColumn(
                modifier = Modifier.fillMaxSize().widthIn(max = contentMaxWidth),
                contentPadding = PaddingValues(
                    start = horizontalPadding,
                    top = if (local.compactMode) 10.dp else 16.dp,
                    end = horizontalPadding,
                    bottom = 36.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(compactGap),
            ) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text(
                            text = "Accessibility & display",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.semantics { heading() },
                        )
                        Text(
                            text = "Make Jalvoro Personal easier to read and operate without changing your finance records.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                item {
                    JalvoroAccessibilityPostureCard(
                        statuses = listOf(
                            JalvoroAccessibilityStatus(
                                label = "Android text size",
                                value = fontScale.accessibilityPercent(),
                                description = textScale.accessibilityLabel(),
                            ),
                            JalvoroAccessibilityStatus(
                                label = "Adaptive layout",
                                value = if (adaptiveLayout == PersonalAdaptiveLayout.TwoColumn) {
                                    "Two columns"
                                } else {
                                    "Single column"
                                },
                                description = if (adaptiveLayout == PersonalAdaptiveLayout.TwoColumn) {
                                    "Wide window and readable text scale"
                                } else {
                                    "Safer for this window or text scale"
                                },
                            ),
                            JalvoroAccessibilityStatus(
                                label = "Appearance",
                                value = local.themeMode.accessibilityLabel(),
                                description = if (local.highContrast) "High contrast" else "Standard contrast",
                            ),
                            JalvoroAccessibilityStatus(
                                label = "Spacing",
                                value = if (local.compactMode) "Compact" else "Comfortable",
                                description = "Touch targets remain usable",
                            ),
                        ),
                        twoColumns = adaptiveLayout == PersonalAdaptiveLayout.TwoColumn,
                    )
                }

                item { PersonalSectionLabel("Appearance") }
                item {
                    JalvoroAccessibilitySectionCard(
                        icon = JalvoroIcons.Eye,
                        title = "Theme and readability",
                        subtitle = "Changes apply immediately and stay on this Android device.",
                    ) {
                        NativeThemeMode.entries.forEachIndexed { index, mode ->
                            AccessibilityThemeRow(
                                mode = mode,
                                selected = local.themeMode == mode,
                                onSelect = {
                                    preferences.setThemeMode(mode)
                                    announce("${mode.accessibilityLabel()} theme selected.")
                                },
                            )
                            if (index != NativeThemeMode.entries.lastIndex) {
                                HorizontalDivider(modifier = Modifier.padding(start = 52.dp))
                            }
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 5.dp))
                        AccessibilityToggleRow(
                            title = "High contrast",
                            description = "Strengthen text, controls, outlines and surface separation in light or dark mode.",
                            checked = local.highContrast,
                            onCheckedChange = {
                                preferences.setHighContrast(it)
                                announce(if (it) "High contrast enabled." else "Standard contrast enabled.")
                            },
                        )
                        HorizontalDivider(modifier = Modifier.padding(start = 18.dp))
                        AccessibilityToggleRow(
                            title = "Compact spacing",
                            description = "Reduce visual gaps while preserving Material touch targets and readable labels.",
                            checked = local.compactMode,
                            onCheckedChange = {
                                preferences.setCompactMode(it)
                                announce(if (it) "Compact spacing enabled." else "Comfortable spacing enabled.")
                            },
                        )
                    }
                }

                item { PersonalSectionLabel("Live preview") }
                item {
                    JalvoroAccessibilityPreviewCard(
                        compact = local.compactMode,
                        highContrast = local.highContrast,
                        onAnnounce = {
                            announce("Accessibility preview announced. Current theme is ${local.themeMode.accessibilityLabel().lowercase()} with ${if (local.highContrast) "high" else "standard"} contrast.")
                        },
                    )
                }

                item { PersonalSectionLabel("Automatic support") }
                item {
                    JalvoroAccessibilitySectionCard(
                        icon = JalvoroIcons.Accessibility,
                        title = "Android accessibility support",
                        subtitle = "Jalvoro follows system text size and assistive technology instead of replacing them.",
                    ) {
                        AccessibilityCapabilityRow(
                            title = "System text scaling",
                            description = "Current Android text scale is ${fontScale.accessibilityPercent()}. App typography scales automatically.",
                        )
                        AccessibilityCapabilityRow(
                            title = "Large-text layout protection",
                            description = "Tablet and large-window grids fall back to one column above 125% text scaling.",
                        )
                        AccessibilityCapabilityRow(
                            title = "TalkBack and Switch Access",
                            description = "Important headings, grouped cards, switch states, loading feedback and errors expose semantic labels.",
                        )
                        AccessibilityCapabilityRow(
                            title = "Touch and keyboard safety",
                            description = "Primary controls keep Material touch targets and forms remain compatible with Android keyboard resizing.",
                        )
                        Spacer(Modifier.height(5.dp))
                        Button(
                            onClick = {
                                openAndroidSettings(
                                    Settings.ACTION_ACCESSIBILITY_SETTINGS,
                                    "Android accessibility settings could not be opened.",
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(15.dp),
                        ) {
                            Icon(
                                imageVector = JalvoroIcons.Accessibility,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(Modifier.width(8.dp))
                            Text("Open accessibility settings")
                        }
                        Spacer(Modifier.height(8.dp))
                        OutlinedButton(
                            onClick = {
                                openAndroidSettings(
                                    Settings.ACTION_DISPLAY_SETTINGS,
                                    "Android display settings could not be opened.",
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(15.dp),
                        ) {
                            Icon(
                                imageVector = JalvoroIcons.Settings,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(Modifier.width(8.dp))
                            Text("Open text and display settings")
                        }
                    }
                }

                item { PersonalSectionLabel("Device preferences") }
                item {
                    JalvoroAccessibilitySectionCard(
                        icon = JalvoroIcons.Refresh,
                        title = "Reset display preferences",
                        subtitle = "Return theme, contrast and spacing to native defaults.",
                    ) {
                        Text(
                            text = "Reset uses the Android system theme, standard contrast and comfortable spacing. Date format, App Lock and screenshot protection are not changed.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.height(10.dp))
                        OutlinedButton(
                            onClick = { resetDialog = true },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(15.dp),
                        ) {
                            Icon(
                                imageVector = JalvoroIcons.Refresh,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(Modifier.width(8.dp))
                            Text("Reset accessibility display")
                        }
                    }
                }

                item {
                    JalvoroFeedbackCard(
                        message = "Accessibility and display preferences stay on this device. They do not modify Supabase finance rows, authentication, backups, Row Level Security or Jalvoro Business settings.",
                        tone = JalvoroFeedbackTone.Info,
                        modifier = Modifier.semantics {
                            liveRegion = LiveRegionMode.Polite
                        },
                    )
                }
            }
        }
    }

    if (resetDialog) {
        AlertDialog(
            onDismissRequest = { resetDialog = false },
            title = { Text("Reset display preferences?") },
            text = {
                Text(
                    "Theme will follow Android again, high contrast will turn off and comfortable spacing will be restored.",
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        preferences.resetAccessibilityDisplay()
                        resetDialog = false
                        announce("Accessibility display preferences reset.")
                    },
                ) {
                    Text("Reset")
                }
            },
            dismissButton = {
                TextButton(onClick = { resetDialog = false }) {
                    Text("Cancel")
                }
            },
        )
    }
}

@Composable
private fun JalvoroAccessibilityPostureCard(
    statuses: List<JalvoroAccessibilityStatus>,
    twoColumns: Boolean,
) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(11.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(
                        imageVector = JalvoroIcons.Accessibility,
                        contentDescription = null,
                        modifier = Modifier.padding(11.dp).size(23.dp),
                    )
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        text = "Accessibility posture",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.semantics { heading() },
                    )
                    Text(
                        text = "Live device and layout status",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            if (twoColumns) {
                statuses.chunked(2).forEach { row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        row.forEach { status ->
                            AccessibilityStatusCard(status, Modifier.weight(1f))
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            } else {
                statuses.forEach { status ->
                    AccessibilityStatusCard(status, Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun AccessibilityStatusCard(
    status: JalvoroAccessibilityStatus,
    modifier: Modifier,
) {
    Surface(
        modifier = modifier.semantics(mergeDescendants = true) {
            contentDescription = "${status.label}: ${status.value}. ${status.description}"
        },
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text(
                text = status.label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = status.value,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = status.description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun JalvoroAccessibilitySectionCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    content: @Composable () -> Unit,
) {
    JalvoroSurfaceCard {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        modifier = Modifier.padding(9.dp).size(19.dp),
                    )
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.semantics { heading() },
                    )
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(13.dp))
            content()
        }
    }
}

@Composable
private fun AccessibilityThemeRow(
    mode: NativeThemeMode,
    selected: Boolean,
    onSelect: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .selectable(
                selected = selected,
                role = Role.RadioButton,
                onClick = onSelect,
            )
            .semantics {
                stateDescription = if (selected) "Selected" else "Not selected"
            }
            .padding(horizontal = 4.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(9.dp),
    ) {
        RadioButton(selected = selected, onClick = null)
        Column(Modifier.weight(1f)) {
            Text(mode.accessibilityLabel(), fontWeight = FontWeight.SemiBold)
            Text(
                text = mode.accessibilityDescription(),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun AccessibilityToggleRow(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .toggleable(
                value = checked,
                role = Role.Switch,
                onValueChange = onCheckedChange,
            )
            .semantics {
                stateDescription = if (checked) "$title enabled" else "$title disabled"
            }
            .padding(horizontal = 4.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Switch(checked = checked, onCheckedChange = null)
    }
}

@Composable
private fun JalvoroAccessibilityPreviewCard(
    compact: Boolean,
    highContrast: Boolean,
    onAnnounce: () -> Unit,
) {
    JalvoroSurfaceCard(
        modifier = Modifier.semantics(mergeDescendants = true) {
            contentDescription = "Readability preview. ${if (highContrast) "High" else "Standard"} contrast and ${if (compact) "compact" else "comfortable"} spacing. No finance data."
        },
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(if (compact) 15.dp else 19.dp),
            verticalArrangement = Arrangement.spacedBy(if (compact) 8.dp else 12.dp),
        ) {
            JalvoroBrandLockup(subtitle = "Readability preview", compact = true)
            Text(
                text = "Clear hierarchy at your Android text size",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "Primary text stays distinct from supporting context, controls and status messages in both light and dark appearance.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.surfaceContainerLow,
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(13.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text("Example status", style = MaterialTheme.typography.labelSmall)
                    Text("Readable and device local", fontWeight = FontWeight.Bold)
                    Text(
                        "Preview only — no account or finance values are shown.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Button(
                onClick = onAnnounce,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(15.dp),
            ) {
                Icon(
                    imageVector = JalvoroIcons.Accessibility,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text("Announce current preview")
            }
        }
    }
}

@Composable
private fun AccessibilityCapabilityRow(
    title: String,
    description: String,
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(title, fontWeight = FontWeight.SemiBold)
        Text(
            text = description,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private fun NativeThemeMode.accessibilityLabel(): String = when (this) {
    NativeThemeMode.System -> "Use Android setting"
    NativeThemeMode.Light -> "Light"
    NativeThemeMode.Dark -> "Dark"
}

private fun NativeThemeMode.accessibilityDescription(): String = when (this) {
    NativeThemeMode.System -> "Follow the device light or dark appearance automatically."
    NativeThemeMode.Light -> "Keep Jalvoro Personal in light appearance."
    NativeThemeMode.Dark -> "Keep Jalvoro Personal in dark appearance."
}

private fun PersonalTextScale.accessibilityLabel(): String = when (this) {
    PersonalTextScale.Standard -> "Standard text"
    PersonalTextScale.Large -> "Large text"
    PersonalTextScale.ExtraLarge -> "Extra-large text"
}

private fun Float.accessibilityPercent(): String =
    if (isFinite() && this > 0f) {
        "${(this * 100f).roundToInt().coerceIn(50, 400)}%"
    } else {
        "Unavailable"
    }
