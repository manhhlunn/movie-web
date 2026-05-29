package com.movieweb.kmp.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.rememberScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.movieweb.kmp.domain.model.HomePageData
import com.movieweb.kmp.domain.model.Movie
import com.movieweb.kmp.domain.usecase.GetHomeMoviesUseCase
import com.movieweb.kmp.domain.usecase.GetHistoryUseCase
import com.movieweb.kmp.di.AppContainer
import com.movieweb.kmp.presentation.components.HeroSection
import com.movieweb.kmp.presentation.components.MovieSlider
import kotlinx.coroutines.launch

import com.movieweb.kmp.presentation.base.UiState

data class HomeData(
    val data: HomePageData,
    val watchHistory: List<Movie>
)

class HomeViewModel(
    private val getHomeMoviesUseCase: GetHomeMoviesUseCase = AppContainer.getHomeMoviesUseCase,
    private val getHistoryUseCase: GetHistoryUseCase = AppContainer.getHistoryUseCase
) : ScreenModel {
    
    var state by mutableStateOf<UiState<HomeData>>(UiState.Loading)
        private set

    init {
        loadData()
    }

    fun loadData() {
        screenModelScope.launch {
            state = UiState.Loading
            try {
                val data = getHomeMoviesUseCase()
                val history = getHistoryUseCase()
                state = UiState.Success(HomeData(data, history))
            } catch (e: Exception) {
                state = UiState.Error(e.message ?: "Unknown Error")
            }
        }
    }

    fun refreshHistory() {
        val currentState = state
        if (currentState is UiState.Success) {
            screenModelScope.launch {
                try {
                    val history = getHistoryUseCase()
                    state = UiState.Success(currentState.data.copy(watchHistory = history))
                } catch (e: Exception) {
                    // Ignore background refresh errors
                }
            }
        }
    }
}

class HomeScreen : Screen {
    @Composable
    override fun Content() {
        val viewModel = rememberScreenModel { HomeViewModel() }
        val navigator = LocalNavigator.currentOrThrow
        val scrollState = rememberScrollState()
        
        // Refresh watch history when this screen is active
        DisposableEffect(Unit) {
            viewModel.refreshHistory()
            onDispose {}
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0F0F0F))
        ) {
            when (val currentState = viewModel.state) {
                is UiState.Idle -> {}
                is UiState.Loading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
                is UiState.Error -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(text = "Đã xảy ra lỗi: ${currentState.message}", color = Color.Red)
                        Spacer(modifier = Modifier.height(16.dp))
                        androidx.compose.material3.Button(onClick = { viewModel.loadData() }) {
                            Text("Thử lại")
                        }
                    }
                }
                is UiState.Success -> {
                    val homeData = currentState.data
                    val data = homeData.data
                    val watchHistory = homeData.watchHistory
                    val newlyUpdated = data.newlyUpdated.items
                    val singleMovies = data.singleMovies.items
                    val seriesMovies = data.seriesMovies.items
                    val cinemaMovies = data.cinemaMovies.items

                    val heroMovies = newlyUpdated.take(5)

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(scrollState)
                            .padding(bottom = 60.dp) // padding for navigation bar
                    ) {
                        // Hero Carousel Banner
                        if (heroMovies.isNotEmpty()) {
                            HeroSection(
                                movies = heroMovies,
                                onWatchClick = { movie ->
                                    navigator.push(DetailScreen(movie.slug))
                                }
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Continue Watching Slider
                        if (watchHistory.isNotEmpty()) {
                            MovieSlider(
                                title = "Tiếp Tục Xem",
                                movies = watchHistory,
                                onMovieClick = { movie ->
                                    // If we have a saved episode, navigate to WatchScreen directly or DetailScreen
                                    val lastEp = movie.lastEpisodeSlug
                                    if (!lastEp.isNullOrEmpty()) {
                                        navigator.push(WatchScreen(movie.slug, lastEp))
                                    } else {
                                        navigator.push(DetailScreen(movie.slug))
                                    }
                                }
                            )
                        }

                        // Newly Updated Slider
                        MovieSlider(
                            title = "Mới Cập Nhật",
                            movies = newlyUpdated,
                            onMovieClick = { movie -> navigator.push(DetailScreen(movie.slug)) },
                            onSeeMoreClick = {
                                navigator.push(ExploreScreen(filterType = "danh-sach", slug = "phim-moi-cap-nhat", name = "Mới Cập Nhật"))
                            }
                        )

                        // Phim Lẻ Mới Slider
                        MovieSlider(
                            title = "Phim Lẻ Mới",
                            movies = singleMovies,
                            onMovieClick = { movie -> navigator.push(DetailScreen(movie.slug)) },
                            onSeeMoreClick = {
                                navigator.push(ExploreScreen(filterType = "danh-sach", slug = "phim-le", name = "Phim Lẻ"))
                            }
                        )

                        // Phim Bộ Mới Slider
                        MovieSlider(
                            title = "Phim Bộ Mới",
                            movies = seriesMovies,
                            onMovieClick = { movie -> navigator.push(DetailScreen(movie.slug)) },
                            onSeeMoreClick = {
                                navigator.push(ExploreScreen(filterType = "danh-sach", slug = "phim-bo", name = "Phim Bộ"))
                            }
                        )

                        // Phim Chiếu Rạp Slider
                        MovieSlider(
                            title = "Phim Chiếu Rạp",
                            movies = cinemaMovies,
                            onMovieClick = { movie -> navigator.push(DetailScreen(movie.slug)) },
                            onSeeMoreClick = {
                                navigator.push(ExploreScreen(filterType = "danh-sach", slug = "phim-chieu-rap", name = "Phim Chiếu Rạp"))
                            }
                        )
                    }
                }
            }
        }
    }
}
