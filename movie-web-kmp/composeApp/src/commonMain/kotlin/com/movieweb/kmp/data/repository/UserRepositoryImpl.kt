package com.movieweb.kmp.data.repository

import com.movieweb.kmp.data.local.datasource.UserLocalDataSource
import com.movieweb.kmp.domain.model.Movie
import com.movieweb.kmp.domain.repository.IUserRepository

class UserRepositoryImpl(
    private val localDataSource: UserLocalDataSource
) : IUserRepository {
    override fun getFavorites(): List<Movie> = localDataSource.getFavorites()
    override fun toggleFavorite(movie: Movie): Boolean = localDataSource.toggleFavorite(movie)
    override fun isFavorite(slug: String): Boolean = localDataSource.isFavorite(slug)
    override fun getHistory(): List<Movie> = localDataSource.getHistory()
    override fun addToHistory(movie: Movie, lastEpisodeSlug: String?, lastTime: Long?) {
        localDataSource.addToHistory(movie, lastEpisodeSlug, lastTime)
    }
    override fun removeFromHistory(slug: String) = localDataSource.removeFromHistory(slug)
}
