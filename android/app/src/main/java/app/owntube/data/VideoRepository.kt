package app.owntube.data

import app.owntube.data.db.AppDatabase
import app.owntube.data.db.HistoryEntity
import app.owntube.data.db.VideoEntity
import kotlinx.coroutines.flow.Flow

class VideoRepository(
    private val api: ApiClient,
    private val db: AppDatabase,
) {
    fun observeVideo(id: String): Flow<VideoEntity?> = db.videoDao().observeVideo(id)

    suspend fun video(id: String): VideoDto {
        api.ensureSession()
        val dto = api.service.video(id)
        db.videoDao().upsert(dto.toEntity())
        return dto
    }

    suspend fun feed(cursor: Int?, tags: List<String>): FeedResponse {
        api.ensureSession()
        val response = api.service.feed(
            cursor = cursor,
            limit = 24,
            tags = tags.takeIf { it.isNotEmpty() }?.joinToString(","),
        )
        db.videoDao().upsertAll(response.items.map { it.toEntity() })
        return response
    }

    suspend fun search(query: String): List<VideoDto> {
        api.ensureSession()
        val items = api.service.search(query).items
        db.videoDao().upsertAll(items.map { it.toEntity() })
        return items
    }

    suspend fun tags(): List<TagInfo> {
        api.ensureSession()
        return api.service.tags().tags
    }

    suspend fun savePrefs(prefs: List<PrefDto>): List<PrefDto> {
        api.ensureSession()
        return api.service.savePrefs(PrefsBody(prefs)).prefs
    }

    suspend fun savePosition(videoId: String, positionMs: Long, completed: Boolean) {
        db.videoDao().saveHistory(
            HistoryEntity(videoId, positionMs, completed, System.currentTimeMillis(), synced = false),
        )
        runCatching { syncHistory() }
    }

    suspend fun syncHistory() {
        api.ensureSession()
        val pending = db.videoDao().pendingHistory()
        if (pending.isEmpty()) return
        val synced = mutableListOf<String>()
        for (item in pending) {
            runCatching {
                api.service.history(HistoryBody(item.videoId, item.positionMs, item.completed))
                synced += item.videoId
            }
        }
        if (synced.isNotEmpty()) db.videoDao().markSynced(synced)
    }

    suspend fun localPosition(videoId: String): Long? = db.videoDao().history(videoId)?.positionMs

    suspend fun downloadLink(videoId: String): DownloadResponse {
        api.ensureSession()
        return api.service.download(videoId)
    }

    suspend fun social(videoId: String): SocialDto {
        api.ensureSession()
        return api.service.social(videoId)
    }

    suspend fun react(videoId: String, value: Int): SocialDto {
        api.ensureSession()
        return api.service.react(videoId, ReactionBody(value))
    }

    suspend fun comments(videoId: String): CommentsResponse {
        api.ensureSession()
        return api.service.comments(videoId)
    }

    suspend fun addComment(videoId: String, text: String): CommentDto {
        api.ensureSession()
        return api.service.addComment(videoId, CommentBody(text)).comment
    }

    suspend fun likeComment(commentId: String): CommentLikeResponse {
        api.ensureSession()
        return api.service.likeComment(commentId)
    }

    suspend fun subscriptions(): List<SubscriptionDto> {
        api.ensureSession()
        return api.service.subscriptions().tags
    }

    suspend fun subscribe(tag: String, subscribed: Boolean): SubscribeResponse {
        api.ensureSession()
        return api.service.subscribe(SubscribeBody(tag, subscribed))
    }

    suspend fun subscriptionsFeed(): FeedResponse {
        api.ensureSession()
        val response = api.service.subscriptionsFeed()
        db.videoDao().upsertAll(response.items.map { it.toEntity() })
        return response
    }

    suspend fun playlists(): List<PlaylistDto> {
        api.ensureSession()
        return api.service.playlists().items
    }

    suspend fun createPlaylist(name: String): PlaylistDto {
        api.ensureSession()
        return api.service.createPlaylist(PlaylistBody(name))
    }

    suspend fun playlist(id: String): PlaylistDetail {
        api.ensureSession()
        val detail = api.service.playlist(id)
        db.videoDao().upsertAll(detail.items.map { it.toEntity() })
        return detail
    }

    suspend fun addToPlaylist(playlistId: String, videoId: String) {
        api.ensureSession()
        api.service.addToPlaylist(playlistId, VideoIdBody(videoId))
    }

    suspend fun addWatchLater(videoId: String) {
        api.ensureSession()
        api.service.addWatchLater(VideoIdBody(videoId))
    }

    suspend fun watchLater(): List<VideoDto> {
        api.ensureSession()
        val items = api.service.watchLater().items
        db.videoDao().upsertAll(items.map { it.toEntity() })
        return items
    }

    suspend fun history(): List<HistoryItemDto> {
        api.ensureSession()
        val items = api.service.historyList().items
        db.videoDao().upsertAll(items.mapNotNull { it.video?.toEntity() })
        return items
    }
}

fun VideoDto.toEntity(): VideoEntity = VideoEntity(
    id = id,
    title = title,
    description = description,
    durationMs = durationMs,
    width = width,
    height = height,
    isShort = isShort,
    publishedAt = publishedAt,
    thumb = thumb,
    hls = hls,
    mp4 = mp4,
    views = views,
    tagsCsv = tags.joinToString("|"),
)
