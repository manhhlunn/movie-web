package com.movieweb.kmp.domain.repository

import com.movieweb.kmp.domain.model.Movie
import com.movieweb.kmp.domain.model.MovieListResult
import com.movieweb.kmp.domain.model.FilterOption

interface IMovieRepository {
    suspend fun getNewlyUpdated(page: Int = 1): MovieListResult
    suspend fun getSingleMovies(page: Int = 1): MovieListResult
    suspend fun getSeriesMovies(page: Int = 1): MovieListResult
    suspend fun getAnimatedMovies(page: Int = 1): MovieListResult
    suspend fun getTvShows(page: Int = 1): MovieListResult
    suspend fun getCinemaMovies(page: Int = 1): MovieListResult
    suspend fun getMovieDetails(slug: String): Movie?
    suspend fun searchMovies(keyword: String, page: Int = 1): MovieListResult
    
    suspend fun getMoviesByCategory(
        categorySlug: String,
        page: Int = 1,
        filters: Map<String, String> = emptyMap()
    ): MovieListResult
    
    suspend fun getMoviesByCountry(
        countrySlug: String,
        page: Int = 1,
        filters: Map<String, String> = emptyMap()
    ): MovieListResult
    
    suspend fun getMoviesByYear(
        year: String,
        page: Int = 1,
        filters: Map<String, String> = emptyMap()
    ): MovieListResult
    
    suspend fun getMoviesByList(
        listSlug: String,
        page: Int = 1,
        filters: Map<String, String> = emptyMap()
    ): MovieListResult
    
    suspend fun getCategoryList(): List<FilterOption>
    suspend fun getCountryList(): List<FilterOption>
    suspend fun getYearList(): List<Int>
}
