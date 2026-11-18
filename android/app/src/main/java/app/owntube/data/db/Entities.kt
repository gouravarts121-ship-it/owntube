package app.owntube.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "videos")
data class VideoEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String,
    val durationMs: Long,
    val width: Int,
    val height: Int,
    val isShort: Boolean,
    val publishedAt: String,
    val thumb: String,
    val hls: String,
    val mp4: String,
    val views: Long,
    val tagsCsv: String,
)

@Entity(tableName = "history")
data class HistoryEntity(
    @PrimaryKey val videoId: String,
    val positionMs: Long,
    val completed: Boolean,
    val updatedAt: Long,
    val synced: Boolean = false,
)

fun VideoEntity.tags(): List<String> =
    if (tagsCsv.isBlank()) emptyList() else tagsCsv.split("|")
