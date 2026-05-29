package com.movieweb.kmp.data.repository

import com.movieweb.kmp.data.remote.datasource.MovieRemoteDataSource
import com.movieweb.kmp.data.mapper.*
import com.movieweb.kmp.domain.model.*
import com.movieweb.kmp.domain.repository.IMovieRepository

class MovieRepositoryImpl(
    private val remoteDataSource: MovieRemoteDataSource
) : IMovieRepository {

    override suspend fun getNewlyUpdated(page: Int): MovieListResult {
        return try {
            remoteDataSource.getNewlyUpdated(page).toDomain()
        } catch (e: Exception) {
            e.printStackTrace()
            MovieListResult()
        }
    }

    override suspend fun getSingleMovies(page: Int): MovieListResult {
        return try {
            remoteDataSource.getSingleMovies(page).toDomain()
        } catch (e: Exception) {
            e.printStackTrace()
            MovieListResult()
        }
    }

    override suspend fun getSeriesMovies(page: Int): MovieListResult {
        return try {
            remoteDataSource.getSeriesMovies(page).toDomain()
        } catch (e: Exception) {
            e.printStackTrace()
            MovieListResult()
        }
    }

    override suspend fun getAnimatedMovies(page: Int): MovieListResult {
        return try {
            remoteDataSource.getAnimatedMovies(page).toDomain()
        } catch (e: Exception) {
            e.printStackTrace()
            MovieListResult()
        }
    }

    override suspend fun getTvShows(page: Int): MovieListResult {
        return try {
            remoteDataSource.getTvShows(page).toDomain()
        } catch (e: Exception) {
            e.printStackTrace()
            MovieListResult()
        }
    }

    override suspend fun getCinemaMovies(page: Int): MovieListResult {
        return try {
            remoteDataSource.getCinemaMovies(page).toDomain()
        } catch (e: Exception) {
            e.printStackTrace()
            MovieListResult()
        }
    }

    override suspend fun getMovieDetails(slug: String): Movie? {
        return try {
            val response = remoteDataSource.getMovieDetails(slug)
            if (response.status == false || response.movie == null) return null

            val cdn = response.pathImage ?: "https://img.ophim.live/uploads/movies"
            var movie = response.movie.toDomain(cdn)
            val baseServers = response.episodes?.map { it.toDomain() } ?: emptyList()
            movie = movie.copy(servers = baseServers)

            // 1. Auto-resolve missing TMDB/IMDb IDs using TMDB API
            if (movie.tmdb?.id.isNullOrEmpty() || movie.tmdb?.id == "0") {
                try {
                    val type = if (movie.type == "series" || movie.type == "tvshows") "tv" else "movie"
                    val query = movie.originName.ifEmpty { movie.name }
                    val year = movie.year
                    
                    val searchRes = remoteDataSource.resolveTmdbMetadata(type, query, year)
                    val firstResult = searchRes.results?.firstOrNull()
                    if (firstResult != null) {
                        val extRes = remoteDataSource.getTmdbExternalIds(type, firstResult.id)
                        movie = movie.copy(
                            tmdb = TmdbConfig(
                                type = type,
                                id = firstResult.id.toString(),
                                voteAverage = firstResult.voteAverage,
                                voteCount = firstResult.voteCount,
                                season = 1
                            ),
                            imdbId = extRes.imdbId ?: movie.imdbId
                        )
                    }
                } catch (e: Exception) {
                    println("TMDB auto-resolution failed: ${e.message}")
                }
            }

            // 2. Fetch additional servers from KKPhim API using TMDB metadata
            val tmdbId = movie.tmdb?.id
            val tmdbType = movie.tmdb?.type
            if (!tmdbId.isNullOrEmpty() && !tmdbType.isNullOrEmpty()) {
                try {
                    val kkRes = remoteDataSource.fetchKkPhimServers(tmdbType, tmdbId)
                    if (kkRes.episodes != null) {
                        val existingServers = movie.servers ?: emptyList()
                        val newServers = mutableListOf<ServerData>()
                        newServers.addAll(existingServers)

                        kkRes.episodes.forEach { rawServer ->
                            val serverName = rawServer.serverName ?: "Nguồn Phụ"
                            // Avoid duplicates
                            if (existingServers.none { it.serverName == serverName }) {
                                newServers.add(
                                    ServerData(
                                        serverName = serverName,
                                        episodes = rawServer.serverData?.map {
                                            Episode(
                                                name = it.name ?: it.filename ?: "",
                                                slug = it.slug ?: "",
                                                filename = it.filename ?: "",
                                                linkEmbed = it.linkEmbed ?: "",
                                                linkM3u8 = it.linkM3u8 ?: ""
                                            )
                                        } ?: emptyList()
                                    )
                                )
                            }
                        }
                        movie = movie.copy(servers = newServers)
                    }
                } catch (e: Exception) {
                    println("KKPhim extra servers fetch failed: ${e.message}")
                }
            }

            movie
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    override suspend fun searchMovies(keyword: String, page: Int): MovieListResult {
        return try {
            remoteDataSource.searchMovies(keyword, page).toDomain()
        } catch (e: Exception) {
            e.printStackTrace()
            MovieListResult()
        }
    }

    override suspend fun getMoviesByCategory(
        categorySlug: String,
        page: Int,
        filters: Map<String, String>
    ): MovieListResult {
        return try {
            remoteDataSource.getMoviesByCategory(categorySlug, page, filters).toDomain()
        } catch (e: Exception) {
            e.printStackTrace()
            MovieListResult()
        }
    }

    override suspend fun getMoviesByCountry(
        countrySlug: String,
        page: Int,
        filters: Map<String, String>
    ): MovieListResult {
        return try {
            remoteDataSource.getMoviesByCountry(countrySlug, page, filters).toDomain()
        } catch (e: Exception) {
            e.printStackTrace()
            MovieListResult()
        }
    }

    override suspend fun getMoviesByYear(
        year: String,
        page: Int,
        filters: Map<String, String>
    ): MovieListResult {
        return try {
            remoteDataSource.getMoviesByYear(year, page, filters).toDomain()
        } catch (e: Exception) {
            e.printStackTrace()
            MovieListResult()
        }
    }

    override suspend fun getMoviesByList(
        listSlug: String,
        page: Int,
        filters: Map<String, String>
    ): MovieListResult {
        return try {
            remoteDataSource.getMoviesByList(listSlug, page, filters).toDomain()
        } catch (e: Exception) {
            e.printStackTrace()
            MovieListResult()
        }
    }

    override suspend fun getCategoryList(): List<FilterOption> {
        return try {
            val response = remoteDataSource.getCategoryList()
            response.data?.items?.map { FilterOption(id = it.id ?: it.idAlt ?: "", name = it.name ?: "", slug = it.slug ?: "") } ?: emptyList()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    override suspend fun getCountryList(): List<FilterOption> {
        return try {
            val response = remoteDataSource.getCountryList()
            response.data?.items?.map { FilterOption(id = it.id ?: it.idAlt ?: "", name = it.name ?: "", slug = it.slug ?: "") } ?: emptyList()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    override suspend fun getYearList(): List<Int> {
        return try {
            val response = remoteDataSource.getYearList()
            response.data?.items?.mapNotNull { it.year } ?: emptyList()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }
}
