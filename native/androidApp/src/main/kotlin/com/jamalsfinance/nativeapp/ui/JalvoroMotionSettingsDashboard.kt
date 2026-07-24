package com.jamalsfinance.nativeapp.ui

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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle

private data class MotionOptionCopy(
    val title: String,
    val description: String,
)

@Composable
internal fun JalvoroMotionSettingsDashboard(
    preferences: AndroidNativePreferences,
    onBack: () -> Unit,
) {
    val localPreferences by preferences.state.collectAsStateWithLifecycle()
    val motion = LocalJalvoroMotion.current

    Scaffold(
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
                        label = "Back to all workspaces",
                        onClick = onBack,
                    )
                    JalvoroBrandLockup(
                        modifier = Modifier.weight(1f),
                        subtitle = "Motion & interactions",
                        compact = true,
                    )
                }
            }
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).widthIn(max = 760.dp),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 18.dp),
            verticalArrangement = Arrangement.spacedBy(15.dp),
        ) {
            item {
                JalvoroEntrance(index = 0) {
                    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text(
                            text = "Motion & interactions",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.semantics { heading() },
                        )
                        Text(
                            text = "Choose the same motion policy used by the JALVORO website. Financial values and security feedback never depend on animation.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            item {
                JalvoroEntrance(index = 1) {
                    JalvoroSurfaceCard(
                        modifier = Modifier.semantics(mergeDescendants = true) {
                            contentDescription = if (motion.systemAnimatorsEnabled) {
                                "Android animations are enabled. ${localPreferences.motionMode.accessibilityLabel()} selected."
                            } else {
                                "Android system animations are disabled. Jalvoro motion is effectively off."
                            }
                        },
                    ) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(18.dp),
                            verticalArrangement = Arrangement.spacedBy(7.dp),
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    shape = RoundedCornerShape(13.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                    contentColor = MaterialTheme.colorScheme.primary,
                                ) {
                                    Icon(
                                        imageVector = JalvoroIcons.Accessibility,
                                        contentDescription = null,
                                        modifier = Modifier.padding(10.dp).size(21.dp),
                                    )
                                }
                                Spacer(Modifier.width(11.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        text = "Effective motion posture",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        text = if (motion.systemAnimatorsEnabled) {
                                            "JALVORO preference controls duration and movement."
                                        } else {
                                            "Android animator settings override the app preference."
                                        },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                            Text(
                                text = if (motion.enabled) {
                                    "${localPreferences.motionMode.accessibilityLabel()} · ${motion.pageMillis} ms page transitions · ${motion.goalProgressMillis} ms progress reveal"
                                } else {
                                    "No motion · content and values appear immediately"
                                },
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                }
            }

            item {
                JalvoroEntrance(index = 2) {
                    JalvoroSurfaceCard {
                        Column(modifier = Modifier.fillMaxWidth().padding(18.dp)) {
                            Text(
                                text = "Animation preference",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.semantics { heading() },
                            )
                            Text(
                                text = "This preference stays on this Android device and applies immediately across JALVORO Personal.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(Modifier.height(10.dp))
                            NativeMotionMode.entries.forEachIndexed { index, mode ->
                                MotionPreferenceRow(
                                    mode = mode,
                                    selected = localPreferences.motionMode == mode,
                                    onSelect = { preferences.setMotionMode(mode) },
                                )
                                if (index != NativeMotionMode.entries.lastIndex) {
                                    HorizontalDivider(modifier = Modifier.padding(start = 48.dp))
                                }
                            }
                        }
                    }
                }
            }

            item {
                JalvoroEntrance(index = 3) {
                    MotionPreviewCard()
                }
            }

            item {
                JalvoroEntrance(index = 4) {
                    JalvoroFeedbackCard(
                        message = "Motion changes presentation only. It never alters balances, calculations, authentication, App Lock timing, database writes or error truthfulness.",
                        tone = JalvoroFeedbackTone.Info,
                    )
                }
            }
        }
    }
}

@Composable
private fun MotionPreferenceRow(
    mode: NativeMotionMode,
    selected: Boolean,
    onSelect: () -> Unit,
) {
    val copy = mode.copy()
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
            .padding(horizontal = 2.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(9.dp),
    ) {
        RadioButton(selected = selected, onClick = null)
        Column(Modifier.weight(1f)) {
            Text(copy.title, fontWeight = FontWeight.SemiBold)
            Text(
                text = copy.description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun MotionPreviewCard() {
    val progress = rememberJalvoroAnimatedProgress(
        target = 0.72f,
        label = "motion-settings-preview",
    )

    JalvoroSurfaceCard(
        modifier = Modifier.semantics(mergeDescendants = true) {
            contentDescription = "Motion preview with sample progress. No finance data."
        },
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(11.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(13.dp),
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    contentColor = MaterialTheme.colorScheme.secondary,
                ) {
                    Icon(
                        imageVector = JalvoroIcons.Target,
                        contentDescription = null,
                        modifier = Modifier.padding(10.dp).size(21.dp),
                    )
                }
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        text = "Motion preview",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Sample content only — no account or financial data",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    text = "72%",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.secondary,
                )
            }
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth().height(8.dp),
                color = MaterialTheme.colorScheme.secondary,
                trackColor = MaterialTheme.colorScheme.secondaryContainer,
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                JalvoroEntrance(index = 1) {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = MaterialTheme.colorScheme.surfaceContainerLow,
                    ) {
                        Text(
                            text = "Cards and lists enter with subtle opacity and vertical movement.",
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 11.dp),
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
        }
    }
}

private fun NativeMotionMode.copy(): MotionOptionCopy = when (this) {
    NativeMotionMode.Standard -> MotionOptionCopy(
        title = "Animations",
        description = "Website-equivalent standard timing with subtle page, card and progress movement.",
    )
    NativeMotionMode.Fast -> MotionOptionCopy(
        title = "Fast animations",
        description = "Keep every transition but resolve durations at roughly 58% of standard timing.",
    )
    NativeMotionMode.None -> MotionOptionCopy(
        title = "No animations",
        description = "Show content immediately while preserving every feature, value and accessibility label.",
    )
}

internal fun NativeMotionMode.accessibilityLabel(): String = when (this) {
    NativeMotionMode.Standard -> "Animations"
    NativeMotionMode.Fast -> "Fast animations"
    NativeMotionMode.None -> "No animations"
}
