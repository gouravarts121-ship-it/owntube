import { all, tagsFor, serializeVideo } from "./db.mjs";

function daysAgo(iso) {
  return Math.max(0, (Date.now() - Date.parse(iso)) / 86_400_000);
}

export function prefsFor(userId) {
  if (!userId) return [];
  return all(
    "SELECT tag, position, muted FROM tag_prefs WHERE user_id = ? ORDER BY position, tag",
    [userId],
  ).map((p) => ({ tag: p.tag, position: Number(p.position), muted: Boolean(p.muted) }));
}

export function tagCatalog(userId) {
  const rows = all(`
    SELECT t.tag, COUNT(*) AS videos
    FROM video_tags t
    JOIN videos v ON v.id = t.video_id
    WHERE v.is_short = 0
    GROUP BY t.tag
    ORDER BY videos DESC, t.tag
  `);
  const prefs = new Map(prefsFor(userId).map((p) => [p.tag, p]));
  return rows.map((r) => ({
    tag: r.tag,
    videos: r.videos,
    position: prefs.get(r.tag)?.position ?? null,
    muted: Boolean(prefs.get(r.tag)?.muted),
  }));
}

function watchedTagWeights(userId) {
  if (!userId) return new Map();
  const rows = all(`
    SELECT t.tag, COUNT(*) AS hits
    FROM history h
    JOIN video_tags t ON t.video_id = h.video_id
    WHERE h.user_id = ? AND h.updated_at >= datetime('now', '-30 days')
    GROUP BY t.tag
  `, [userId]);
  const out = new Map();
  for (const r of rows) out.set(r.tag, Math.min(1, r.hits / 5));
  return out;
}

export function feed({ userId = null, tags = [], cursor = 0, limit = 20 } = {}) {
  const prefs = prefsFor(userId);
  const muted = new Set(prefs.filter((p) => p.muted).map((p) => p.tag));
  const prefWeight = new Map(
    prefs.filter((p) => !p.muted).map((p) => [p.tag, 1 / (1 + p.position)]),
  );
  const filterTags = tags.map((t) => String(t).toLowerCase()).filter(Boolean);

  const completed = new Set(
    userId
      ? all("SELECT video_id FROM history WHERE user_id = ? AND completed = 1", [userId])
          .map((r) => r.video_id)
      : [],
  );
  const watched = watchedTagWeights(userId);

  const videos = all("SELECT * FROM videos WHERE is_short = 0");
  const scored = [];
  for (const video of videos) {
    if (completed.has(video.id)) continue;
    const videoTags = tagsFor(video.id);
    if (videoTags.some((t) => muted.has(t))) continue;
    if (filterTags.length && !filterTags.some((t) => videoTags.includes(t))) continue;

    let tagScore = 0;
    for (const tag of videoTags) {
      tagScore += prefWeight.get(tag) ?? 0.15;
      tagScore += (watched.get(tag) ?? 0) * 0.25;
    }
    const recency = Math.exp(-daysAgo(video.published_at) / 45);
    const popularity = Math.log10(1 + video.views) / 10;
    const jitter = 0;
    const score = tagScore + recency * 0.7 + popularity + jitter;
    scored.push({ video, score });
  }

  scored.sort((a, b) => b.score - a.score || a.video.id.localeCompare(b.video.id));
  const start = Math.max(0, Number(cursor) || 0);
  const page = scored.slice(start, start + limit);
  return {
    items: page.map(({ video, score }) => ({ ...serializeVideo(video), score: Number(score.toFixed(4)) })),
    nextCursor: start + limit < scored.length ? start + limit : null,
    total: scored.length,
  };
}

export function search(query, userId = null, options = {}) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const like = `%${q}%`;
  const params = [like, like, like];
  const clauses = ["v.is_short = 0", "(lower(v.title) LIKE ? OR lower(v.description) LIKE ? OR t.tag LIKE ?)"];

  const duration = String(options.duration || "");
  if (duration === "short") clauses.push("v.duration_ms > 0 AND v.duration_ms < 240000");
  else if (duration === "medium") clauses.push("v.duration_ms >= 240000 AND v.duration_ms <= 1200000");
  else if (duration === "long") clauses.push("v.duration_ms > 1200000");

  if (options.after) { clauses.push("v.published_at >= ?"); params.push(String(options.after)); }
  if (options.before) { clauses.push("v.published_at <= ?"); params.push(String(options.before)); }

  let order = "v.published_at DESC";
  if (options.sort === "oldest") order = "v.published_at ASC";
  else if (options.sort === "views") order = "v.views DESC, v.published_at DESC";
  else if (options.sort === "relevance") {
    order = "CASE WHEN lower(v.title) LIKE ? THEN 0 WHEN lower(v.description) LIKE ? THEN 1 ELSE 2 END, v.published_at DESC";
    params.push(like, like);
  }

  const rows = all(`
    SELECT DISTINCT v.* FROM videos v
    LEFT JOIN video_tags t ON t.video_id = v.id
    WHERE ${clauses.join(" AND ")}
    ORDER BY ${order}
    LIMIT 50
  `, params);
  return rows.map((v) => ({ ...serializeVideo(v), score: 0 }));
}
