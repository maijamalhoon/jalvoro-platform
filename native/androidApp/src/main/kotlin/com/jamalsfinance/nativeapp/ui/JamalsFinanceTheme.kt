package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF2956C8),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE7EDFF),
    onPrimaryContainer = Color(0xFF17233A),
    secondary = Color(0xFF0C766F),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE2F2F2),
    onSecondaryContainer = Color(0xFF17233A),
    tertiary = Color(0xFF147A55),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFE5F4ED),
    onTertiaryContainer = Color(0xFF17233A),
    error = Color(0xFFB84F4A),
    onError = Color.White,
    errorContainer = Color(0xFFF9E9E7),
    onErrorContainer = Color(0xFF17233A),
    background = Color(0xFFF3F6FA),
    surface = Color(0xFFF3F6FA),
    surfaceContainer = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFF7F9FC),
    surfaceContainerHigh = Color(0xFFEDF2F7),
    onBackground = Color(0xFF17233A),
    onSurface = Color(0xFF17233A),
    onSurfaceVariant = Color(0xFF44536A),
    outline = Color(0xFFB7C5D7),
    outlineVariant = Color(0xFFD4DEEA),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF9BB0FF),
    onPrimary = Color(0xFF0C1422),
    primaryContainer = Color(0xFF202E4E),
    onPrimaryContainer = Color(0xFFEDF3FB),
    secondary = Color(0xFF55C5BA),
    onSecondary = Color(0xFF0C1422),
    secondaryContainer = Color(0xFF14302F),
    onSecondaryContainer = Color(0xFFEDF3FB),
    tertiary = Color(0xFF48C691),
    onTertiary = Color(0xFF0C1422),
    tertiaryContainer = Color(0xFF122F27),
    onTertiaryContainer = Color(0xFFEDF3FB),
    error = Color(0xFFF09189),
    onError = Color(0xFF0C1422),
    errorContainer = Color(0xFF351E23),
    onErrorContainer = Color(0xFFEDF3FB),
    background = Color(0xFF0C1422),
    surface = Color(0xFF0C1422),
    surfaceContainer = Color(0xFF152136),
    surfaceContainerLow = Color(0xFF101B2C),
    surfaceContainerHigh = Color(0xFF1A2940),
    onBackground = Color(0xFFEDF3FB),
    onSurface = Color(0xFFEDF3FB),
    onSurfaceVariant = Color(0xFFC2CEDD),
    outline = Color(0xFF3B4E6C),
    outlineVariant = Color(0xFF2B3B55),
)

private val LightHighContrastColors = LightColors.copy(
    background = Color.White,
    surface = Color.White,
    surfaceContainer = Color(0xFFF4F6F9),
    surfaceContainerLow = Color.White,
    onBackground = Color.Black,
    onSurface = Color.Black,
    onSurfaceVariant = Color(0xFF283241),
    outline = Color(0xFF263547),
    outlineVariant = Color(0xFF6C7888),
)

private val DarkHighContrastColors = DarkColors.copy(
    background = Color.Black,
    surface = Color.Black,
    surfaceContainer = Color(0xFF0A1422),
    surfaceContainerLow = Color.Black,
    onBackground = Color.White,
    onSurface = Color.White,
    onSurfaceVariant = Color(0xFFE4EAF2),
    outline = Color(0xFFCBD6E5),
    outlineVariant = Color(0xFF8290A3),
)

@Composable
fun JamalsFinanceTheme(
    themeMode: NativeThemeMode = NativeThemeMode.System,
    highContrast: Boolean = false,
    content: @Composable () -> Unit,
) {
    val dark = when (themeMode) {
        NativeThemeMode.System -> isSystemInDarkTheme()
        NativeThemeMode.Light -> false
        NativeThemeMode.Dark -> true
    }
    val colors = when {
        dark && highContrast -> DarkHighContrastColors
        dark -> DarkColors
        highContrast -> LightHighContrastColors
        else -> LightColors
    }
    MaterialTheme(
        colorScheme = colors,
        content = content,
    )
}
