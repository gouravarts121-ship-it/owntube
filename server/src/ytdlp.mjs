import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { config } from "./config.mjs";
import { row, run } from "./db.mjs";

const jobs = new Map();
const queue = [];
const MAX_CONCURRENT = Number(process.env.YTDLP_CONCURRENCY || 1);
const MAX_JOBS = 100;
let active = 0;
let cachedVersion = null;
let versionCheckedAt = 0;

class YtdlpError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

function parseBytes(value) {
  const match = /^(\d+(?:\.\d+)?)\s*([KMGT]?)B?$/i.exec(String(value || "").trim());
  if (!match) return 800 * 1024 * 1024;
  const factors = { "": 1, K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 };
  return Number(match[1]) * (factors[match[2].toUpperCase()] || 1);
}

function humanBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}GiB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)}MiB`;
  return `${Math.round(bytes / 1024)}KiB`;
}

function safeId(value) {
  return String(value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
}

function youtubeUrlFor(video) {
  const id = String(video.external_id || "").trim();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
    throw new YtdlpError("this entry has no valid YouTube id", 400);
  }
  return `https://www.youtube.com/watch?v=${id}`;
}

function outputFile(videoId) {
  return path.join(config.mediaDir, "mp4", `${safeId(videoId)}.mp4`);
}

function runProcess(args, { timeoutMs = config.ytdlpTimeoutMs, onLine } = {}) {
  return new Promise((resolve, reject) => {
    let child;
    const cookieArgs = config.ytdlpCookies && existsSync(config.ytdlpCookies)
      ? ["--cookies", config.ytdlpCookies]
      : [];
    try {
      child = spawn(config.ytdlp, [...cookieArgs, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      reject(new YtdlpError(`could not start ${config.ytdlp}: ${err.message}`, 503));
      return;
    }
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new YtdlpError("yt-dlp timed out", 504));
    }, timeoutMs);
    const feed = (chunk, isErr) => {
      const text = chunk.toString();
      if (isErr) {
        stderr += text;
        if (stderr.length > 200_000) stderr = stderr.slice(-100_000);
      } else {
        stdout += text;
        if (stdout.length > 32 * 1024 * 1024) child.kill("SIGKILL");
      }
      if (onLine) {
        for (const line of text.split(/\r?\n/)) {
          if (!line) continue;
          const reason = onLine(line, isErr);
          if (reason && !settled) {
            settled = true;
            clearTimeout(timer);
            child.kill("SIGKILL");
            reject(new YtdlpError(reason, 413));
            return;
          }
        }
      }
    };
    child.stdout.on("data", (chunk) => feed(chunk, false));
    child.stderr.on("data", (chunk) => feed(chunk, true));
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new YtdlpError(`yt-dlp failed to start: ${err.message}`, 503));
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const tail = (stderr || stdout).trim().split(/\r?\n/).slice(-3).join(" ");
      reject(new YtdlpError(tail || `yt-dlp exited with code ${code}`, 502));
    });
  });
}

function trimJobs() {
  if (jobs.size <= MAX_JOBS) return;
  for (const [id, job] of jobs) {
    if (job.state === "done" || job.state === "error") jobs.delete(id);
    if (jobs.size <= MAX_JOBS) break;
  }
}

export async function ytdlpStatus() {
  const now = Date.now();
  if (cachedVersion && now - versionCheckedAt < 5 * 60 * 1000) {
    return { available: true, version: cachedVersion };
  }
  try {
    const { stdout } = await runProcess(["--version"], { timeoutMs: 10_000 });
    cachedVersion = stdout.trim();
    versionCheckedAt = now;
    return { available: true, version: cachedVersion };
  } catch (err) {
    cachedVersion = null;
    versionCheckedAt = now;
    return { available: false, version: null, error: err.message };
  }
}

export function preparedFile(video) {
  const file = video?.mp4_path
    ? path.join(config.mediaDir, video.mp4_path.replace(/^\/media\//, ""))
    : outputFile(video?.id);
  return existsSync(file) ? file : null;
}

export function prepareState(videoId) {
  const video = row("SELECT * FROM videos WHERE id = ?", [videoId]);
  if (!video) return { state: "missing", pct: 0, error: "not found", ready: false };
  if (preparedFile(video)) return { state: "done", pct: 100, error: null, ready: true };
  const job = jobs.get(videoId);
  if (!job) return { state: "idle", pct: 0, error: null, ready: false };
  return { state: job.state, pct: job.pct, error: job.error, ready: job.state === "done" };
}

export function startPrepare(videoId) {
  const video = row("SELECT * FROM videos WHERE id = ?", [videoId]);
  if (!video) throw new YtdlpError("video not found", 404);
  if ((video.source || "local") === "local") throw new YtdlpError("already a local video", 400);
  if (preparedFile(video)) return { state: "done", pct: 100, error: null, ready: true };
  const existing = jobs.get(videoId);
  if (existing) return { state: existing.state, pct: existing.pct, error: existing.error, ready: false };

  const job = { videoId, state: "queued", pct: 0, error: null, startedAt: Date.now() };
  jobs.set(videoId, job);
  trimJobs();
  queue.push(videoId);
  pump();
  return { state: job.state, pct: 0, error: null, ready: false };
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const videoId = queue.shift();
    const job = jobs.get(videoId);
    if (!job || job.state !== "queued") continue;
    active += 1;
    job.state = "running";
    runJob(job)
      .catch((err) => {
        job.state = "error";
        job.error = err.message;
      })
      .finally(() => {
        active -= 1;
        pump();
      });
  }
}

async function runJob(job) {
  const video = row("SELECT * FROM videos WHERE id = ?", [job.videoId]);
  if (!video) throw new YtdlpError("video not found", 404);
  const url = youtubeUrlFor(video);
  await mkdir(path.join(config.mediaDir, "mp4"), { recursive: true });
  const base = path.join(config.mediaDir, "mp4", `.tmp-${safeId(video.id)}-${randomUUID()}`);
  const pattern = `${base}.%(ext)s`;
  const target = outputFile(video.id);
  const height = Math.max(144, Number(config.ytdlpMaxHeight) || 720);
  const format = [
    `bv*[vcodec^=avc1][height<=${height}]+ba[acodec^=mp4a]`,
    `b[height<=${height}]`,
    `bv*[height<=${height}]+ba`,
    "b",
  ].join("/");

  try {
    const maxBytes = parseBytes(config.ytdlpMaxBytes);
    await runProcess([
      "--no-warnings",
      "--no-playlist",
      "--newline",
      "--no-mtime",
      "--no-part",
      `--max-filesize=${config.ytdlpMaxBytes}`,
      "-f", format,
      "--merge-output-format", "mp4",
      "--remux-video", "mp4",
      "-o", pattern,
      url,
    ], {
      onLine: (line) => {
        const size = /\[download\]\s+[\d.]+%\s+of\s+~?([\d.]+)\s*(KiB|MiB|GiB|TiB|B)\b/i.exec(line);
        if (size) {
          const factors = { B: 1, KIB: 1024, MIB: 1024 ** 2, GIB: 1024 ** 3, TIB: 1024 ** 4 };
          const total = Number(size[1]) * (factors[size[2].toUpperCase()] || 1);
          if (total > maxBytes) {
            return `video is ${humanBytes(total)}; the limit is ${humanBytes(maxBytes)} (raise YTDLP_MAX_BYTES to allow it)`;
          }
        }
        const match = /\[download\]\s+(\d+(?:\.\d+)?)%/.exec(line);
        if (match) job.pct = Math.min(99, Math.round(Number(match[1])));
        const stage = /\[(Merger|VideoRemuxer|FixupM3u8)\]/.exec(line);
        if (stage && job.pct < 95) job.pct = 95;
        return null;
      },
    });

    let produced = existsSync(`${base}.mp4`) ? `${base}.mp4` : null;
    if (!produced) {
      const candidates = ["mkv", "webm", "mov", "m4a", "mp4"];
      produced = candidates.map((ext) => `${base}.${ext}`).find((file) => existsSync(file)) || null;
    }
    if (!produced) throw new YtdlpError("yt-dlp finished without producing a file", 502);
    const info = await stat(produced);
    if (!info.size) throw new YtdlpError("downloaded file is empty", 502);
    if (info.size > maxBytes) {
      throw new YtdlpError("downloaded file is too large", 413);
    }
    await rm(target, { force: true });
    await rename(produced, target);
    run("UPDATE videos SET mp4_path = ? WHERE id = ?", [`/media/mp4/${safeId(video.id)}.mp4`, video.id]);
    job.state = "done";
    job.pct = 100;
  } catch (err) {
    job.state = "error";
    job.error = /confirm you.re not a bot|sign in/i.test(err.message)
      ? "YouTube asked for a sign-in check; try again later"
      : err.message;
    throw err;
  } finally {
    for (const ext of ["mp4", "mkv", "webm", "mov", "m4a", "part"]) {
      await rm(`${base}.${ext}`, { force: true }).catch(() => {});
    }
  }
}


function bestThumb(thumbnails = [], { square = false } = {}) {
  const list = (thumbnails || []).filter((item) => item?.url);
  if (!list.length) return "";
  const chosen = square
    ? (list.find((item) => String(item.id) === "7" || item.id === "avatar_uncropped")
      || list.find((item) => {
        const [w, h] = String(item.resolution || "").split("x").map(Number);
        return w > 0 && h > 0 && Math.abs(w - h) <= 8;
      })
      || list[list.length - 1])
    : (list.find((item) => String(item.id) === "0")
      || list.find((item) => Number(item.width) >= 640)
      || list[list.length - 1]);
  return String(chosen.url || "");
}

function normalizeEntry(entry, fallbackChannel = "") {
  const id = String(entry?.id || "");
  if (!id) return null;
  return {
    youtubeId: id,
    title: String(entry.title || "Untitled"),
    channel: String(entry.channel || fallbackChannel || ""),
    channelId: String(entry.channel_id || ""),
    channelUrl: String(entry.channel_url || ""),
    durationMs: Math.round(Number(entry.duration || 0) * 1000),
    views: Number(entry.view_count || 0),
    thumb: bestThumb(entry.thumbnails),
    url: String(entry.url || entry.webpage_url || `https://www.youtube.com/watch?v=${id}`),
  };
}

function channelUrlFor(input) {
  const value = String(input || "").trim();
  if (/^UC[A-Za-z0-9_-]{18,}$/.test(value)) return `https://www.youtube.com/channel/${value}/videos`;
  if (value.startsWith("@")) return `https://www.youtube.com/${value}/videos`;
  if (/^https?:\/\//i.test(value)) {
    let url;
    try { url = new URL(value); } catch { throw new YtdlpError("invalid channel URL", 400); }
    if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname)) {
      throw new YtdlpError("only YouTube channel URLs are supported", 400);
    }
    if (/\/(videos|streams|shorts|playlist)/.test(url.pathname)) return url.toString();
    return `${url.toString().replace(/\/$/, "")}/videos`;
  }
  return `https://www.youtube.com/@${encodeURIComponent(value.replace(/^@/, ""))}/videos`;
}

export async function searchViaYtdlp(query, limit = 12, offset = 0) {
  const q = String(query || "").trim();
  if (!q) return [];
  const count = Math.min(20, Math.max(1, Number(limit) || 12));
  const { stdout } = await runProcess([
    "-J", "--no-warnings", "--flat-playlist", "--no-playlist",
    "--playlist-end", String(count + Number(offset || 0)), `ytsearch${count + Number(offset || 0)}:${q}`,
  ], { timeoutMs: 150_000 });
  let data;
  try { data = JSON.parse(stdout); } catch { throw new YtdlpError("yt-dlp returned unreadable search results", 502); }
  const entries = ((data.entries || []).map((entry) => normalizeEntry(entry)).filter(Boolean));
  return entries.slice(Number(offset || 0), Number(offset || 0) + count);
}

export async function streamUrls(youtubeId) {
  const url = youtubeUrlFor({ external_id: youtubeId });
  const { stdout } = await runProcess([
    "-g", "--no-warnings",
    "-f", "bv*[vcodec^=avc1][height<=360]+ba[acodec^=mp4a]/bv*[height<=360]+ba/b",
    url,
  ], { timeoutMs: 90_000 });
  return stdout.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^https?:\/\//.test(line));
}

export async function channelViaYtdlp(input, limit = 24) {
  const url = channelUrlFor(input);
  const count = Math.min(40, Math.max(1, Number(limit) || 24));
  const { stdout } = await runProcess([
    "-J", "--no-warnings", "--flat-playlist", "--playlist-end", String(count), url,
  ], { timeoutMs: 180_000 });
  let data;
  try { data = JSON.parse(stdout); } catch { throw new YtdlpError("yt-dlp returned unreadable channel data", 502); }
  const avatar = bestThumb(data.thumbnails, { square: true });
  const banner = bestThumb(data.thumbnails);
  return {
    id: String(data.channel_id || data.id || ""),
    name: String(data.channel || data.title || ""),
    avatar,
    banner,
    followers: Number(data.channel_follower_count || 0),
    url: String(data.channel_url || url.replace(/\/videos$/, "")),
    videos: ((data.entries || []).map((entry) => normalizeEntry(entry, data.channel)).filter(Boolean)),
  };
}

export async function resolveYouTube(url) {
  const { stdout } = await runProcess([
    "-J", "--no-warnings", "--no-playlist", "--no-progress", url,
  ], { timeoutMs: 120_000 });
  let data;
  try {
    data = JSON.parse(stdout);
  } catch {
    throw new YtdlpError("yt-dlp returned unreadable metadata", 502);
  }
  if (!data || data._type === "playlist") throw new YtdlpError("playlists are not supported", 400);
  return {
    id: String(data.id || ""),
    title: String(data.title || "Untitled"),
    description: String(data.description || "").slice(0, 5000),
    durationMs: Math.round(Number(data.duration || 0) * 1000),
    channel: String(data.uploader || data.channel || ""),
    channelId: String(data.channel_id || ""),
    channelUrl: String(data.channel_url || ""),
    channelAvatar: "",
    views: Number(data.view_count || 0),
    publishedAt: data.timestamp
      ? new Date(Number(data.timestamp) * 1000).toISOString()
      : new Date().toISOString(),
    thumb: String(data.thumbnail || ""),
    url: String(data.webpage_url || url),
    isLive: Boolean(data.is_live),
  };
}

export { YtdlpError };
