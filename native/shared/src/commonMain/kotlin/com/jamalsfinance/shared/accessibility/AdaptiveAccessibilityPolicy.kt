package com.jamalsfinance.shared.accessibility

enum class PersonalAdaptiveLayout {
    SingleColumn,
    TwoColumn,
}

enum class PersonalTextScale {
    Standard,
    Large,
    ExtraLarge,
}

/**
 * Keeps large text readable by preferring one column even on wider screens.
 * Two columns are reserved for tablet-sized windows with valid standard text scaling.
 */
fun selectPersonalAdaptiveLayout(
    widthDp: Int,
    fontScale: Float,
): PersonalAdaptiveLayout = when {
    widthDp <= 0 -> PersonalAdaptiveLayout.SingleColumn
    !fontScale.isFinite() || fontScale <= 0f -> PersonalAdaptiveLayout.SingleColumn
    widthDp < 720 -> PersonalAdaptiveLayout.SingleColumn
    fontScale > 1.25f -> PersonalAdaptiveLayout.SingleColumn
    else -> PersonalAdaptiveLayout.TwoColumn
}

fun classifyPersonalTextScale(fontScale: Float): PersonalTextScale = when {
    !fontScale.isFinite() || fontScale <= 0f -> PersonalTextScale.ExtraLarge
    fontScale <= 1.15f -> PersonalTextScale.Standard
    fontScale <= 1.30f -> PersonalTextScale.Large
    else -> PersonalTextScale.ExtraLarge
}

fun personalContentMaxWidthDp(fontScale: Float): Int = when (classifyPersonalTextScale(fontScale)) {
    PersonalTextScale.Standard -> 1_100
    PersonalTextScale.Large -> 920
    PersonalTextScale.ExtraLarge -> 760
}

fun personalHorizontalPaddingDp(widthDp: Int): Int = when {
    widthDp >= 1_200 -> 40
    widthDp >= 720 -> 28
    else -> 18
}
