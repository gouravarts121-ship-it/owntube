package app.owntube.downloads

import android.app.Notification
import android.content.ContentValues
import android.content.Context
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import app.owntube.OwnTubeApp
import app.owntube.R
import app.owntube.analytics.Analytics
import app.owntube.data.AppGraph
import app.owntube.data.Endpoints
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.File
import java.io.InputStream

class DownloadWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val videoId = inputData.getString(KEY_VIDEO_ID) ?: return@withContext Result.failure()
        val title = inputData.getString(KEY_TITLE) ?: videoId
        AppGraph.init(applicationContext)
        AppGraph.api.ensureSession()

        setForeground(foregroundInfo(0, -1, title))

        val link = AppGraph.repository.downloadLink(videoId)
        val request = Request.Builder().url(Endpoints.absolute(link.url)).build()

        AppGraph.api.httpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext Result.failure()
            val body = response.body ?: return@withContext Result.failure()
            val total = body.contentLength()
            body.byteStream().use { stream ->
                saveStream(stream, total, link.filename, title)
            }
        }
        Analytics.event("video_download", mapOf("video_id" to videoId))
        Result.success()
    }

    private suspend fun saveStream(stream: InputStream, total: Long, filename: String, title: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, filename)
                put(MediaStore.Downloads.MIME_TYPE, "video/mp4")
                put(MediaStore.Downloads.RELATIVE_PATH, "${Environment.DIRECTORY_DOWNLOADS}/OwnTube")
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val resolver = applicationContext.contentResolver
            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: return
            resolver.openOutputStream(uri)?.use { out ->
                copyWithProgress(stream, out, total, title)
            }
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
        } else {
            val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "OwnTube")
            dir.mkdirs()
            val file = File(dir, filename)
            file.outputStream().use { out ->
                copyWithProgress(stream, out, total, title)
            }
        }
    }

    private suspend fun copyWithProgress(stream: InputStream, out: java.io.OutputStream, total: Long, title: String) {
        val buffer = ByteArray(64 * 1024)
        var written = 0L
        while (true) {
            val read = stream.read(buffer)
            if (read <= 0) break
            out.write(buffer, 0, read)
            written += read
            if (total > 0) {
                val percent = ((written * 100) / total).toInt().coerceIn(0, 100)
                setProgress(workDataOf(KEY_PROGRESS to percent))
                setForegroundAsync(foregroundInfo(percent, total, title))
            }
        }
    }

    private fun foregroundInfo(percent: Int, total: Long, title: String): ForegroundInfo {
        val notification: Notification = NotificationCompat.Builder(applicationContext, OwnTubeApp.CHANNEL_DOWNLOADS)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle(title)
            .setContentText(if (total > 0) "$percent%" else "Starting download")
            .setOngoing(true)
            .setProgress(100, percent, total <= 0)
            .build()
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ForegroundInfo(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            ForegroundInfo(NOTIFICATION_ID, notification)
        }
    }

    companion object {
        const val KEY_VIDEO_ID = "videoId"
        const val KEY_TITLE = "title"
        const val KEY_PROGRESS = "progress"
        private const val NOTIFICATION_ID = 4201
        const val TAG = "download"
    }
}
