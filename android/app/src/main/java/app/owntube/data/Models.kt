package app.owntube.data

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = false)
data class SessionResponse(
    val userId: String,
    val token: String,
)

@JsonClass(generateAdapter = false)
data class TagInfo(
    val tag: String,
    val videos: Int = 0,
    val position: Int? = null,
    val muted: Boolean = false,
)

@JsonClass(generateAdapter = false)
data class TagsResponse(val tags: List<TagInfo> = emptyList())

@JsonClass(generateAdapter = false)
data class VideoDto(
    val id: String,
    val title: String,
    val description: String = "",
    val durationMs: Long = 0,
    val width: Int = 0,
    val height: Int = 0,
    val isShort: Boolean = false,
    val publishedAt: String = "",
    val thumb: String = "",
    val hls: String = "",
    val mp4: String = "",
    val views: Long = 0,
    val tags: List<String> = emptyList(),
    val source: String = "local",
    val externalUrl: String = "",
    val score: Double = 0.0,
    val progress: ProgressDto? = null,
)

@JsonClass(generateAdapter = false)
data class ProgressDto(val positionMs: Long = 0, val completed: Boolean = false)

@JsonClass(generateAdapter = false)
data class FeedResponse(
    val items: List<VideoDto> = emptyList(),
    val nextCursor: Int? = null,
    val total: Int = 0,
)

@JsonClass(generateAdapter = false)
data class SearchResponse(val items: List<VideoDto> = emptyList())

@JsonClass(generateAdapter = false)
data class PrefDto(val tag: String, val position: Int, val muted: Boolean = false)

@JsonClass(generateAdapter = false)
data class PrefsBody(val tags: List<PrefDto>)

@JsonClass(generateAdapter = false)
data class PrefsResponse(val prefs: List<PrefDto> = emptyList())

@JsonClass(generateAdapter = false)
data class HistoryBody(
    val videoId: String,
    val positionMs: Long,
    val completed: Boolean,
)

@JsonClass(generateAdapter = false)
data class HistoryDto(
    val videoId: String,
    val positionMs: Long = 0,
    val completed: Boolean = false,
    val updatedAt: String = "",
)

@JsonClass(generateAdapter = false)
data class DownloadResponse(
    val url: String? = null,
    val expiresAt: String? = null,
    val filename: String? = null,
    val state: String? = null,
    val pct: Int = 0,
    val error: String? = null,
    val ready: Boolean = false,
)

@JsonClass(generateAdapter = false)
data class PrepareResponse(
    val state: String = "",
    val pct: Int = 0,
    val error: String? = null,
    val ready: Boolean = false,
)

@JsonClass(generateAdapter = false)
data class MeResponse(
    val userId: String,
    val tags: List<TagInfo> = emptyList(),
    val prefs: List<PrefDto> = emptyList(),
    val history: List<HistoryDto> = emptyList(),
)

@JsonClass(generateAdapter = false)
data class OkResponse(val ok: Boolean = true)

@JsonClass(generateAdapter = false)
data class RemoteVideoDto(
    val youtubeId: String = "",
    val title: String = "",
    val channel: String = "",
    val channelId: String = "",
    val channelUrl: String = "",
    val durationMs: Long = 0,
    val views: Long = 0,
    val thumb: String = "",
    val url: String = "",
    val imported: Boolean = false,
)

@JsonClass(generateAdapter = false)
data class RemoteFeedResponse(
    val items: List<RemoteVideoDto> = emptyList(),
    val nextPageToken: String = "",
    val configured: Boolean = false,
)

@JsonClass(generateAdapter = false)
data class YoutubeConfigResponse(val configured: Boolean = false, val source: String? = null)

@JsonClass(generateAdapter = false)
data class ImportResponse(val video: VideoDto)

@JsonClass(generateAdapter = false)
data class ChannelInfoDto(
    val id: String = "",
    val name: String = "",
    val avatar: String = "",
    val banner: String = "",
    val followers: Long = 0,
    val url: String = "",
    val videos: List<RemoteVideoDto> = emptyList(),
)

@JsonClass(generateAdapter = false)
data class YoutubeCommentDto(
    val id: String = "",
    val author: String = "",
    val avatar: String = "",
    val body: String = "",
    val time: String = "",
    val likes: String = "",
    val replies: String = "",
)

@JsonClass(generateAdapter = false)
data class YoutubeCommentsResponse(val items: List<YoutubeCommentDto> = emptyList())

@JsonClass(generateAdapter = false)
data class ApiKeyBody(val apiKey: String)

@JsonClass(generateAdapter = false)
data class ImportUrlBody(val url: String)

@JsonClass(generateAdapter = false)
data class ChannelDto(
    val tag: String = "",
    val name: String = "",
    val videos: Int = 0,
    val subscribers: Int = 0,
    val subscribed: Boolean = false,
)

@JsonClass(generateAdapter = false)
data class SocialDto(
    val likes: Int = 0,
    val dislikes: Int = 0,
    val myReaction: Int = 0,
    val comments: Int = 0,
    val channel: ChannelDto? = null,
)

@JsonClass(generateAdapter = false)
data class ReactionBody(val value: Int)

@JsonClass(generateAdapter = false)
data class CommentDto(
    val id: String,
    val body: String,
    val createdAt: String = "",
    val author: String = "",
    val likes: Int = 0,
    val liked: Boolean = false,
)

@JsonClass(generateAdapter = false)
data class CommentsResponse(
    val items: List<CommentDto> = emptyList(),
    val total: Int = 0,
    val nextCursor: Int? = null,
)

@JsonClass(generateAdapter = false)
data class CommentBody(val text: String)

@JsonClass(generateAdapter = false)
data class CommentResponse(val comment: CommentDto)

@JsonClass(generateAdapter = false)
data class CommentLikeResponse(val liked: Boolean = false, val likes: Int = 0)

@JsonClass(generateAdapter = false)
data class SubscriptionDto(val tag: String, val videos: Int = 0, val subscribers: Int = 0)

@JsonClass(generateAdapter = false)
data class SubscriptionsResponse(val tags: List<SubscriptionDto> = emptyList())

@JsonClass(generateAdapter = false)
data class SubscribeBody(val tag: String, val subscribed: Boolean)

@JsonClass(generateAdapter = false)
data class SubscribeResponse(val tag: String = "", val subscribed: Boolean = false)

@JsonClass(generateAdapter = false)
data class PlaylistDto(
    val id: String,
    val name: String,
    val count: Int = 0,
    val createdAt: String = "",
)

@JsonClass(generateAdapter = false)
data class PlaylistsResponse(val items: List<PlaylistDto> = emptyList())

@JsonClass(generateAdapter = false)
data class PlaylistBody(val name: String)

@JsonClass(generateAdapter = false)
data class PlaylistDetail(val playlist: PlaylistDto? = null, val items: List<VideoDto> = emptyList())

@JsonClass(generateAdapter = false)
data class VideoIdBody(val videoId: String)

@JsonClass(generateAdapter = false)
data class VideosResponse(val items: List<VideoDto> = emptyList())

@JsonClass(generateAdapter = false)
data class HistoryItemDto(
    val video: VideoDto? = null,
    val positionMs: Long = 0,
    val completed: Boolean = false,
    val updatedAt: String = "",
)

@JsonClass(generateAdapter = false)
data class HistoryListResponse(val items: List<HistoryItemDto> = emptyList())
