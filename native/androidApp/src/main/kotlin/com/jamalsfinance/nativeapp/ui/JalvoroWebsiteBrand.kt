package com.jamalsfinance.nativeapp.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun JalvoroWebsiteBrandLockup(
    modifier: Modifier = Modifier,
    subtitle: String = JALVORO_PERSONAL,
    compact: Boolean = false,
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(if (compact) 10.dp else 12.dp),
    ) {
        JalvoroWebsiteBrandMark(
            modifier = Modifier.size(if (compact) 40.dp else 48.dp),
            contentDescription = "JALVORO logo",
        )
        Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
            Text(
                text = JALVORO_NAME,
                style = if (compact) MaterialTheme.typography.titleMedium else MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                letterSpacing = (-0.2).sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = subtitle.uppercase(),
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = if (compact) 9.sp else 10.sp,
                    letterSpacing = if (compact) 1.25.sp else 1.4.sp,
                ),
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
fun JalvoroWebsiteBrandMark(
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
) {
    Surface(
        modifier = modifier.semantics {
            if (contentDescription != null) this.contentDescription = contentDescription
        },
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.primary,
        contentColor = Color.White,
        shadowElevation = 4.dp,
    ) {
        Canvas(modifier = Modifier.fillMaxSize().padding(9.dp)) {
            val stroke = 1.9.dp.toPx()
            drawCircle(
                color = Color.White,
                radius = size.minDimension * 0.44f,
                style = Stroke(width = stroke),
            )
            val centerX = size.width / 2f
            drawLine(
                color = Color.White,
                start = Offset(centerX, size.height * 0.20f),
                end = Offset(centerX, size.height * 0.80f),
                strokeWidth = stroke,
                cap = StrokeCap.Round,
            )
            val dollar = Path().apply {
                moveTo(size.width * 0.68f, size.height * 0.34f)
                cubicTo(
                    size.width * 0.58f,
                    size.height * 0.24f,
                    size.width * 0.35f,
                    size.height * 0.26f,
                    size.width * 0.34f,
                    size.height * 0.40f,
                )
                cubicTo(
                    size.width * 0.34f,
                    size.height * 0.53f,
                    size.width * 0.68f,
                    size.height * 0.45f,
                    size.width * 0.67f,
                    size.height * 0.62f,
                )
                cubicTo(
                    size.width * 0.66f,
                    size.height * 0.76f,
                    size.width * 0.42f,
                    size.height * 0.78f,
                    size.width * 0.31f,
                    size.height * 0.68f,
                )
            }
            drawPath(
                path = dollar,
                color = Color.White,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
        }
    }
}
