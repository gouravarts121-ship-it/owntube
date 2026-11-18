package app.owntube

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import app.owntube.analytics.Analytics
import app.owntube.data.AppGraph
import com.tencent.mmkv.MMKV

class OwnTubeApp : Application() {
    override fun onCreate() {
        super.onCreate()
        MMKV.initialize(this)
        AppGraph.init(this)
        Analytics.init(this)
        createChannels()
    }

    private fun createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_DOWNLOADS, "Downloads", NotificationManager.IMPORTANCE_LOW),
        )
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_PLAYBACK, "Playback", NotificationManager.IMPORTANCE_LOW),
        )
    }

    companion object {
        const val CHANNEL_DOWNLOADS = "downloads"
        const val CHANNEL_PLAYBACK = "playback"
    }
}
