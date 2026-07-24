package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

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
    primary = Color(0xFF063E9C),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDCE7FF),
    onPrimaryContainer = Color.Black,
    secondary = Color(0xFF005D58),
    onSecondary = Color.White,
    tertiary = Color(0xFF006B45),
    onTertiary = Color.White,
    error = Color(0xFF8F1D1D),
    onError = Color.White,
    background = Color.White,
    surface = Color.White,
    surfaceContainer = Color(0xFFF4F6F9),
    surfaceContainerLow = Color.White,
    surfaceContainerHigh = Color(0xFFE5E9EF),
    onBackground = Color.Black,
    onSurface = Color.Black,
    onSurfaceVariant = Color(0xFF1F2937),
    outline = Color(0xFF1E293B),
    outlineVariant = Color(0xFF596579),
)

private val DarkHighContrastColors = DarkColors.copy(
    primary = Color(0xFFC6D2FF),
    onPrimary = Color.Black,
    primaryContainer = Color(0xFF263B6A),
    onPrimaryContainer = Color.White,
    secondary = Color(0xFF78E0D6),
    onSecondary = Color.Black,
    tertiary = Color(0xFF78E2AE),
    onTertiary = Color.Black,
    error = Color(0xFFFFB5AE),
    onError = Color.Black,
    background = Color.Black,
    surface = Color.Black,
    surfaceContainer = Color(0xFF0A1422),
    surfaceContainerLow = Color.Black,
    surfaceContainerHigh = Color(0xFF17263D),
    onBackground = Color.White,
    onSurface = Color.White,
    onSurfaceVariant = Color(0xFFF0F4FA),
    outline = Color(0xFFE0E7F2),
    outlineVariant = Color(0xFF9AA8BB),
)

private val baseTypography = Typography()

private val JalvoroTypography = baseTypography.copy(
    displayLarge = baseTypography.displayLarge.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        letterSpacing = (-1.2).sp,
    ),
    displayMedium = baseTypography.displayMedium.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        letterSpacing = (-0.9).sp,
    ),
    headlineLarge = baseTypography.headlineLarge.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        letterSpacing = (-0.6).sp,
    ),
    headlineMedium = baseTypography.headlineMedium.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        letterSpacing = (-0.45).sp,
    ),
    headlineSmall = baseTypography.headlineSmall.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        letterSpacing = (-0.3).sp,
    ),
    titleLarge = baseTypography.titleLarge.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        letterSpacing = (-0.2).sp,
    ),
    titleMedium = baseTypography.titleMedium.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
    ),
    titleSmall = baseTypography.titleSmall.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
    ),
    bodyLarge = baseTypography.bodyLarge.copy(fontFamily = FontFamily.SansSerif),
    bodyMedium = baseTypography.bodyMedium.copy(fontFamily = FontFamily.SansSerif),
    bodySmall = baseTypography.bodySmall.copy(fontFamily = FontFamily.SansSerif),
    labelLarge = baseTypography.labelLarge.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
    ),
    labelMedium = baseTypography.labelMedium.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
    ),
    labelSmall = baseTypography.labelSmall.copy(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
    ),
)

private val JalvoroShapes = Shapes(
    extraSmall = RoundedCornerShape(10.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(14.dp),
    large = RoundedCornerShape(18.dp),
    extraLarge = RoundedCornerShape(24.dp),
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
        typography = JalvoroTypography,
        shapes = JalvoroShapes,
        content = content,
    )
}
