package com.movieweb.kmp.data.mapper

import com.movieweb.kmp.data.remote.dto.*
import com.movieweb.kmp.domain.model.*
import kotlin.math.ceil

private const val DEFAULT_CDN = "https://img.ophim.live/uploads/movies"

fun RawCategory.toDomain(): Category = Category(
    id = id ?: "",
    name = name ?: "",
    slug = slug ?: ""
)

fun RawCountry.toDomain(): Country = Country(
    id = id ?: "",
    name = name ?: "",
    slug = slug ?: ""
)

fun RawEpisode.toDomain(): Episode = Episode(
    name = name ?: filename ?: "",
    slug = slug ?: "",
    filename = filename ?: "",
    linkEmbed = linkEmbed ?: "",
    linkM3u8 = linkM3u8 ?: ""
)

fun RawServer.toDomain(): ServerData = ServerData(
    serverName = serverName ?: "",
    episodes = serverData?.map { it.toDomain() } ?: emptyList()
)

fun RawMovie.toDomain(cdn: String = DEFAULT_CDN): Movie {
    val cleanCdn = cdn.trimEnd('/')
    val resolvedPoster = posterUrl?.let {
        if (it.startsWith("http")) it else "$cleanCdn/$it"
    } ?: ""
    val resolvedThumb = thumbUrl?.let {
        if (it.startsWith("http")) it else "$cleanCdn/$it"
    } ?: ""

    return Movie(
        id = id ?: "",
        name = name ?: "",
        slug = slug ?: "",
        originName = originName ?: "",
        type = type ?: "single",
        posterUrl = resolvedPoster,
        thumbUrl = resolvedThumb,
        year = year ?: 0,
        quality = quality ?: "HD",
        lang = lang ?: "Vietsub",
        episodeCurrent = episodeCurrent ?: "",
        episodeTotal = episodeTotal ?: "",
        time = time ?: "",
        description = content ?: description ?: "",
        categories = category?.map { it.toDomain() } ?: emptyList(),
        countries = country?.map { it.toDomain() } ?: emptyList(),
        actors = actor ?: emptyList(),
        directors = director ?: emptyList(),
        tmdbVoteAverage = tmdb?.voteAverage ?: 0.0,
        imdbRating = imdb?.voteAverage ?: 0.0,
        imdbId = imdb?.id ?: "",
        imdbVoteCount = imdb?.voteCount ?: 0,
        tmdb = tmdb?.let {
            TmdbConfig(
                type = it.type ?: "",
                id = it.id ?: "",
                season = it.season,
                voteAverage = it.voteAverage,
                voteCount = it.voteCount
            )
        },
        trailerUrl = trailerUrl,
        modifiedTime = modified?.time
    )
}

fun RawNewlyUpdatedResponse.toDomain(): MovieListResult {
    val cdn = pathImage ?: DEFAULT_CDN
    return MovieListResult(
        items = items?.map { it.toDomain(cdn) } ?: emptyList(),
        totalItems = pagination?.totalItems ?: 0,
        totalItemsPerPage = pagination?.totalItemsPerPage ?: 24,
        currentPage = pagination?.currentPage ?: 1,
        totalPages = pagination?.totalPages ?: 1,
        cdnImageDomain = cdn
    )
}

fun RawV1ListResponse.toDomain(): MovieListResult {
    val cdn = data?.APP_DOMAIN_CDN_IMAGE?.let { "$it/uploads/movies" } ?: DEFAULT_CDN
    val pagination = data?.params?.pagination
    val totalItems = pagination?.totalItems ?: 0
    val perPage = pagination?.totalItemsPerPage ?: 24
    val current = pagination?.currentPage ?: 1
    val calculatedPages = if (perPage > 0) ceil(totalItems.toDouble() / perPage).toInt() else 1
    
    return MovieListResult(
        items = data?.items?.map { it.toDomain(cdn) } ?: emptyList(),
        totalItems = totalItems,
        totalItemsPerPage = perPage,
        currentPage = current,
        totalPages = if (pagination?.totalPages != null && pagination.totalPages > 0) pagination.totalPages else calculatedPages,
        cdnImageDomain = cdn
    )
}

fun KkPhimEpisode.toDomain(): Episode = Episode(
    name = name ?: filename ?: "",
    slug = slug ?: "",
    filename = filename ?: "",
    linkEmbed = linkEmbed ?: "",
    linkM3u8 = linkM3u8 ?: ""
)

fun KkPhimServer.toDomain(): ServerData = ServerData(
    serverName = serverName ?: "Nguồn Phụ",
    episodes = serverData?.map { it.toDomain() } ?: emptyList()
)
