package app.owntube.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.cachedIn
import app.owntube.data.AppGraph
import app.owntube.data.FeedPagingSource
import app.owntube.data.TagInfo
import app.owntube.data.VideoDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.launch

data class FeedUiState(
    val tags: List<TagInfo> = emptyList(),
    val selected: Set<String> = emptySet(),
    val loading: Boolean = true,
    val error: String? = null,
)

@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class FeedViewModel : ViewModel() {
    private val repository = AppGraph.repository
    private val _state = MutableStateFlow(FeedUiState())
    val state: StateFlow<FeedUiState> = _state.asStateFlow()

    private val filters = MutableStateFlow<List<String>>(emptyList())

    val feed: Flow<PagingData<VideoDto>> = filters
        .flatMapLatest { tags ->
            Pager(
                config = PagingConfig(pageSize = 24, prefetchDistance = 6, enablePlaceholders = false),
                pagingSourceFactory = { FeedPagingSource(repository, tags) },
            ).flow
        }
        .cachedIn(viewModelScope)

    init {
        refresh()
        viewModelScope.launch {
            runCatching { repository.syncHistory() }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            runCatching { repository.tags() }
                .onSuccess { tags ->
                    _state.value = _state.value.copy(tags = tags, loading = false)
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(loading = false, error = err.message)
                }
        }
    }

    fun clearFilters() {
        _state.value = _state.value.copy(selected = emptySet())
        filters.value = emptyList()
    }

    fun toggleTag(tag: String) {
        val current = _state.value.selected.toMutableSet()
        if (!current.add(tag)) current.remove(tag)
        _state.value = _state.value.copy(selected = current)
        filters.value = current.toList()
    }
}
