package com.movieweb.kmp.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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
import com.movieweb.kmp.di.AppContainer
import com.movieweb.kmp.domain.model.Episode
import com.movieweb.kmp.domain.model.Movie
import com.movieweb.kmp.domain.usecase.GetStreamLinkUseCase
import com.movieweb.kmp.domain.usecase.AddToHistoryUseCase
import com.movieweb.kmp.presentation.components.VideoPlayer
import com.movieweb.kmp.presentation.theme.PrimaryRed
import kotlinx.coroutines.launch

import com.movieweb.kmp.presentation.base.UiState

data class WatchData(
    val movie: Movie,
    val linkM3u8: String,
    val linkEmbed: String,
    val episodeName: String
)

class WatchViewModel(
    private val slug: String,
    private val episodeSlug: String,
    private val getStreamLinkUseCase: GetStreamLinkUseCase = AppContainer.getStreamLinkUseCase,
    private val addToHistoryUseCase: AddToHistoryUseCase = AppContainer.addToHistoryUseCase
) : ScreenModel {

    var state by mutableStateOf<UiState<WatchData>>(UiState.Loading)
        private set

    init {
        loadStream()
    }

    fun loadStream() {
        screenModelScope.launch {
            state = UiState.Loading
            try {
                val streamInfo = getStreamLinkUseCase(slug, episodeSlug)
                state = if (streamInfo != null) {
                    // Save history details via clean architecture usecase
                    addToHistoryUseCase(streamInfo.movie, episodeSlug, 0)
                    UiState.Success(
                        WatchData(
                            movie = streamInfo.movie,
                            linkM3u8 = streamInfo.linkM3u8,
                            linkEmbed = streamInfo.linkEmbed,
                            episodeName = streamInfo.episodeName
                        )
                    )
                } else {
                    UiState.Error("Không lấy được đường dẫn nguồn phát")
                }
            } catch (e: Exception) {
                state = UiState.Error(e.message ?: "Lỗi kết nối")
            }
        }
    }
}

data class WatchScreen(val slug: String, val episodeSlug: String) : Screen {
    @Composable
    override fun Content() {
        // Force tag keys so the view model is recreated on episode changes
        val viewModel = rememberScreenModel(tag = "$slug-$episodeSlug") { WatchViewModel(slug, episodeSlug) }
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
                        Button(onClick = { viewModel.loadStream() }) {
                            Text("Thử lại")
                        }
                    }
                }
                is UiState.Success -> {
                    val watchData = currentState.data
                    val movie = watchData.movie
                    val servers = movie.servers ?: emptyList()

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(scrollState)
                    ) {
                        // Title header bar with Back button
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(onClick = { navigator.pop() }) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = "Quay lại",
                                    tint = Color.White
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                text_ellipses_wrapper(movie.name, true)
                                Text(
                                    text = "Đang xem: ${watchData.episodeName}",
                                    color = PrimaryRed,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }

                        // Video Player (Expect / Actual wrapper rendering ExoPlayer/AVPlayer/HTML5 depending on compilation)
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(16f / 9f)
                                .background(Color.Black)
                        ) {
                            VideoPlayer(
                                modifier = Modifier.fillMaxSize(),
                                linkM3u8 = watchData.linkM3u8.ifEmpty { null },
                                linkEmbed = watchData.linkEmbed.ifEmpty { null },
                                title = "${movie.name} - ${watchData.episodeName}",
                                poster = movie.posterUrl.ifEmpty { movie.thumbUrl },
                                movieSlug = movie.slug,
                                episodeSlug = episodeSlug,
                                movie = movie,
                                onNextEpisode = {
                                    // Locate next episode if available in the same server
                                    val currentServer = servers.firstOrNull { s -> s.episodes.any { it.slug == episodeSlug } }
                                    if (currentServer != null) {
                                        val idx = currentServer.episodes.indexOfFirst { it.slug == episodeSlug }
                                        if (idx != -1 && idx < currentServer.episodes.size - 1) {
                                            val nextEp = currentServer.episodes[idx + 1]
                                            navigator.push(WatchScreen(movie.slug, nextEp.slug))
                                        }
                                    }
                                }
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Episode lists inside current servers to switch easily
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            Text(
                                text = "Chọn Tập Phim Khác",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                modifier = Modifier.padding(bottom = 12.dp)
                            )

                            servers.forEach { server ->
                                Text(
                                    text = "Nguồn: ${server.serverName}",
                                    fontSize = 13.sp,
                                    color = Color.Gray,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(bottom = 6.dp)
                                )

                                Column(
                                    modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                                ) {
                                    val episodes = server.episodes
                                    episodes.chunked(5).forEach { rowEps ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            rowEps.forEach { ep ->
                                                val isCurrent = ep.slug == episodeSlug
                                                Box(
                                                    modifier = Modifier
                                                        .weight(1f)
                                                        .background(
                                                            if (isCurrent) PrimaryRed else Color(0xFF1E1E1E),
                                                            RoundedCornerShape(4.dp)
                                                        )
                                                        .clickable {
                                                            if (!isCurrent) {
                                                                navigator.replace(WatchScreen(movie.slug, ep.slug))
                                                            }
                                                        }
                                                        .padding(vertical = 8.dp),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Text(
                                                        text = ep.name,
                                                        color = Color.White,
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                }
                                            }
                                            if (rowEps.size < 5) {
                                                repeat(5 - rowEps.size) {
                                                    Spacer(modifier = Modifier.weight(1f))
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    @Composable
    private fun text_ellipses_wrapper(text: String, isTitle: Boolean) {
        Text(
            text = text,
            color = Color.White,
            fontSize = if (isTitle) 16.sp else 12.sp,
            fontWeight = if (isTitle) FontWeight.Bold else FontWeight.Normal,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}
