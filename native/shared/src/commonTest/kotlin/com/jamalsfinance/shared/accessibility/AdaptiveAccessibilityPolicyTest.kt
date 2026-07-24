package com.jamalsfinance.shared.accessibility

import kotlin.test.Test
import kotlin.test.assertEquals

class AdaptiveAccessibilityPolicyTest {
    @Test
    fun phoneWidthUsesSingleColumn() {
        assertEquals(
            PersonalAdaptiveLayout.SingleColumn,
            selectPersonalAdaptiveLayout(widthDp = 412, fontScale = 1f),
        )
    }

    @Test
    fun tabletWidthUsesTwoColumnsAtStandardScale() {
        assertEquals(
            PersonalAdaptiveLayout.TwoColumn,
            selectPersonalAdaptiveLayout(widthDp = 840, fontScale = 1f),
        )
    }

    @Test
    fun exactLargeTextBoundaryStillAllowsTabletLayout() {
        assertEquals(
            PersonalAdaptiveLayout.TwoColumn,
            selectPersonalAdaptiveLayout(widthDp = 840, fontScale = 1.25f),
        )
    }

    @Test
    fun largeTextForcesSingleColumnOnTablet() {
        assertEquals(
            PersonalAdaptiveLayout.SingleColumn,
            selectPersonalAdaptiveLayout(widthDp = 840, fontScale = 1.3f),
        )
    }

    @Test
    fun invalidWindowOrFontScaleFailsSafeToSingleColumn() {
        assertEquals(
            PersonalAdaptiveLayout.SingleColumn,
            selectPersonalAdaptiveLayout(widthDp = 0, fontScale = 1f),
        )
        assertEquals(
            PersonalAdaptiveLayout.SingleColumn,
            selectPersonalAdaptiveLayout(widthDp = 840, fontScale = Float.NaN),
        )
        assertEquals(
            PersonalAdaptiveLayout.SingleColumn,
            selectPersonalAdaptiveLayout(widthDp = 840, fontScale = -1f),
        )
    }

    @Test
    fun textScaleClassificationAndContentWidthRemainConservative() {
        assertEquals(PersonalTextScale.Standard, classifyPersonalTextScale(1f))
        assertEquals(PersonalTextScale.Large, classifyPersonalTextScale(1.2f))
        assertEquals(PersonalTextScale.ExtraLarge, classifyPersonalTextScale(1.4f))
        assertEquals(PersonalTextScale.ExtraLarge, classifyPersonalTextScale(Float.POSITIVE_INFINITY))
        assertEquals(1_100, personalContentMaxWidthDp(1f))
        assertEquals(920, personalContentMaxWidthDp(1.2f))
        assertEquals(760, personalContentMaxWidthDp(1.4f))
    }

    @Test
    fun paddingScalesWithWindowWidth() {
        assertEquals(18, personalHorizontalPaddingDp(400))
        assertEquals(28, personalHorizontalPaddingDp(800))
        assertEquals(40, personalHorizontalPaddingDp(1_280))
    }
}
