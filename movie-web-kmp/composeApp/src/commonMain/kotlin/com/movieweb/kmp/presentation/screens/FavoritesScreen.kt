package com.movieweb.kmp.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
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
import com.movieweb.kmp.domain.usecase.GetFavoritesUseCase
import com.movieweb.kmp.presentation.components.MovieCard
import kotlinx.coroutines.launch

import com.movieweb.kmp.presentation.base.UiState

class FavoritesViewModel(
    private val getFavoritesUseCase: GetFavoritesUseCase = AppContainer.getFavoritesUseCase
) : ScreenModel {
    
    var state by mutableStateOf<UiState<List<Movie>>>(UiState.Loading)
        private set

    fun loadFavorites() {
        screenModelScope.launch {
            state = UiState.Loading
            try {
                val list = getFavoritesUseCase()
                state = UiState.Success(list)
            } catch (e: Exception) {
                state = UiState.Error(e.message ?: "Lỗi tải danh sách")
            }
        }
    }
}

class FavoritesScreen : Screen {
    @Composable
    override fun Content() {
        val viewModel = rememberScreenModel { FavoritesViewModel() }
        val navigator = LocalNavigator.currentOrThrow

        // Refresh when screen is displayed
        DisposableEffect(Unit) {
            viewModel.loadFavorites()
            onDispose {}
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0F0F0F))
                .padding(bottom = 60.dp) // pad for bottom navigation
        ) {
            Text(
                text = "Phim Đã Yêu Thích",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.padding(16.dp)
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                when (val currentState = viewModel.state) {
                    is UiState.Idle -> {}
                    is UiState.Loading -> {
                        CircularProgressIndicator()
                    }
                    is UiState.Error -> {
                        Text(text = currentState.message, color = Color.Red)
                    }
                    is UiState.Success -> {
                        val favorites = currentState.data
                        if (favorites.isEmpty()) {
                            Text(
                                text = "Danh sách yêu thích trống",
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
                                items(favorites) { movie ->
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
