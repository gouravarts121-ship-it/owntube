package app.owntube

import android.Manifest
import android.app.PictureInPictureParams
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Rational
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import app.owntube.analytics.Analytics
import app.owntube.ui.AppNav
import app.owntube.ui.theme.OwnTubeTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        requestLegacyStorage()
        Analytics.screen("app_open")
        setContent {
            OwnTubeTheme {
                AppNav()
            }
        }
    }

    private fun requestLegacyStorage() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) return
        val granted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.WRITE_EXTERNAL_STORAGE,
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE),
                REQUEST_STORAGE,
            )
        }
    }

    fun enterPip(width: Int, height: Int) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        if (width <= 0 || height <= 0) return
        val ratio = Rational(width, height)
        val params = PictureInPictureParams.Builder()
            .setAspectRatio(ratio)
            .build()
        enterPictureInPictureMode(params)
    }

    private companion object {
        const val REQUEST_STORAGE = 501
    }
}
