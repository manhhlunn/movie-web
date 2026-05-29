package com.movieweb.kmp.domain.usecase

import com.movieweb.kmp.domain.model.Movie
import com.movieweb.kmp.domain.repository.IMovieRepository

class GetMovieDetailsUseCase(private val repository: IMovieRepository) {
    suspend operator fun invoke(slug: String): Movie? {
        return repository.getMovieDetails(slug)
    }
}
