plugins {
    // Kotlin plugin
    kotlin("multiplatform") version "2.0.21" apply false
    // Android application Gradle plugin
    id("com.android.application") version "8.5.2" apply false
    // Compose Multiplatform plugin
    id("org.jetbrains.compose") version "1.7.0" apply false
    // Kotlin Compose Compiler compiler plugin (needed for Compose with Kotlin 2.x)
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
    // Kotlin Serialization
    kotlin("plugin.serialization") version "2.0.21" apply false
}
