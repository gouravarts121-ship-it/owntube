package app.owntube.data

import android.content.Context
import app.owntube.BuildConfig
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

private fun safeBaseUrl(raw: String): String {
    val text = raw.trim()
    val withScheme = when {
        text.isEmpty() -> "http://127.0.0.1:8787"
        text.startsWith("http://") || text.startsWith("https://") -> text
        else -> "http://$text"
    }
    return withScheme.trimEnd('/') + "/"
}

class ApiClient(context: Context, private val sessionStore: SessionStore) {
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val builder = chain.request().newBuilder()
                .header("Accept", "application/json")
            sessionStore.token?.let { builder.header("Authorization", "Bearer $it") }
            chain.proceed(builder.build())
        }
        .apply {
            if (BuildConfig.DEBUG) {
                addInterceptor(HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BASIC
                })
            }
        }
        .build()

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    val service: ApiService = Retrofit.Builder()
        .baseUrl(safeBaseUrl(BuildConfig.API_BASE_URL))
        .client(client)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()
        .create(ApiService::class.java)

    val httpClient: OkHttpClient get() = client

    suspend fun ensureSession(): String {
        sessionStore.token?.let { return it }
        val session = service.session()
        sessionStore.save(session)
        return session.token
    }
}
