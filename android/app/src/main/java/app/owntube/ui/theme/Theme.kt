package app.owntube.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val YouTubeRed = Color(0xFFFF0033)

private val Colors = darkColorScheme(
    primary = Color(0xFFF1F1F1),
    onPrimary = Color(0xFF0F0F0F),
    primaryContainer = Color(0xFF272727),
    onPrimaryContainer = Color(0xFFF1F1F1),
    secondary = Color(0xFFAAAAAA),
    onSecondary = Color(0xFF0F0F0F),
    tertiary = YouTubeRed,
    background = Color(0xFF0F0F0F),
    onBackground = Color(0xFFF1F1F1),
    surface = Color(0xFF0F0F0F),
    onSurface = Color(0xFFF1F1F1),
    surfaceVariant = Color(0xFF272727),
    onSurfaceVariant = Color(0xFFAAAAAA),
    outline = Color(0xFF3F3F3F),
    error = Color(0xFFFF4E45),
)

@Composable
fun OwnTubeTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Colors, content = content)
}
