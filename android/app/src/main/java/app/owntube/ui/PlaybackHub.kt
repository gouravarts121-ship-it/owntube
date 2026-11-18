package app.owntube.ui

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import app.owntube.analytics.Analytics
import app.owntube.data.AppGraph
import app.owntube.data.Endpoints
import app.owntube.data.VideoDto
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

object PlaybackHub {
    var controller by mutableStateOf<MediaController?>(null)
        private set

    var currentVideo by mutableStateOf<VideoDto?>(null)
        private set

    var isPlaying by mutableStateOf(false)
        private set

    var positionMs by mutableStateOf(0L)
        private set

    var durationMs by mutableStateOf(0L)
        private set

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var ticker: Job? = null
    private var listener: Player.Listener? = null
    private var lastSavedAt = 0L

    fun attach(mediaController: MediaController) {
        controller = mediaController
        val l = object : Player.Listener {
            override fun onIsPlayingChanged(playing: Boolean) {
                isPlaying = playing
                if (!playing) savePosition()
            }

            override fun onPlaybackStateChanged(state: Int) {
                durationMs = mediaController.duration.coerceAtLeast(0)
                if (state == Player.STATE_ENDED) {
                    savePosition(completed = true)
                }
            }
        }
        listener = l
        mediaController.addListener(l)
        ticker?.cancel()
        ticker = scope.launch {
            while (true) {
                positionMs = mediaController.currentPosition.coerceAtLeast(0)
                durationMs = mediaController.duration.coerceAtLeast(0)
                val id = currentVideo?.id
                if (id != null && mediaController.isPlaying) {
                    val now = System.currentTimeMillis()
                    if (now - lastSavedAt > 10_000) {
                        lastSavedAt = now
                        savePosition()
                    }
                }
                delay(500)
            }
        }
    }

    fun detach() {
        ticker?.cancel()
        ticker = null
        listener?.let { controller?.removeListener(it) }
        listener = null
        savePosition()
        controller = null
    }

    fun play(video: VideoDto, startPositionMs: Long = 0L) {
        currentVideo = video
        positionMs = startPositionMs.coerceAtLeast(0)
        durationMs = video.durationMs
        Analytics.event("video_open", mapOf("video_id" to video.id))
        val c = controller ?: return
        c.setMediaItem(MediaItem.fromUri(Endpoints.absolute(video.hls)))
        c.prepare()
        if (startPositionMs > 5_000) c.seekTo(startPositionMs)
        c.play()
    }

    fun resume(video: VideoDto) {
        currentVideo = video
        val c = controller ?: return
        if (c.currentMediaItem == null) {
            play(video)
        } else {
            c.play()
        }
    }

    fun togglePlayPause() {
        val c = controller ?: return
        if (c.isPlaying) c.pause() else c.play()
    }

    fun seekTo(ms: Long) {
        controller?.seekTo(ms.coerceAtLeast(0))
    }

    fun stop() {
        savePosition()
        controller?.stop()
        controller?.clearMediaItems()
        currentVideo = null
        isPlaying = false
        positionMs = 0
    }

    private fun savePosition(completed: Boolean = false) {
        val id = currentVideo?.id ?: return
        val c = controller ?: return
        val position = c.currentPosition
        val duration = c.duration
        val done = completed || (duration > 0 && position >= duration - 3_000)
        val snapshot = position
        scope.launch {
            runCatching {
                AppGraph.repository.savePosition(id, snapshot.coerceAtLeast(0), done)
            }.onFailure { Log.w("PlaybackHub", "history save failed", it) }
        }
    }
}
