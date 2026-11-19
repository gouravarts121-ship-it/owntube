import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { config } from "./config.mjs";

let db;

export function openDb(file = path.join(config.dataDir, "app.db")) {
  db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      duration_ms INTEGER NOT NULL DEFAULT 0,
      width INTEGER NOT NULL DEFAULT 0,
      height INTEGER NOT NULL DEFAULT 0,
      is_short INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL,
      hls_path TEXT NOT NULL,
      mp4_path TEXT NOT NULL,
      thumb_path TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS video_tags (
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      PRIMARY KEY (video_id, tag)
    );
    CREATE INDEX IF NOT EXISTS video_tags_tag ON video_tags(tag);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tag_prefs (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      muted INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, tag)
    );
    CREATE TABLE IF NOT EXISTS history (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      position_ms INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, video_id)
    );
    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS downloads_user ON downloads(user_id);
    CREATE TABLE IF NOT EXISTS reactions (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      value INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, video_id)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS comments_video ON comments(video_id, created_at);
    CREATE TABLE IF NOT EXISTS comment_likes (
      comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (comment_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, tag)
    );
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS playlist_items (
      playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL,
      PRIMARY KEY (playlist_id, video_id)
    );
    CREATE TABLE IF NOT EXISTS watch_later (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      added_at TEXT NOT NULL,
      PRIMARY KEY (user_id, video_id)
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '',
      banner TEXT NOT NULL DEFAULT '',
      followers INTEGER NOT NULL DEFAULT 0,
      url TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
  `);
  ensureColumn("videos", "source", "source TEXT NOT NULL DEFAULT 'local'");
  ensureColumn("videos", "external_id", "external_id TEXT");
  ensureColumn("videos", "external_url", "external_url TEXT");
  ensureColumn("videos", "channel_id", "channel_id TEXT");
  ensureColumn("videos", "channel_name", "channel_name TEXT");
  ensureColumn("videos", "channel_url", "channel_url TEXT");
  ensureColumn("videos", "channel_avatar", "channel_avatar TEXT");
  return db;
}

function ensureColumn(table, name, ddl) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

export function getDb() {
  if (!db) throw new Error("database not open");
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

export function row(sql, params = []) {
  return getDb().prepare(sql).get(...params);
}

export function all(sql, params = []) {
  return getDb().prepare(sql).all(...params);
}

export function run(sql, params = []) {
  return getDb().prepare(sql).run(...params);
}

export function tagsFor(videoId) {
  return all(
    "SELECT tag FROM video_tags WHERE video_id = ? ORDER BY tag",
    [videoId],
  ).map((r) => r.tag);
}

export function videoRow(videoId) {
  return row("SELECT * FROM videos WHERE id = ?", [videoId]);
}

export function getChannel(id) {
  return row("SELECT * FROM channels WHERE id = ?", [String(id || "")]);
}

export function saveChannel(info) {
  run(`INSERT INTO channels (id, name, avatar, banner, followers, url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, avatar=excluded.avatar,
      banner=excluded.banner, followers=excluded.followers, url=excluded.url,
      updated_at=excluded.updated_at`, [
    String(info.id || ""), String(info.name || ""), String(info.avatar || ""),
    String(info.banner || ""), Number(info.followers || 0), String(info.url || ""),
    new Date().toISOString(),
  ]);
}

export function serializeVideo(v) {
  if (!v) return null;
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    durationMs: v.duration_ms,
    width: v.width,
    height: v.height,
    isShort: Boolean(v.is_short),
    publishedAt: v.published_at,
    thumb: v.thumb_path,
    hls: v.hls_path,
    mp4: v.mp4_path,
    views: v.views,
    tags: tagsFor(v.id),
    source: v.source || "local",
    external: (v.source || "local") !== "local",
    playable: (v.source || "local") === "local" || Boolean(v.mp4_path),
    prepared: (v.source || "local") !== "local" && Boolean(v.mp4_path),
    externalId: v.external_id || null,
    externalUrl: v.external_url || null,
    channel: v.channel_name || "",
    channelId: v.channel_id || "",
    channelUrl: v.channel_url || "",
    channelAvatar: v.channel_avatar || "",
  };
}
