package com.movieweb.kmp.domain.usecase

import com.movieweb.kmp.domain.model.Movie
import com.movieweb.kmp.domain.repository.IUserRepository

class GetFavoritesUseCase(private val repository: IUserRepository) {
    operator fun invoke(): List<Movie> = repository.getFavorites()
}

class ToggleFavoriteUseCase(private val repository: IUserRepository) {
    operator fun invoke(movie: Movie): Boolean = repository.toggleFavorite(movie)
}

class IsFavoriteUseCase(private val repository: IUserRepository) {
    operator fun invoke(slug: String): Boolean = repository.isFavorite(slug)
}
