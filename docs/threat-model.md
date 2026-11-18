# Threat model

## Assets

- User identifiers and tag preferences (`users`, `tag_prefs`)
- Watch history (`history`)
- Session tokens (HMAC-signed bearer tokens)
- Signed download URLs (HMAC + expiry)
- Media files and thumbnails under `DATA_DIR`

## Trust boundaries

1. **Client → API**: bearer tokens are unsigned-by-client opaque strings; all
   authorization is server side. No client-supplied user id is trusted.
2. **Admin → `/api/admin/*`**: gated by a static `ADMIN_TOKEN` header. The token is
   compared in constant time and should be a long random value in production.
3. **Downloads**: `POST /api/downloads/:id` issues a short-lived signed URL bound to
   the video id; `/media/dl/...` verifies HMAC and expiry and refuses everything else.
4. **Ingest**: only admin-triggered; paths are resolved inside the content root, and
   ffmpeg/ffprobe are invoked with argument arrays (no shell interpolation).

## Threats and mitigations

| Threat | Mitigation |
| --- | --- |
| Forged session/user id | HMAC-signed tokens; server derives user from token only |
| Shared/leaked download links | 15-minute expiry, HMAC over id+expiry+filename |
| Path traversal in media serving | resolved path must stay under `DATA_DIR`; static handler rejects `..` |
| Malicious admin token guess | constant-time compare; use env-provided high-entropy token; rate-limit at the proxy |
| Untrusted uploaded media | ffprobe/ffmpeg validation; no thumbnail or metadata trust; shorts policy applied before publish |
| Stored XSS in admin UI | admin renders text via `textContent`, not `innerHTML` for user data |
| Token theft on device | keys live in MMKV (app-private); no tokens in logs; release build strips log interceptor |
| Cleartext HTTP in dev | documented dev default; set an HTTPS reverse proxy and a real `API_BASE_URL` for production |
| Third-party SDK data collection | only Firebase + Facebook, both optional and guarded; ad SDKs deliberately absent |
| Supply chain | dependencies pinned; CI builds from lockfile-free Gradle coordinates; no dynamic code loading |

## Explicit non-goals

- DRM or license enforcement for media you ingest (you own the rights).
- Protection against a rooted device reading its own MMKV storage.
- Anonymity against the analytics providers you enable.
- Protecting against a compromised ffmpeg or Node runtime.

## Operational guidance

- Serve behind TLS (Caddy/nginx) and keep `HOST=127.0.0.1` if co-located with a proxy.
- Rotate `APP_SECRET` to invalidate sessions and outstanding download links.
- Back up `data/owntube.sqlite` (catalog + prefs + history); media can be re-ingested.
- Restrict admin access by network or add an upstream auth layer.
