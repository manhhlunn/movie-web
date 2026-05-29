package com.movieweb.kmp.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class Category(
    val id: String = "",
    val name: String = "",
    val slug: String = ""
)

@Serializable
data class Country(
    val id: String = "",
    val name: String = "",
    val slug: String = ""
)

@Serializable
data class FilterOption(
    val id: String = "",
    val name: String = "",
    val slug: String = ""
)

@Serializable
data class Episode(
    val name: String = "",
    val slug: String = "",
    val filename: String = "",
    val linkEmbed: String = "",
    val linkM3u8: String = ""
)

@Serializable
data class ServerData(
    val serverName: String = "",
    val episodes: List<Episode> = emptyList()
)

@Serializable
data class TmdbConfig(
    val type: String = "", // "movie" or "tv"
    val id: String = "",
    val season: Int? = null,
    val voteAverage: Double? = null,
    val voteCount: Int? = null
)

@Serializable
data class Movie(
    val id: String = "",
    val name: String = "",
    val slug: String = "",
    val originName: String = "",
    val type: String = "single", // "single" | "series" | "hoathinh" | "tvshows"
    val posterUrl: String = "",
    val thumbUrl: String = "",
    val year: Int = 0,
    val quality: String = "HD",
    val lang: String = "Vietsub",
    val episodeCurrent: String = "",
    val episodeTotal: String = "",
    val time: String = "",
    val description: String = "",
    val categories: List<Category> = emptyList(),
    val countries: List<Country> = emptyList(),
    val actors: List<String> = emptyList(),
    val directors: List<String> = emptyList(),
    val tmdbVoteAverage: Double = 0.0,
    val imdbRating: Double = 0.0,
    val imdbId: String = "",
    val imdbVoteCount: Int = 0,
    val tmdb: TmdbConfig? = null,
    val servers: List<ServerData>? = null,
    val trailerUrl: String? = null,
    val modifiedTime: String? = null,
    val lastEpisodeSlug: String? = null,
    val lastTime: Long? = null // Saved timestamp in milliseconds
)

@Serializable
data class MovieListResult(
    val items: List<Movie> = emptyList(),
    val totalItems: Int = 0,
    val totalItemsPerPage: Int = 24,
    val currentPage: Int = 1,
    val totalPages: Int = 1,
    val cdnImageDomain: String = ""
)

// ---------- Aggregated Home Data ----------
data class HomePageData(
    val newlyUpdated: MovieListResult = MovieListResult(),
    val singleMovies: MovieListResult = MovieListResult(),
    val seriesMovies: MovieListResult = MovieListResult(),
    val cinemaMovies: MovieListResult = MovieListResult()
)

// ---------- Stream Info ----------
data class StreamInfo(
    val linkM3u8: String,
    val linkEmbed: String,
    val episodeName: String,
    val movieName: String,
    val movie: Movie
)
