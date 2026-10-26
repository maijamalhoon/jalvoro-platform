package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Global presentation architecture for the native application.
 *
 * Business rules, repositories and calculations must not depend on these tokens.
 * Screens consume this layer only for layout, surfaces, semantic colour and
 * responsive presentation so the complete app can be repainted consistently.
 */
@Immutable
internal data class JalvoroLayoutTokens(
    val compactScreenPadding: Dp,
    val mediumScreenPadding: Dp,
    val expandedScreenPadding: Dp,
    val sectionGap: Dp,
    val cardGap: Dp,
    val cardPadding: Dp,
    val compactCardPadding: Dp,
    val controlHeight: Dp,
    val compactControlHeight: Dp,
    val iconControlSize: Dp,
    val workspaceHeaderOffset: Dp,
    val bottomSafePadding: Dp,
    val drawerMaxWidth: Dp,
    val contentMaxWidth: Dp,
)

@Immutable
internal data class JalvoroPainterTokens(
    val cardColor: Color,
    val elevatedCardColor: Color,
    val subtleCardColor: Color,
    val controlColor: Color,
    val selectedControlColor: Color,
    val borderColor: Color,
    val strongBorderColor: Color,
    val cardElevation: Dp,
    val floatingElevation: Dp,
)

@Immutable
internal data class JalvoroSemanticColors(
    val income: Color,
    val expense: Color,
    val investment: Color,
    val success: Color,
    val warning: Color,
    val danger: Color,
    val information: Color,
    val muted: Color,
)

internal enum class JalvoroWindowClass {
    Compact,
    Medium,
    Expanded,
}

private val DefaultLayout = JalvoroLayoutTokens(
    compactScreenPadding = 16.dp,
    mediumScreenPadding = 24.dp,
    expandedScreenPadding = 32.dp,
    sectionGap = 20.dp,
    cardGap = 12.dp,
    cardPadding = 20.dp,
    compactCardPadding = 16.dp,
    controlHeight = 52.dp,
    compactControlHeight = 48.dp,
    iconControlSize = 48.dp,
    workspaceHeaderOffset = 76.dp,
    bottomSafePadding = 24.dp,
    drawerMaxWidth = 360.dp,
    contentMaxWidth = 1_280.dp,
)

internal val LocalJalvoroLayout = staticCompositionLocalOf { DefaultLayout }

internal val LocalJalvoroPainter = staticCompositionLocalOf {
    JalvoroPainterTokens(
        cardColor = Color.White,
        elevatedCardColor = Color.White,
        subtleCardColor = Color(0xFFF3F5F9),
        controlColor = Color(0xFFF3F5F9),
        selectedControlColor = Color(0xFFE6ECFF),
        borderColor = Color(0x1F475467),
        strongBorderColor = Color(0x33475467),
        cardElevation = 1.dp,
        floatingElevation = 3.dp,
    )
}

internal val LocalJalvoroSemanticColors = staticCompositionLocalOf {
    JalvoroSemanticColors(
        income = Color(0xFF087A72),
        expense = Color(0xFFBA1A1A),
        investment = Color(0xFF2457D6),
        success = Color(0xFF0F7A55),
        warning = Color(0xFFB57816),
        danger = Color(0xFFBA1A1A),
        information = Color(0xFF2457D6),
        muted = Color(0xFF667085),
    )
}

@Composable
internal fun JalvoroDesignSystem(content: @Composable () -> Unit) {
    val colors = MaterialTheme.colorScheme
    val dark = colors.background.luminance() < 0.5f
    val painter = JalvoroPainterTokens(
        cardColor = colors.surfaceContainer,
        elevatedCardColor = if (dark) colors.surfaceContainerHigh else Color.White,
        subtleCardColor = colors.surfaceContainerLow,
        controlColor = colors.surfaceContainerLow,
        selectedControlColor = colors.primaryContainer,
        borderColor = colors.outlineVariant.copy(alpha = if (dark) 0.78f else 0.58f),
        strongBorderColor = colors.outline.copy(alpha = if (dark) 0.72f else 0.46f),
        cardElevation = if (dark) 0.dp else 1.dp,
        floatingElevation = if (dark) 1.dp else 3.dp,
    )
    val semantic = JalvoroSemanticColors(
        income = colors.secondary,
        expense = colors.error,
        investment = colors.primary,
        success = colors.tertiary,
        warning = if (dark) Color(0xFFFFC766) else Color(0xFF9A650D),
        danger = colors.error,
        information = colors.primary,
        muted = colors.onSurfaceVariant,
    )

    CompositionLocalProvider(
        LocalJalvoroLayout provides DefaultLayout,
        LocalJalvoroPainter provides painter,
        LocalJalvoroSemanticColors provides semantic,
        content = content,
    )
}

/**
 * Shared responsive content frame. Feature screens keep their state and logic,
 * while this primitive owns global width and horizontal rhythm.
 */
@Composable
internal fun JalvoroAdaptivePage(
    modifier: Modifier = Modifier,
    maxContentWidth: Dp = LocalJalvoroLayout.current.contentMaxWidth,
    content: @Composable (windowClass: JalvoroWindowClass, padding: PaddingValues) -> Unit,
) {
    val layout = LocalJalvoroLayout.current
    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        val windowClass = when {
            maxWidth < 600.dp -> JalvoroWindowClass.Compact
            maxWidth < 840.dp -> JalvoroWindowClass.Medium
            else -> JalvoroWindowClass.Expanded
        }
        val horizontalPadding = when (windowClass) {
            JalvoroWindowClass.Compact -> layout.compactScreenPadding
            JalvoroWindowClass.Medium -> layout.mediumScreenPadding
            JalvoroWindowClass.Expanded -> layout.expandedScreenPadding
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = maxContentWidth)
                .align(Alignment.TopCenter)
                .padding(horizontal = horizontalPadding),
        ) {
            content(
                windowClass,
                PaddingValues(
                    top = layout.cardGap,
                    bottom = layout.bottomSafePadding,
                ),
            )
        }
    }
}
