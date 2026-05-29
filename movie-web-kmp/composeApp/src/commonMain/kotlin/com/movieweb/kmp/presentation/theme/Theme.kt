package com.movieweb.kmp.presentation.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Premium Sleek Dark Color Palette
val PrimaryRed = Color(0xFFE50914) // Netflix Red
val PrimaryRedHover = Color(0xFFF40B16)
val BackgroundDark = Color(0xFF0F0F0F) // Sleek Black
val SurfaceDark = Color(0xFF1E1E1E) // Card Background
val OnBackgroundLight = Color(0xFFFFFFFF)
val OnSurfaceLight = Color(0xFFE0E0E0)
val AccentGray = Color(0xFF8C8C8C)
val BorderDark = Color(0xFF2C2C2C)

private val DarkColorScheme = darkColorScheme(
    primary = PrimaryRed,
    secondary = AccentGray,
    background = BackgroundDark,
    surface = SurfaceDark,
    onPrimary = Color.White,
    onBackground = OnBackgroundLight,
    onSurface = OnSurfaceLight
)

@Composable
fun MovieWebTheme(
    darkTheme: Boolean = true, // Force dark theme for premium cinema feel
    content: @Composable () -> Unit
) {
    val colorScheme = DarkColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(), // System default fallback (custom fonts can be added via resources)
        content = content
    )
}
