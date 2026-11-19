import { config } from "./config.mjs";

const CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20260101.00.00",
    hl: "en",
    gl: "US",
  },
};

const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

async function next(payload) {
  const url = `https://www.youtube.com/youtubei/v1/next?key=${config.innertubeKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`YouTube comments request failed (${response.status})`);
  return response.json();
}

function collectTokens(value, tokens = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectTokens(item, tokens);
    return tokens;
  }
  if (value && typeof value === "object") {
    if (typeof value.continuation === "string" && value.continuation) tokens.push(value.continuation);
    for (const item of Object.values(value)) collectTokens(item, tokens);
  }
  return tokens;
}

function collectComments(value, rows = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectComments(item, rows);
    return rows;
  }
  if (value && typeof value === "object") {
    const payload = value.commentEntityPayload;
    if (payload?.properties?.content?.content) {
      rows.push({
        id: String(payload.properties.commentId || ""),
        author: String(payload.author?.displayName || "@viewer"),
        avatar: String(payload.author?.avatarThumbnailUrl || ""),
        body: String(payload.properties.content.content || ""),
        time: String(payload.properties.publishedTime || ""),
        likes: String(payload.toolbar?.likeCountNotliked || "0"),
        replies: String(payload.toolbar?.replyCount || "0"),
      });
    }
    for (const item of Object.values(value)) collectComments(item, rows);
  }
  return rows;
}

export async function youtubeComments(videoId, limit = 20) {
  const id = String(videoId || "").trim();
  if (!id) return [];
  const cached = cache.get(id);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.items;

  const initial = await next({ context: CONTEXT, videoId: id });
  const contents = initial?.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
  let token = "";
  for (const item of contents) {
    token = item?.itemSectionRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || "";
    if (token) break;
  }
  if (!token) {
    const tokens = collectTokens(initial);
    token = tokens.find((value) => /comments-sec/i.test(value)) || "";
  }
  if (!token) return [];

  const data = await next({ context: CONTEXT, continuation: token });
  const items = collectComments(data).slice(0, Math.max(1, Math.min(50, Number(limit) || 20)));
  cache.set(id, { at: Date.now(), items });
  return items;
}
