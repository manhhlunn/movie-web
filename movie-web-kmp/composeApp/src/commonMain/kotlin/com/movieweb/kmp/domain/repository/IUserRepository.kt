package com.movieweb.kmp.domain.repository

import com.movieweb.kmp.domain.model.Movie

interface IUserRepository {
    fun getFavorites(): List<Movie>
    fun toggleFavorite(movie: Movie): Boolean
    fun isFavorite(slug: String): Boolean
    fun getHistory(): List<Movie>
    fun addToHistory(movie: Movie, lastEpisodeSlug: String? = null, lastTime: Long? = null)
    fun removeFromHistory(slug: String)
}
