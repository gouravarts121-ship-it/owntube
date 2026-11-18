package app.owntube.data

import androidx.paging.PagingSource
import androidx.paging.PagingState

class FeedPagingSource(
    private val repository: VideoRepository,
    private val tags: List<String>,
) : PagingSource<Int, VideoDto>() {
    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, VideoDto> {
        val cursor = params.key ?: 0
        return try {
            val response = repository.feed(cursor = cursor.takeIf { it > 0 }, tags = tags)
            LoadResult.Page(
                data = response.items,
                prevKey = if (cursor == 0) null else (cursor - params.loadSize).coerceAtLeast(0),
                nextKey = response.nextCursor,
            )
        } catch (err: Exception) {
            LoadResult.Error(err)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, VideoDto>): Int? = 0
}
