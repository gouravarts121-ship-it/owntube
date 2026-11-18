package app.owntube.data

import android.content.Context
import com.tencent.mmkv.MMKV

class SessionStore(context: Context) {
    private val kv = MMKV.mmkvWithID("session", MMKV.MULTI_PROCESS_MODE)

    var token: String?
        get() = kv.decodeString("token")
        set(value) {
            if (value == null) kv.removeValueForKey("token") else kv.encode("token", value)
        }

    var userId: String?
        get() = kv.decodeString("userId")
        set(value) {
            if (value == null) kv.removeValueForKey("userId") else kv.encode("userId", value)
        }

    fun save(session: SessionResponse) {
        token = session.token
        userId = session.userId
    }
}
