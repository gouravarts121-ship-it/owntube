package app.owntube.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.PlaylistPlay
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.owntube.data.AppGraph
import app.owntube.data.HistoryItemDto
import app.owntube.data.PlaylistDetail
import app.owntube.data.PlaylistDto
import app.owntube.data.VideoDto
import app.owntube.ui.components.CompactVideoCard
import kotlinx.coroutines.launch

@Composable
fun LibraryScreen(
    onOpen: (String) -> Unit,
    onDownloads: () -> Unit,
) {
    val repository = AppGraph.repository
    val scope = rememberCoroutineScope()
    var history by remember { mutableStateOf<List<HistoryItemDto>>(emptyList()) }
    var watchLater by remember { mutableStateOf<List<VideoDto>>(emptyList()) }
    var playlists by remember { mutableStateOf<List<PlaylistDto>>(emptyList()) }
    var opened by remember { mutableStateOf<PlaylistDetail?>(null) }

    LaunchedEffect(Unit) {
        runCatching { repository.history() }.onSuccess { history = it }
        runCatching { repository.watchLater() }.onSuccess { watchLater = it }
        runCatching { repository.playlists() }.onSuccess { playlists = it }
    }

    val current = opened
    if (current != null) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 24.dp),
        ) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .clickable { opened = null }
                            .padding(6.dp),
                    ) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                    Column {
                        Text(
                            current.playlist?.name ?: "Playlist",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            "${current.items.size} videos",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            if (current.items.isEmpty()) {
                item {
                    Text(
                        "This playlist is empty. Save videos from the player screen.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }
            items(current.items, key = { it.id }) { video ->
                CompactVideoCard(video = video, onClick = { onOpen(video.id) })
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp),
    ) {
        item {
            Text(
                "You",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            )
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onDownloads)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Icon(Icons.Filled.Download, contentDescription = null)
                Text("Downloads", modifier = Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                Icon(Icons.Filled.ChevronRight, contentDescription = null)
            }
        }

        if (watchLater.isNotEmpty()) {
            item { SectionTitle("Watch later") }
            items(watchLater, key = { it.id }) { video ->
                CompactVideoCard(video = video, onClick = { onOpen(video.id) })
            }
        }

        if (playlists.isNotEmpty()) {
            item { SectionTitle("Playlists") }
            items(playlists, key = { it.id }) { playlist ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            scope.launch {
                                runCatching { repository.playlist(playlist.id) }
                                    .onSuccess { opened = it }
                            }
                        }
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(Icons.Filled.PlaylistPlay, contentDescription = null)
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            playlist.name,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            "${playlist.count} videos",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }

        item { SectionTitle("History") }

        if (history.isEmpty()) {
            item {
                Text(
                    "Videos you watch show up here.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
        }

        items(history, key = { it.video?.id ?: it.updatedAt }) { item ->
            val video = item.video
            if (video != null) {
                Column {
                    CompactVideoCard(video = video, onClick = { onOpen(video.id) })
                    if (item.positionMs > 0 && !item.completed) {
                        Text(
                            "Resume at ${formatDuration(item.positionMs)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(start = 16.dp, bottom = 6.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Column {
        HorizontalDivider(
            modifier = Modifier.padding(top = 8.dp),
            color = MaterialTheme.colorScheme.surfaceVariant,
        )
        Text(
            text,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.background)
                .padding(horizontal = 16.dp, vertical = 10.dp),
        )
    }
}
