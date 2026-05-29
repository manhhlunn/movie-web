package com.movieweb.kmp.domain.usecase

import com.movieweb.kmp.domain.model.StreamInfo

class GetStreamLinkUseCase(private val getMovieDetailsUseCase: GetMovieDetailsUseCase) {
    suspend operator fun invoke(slug: String, episodeSlug: String): StreamInfo? {
        val movie = getMovieDetailsUseCase(slug) ?: return null
        val servers = movie.servers ?: return null

        for (server in servers) {
            val episode = server.episodes.find { it.slug == episodeSlug }
            if (episode != null) {
                return StreamInfo(
                    linkM3u8 = episode.linkM3u8,
                    linkEmbed = episode.linkEmbed,
                    episodeName = episode.name.ifEmpty { episode.filename },
                    movieName = movie.name,
                    movie = movie
                )
            }
        }
        return null
    }
}
