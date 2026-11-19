package app.owntube.data

import app.owntube.BuildConfig
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @POST("api/session")
    suspend fun session(): SessionResponse

    @GET("api/me")
    suspend fun me(): MeResponse

    @GET("api/tags")
    suspend fun tags(): TagsResponse

    @GET("api/feed")
    suspend fun feed(
        @Query("cursor") cursor: Int?,
        @Query("limit") limit: Int,
        @Query("tags") tags: String? = null,
    ): FeedResponse

    @GET("api/search")
    suspend fun search(@Query("q") query: String): SearchResponse

    @GET("api/videos/{id}")
    suspend fun video(@Path("id") id: String): VideoDto

    @POST("api/prefs")
    suspend fun savePrefs(@Body body: PrefsBody): PrefsResponse

    @POST("api/history")
    suspend fun history(@Body body: HistoryBody): OkResponse

    @POST("api/downloads/{id}")
    suspend fun download(@Path("id") id: String): DownloadResponse

    @GET("api/videos/{id}/prepare")
    suspend fun prepare(@Path("id") id: String): PrepareResponse

    @POST("api/videos/{id}/prepare")
    suspend fun startPrepare(@Path("id") id: String): PrepareResponse

    @GET("api/videos/{id}/social")
    suspend fun social(@Path("id") id: String): SocialDto

    @POST("api/videos/{id}/reaction")
    suspend fun react(@Path("id") id: String, @Body body: ReactionBody): SocialDto

    @GET("api/videos/{id}/comments")
    suspend fun comments(@Path("id") id: String, @Query("limit") limit: Int = 50): CommentsResponse

    @POST("api/videos/{id}/comments")
    suspend fun addComment(@Path("id") id: String, @Body body: CommentBody): CommentResponse

    @POST("api/comments/{id}/like")
    suspend fun likeComment(@Path("id") id: String): CommentLikeResponse

    @GET("api/subscriptions")
    suspend fun subscriptions(): SubscriptionsResponse

    @POST("api/subscriptions")
    suspend fun subscribe(@Body body: SubscribeBody): SubscribeResponse

    @GET("api/subscriptions/feed")
    suspend fun subscriptionsFeed(@Query("limit") limit: Int = 24): FeedResponse

    @GET("api/playlists")
    suspend fun playlists(): PlaylistsResponse

    @POST("api/playlists")
    suspend fun createPlaylist(@Body body: PlaylistBody): PlaylistDto

    @GET("api/playlists/{id}")
    suspend fun playlist(@Path("id") id: String): PlaylistDetail

    @POST("api/playlists/{id}/items")
    suspend fun addToPlaylist(@Path("id") id: String, @Body body: VideoIdBody): OkResponse

    @DELETE("api/playlists/{id}/items/{videoId}")
    suspend fun removeFromPlaylist(
        @Path("id") id: String,
        @Path("videoId") videoId: String,
    ): OkResponse

    @GET("api/watch-later")
    suspend fun watchLater(): VideosResponse

    @POST("api/watch-later")
    suspend fun addWatchLater(@Body body: VideoIdBody): OkResponse

    @DELETE("api/watch-later/{videoId}")
    suspend fun removeWatchLater(@Path("videoId") videoId: String): OkResponse

    @GET("api/history")
    suspend fun historyList(): HistoryListResponse

    @GET("api/discover/youtube/config")
    suspend fun youtubeConfig(): YoutubeConfigResponse

    @POST("api/discover/youtube/config")
    suspend fun saveYoutubeKey(@Body body: ApiKeyBody): YoutubeConfigResponse

    @GET("api/discover/youtube/trending")
    suspend fun youtubeTrending(@Query("limit") limit: Int = 12): RemoteFeedResponse

    @GET("api/discover/youtube")
    suspend fun youtubeSearch(
        @Query("q") query: String,
        @Query("limit") limit: Int = 12,
        @Query("offset") offset: Int = 0,
        @Query("duration") duration: String? = null,
        @Query("order") order: String? = null,
    ): RemoteFeedResponse

    @POST("api/discover/youtube/import-url")
    suspend fun importYoutubeUrl(@Body body: ImportUrlBody): ImportResponse

    @GET("api/youtube/channels/{input}")
    suspend fun youtubeChannel(@Path("input", encoded = true) input: String): ChannelInfoDto

    @GET("api/videos/{id}/comments/youtube")
    suspend fun youtubeComments(@Path("id") id: String): YoutubeCommentsResponse
}

object Endpoints {
    fun absolute(path: String): String {
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        return BuildConfig.API_BASE_URL.trimEnd('/') + "/" + path.trimStart('/')
    }
}
