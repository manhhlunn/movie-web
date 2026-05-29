package com.movieweb.kmp.di

import com.movieweb.kmp.data.local.datasource.UserLocalDataSource
import com.movieweb.kmp.data.remote.datasource.MovieRemoteDataSource
import com.movieweb.kmp.data.repository.MovieRepositoryImpl
import com.movieweb.kmp.data.repository.UserRepositoryImpl
import com.movieweb.kmp.domain.repository.IMovieRepository
import com.movieweb.kmp.domain.repository.IUserRepository
import com.movieweb.kmp.domain.usecase.*

object AppContainer {
    // Data Sources
    private val movieRemoteDataSource by lazy { MovieRemoteDataSource() }
    private val userLocalDataSource by lazy { UserLocalDataSource() }

    // Repositories
    val movieRepository: IMovieRepository by lazy {
        MovieRepositoryImpl(movieRemoteDataSource)
    }
    val userRepository: IUserRepository by lazy {
        UserRepositoryImpl(userLocalDataSource)
    }

    // Use Cases
    val getHomeMoviesUseCase by lazy { GetHomeMoviesUseCase(movieRepository) }
    val getMovieDetailsUseCase by lazy { GetMovieDetailsUseCase(movieRepository) }
    val getStreamLinkUseCase by lazy { GetStreamLinkUseCase(getMovieDetailsUseCase) }
    val searchMoviesUseCase by lazy { SearchMoviesUseCase(movieRepository) }
    val getExploreMoviesUseCase by lazy { GetExploreMoviesUseCase(movieRepository) }

    val getFavoritesUseCase by lazy { GetFavoritesUseCase(userRepository) }
    val toggleFavoriteUseCase by lazy { ToggleFavoriteUseCase(userRepository) }
    val isFavoriteUseCase by lazy { IsFavoriteUseCase(userRepository) }
    val getHistoryUseCase by lazy { GetHistoryUseCase(userRepository) }
    val addToHistoryUseCase by lazy { AddToHistoryUseCase(userRepository) }
    val removeFromHistoryUseCase by lazy { RemoveFromHistoryUseCase(userRepository) }
}
