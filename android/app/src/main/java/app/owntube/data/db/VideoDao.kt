package app.owntube.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface VideoDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(videos: List<VideoEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(video: VideoEntity)

    @Query("SELECT * FROM videos WHERE id = :id")
    suspend fun video(id: String): VideoEntity?

    @Query("SELECT * FROM videos WHERE id = :id")
    fun observeVideo(id: String): Flow<VideoEntity?>

    @Query("SELECT * FROM videos ORDER BY publishedAt DESC LIMIT 500")
    fun observeAll(): Flow<List<VideoEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveHistory(history: HistoryEntity)

    @Query("SELECT * FROM history WHERE videoId = :id")
    suspend fun history(id: String): HistoryEntity?

    @Query("SELECT * FROM history WHERE synced = 0 ORDER BY updatedAt LIMIT 50")
    suspend fun pendingHistory(): List<HistoryEntity>

    @Query("UPDATE history SET synced = 1 WHERE videoId IN (:ids)")
    suspend fun markSynced(ids: List<String>)
}
