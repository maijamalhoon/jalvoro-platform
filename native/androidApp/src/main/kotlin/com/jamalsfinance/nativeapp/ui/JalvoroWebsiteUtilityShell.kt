package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.unit.dp

private val JalvoroLegacyTopBarHeight = 64.dp

/**
 * Website-style utility shell for settings, privacy, accessibility and motion.
 *
 * The legacy utility screens retain their tested repositories, launchers, dialogs and security
 * actions. Their old native top bar is clipped outside the visible viewport so the app exposes one
 * consistent JALVORO header without duplicating navigation chrome.
 */
@Composable
internal fun JalvoroWebsiteUtilityShell(
    title: String,
    onBack: () -> Unit,
    content: @Composable () -> Unit,
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                shape = RoundedCornerShape(18.dp),
                color = MaterialTheme.colorScheme.surfaceContainer,
                shadowElevation = 5.dp,
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    JalvoroIconAction(
                        icon = JalvoroIcons.ArrowLeft,
                        label = "Back to JALVORO",
                        onClick = onBack,
                    )
                    JalvoroBrandLockup(
                        modifier = Modifier.weight(1f),
                        subtitle = title,
                        compact = true,
                    )
                    Surface(
                        modifier = Modifier.size(40.dp),
                        shape = RoundedCornerShape(14.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                    ) {}
                }
            }
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            content()
        }
    }
}

@Composable
internal fun JalvoroWebsiteLegacyScreenFrame(
    content: @Composable () -> Unit,
) {
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .clipToBounds(),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(maxHeight + JalvoroLegacyTopBarHeight)
                .offset(y = -JalvoroLegacyTopBarHeight),
        ) {
            content()
        }
    }
}
