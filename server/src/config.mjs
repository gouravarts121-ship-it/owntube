import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const env = process.env;

export const config = {
  port: Number(env.PORT || 8787),
  host: env.HOST || "127.0.0.1",
  dataDir: path.resolve(env.DATA_DIR || path.join(process.cwd(), "data")),
  mediaDir: path.resolve(env.MEDIA_DIR || path.join(process.cwd(), "data", "media")),
  webDir: path.resolve(env.WEB_DIR || path.join(process.cwd(), "web")),
  seedDir: path.resolve(env.SEED_DIR || path.join(process.cwd(), "content", "seed")),
  inboxDir: path.resolve(env.INBOX_DIR || path.join(process.cwd(), "content", "inbox")),
  adminToken: env.ADMIN_TOKEN || "dev-admin-token",
  secret: env.APP_SECRET || "dev-app-secret-change-me",
  publicUrl: env.PUBLIC_URL || "",
  ffmpeg: env.FFMPEG || "ffmpeg",
  ffprobe: env.FFPROBE || "ffprobe",
  downloadTtlSeconds: Number(env.DOWNLOAD_TTL_SECONDS || 900),
  hlsRenditions: (env.HLS_RENDITIONS || "720,360")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => b - a),
};

export function ensureDirs() {
  for (const dir of [
    config.dataDir,
    config.mediaDir,
    path.join(config.mediaDir, "hls"),
    path.join(config.mediaDir, "mp4"),
    path.join(config.mediaDir, "thumbs"),
    config.seedDir,
    config.inboxDir,
    path.join(homedir(), ".local", "state"),
  ]) {
    mkdirSync(dir, { recursive: true });
  }
}
