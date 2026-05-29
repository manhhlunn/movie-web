package com.movieweb.kmp.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.rememberScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import coil3.compose.AsyncImage
import com.movieweb.kmp.di.AppContainer
import com.movieweb.kmp.domain.model.Movie
import com.movieweb.kmp.domain.model.ServerData
import com.movieweb.kmp.domain.usecase.GetMovieDetailsUseCase
import com.movieweb.kmp.domain.usecase.IsFavoriteUseCase
import com.movieweb.kmp.domain.usecase.ToggleFavoriteUseCase
import com.movieweb.kmp.domain.usecase.AddToHistoryUseCase
import com.movieweb.kmp.presentation.theme.PrimaryRed
import kotlinx.coroutines.launch

import com.movieweb.kmp.presentation.base.UiState

class DetailViewModel(
    private val slug: String,
    private val getMovieDetailsUseCase: GetMovieDetailsUseCase = AppContainer.getMovieDetailsUseCase,
    private val isFavoriteUseCase: IsFavoriteUseCase = AppContainer.isFavoriteUseCase,
    private val toggleFavoriteUseCase: ToggleFavoriteUseCase = AppContainer.toggleFavoriteUseCase,
    private val addToHistoryUseCase: AddToHistoryUseCase = AppContainer.addToHistoryUseCase
) : ScreenModel {
    
    var state by mutableStateOf<UiState<Movie>>(UiState.Loading)
        private set

    var isFavoriteMovie by mutableStateOf(false)
        private set

    init {
        loadMovie()
        checkFavorite()
    }

    fun loadMovie() {
        screenModelScope.launch {
            state = UiState.Loading
            try {
                val movie = getMovieDetailsUseCase(slug)
                state = if (movie != null) {
                    UiState.Success(movie)
                } else {
                    UiState.Error("Không tìm thấy thông tin phim")
                }
            } catch (e: Exception) {
                state = UiState.Error(e.message ?: "Lỗi kết nối")
            }
        }
    }

    private fun checkFavorite() {
        isFavoriteMovie = isFavoriteUseCase(slug)
    }

    fun toggleFavorite(movie: Movie) {
        isFavoriteMovie = toggleFavoriteUseCase(movie)
    }

    fun saveHistory(movie: Movie, episodeSlug: String) {
        addToHistoryUseCase(movie, episodeSlug, 0)
    }
}

data class DetailScreen(val slug: String) : Screen {
    @Composable
    override fun Content() {
        val viewModel = rememberScreenModel(tag = slug) { DetailViewModel(slug) }
        val navigator = LocalNavigator.currentOrThrow
        val scrollState = rememberScrollState()

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0F0F0F))
        ) {
            when (val currentState = viewModel.state) {
                is UiState.Idle -> {}
                is UiState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
                is UiState.Error -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(text = currentState.message, color = Color.Red)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadMovie() }) {
                            Text("Thử lại")
                        }
                    }
                }
                is UiState.Success -> {
                    val movie = currentState.data
                    
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(scrollState)
                            .padding(bottom = 60.dp)
                    ) {
                        // Poster Banner
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(300.dp)
                        ) {
                            AsyncImage(
                                model = movie.posterUrl.ifEmpty { movie.thumbUrl },
                                contentDescription = movie.name,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                            // Shadow Gradient
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.verticalGradient(
                                            colors = listOf(Color.Transparent, Color(0xFF0F0F0F)),
                                            startY = 100f
                                        )
                                    )
                            )
                        }

                        // Info Section
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                        ) {
                            Text(
                                text = movie.name,
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            if (movie.originName.isNotEmpty() && movie.originName != movie.name) {
                                Text(
                                    text = movie.originName,
                                    fontSize = 16.sp,
                                    color = Color.Gray,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                            
                            Spacer(modifier = Modifier.height(10.dp))

                            // Interactive Buttons: Favorite & Play first episode
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                val firstEpisode = movie.servers?.firstOrNull()?.episodes?.firstOrNull()
                                Button(
                                    onClick = {
                                        if (firstEpisode != null) {
                                            viewModel.saveHistory(movie, firstEpisode.slug)
                                            navigator.push(WatchScreen(movie.slug, firstEpisode.slug))
                                        }
                                    },
                                    enabled = firstEpisode != null,
                                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryRed),
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text("Xem Phim", fontWeight = FontWeight.Bold)
                                }

                                OutlinedButton(
                                    onClick = { viewModel.toggleFavorite(movie) },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(6.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                                ) {
                                    Text(
                                        text = if (viewModel.isFavoriteMovie) "Đã Yêu Thích" else "Yêu Thích",
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Meta items
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .background(Color.White.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                  ) {
                                    Text(text = movie.quality, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                                Box(
                                    modifier = Modifier
                                        .background(Color.White.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(text = movie.lang, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                                if (movie.year > 0) {
                                    Text(text = "Năm: ${movie.year}", color = Color.LightGray, fontSize = 13.sp)
                                }
                                if (movie.time.isNotEmpty()) {
                                    Text(text = " • ${movie.time}", color = Color.LightGray, fontSize = 13.sp)
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            if (movie.categories.isNotEmpty()) {
                                Text(
                                    text = "Thể loại: " + movie.categories.joinToString(", ") { it.name },
                                    color = Color.LightGray,
                                    fontSize = 13.sp
                                )
                            }
                            if (movie.countries.isNotEmpty()) {
                                Text(
                                    text = "Quốc gia: " + movie.countries.joinToString(", ") { it.name },
                                    color = Color.LightGray,
                                    fontSize = 13.sp
                                )
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Synopsis
                            Text(
                                text = "Nội dung phim",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = movie.description.replace(Regex("<[^>]*>"), ""), // Strip HTML tags
                                fontSize = 13.sp,
                                color = Color.LightGray,
                                lineHeight = 18.sp
                            )

                            Spacer(modifier = Modifier.height(24.dp))

                            // Servers & Episodes List
                            val servers = movie.servers ?: emptyList()
                            if (servers.isNotEmpty()) {
                                Text(
                                    text = "Danh Sách Tập Phim",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.height(12.dp))

                                servers.forEach { server ->
                                    Text(
                                        text = "Nguồn: ${server.serverName}",
                                        fontSize = 13.sp,
                                        color = Color.Gray,
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier.padding(bottom = 6.dp)
                                    )

                                    // Episode list grid wrap
                                    Column(
                                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                                    ) {
                                        val episodes = server.episodes
                                        // Render in chunks of 5 episodes per row
                                        episodes.chunked(5).forEach { rowEps ->
                                            Row(
                                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                                            ) {
                                                rowEps.forEach { ep ->
                                                    Box(
                                                        modifier = Modifier
                                                            .weight(1f)
                                                            .background(Color(0xFF1E1E1E), RoundedCornerShape(4.dp))
                                                            .clickable {
                                                                viewModel.saveHistory(movie, ep.slug)
                                                                navigator.push(WatchScreen(movie.slug, ep.slug))
                                                            }
                                                            .padding(vertical = 8.dp),
                                                        contentAlignment = Alignment.Center
                                                    ) {
                                                        Text(
                                                            text = ep.name,
                                                            color = Color.White,
                                                            fontSize = 12.sp,
                                                            maxLines = 1,
                                                            overflow = TextOverflow.Ellipsis
                                                        )
                                                    }
                                                }
                                                // Pad row if last row doesn't have 5 elements
                                                if (rowEps.size < 5) {
                                                    repeat(5 - rowEps.size) {
                                                        Spacer(modifier = Modifier.weight(1f))
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                Text(
                                    text = "Chưa cập nhật tập phim nào",
                                    color = Color.Gray,
                                    fontSize = 13.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
