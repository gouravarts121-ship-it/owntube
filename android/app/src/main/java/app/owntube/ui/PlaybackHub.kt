package app.owntube.ui

import android.net.Uri
import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
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
import java.io.File

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

    var preparing by mutableStateOf(false)
        private set

    var playbackError by mutableStateOf<String?>(null)
        private set

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var ticker: Job? = null
    private var listener: Player.Listener? = null
    private var lastSavedAt = 0L
    private var fallbackUri: String? = null
    private var fallbackUsed = false
    private var prepareJob: Job? = null

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

            override fun onPlayerError(error: PlaybackException) {
                val fallback = fallbackUri
                if (!fallbackUsed && fallback != null) {
                    fallbackUsed = true
                    playbackError = null
                    controller?.setMediaItem(MediaItem.fromUri(fallback))
                    controller?.prepare()
                    controller?.play()
                    return
                }
                val video = currentVideo
                if (video != null && !video.hls.isBlank() && video.source == "local") {
                    playbackError = error.message ?: "Playback failed"
                    return
                }
                if (video != null && (video.source != "local" || video.externalUrl.isNotBlank())) {
                    prepareOnline(video)
                    return
                }
                playbackError = error.message ?: "Playback failed"
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

    suspend fun play(video: VideoDto, startPositionMs: Long = 0L) {
        prepareJob?.cancel()
        preparing = false
        playbackError = null
        fallbackUsed = false
        currentVideo = video
        positionMs = startPositionMs.coerceAtLeast(0)
        durationMs = video.durationMs
        val local = offlineUri(video.id)
        val mp4 = video.mp4.takeIf { it.isNotBlank() }?.let { Endpoints.absolute(it) }
        val primary: String
        if (local != null) {
            primary = local
            fallbackUri = null
        } else if (video.hls.isNotBlank()) {
            primary = Endpoints.absolute(video.hls)
            fallbackUri = mp4
        } else if (video.source != "local" || video.externalUrl.isNotBlank()) {
            primary = Endpoints.absolute("api/stream/${video.id}")
            fallbackUri = mp4
        } else {
            primary = Endpoints.absolute(video.hls)
            fallbackUri = mp4
        }
        Analytics.event(
            "video_open",
            mapOf("video_id" to video.id, "mode" to if (local != null) "offline" else "online"),
        )
        val c = controller ?: return
        c.setMediaItem(MediaItem.fromUri(primary))
        c.prepare()
        if (startPositionMs > 5_000) c.seekTo(startPositionMs)
        c.play()
    }

    private fun prepareOnline(video: VideoDto) {
        prepareJob?.cancel()
        preparing = true
        playbackError = null
        fallbackUri = null
        fallbackUsed = true
        prepareJob = scope.launch {
            runCatching {
                AppGraph.repository.startPrepare(video.id)
                var attempts = 0
                var ready = false
                while (attempts < 240) {
                    delay(1500)
                    val state = AppGraph.repository.prepareState(video.id)
                    if (state.state == "error") {
                        throw IllegalStateException(state.error ?: "preparation failed")
                    }
                    if (state.ready) {
                        ready = true
                        break
                    }
                    attempts += 1
                }
                if (!ready) throw IllegalStateException("preparation timed out")
                preparing = false
                val c = controller ?: return@runCatching
                c.setMediaItem(MediaItem.fromUri(Endpoints.absolute("media/mp4/${video.id}.mp4")))
                c.prepare()
                c.play()
            }.onFailure { error ->
                preparing = false
                playbackError = error.message ?: "Could not load this video"
            }
        }
    }

    suspend fun resume(video: VideoDto) {
        currentVideo = video
        val c = controller ?: return
        if (c.currentMediaItem == null) {
            play(video)
        } else {
            c.play()
        }
    }

    private suspend fun offlineUri(videoId: String): String? {
        val stored = AppGraph.repository.offlineUri(videoId) ?: return null
        return runCatching {
            val uri = Uri.parse(stored)
            when (uri.scheme) {
                "content" ->
                    AppGraph.context.contentResolver.openAssetFileDescriptor(uri, "r")?.use { stored }
                "file" -> if (File(uri.path ?: "").exists()) stored else null
                else -> null
            }
        }.getOrNull()
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
        prepareJob?.cancel()
        prepareJob = null
        preparing = false
        playbackError = null
        fallbackUri = null
        fallbackUsed = false
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
