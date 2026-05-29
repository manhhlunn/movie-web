package com.movieweb.kmp.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class RawCategory(
    val id: String? = null,
    val name: String? = null,
    val slug: String? = null
)

@Serializable
data class RawCountry(
    val id: String? = null,
    val name: String? = null,
    val slug: String? = null
)

@Serializable
data class RawEpisode(
    val name: String? = null,
    val slug: String? = null,
    val filename: String? = null,
    @SerialName("link_embed") val linkEmbed: String? = null,
    @SerialName("link_m3u8") val linkM3u8: String? = null
)

@Serializable
data class RawServer(
    @SerialName("server_name") val serverName: String? = null,
    @SerialName("server_data") val serverData: List<RawEpisode>? = null
)

@Serializable
data class RawTmdb(
    val type: String? = null,
    val id: String? = null,
    val season: Int? = null,
    @SerialName("vote_average") val voteAverage: Double? = null,
    @SerialName("vote_count") val voteCount: Int? = null
)

@Serializable
data class RawImdb(
    val id: String? = null,
    @SerialName("vote_average") val voteAverage: Double? = null,
    @SerialName("vote_count") val voteCount: Int? = null
)

@Serializable
data class RawModified(
    val time: String? = null
)

@Serializable
data class RawMovie(
    @SerialName("_id") val id: String? = null,
    val name: String? = null,
    val slug: String? = null,
    @SerialName("origin_name") val originName: String? = null,
    val type: String? = null,
    @SerialName("poster_url") val posterUrl: String? = null,
    @SerialName("thumb_url") val thumbUrl: String? = null,
    val year: Int? = null,
    val quality: String? = null,
    val lang: String? = null,
    @SerialName("episode_current") val episodeCurrent: String? = null,
    @SerialName("episode_total") val episodeTotal: String? = null,
    val time: String? = null,
    val content: String? = null,
    val description: String? = null,
    val category: List<RawCategory>? = null,
    val country: List<RawCountry>? = null,
    val actor: List<String>? = null,
    val director: List<String>? = null,
    val tmdb: RawTmdb? = null,
    val imdb: RawImdb? = null,
    @SerialName("trailer_url") val trailerUrl: String? = null,
    val modified: RawModified? = null
)

@Serializable
data class RawPagination(
    val totalItems: Int? = null,
    val totalItemsPerPage: Int? = null,
    val currentPage: Int? = null,
    val totalPages: Int? = null
)

@Serializable
data class RawNewlyUpdatedResponse(
    val pathImage: String? = null,
    val items: List<RawMovie>? = null,
    val pagination: RawPagination? = null
)

@Serializable
data class RawV1Params(
    val pagination: RawPagination? = null
)

@Serializable
data class RawV1Data(
    val APP_DOMAIN_CDN_IMAGE: String? = null,
    val items: List<RawMovie>? = null,
    val params: RawV1Params? = null
)

@Serializable
data class RawV1ListResponse(
    val status: String? = null,
    val message: String? = null,
    val data: RawV1Data? = null
)

@Serializable
data class RawFilterItem(
    val id: String? = null,
    @SerialName("_id") val idAlt: String? = null,
    val name: String? = null,
    val slug: String? = null,
    val year: Int? = null
)

@Serializable
data class RawFilterListResponse(
    val status: String? = null,
    val data: RawFilterListData? = null
)

@Serializable
data class RawFilterListData(
    val items: List<RawFilterItem>? = null
)

@Serializable
data class RawDetailResponse(
    val status: Boolean? = null,
    val msg: String? = null,
    val movie: RawMovie? = null,
    val episodes: List<RawServer>? = null,
    val pathImage: String? = null
)

// ---------- TMDB / KKPhim DTOs ----------
@Serializable
data class TmdbSearchResultItem(
    val id: Long,
    @SerialName("vote_average") val voteAverage: Double? = null,
    @SerialName("vote_count") val voteCount: Int? = null
)

@Serializable
data class TmdbSearchResponse(
    val results: List<TmdbSearchResultItem>? = null
)

@Serializable
data class TmdbExternalIds(
    @SerialName("imdb_id") val imdbId: String? = null
)

@Serializable
data class KkPhimEpisode(
    val name: String? = null,
    val slug: String? = null,
    val filename: String? = null,
    @SerialName("link_embed") val linkEmbed: String? = null,
    @SerialName("link_m3u8") val linkM3u8: String? = null
)

@Serializable
data class KkPhimServer(
    @SerialName("server_name") val serverName: String? = null,
    @SerialName("server_data") val serverData: List<KkPhimEpisode>? = null
)

@Serializable
data class KkPhimResponse(
    val episodes: List<KkPhimServer>? = null
)
