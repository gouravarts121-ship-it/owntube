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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
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
import androidx.compose.ui.unit.dp
import app.owntube.data.AppGraph
import app.owntube.data.ChannelDto
import app.owntube.data.VideoDto
import app.owntube.ui.components.ChannelAvatar
import app.owntube.ui.components.VideoCard
import kotlinx.coroutines.launch

@Composable
fun ChannelScreen(
    tag: String,
    onBack: () -> Unit,
    onOpen: (String) -> Unit,
) {
    val repository = AppGraph.repository
    val scope = rememberCoroutineScope()
    var videos by remember(tag) { mutableStateOf<List<VideoDto>>(emptyList()) }
    var channel by remember(tag) { mutableStateOf<ChannelDto?>(null) }
    var loading by remember(tag) { mutableStateOf(true) }
    var social by remember(tag) { mutableStateOf<app.owntube.data.SocialDto?>(null) }
    val name = channelName(listOf(tag))

    LaunchedEffect(tag) {
        loading = true
        runCatching { repository.feed(null, listOf(tag)) }
            .onSuccess { response ->
                videos = response.items.filter { it.tags.firstOrNull() == tag }
                val first = videos.firstOrNull()
                if (first != null) {
                    runCatching { repository.social(first.id) }.onSuccess { social = it }
                }
            }
        loading = false
    }

    LaunchedEffect(social) {
        social?.channel?.let { channel = it }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp),
    ) {
        item {
            Box(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(16.dp),
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        ChannelAvatar(name, size = 64)
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                name,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                buildString {
                                    append("${videos.size} videos")
                                    channel?.let { append("  •  ${formatViews(it.subscribers.toLong())} subscribers") }
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    val current = channel ?: ChannelDto(tag = tag, name = name)
                    FilledTonalButton(
                        onClick = {
                            scope.launch {
                                runCatching { repository.subscribe(tag, !current.subscribed) }
                                    .onSuccess { result ->
                                        channel = current.copy(
                                            subscribed = result.subscribed,
                                            subscribers = (current.subscribers + if (result.subscribed) 1 else -1)
                                                .coerceAtLeast(0),
                                        )
                                    }
                            }
                        },
                        modifier = Modifier.padding(top = 12.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = if (current.subscribed) {
                                MaterialTheme.colorScheme.surface
                            } else {
                                MaterialTheme.colorScheme.primary
                            },
                            contentColor = if (current.subscribed) {
                                MaterialTheme.colorScheme.onSurface
                            } else {
                                MaterialTheme.colorScheme.onPrimary
                            },
                        ),
                    ) {
                        Text(if (current.subscribed) "Subscribed" else "Subscribe")
                    }
                }
                Box(
                    modifier = Modifier
                        .padding(12.dp)
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surface)
                        .clickable(onClick = onBack)
                        .padding(8.dp),
                ) {
                    Icon(
                        Icons.Filled.ArrowBack,
                        contentDescription = "Back",
                        modifier = Modifier.fillMaxSize().padding(2.dp),
                    )
                }
            }
        }

        item {
            Text(
                "Videos",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
            )
        }

        if (loading) {
            item {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) { CircularProgressIndicator() }
            }
        }

        if (!loading && videos.isEmpty()) {
            item {
                Text(
                    "No videos on this channel yet.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
        }

        items(videos, key = { it.id }) { video ->
            VideoCard(video = video, onClick = { onOpen(video.id) })
        }

    }
}
