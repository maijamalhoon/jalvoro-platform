package com.jamalsfinance.nativeapp.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathBuilder
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp

/**
 * Native counterpart of the website's JALVORO rounded-monoline icon system.
 *
 * The icons use a 24 x 24 grid, 2.4dp visual stroke, round caps and round joins,
 * matching brand/brand.config.json instead of mixing emoji, letters or external
 * icon families into the Android interface.
 */
object JalvoroIcons {
    val Dashboard: ImageVector by lazy {
        outlineIcon("Dashboard") {
            moveTo(4f, 4f)
            lineTo(10f, 4f)
            lineTo(10f, 10f)
            lineTo(4f, 10f)
            close()
            moveTo(14f, 4f)
            lineTo(20f, 4f)
            lineTo(20f, 10f)
            lineTo(14f, 10f)
            close()
            moveTo(4f, 14f)
            lineTo(10f, 14f)
            lineTo(10f, 20f)
            lineTo(4f, 20f)
            close()
            moveTo(14f, 14f)
            lineTo(20f, 14f)
            lineTo(20f, 20f)
            lineTo(14f, 20f)
            close()
        }
    }

    val Wallet: ImageVector by lazy {
        outlineIcon("Wallet") {
            moveTo(5f, 5f)
            lineTo(18f, 5f)
            curveTo(19.1f, 5f, 20f, 5.9f, 20f, 7f)
            lineTo(20f, 18f)
            curveTo(20f, 19.1f, 19.1f, 20f, 18f, 20f)
            lineTo(5f, 20f)
            curveTo(3.9f, 20f, 3f, 19.1f, 3f, 18f)
            lineTo(3f, 7f)
            curveTo(3f, 5.9f, 3.9f, 5f, 5f, 5f)
            close()
            moveTo(14f, 9f)
            lineTo(21f, 9f)
            lineTo(21f, 15f)
            lineTo(14f, 15f)
            curveTo(12.9f, 15f, 12f, 14.1f, 12f, 13f)
            lineTo(12f, 11f)
            curveTo(12f, 9.9f, 12.9f, 9f, 14f, 9f)
            close()
            moveTo(16f, 12f)
            lineTo(16.01f, 12f)
        }
    }

    val Target: ImageVector by lazy {
        outlineIcon("Target") {
            moveTo(12f, 3f)
            curveTo(17f, 3f, 21f, 7f, 21f, 12f)
            curveTo(21f, 17f, 17f, 21f, 12f, 21f)
            curveTo(7f, 21f, 3f, 17f, 3f, 12f)
            curveTo(3f, 7f, 7f, 3f, 12f, 3f)
            close()
            moveTo(12f, 7f)
            curveTo(14.8f, 7f, 17f, 9.2f, 17f, 12f)
            curveTo(17f, 14.8f, 14.8f, 17f, 12f, 17f)
            curveTo(9.2f, 17f, 7f, 14.8f, 7f, 12f)
            curveTo(7f, 9.2f, 9.2f, 7f, 12f, 7f)
            close()
            moveTo(12f, 12f)
            lineTo(20f, 4f)
            moveTo(16.5f, 4f)
            lineTo(20f, 4f)
            lineTo(20f, 7.5f)
        }
    }

    val Investments: ImageVector by lazy {
        outlineIcon("Investments") {
            moveTo(4f, 19f)
            lineTo(4f, 5f)
            moveTo(4f, 19f)
            lineTo(20f, 19f)
            moveTo(7f, 15f)
            lineTo(11f, 11f)
            lineTo(14f, 13f)
            lineTo(20f, 6f)
            moveTo(16.5f, 6f)
            lineTo(20f, 6f)
            lineTo(20f, 9.5f)
        }
    }

    val Reports: ImageVector by lazy {
        outlineIcon("Reports") {
            moveTo(6f, 3f)
            lineTo(15f, 3f)
            lineTo(20f, 8f)
            lineTo(20f, 21f)
            lineTo(6f, 21f)
            curveTo(4.9f, 21f, 4f, 20.1f, 4f, 19f)
            lineTo(4f, 5f)
            curveTo(4f, 3.9f, 4.9f, 3f, 6f, 3f)
            close()
            moveTo(15f, 3f)
            lineTo(15f, 8f)
            lineTo(20f, 8f)
            moveTo(8f, 17f)
            lineTo(8f, 14f)
            moveTo(12f, 17f)
            lineTo(12f, 11f)
            moveTo(16f, 17f)
            lineTo(16f, 13f)
        }
    }

    val More: ImageVector by lazy {
        outlineIcon("More") {
            moveTo(5f, 12f)
            lineTo(5.01f, 12f)
            moveTo(12f, 12f)
            lineTo(12.01f, 12f)
            moveTo(19f, 12f)
            lineTo(19.01f, 12f)
        }
    }

    val Refresh: ImageVector by lazy {
        outlineIcon("Refresh") {
            moveTo(20f, 7f)
            curveTo(18.4f, 4.6f, 15.7f, 3f, 12.5f, 3f)
            curveTo(7.3f, 3f, 3f, 7.2f, 3f, 12.5f)
            moveTo(20f, 7f)
            lineTo(20f, 3.5f)
            moveTo(20f, 7f)
            lineTo(16.5f, 7f)
            moveTo(4f, 17f)
            curveTo(5.6f, 19.4f, 8.3f, 21f, 11.5f, 21f)
            curveTo(16.7f, 21f, 21f, 16.8f, 21f, 11.5f)
            moveTo(4f, 17f)
            lineTo(4f, 20.5f)
            moveTo(4f, 17f)
            lineTo(7.5f, 17f)
        }
    }

    val Mail: ImageVector by lazy {
        outlineIcon("Mail") {
            moveTo(4f, 5f)
            lineTo(20f, 5f)
            curveTo(21.1f, 5f, 22f, 5.9f, 22f, 7f)
            lineTo(22f, 17f)
            curveTo(22f, 18.1f, 21.1f, 19f, 20f, 19f)
            lineTo(4f, 19f)
            curveTo(2.9f, 19f, 2f, 18.1f, 2f, 17f)
            lineTo(2f, 7f)
            curveTo(2f, 5.9f, 2.9f, 5f, 4f, 5f)
            close()
            moveTo(3f, 7f)
            lineTo(12f, 13f)
            lineTo(21f, 7f)
        }
    }

    val Lock: ImageVector by lazy {
        outlineIcon("Lock") {
            moveTo(7f, 10f)
            lineTo(7f, 7f)
            curveTo(7f, 4.2f, 9.2f, 2f, 12f, 2f)
            curveTo(14.8f, 2f, 17f, 4.2f, 17f, 7f)
            lineTo(17f, 10f)
            moveTo(5f, 10f)
            lineTo(19f, 10f)
            lineTo(19f, 21f)
            lineTo(5f, 21f)
            close()
            moveTo(12f, 14f)
            lineTo(12f, 17f)
        }
    }

    val Eye: ImageVector by lazy {
        outlineIcon("Eye") {
            moveTo(2.5f, 12f)
            curveTo(4.8f, 7.8f, 8f, 5.5f, 12f, 5.5f)
            curveTo(16f, 5.5f, 19.2f, 7.8f, 21.5f, 12f)
            curveTo(19.2f, 16.2f, 16f, 18.5f, 12f, 18.5f)
            curveTo(8f, 18.5f, 4.8f, 16.2f, 2.5f, 12f)
            close()
            moveTo(12f, 9f)
            curveTo(13.7f, 9f, 15f, 10.3f, 15f, 12f)
            curveTo(15f, 13.7f, 13.7f, 15f, 12f, 15f)
            curveTo(10.3f, 15f, 9f, 13.7f, 9f, 12f)
            curveTo(9f, 10.3f, 10.3f, 9f, 12f, 9f)
            close()
        }
    }

    val EyeOff: ImageVector by lazy {
        outlineIcon("EyeOff") {
            moveTo(3f, 3f)
            lineTo(21f, 21f)
            moveTo(10.3f, 6f)
            curveTo(10.9f, 5.7f, 11.4f, 5.5f, 12f, 5.5f)
            curveTo(16f, 5.5f, 19.2f, 7.8f, 21.5f, 12f)
            curveTo(20.7f, 13.5f, 19.8f, 14.8f, 18.7f, 15.8f)
            moveTo(14.5f, 18.1f)
            curveTo(13.7f, 18.4f, 12.9f, 18.5f, 12f, 18.5f)
            curveTo(8f, 18.5f, 4.8f, 16.2f, 2.5f, 12f)
            curveTo(3.4f, 10.4f, 4.4f, 9f, 5.6f, 7.9f)
        }
    }

    val ArrowRight: ImageVector by lazy {
        outlineIcon("ArrowRight") {
            moveTo(5f, 12f)
            lineTo(19f, 12f)
            moveTo(13f, 6f)
            lineTo(19f, 12f)
            lineTo(13f, 18f)
        }
    }

    val ArrowLeft: ImageVector by lazy {
        outlineIcon("ArrowLeft") {
            moveTo(19f, 12f)
            lineTo(5f, 12f)
            moveTo(11f, 6f)
            lineTo(5f, 12f)
            lineTo(11f, 18f)
        }
    }

    val Shield: ImageVector by lazy {
        outlineIcon("Shield") {
            moveTo(12f, 2.5f)
            lineTo(20f, 6f)
            lineTo(20f, 11.5f)
            curveTo(20f, 16.7f, 16.7f, 20.2f, 12f, 22f)
            curveTo(7.3f, 20.2f, 4f, 16.7f, 4f, 11.5f)
            lineTo(4f, 6f)
            close()
            moveTo(8.5f, 12f)
            lineTo(11f, 14.5f)
            lineTo(16f, 9.5f)
        }
    }

    val User: ImageVector by lazy {
        outlineIcon("User") {
            moveTo(12f, 4f)
            curveTo(14.2f, 4f, 16f, 5.8f, 16f, 8f)
            curveTo(16f, 10.2f, 14.2f, 12f, 12f, 12f)
            curveTo(9.8f, 12f, 8f, 10.2f, 8f, 8f)
            curveTo(8f, 5.8f, 9.8f, 4f, 12f, 4f)
            close()
            moveTo(5f, 21f)
            curveTo(5.5f, 16.9f, 8f, 15f, 12f, 15f)
            curveTo(16f, 15f, 18.5f, 16.9f, 19f, 21f)
        }
    }

    val Transactions: ImageVector by lazy {
        outlineIcon("Transactions") {
            moveTo(6f, 3f)
            lineTo(18f, 3f)
            lineTo(18f, 21f)
            lineTo(15f, 19f)
            lineTo(12f, 21f)
            lineTo(9f, 19f)
            lineTo(6f, 21f)
            close()
            moveTo(9f, 8f)
            lineTo(15f, 8f)
            moveTo(9f, 12f)
            lineTo(15f, 12f)
            moveTo(9f, 16f)
            lineTo(13f, 16f)
        }
    }

    val Accounts: ImageVector by lazy {
        outlineIcon("Accounts") {
            moveTo(3f, 9f)
            lineTo(12f, 3f)
            lineTo(21f, 9f)
            close()
            moveTo(5f, 9f)
            lineTo(19f, 9f)
            moveTo(6f, 9f)
            lineTo(6f, 18f)
            moveTo(10f, 9f)
            lineTo(10f, 18f)
            moveTo(14f, 9f)
            lineTo(14f, 18f)
            moveTo(18f, 9f)
            lineTo(18f, 18f)
            moveTo(4f, 18f)
            lineTo(20f, 18f)
            moveTo(3f, 21f)
            lineTo(21f, 21f)
        }
    }

    val Income: ImageVector by lazy {
        outlineIcon("Income") {
            moveTo(6f, 5f)
            lineTo(18f, 5f)
            curveTo(19.1f, 5f, 20f, 5.9f, 20f, 7f)
            lineTo(20f, 18f)
            curveTo(20f, 19.1f, 19.1f, 20f, 18f, 20f)
            lineTo(6f, 20f)
            curveTo(4.9f, 20f, 4f, 19.1f, 4f, 18f)
            lineTo(4f, 7f)
            curveTo(4f, 5.9f, 4.9f, 5f, 6f, 5f)
            close()
            moveTo(12f, 8f)
            lineTo(12f, 16f)
            moveTo(8.5f, 12.5f)
            lineTo(12f, 16f)
            lineTo(15.5f, 12.5f)
        }
    }

    val Expenses: ImageVector by lazy {
        outlineIcon("Expenses") {
            moveTo(6f, 5f)
            lineTo(18f, 5f)
            curveTo(19.1f, 5f, 20f, 5.9f, 20f, 7f)
            lineTo(20f, 18f)
            curveTo(20f, 19.1f, 19.1f, 20f, 18f, 20f)
            lineTo(6f, 20f)
            curveTo(4.9f, 20f, 4f, 19.1f, 4f, 18f)
            lineTo(4f, 7f)
            curveTo(4f, 5.9f, 4.9f, 5f, 6f, 5f)
            close()
            moveTo(12f, 16f)
            lineTo(12f, 8f)
            moveTo(8.5f, 11.5f)
            lineTo(12f, 8f)
            lineTo(15.5f, 11.5f)
        }
    }

    val Settings: ImageVector by lazy {
        outlineIcon("Settings") {
            moveTo(4f, 6f)
            lineTo(10f, 6f)
            moveTo(14f, 6f)
            lineTo(20f, 6f)
            moveTo(12f, 4f)
            lineTo(12f, 8f)
            moveTo(4f, 12f)
            lineTo(6f, 12f)
            moveTo(10f, 12f)
            lineTo(20f, 12f)
            moveTo(8f, 10f)
            lineTo(8f, 14f)
            moveTo(4f, 18f)
            lineTo(14f, 18f)
            moveTo(18f, 18f)
            lineTo(20f, 18f)
            moveTo(16f, 16f)
            lineTo(16f, 20f)
        }
    }

    val Privacy: ImageVector by lazy {
        outlineIcon("Privacy") {
            moveTo(12f, 2.5f)
            lineTo(20f, 6f)
            lineTo(20f, 11.5f)
            curveTo(20f, 16.7f, 16.7f, 20.2f, 12f, 22f)
            curveTo(7.3f, 20.2f, 4f, 16.7f, 4f, 11.5f)
            lineTo(4f, 6f)
            close()
            moveTo(9f, 12f)
            lineTo(15f, 12f)
            lineTo(15f, 16f)
            lineTo(9f, 16f)
            close()
            moveTo(10f, 12f)
            lineTo(10f, 10.5f)
            curveTo(10f, 9.4f, 10.9f, 8.5f, 12f, 8.5f)
            curveTo(13.1f, 8.5f, 14f, 9.4f, 14f, 10.5f)
            lineTo(14f, 12f)
        }
    }

    val Accessibility: ImageVector by lazy {
        outlineIcon("Accessibility") {
            moveTo(12f, 3f)
            curveTo(13.1f, 3f, 14f, 3.9f, 14f, 5f)
            curveTo(14f, 6.1f, 13.1f, 7f, 12f, 7f)
            curveTo(10.9f, 7f, 10f, 6.1f, 10f, 5f)
            curveTo(10f, 3.9f, 10.9f, 3f, 12f, 3f)
            close()
            moveTo(5f, 9f)
            lineTo(19f, 9f)
            moveTo(12f, 9f)
            lineTo(12f, 15f)
            moveTo(12f, 12f)
            lineTo(7f, 20f)
            moveTo(12f, 12f)
            lineTo(17f, 20f)
        }
    }

    val SignOut: ImageVector by lazy {
        outlineIcon("SignOut") {
            moveTo(10f, 4f)
            lineTo(5f, 4f)
            curveTo(3.9f, 4f, 3f, 4.9f, 3f, 6f)
            lineTo(3f, 18f)
            curveTo(3f, 19.1f, 3.9f, 20f, 5f, 20f)
            lineTo(10f, 20f)
            moveTo(14f, 8f)
            lineTo(18f, 12f)
            lineTo(14f, 16f)
            moveTo(8f, 12f)
            lineTo(18f, 12f)
        }
    }

    val Plus: ImageVector by lazy {
        outlineIcon("Plus") {
            moveTo(12f, 5f)
            lineTo(12f, 19f)
            moveTo(5f, 12f)
            lineTo(19f, 12f)
        }
    }

    val Transfer: ImageVector by lazy {
        outlineIcon("Transfer") {
            moveTo(4f, 8f)
            lineTo(18f, 8f)
            moveTo(15f, 5f)
            lineTo(18f, 8f)
            lineTo(15f, 11f)
            moveTo(20f, 16f)
            lineTo(6f, 16f)
            moveTo(9f, 13f)
            lineTo(6f, 16f)
            lineTo(9f, 19f)
        }
    }

    val Search: ImageVector by lazy {
        outlineIcon("Search") {
            moveTo(10.5f, 4f)
            curveTo(14.1f, 4f, 17f, 6.9f, 17f, 10.5f)
            curveTo(17f, 14.1f, 14.1f, 17f, 10.5f, 17f)
            curveTo(6.9f, 17f, 4f, 14.1f, 4f, 10.5f)
            curveTo(4f, 6.9f, 6.9f, 4f, 10.5f, 4f)
            close()
            moveTo(15.5f, 15.5f)
            lineTo(21f, 21f)
        }
    }

    val Close: ImageVector by lazy {
        outlineIcon("Close") {
            moveTo(5f, 5f)
            lineTo(19f, 19f)
            moveTo(19f, 5f)
            lineTo(5f, 19f)
        }
    }

    val Check: ImageVector by lazy {
        outlineIcon("Check") {
            moveTo(4f, 12.5f)
            lineTo(9.5f, 18f)
            lineTo(20f, 7.5f)
        }
    }

    val Warning: ImageVector by lazy {
        outlineIcon("Warning") {
            moveTo(12f, 3f)
            lineTo(22f, 20f)
            lineTo(2f, 20f)
            close()
            moveTo(12f, 9f)
            lineTo(12f, 14f)
            moveTo(12f, 17f)
            lineTo(12.01f, 17f)
        }
    }
}

private fun outlineIcon(
    name: String,
    pathBuilder: PathBuilder.() -> Unit,
): ImageVector = ImageVector.Builder(
    name = name,
    defaultWidth = 24.dp,
    defaultHeight = 24.dp,
    viewportWidth = 24f,
    viewportHeight = 24f,
).apply {
    path(
        fill = SolidColor(Color.Transparent),
        stroke = SolidColor(Color.Black),
        strokeLineWidth = 2.4f,
        strokeLineCap = StrokeCap.Round,
        strokeLineJoin = StrokeJoin.Round,
        pathBuilder = pathBuilder,
    )
}.build()
