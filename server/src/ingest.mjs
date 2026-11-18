import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.mjs";
import { getDb, run, row, serializeVideo } from "./db.mjs";
import { probe, transcode } from "./media.mjs";

const MEDIA_EXT = new Set([".mp4", ".mov", ".mkv", ".webm", ".m4v"]);

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "video";
}

function uniqueId(base) {
  let id = base;
  let n = 2;
  while (row("SELECT id FROM videos WHERE id = ?", [id])) id = `${base}-${n++}`;
  return id;
}

function autoTags(file, explicit) {
  if (Array.isArray(explicit) && explicit.length) {
    return [...new Set(explicit.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
  }
  const base = path.basename(file, path.extname(file));
  const words = base.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  return [...new Set(["imported", ...words])].slice(0, 6);
}

export async function ingestFile(file, meta = {}, log = () => {}) {
  const info = await probe(file);
  const id = uniqueId(meta.id ? slugify(meta.id) : slugify(meta.title || path.basename(file)));
  const title = meta.title || path.basename(file, path.extname(file));
  const description = meta.description || "";
  const tags = autoTags(file, meta.tags);
  const explicitlyShort = meta.isShort === true || tags.includes("shorts");
  const isShort = explicitlyShort || (info.height > info.width && info.durationMs <= 180_000);
  const publishedAt = meta.publishedAt || new Date().toISOString();

  log(`transcoding ${id} (${info.width}x${info.height}, ${(info.durationMs / 1000).toFixed(1)}s)`);
  const paths = await transcode(file, id, info, log);

  const db = getDb();
  db.exec("BEGIN");
  try {
    run(
      `INSERT INTO videos
        (id, title, description, duration_ms, width, height, is_short, published_at, hls_path, mp4_path, thumb_path, views)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id, title, description, info.durationMs, info.width, info.height,
        isShort ? 1 : 0, publishedAt, paths.hls, paths.mp4, paths.thumb,
      ],
    );
    for (const tag of tags) {
      run("INSERT OR IGNORE INTO video_tags (video_id, tag) VALUES (?, ?)", [id, tag]);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return { ...serializeVideo(row("SELECT * FROM videos WHERE id = ?", [id])), sourceFile: file };
}

async function sidecarMeta(file) {
  const jsonPath = file.replace(/\.[a-z0-9]+$/i, ".json");
  try {
    return JSON.parse(await readFile(jsonPath, "utf8"));
  } catch {
    return {};
  }
}

export async function ingestDirectory(dir, log = () => {}) {
  const results = [];
  let entries = [];
  try {
    entries = await readdir(dir);
  } catch {
    return results;
  }
  for (const name of entries.sort()) {
    if (!MEDIA_EXT.has(path.extname(name).toLowerCase())) continue;
    const file = path.join(dir, name);
    const st = await stat(file);
    if (!st.isFile()) continue;
    const digest = createHash("sha256").update(name + st.size).digest("hex").slice(0, 8);
    const meta = await sidecarMeta(file);
    if (!meta.id) meta.id = `${slugify(name)}-${digest}`;
    if (row("SELECT id FROM videos WHERE id = ?", [meta.id])) {
      log(`skip ${name} (already ingested)`);
      continue;
    }
    results.push(await ingestFile(file, meta, log));
  }
  return results;
}

export function seedFromJson(dir) {
  return readFile(path.join(dir, "seed.json"), "utf8")
    .then((text) => JSON.parse(text))
    .catch(() => []);
}

export async function ingestSeeds(log = () => {}) {
  const seeds = await seedFromJson(config.seedDir);
  const results = [];
  for (const seed of seeds) {
    const file = path.join(config.seedDir, seed.file);
    const id = slugify(seed.id || seed.title || seed.file);
    const existing = row("SELECT id FROM videos WHERE id = ?", [id]);
    if (existing) continue;
    try {
      results.push(await ingestFile(file, { ...seed, id }, log));
    } catch (err) {
      log(`seed failed: ${seed.file}: ${err.message}`);
    }
  }
  return results;
}
