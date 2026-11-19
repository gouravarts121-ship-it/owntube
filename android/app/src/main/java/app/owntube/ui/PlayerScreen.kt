package app.owntube.ui

import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.BookmarkAdd
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.PictureInPicture
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ThumbDown
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.ui.PlayerView
import app.owntube.BuildConfig
import app.owntube.MainActivity
import app.owntube.analytics.Analytics
import app.owntube.data.AppGraph
import app.owntube.data.ChannelDto
import app.owntube.data.CommentDto
import app.owntube.data.PlaylistDto
import app.owntube.data.SocialDto
import app.owntube.data.VideoDto
import app.owntube.downloads.DownloadsRepository
import app.owntube.ui.components.ChannelAvatar
import app.owntube.ui.components.CompactVideoCard
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlayerScreen(
    videoId: String,
    onBack: () -> Unit,
    onOpenVideo: (String) -> Unit,
    onOpenChannel: (String) -> Unit,
) {
    val context = LocalContext.current
    val repository = AppGraph.repository
    val scope = rememberCoroutineScope()
    var video by remember(videoId) { mutableStateOf<VideoDto?>(null) }
    var error by remember(videoId) { mutableStateOf<String?>(null) }
    var related by remember(videoId) { mutableStateOf<List<VideoDto>>(emptyList()) }
    var expanded by remember(videoId) { mutableStateOf(false) }
    var social by remember(videoId) { mutableStateOf<SocialDto?>(null) }
    var comments by remember(videoId) { mutableStateOf<List<CommentDto>>(emptyList()) }
    var commentText by remember(videoId) { mutableStateOf("") }
    var sending by remember(videoId) { mutableStateOf(false) }
    var sheetOpen by remember(videoId) { mutableStateOf(false) }
    var playlists by remember(videoId) { mutableStateOf<List<PlaylistDto>>(emptyList()) }
    var newPlaylistName by remember(videoId) { mutableStateOf("") }
    val playerController = PlaybackHub.controller

    LaunchedEffect(videoId) {
        runCatching { repository.video(videoId) }
            .onSuccess { loaded ->
                video = loaded
                Analytics.screen("player")
                runCatching { repository.feed(null, loaded.tags) }
                    .onSuccess { response ->
                        related = response.items.filter { it.id != loaded.id }.take(10)
                    }
                runCatching { repository.social(loaded.id) }.onSuccess { social = it }
                runCatching { repository.comments(loaded.id) }.onSuccess { comments = it.items }
            }
            .onFailure { error = it.message }
    }

    LaunchedEffect(video, playerController) {
        val loaded = video ?: return@LaunchedEffect
        if (playerController == null) return@LaunchedEffect
        if (PlaybackHub.currentVideo?.id == loaded.id) {
            PlaybackHub.resume(loaded)
        } else {
            val resume = runCatching { repository.localPosition(loaded.id) }.getOrNull() ?: 0L
            PlaybackHub.play(loaded, resume)
        }
    }

    LaunchedEffect(sheetOpen) {
        if (sheetOpen) runCatching { repository.playlists() }.onSuccess { playlists = it }
    }

    fun react(value: Int) {
        val current = social?.myReaction ?: 0
        scope.launch {
            runCatching { repository.react(videoId, if (current == value) 0 else value) }
                .onSuccess { response ->
                    social = response.copy(
                        comments = social?.comments ?: response.comments,
                        channel = social?.channel ?: response.channel,
                    )
                }
                .onFailure { Toast.makeText(context, "Could not update reaction", Toast.LENGTH_SHORT).show() }
        }
    }

    fun toggleSubscribe(channel: ChannelDto) {
        scope.launch {
            runCatching { repository.subscribe(channel.tag, !channel.subscribed) }
                .onSuccess { result ->
                    val updated = channel.copy(
                        subscribed = result.subscribed,
                        subscribers = (channel.subscribers + if (result.subscribed) 1 else -1).coerceAtLeast(0),
                    )
                    social = social?.copy(channel = updated)
                }
                .onFailure { Toast.makeText(context, "Could not update subscription", Toast.LENGTH_SHORT).show() }
        }
    }

    fun saveTo(playlistId: String?, label: String) {
        scope.launch {
            runCatching {
                if (playlistId == null) repository.addWatchLater(videoId)
                else repository.addToPlaylist(playlistId, videoId)
            }
                .onSuccess {
                    sheetOpen = false
                    Toast.makeText(context, "Saved to $label", Toast.LENGTH_SHORT).show()
                }
                .onFailure { Toast.makeText(context, "Could not save video", Toast.LENGTH_SHORT).show() }
        }
    }

    fun submitComment() {
        val text = commentText.trim()
        if (text.isEmpty() || sending) return
        sending = true
        scope.launch {
            runCatching { repository.addComment(videoId, text) }
                .onSuccess { created ->
                    comments = listOf(created) + comments
                    commentText = ""
                    social = social?.copy(comments = (social?.comments ?: 0) + 1)
                }
                .onFailure { Toast.makeText(context, "Could not post comment", Toast.LENGTH_SHORT).show() }
            sending = false
        }
    }

    fun toggleCommentLike(comment: CommentDto) {
        scope.launch {
            runCatching { repository.likeComment(comment.id) }
                .onSuccess { result ->
                    comments = comments.map {
                        if (it.id == comment.id) it.copy(liked = result.liked, likes = result.likes) else it
                    }
                }
        }
    }

    fun share() {
        val v = video ?: return
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, v.title)
            putExtra(Intent.EXTRA_TEXT, "${v.title}\n${BuildConfig.API_BASE_URL}")
        }
        context.startActivity(Intent.createChooser(intent, "Share video"))
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp),
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Black)
                    .aspectRatio(16f / 9f),
                contentAlignment = Alignment.Center,
            ) {
                if (playerController != null) {
                    AndroidView(
                        factory = { ctx ->
                            PlayerView(ctx).apply {
                                player = playerController
                                useController = true
                                setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING)
                            }
                        },
                        update = { it.player = playerController },
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    CircularProgressIndicator()
                }
                if (PlaybackHub.preparing) {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        CircularProgressIndicator(color = Color.White)
                        Text(
                            "Preparing video…",
                            color = Color.White,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                }
                PlaybackHub.playbackError?.let { message ->
                    Text(
                        message,
                        color = Color.White,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(12.dp),
                    )
                }
                Box(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(12.dp)
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.5f))
                        .clickable(onClick = onBack),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        }

        item { SeekBar() }

        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
                Text(
                    video?.title ?: "Loading…",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                val v = video
                if (v != null) {
                    Text(
                        "${formatViews(v.views)}  •  ${timeAgo(v.publishedAt)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                ActionPill(
                    label = social?.likes?.takeIf { it > 0 }?.let { formatViews(it.toLong()) } ?: "Like",
                    icon = { tint -> Icon(Icons.Filled.ThumbUp, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp)) },
                    selected = social?.myReaction == 1,
                    onClick = { react(1) },
                )
                ActionPill(
                    label = social?.dislikes?.takeIf { it > 0 }?.let { formatViews(it.toLong()) } ?: "Dislike",
                    icon = { tint -> Icon(Icons.Filled.ThumbDown, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp)) },
                    selected = social?.myReaction == -1,
                    onClick = { react(-1) },
                )
                ActionPill(
                    label = "Save",
                    icon = { tint -> Icon(Icons.Filled.BookmarkAdd, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp)) },
                    selected = false,
                    onClick = { sheetOpen = true },
                )
                ActionPill(
                    label = "Share",
                    icon = { tint -> Icon(Icons.Filled.Share, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp)) },
                    selected = false,
                    onClick = { share() },
                )
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                ActionPill(
                    label = "Download",
                    icon = { tint -> Icon(Icons.Filled.Download, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp)) },
                    selected = false,
                    onClick = {
                        video?.let { v -> DownloadsRepository.enqueue(context, v.id, v.title) }
                    },
                )
                ActionPill(
                    label = "PiP",
                    icon = { tint -> Icon(Icons.Filled.PictureInPicture, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp)) },
                    selected = false,
                    onClick = {
                        val v = video
                        if (v != null) (context as? MainActivity)?.enterPip(v.width, v.height)
                    },
                )
            }
        }

        item {
            ChannelRow(
                video = video,
                channel = social?.channel,
                onOpenChannel = onOpenChannel,
                onToggleSubscribe = ::toggleSubscribe,
            )
        }

        item {
            val v = video
            if (v != null) {
                Column(
                    modifier = Modifier
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .clickable { expanded = !expanded }
                        .padding(12.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            if (expanded) "Description" else "Description  •  ${v.tags.joinToString(" ") { "#$it" }}",
                            fontWeight = FontWeight.SemiBold,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Icon(
                            if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                            contentDescription = null,
                        )
                    }
                    Text(
                        v.description.ifBlank { "No description." },
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = if (expanded) Int.MAX_VALUE else 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
            }
        }

        error?.let { message ->
            item {
                Text(
                    message,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp),
                )
            }
        }

        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant)
                Text(
                    "Comments  ${social?.comments ?: comments.size}",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(vertical = 10.dp),
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = commentText,
                        onValueChange = { commentText = it.take(2000) },
                        placeholder = { Text("Add a comment…") },
                        modifier = Modifier.weight(1f),
                        maxLines = 3,
                        shape = RoundedCornerShape(12.dp),
                    )
                    IconButton(onClick = { submitComment() }, enabled = commentText.isNotBlank() && !sending) {
                        Icon(Icons.Filled.Send, contentDescription = "Post comment")
                    }
                }
            }
        }

        if (comments.isEmpty() && social != null) {
            item {
                Text(
                    "No comments yet. Start the conversation.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
        }

        items(comments, key = { it.id }) { comment ->
            CommentRow(comment = comment, onLike = { toggleCommentLike(comment) })
        }

        item {
            Column {
                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 8.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                )
                Text(
                    "Up next",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                )
            }
        }

        items(related, key = { it.id }) { item ->
            CompactVideoCard(video = item, onClick = { onOpenVideo(item.id) })
        }

        item {
            Button(
                onClick = onBack,
                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = MaterialTheme.colorScheme.onSurface,
                ),
            ) {
                Text("Back")
            }
        }
    }

    if (sheetOpen) {
        ModalBottomSheet(onDismissRequest = { sheetOpen = false }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 28.dp),
            ) {
                Text("Save to", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Watch later", modifier = Modifier.weight(1f))
                    TextButton(onClick = { saveTo(null, "Watch later") }) { Text("Save") }
                }
                playlists.forEach { playlist ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(playlist.name, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(
                                "${playlist.count} videos",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        TextButton(onClick = { saveTo(playlist.id, playlist.name) }) { Text("Save") }
                    }
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedTextField(
                        value = newPlaylistName,
                        onValueChange = { newPlaylistName = it.take(100) },
                        label = { Text("New playlist") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(
                        enabled = newPlaylistName.isNotBlank(),
                        onClick = {
                            val name = newPlaylistName.trim()
                            scope.launch {
                                runCatching { repository.createPlaylist(name) }
                                    .onSuccess { created ->
                                        playlists = listOf(created) + playlists
                                        newPlaylistName = ""
                                        saveTo(created.id, created.name)
                                    }
                                    .onFailure { Toast.makeText(context, "Could not create playlist", Toast.LENGTH_SHORT).show() }
                            }
                        },
                    ) { Text("Create") }
                }
            }
        }
    }
}

@Composable
private fun SeekBar() {
    var dragging by remember { mutableStateOf(false) }
    var dragValue by remember { mutableStateOf(0f) }
    val duration = PlaybackHub.durationMs
    val progress = if (dragging) {
        dragValue
    } else if (duration > 0) {
        (PlaybackHub.positionMs.toFloat() / duration.toFloat()).coerceIn(0f, 1f)
    } else 0f

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(formatDuration(if (dragging) (dragValue * duration).toLong() else PlaybackHub.positionMs), style = MaterialTheme.typography.labelSmall)
        Slider(
            value = progress,
            onValueChange = {
                dragging = true
                dragValue = it
            },
            onValueChangeFinished = {
                PlaybackHub.seekTo((dragValue * duration).toLong())
                dragging = false
            },
            colors = SliderDefaults.colors(
                thumbColor = Color(0xFFFF0033),
                activeTrackColor = Color(0xFFFF0033),
            ),
            modifier = Modifier.weight(1f).padding(horizontal = 8.dp),
        )
        Text(formatDuration(duration), style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun ActionPill(
    label: String,
    icon: @Composable (Color) -> Unit,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val background =
        if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
    val foreground =
        if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(background)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        icon(foreground)
        Text(label, color = foreground, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
private fun ChannelRow(
    video: VideoDto?,
    channel: ChannelDto?,
    onOpenChannel: (String) -> Unit,
    onToggleSubscribe: (ChannelDto) -> Unit,
) {
    val tag = channel?.tag ?: video?.tags?.firstOrNull()
    val name = channel?.name?.ifBlank { channel.tag } ?: video?.let { channelName(it.tags) } ?: "OwnTube"
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            modifier = Modifier
                .weight(1f)
                .clickable(enabled = tag != null) { tag?.let(onOpenChannel) },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ChannelAvatar(name, size = 40)
            Column(modifier = Modifier.padding(horizontal = 10.dp)) {
                Text(name, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
                Text(
                    channel?.let { "${formatViews(it.subscribers.toLong())} subscribers" }
                        ?: video?.tags?.joinToString("  ") { "#$it" }.orEmpty(),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        val current = channel
        if (current != null) {
            FilledTonalButton(
                onClick = { onToggleSubscribe(current) },
                colors = ButtonDefaults.filledTonalButtonColors(
                    containerColor = if (current.subscribed) {
                        MaterialTheme.colorScheme.surfaceVariant
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
    }
}

@Composable
private fun CommentRow(comment: CommentDto, onLike: () -> Unit) {
    Row(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        ChannelAvatar(comment.author.ifBlank { "V" }, size = 32)
        Column(modifier = Modifier.padding(start = 10.dp)) {
            Text(
                "${comment.author}  •  ${timeAgo(comment.createdAt)}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                comment.body,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(top = 2.dp),
            )
            Row(
                modifier = Modifier
                    .padding(top = 4.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable(onClick = onLike)
                    .padding(horizontal = 4.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(
                    Icons.Filled.ThumbUp,
                    contentDescription = "Like comment",
                    modifier = Modifier.size(14.dp),
                    tint = if (comment.liked) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
                Text(
                    if (comment.likes > 0) formatViews(comment.likes.toLong()) else "Like",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (comment.liked) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
            }
        }
    }
}
