package com.movieweb.kmp

import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.window.CanvasBasedWindow

@OptIn(ExperimentalComposeUiApi::class)
fun main() {
    CanvasBasedWindow(title = "Movie Web KMP", canvasElementId = "ComposeApp") {
        App()
    }
}
