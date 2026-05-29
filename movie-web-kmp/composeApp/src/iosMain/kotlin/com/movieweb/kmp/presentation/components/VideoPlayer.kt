package com.movieweb.kmp.presentation.components

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.interop.UIKitView
import com.movieweb.kmp.domain.model.Movie
import platform.AVFoundation.*
import platform.AVKit.*
import platform.CoreGraphics.CGRectZero
import platform.Foundation.NSURL
import platform.UIKit.*
import platform.WebKit.WKWebView
import platform.WebKit.WKWebViewConfiguration

@Composable
actual fun VideoPlayer(
    modifier: Modifier,
    linkM3u8: String?,
    linkEmbed: String?,
    title: String?,
    poster: String?,
    movieSlug: String?,
    episodeSlug: String?,
    movie: Movie?,
    onNextEpisode: (() -> Unit)?
) {
    if (!linkM3u8.isNullOrEmpty()) {
        val nsUrl = NSURL.URLWithString(linkM3u8) ?: return
        val player = remember { AVPlayer(uRL = nsUrl) }
        val playerViewController = remember {
            AVPlayerViewController().apply {
                this.player = player
                this.showsPlaybackControls = true
            }
        }

        DisposableEffect(player) {
            player.play()
            onDispose {
                player.pause()
            }
        }

        UIKitView(
            factory = {
                playerViewController.view
            },
            modifier = modifier.fillMaxSize()
        )
    } else if (!linkEmbed.isNullOrEmpty()) {
        // Render Embed URL using WKWebView on iOS
        val nsUrl = NSURL.URLWithString(linkEmbed) ?: return
        val webView = remember {
            val config = WKWebViewConfiguration().apply {
                allowsInlineMediaPlayback = true
                mediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypeNone
            }
            WKWebView(frame = CGRectZero, configuration = config).apply {
                val request = platform.Foundation.NSURLRequest.requestWithURL(nsUrl)
                loadRequest(request)
            }
        }

        UIKitView(
            factory = {
                webView
            },
            modifier = modifier.fillMaxSize()
        )
    }
}
