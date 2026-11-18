package app.owntube.data

import android.content.Context
import app.owntube.data.db.AppDatabase

object AppGraph {
    lateinit var api: ApiClient
        private set
    lateinit var repository: VideoRepository
        private set
    lateinit var sessionStore: SessionStore
        private set

    fun init(context: Context) {
        if (::repository.isInitialized) return
        sessionStore = SessionStore(context)
        api = ApiClient(context, sessionStore)
        val db = AppDatabase.build(context)
        repository = VideoRepository(api, db)
    }
}
