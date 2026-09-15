package com.telegram.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = TelegramBlue,
    onPrimary = TelegramTextPrimary,
    secondary = TelegramLightBlue,
    background = TelegramDarkBg,
    surface = TelegramDarkSurface,
    onBackground = TelegramTextPrimary,
    onSurface = TelegramTextPrimary
)

private val LightColorScheme = lightColorScheme(
    primary = TelegramBlue,
    onPrimary = TelegramTextPrimary,
    secondary = TelegramLightBlue,
    background = LightBackground,
    surface = LightSurface,
    onBackground = LightTextPrimary,
    onSurface = LightTextPrimary
)

@Composable
fun TelegramTheme(
    darkTheme: Boolean = true, // Telegram defaults to rich dark mode
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.surface.toArgb()
            window.navigationBarColor = colorScheme.surface.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
