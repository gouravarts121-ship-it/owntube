package app.owntube.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.owntube.data.Endpoints
import app.owntube.data.VideoDto
import app.owntube.ui.channelName
import app.owntube.ui.formatDuration
import app.owntube.ui.formatViews
import app.owntube.ui.timeAgo
import coil.compose.SubcomposeAsyncImage

private val avatarPalette = listOf(
    Color(0xFF7C5CFF), Color(0xFFE94F8A), Color(0xFF2BB673), Color(0xFFF4A340),
    Color(0xFF4A90E2), Color(0xFFE2574C), Color(0xFF9B59B6), Color(0xFF16A085),
)

@Composable
fun ChannelAvatar(name: String, size: Int = 36) {
    val color = avatarPalette[(name.hashCode() and Int.MAX_VALUE) % avatarPalette.size]
    Box(
        modifier = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(color),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            name.take(1).uppercase(),
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = (size * 0.42f).sp,
        )
    }
}

@Composable
fun Thumbnail(video: VideoDto, modifier: Modifier = Modifier) {
    Box(modifier = modifier) {
        SubcomposeAsyncImage(
            model = Endpoints.absolute(video.thumb),
            contentDescription = video.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f)
                .clip(RoundedCornerShape(12.dp)),
            loading = {
                ShimmerBox(
                    modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f),
                    shape = RoundedCornerShape(12.dp),
                )
            },
            error = {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(16f / 9f)
                        .background(Color(0xFF1C1C1C), RoundedCornerShape(12.dp)),
                )
            },
        )
        if (video.durationMs > 0) {
            Text(
                text = formatDuration(video.durationMs),
                color = Color.White,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(6.dp)
                    .background(Color.Black.copy(alpha = 0.8f), RoundedCornerShape(4.dp))
                    .padding(horizontal = 4.dp, vertical = 1.dp),
            )
        }
    }
}

@Composable
fun VideoCard(
    video: VideoDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val channel = channelName(video.tags)
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Thumbnail(video, Modifier.fillMaxWidth())
        Row(
            modifier = Modifier.padding(top = 10.dp, start = 4.dp, end = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            ChannelAvatar(channel)
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    video.title,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    "$channel  •  ${formatViews(video.views)}  •  ${timeAgo(video.publishedAt)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
    }
}

@Composable
fun CompactVideoCard(
    video: VideoDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val channel = channelName(video.tags)
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Thumbnail(video, Modifier.width(160.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                video.title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                channel,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 2.dp),
            )
            Text(
                "${formatViews(video.views)}  •  ${timeAgo(video.publishedAt)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
        }
    }
}

@Composable
fun VideoCardSkeleton(modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth()) {
        ShimmerBox(
            modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f),
            shape = RoundedCornerShape(12.dp),
        )
        Row(
            modifier = Modifier.padding(top = 10.dp, start = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            ShimmerBox(modifier = Modifier.size(36.dp), shape = RoundedCornerShape(50))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                ShimmerBox(modifier = Modifier.fillMaxWidth(0.9f).height(14.dp))
                ShimmerBox(modifier = Modifier.fillMaxWidth(0.5f).height(12.dp))
            }
        }
    }
}
