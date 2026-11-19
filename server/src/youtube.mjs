import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.mjs";
import { getChannel, getDb, row, run, saveChannel, serializeVideo } from "./db.mjs";
import { channelViaYtdlp, resolveYouTube, searchViaYtdlp } from "./ytdlp.mjs";

const THUMB_PREFERENCE = ["maxres", "standard", "high", "medium", "default"];
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{6,20}$/;

export function youtubeApiKey() {
  if (config.youtubeApiKey) return config.youtubeApiKey;
  const stored = row("SELECT value FROM settings WHERE key = 'youtube_api_key'");
  return stored?.value || "";
}

export function youtubeConfigured() {
  return Boolean(youtubeApiKey());
}

export function youtubeKeySource() {
  if (config.youtubeApiKey) return "env";
  return youtubeApiKey() ? "database" : null;
}

export function setYouTubeApiKey(value) {
  const key = String(value || "").trim();
  if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(key)) throw apiError("invalid YouTube Data API key", 400);
  run(
    "INSERT INTO settings (key, value) VALUES ('youtube_api_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key],
  );
  return key;
}

export function clearYouTubeApiKey() {
  run("DELETE FROM settings WHERE key = 'youtube_api_key'");
}

function apiError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function requireKey() {
  const key = youtubeApiKey();
  if (!key) {
    throw apiError("YouTube Data API key not configured (set YOUTUBE_API_KEY)", 503);
  }
  return key;
}

async function getJson(endpoint, params) {
  const apiKey = requireKey();
  const url = new URL(`${config.youtubeApiBase}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  url.searchParams.set("key", apiKey);
  const res = await fetch(url, { headers: { accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `YouTube API error (HTTP ${res.status})`;
    throw apiError(message, res.status === 400 ? 400 : 502);
  }
  return data;
}

export function parseIsoDuration(iso) {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(iso || ""));
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match;
  const total =
    (Number(days || 0) * 24 + Number(hours || 0)) * 3600 +
    Number(minutes || 0) * 60 +
    Number(seconds || 0);
  return total * 1000;
}

function pickThumb(thumbnails = {}) {
  for (const key of THUMB_PREFERENCE) {
    if (thumbnails[key]?.url) return thumbnails[key];
  }
  return null;
}

export function youtubeRowId(youtubeId) {
  return `yt-${String(youtubeId).replace(/[^A-Za-z0-9_-]/g, "")}`.slice(0, 64);
}

function normalize(item) {
  const snippet = item.snippet || {};
  const content = item.contentDetails || {};
  const stats = item.statistics || {};
  const id = typeof item.id === "string" ? item.id : item.id?.videoId;
  return {
    youtubeId: id,
    title: snippet.title || "Untitled",
    description: snippet.description || "",
    channel: snippet.channelTitle || "",
    channelId: snippet.channelId || "",
    channelUrl: snippet.channelId ? `https://www.youtube.com/channel/${snippet.channelId}` : "",
    channelAvatar: "",
    publishedAt: snippet.publishedAt || new Date().toISOString(),
    durationMs: parseIsoDuration(content.duration),
    views: Number(stats.viewCount || 0),
    thumb: pickThumb(snippet.thumbnails)?.url || "",
    url: `https://www.youtube.com/watch?v=${id}`,
  };
}

function isImported(youtubeId) {
  return Boolean(row("SELECT id FROM videos WHERE id = ?", [youtubeRowId(youtubeId)]));
}

export async function searchYouTube({
  q, maxResults = 12, pageToken = "", order = "", duration = "", after = "", before = "", offset = 0,
} = {}) {
  const query = String(q || "").trim();
  if (!query) return { items: [], nextPageToken: null, totalResults: 0, query };
  const limit = Math.min(25, Math.max(1, Number(maxResults) || 12));
  if (!youtubeConfigured()) {
    const items = await searchViaYtdlp(query, limit, offset);
    return {
      items: items.map((item) => ({ ...item, imported: isImported(item.youtubeId) })),
      nextPageToken: null,
      totalResults: items.length,
      query,
      source: "ytdlp",
    };
  }
  const params = {
    part: "snippet",
    type: "video",
    maxResults: limit,
    q: query,
    pageToken,
  };
  if (["date", "viewCount", "rating", "relevance"].includes(order)) params.order = order;
  if (["short", "medium", "long"].includes(duration)) params.videoDuration = duration;
  if (after) params.publishedAfter = String(after);
  if (before) params.publishedBefore = String(before);
  const data = await getJson("search", params);
  const ids = (data.items || [])
    .map((item) => (typeof item.id === "string" ? item.id : item.id?.videoId))
    .filter(Boolean);
  let details = new Map();
  if (ids.length) {
    const videos = await getJson("videos", {
      part: "snippet,contentDetails,statistics",
      id: ids.join(","),
      maxResults: ids.length,
    });
    details = new Map((videos.items || []).map((v) => [v.id, v]));
  }
  const items = (data.items || []).map((item) => {
    const id = typeof item.id === "string" ? item.id : item.id?.videoId;
    const full = details.get(id) || { id, snippet: item.snippet };
    return { ...normalize(full), imported: isImported(id) };
  });
  return {
    items,
    nextPageToken: data.nextPageToken || null,
    totalResults: Number(data.pageInfo?.totalResults || items.length),
    query,
  };
}

export async function trendingYouTube({ maxResults = 12, regionCode = config.youtubeRegion } = {}) {
  const limit = Math.min(25, Math.max(1, Number(maxResults) || 12));
  if (!youtubeConfigured()) {
    const items = await searchViaYtdlp("trending music videos", limit);
    return {
      items: items.map((item) => ({ ...item, imported: isImported(item.youtubeId) })),
      source: "ytdlp",
    };
  }
  const data = await getJson("videos", {
    part: "snippet,contentDetails,statistics",
    chart: "mostPopular",
    regionCode: String(regionCode || "US").toUpperCase(),
    maxResults: limit,
  });
  return {
    items: (data.items || []).map((item) => ({ ...normalize(item), imported: isImported(item.id) })),
  };
}

async function downloadThumbnail(candidate, rowId) {
  if (!candidate?.url) return "";
  try {
    const res = await fetch(candidate.url);
    if (!res.ok) return "";
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) return "";
    let ext = "jpg";
    try {
      if (/\.png$/i.test(new URL(candidate.url).pathname)) ext = "png";
    } catch {
      return "";
    }
    const dir = path.join(config.mediaDir, "thumbs");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${rowId}.${ext}`), buffer);
    return `/media/thumbs/${rowId}.${ext}`;
  } catch {
    return "";
  }
}

export async function importYouTubeVideo(youtubeId) {
  const id = String(youtubeId || "").trim();
  if (!VIDEO_ID_RE.test(id)) throw apiError("invalid YouTube video id", 400);

  const rowId = youtubeRowId(id);
  const existing = row("SELECT * FROM videos WHERE id = ?", [rowId]);
  if (existing) return serializeVideo(existing);

  let meta;
  let thumbCandidate;
  let rawTags = [];
  if (youtubeConfigured()) {
    const data = await getJson("videos", {
      part: "snippet,contentDetails,statistics",
      id,
      maxResults: 1,
    });
    const item = (data.items || [])[0];
    if (!item) throw apiError("YouTube video not found", 404);
    meta = normalize(item);
    thumbCandidate = pickThumb(item.snippet?.thumbnails);
    rawTags = item.snippet?.tags || [];
  } else {
    const resolved = await resolveYouTube(`https://www.youtube.com/watch?v=${id}`);
    if (resolved.isLive) throw apiError("live videos are not supported", 400);
    meta = {
      youtubeId: id,
      title: resolved.title,
      description: resolved.description,
      channel: resolved.channel,
      channelId: resolved.channelId || "",
      channelUrl: resolved.channelUrl || "",
      channelAvatar: "",
      publishedAt: resolved.publishedAt,
      durationMs: resolved.durationMs,
      views: resolved.views,
      thumb: resolved.thumb,
      url: resolved.url,
    };
    thumbCandidate = { url: resolved.thumb };
  }
  const thumbPath = await downloadThumbnail(thumbCandidate, rowId);

  const tags = new Set();
  for (const raw of rawTags) {
    const tag = String(raw).trim().toLowerCase().slice(0, 40);
    if (tag) tags.add(tag);
    if (tags.size >= 12) break;
  }
  if (meta.channel) {
    tags.add(`channel:${String(meta.channel).trim().toLowerCase().slice(0, 40)}`);
  }
  tags.add("youtube");

  const db = getDb();
  db.exec("BEGIN");
  try {
    run(
      `INSERT INTO videos
        (id, title, description, duration_ms, width, height, is_short, published_at,
         hls_path, mp4_path, thumb_path, views, source, external_id, external_url,
         channel_id, channel_name, channel_url, channel_avatar)
       VALUES (?, ?, ?, ?, 0, 0, 0, ?, '', '', ?, ?, 'youtube', ?, ?, ?, ?, ?, '')`,
      [
        rowId, meta.title.slice(0, 300), meta.description.slice(0, 5000), meta.durationMs,
        meta.publishedAt, thumbPath, meta.views, id, meta.url,
        meta.channelId || "", meta.channel || "", meta.channelUrl || "",
      ],
    );
    for (const tag of tags) {
      run("INSERT OR IGNORE INTO video_tags (video_id, tag) VALUES (?, ?)", [rowId, tag]);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  if (meta.channelId) cacheChannelInfo(meta.channelId).catch(() => {});
  return serializeVideo(row("SELECT * FROM videos WHERE id = ?", [rowId]));
}

const channelCache = new Map();

export async function cacheChannelInfo(input) {
  const info = await channelViaYtdlp(input, 24);
  if (!info.id) return info;
  saveChannel(info);
  run("UPDATE videos SET channel_avatar = ? WHERE channel_id = ?", [info.avatar, info.id]);
  return info;
}

export async function channelInfo(input, { force = false } = {}) {
  const key = String(input || "").trim().toLowerCase();
  const cached = channelCache.get(key);
  if (!force && cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.data;
  const cachedDb = /^UC[A-Za-z0-9_-]{18,}$/.test(key) ? getChannel(key) : null;
  if (!force && cachedDb && Date.now() - Date.parse(cachedDb.updated_at) < 10 * 60 * 1000) {
    return { ...cachedDb, videos: [] };
  }
  const info = await cacheChannelInfo(input);
  channelCache.set(key, { at: Date.now(), data: info });
  return info;
}

export function youtubeIdFromInput(raw) {
  const value = String(raw || "").trim();
  if (VIDEO_ID_RE.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.searchParams.get("v")) return url.searchParams.get("v");
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    return VIDEO_ID_RE.test(last) ? last : "";
  } catch {
    return "";
  }
}
