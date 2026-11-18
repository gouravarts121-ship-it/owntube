# Reference study: `com.biomes.vanced`

The APK at `/data/app/com.biomes.vanced-1/base.apk` (23.7 MB) was studied statically to
understand feature coverage and dependency choices. **No code, resources, assets or
catalog data were copied into OwnTube.** OwnTube is an independent implementation with
its own backend, storage and UI.

## Identity

- Package `com.biomes.vanced`, version name 2.x, targetSdk 35, minSdk 21
- 360 Jiagu packed; real DEX lives in `assets/0OO00l111l1l` and a native loader
  (`libiwock.so`, `libjiagu*`) decrypts it at runtime
- Not YouTube Vanced: it is a closed-source YouTube client/ripper with Bola.net RSS
  news, multi-language UI, Mintegral ads, and background-play/managed download strings
- Contains no `youtube`, `microg` or Vanced package bindings; no GPL Vanced source

## Feature surface observed

- Video feed, channel/subscription lists, search, playlists, watch later
- Background playback and picture-in-picture
- Download manager with quality selection and storage management
- Player settings: speed, subtitles, codec/quality, gesture controls
- Shorts-style vertical player
- Feed personalization by categories/languages
- Ads: Mintegral MBridge, IAB Open Measurement; some HMS ad classes
- Analytics: Firebase suite, Facebook SDK; crash reporting with NDK symbols
- Utilities: ImageLoader, OkHttp, MMKV, Room, DataStore, Paging, Navigation,
  WorkManager, protobuf, SVGA player, QuickJS scripting

## Dependency inventory (parity reference)

The version catalog holds 90 AndroidX/Kotlin entries plus Firebase, Facebook, HMS,
Play Core, Mintegral/OM SDK, Glide, OkHttp, MMKV, DataStore, Room, WorkManager,
protobuf descriptors, SVGA and QuickJS. See `docs/dependencies.md` for the mapped
subset used in OwnTube and the intentional omissions.

## Parity decisions

| Target behavior | OwnTube |
| --- | --- |
| Tag/category-personalized feed | tag preferences, weights, mute, history (server side) |
| Background playback + PiP | Media3 `MediaSessionService` + PiP activity |
| Downloads with quality selection | signed MP4 downloads, WorkManager, MediaStore |
| Shorts | detected by metadata/tag/aspect+duration and excluded by policy |
| Analytics/crash parity | Firebase Analytics, Crashlytics, Messaging, Remote Config, Facebook |
| Ad SDKs (Mintegral/HMS) | omitted by design — the product is ad-free |
| Vendor streaming/stream ripping | not implemented — own/licensed catalog only |
| Obfuscated packed client, hidden DEX | open source, unpacked, reviewable |

The reference APK was never executed, patched, repackaged, or redistributed. Study
artifacts (strings, class names, resource IDs) were used only to check feature lists.
