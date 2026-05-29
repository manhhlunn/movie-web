package com.movieweb.kmp.data.remote.datasource

import com.movieweb.kmp.data.api.OphimClient
import com.movieweb.kmp.data.remote.dto.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.client.statement.*

class MovieRemoteDataSource {
    private val client = OphimClient.httpClient
    private val tmdbToken = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwZWFmN2NiN2FmMzBmYzA2MzMzMTc5NzcwOWYwM2Y3OSIsIm5iZiI6MTY5NDM5OTU0My43NTksInN1YiI6IjY0ZmU3YzM3ZTBjYTdmMDBjYmU5YjJmNSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.neCfOUwWVTvCaFB_Jyy4EH2gDRA5F7YeC7vdNINjj-A"

    suspend fun getNewlyUpdated(page: Int): RawNewlyUpdatedResponse {
        return client.get("danh-sach/phim-moi-cap-nhat") {
            parameter("page", page)
        }.body()
    }

    suspend fun getSingleMovies(page: Int): RawV1ListResponse {
        return client.get("v1/api/danh-sach/phim-le") {
            parameter("page", page)
        }.body()
    }

    suspend fun getSeriesMovies(page: Int): RawV1ListResponse {
        return client.get("v1/api/danh-sach/phim-bo") {
            parameter("page", page)
        }.body()
    }

    suspend fun getAnimatedMovies(page: Int): RawV1ListResponse {
        return client.get("v1/api/danh-sach/hoat-hinh") {
            parameter("page", page)
        }.body()
    }

    suspend fun getTvShows(page: Int): RawV1ListResponse {
        return client.get("v1/api/danh-sach/tv-shows") {
            parameter("page", page)
        }.body()
    }

    suspend fun getCinemaMovies(page: Int): RawV1ListResponse {
        return client.get("v1/api/danh-sach/phim-chieu-rap") {
            parameter("page", page)
        }.body()
    }

    suspend fun getMovieDetails(slug: String): RawDetailResponse {
        return client.get("phim/$slug").body()
    }

    suspend fun searchMovies(keyword: String, page: Int): RawV1ListResponse {
        return client.get("v1/api/tim-kiem") {
            parameter("keyword", keyword)
            parameter("page", page)
        }.body()
    }

    private fun HttpRequestBuilder.appendFilters(filters: Map<String, String>) {
        filters.forEach { (key, value) ->
            if (value.isNotEmpty()) {
                parameter(key, value)
            }
        }
    }

    suspend fun getMoviesByCategory(
        categorySlug: String,
        page: Int,
        filters: Map<String, String>
    ): RawV1ListResponse {
        return client.get("v1/api/the-loai/$categorySlug") {
            parameter("page", page)
            appendFilters(filters)
        }.body()
    }

    suspend fun getMoviesByCountry(
        countrySlug: String,
        page: Int,
        filters: Map<String, String>
    ): RawV1ListResponse {
        return client.get("v1/api/quoc-gia/$countrySlug") {
            parameter("page", page)
            appendFilters(filters)
        }.body()
    }

    suspend fun getMoviesByYear(
        year: String,
        page: Int,
        filters: Map<String, String>
    ): RawV1ListResponse {
        return client.get("v1/api/nam-phat-hanh/$year") {
            parameter("page", page)
            appendFilters(filters)
        }.body()
    }

    suspend fun getMoviesByList(
        listSlug: String,
        page: Int,
        filters: Map<String, String>
    ): RawV1ListResponse {
        return client.get("v1/api/danh-sach/$listSlug") {
            parameter("page", page)
            appendFilters(filters)
        }.body()
    }

    suspend fun getCategoryList(): RawFilterListResponse {
        return client.get("v1/api/the-loai").body()
    }

    suspend fun getCountryList(): RawFilterListResponse {
        return client.get("v1/api/quoc-gia").body()
    }

    suspend fun getYearList(): RawFilterListResponse {
        return client.get("v1/api/nam-phat-hanh").body()
    }

    // ---------- TMDB Resolve remote operations ----------
    suspend fun resolveTmdbMetadata(type: String, query: String, year: Int): TmdbSearchResponse {
        val searchUrl = "https://api.themoviedb.org/3/search/$type"
        return client.get(searchUrl) {
            url {
                parameters.append("query", query)
                parameters.append("year", year.toString())
            }
            headers {
                append("Authorization", "Bearer $tmdbToken")
            }
        }.body()
    }

    suspend fun getTmdbExternalIds(type: String, tmdbId: Long): TmdbExternalIds {
        val extUrl = "https://api.themoviedb.org/3/$type/$tmdbId/external_ids"
        return client.get(extUrl) {
            headers {
                append("Authorization", "Bearer $tmdbToken")
            }
        }.body()
    }

    // ---------- KKPhim API Extra Servers fetch ----------
    suspend fun fetchKkPhimServers(tmdbType: String, tmdbId: String): KkPhimResponse {
        val kkUrl = "https://phimapi.com/tmdb/$tmdbType/$tmdbId"
        return client.get(kkUrl).body()
    }
}
