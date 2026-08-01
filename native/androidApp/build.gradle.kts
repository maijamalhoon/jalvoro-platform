import com.android.build.api.artifact.SingleArtifact
import java.util.Properties
import org.gradle.api.tasks.Sync

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.kotlin.serialization)
}

fun loadProperties(path: String): Properties = Properties().apply {
    val file = rootProject.file(path)
    if (file.exists()) file.inputStream().use(::load)
}

val publicProperties = loadProperties("public.properties")
val localProperties = loadProperties("local.properties")

fun clientConfig(name: String): String =
    providers.gradleProperty(name).orNull
        ?: localProperties.getProperty(name)
        ?: publicProperties.getProperty(name)
        ?: ""

fun releaseSecret(name: String): String =
    providers.environmentVariable(name).orNull
        ?: providers.gradleProperty(name).orNull
        ?: localProperties.getProperty(name)
        ?: ""

val releaseStorePath = releaseSecret("JAMALS_ANDROID_KEYSTORE_PATH")
val releaseStorePassword = releaseSecret("JAMALS_ANDROID_STORE_PASSWORD")
val releaseKeyAlias = releaseSecret("JAMALS_ANDROID_KEY_ALIAS")
val releaseKeyPassword = releaseSecret("JAMALS_ANDROID_KEY_PASSWORD")
val releaseStoreFile = releaseStorePath.takeIf(String::isNotBlank)?.let(rootProject::file)
val releaseSigningReady = releaseStoreFile?.isFile == true &&
    releaseStorePassword.isNotBlank() &&
    releaseKeyAlias.isNotBlank() &&
    releaseKeyPassword.isNotBlank()

android {
    namespace = "com.jamalsfinance.nativeapp"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.jamalsfinance.app.native"
        minSdk = 23
        targetSdk = 36
        versionCode = 10
        versionName = "1.0.0-rc1"

        buildConfigField(
            "String",
            "SUPABASE_URL",
            "\"${clientConfig("JAMALS_SUPABASE_URL")}\"",
        )
        buildConfigField(
            "String",
            "SUPABASE_PUBLISHABLE_KEY",
            "\"${clientConfig("JAMALS_SUPABASE_PUBLISHABLE_KEY")}\"",
        )
        buildConfigField("boolean", "RELEASE_SIGNING_READY", releaseSigningReady.toString())
    }

    signingConfigs {
        if (releaseSigningReady) {
            create("release") {
                storeFile = releaseStoreFile
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        getByName("debug") {
            applicationIdSuffix = ".dev"
            versionNameSuffix = "-debug"
            resValue("string", "app_name", "JALVORO Personal Dev")
        }
        getByName("release") {
            applicationIdSuffix = ".rc"
            resValue("string", "app_name", "JALVORO Personal RC")
            isDebuggable = false
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            if (releaseSigningReady) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
        resValues = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        abortOnError = true
        checkReleaseBuilds = true
        warningsAsErrors = false
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

androidComponents {
    onVariants(selector().withBuildType("debug")) { variant ->
        tasks.register<Sync>("prepareDebugApkForCi") {
            group = "build"
            description = "Copies the AGP-produced debug APK into a deterministic CI directory."
            from(variant.artifacts.get(SingleArtifact.APK)) {
                include("**/*.apk")
            }
            into(layout.buildDirectory.dir("ci-artifacts/debug"))
        }
    }

    onVariants(selector().withBuildType("release")) { variant ->
        tasks.register<Sync>("prepareReleaseBundleForCi") {
            group = "build"
            description = "Copies the AGP-produced release bundle into a deterministic CI directory."
            from(variant.artifacts.get(SingleArtifact.BUNDLE))
            into(layout.buildDirectory.dir("ci-artifacts/release"))
        }
    }
}

dependencies {
    implementation(project(":shared"))
    implementation(libs.ktor.client.core)
    implementation(libs.ktor.client.okhttp)
    implementation(libs.kotlinx.serialization.json)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.animation)
    implementation(libs.compose.material3)
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.runtime.compose)
    debugImplementation(libs.compose.ui.tooling)
}
