import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { chmodSync } from "node:fs";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const root = await mkdtemp(path.join(tmpdir(), "owntube-media-"));
const fakeYtdlp = path.join(root, "fake-yt-dlp");
const fakeScript = [
  `#!${process.execPath}`,
  "const args = process.argv.slice(2);",
  'if (args.includes("--version")) { console.log("test-yt-dlp-1"); process.exit(0); }',
  'if (args.includes("-J")) {',
  "  console.log(JSON.stringify({",
  '    id: "testvideo", title: "Fake clip", duration: 12,',
  '    thumbnail: "https://example.test/t.jpg", view_count: 7,',
  '    timestamp: 1700000000, webpage_url: "https://www.youtube.com/watch?v=testvideo",',
  "  }));",
  "  process.exit(0);",
  "}",
  'const index = args.indexOf("-o");',
  "if (index >= 0) {",
  '  const out = args[index + 1].replace("%(ext)s", "mp4");',
  '  require("node:fs").writeFileSync(out, Buffer.from("FAKEMP4DATA"));',
  "}",
  'console.log("[download] 100% of 1B");',
  "",
].join("\n");
await writeFile(fakeYtdlp, fakeScript, { mode: 0o755 });
chmodSync(fakeYtdlp, 0o755);

process.env.DATA_DIR = path.join(root, "data");
process.env.MEDIA_DIR = path.join(root, "data", "media");
process.env.WEB_DIR = path.join(root, "web");
process.env.ADMIN_TOKEN = "test-admin";
process.env.APP_SECRET = "test-secret";
process.env.YTDLP = fakeYtdlp;
process.env.YTDLP_CONCURRENCY = "1";
delete process.env.YOUTUBE_API_KEY;

const { config, ensureDirs } = await import("../src/config.mjs");
const { openDb, closeDb, run } = await import("../src/db.mjs");
const { createServer } = await import("../src/http.mjs");
const { issueUserToken } = await import("../src/auth.mjs");

ensureDirs();
await mkdir(config.webDir, { recursive: true });
await writeFile(path.join(config.webDir, "index.html"), "<h1>ok</h1>");
openDb(path.join(config.dataDir, "app.db"));

const now = new Date().toISOString();
run("INSERT INTO users (id, created_at) VALUES (?, ?)", ["u1", now]);
const token = issueUserToken("u1");
const auth = { authorization: `Bearer ${token}` };
run(`INSERT INTO videos
  (id, title, description, duration_ms, published_at, hls_path, mp4_path, thumb_path, views, source, external_id, external_url)
  VALUES (?, ?, '', 300000, ?, '', '', '', 5, 'youtube', 'testvideo', ?)`,
  ["yt-testvideo", "Fake clip", now, "https://www.youtube.com/watch?v=testvideo"]);
run(`INSERT INTO videos
  (id, title, description, duration_ms, published_at, hls_path, mp4_path, thumb_path, views)
  VALUES ('short-1', 'Short clip', '', 100000, ?, '', '', '', 1)`, [now]);
run(`INSERT INTO videos
  (id, title, description, duration_ms, published_at, hls_path, mp4_path, thumb_path, views)
  VALUES ('long-1', 'Long clip', '', 2000000, ?, '', '', '', 99)`, [now]);

const server = createHttpServer(createServer());
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const get = (p, headers = {}) => fetch(base + p, { headers });
const post = (p, body, headers = auth) => fetch(base + p, {
  method: "POST", headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify(body || {}),
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDb();
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("reports yt-dlp availability", async () => {
  const body = await (await get("/api/media/ytdlp")).json();
  assert.equal(body.available, true);
  assert.equal(body.version, "test-yt-dlp-1");
});

test("imports a URL without a Data API key", async () => {
  const res = await post("/api/discover/youtube/import-url", { url: "https://www.youtube.com/watch?v=testvideo" });
  assert.equal(res.status, 201);
  const { video } = await res.json();
  assert.equal(video.id, "yt-testvideo");
  assert.equal(video.source, "youtube");
});

test("prepares external media for playback and download", async () => {
  const started = await post("/api/videos/yt-testvideo/prepare");
  assert.equal(started.status, 200);
  let status = null;
  for (let i = 0; i < 60; i += 1) {
    status = await (await get("/api/videos/yt-testvideo/prepare", auth)).json();
    if (status.ready || status.state === "error") break;
    await sleep(50);
  }
  assert.equal(status.state, "done", status.error || "");
  assert.equal(status.ready, true);

  const detail = await (await get("/api/videos/yt-testvideo", auth)).json();
  assert.equal(detail.mp4, "/media/mp4/yt-testvideo.mp4");
  assert.equal(detail.playable, true);
  assert.equal(detail.prepared, true);

  const download = await post("/api/downloads/yt-testvideo");
  assert.equal(download.status, 201);
  const { url } = await download.json();
  const file = await get(url);
  assert.equal(file.status, 200);
  assert.equal(await file.text(), "FAKEMP4DATA");
});

test("search filters by duration and sort", async () => {
  const shorts = await (await get("/api/search?q=clip&duration=short")).json();
  assert.deepEqual(shorts.items.map((v) => v.id).sort(), ["short-1"]);

  const longs = await (await get("/api/search?q=clip&duration=long")).json();
  assert.deepEqual(longs.items.map((v) => v.id).sort(), ["long-1"]);

  const byViews = await (await get("/api/search?q=clip&sort=views")).json();
  assert.equal(byViews.items[0].id, "long-1");
});
