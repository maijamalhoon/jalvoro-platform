package com.jamalsfinance.nativeapp.ui

import android.animation.ValueAnimator
import android.os.Build
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.interaction.InteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

internal data class JalvoroMotionTokens(
    val mode: NativeMotionMode,
    val systemAnimatorsEnabled: Boolean,
) {
    val enabled: Boolean
        get() = mode != NativeMotionMode.None && systemAnimatorsEnabled

    val durationScale: Float
        get() = when {
            !enabled -> 0f
            mode == NativeMotionMode.Fast -> 0.58f
            else -> 1f
        }

    val instantMillis: Int get() = scaled(70)
    val fastMillis: Int get() = scaled(120)
    val baseMillis: Int get() = scaled(180)
    val pageMillis: Int get() = scaled(210)
    val slowMillis: Int get() = scaled(250)
    val deliberateMillis: Int get() = scaled(310)
    val chartMillis: Int get() = scaled(540)
    val goalProgressMillis: Int get() = scaled(820)
    // Mirrors the website's short 0/35/70/105 ms entrance cascade.
    val staggerMillis: Int get() = scaled(35)
    val delayMillis: Int get() = scaled(0)
    val entranceMillis: Int get() = scaled(320)

    fun scaled(authoredMillis: Int): Int =
        if (!enabled) 0 else (authoredMillis * durationScale).roundToInt().coerceAtLeast(1)

    fun staggerDelay(index: Int): Long =
        if (!enabled) 0L else (delayMillis + staggerMillis * index.coerceIn(0, 3)).toLong()
}

internal val JalvoroMotionEasing = CubicBezierEasing(0.16f, 1f, 0.3f, 1f)

internal val LocalJalvoroMotion = staticCompositionLocalOf {
    JalvoroMotionTokens(
        mode = NativeMotionMode.Standard,
        systemAnimatorsEnabled = true,
    )
}

@Composable
internal fun JalvoroMotionProvider(
    mode: NativeMotionMode,
    content: @Composable () -> Unit,
) {
    val systemAnimatorsEnabled = remember(mode) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ValueAnimator.areAnimatorsEnabled()
        } else {
            true
        }
    }
    val tokens = remember(mode, systemAnimatorsEnabled) {
        JalvoroMotionTokens(
            mode = mode,
            systemAnimatorsEnabled = systemAnimatorsEnabled,
        )
    }

    CompositionLocalProvider(LocalJalvoroMotion provides tokens) {
        content()
    }
}

@Composable
internal fun <T> JalvoroAnimatedWorkspace(
    targetState: T,
    modifier: Modifier = Modifier,
    contentKey: (T) -> Any? = { it },
    content: @Composable (T) -> Unit,
) {
    val motion = LocalJalvoroMotion.current
    val offsetPx = with(LocalDensity.current) { 8.dp.roundToPx() }

    if (!motion.enabled) {
        Box(modifier = modifier) {
            content(targetState)
        }
        return
    }

    AnimatedContent(
        targetState = targetState,
        modifier = modifier,
        contentKey = contentKey,
        transitionSpec = {
            val enter: EnterTransition = fadeIn(
                animationSpec = tween(
                    durationMillis = motion.pageMillis,
                    easing = JalvoroMotionEasing,
                ),
            ) + slideInVertically(
                animationSpec = tween(
                    durationMillis = motion.pageMillis,
                    easing = JalvoroMotionEasing,
                ),
                initialOffsetY = { offsetPx },
            )
            val exit: ExitTransition = fadeOut(
                animationSpec = tween(
                    durationMillis = motion.fastMillis,
                    easing = JalvoroMotionEasing,
                ),
            ) + slideOutVertically(
                animationSpec = tween(
                    durationMillis = motion.fastMillis,
                    easing = JalvoroMotionEasing,
                ),
                targetOffsetY = { -offsetPx / 2 },
            )
            enter togetherWith exit
        },
        label = "jalvoro-workspace-transition",
    ) { state ->
        content(state)
    }
}

@Composable
internal fun <T> JalvoroAnimatedSwap(
    targetState: T,
    modifier: Modifier = Modifier,
    label: String = "jalvoro-content-swap",
    contentKey: (T) -> Any? = { it },
    content: @Composable (T) -> Unit,
) {
    val motion = LocalJalvoroMotion.current
    val offsetPx = with(LocalDensity.current) { 4.dp.roundToPx() }

    if (!motion.enabled) {
        Box(modifier = modifier) { content(targetState) }
        return
    }

    AnimatedContent(
        targetState = targetState,
        modifier = modifier,
        contentKey = contentKey,
        transitionSpec = {
            (fadeIn(tween(motion.baseMillis, easing = JalvoroMotionEasing)) +
                slideInVertically(
                    tween(motion.baseMillis, easing = JalvoroMotionEasing),
                    initialOffsetY = { offsetPx },
                )) togetherWith fadeOut(
                tween(motion.fastMillis, easing = JalvoroMotionEasing),
            )
        },
        label = label,
    ) { state ->
        content(state)
    }
}

@Composable
internal fun JalvoroAnimatedReveal(
    visible: Boolean,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val motion = LocalJalvoroMotion.current

    if (!motion.enabled) {
        if (visible) Box(modifier = modifier) { content() }
        return
    }

    AnimatedVisibility(
        visible = visible,
        modifier = modifier,
        enter = fadeIn(
            tween(motion.baseMillis, easing = JalvoroMotionEasing),
        ) + expandVertically(
            animationSpec = tween(motion.baseMillis, easing = JalvoroMotionEasing),
            expandFrom = Alignment.Top,
        ),
        exit = fadeOut(
            tween(motion.fastMillis, easing = JalvoroMotionEasing),
        ) + shrinkVertically(
            animationSpec = tween(motion.fastMillis, easing = JalvoroMotionEasing),
            shrinkTowards = Alignment.Top,
        ),
    ) {
        content()
    }
}

@Composable
internal fun JalvoroEntrance(
    index: Int = 0,
    key: Any? = index,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val motion = LocalJalvoroMotion.current
    val offsetPx = with(LocalDensity.current) { 10.dp.toPx() }
    var entered by remember(key, motion.enabled, motion.mode) {
        mutableStateOf(!motion.enabled)
    }

    LaunchedEffect(key, motion.enabled, motion.mode) {
        if (motion.enabled) {
            entered = false
            delay(motion.staggerDelay(index))
            entered = true
        } else {
            entered = true
        }
    }

    val alpha by animateFloatAsState(
        targetValue = if (entered) 1f else 0f,
        animationSpec = if (motion.enabled) {
            tween(
                durationMillis = motion.entranceMillis,
                easing = JalvoroMotionEasing,
            )
        } else {
            snap()
        },
        label = "jalvoro-entrance-alpha",
    )
    val translationY by animateFloatAsState(
        targetValue = if (entered) 0f else offsetPx,
        animationSpec = if (motion.enabled) {
            tween(
                durationMillis = motion.entranceMillis,
                easing = JalvoroMotionEasing,
            )
        } else {
            snap()
        },
        label = "jalvoro-entrance-offset",
    )

    Box(
        modifier = modifier.graphicsLayer {
            this.alpha = alpha
            this.translationY = translationY
        },
    ) {
        content()
    }
}

@Composable
internal fun Modifier.jalvoroAnimateContentSize(): Modifier {
    val motion = LocalJalvoroMotion.current
    return if (motion.enabled) {
        animateContentSize(
            animationSpec = tween(
                durationMillis = motion.baseMillis,
                easing = JalvoroMotionEasing,
            ),
        )
    } else {
        this
    }
}

@Composable
internal fun Modifier.jalvoroPressFeedback(
    interactionSource: InteractionSource,
    pressedScale: Float = 0.985f,
): Modifier {
    val motion = LocalJalvoroMotion.current
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed && motion.enabled) pressedScale else 1f,
        animationSpec = if (motion.enabled) {
            tween(
                durationMillis = motion.instantMillis,
                easing = JalvoroMotionEasing,
            )
        } else {
            snap()
        },
        label = "jalvoro-press-scale",
    )
    return graphicsLayer {
        scaleX = scale
        scaleY = scale
    }
}

@Composable
internal fun rememberJalvoroAnimatedProgress(
    target: Float,
    label: String = "jalvoro-progress",
): Float {
    val motion = LocalJalvoroMotion.current
    val safeTarget = target.takeIf(Float::isFinite)?.coerceIn(0f, 1f) ?: 0f
    val animated by animateFloatAsState(
        targetValue = safeTarget,
        animationSpec = if (motion.enabled) {
            tween(
                durationMillis = motion.goalProgressMillis,
                easing = JalvoroMotionEasing,
            )
        } else {
            snap()
        },
        label = label,
    )
    return animated
}
