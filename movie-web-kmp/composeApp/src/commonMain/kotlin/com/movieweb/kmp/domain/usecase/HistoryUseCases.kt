package com.movieweb.kmp.domain.usecase

import com.movieweb.kmp.domain.model.Movie
import com.movieweb.kmp.domain.repository.IUserRepository

class GetHistoryUseCase(private val repository: IUserRepository) {
    operator fun invoke(): List<Movie> = repository.getHistory()
}

class AddToHistoryUseCase(private val repository: IUserRepository) {
    operator fun invoke(movie: Movie, lastEpisodeSlug: String? = null, lastTime: Long? = null) {
        repository.addToHistory(movie, lastEpisodeSlug, lastTime)
    }
}

class RemoveFromHistoryUseCase(private val repository: IUserRepository) {
    operator fun invoke(slug: String) {
        repository.removeFromHistory(slug)
    }
}
