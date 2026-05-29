package com.movieweb.kmp.data.local.datasource

import com.russhwolf.settings.Settings
import com.movieweb.kmp.domain.model.Movie
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class UserLocalDataSource {
    private val settings: Settings = Settings()

    companion object {
        private const val FAVORITES_KEY = "user_favorites"
        private const val HISTORY_KEY = "user_history"
        private const val MAX_HISTORY = 50
    }

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    fun getFavorites(): List<Movie> {
        val stored = settings.getStringOrNull(FAVORITES_KEY) ?: return emptyList()
        return try {
            json.decodeFromString<List<Movie>>(stored)
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun toggleFavorite(movie: Movie): Boolean {
        val favorites = getFavorites().toMutableList()
        val index = favorites.indexOfFirst { it.slug == movie.slug }
        val isAdded: Boolean

        if (index > -1) {
            favorites.removeAt(index)
            isAdded = false
        } else {
            // Keep essential fields to prevent huge JSON strings in settings
            val minimalMovie = Movie(
                id = movie.id,
                name = movie.name,
                slug = movie.slug,
                posterUrl = movie.posterUrl,
                thumbUrl = movie.thumbUrl,
                quality = movie.quality,
                year = movie.year,
                lang = movie.lang,
                episodeCurrent = movie.episodeCurrent
            )
            favorites.add(0, minimalMovie)
            isAdded = true
        }

        settings.putString(FAVORITES_KEY, json.encodeToString(favorites))
        return isAdded
    }

    fun isFavorite(slug: String): Boolean {
        return getFavorites().any { it.slug == slug }
    }

    fun getHistory(): List<Movie> {
        val stored = settings.getStringOrNull(HISTORY_KEY) ?: return emptyList()
        return try {
            json.decodeFromString<List<Movie>>(stored)
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun addToHistory(movie: Movie, lastEpisodeSlug: String? = null, lastTime: Long? = null) {
        val history = getHistory().toMutableList()
        val index = history.indexOfFirst { it.slug == movie.slug }
        val movieToStore: Movie

        if (index > -1) {
            val existing = history[index]
            movieToStore = existing.copy(
                lastEpisodeSlug = lastEpisodeSlug ?: existing.lastEpisodeSlug,
                lastTime = lastTime ?: existing.lastTime
            )
            history.removeAt(index)
        } else {
            movieToStore = Movie(
                id = movie.id,
                name = movie.name,
                slug = movie.slug,
                posterUrl = movie.posterUrl,
                thumbUrl = movie.thumbUrl,
                quality = movie.quality,
                year = movie.year,
                lang = movie.lang,
                episodeCurrent = movie.episodeCurrent,
                lastEpisodeSlug = lastEpisodeSlug,
                lastTime = lastTime
            )
        }

        history.add(0, movieToStore)

        if (history.size > MAX_HISTORY) {
            history.removeAt(history.lastIndex)
        }

        settings.putString(HISTORY_KEY, json.encodeToString(history))
    }

    fun removeFromHistory(slug: String) {
        val history = getHistory().toMutableList()
        val filtered = history.filter { it.slug != slug }
        settings.putString(HISTORY_KEY, json.encodeToString(filtered))
    }
}
