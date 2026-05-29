package com.movieweb.kmp.presentation.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.movieweb.kmp.domain.model.Movie

@Composable
expect fun VideoPlayer(
    modifier: Modifier,
    linkM3u8: String?,
    linkEmbed: String?,
    title: String?,
    poster: String?,
    movieSlug: String?,
    episodeSlug: String?,
    movie: Movie?,
    onNextEpisode: (() -> Unit)?
)
