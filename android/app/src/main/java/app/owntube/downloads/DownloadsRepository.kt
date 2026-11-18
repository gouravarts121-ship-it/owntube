package app.owntube.downloads

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.workDataOf
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.UUID

object DownloadsRepository {
    fun enqueue(context: Context, videoId: String, title: String): UUID {
        val request = OneTimeWorkRequestBuilder<DownloadWorker>()
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build(),
            )
            .setInputData(workDataOf(DownloadWorker.KEY_VIDEO_ID to videoId, DownloadWorker.KEY_TITLE to title))
            .addTag(DownloadWorker.TAG)
            .addTag("video:$videoId")
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            "dl-$videoId",
            ExistingWorkPolicy.KEEP,
            request,
        )
        return request.id
    }

    fun cancel(context: Context, videoId: String) {
        WorkManager.getInstance(context).cancelUniqueWork("dl-$videoId")
    }

    suspend fun list(context: Context): List<WorkInfo> = withContext(Dispatchers.IO) {
        WorkManager.getInstance(context).getWorkInfosByTag(DownloadWorker.TAG).get()
    }
}
