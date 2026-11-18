package app.owntube.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.owntube.data.AppGraph
import app.owntube.data.PrefDto
import app.owntube.data.TagInfo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SettingsUiState(
    val tags: List<TagInfo> = emptyList(),
    val prefs: List<PrefDto> = emptyList(),
    val loading: Boolean = true,
    val saving: Boolean = false,
    val message: String? = null,
)

class SettingsViewModel : ViewModel() {
    private val repository = AppGraph.repository
    private val _state = MutableStateFlow(SettingsUiState())
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            runCatching {
                val api = AppGraph.api.service
                AppGraph.api.ensureSession()
                api.me()
            }.onSuccess { me ->
                _state.value = SettingsUiState(
                    tags = me.tags,
                    prefs = me.prefs,
                    loading = false,
                )
            }.onFailure { err ->
                _state.value = SettingsUiState(loading = false, message = err.message)
            }
        }
    }

    fun ordered(): List<TagInfo> {
        val prefs = _state.value.prefs.associateBy { it.tag }
        return _state.value.tags.sortedWith(
            compareBy(
                { prefs[it.tag]?.position ?: Int.MAX_VALUE },
                { it.tag },
            ),
        )
    }

    fun move(tag: String, delta: Int) {
        val current = ordered().map {
            PrefDto(
                tag = it.tag,
                position = 0,
                muted = _state.value.prefs.firstOrNull { p -> p.tag == it.tag }?.muted ?: false,
            )
        }.toMutableList()
        val index = current.indexOfFirst { it.tag == tag }
        if (index < 0) return
        val item = current.removeAt(index)
        current.add((index + delta).coerceIn(0, current.size), item)
        val renumbered = current.mapIndexed { i, p -> p.copy(position = i) }
        _state.value = _state.value.copy(prefs = renumbered)
    }

    fun toggleMuted(tag: String) {
        val prefs = _state.value.prefs.toMutableList()
        val index = prefs.indexOfFirst { it.tag == tag }
        if (index >= 0) prefs[index] = prefs[index].copy(muted = !prefs[index].muted)
        else prefs += PrefDto(tag, prefs.size, muted = true)
        _state.value = _state.value.copy(prefs = prefs.mapIndexed { i, p -> p.copy(position = i) })
    }

    fun save() {
        viewModelScope.launch {
            _state.value = _state.value.copy(saving = true, message = null)
            runCatching { repository.savePrefs(_state.value.prefs) }
                .onSuccess { saved ->
                    _state.value = _state.value.copy(prefs = saved, saving = false, message = "Feed saved")
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(saving = false, message = err.message)
                }
        }
    }
}
