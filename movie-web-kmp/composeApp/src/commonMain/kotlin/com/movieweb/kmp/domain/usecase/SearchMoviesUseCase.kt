package com.movieweb.kmp.domain.usecase

import com.movieweb.kmp.domain.model.MovieListResult
import com.movieweb.kmp.domain.repository.IMovieRepository

class SearchMoviesUseCase(private val repository: IMovieRepository) {
    suspend operator fun invoke(keyword: String, page: Int = 1): MovieListResult {
        return repository.searchMovies(keyword, page)
    }
}
