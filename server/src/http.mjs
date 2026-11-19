import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "./config.mjs";
import { all, row, run, serializeVideo, tagsFor } from "./db.mjs";
import { feed, prefsFor, search, tagCatalog } from "./feed.mjs";
import {
  issueUserToken, newUserId, requireAdmin, requireUser, signDownload, verifyDownload,
} from "./auth.mjs";
import { ingestDirectory, ingestFile } from "./ingest.mjs";
import {
  channelInfo, clearYouTubeApiKey, importYouTubeVideo, searchYouTube, setYouTubeApiKey,
  trendingYouTube, youtubeConfigured, youtubeIdFromInput, youtubeKeySource,
} from "./youtube.mjs";
import { prepareState, preparedFile, startPrepare, streamUrls, ytdlpStatus } from "./ytdlp.mjs";
import { youtubeComments } from "./comments.mjs";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".mp4": "video/mp4",
  ".apk": "application/vnd.android.package-archive",
};

const json = (res, status, body, headers = {}) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    ...headers,
  });
  res.end(payload);
};

async function readBody(req, limit = 1024 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("body too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function safeJoin(root, urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const target = path.join(root, clean);
  return target.startsWith(root) ? target : null;
}

async function sendFile(req, res, file, { download = null } = {}) {
  let st;
  try {
    st = await stat(file);
  } catch {
    return json(res, 404, { error: "not found" });
  }
  if (!st.isFile()) return json(res, 404, { error: "not found" });

  const type = CONTENT_TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  const ext = path.extname(file).toLowerCase();
  const shell = [".html", ".js", ".css", ".webmanifest"].includes(ext);
  const headers = {
    "content-type": type,
    "accept-ranges": "bytes",
    "cache-control": ext === ".m3u8" ? "no-store" : shell ? "no-cache" : "public, max-age=3600",
  };
  if (download) headers["content-disposition"] = `attachment; filename="${download}"`;

  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const start = match && match[1] ? Number(match[1]) : 0;
    const end = match && match[2] ? Number(match[2]) : st.size - 1;
    if (!match || start > end || start >= st.size) {
      res.writeHead(416, { "content-range": `bytes */${st.size}` });
      return res.end();
    }
    const last = Math.min(end, st.size - 1);
    res.writeHead(206, {
      ...headers,
      "content-range": `bytes ${start}-${last}/${st.size}`,
      "content-length": last - start + 1,
    });
    return createReadStream(file, { start, end: last }).pipe(res);
  }

  res.writeHead(200, { ...headers, "content-length": st.size });
  createReadStream(file).pipe(res);
}

function normalizePrefs(body) {
  const tags = Array.isArray(body.tags) ? body.tags : [];
  return tags
    .filter((t) => t && typeof t.tag === "string")
    .slice(0, 100)
    .map((t, index) => ({
      tag: t.tag.trim().toLowerCase(),
      position: Number.isFinite(Number(t.position)) ? Number(t.position) : index,
      muted: t.muted ? 1 : 0,
    }))
    .filter((t) => t.tag);
}

export function createServer() {
  return async function handler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;
    const method = req.method || "GET";

    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "authorization, content-type, x-admin-token");
    res.setHeader("access-control-allow-methods", "GET, POST, PATCH, DELETE, OPTIONS");
    if (method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    try {
      if (pathname === "/healthz" || pathname === "/api/health") {
        return json(res, 200, { ok: true });
      }

      if (pathname === "/api/session" && method === "POST") {
        const id = newUserId();
        run("INSERT INTO users (id, created_at) VALUES (?, ?)", [id, new Date().toISOString()]);
        return json(res, 201, { userId: id, token: issueUserToken(id) });
      }

      if (pathname === "/api/me" && method === "GET") {
        const userId = requireUser(req);
        if (!userId || !row("SELECT id FROM users WHERE id = ?", [userId])) {
          return json(res, 401, { error: "unauthorized" });
        }
        return json(res, 200, {
          userId,
          tags: tagCatalog(userId),
          prefs: prefsFor(userId),
          history: all(
            "SELECT video_id AS videoId, position_ms AS positionMs, completed, updated_at AS updatedAt FROM history WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100",
            [userId],
          ).map((h) => ({ ...h, completed: Boolean(h.completed) })),
        });
      }

      if (pathname === "/api/tags" && method === "GET") {
        return json(res, 200, { tags: tagCatalog(requireUser(req)) });
      }

      if (pathname === "/api/feed" && method === "GET") {
        const userId = requireUser(req);
        const tags = (url.searchParams.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean);
        const cursor = Number(url.searchParams.get("cursor") || 0);
        const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
        return json(res, 200, feed({ userId, tags, cursor, limit }));
      }

      if (pathname === "/api/search" && method === "GET") {
        return json(res, 200, {
          items: search(url.searchParams.get("q") || "", requireUser(req), {
            sort: url.searchParams.get("sort") || "",
            duration: url.searchParams.get("duration") || "",
            after: url.searchParams.get("after") || "",
            before: url.searchParams.get("before") || "",
          }),
        });
      }

      if (pathname === "/api/prefs" && method === "POST") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const body = await readBody(req);
        const prefs = normalizePrefs(body);
        const db = (await import("./db.mjs")).getDb();
        db.exec("BEGIN");
        try {
          run("DELETE FROM tag_prefs WHERE user_id = ?", [userId]);
          for (const p of prefs) {
            run(
              "INSERT INTO tag_prefs (user_id, tag, position, muted) VALUES (?, ?, ?, ?)",
              [userId, p.tag, p.position, p.muted],
            );
          }
          db.exec("COMMIT");
        } catch (err) {
          db.exec("ROLLBACK");
          throw err;
        }
        return json(res, 200, { prefs: prefsFor(userId) });
      }

      const videoMatch = /^\/api\/videos\/([^/]+)$/.exec(pathname);
      if (videoMatch && method === "GET") {
        const video = row("SELECT * FROM videos WHERE id = ?", [videoMatch[1]]);
        if (!video) return json(res, 404, { error: "not found" });
        run("UPDATE videos SET views = views + 1 WHERE id = ?", [video.id]);
        const userId = requireUser(req);
        const progress = userId
          ? row("SELECT position_ms, completed FROM history WHERE user_id = ? AND video_id = ?", [userId, video.id])
          : null;
        return json(res, 200, {
          ...serializeVideo(video),
          progress: progress ? { positionMs: progress.position_ms, completed: Boolean(progress.completed) } : null,
        });
      }

      const prepareMatch = /^\/api\/videos\/([^/]+)\/prepare$/.exec(pathname);
      if (prepareMatch && (method === "GET" || method === "POST")) {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const id = prepareMatch[1];
        if (method === "POST") {
          try {
            startPrepare(id);
          } catch (err) {
            return json(res, err.status || 500, { error: err.message });
          }
        }
        return json(res, 200, { ...prepareState(id) });
      }

      if (pathname === "/api/media/ytdlp" && method === "GET") {
        return json(res, 200, await ytdlpStatus());
      }

      if (pathname === "/api/history" && method === "POST") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const body = await readBody(req);
        if (!row("SELECT id FROM videos WHERE id = ?", [String(body.videoId)])) {
          return json(res, 404, { error: "unknown video" });
        }
        run(`
          INSERT INTO history (user_id, video_id, position_ms, completed, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, video_id) DO UPDATE SET
            position_ms = excluded.position_ms,
            completed = excluded.completed,
            updated_at = excluded.updated_at
        `, [
          userId, String(body.videoId),
          Math.max(0, Math.round(Number(body.positionMs) || 0)),
          body.completed ? 1 : 0,
          new Date().toISOString(),
        ]);
        return json(res, 200, { ok: true });
      }

      const socialMatch = /^\/api\/videos\/([^/]+)\/social$/.exec(pathname);
      if (socialMatch && method === "GET") {
        const video = row("SELECT id FROM videos WHERE id = ?", [socialMatch[1]]);
        if (!video) return json(res, 404, { error: "not found" });
        const userId = requireUser(req);
        const counts = row(
          "SELECT SUM(value = 1) AS likes, SUM(value = -1) AS dislikes FROM reactions WHERE video_id = ?",
          [video.id],
        );
        const mine = userId
          ? row("SELECT value FROM reactions WHERE user_id = ? AND video_id = ?", [userId, video.id])
          : null;
        const tag = tagsFor(video.id)[0] || "owntube";
        const subscribers = row("SELECT COUNT(*) AS n FROM subscriptions WHERE tag = ?", [tag])?.n ?? 0;
        const videos = row("SELECT COUNT(*) AS n FROM video_tags WHERE tag = ?", [tag])?.n ?? 0;
        const comments = row("SELECT COUNT(*) AS n FROM comments WHERE video_id = ?", [video.id])?.n ?? 0;
        const subscribed = userId
          ? Boolean(row("SELECT 1 AS ok FROM subscriptions WHERE user_id = ? AND tag = ?", [userId, tag]))
          : false;
        return json(res, 200, {
          likes: Number(counts?.likes || 0),
          dislikes: Number(counts?.dislikes || 0),
          myReaction: mine ? Number(mine.value) : 0,
          comments: Number(comments),
          channel: {
            tag,
            name: tag,
            videos: Number(videos),
            subscribers: Number(subscribers),
            subscribed,
          },
        });
      }

      const reactionMatch = /^\/api\/videos\/([^/]+)\/reaction$/.exec(pathname);
      if (reactionMatch && method === "POST") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const video = row("SELECT id FROM videos WHERE id = ?", [reactionMatch[1]]);
        if (!video) return json(res, 404, { error: "not found" });
        const body = await readBody(req);
        const value = Number(body.value);
        if (value !== 1 && value !== -1 && value !== 0) {
          return json(res, 400, { error: "value must be 1, -1 or 0" });
        }
        if (value === 0) {
          run("DELETE FROM reactions WHERE user_id = ? AND video_id = ?", [userId, video.id]);
        } else {
          run(`
            INSERT INTO reactions (user_id, video_id, value, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, video_id) DO UPDATE SET
              value = excluded.value, updated_at = excluded.updated_at
          `, [userId, video.id, value, new Date().toISOString()]);
        }
        const counts = row(
          "SELECT SUM(value = 1) AS likes, SUM(value = -1) AS dislikes FROM reactions WHERE video_id = ?",
          [video.id],
        );
        return json(res, 200, {
          likes: Number(counts?.likes || 0),
          dislikes: Number(counts?.dislikes || 0),
          myReaction: value,
        });
      }

      const ytCommentsMatch = /^\/api\/videos\/([^/]+)\/comments\/youtube$/.exec(pathname);
      if (ytCommentsMatch && method === "GET") {
        const video = row("SELECT * FROM videos WHERE id = ?", [ytCommentsMatch[1]]);
        if (!video) return json(res, 404, { error: "not found" });
        if ((video.source || "local") === "local") return json(res, 200, { items: [] });
        try {
          const items = await youtubeComments(video.external_id || ytCommentsMatch[1]);
          return json(res, 200, { items });
        } catch (err) {
          return json(res, err.status || 502, { error: err.message });
        }
      }

      const commentsMatch = /^\/api\/videos\/([^/]+)\/comments$/.exec(pathname);
      if (commentsMatch) {
        const video = row("SELECT id FROM videos WHERE id = ?", [commentsMatch[1]]);
        if (!video) return json(res, 404, { error: "not found" });
        const userId = requireUser(req);
        if (method === "GET") {
          const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
          const offset = Math.max(0, Number(url.searchParams.get("cursor") || 0));
          const rows = all(`
            SELECT c.*, (SELECT COUNT(*) FROM comment_likes l WHERE l.comment_id = c.id) AS likes
            FROM comments c WHERE c.video_id = ? ORDER BY c.created_at DESC LIMIT ? OFFSET ?
          `, [video.id, limit, offset]);
          const total = Number(row("SELECT COUNT(*) AS n FROM comments WHERE video_id = ?", [video.id])?.n ?? 0);
          return json(res, 200, {
            total,
            nextCursor: offset + rows.length < total ? offset + rows.length : null,
            items: rows.map((c) => ({
              id: c.id,
              body: c.body,
              createdAt: c.created_at,
              author: c.user_id === userId ? "You" : `Viewer ${c.user_id.slice(0, 4)}`,
              likes: Number(c.likes || 0),
              liked: userId
                ? Boolean(row(
                  "SELECT 1 AS ok FROM comment_likes WHERE comment_id = ? AND user_id = ?",
                  [c.id, userId],
                ))
                : false,
            })),
          });
        }
        if (method === "POST") {
          if (!userId) return json(res, 401, { error: "unauthorized" });
          const body = await readBody(req);
          const text = String(body.text ?? body.body ?? "").trim().slice(0, 2000);
          if (!text) return json(res, 400, { error: "text required" });
          const id = randomUUID();
          const createdAt = new Date().toISOString();
          run(
            "INSERT INTO comments (id, video_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)",
            [id, video.id, userId, text, createdAt],
          );
          return json(res, 201, {
            comment: { id, body: text, createdAt, author: "You", likes: 0, liked: false },
          });
        }
      }

      const commentLikeMatch = /^\/api\/comments\/([^/]+)\/like$/.exec(pathname);
      if (commentLikeMatch && method === "POST") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const comment = row("SELECT id FROM comments WHERE id = ?", [commentLikeMatch[1]]);
        if (!comment) return json(res, 404, { error: "not found" });
        const existing = row(
          "SELECT 1 AS ok FROM comment_likes WHERE comment_id = ? AND user_id = ?",
          [comment.id, userId],
        );
        if (existing) {
          run("DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?", [comment.id, userId]);
        } else {
          run("INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)", [comment.id, userId]);
        }
        const likes = Number(
          row("SELECT COUNT(*) AS n FROM comment_likes WHERE comment_id = ?", [comment.id])?.n ?? 0,
        );
        return json(res, 200, { liked: !existing, likes });
      }

      if (pathname === "/api/subscriptions" && method === "GET") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const rows = all(`
          SELECT s.tag,
            (SELECT COUNT(*) FROM video_tags vt WHERE vt.tag = s.tag) AS videos,
            (SELECT COUNT(*) FROM subscriptions x WHERE x.tag = s.tag) AS subscribers
          FROM subscriptions s WHERE s.user_id = ? ORDER BY s.created_at DESC
        `, [userId]);
        return json(res, 200, {
          tags: rows.map((r) => ({
            tag: r.tag, videos: Number(r.videos), subscribers: Number(r.subscribers),
          })),
        });
      }

      if (pathname === "/api/subscriptions" && method === "POST") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const body = await readBody(req);
        const tag = String(body.tag || "").trim().toLowerCase().slice(0, 40);
        if (!tag) return json(res, 400, { error: "tag required" });
        const subscribed = body.subscribed !== false;
        if (subscribed) {
          run(
            "INSERT OR IGNORE INTO subscriptions (user_id, tag, created_at) VALUES (?, ?, ?)",
            [userId, tag, new Date().toISOString()],
          );
        } else {
          run("DELETE FROM subscriptions WHERE user_id = ? AND tag = ?", [userId, tag]);
        }
        return json(res, 200, { tag, subscribed });
      }

      if (pathname === "/api/subscriptions/feed" && method === "GET") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const tags = all("SELECT tag FROM subscriptions WHERE user_id = ?", [userId]).map((r) => r.tag);
        if (!tags.length) return json(res, 200, { items: [], nextCursor: null, total: 0 });
        const cursor = Number(url.searchParams.get("cursor") || 0);
        const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 24)));
        return json(res, 200, feed({ userId, tags, cursor, limit }));
      }

      if (pathname === "/api/playlists" && method === "GET") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const rows = all(`
          SELECT p.id, p.name, p.created_at,
            (SELECT COUNT(*) FROM playlist_items i WHERE i.playlist_id = p.id) AS count
          FROM playlists p WHERE p.user_id = ? ORDER BY p.created_at DESC
        `, [userId]);
        return json(res, 200, {
          items: rows.map((r) => ({
            id: r.id, name: r.name, createdAt: r.created_at, count: Number(r.count),
          })),
        });
      }

      if (pathname === "/api/playlists" && method === "POST") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const body = await readBody(req);
        const name = String(body.name || "").trim().slice(0, 100);
        if (!name) return json(res, 400, { error: "name required" });
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        run("INSERT INTO playlists (id, user_id, name, created_at) VALUES (?, ?, ?, ?)", [
          id, userId, name, createdAt,
        ]);
        return json(res, 201, { id, name, createdAt, count: 0 });
      }

      const playlistItemMatch = /^\/api\/playlists\/([^/]+)\/items\/([^/]+)$/.exec(pathname);
      if (playlistItemMatch && method === "DELETE") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const playlist = row("SELECT id FROM playlists WHERE id = ? AND user_id = ?", [
          playlistItemMatch[1], userId,
        ]);
        if (!playlist) return json(res, 404, { error: "not found" });
        run("DELETE FROM playlist_items WHERE playlist_id = ? AND video_id = ?", [
          playlist.id, playlistItemMatch[2],
        ]);
        return json(res, 200, { ok: true });
      }

      const playlistItemsMatch = /^\/api\/playlists\/([^/]+)\/items$/.exec(pathname);
      if (playlistItemsMatch && method === "POST") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const playlist = row("SELECT id FROM playlists WHERE id = ? AND user_id = ?", [
          playlistItemsMatch[1], userId,
        ]);
        if (!playlist) return json(res, 404, { error: "not found" });
        const body = await readBody(req);
        const video = row("SELECT id FROM videos WHERE id = ?", [String(body.videoId || "")]);
        if (!video) return json(res, 404, { error: "unknown video" });
        const position = Number(
          row("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM playlist_items WHERE playlist_id = ?", [
            playlist.id,
          ])?.p ?? 0,
        );
        run(`
          INSERT INTO playlist_items (playlist_id, video_id, position, added_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(playlist_id, video_id) DO NOTHING
        `, [playlist.id, video.id, position, new Date().toISOString()]);
        return json(res, 200, { ok: true, videoId: video.id });
      }

      const playlistMatch = /^\/api\/playlists\/([^/]+)$/.exec(pathname);
      if (playlistMatch) {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const playlist = row("SELECT * FROM playlists WHERE id = ? AND user_id = ?", [
          playlistMatch[1], userId,
        ]);
        if (!playlist) return json(res, 404, { error: "not found" });
        if (method === "GET") {
          const items = all(`
            SELECT v.* FROM playlist_items i JOIN videos v ON v.id = i.video_id
            WHERE i.playlist_id = ? ORDER BY i.position, i.added_at
          `, [playlist.id]).map((v) => serializeVideo(v));
          return json(res, 200, {
            playlist: { id: playlist.id, name: playlist.name, count: items.length },
            items,
          });
        }
        if (method === "DELETE") {
          run("DELETE FROM playlists WHERE id = ? AND user_id = ?", [playlist.id, userId]);
          return json(res, 200, { ok: true });
        }
      }

      if (pathname === "/api/watch-later" && method === "GET") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const items = all(`
          SELECT v.* FROM watch_later w JOIN videos v ON v.id = w.video_id
          WHERE w.user_id = ? ORDER BY w.added_at DESC
        `, [userId]).map((v) => serializeVideo(v));
        return json(res, 200, { items });
      }

      if (pathname === "/api/watch-later" && method === "POST") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const body = await readBody(req);
        const video = row("SELECT id FROM videos WHERE id = ?", [String(body.videoId || "")]);
        if (!video) return json(res, 404, { error: "unknown video" });
        run(`
          INSERT INTO watch_later (user_id, video_id, added_at) VALUES (?, ?, ?)
          ON CONFLICT(user_id, video_id) DO NOTHING
        `, [userId, video.id, new Date().toISOString()]);
        return json(res, 200, { ok: true, videoId: video.id });
      }

      const watchLaterMatch = /^\/api\/watch-later\/([^/]+)$/.exec(pathname);
      if (watchLaterMatch && method === "DELETE") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        run("DELETE FROM watch_later WHERE user_id = ? AND video_id = ?", [userId, watchLaterMatch[1]]);
        return json(res, 200, { ok: true });
      }

      if (pathname === "/api/history" && method === "GET") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const rows = all(`
          SELECT h.position_ms, h.completed, h.updated_at, v.*
          FROM history h JOIN videos v ON v.id = h.video_id
          WHERE h.user_id = ? ORDER BY h.updated_at DESC LIMIT 100
        `, [userId]);
        return json(res, 200, {
          items: rows.map((r) => ({
            video: serializeVideo(r),
            positionMs: Number(r.position_ms),
            completed: Boolean(r.completed),
            updatedAt: r.updated_at,
          })),
        });
      }

      const downloadMatch = /^\/api\/downloads\/([^/]+)$/.exec(pathname);
      if (downloadMatch && method === "POST") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const video = row("SELECT * FROM videos WHERE id = ? AND is_short = 0", [downloadMatch[1]]);
        if (!video) return json(res, 404, { error: "not found" });
        if ((video.source || "local") !== "local" && !preparedFile(video)) {
          try {
            startPrepare(video.id);
          } catch (err) {
            return json(res, err.status || 500, { error: err.message });
          }
          return json(res, 202, { state: "preparing", ...prepareState(video.id) });
        }
        const expiresAt = new Date(Date.now() + config.downloadTtlSeconds * 1000).toISOString();
        run("INSERT INTO downloads (id, user_id, video_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)", [
          randomUUID(), userId, video.id, new Date().toISOString(), expiresAt,
        ]);
        const sig = signDownload(video.id, userId, expiresAt);
        const query = new URLSearchParams({ exp: expiresAt, user: userId, sig });
        return json(res, 201, {
          url: `/media/download/${video.id}?${query}`,
          expiresAt,
          filename: `${video.id}.mp4`,
          sizeBytes: null,
        });
      }

      if (pathname.startsWith("/api/stream/") && method === "GET") {
        const id = pathname.slice("/api/stream/".length);
        const video = row("SELECT * FROM videos WHERE id = ?", [id]);
        if (!video || (video.source || "local") === "local") return json(res, 404, { error: "not found" });
        if (preparedFile(video)) {
          res.writeHead(302, { location: video.mp4_path || `/media/mp4/${id}.mp4` });
          res.end();
          return;
        }
        let urls = [];
        try {
          urls = await streamUrls(video.external_id);
        } catch (err) {
          return json(res, err.status || 502, { error: err.message });
        }
        if (urls.length === 1) {
          res.writeHead(302, { location: urls[0] });
          res.end();
          return;
        }
        if (urls.length >= 2) {
          res.writeHead(200, {
            "content-type": "video/mp4",
            "cache-control": "no-store",
            "accept-ranges": "none",
          });
          const child = spawn(config.ffmpeg, [
            "-hide_banner", "-loglevel", "error",
            "-i", urls[0], "-i", urls[1],
            "-map", "0:v:0", "-map", "1:a:0", "-c", "copy",
            "-movflags", "frag_keyframe+empty_moov", "-f", "mp4", "pipe:1",
          ], { stdio: ["ignore", "pipe", "pipe"] });
          let closed = false;
          const stop = () => { if (!closed) { closed = true; child.kill("SIGKILL"); } };
          req.on("close", stop);
          res.on("close", stop);
          child.stdout.pipe(res);
          child.stderr.resume();
          child.on("error", () => { if (!closed) { closed = true; res.destroy(); } });
          child.on("close", () => { if (!closed) res.end(); });
          return;
        }
        return json(res, 502, { error: "no playable stream found" });
      }

      if (pathname.startsWith("/media/download/")) {
        const id = pathname.slice("/media/download/".length);
        const exp = url.searchParams.get("exp") || "";
        const user = url.searchParams.get("user") || "";
        const sig = url.searchParams.get("sig") || "";
        if (!verifyDownload(sig, id, user, exp)) return json(res, 403, { error: "bad signature" });
        if (Date.parse(exp) < Date.now()) return json(res, 403, { error: "expired" });
        if (!row("SELECT id FROM downloads WHERE user_id = ? AND video_id = ?", [user, id])) {
          return json(res, 403, { error: "not issued" });
        }
        const video = row("SELECT * FROM videos WHERE id = ?", [id]);
        const relative = video?.mp4_path ? video.mp4_path.replace(/^\/media\//, "") : `mp4/${id}.mp4`;
        const file = safeJoin(config.mediaDir, relative);
        if (!file) return json(res, 403, { error: "forbidden" });
        return sendFile(req, res, file, { download: `${id}.mp4` });
      }

      if (pathname.startsWith("/media/")) {
        const relative = pathname.slice("/media/".length);
        let file = safeJoin(config.mediaDir, relative);
        const exists = async (target) => Boolean(target) && await stat(target).then(() => true, () => false);
        const master = /^hls\/([^/]+)\/master\.m3u8$/.exec(relative);
        if (master && !(await exists(file))) {
          const variant = safeJoin(config.mediaDir, `hls/${master[1]}/v0/index.m3u8`);
          if (await exists(variant)) {
            res.writeHead(200, {
              "content-type": "application/vnd.apple.mpegurl; charset=utf-8",
              "cache-control": "no-store",
            });
            res.end("#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=792000,RESOLUTION=640x360\nv0/index.m3u8\n");
            return;
          }
        }
        if (!file) return json(res, 403, { error: "forbidden" });
        return sendFile(req, res, file);
      }

      if (pathname === "/api/discover/youtube/config") {
        if (method === "GET") {
          return json(res, 200, { configured: youtubeConfigured(), source: youtubeKeySource() });
        }
        if (method === "POST") {
          const userId = requireUser(req);
          if (!userId) return json(res, 401, { error: "unauthorized" });
          const body = await readBody(req);
          try {
            if (body.clear === true) clearYouTubeApiKey();
            else setYouTubeApiKey(body.apiKey || body.key || "");
          } catch (err) {
            return json(res, err.status || 500, { error: err.message });
          }
          return json(res, 200, { configured: youtubeConfigured(), source: youtubeKeySource() });
        }
      }

      if (pathname.startsWith("/api/youtube/channels/") && method === "GET") {
        const input = decodeURIComponent(pathname.slice("/api/youtube/channels/".length));
        if (!input) return json(res, 400, { error: "channel id or URL required" });
        try {
          return json(res, 200, await channelInfo(input, {
            force: url.searchParams.get("refresh") === "1",
          }));
        } catch (err) {
          return json(res, err.status || 502, { error: err.message });
        }
      }

      if (pathname === "/api/youtube/channel" && method === "GET") {
        const input = url.searchParams.get("url") || "";
        if (!input) return json(res, 400, { error: "url required" });
        try {
          return json(res, 200, await channelInfo(input, {
            force: url.searchParams.get("refresh") === "1",
          }));
        } catch (err) {
          return json(res, err.status || 502, { error: err.message });
        }
      }

      if (pathname === "/api/discover/youtube/trending" && method === "GET") {
        if (!youtubeConfigured() && !(await ytdlpStatus()).available) {
          return json(res, 503, { error: "neither a YouTube API key nor yt-dlp is available", configured: false });
        }
        const result = await trendingYouTube({
          maxResults: Number(url.searchParams.get("limit") || 12),
          regionCode: url.searchParams.get("region") || undefined,
        });
        return json(res, 200, { ...result, configured: true });
      }

      if (pathname === "/api/discover/youtube" && method === "GET") {
        if (!youtubeConfigured() && !(await ytdlpStatus()).available) {
          return json(res, 503, { error: "neither a YouTube API key nor yt-dlp is available", configured: false });
        }
        const result = await searchYouTube({
          q: url.searchParams.get("q") || "",
          maxResults: Number(url.searchParams.get("limit") || 12),
          pageToken: url.searchParams.get("pageToken") || "",
          order: url.searchParams.get("order") || "",
          duration: url.searchParams.get("duration") || "",
          offset: Number(url.searchParams.get("offset") || 0),
          after: url.searchParams.get("after") || "",
          before: url.searchParams.get("before") || "",
        });
        return json(res, 200, { ...result, configured: true });
      }

      if (pathname === "/api/discover/youtube/import-url" && method === "POST") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const body = await readBody(req);
        const youtubeId = youtubeIdFromInput(body.url || body.videoId || "");
        if (!youtubeId) return json(res, 400, { error: "paste a valid YouTube URL or id" });
        const video = await importYouTubeVideo(youtubeId);
        return json(res, 201, { video });
      }

      if (pathname === "/api/discover/youtube/import" && method === "POST") {
        const userId = requireUser(req);
        if (!userId) return json(res, 401, { error: "unauthorized" });
        const body = await readBody(req);
        const youtubeId = youtubeIdFromInput(
          body.videoId || body.youtubeId || body.id || body.url || "",
        );
        if (!youtubeId) return json(res, 400, { error: "a valid YouTube video id or URL is required" });
        const video = await importYouTubeVideo(youtubeId);
        return json(res, 201, { video });
      }

      if (pathname.startsWith("/api/admin/")) {
        if (!requireAdmin(req)) return json(res, 401, { error: "admin token required" });

        if (pathname === "/api/admin/videos" && method === "GET") {
          return json(res, 200, {
            items: all("SELECT * FROM videos ORDER BY published_at DESC")
              .map((v) => serializeVideo(v)),
          });
        }

        const adminVideo = /^\/api\/admin\/videos\/([^/]+)$/.exec(pathname);
        if (adminVideo && method === "PATCH") {
          const video = row("SELECT * FROM videos WHERE id = ?", [adminVideo[1]]);
          if (!video) return json(res, 404, { error: "not found" });
          const body = await readBody(req);
          const db = (await import("./db.mjs")).getDb();
          db.exec("BEGIN");
          try {
            if (typeof body.title === "string") {
              run("UPDATE videos SET title = ? WHERE id = ?", [body.title.slice(0, 300), video.id]);
            }
            if (typeof body.description === "string") {
              run("UPDATE videos SET description = ? WHERE id = ?", [body.description.slice(0, 5000), video.id]);
            }
            if (typeof body.isShort === "boolean") {
              run("UPDATE videos SET is_short = ? WHERE id = ?", [body.isShort ? 1 : 0, video.id]);
            }
            if (Array.isArray(body.tags)) {
              run("DELETE FROM video_tags WHERE video_id = ?", [video.id]);
              for (const tag of body.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 30)) {
                run("INSERT OR IGNORE INTO video_tags (video_id, tag) VALUES (?, ?)", [video.id, tag]);
              }
            }
            db.exec("COMMIT");
          } catch (err) {
            db.exec("ROLLBACK");
            throw err;
          }
          return json(res, 200, serializeVideo(row("SELECT * FROM videos WHERE id = ?", [video.id])));
        }

        if (pathname === "/api/admin/ingest" && method === "POST") {
          const body = await readBody(req);
          const logs = [];
          const log = (line) => logs.push(line);
          if (body.file) {
            const video = await ingestFile(body.file, body.meta || {}, log);
            return json(res, 201, { ingested: [video], logs });
          }
          const ingested = await ingestDirectory(body.directory || config.inboxDir, log);
          return json(res, 201, { ingested, logs });
        }
      }

      if (method === "GET" || method === "HEAD") {
        const route = pathname === "/admin" || pathname === "/admin/" ? "admin.html" : pathname;
        const file = safeJoin(config.webDir, route === "/" ? "index.html" : route.slice(1));
        if (file) return sendFile(req, res, file);
      }

      return json(res, 404, { error: "not found" });
    } catch (err) {
      return json(res, 400, { error: err.message });
    }
  };
}
