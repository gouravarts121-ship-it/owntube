# Dependency inventory and parity mapping

Reference APK: `com.biomes.vanced` (360-packed, targetSdk 35).

## Reference inventory (observed, summarized)

- **AndroidX/Kotlin version catalog**: 90 entries (core, appcompat, activity, fragment,
  lifecycle, compose, navigation, paging, room, work, datastore, media3,
  recyclerview, constraintlayout, preference, biometric, splashscreen, camera, etc.).
- **Firebase**: Analytics, Crashlytics + NDK symbols, Messaging, Remote Config,
  Sessions, Installations, DataTransport, encoders, protobuf.
- **Facebook SDK** (core/appevents/login/share), **HMS ads**, **Play Core**
  (in-app updates/reviews), **Mintegral MBridge** + **IAB OM SDK**.
- **Media/networking**: ExoPlayer/Media3, Glide (webp, okhttp integration), OkHttp,
  Okio, protobuf.
- **Storage**: Room, MMKV, DataStore Preferences, SQLite.
- **UI/utility**: Navigation, WorkManager, ViewPager2, RecyclerView, SwipeRefresh,
  Material, SVGA player, QuickJS, Biometric.

## OwnTube mapping (implemented)

| Area | OwnTube dependency |
| --- | --- |
| Core/UI | core-ktx 1.15.0, appcompat 1.7.0, activity-compose 1.9.3 |
| Compose | BOM 2024.12.01, material3, material-icons-extended, ui-tooling |
| Lifecycle | lifecycle-runtime/viewmodel-compose 2.8.7, lifecycle-service |
| Navigation | navigation-compose 2.8.5 |
| Paging | paging-runtime/paging-compose 3.3.5 |
| Storage | Room 2.6.1 (KSP), DataStore 1.1.1, MMKV 1.3.9 |
| Background | WorkManager 2.10.0 |
| Playback | Media3 1.5.1: exoplayer, exoplayer-hls, session, ui, datasource-okhttp,
  cache, database, workmanager |
| Networking | Retrofit 2.11.0, Moshi 1.15.1, OkHttp 4.12.0 + logging |
| Images | Coil 2.7.0 |
| Analytics | Firebase BOM 33.7.0 (analytics, crashlytics, messaging, config),
  facebook-core 17.0.2 |
| Other | protobuf-javalite 4.28.3, Play Core 1.10.3 |
| Tooling | AGP 8.7.3, Kotlin 2.0.21, Compose compiler plugin, KSP 2.0.21-1.0.28,
  google-services 4.4.2, crashlytics plugin 3.0.2 |

## Intentional omissions

- **Mintegral MBridge, IAB OM SDK, HMS ads** — OwnTube is ad-free; importing ad SDKs
  would contradict the product and add tracking.
- **SVGA/QuickJS** — animation/scripting runtimes for the target's UI packs; OwnTube
  uses Compose and has no scripting surface.
- **Stream extraction/ripping components** — not implemented for legal and security
  reasons; see `reference.md`.
- **Packing/loader** — OwnTube ships reviewable DEX instead of 360 Jiagu-style
  encrypted payloads.

## Notes

- Compose BOM 2024.12.01 is compatible with Kotlin 2.0.21 and AGP 8.7.x.
- Media3 1.5.1 requires compileSdk 35 for its manifest entries; OwnTube compiles
  against 35 with minSdk 24.
- Firebase configs are optional at build time: the google-services plugin is applied
  only when `android/app/google-services.json` exists, and runtime calls are wrapped in
  `runCatching`.
