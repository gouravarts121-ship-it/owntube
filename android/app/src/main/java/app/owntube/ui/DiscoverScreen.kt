package app.owntube.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import app.owntube.data.AppGraph
import app.owntube.data.RemoteVideoDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DiscoverUiState(
    val query: String = "",
    val results: List<RemoteVideoDto> = emptyList(),
    val urlInput: String = "",
    val keyInput: String = "",
    val configured: Boolean = false,
    val duration: String = "",
    val order: String = "",
    val loading: Boolean = false,
    val message: String? = null,
)

class DiscoverViewModel : ViewModel() {
    private val _state = MutableStateFlow(DiscoverUiState())
    val state: StateFlow<DiscoverUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            runCatching { AppGraph.repository.youtubeConfig() }
                .onSuccess { _state.value = _state.value.copy(configured = it.configured) }
        }
    }

    fun onQuery(value: String) { _state.value = _state.value.copy(query = value) }
    fun onUrl(value: String) { _state.value = _state.value.copy(urlInput = value) }
    fun onKey(value: String) { _state.value = _state.value.copy(keyInput = value) }
    fun onDuration(value: String) {
        _state.value = _state.value.copy(duration = if (_state.value.duration == value) "" else value)
    }
    fun onOrder(value: String) {
        _state.value = _state.value.copy(order = if (_state.value.order == value) "" else value)
    }

    fun search() {
        val query = _state.value.query.trim()
        if (query.isBlank()) return
        _state.value = _state.value.copy(loading = true, message = null)
        viewModelScope.launch {
            runCatching {
                AppGraph.repository.youtubeSearch(query, _state.value.duration.ifBlank { null }, _state.value.order.ifBlank { null })
            }.onSuccess { response ->
                _state.value = _state.value.copy(
                    results = response.items,
                    loading = false,
                    configured = response.configured,
                    message = if (response.items.isEmpty()) "No results found" else null,
                )
            }.onFailure { error ->
                _state.value = _state.value.copy(loading = false, message = error.message)
            }
        }
    }

    fun importUrl(onOpen: (String) -> Unit) {
        val url = _state.value.urlInput.trim()
        if (url.isBlank()) return
        _state.value = _state.value.copy(loading = true, message = null)
        viewModelScope.launch {
            runCatching { AppGraph.repository.importYoutube(url) }
                .onSuccess { video ->
                    _state.value = _state.value.copy(loading = false, urlInput = "", message = "Imported: ${video.title}")
                    onOpen(video.id)
                }
                .onFailure { error -> _state.value = _state.value.copy(loading = false, message = error.message) }
        }
    }

    fun saveKey() {
        val key = _state.value.keyInput.trim()
        if (key.isBlank()) return
        _state.value = _state.value.copy(loading = true, message = null)
        viewModelScope.launch {
            runCatching { AppGraph.repository.saveYoutubeKey(key) }
                .onSuccess { _state.value = _state.value.copy(loading = false, configured = it.configured, keyInput = "", message = "YouTube API key saved") }
                .onFailure { error -> _state.value = _state.value.copy(loading = false, message = error.message) }
        }
    }
}

@Composable
fun DiscoverScreen(
    onBack: () -> Unit,
    onOpen: (String) -> Unit,
    onOpenChannel: (String) -> Unit,
    viewModel: DiscoverViewModel = viewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxWidth().padding(4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back") }
            Text("Discover", style = MaterialTheme.typography.titleLarge)
        }

        TextField(
            value = state.query,
            onValueChange = viewModel::onQuery,
            placeholder = { Text("Search YouTube") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
        )
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            FilterChip(selected = state.duration == "short", onClick = { viewModel.onDuration("short") }, label = { Text("Short") })
            FilterChip(selected = state.duration == "medium", onClick = { viewModel.onDuration("medium") }, label = { Text("Medium") })
            FilterChip(selected = state.duration == "long", onClick = { viewModel.onDuration("long") }, label = { Text("Long") })
            FilterChip(selected = state.order == "date", onClick = { viewModel.onOrder("date") }, label = { Text("Newest") })
        }
        Button(onClick = { viewModel.search() }, modifier = Modifier.padding(horizontal = 12.dp)) {
            Text("Search YouTube")
        }

        Text(
            "Paste a YouTube link to import and play it",
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(start = 12.dp, top = 12.dp),
        )
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            TextField(
                value = state.urlInput,
                onValueChange = viewModel::onUrl,
                placeholder = { Text("https://youtube.com/watch?v=…") },
                singleLine = true,
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = { viewModel.importUrl(onOpen) }) { Text("Import") }
        }

        if (!state.configured) {
            Text(
                "Optional: add a YouTube Data API key for better discovery",
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(start = 12.dp, top = 8.dp),
            )
            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                TextField(
                    value = state.keyInput,
                    onValueChange = viewModel::onKey,
                    placeholder = { Text("API key") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                TextButton(onClick = { viewModel.saveKey() }) { Text("Save") }
            }
        }

        state.message?.let {
            Text(it, color = MaterialTheme.colorScheme.secondary, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
        }

        if (state.loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp),
            ) {
                items(state.results, key = { it.youtubeId }) { item ->
                    Column(modifier = Modifier.fillMaxWidth().clickable {
                        openRemote(onOpen, item, viewModel)
                    }) {
                        Text(item.title, style = MaterialTheme.typography.bodyMedium)
                        Text(
                            listOfNotNull(item.channel.ifBlank { null }, if (item.durationMs > 0) formatDuration(item.durationMs) else null).joinToString(" · "),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Row {
                            TextButton(onClick = { openRemote(onOpen, item, viewModel) }) { Text("Play") }
                            if (item.channelId.isNotBlank()) {
                                OutlinedButton(onClick = { onOpenChannel(item.channelId) }) { Text("Channel") }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun openRemote(onOpen: (String) -> Unit, item: RemoteVideoDto, viewModel: DiscoverViewModel) {
    viewModel.onUrl(item.url)
    viewModel.importUrl(onOpen)
}
