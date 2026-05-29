package com.movieweb.kmp.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.input.ImeAction
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
import com.movieweb.kmp.domain.usecase.SearchMoviesUseCase
import com.movieweb.kmp.presentation.components.MovieCard
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

import com.movieweb.kmp.presentation.base.UiState

class SearchViewModel(
    private val searchMoviesUseCase: SearchMoviesUseCase = AppContainer.searchMoviesUseCase
) : ScreenModel {
    
    var query by mutableStateOf("")
    var state by mutableStateOf<UiState<List<Movie>>>(UiState.Idle)
        private set

    private var searchJob: Job? = null

    fun onQueryChanged(newQuery: String) {
        query = newQuery
        searchJob?.cancel()
        
        if (newQuery.length < 2) {
            state = UiState.Idle
            return
        }

        searchJob = screenModelScope.launch {
            delay(500) // Debounce API requests
            performSearch()
        }
    }

    fun performSearch() {
        if (query.length < 2) return
        screenModelScope.launch {
            state = UiState.Loading
            try {
                val result = searchMoviesUseCase(query, 1)
                state = UiState.Success(result.items)
            } catch (e: Exception) {
                state = UiState.Error(e.message ?: "Lỗi kết nối")
            }
        }
    }
}

class SearchScreen : Screen {
    @Composable
    override fun Content() {
        val viewModel = rememberScreenModel { SearchViewModel() }
        val navigator = LocalNavigator.currentOrThrow
        val keyboardController = LocalSoftwareKeyboardController.current

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0F0F0F))
                .padding(bottom = 60.dp) // padding for navigation
        ) {
            // Search Input Header
            OutlinedTextField(
                value = viewModel.query,
                onValueChange = { viewModel.onQueryChanged(it) },
                placeholder = { Text("Tìm kiếm phim...", color = Color.Gray) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = Color.Gray
                    )
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = {
                    viewModel.performSearch()
                    keyboardController?.hide()
                }),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = Color(0xFF2C2C2C),
                    focusedContainerColor = Color(0xFF1E1E1E),
                    unfocusedContainerColor = Color(0xFF1E1E1E)
                ),
                shape = RoundedCornerShape(8.dp)
            )

            // Results Area
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                when (val currentState = viewModel.state) {
                    is UiState.Idle -> {
                        Text("Nhập từ khóa để tìm kiếm phim", color = Color.Gray, fontSize = 14.sp)
                    }
                    is UiState.Loading -> {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                    is UiState.Error -> {
                        Text("Lỗi: ${currentState.message}", color = Color.Red, fontSize = 14.sp)
                    }
                    is UiState.Success -> {
                        val items = currentState.data
                        if (items.isEmpty()) {
                            Text("Không tìm thấy kết quả phù hợp", color = Color.Gray, fontSize = 14.sp)
                        } else {
                            LazyVerticalGrid(
                                columns = GridCells.Adaptive(minSize = 130.dp),
                                contentPadding = PaddingValues(16.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp),
                                modifier = Modifier.fillMaxSize()
                            ) {
                                items(items) { movie ->
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
