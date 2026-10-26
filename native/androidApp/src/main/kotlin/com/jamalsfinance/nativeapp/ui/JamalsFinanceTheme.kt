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
    primary = Color(0xFF2457D6),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE6ECFF),
    onPrimaryContainer = Color(0xFF102A64),
    secondary = Color(0xFF087A72),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFD9F3EF),
    onSecondaryContainer = Color(0xFF073F3B),
    tertiary = Color(0xFF0F7A55),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFDDF5E9),
    onTertiaryContainer = Color(0xFF08452F),
    error = Color(0xFFBA1A1A),
    onError = Color.White,
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF410002),
    background = Color(0xFFF6F8FC),
    surface = Color(0xFFF6F8FC),
    surfaceContainer = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFF0F3F9),
    surfaceContainerHigh = Color(0xFFE8EDF6),
    onBackground = Color(0xFF101828),
    onSurface = Color(0xFF101828),
    onSurfaceVariant = Color(0xFF475467),
    outline = Color(0xFF98A2B3),
    outlineVariant = Color(0xFFD0D5DD),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFAFC2FF),
    onPrimary = Color(0xFF08245C),
    primaryContainer = Color(0xFF1E3974),
    onPrimaryContainer = Color(0xFFE4EBFF),
    secondary = Color(0xFF69D5CA),
    onSecondary = Color(0xFF003733),
    secondaryContainer = Color(0xFF0B4F4A),
    onSecondaryContainer = Color(0xFFD7F6F2),
    tertiary = Color(0xFF66D5A0),
    onTertiary = Color(0xFF003824),
    tertiaryContainer = Color(0xFF0C5038),
    onTertiaryContainer = Color(0xFFD9F7E8),
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),
    background = Color(0xFF0A1220),
    surface = Color(0xFF0A1220),
    surfaceContainer = Color(0xFF131E31),
    surfaceContainerLow = Color(0xFF0F192A),
    surfaceContainerHigh = Color(0xFF1B2940),
    onBackground = Color(0xFFF1F4F9),
    onSurface = Color(0xFFF1F4F9),
    onSurfaceVariant = Color(0xFFC3CCDA),
    outline = Color(0xFF8491A5),
    outlineVariant = Color(0xFF34445D),
)

private val LightHighContrastColors = LightColors.copy(
    primary = Color(0xFF003C9F),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD8E2FF),
    onPrimaryContainer = Color.Black,
    secondary = Color(0xFF005E58),
    onSecondary = Color.White,
    tertiary = Color(0xFF006C47),
    onTertiary = Color.White,
    error = Color(0xFF8E0009),
    onError = Color.White,
    background = Color.White,
    surface = Color.White,
    surfaceContainer = Color(0xFFF5F7FA),
    surfaceContainerLow = Color.White,
    surfaceContainerHigh = Color(0xFFE4E8EE),
    onBackground = Color.Black,
    onSurface = Color.Black,
    onSurfaceVariant = Color(0xFF1D2939),
    outline = Color(0xFF1D2939),
    outlineVariant = Color(0xFF667085),
)

private val DarkHighContrastColors = DarkColors.copy(
    primary = Color(0xFFD4DDFF),
    onPrimary = Color.Black,
    primaryContainer = Color(0xFF294B92),
    onPrimaryContainer = Color.White,
    secondary = Color(0xFF8DF1E6),
    onSecondary = Color.Black,
    tertiary = Color(0xFF8AEAB8),
    onTertiary = Color.Black,
    error = Color(0xFFFFD2CC),
    onError = Color.Black,
    background = Color.Black,
    surface = Color.Black,
    surfaceContainer = Color(0xFF0B1626),
    surfaceContainerLow = Color.Black,
    surfaceContainerHigh = Color(0xFF17263D),
    onBackground = Color.White,
    onSurface = Color.White,
    onSurfaceVariant = Color(0xFFF2F4F7),
    outline = Color(0xFFE4E7EC),
    outlineVariant = Color(0xFF98A2B3),
)

private val JalvoroTypography = Typography(
    displayLarge = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 48.sp,
        lineHeight = 56.sp,
        letterSpacing = (-1.0).sp,
    ),
    displayMedium = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 40.sp,
        lineHeight = 48.sp,
        letterSpacing = (-0.8).sp,
    ),
    displaySmall = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 36.sp,
        lineHeight = 44.sp,
        letterSpacing = (-0.6).sp,
    ),
    headlineLarge = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 40.sp,
        letterSpacing = (-0.5).sp,
    ),
    headlineMedium = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 36.sp,
        letterSpacing = (-0.35).sp,
    ),
    headlineSmall = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 32.sp,
        letterSpacing = (-0.2).sp,
    ),
    titleLarge = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
        letterSpacing = (-0.15).sp,
    ),
    titleMedium = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    ),
    titleSmall = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    bodyLarge = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.1.sp,
    ),
    bodyMedium = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 21.sp,
        letterSpacing = 0.1.sp,
    ),
    bodySmall = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 18.sp,
        letterSpacing = 0.15.sp,
    ),
    labelLarge = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp,
    ),
    labelMedium = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.25.sp,
    ),
    labelSmall = androidx.compose.ui.text.TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.35.sp,
    ),
)

private val JalvoroShapes = Shapes(
    extraSmall = RoundedCornerShape(10.dp),
    small = RoundedCornerShape(14.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp),
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
    ) {
        JalvoroDesignSystem(content = content)
    }
}
