package app.owntube.ui

import java.util.concurrent.TimeUnit

fun formatDuration(ms: Long): String {
    if (ms <= 0) return ""
    val hours = TimeUnit.MILLISECONDS.toHours(ms)
    val minutes = TimeUnit.MILLISECONDS.toMinutes(ms) % 60
    val seconds = TimeUnit.MILLISECONDS.toSeconds(ms) % 60
    return if (hours > 0) "%d:%02d:%02d".format(hours, minutes, seconds)
    else "%d:%02d".format(minutes, seconds)
}

fun formatViews(views: Long): String = when {
    views >= 1_000_000 -> "%.1fM views".format(views / 1_000_000.0)
    views >= 1_000 -> "%.1fK views".format(views / 1_000.0)
    else -> "$views views"
}

fun timeAgo(iso: String): String {
    if (iso.isBlank()) return ""
    val fmt = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US).apply {
        timeZone = java.util.TimeZone.getTimeZone("UTC")
    }
    val date = runCatching { fmt.parse(iso.take(19)) }.getOrNull() ?: return ""
    val seconds = (System.currentTimeMillis() - date.time) / 1000
    val minutes = seconds / 60
    val hours = minutes / 60
    val days = hours / 24
    val months = days / 30
    val years = days / 365
    return when {
        seconds < 60 -> "just now"
        minutes < 60 -> "${minutes}m ago"
        hours < 24 -> "${hours}h ago"
        days < 30 -> "${days}d ago"
        months < 12 -> "${months}mo ago"
        else -> "${years}y ago"
    }
}

fun channelName(tags: List<String>): String =
    tags.firstOrNull()?.replaceFirstChar { it.uppercase() } ?: "OwnTube"
