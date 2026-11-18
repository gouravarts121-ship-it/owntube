package app.owntube.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.work.WorkInfo
import app.owntube.downloads.DownloadWorker
import app.owntube.downloads.DownloadsRepository
import kotlinx.coroutines.delay

@Composable
fun DownloadsScreen() {
    val context = LocalContext.current
    var items by remember { mutableStateOf<List<WorkInfo>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        while (true) {
            items = runCatching { DownloadsRepository.list(context) }.getOrDefault(emptyList())
                .sortedByDescending { it.id }
            loading = false
            delay(1000)
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Downloads", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(
            "Saved to Download/OwnTube on this device.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
        )

        if (loading) {
            Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (items.isEmpty()) {
            Text("No downloads yet. Tap the download icon while watching a video.")
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(items, key = { it.id }) { info ->
                    val videoId = info.tags.firstOrNull { it.startsWith("video:") }?.removePrefix("video:")
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(videoId ?: info.id.toString(), style = MaterialTheme.typography.bodyMedium)
                        val progress = info.progress.getInt(DownloadWorker.KEY_PROGRESS, -1)
                        when (info.state) {
                            WorkInfo.State.RUNNING -> {
                                if (progress >= 0) {
                                    LinearProgressIndicator(
                                        progress = { progress / 100f },
                                        modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                                    )
                                } else {
                                    LinearProgressIndicator(modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
                                }
                                Text("$progress%", style = MaterialTheme.typography.bodySmall)
                            }
                            WorkInfo.State.ENQUEUED -> Text("Waiting for network…")
                            WorkInfo.State.SUCCEEDED -> Text("Saved", color = MaterialTheme.colorScheme.secondary)
                            WorkInfo.State.FAILED -> Text("Failed", color = MaterialTheme.colorScheme.error)
                            WorkInfo.State.CANCELLED -> Text("Cancelled")
                            else -> Text(info.state.name.lowercase())
                        }
                        if (videoId != null && info.state == WorkInfo.State.RUNNING) {
                            TextButton(onClick = { DownloadsRepository.cancel(context, videoId) }) {
                                Text("Cancel")
                            }
                        }
                    }
                }
            }
        }
    }
}
