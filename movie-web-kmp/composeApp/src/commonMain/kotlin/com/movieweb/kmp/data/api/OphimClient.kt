package com.movieweb.kmp.data.api

import io.ktor.client.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

object OphimClient {
    val jsonConfig = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        prettyPrint = true
        isLenient = true
    }

    val httpClient = HttpClient {
        install(ContentNegotiation) {
            json(jsonConfig)
        }
        
        defaultRequest {
            url("https://ophim1.com/")
            header("Content-Type", "application/json")
        }

        install(HttpTimeout) {
            requestTimeoutMillis = 15000
            connectTimeoutMillis = 15000
            socketTimeoutMillis = 15000
        }
    }
}
