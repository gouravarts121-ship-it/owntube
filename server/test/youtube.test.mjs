import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { chmodSync } from "node:fs";
import { mkdtemp, mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const SAMPLE_ID = "abc123XYZ_-";

function snippet() {
  const thumb = `http://127.0.0.1:${upstreamPort}/thumb/high.jpg`;
  return {
    title: "How to build a rocket",
    description: "A sample video",
    channelTitle: "Example Channel",
    channelId: "chan-1",
    publishedAt: "2024-01-02T03:04:05Z",
    tags: ["Science", "Rockets"],
    thumbnails: { high: { url: thumb }, default: { url: thumb } },
  };
}

const upstream = createHttpServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const send = (status, body, type = "application/json") => {
    const payload = type === "application/json" ? JSON.stringify(body) : body;
    res.writeHead(status, { "content-type": type, "content-length": Buffer.byteLength(payload) });
    res.end(payload);
  };
  if (url.pathname === "/youtube/v3/search") {
    return send(200, {
      items: [{ id: { videoId: SAMPLE_ID }, snippet: snippet() }],
      pageInfo: { totalResults: 1 },
    });
  }
  if (url.pathname === "/youtube/v3/videos") {
    return send(200, {
      items: [{
        id: SAMPLE_ID,
        snippet: snippet(),
        contentDetails: { duration: "PT5M30S" },
        statistics: { viewCount: "1234" },
      }],
    });
  }
  if (url.pathname === "/thumb/high.jpg") {
    return send(200, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]), "image/jpeg");
  }
  return send(404, { error: "not found" });
});
await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
const upstreamPort = upstream.address().port;

const root = await mkdtemp(path.join(tmpdir(), "owntube-yt-"));
const fakeYtdlp = path.join(root, "fake-yt-dlp");
await writeFile(fakeYtdlp, [
  `#!${process.execPath}`,
  'if (process.argv.includes("--version")) { console.log("test"); process.exit(0); }',
  'if (process.argv.includes("-J")) { console.log(JSON.stringify({id:"abc123XYZ_-",title:"Fake",duration:5})); process.exit(0); }',
  'const i = process.argv.indexOf("-o");',
  'if (i >= 0) require("node:fs").writeFileSync(process.argv[i+1].replace("%(ext)s","mp4"), "x");',
  "",
].join("\n"), { mode: 0o755 });
chmodSync(fakeYtdlp, 0o755);
process.env.YTDLP = fakeYtdlp;
process.env.DATA_DIR = path.join(root, "data");
process.env.MEDIA_DIR = path.join(root, "data", "media");
process.env.WEB_DIR = path.join(root, "web");
process.env.ADMIN_TOKEN = "test-admin";
process.env.APP_SECRET = "test-secret";
process.env.YOUTUBE_API_KEY = "test-key";
process.env.YOUTUBE_API_BASE = `http://127.0.0.1:${upstreamPort}/youtube/v3`;

const { ensureDirs, config } = await import("../src/config.mjs");
const { openDb, all, closeDb, run } = await import("../src/db.mjs");
const { createServer } = await import("../src/http.mjs");
const { issueUserToken } = await import("../src/auth.mjs");

ensureDirs();
await mkdir(config.webDir, { recursive: true });
await writeFile(path.join(config.webDir, "index.html"), "<h1>ok</h1>");
openDb(path.join(config.dataDir, "yt.db"));

const now = new Date().toISOString();
run("INSERT INTO users (id, created_at) VALUES (?, ?)", ["user-1", now]);
const token = issueUserToken("user-1");

const server = createHttpServer(createServer());
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const get = (p, headers = {}) => fetch(base + p, { headers });
const auth = { authorization: `Bearer ${token}` };
const jsonPost = (p, body, headers = auth) => fetch(base + p, {
  method: "POST",
  headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify(body),
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => upstream.close(resolve));
  closeDb();
});

test("reports configuration status", async () => {
  const body = await (await get("/api/discover/youtube/config")).json();
  assert.equal(body.configured, true);
});

test("returns trending videos for the home row", async () => {
  const body = await (await get("/api/discover/youtube/trending?limit=6")).json();
  assert.equal(body.items.length, 1);
  const item = body.items[0];
  assert.equal(item.youtubeId, SAMPLE_ID);
  assert.equal(item.durationMs, 330000);
  assert.equal(item.views, 1234);
  assert.equal(item.thumb, `http://127.0.0.1:${upstreamPort}/thumb/high.jpg`);
});

test("stores a YouTube API key from the client", async () => {
  const denied = await jsonPost("/api/discover/youtube/config", { apiKey: "x" }, {});
  assert.equal(denied.status, 401);

  const invalid = await jsonPost("/api/discover/youtube/config", { apiKey: "not-a-key" });
  assert.equal(invalid.status, 400);

  const saved = await jsonPost("/api/discover/youtube/config", { apiKey: "AIzaSyExampleExampleExampleExample123" });
  assert.equal(saved.status, 200);
  const body = await saved.json();
  assert.equal(body.configured, true);
});

test("searches YouTube and merges duration and views", async () => {
  const body = await (await get("/api/discover/youtube?q=rocket")).json();
  assert.equal(body.items.length, 1);
  const item = body.items[0];
  assert.equal(item.youtubeId, SAMPLE_ID);
  assert.equal(item.title, "How to build a rocket");
  assert.equal(item.channel, "Example Channel");
  assert.equal(item.durationMs, 330000);
  assert.equal(item.views, 1234);
  assert.equal(item.imported, false);
  assert.equal(item.url, `https://www.youtube.com/watch?v=${SAMPLE_ID}`);
});

test("import requires a user session", async () => {
  const res = await jsonPost("/api/discover/youtube/import", { videoId: SAMPLE_ID }, {});
  assert.equal(res.status, 401);
});

test("imports metadata and thumbnail as an external entry", async () => {
  const res = await jsonPost("/api/discover/youtube/import", { videoId: SAMPLE_ID });
  assert.equal(res.status, 201);
  const { video } = await res.json();
  assert.equal(video.id, `yt-${SAMPLE_ID}`);
  assert.equal(video.source, "youtube");
  assert.equal(video.external, true);
  assert.equal(video.externalUrl, `https://www.youtube.com/watch?v=${SAMPLE_ID}`);
  assert.equal(video.hls, "");
  assert.equal(video.mp4, "");
  assert.equal(video.durationMs, 330000);
  assert.ok(video.tags.includes("youtube"));
  assert.ok(video.tags.includes("science"));
  assert.match(video.thumb, /^\/media\/thumbs\/yt-.+\.jpg$/);

  const thumbFile = path.join(config.mediaDir, "thumbs", `yt-${SAMPLE_ID}.jpg`);
  assert.ok((await stat(thumbFile)).isFile());

  const again = await (await get("/api/discover/youtube?q=rocket")).json();
  assert.equal(again.items[0].imported, true);
});

test("imported entries appear in search and feed but not downloads", async () => {
  const search = await (await get("/api/search?q=rocket")).json();
  assert.ok(search.items.some((v) => v.id === `yt-${SAMPLE_ID}`));

  const feed = await (await get("/api/feed?limit=20", auth)).json();
  assert.ok(feed.items.some((v) => v.id === `yt-${SAMPLE_ID}`));

  const detail = await (await get(`/api/videos/yt-${SAMPLE_ID}`)).json();
  assert.equal(detail.external, true);

  const download = await fetch(base + `/api/downloads/yt-${SAMPLE_ID}`, { method: "POST", headers: auth });
  assert.equal(download.status, 202);
  const preparing = await download.json();
  assert.ok(["queued", "running", "done"].includes(preparing.state));
});

test("importing twice is idempotent", async () => {
  const res = await jsonPost("/api/discover/youtube/import", { videoId: SAMPLE_ID });
  assert.equal(res.status, 201);
  const count = Number(
    all("SELECT COUNT(*) AS n FROM videos WHERE source = 'youtube'")[0].n,
  );
  assert.equal(count, 1);
});

test("rejects an invalid video id", async () => {
  const res = await jsonPost("/api/discover/youtube/import", { videoId: "!!" });
  assert.equal(res.status, 400);
});
