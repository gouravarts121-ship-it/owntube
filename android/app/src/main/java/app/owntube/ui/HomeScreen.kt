package app.owntube.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.foundation.clickable
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.paging.LoadState
import androidx.paging.compose.collectAsLazyPagingItems
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState
import coil.compose.AsyncImage
import app.owntube.data.AppGraph
import app.owntube.data.RemoteVideoDto
import app.owntube.ui.components.VideoCard
import app.owntube.ui.components.VideoCardSkeleton
import app.owntube.ui.theme.YouTubeRed
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(
    onOpen: (String) -> Unit,
    onSearch: () -> Unit,
    onDiscover: () -> Unit,
    viewModel: FeedViewModel = viewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val videos = viewModel.feed.collectAsLazyPagingItems()

    Column(modifier = Modifier.fillMaxSize()) {
        HomeTopBar(onSearch = onSearch)

        LazyRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
        ) {
            item {
                Pill(label = "All", selected = state.selected.isEmpty(), onClick = { viewModel.clearFilters() })
            }
            items(state.tags, key = { it.tag }) { tag ->
                Pill(
                    label = tag.tag.replaceFirstChar { it.uppercase() },
                    selected = tag.tag in state.selected,
                    onClick = { viewModel.toggleTag(tag.tag) },
                )
            }
            item {
                Pill(label = "Discover", selected = false, onClick = onDiscover)
            }
        }

        HomeTrending(onOpen = onOpen)

        val refreshing = videos.loadState.refresh is LoadState.Loading
        SwipeRefresh(
            state = rememberSwipeRefreshState(isRefreshing = state.loading || refreshing),
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.weight(1f),
        ) {
            if (state.loading || (refreshing && videos.itemCount == 0)) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(18.dp),
                    contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 4.dp),
                ) {
                    items(4) { index ->
                        VideoCardSkeleton(modifier = Modifier.animateItem())
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(18.dp),
                    contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 4.dp, bottom = 24.dp),
                ) {
                    items(
                        count = videos.itemCount,
                        key = { index -> videos.peek(index)?.id ?: "ph-$index" },
                    ) { index ->
                        videos[index]?.let { video ->
                            VideoCard(video = video, onClick = { onOpen(video.id) }, modifier = Modifier.animateItem())
                        }
                    }
                    if (videos.loadState.append is LoadState.Loading) {
                        item { VideoCardSkeleton(modifier = Modifier.padding(vertical = 8.dp)) }
                    }
                    if (videos.loadState.refresh is LoadState.Error && videos.itemCount == 0) {
                        item {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    "Can't reach the server.",
                                    color = MaterialTheme.colorScheme.error,
                                )
                                Text(
                                    "Tried ${app.owntube.BuildConfig.API_BASE_URL} — start the server or rebuild with the right API_BASE_URL.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(top = 4.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeTopBar(onSearch: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .background(YouTubeRed)
                .padding(horizontal = 6.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("▶", color = Color.White, fontSize = 12.sp)
        }
        Spacer(Modifier.width(8.dp))
        Text(
            "OwnTube",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.5).sp,
        )
        Spacer(Modifier.weight(1f))
        IconButton(onClick = onSearch) {
            Icon(Icons.Filled.Search, contentDescription = "Search", modifier = Modifier.size(26.dp))
        }
    }
}

@Composable
private fun HomeTrending(onOpen: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var items by remember { mutableStateOf<List<RemoteVideoDto>>(emptyList()) }
    var importing by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        runCatching { AppGraph.repository.youtubeTrending() }
            .onSuccess { items = it.items.take(12) }
    }
    if (items.isEmpty()) return
    Column(modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
        Text(
            "Trending on YouTube",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
        )
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
        ) {
            items(items, key = { it.youtubeId }) { item ->
                Column(
                    modifier = Modifier
                        .width(160.dp)
                        .clickable(enabled = !importing) {
                            importing = true
                            scope.launch {
                                runCatching { AppGraph.repository.importYoutube(item.url) }
                                    .onSuccess { onOpen(it.id) }
                                importing = false
                            }
                        },
                ) {
                    AsyncImage(
                        model = item.thumb,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxWidth().height(90.dp).clip(RoundedCornerShape(8.dp)),
                    )
                    Text(
                        item.title,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 2,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                    Text(
                        item.channel,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

@Composable
private fun Pill(label: String, selected: Boolean, onClick: () -> Unit) {
    val background =
        if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
    val foreground =
        if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(background)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = foreground, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}
