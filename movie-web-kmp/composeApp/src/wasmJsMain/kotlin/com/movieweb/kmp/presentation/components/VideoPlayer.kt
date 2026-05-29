package com.movieweb.kmp.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.movieweb.kmp.domain.model.Movie
import kotlinx.browser.document
import org.w3c.dom.HTMLElement

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
    DisposableEffect(linkM3u8, linkEmbed) {
        val container = document.getElementById("video-container") as? HTMLElement
        val wrapper = document.getElementById("video-wrapper") as? HTMLElement
        
        if (container != null && wrapper != null) {
            val htmlContent = if (!linkEmbed.isNullOrEmpty()) {
                "<iframe src=\"$linkEmbed\" style=\"width:100%; height:100%; border:none;\" allow=\"autoplay; encrypted-media; fullscreen\" allowfullscreen></iframe>"
            } else if (!linkM3u8.isNullOrEmpty()) {
                "<video src=\"$linkM3u8\" controls style=\"width:100%; height:100%; background:black;\" poster=\"$poster\" autoplay></video>"
            } else {
                "<div style=\"color:gray; background:#1e1e1e; display:flex; justify-content:center; align-items:center; height:100%; font-family:sans-serif;\">Không có nguồn phát khả dụng</div>"
            }
            
            wrapper.innerHTML = htmlContent
            container.style.display = "flex"
        }
        
        onDispose {
            val container = document.getElementById("video-container") as? HTMLElement
            val wrapper = document.getElementById("video-wrapper") as? HTMLElement
            if (container != null && wrapper != null) {
                wrapper.innerHTML = ""
                container.style.display = "none"
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF1E1E1E)),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "Đang phát: ${title ?: ""}",
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Trình phát đã được mở trong lớp phủ. Hãy đóng lớp phủ khi xem xong.",
                color = Color.Gray,
                fontSize = 12.sp
            )
            Spacer(modifier = Modifier.height(16.dp))
            Box(
                modifier = Modifier
                    .background(Color(0xFFE50914), RoundedCornerShape(4.dp))
                    .clickable {
                        val container = document.getElementById("video-container") as? HTMLElement
                        if (container != null) {
                            container.style.display = "flex"
                        }
                    }
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Text("Mở Trình Phát Lại", color = Color.White, fontWeight = FontWeight.Bold)
            }
        }
    }
}
