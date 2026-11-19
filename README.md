# OwnTube

A self-hosted, ad-free video app: Node backend, installable PWA, and a native Android
client. The feed is personalized by tag preferences instead of engagement ads, Shorts
are excluded by policy, and videos can be downloaded for offline playback.

Everything ships in this repository — no third-party app code, no stream ripping, no ad
SDKs.

```
server/   Node 26 backend (node:sqlite, ffmpeg HLS/MP4 pipeline, signed downloads)
web/      Installable PWA + admin console
android/  Kotlin/Compose app (Media3, Room, Paging, WorkManager, Firebase/Facebook analytics)
content/  Seed catalog (Creative Commons / public domain samples)
docs/     Reference study, dependency inventory, threat model
```

## Quick start

```bash
npm install          # no runtime deps; wires the npm scripts
npm start            # http://127.0.0.1:8787
```

Seed the catalog (creates HLS renditions, MP4 fallbacks and thumbnails):

```bash
node server/scripts/seed.mjs
```

Add your own files with `node server/scripts/ingest.mjs <dir-or-file>`; optional
sidecar JSON (`title`, `description`, `tags`, `license`, `source`) is picked up next to
the media file. Use `content/inbox/` as the drop folder.

Admin UI: <http://127.0.0.1:8787/admin.html> with `x-admin-token`
(default `dev-admin-token`, set `ADMIN_TOKEN` in production).

Tests: `npm test` (24 API tests, no external services — YouTube calls are mocked).

## Features

- **Tag-personalized feed.** Tag weights, recency, watch history and per-tag mute;
  the same state is honored by the web and Android clients.
- **No Shorts.** Vertical clips under three minutes are tagged, stored and then
  excluded from feed, search and downloads.
- **Downloads.** Time-limited HMAC-signed MP4 URLs with HTTP Range support; the
  Android app saves to `Download/OwnTube`.
- **Offline-first web app.** Service worker caches the shell, media is played through
  hls.js (vendored) with native HLS on Safari.
- **Analytics only, no ads.** Firebase Analytics/Crashlytics/Messaging/Remote Config
  and the Facebook SDK are wired when configs are present; there is no ad SDK, no
  Mintegral/HMS ads, no tracking pixel beyond those SDKs.
- **Picture-in-picture, background audio, playback speed and quality selection** in the
  Android client (Media3 session service).
- **Familiar video-app UI.** Home feed with tag chips, search, up-next list, and a
  mini-player that keeps playing while you browse (original Material 3 styling; no
  third-party app assets, branding or animation code).
- **YouTube discovery and playback, fully in-app.** With `yt-dlp` installed, the
  home feed has a "Trending on YouTube" row, Discover and Search can search
  public videos by filters, channel pages fetch the channel's avatar, banner and
  uploads, and any result plays inside OwnTube. Metadata, thumbnails, channel
  data and video files are fetched by the server; nothing opens youtube.com.
  Play starts immediately by proxying a live H.264/AAC stream through
  `GET /api/stream/:id` (ffmpeg remux on the fly), so there is no full-file wait;
  Download prepares and caches a local MP4 (up to `YTDLP_MAX_HEIGHT`) on this
  device for offline playback and full seeking; saved videos appear under
  Library → Downloads. Home has a "Load more" button that appends further
  YouTube results when the local feed is exhausted. The player has a Comment
  action that jumps to the comment box, and external YouTube videos show real
  YouTube comments (author, avatar, like count and age) under "From YouTube". Optionally add a YouTube Data API key (paste it in Discover or set
  `YOUTUBE_API_KEY`) for official metadata and region-based trending. Search
  supports duration/sort filters, the player has autoplay and an audio-only mode,
  and the browser can cache saved videos for offline use.
  - Note: extracting YouTube media violates YouTube's Terms of Service and may
    stop working if YouTube changes; use it only on your own instance at your own
    risk. Do not use it to bypass paid access or distribute media.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | HTTP port |
| `HOST` | `127.0.0.1` | Bind address |
| `ADMIN_TOKEN` | `dev-admin-token` | Admin API/UI token |
| `APP_SECRET` | dev secret | HMAC key for session + download signatures |
| `DOWNLOAD_TTL_SECONDS` | `900` | Signed URL lifetime |
| `HLS_RENDITIONS` | `720,360` | Transcode ladder (never upscales) |
| `DATA_DIR` | `./data` | DB, media, thumbnails |
| `YOUTUBE_API_KEY` | _(empty)_ | Official YouTube Data API v3 key; enables Discover |
| `YOUTUBE_API_BASE` | `https://www.googleapis.com/youtube/v3` | API base (override for tests/proxies) |
| `YOUTUBE_INNERTUBE_KEY` | public web client key | key used to fetch YouTube comments |
| `YOUTUBE_REGION` | `US` | Region for the "Trending on YouTube" home row |
| `YTDLP` | `yt-dlp` | Path to the `yt-dlp` executable |
| `YTDLP_MAX_HEIGHT` | `360` | Highest video height prepared for playback/download |
| `YTDLP_MAX_BYTES` | `200M` | Maximum prepared file size |
| `YTDLP_TIMEOUT_SECONDS` | `300` | Preparation deadline |
| `YTDLP_CONCURRENCY` | `1` | Simultaneous preparations |

### YouTube discovery

Enable the **YouTube Data API v3** in Google Cloud, create an API key, then either
paste it into **Discover → Save key** in the web app (stored in the local database)
or set `YOUTUBE_API_KEY` before starting the server. Environment values take
precedence over the stored key. With a key configured, the home feed shows a
"Trending on YouTube" row, and Discover can search public videos and import their
metadata plus thumbnail as `external` catalog entries.

Imported entries:

- store `source = "youtube"`, the YouTube id and a `https://www.youtube.com/watch?v=…`
  URL;
- have no local media, so the server refuses to mint download links for them;
- open on YouTube when clicked, and are hidden from the Android client's feed,
  search, history and watch-later lists (the app only plays local media).

With `yt-dlp` available, Discover accepts a pasted YouTube URL (no Data API key
needed). Importing stores metadata, thumbnail, channel id/name and channel avatar;
preparing fetches and muxes a local MP4 on demand. Opening a channel fetches its
avatar, banner and upload list through `/api/youtube/channels/:id` and caches it
for 10 minutes. The player shows download progress, and the "Offline"
action caches the MP4 and thumbnail in the browser's Cache Storage for offline
playback. `GET /api/media/ytdlp` reports whether the extractor is installed.

OwnTube only calls the official Data API for metadata; it never downloads or
extracts YouTube streams.

Build-time Android settings: `API_BASE_URL` (default `http://127.0.0.1:8787/`,
which matches a server running in Termux on the same phone; use
`http://10.0.2.2:8787/` for an emulator or your LAN IP for a PC server), `KEYSTORE_*`, `GOOGLE_SERVICES_JSON`, `FB_APP_ID`,
`FB_CLIENT_TOKEN`. Put them in `android/local.properties` for local builds or in
repo secrets/variables for CI; set `HOST=0.0.0.0` on the server if the phone
connects over your LAN.

## Troubleshooting

- **"Cannot reach the server: Failed to fetch"** in the web UI means the browser
  could not complete an HTTP request. Start the server (`npm start`) and open the
  served page at `http://127.0.0.1:8787/` — opening `web/index.html` directly from
  the filesystem (`file://`) cannot reach the API.
- **Android app shows a connection error**: the APK calls `API_BASE_URL`
  (`http://127.0.0.1:8787/` by default). Run the server in Termux on the same
  phone, or rebuild with your LAN address and start the server with
  `HOST=0.0.0.0`.
- **Server appears to stop**: `npm start` is tied to the terminal session. Use
  `setsid nohup node server/src/index.mjs > ~/owntube.log 2>&1 < /dev/null &`
  to keep it running in the background and check `~/owntube.log`.

## API

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/health` | liveness (alias `/healthz`) |
| `POST` | `/api/session` | anonymous user + HMAC bearer token |
| `GET` | `/api/me` | tags, prefs, history |
| `GET` | `/api/tags` | tag list with counts |
| `GET` | `/api/feed?cursor=&limit=&tags=` | ranked, shorts excluded |
| `GET` | `/api/search?q=&duration=&sort=&after=&before=` | search with filters |
| `GET` | `/api/videos/:id` | single video |
| `POST` | `/api/prefs` | `{tags:[{tag,position,muted}]}` |
| `POST` | `/api/history` | `{videoId,positionMs,completed}` |
| `GET` | `/api/history` | watch history with video details |
| `GET` | `/api/videos/:id/social` | likes, dislikes, my reaction, channel stats |
| `POST` | `/api/videos/:id/reaction` | `{value:1\|-1\|0}` |
| `GET` | `/api/videos/:id/comments` | comment list (`cursor`, `limit`) |
| `POST` | `/api/videos/:id/comments` | `{text}` |
| `POST` | `/api/comments/:id/like` | toggle comment like |
| `GET` | `/api/subscriptions` | subscribed channels |
| `POST` | `/api/subscriptions` | `{tag,subscribed}` |
| `GET` | `/api/subscriptions/feed` | latest from subscribed channels |
| `GET` | `/api/playlists` | playlists with counts |
| `POST` | `/api/playlists` | `{name}` |
| `GET` | `/api/playlists/:id` | playlist with videos |
| `DELETE` | `/api/playlists/:id` | delete playlist |
| `POST` | `/api/playlists/:id/items` | `{videoId}` |
| `DELETE` | `/api/playlists/:id/items/:videoId` | remove video |
| `GET` | `/api/watch-later` | saved videos |
| `POST` | `/api/watch-later` | `{videoId}` |
| `DELETE` | `/api/watch-later/:videoId` | remove video |
| `POST` | `/api/downloads/:id` | signed MP4 URL (prepares external videos first) |
| `GET` | `/api/youtube/channels/:id` | channel avatar, banner, followers and uploads |
| `GET` | `/api/youtube/channel?url=` | same, from a channel URL or handle |
| `GET` | `/api/discover/youtube/config` | whether an API key is configured (+ source) |
| `POST` | `/api/discover/youtube/config` | save/clear `{apiKey}` or `{clear:true}` (auth) |
| `GET` | `/api/discover/youtube/trending?limit=&region=` | trending videos for the home row (fallback via yt-dlp search) |
| `POST` | `/api/discover/youtube/import-url` | `{url}` import via yt-dlp (auth) |
| `GET` | `/api/videos/:id/comments/youtube` | real YouTube comments for an external video |
| `GET` | `/api/media/ytdlp` | yt-dlp availability and version |
| `GET` | `/api/stream/:id` | live proxied stream for an unprepared external video |
| `POST` | `/api/videos/:id/prepare` | start fetching an external video (auth) |
| `GET` | `/api/videos/:id/prepare` | poll preparation progress (auth) |
| `GET` | `/api/discover/youtube?q=&order=&duration=` | search YouTube (API key or yt-dlp) |
| `POST` | `/api/discover/youtube/import` | import `{videoId}` as an external entry (auth) |
| `GET` | `/api/admin/videos` | admin: catalog |
| `POST` | `/api/admin/ingest` | admin: ingest path/seed |
| `DELETE` | `/api/admin/videos/:id` | admin: remove |

Media is served from `/media/...`; signed downloads verify signature and expiry and
support Range requests.

## Android

The APK is built by GitHub Actions (`.github/workflows/android.yml`) with JDK 17 and
Gradle 8.11.1. Locally, with JDK 17 and an Android SDK (platform 35, build-tools 35):

```bash
cd android
echo "sdk.dir=$ANDROID_HOME" > local.properties
gradle :app:assembleRelease      # or ./gradlew after `gradle wrapper`
```

Termux on this 3.6 GB-RAM phone has no Gradle/Android SDK and cannot compile Compose
locally, so CI is the build path. Without keystore secrets the workflow builds a
debug-signed, installable APK and uploads it as the `owntube-debug` artifact; add the
key secrets below for a signed release.

To get the APK from a phone:

1. Push this repo to GitHub (`git remote add origin …; git push -u origin main`).
2. Open **Actions → android → build** and wait for the run.
3. Download the `owntube-debug` artifact, unzip it, and install `app-debug.apk`
   (allow "install unknown apps" for your browser/file manager).
4. Start the server in Termux (`npm start`) so the app can reach `127.0.0.1:8787`.

Add these repository secrets:

| Secret | Required | Purpose |
| --- | --- | --- |
| `KEYSTORE_BASE64` | release signing | base64 of `keystore.jks` |
| `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` | with keystore | signing |
| `GOOGLE_SERVICES_JSON` | Firebase | contents of `google-services.json` |
| `FB_APP_ID`, `FB_CLIENT_TOKEN` | Facebook | SDK metadata |

Optional repository variable `API_BASE_URL` (default `http://127.0.0.1:8787/`, i.e. a
server running in Termux on the same phone; use your LAN IP for a PC server).
 Without Firebase/Facebook configs the app still builds; those SDK calls are
guarded and skipped.

## Content licensing

Seed videos come from public sample sources (Big Buck Bunny — Blender Foundation,
CC BY 3.0; Jellyfish sample; locally generated demo clips). Anything you ingest is
your responsibility: OwnTube does not fetch or decode streams from third-party
services, and it ships no catalog beyond these samples.

## Compliance boundary

This project is an independent implementation. It does not include, decompile or
reuse code from YouTube Vanced, ReVanced, or any other third-party client, and it does
not bypass DRM, signatures or paid access. See `docs/reference.md` for the reference
study that informed feature parity and `docs/threat-model.md` for the security
posture.
