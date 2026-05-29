package com.movieweb.kmp.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.rememberScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.movieweb.kmp.di.AppContainer
import com.movieweb.kmp.domain.model.Movie
import com.movieweb.kmp.domain.usecase.GetHistoryUseCase
import com.movieweb.kmp.domain.usecase.RemoveFromHistoryUseCase
import com.movieweb.kmp.presentation.components.MovieCard
import kotlinx.coroutines.launch

import com.movieweb.kmp.presentation.base.UiState

class HistoryViewModel(
    private val getHistoryUseCase: GetHistoryUseCase = AppContainer.getHistoryUseCase,
    private val removeFromHistoryUseCase: RemoveFromHistoryUseCase = AppContainer.removeFromHistoryUseCase
) : ScreenModel {
    
    var state by mutableStateOf<UiState<List<Movie>>>(UiState.Loading)
        private set

    fun loadHistory() {
        screenModelScope.launch {
            state = UiState.Loading
            try {
                val list = getHistoryUseCase()
                state = UiState.Success(list)
            } catch (e: Exception) {
                state = UiState.Error(e.message ?: "Lỗi tải lịch sử")
            }
        }
    }

    fun clearAllHistory() {
        val currentState = state
        if (currentState is UiState.Success) {
            screenModelScope.launch {
                try {
                    currentState.data.forEach { movie ->
                        removeFromHistoryUseCase(movie.slug)
                    }
                    loadHistory()
                } catch (e: Exception) {
                    // Ignore clear history failures
                }
            }
        }
    }
}

class HistoryScreen : Screen {
    @Composable
    override fun Content() {
        val viewModel = rememberScreenModel { HistoryViewModel() }
        val navigator = LocalNavigator.currentOrThrow

        // Refresh when screen is displayed
        DisposableEffect(Unit) {
            viewModel.loadHistory()
            onDispose {}
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0F0F0F))
                .padding(bottom = 60.dp) // pad for bottom navigation
        ) {
            val currentState = viewModel.state
            
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Lịch Sử Xem Phim",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                if (currentState is UiState.Success && currentState.data.isNotEmpty()) {
                    TextButton(onClick = { viewModel.clearAllHistory() }) {
                        Text("Xóa Tất Cả", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    }
                }
            }
 
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                when (currentState) {
                    is UiState.Idle -> {}
                    is UiState.Loading -> {
                        CircularProgressIndicator()
                    }
                    is UiState.Error -> {
                        Text(text = currentState.message, color = Color.Red)
                    }
                    is UiState.Success -> {
                        val historyList = currentState.data
                        if (historyList.isEmpty()) {
                            Text(
                                text = "Lịch sử xem phim trống",
                                color = Color.Gray,
                                fontSize = 14.sp
                            )
                        } else {
                            LazyVerticalGrid(
                                columns = GridCells.Adaptive(minSize = 130.dp),
                                contentPadding = PaddingValues(16.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp),
                                modifier = Modifier.fillMaxSize()
                            ) {
                                items(historyList) { movie ->
                                    MovieCard(
                                        movie = movie,
                                        onClick = { navigator.push(DetailScreen(movie.slug)) },
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
