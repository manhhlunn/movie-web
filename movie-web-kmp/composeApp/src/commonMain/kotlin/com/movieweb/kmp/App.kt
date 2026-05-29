package com.movieweb.kmp

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.Navigator
import com.movieweb.kmp.presentation.screens.FavoritesScreen
import com.movieweb.kmp.presentation.screens.HistoryScreen
import com.movieweb.kmp.presentation.screens.HomeScreen
import com.movieweb.kmp.presentation.screens.SearchScreen
import com.movieweb.kmp.presentation.theme.MovieWebTheme
import com.movieweb.kmp.presentation.theme.PrimaryRed

enum class AppTab(val title: String, val icon: ImageVector) {
    HOME("Trang chủ", Icons.Default.Home),
    SEARCH("Tìm kiếm", Icons.Default.Search),
    FAVORITES("Yêu thích", Icons.Default.Favorite),
    HISTORY("Lịch sử", Icons.Default.PlayArrow)
}

private fun AppTab.toScreen(): Screen = when (this) {
    AppTab.HOME -> HomeScreen()
    AppTab.SEARCH -> SearchScreen()
    AppTab.FAVORITES -> FavoritesScreen()
    AppTab.HISTORY -> HistoryScreen()
}

@Composable
fun App() {
    var currentTab by remember { mutableStateOf(AppTab.HOME) }

    MovieWebTheme {
        BoxWithConstraints(modifier = Modifier.fillMaxSize().background(Color(0xFF0F0F0F))) {
            val isLargeScreen = maxWidth >= 768.dp

            Row(modifier = Modifier.fillMaxSize()) {
                // Large Screen Sidebar Navigation (Web/Tablet)
                if (isLargeScreen) {
                    Column(
                        modifier = Modifier
                            .width(220.dp)
                            .fillMaxHeight()
                            .background(Color(0xFF161616))
                            .padding(vertical = 24.dp, horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Title/Logo
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(bottom = 24.dp, start = 8.dp)
                        ) {
                            Text(
                                text = "MOVIE",
                                color = Color.White,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Black
                            )
                            Text(
                                text = "WEB",
                                color = PrimaryRed,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Black
                            )
                        }

                        AppTab.entries.forEach { tab ->
                            val isSelected = currentTab == tab
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(
                                        if (isSelected) PrimaryRed.copy(alpha = 0.15f) else Color.Transparent,
                                        RoundedCornerShape(6.dp)
                                    )
                                    .clickable { currentTab = tab }
                                    .padding(horizontal = 12.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = tab.icon,
                                    contentDescription = tab.title,
                                    tint = if (isSelected) PrimaryRed else Color.Gray,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = tab.title,
                                    color = if (isSelected) Color.White else Color.Gray,
                                    fontSize = 14.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                )
                            }
                        }
                    }
                }

                // Main Content — each tab gets its own isolated Navigator to avoid
                // duplicate Saveable keys (IllegalArgumentException: Key ... used multiple times).
                // key(currentTab) tears down and rebuilds the entire Composition subtree
                // (including the Navigator's SaveableStateHolder) when switching tabs.
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                ) {
                    // Crossfade handles the tab switch animation at this level.
                    // Inside each Navigator we use navigator.lastItem.Content() directly
                    // (NOT SlideTransition) to avoid Voyager registering a SaveableState
                    // keyed as "ScreenName:transition" which crashes when two Navigator
                    // instances briefly coexist during Compose key() teardown/rebuild.
                    Crossfade(
                        targetState = currentTab,
                        animationSpec = tween(durationMillis = 200),
                        label = "tab_crossfade"
                    ) { tab ->
                        // key(tab) ensures each tab's Navigator is a fully isolated
                        // Composition subtree — no shared SaveableStateHolder keys.
                        key(tab) {
                            Navigator(screen = tab.toScreen()) { navigator ->
                                navigator.lastItem.Content()
                            }
                        }
                    }

                    // Mobile Screen Bottom Navigation Bar
                    if (!isLargeScreen) {
                        NavigationBar(
                            containerColor = Color(0xFF161616),
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .fillMaxWidth()
                                .height(60.dp),
                            tonalElevation = 8.dp
                        ) {
                            AppTab.entries.forEach { tab ->
                                val isSelected = currentTab == tab
                                NavigationBarItem(
                                    selected = isSelected,
                                    onClick = { currentTab = tab },
                                    icon = {
                                        Icon(
                                            imageVector = tab.icon,
                                            contentDescription = tab.title,
                                            tint = if (isSelected) PrimaryRed else Color.Gray,
                                            modifier = Modifier.size(22.dp)
                                        )
                                    },
                                    label = {
                                        Text(
                                            text = tab.title,
                                            fontSize = 10.sp,
                                            color = if (isSelected) Color.White else Color.Gray,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                        )
                                    },
                                    colors = NavigationBarItemDefaults.colors(
                                        indicatorColor = Color.Transparent
                                    )
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
