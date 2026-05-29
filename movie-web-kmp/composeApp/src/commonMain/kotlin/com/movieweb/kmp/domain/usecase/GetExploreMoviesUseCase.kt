package com.movieweb.kmp.domain.usecase

import com.movieweb.kmp.domain.model.MovieListResult
import com.movieweb.kmp.domain.repository.IMovieRepository

class GetExploreMoviesUseCase(private val repository: IMovieRepository) {
    suspend operator fun invoke(
        filterType: String,
        slug: String,
        page: Int = 1,
        filters: Map<String, String> = emptyMap()
    ): MovieListResult {
        return when (filterType) {
            "the-loai" -> repository.getMoviesByCategory(slug, page, filters)
            "quoc-gia" -> repository.getMoviesByCountry(slug, page, filters)
            "nam-phat-hanh" -> repository.getMoviesByYear(slug, page, filters)
            "danh-sach" -> {
                when (slug) {
                    "phim-le" -> repository.getSingleMovies(page)
                    "phim-bo" -> repository.getSeriesMovies(page)
                    "hoat-hinh" -> repository.getAnimatedMovies(page)
                    "tv-shows" -> repository.getTvShows(page)
                    "phim-chieu-rap" -> repository.getCinemaMovies(page)
                    else -> repository.getMoviesByList(slug, page, filters)
                }
            }
            else -> repository.getMoviesByList(slug, page, filters)
        }
    }
}
