package app.owntube.analytics

import android.content.Context
import android.os.Bundle
import com.facebook.FacebookSdk
import com.facebook.appevents.AppEventsLogger
import com.google.firebase.analytics.FirebaseAnalytics

object Analytics {
    private var firebase: FirebaseAnalytics? = null
    private var facebook: AppEventsLogger? = null
    private var enabled = false

    fun init(context: Context) {
        firebase = runCatching { FirebaseAnalytics.getInstance(context) }.getOrNull()
        facebook = runCatching {
            FacebookSdk.sdkInitialize(context)
            FacebookSdk.setAutoLogAppEventsEnabled(true)
            AppEventsLogger.newLogger(context)
        }.getOrNull()
        enabled = firebase != null || facebook != null
    }

    fun screen(name: String) {
        if (!enabled) return
        runCatching {
            firebase?.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, Bundle().apply {
                putString(FirebaseAnalytics.Param.SCREEN_NAME, name)
            })
            facebook?.logEvent("screen_view")
        }
    }

    fun event(name: String, params: Map<String, Any?> = emptyMap()) {
        if (!enabled) return
        runCatching {
            val bundle = Bundle().apply {
                params.forEach { (key, value) ->
                    when (value) {
                        is Int -> putInt(key, value)
                        is Long -> putLong(key, value)
                        is Double -> putDouble(key, value)
                        is String -> putString(key, value)
                        is Boolean -> putString(key, value.toString())
                    }
                }
            }
            firebase?.logEvent(name, bundle)
            facebook?.logEvent(name, bundle)
        }
    }

    fun playback(videoId: String, positionMs: Long, durationMs: Long) {
        event("video_progress", mapOf(
            "video_id" to videoId,
            "position_ms" to positionMs,
            "duration_ms" to durationMs,
        ))
    }
}
