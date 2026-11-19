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
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.owntube.data.AppGraph
import app.owntube.data.ChannelInfoDto
import coil.compose.AsyncImage
import kotlinx.coroutines.launch

@Composable
fun YouTubeChannelScreen(
    input: String,
    onBack: () -> Unit,
    onOpen: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    val info = remember(input) { mutableStateOf<ChannelInfoDto?>(null) }
    val loading = remember(input) { mutableStateOf(true) }
    val importing = remember(input) { mutableStateOf(false) }

    LaunchedEffect(input) {
        runCatching { AppGraph.repository.youtubeChannel(input) }
            .onSuccess { info.value = it }
        loading.value = false
    }

    if (loading.value) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        return
    }

    val channel = info.value
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp),
    ) {
        item {
            Box(modifier = Modifier.fillMaxWidth()) {
                if (!channel?.banner.isNullOrBlank()) {
                    AsyncImage(
                        model = channel?.banner,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxWidth().height(120.dp),
                    )
                } else {
                    Box(Modifier.fillMaxWidth().height(120.dp).background(MaterialTheme.colorScheme.surfaceVariant))
                }
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(8.dp)
                        .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.7f), CircleShape),
                ) {
                    Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                }
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (!channel?.avatar.isNullOrBlank()) {
                        AsyncImage(
                            model = channel?.avatar,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.size(64.dp).clip(CircleShape),
                        )
                    }
                    Column {
                        Text(
                            channel?.name?.takeIf { it.isNotBlank() } ?: input,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                        if ((channel?.followers ?: 0) > 0) {
                            Text(
                                "${formatViews(channel?.followers ?: 0).removeSuffix(" views")} subscribers",
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                }
            }
        }
        items(channel?.videos.orEmpty(), key = { it.youtubeId }) { video ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = !importing.value) {
                        importing.value = true
                        scope.launch {
                            runCatching { AppGraph.repository.importYoutube(video.url) }
                                .onSuccess { onOpen(it.id) }
                            importing.value = false
                        }
                    }
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                AsyncImage(
                    model = video.thumb,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(120.dp, 68.dp).clip(MaterialTheme.shapes.small),
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(video.title, style = MaterialTheme.typography.bodyMedium, maxLines = 2)
                    Text(
                        listOfNotNull(video.channel.ifBlank { null }, if (video.durationMs > 0) formatDuration(video.durationMs) else null)
                            .joinToString(" · "),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
