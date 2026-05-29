package com.movieweb.kmp.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.movieweb.kmp.domain.usecase.GetExploreMoviesUseCase
import com.movieweb.kmp.presentation.components.MovieCard
import kotlinx.coroutines.launch

import com.movieweb.kmp.presentation.base.UiState

class ExploreViewModel(
    private val filterType: String,
    private val slug: String,
    private val getExploreMoviesUseCase: GetExploreMoviesUseCase = AppContainer.getExploreMoviesUseCase
) : ScreenModel {
    
    var state by mutableStateOf<UiState<Unit>>(UiState.Loading)
        private set

    var currentPage by mutableStateOf(1)
    var totalPages by mutableStateOf(1)
    var itemsList = mutableStateListOf<Movie>()

    init {
        loadPage(1)
    }

    fun loadPage(page: Int) {
        screenModelScope.launch {
            if (page == 1) {
                state = UiState.Loading
            }
            try {
                val result = getExploreMoviesUseCase(filterType, slug, page)
                currentPage = result.currentPage
                totalPages = result.totalPages
                
                if (page == 1) {
                    itemsList.clear()
                }
                itemsList.addAll(result.items)
                state = UiState.Success(Unit)
            } catch (e: Exception) {
                if (page == 1) {
                    state = UiState.Error(e.message ?: "Lỗi kết nối")
                }
            }
        }
    }

    fun loadNextPage() {
        if (currentPage < totalPages) {
            loadPage(currentPage + 1)
        }
    }
}

data class ExploreScreen(
    val filterType: String, // "the-loai" | "quoc-gia" | "nam-phat-hanh" | "danh-sach"
    val slug: String,
    val name: String
) : Screen {
    @Composable
    override fun Content() {
        // Tag VM with keys so it updates on screen parameters
        val viewModel = rememberScreenModel(tag = "$filterType-$slug") { ExploreViewModel(filterType, slug) }
        val navigator = LocalNavigator.currentOrThrow

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0F0F0F))
        ) {
            // Header Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { navigator.pop() }) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = Color.White
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = name,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }

            // Grid content
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                when (val currentState = viewModel.state) {
                    is UiState.Idle -> {}
                    is UiState.Loading -> {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                    is UiState.Error -> {
                        Column(
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(text = currentState.message, color = Color.Red)
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(onClick = { viewModel.loadPage(1) }) {
                                    Text("Thử lại")
                            }
                        }
                    }
                    is UiState.Success -> {
                        val movies = viewModel.itemsList
                        if (movies.isEmpty()) {
                            Text("Chưa có phim trong danh sách này", color = Color.Gray)
                        } else {
                            LazyVerticalGrid(
                                columns = GridCells.Adaptive(minSize = 130.dp),
                                contentPadding = PaddingValues(16.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp),
                                modifier = Modifier.fillMaxSize()
                            ) {
                                items(movies) { movie ->
                                    MovieCard(
                                        movie = movie,
                                        onClick = { navigator.push(DetailScreen(movie.slug)) },
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }

                                // Load more trigger element at bottom of grid
                                if (viewModel.currentPage < viewModel.totalPages) {
                                    item {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(16.dp)
                                                .clickable { viewModel.loadNextPage() },
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = "Xem thêm phim",
                                                color = MaterialTheme.colorScheme.primary,
                                                fontWeight = FontWeight.Bold
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
    }
}
