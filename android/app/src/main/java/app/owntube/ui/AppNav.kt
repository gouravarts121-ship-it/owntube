package app.owntube.ui

import android.content.ComponentName
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Subscriptions
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import app.owntube.player.PlaybackService

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab("home", "Home", Icons.Filled.Home),
    Tab("subscriptions", "Subscriptions", Icons.Filled.Subscriptions),
    Tab("library", "You", Icons.Filled.VideoLibrary),
    Tab("settings", "Settings", Icons.Filled.Settings),
)

@Composable
fun AppNav() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route
    val showBar = currentRoute in tabs.map { it.route }
    val hasMiniPlayer = PlaybackHub.currentVideo != null

    DisposableEffect(Unit) {
        val token = SessionToken(context, ComponentName(context, PlaybackService::class.java))
        val future = MediaController.Builder(context, token).buildAsync()
        future.addListener({
            runCatching { future.get() }.onSuccess { PlaybackHub.attach(it) }
        }, ContextCompat.getMainExecutor(context))
        onDispose {
            PlaybackHub.detach()
            MediaController.releaseFuture(future)
        }
    }

    Scaffold(
        bottomBar = {
            Column {
                if (hasMiniPlayer && currentRoute != "player/{videoId}") {
                    MiniPlayer(onExpand = {
                        val id = PlaybackHub.currentVideo?.id
                        if (id != null) {
                            navController.navigate("player/$id") { launchSingleTop = true }
                        }
                    })
                }
                if (showBar) {
                    NavigationBar {
                        tabs.forEach { tab ->
                            NavigationBarItem(
                                selected = currentRoute == tab.route,
                                onClick = {
                                    navController.navigate(tab.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = { Icon(tab.icon, contentDescription = tab.label) },
                                label = { Text(tab.label) },
                            )
                        }
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.padding(padding),
        ) {
            composable("home") {
                HomeScreen(
                    onOpen = { id -> navController.navigate("player/$id") },
                    onSearch = { navController.navigate("search") },
                    onDiscover = { navController.navigate("discover") { launchSingleTop = true } },
                )
            }
            composable("search") {
                SearchScreen(
                    onBack = { navController.popBackStack() },
                    onOpen = { id -> navController.navigate("player/$id") { launchSingleTop = true } },
                )
            }
            composable("discover") {
                DiscoverScreen(
                    onBack = { navController.popBackStack() },
                    onOpen = { id -> navController.navigate("player/$id") { launchSingleTop = true } },
                    onOpenChannel = { input ->
                        navController.navigate("channel/${java.net.URLEncoder.encode(input, "UTF-8")}") {
                            launchSingleTop = true
                        }
                    },
                )
            }
            composable("subscriptions") {
                SubscriptionsScreen(
                    onOpen = { id -> navController.navigate("player/$id") { launchSingleTop = true } },
                    onOpenChannel = { tag -> navController.navigate("channel/$tag") { launchSingleTop = true } },
                )
            }
            composable("library") {
                LibraryScreen(
                    onOpen = { id -> navController.navigate("player/$id") { launchSingleTop = true } },
                    onDownloads = { navController.navigate("downloads") { launchSingleTop = true } },
                )
            }
            composable("downloads") { DownloadsScreen() }
            composable(
                "channel/{tag}",
                arguments = listOf(navArgument("tag") { type = NavType.StringType }),
            ) { entry ->
                ChannelScreen(
                    tag = entry.arguments?.getString("tag").orEmpty(),
                    onBack = { navController.popBackStack() },
                    onOpen = { id -> navController.navigate("player/$id") { launchSingleTop = true } },
                )
            }
            composable("settings") { SettingsScreen() }
            composable(
                "player/{videoId}",
                arguments = listOf(navArgument("videoId") { type = NavType.StringType }),
            ) { entry ->
                PlayerScreen(
                    videoId = entry.arguments?.getString("videoId").orEmpty(),
                    onBack = { navController.popBackStack() },
                    onOpenVideo = { id ->
                        navController.navigate("player/$id") {
                            popUpTo(navController.graph.findStartDestination().id) { inclusive = false }
                            launchSingleTop = true
                        }
                    },
                    onOpenChannel = { tag ->
                        navController.navigate("channel/$tag") { launchSingleTop = true }
                    },
                )
            }
        }
    }
}
