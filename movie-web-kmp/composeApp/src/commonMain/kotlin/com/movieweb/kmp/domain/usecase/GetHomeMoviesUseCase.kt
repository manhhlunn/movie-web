package com.movieweb.kmp.domain.usecase

import com.movieweb.kmp.domain.model.HomePageData
import com.movieweb.kmp.domain.repository.IMovieRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

class GetHomeMoviesUseCase(private val repository: IMovieRepository) {
    suspend operator fun invoke(): HomePageData = coroutineScope {
        val newlyUpdated = async { repository.getNewlyUpdated(1) }
        val singleMovies = async { repository.getSingleMovies(1) }
        val seriesMovies = async { repository.getSeriesMovies(1) }
        val cinemaMovies = async { repository.getCinemaMovies(1) }

        HomePageData(
            newlyUpdated = newlyUpdated.await(),
            singleMovies = singleMovies.await(),
            seriesMovies = seriesMovies.await(),
            cinemaMovies = cinemaMovies.await()
        )
    }
}
