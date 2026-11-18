import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const root = await mkdtemp(path.join(tmpdir(), "owntube-test-"));
process.env.DATA_DIR = path.join(root, "data");
process.env.MEDIA_DIR = path.join(root, "data", "media");
process.env.WEB_DIR = path.join(root, "web");
process.env.ADMIN_TOKEN = "test-admin";
process.env.APP_SECRET = "test-secret";

const { ensureDirs, config } = await import("../src/config.mjs");
const { openDb, run, all, closeDb } = await import("../src/db.mjs");
const { createServer } = await import("../src/http.mjs");
const { issueUserToken } = await import("../src/auth.mjs");

ensureDirs();
await mkdir(path.join(config.webDir), { recursive: true });
await writeFile(path.join(config.webDir, "index.html"), "<h1>ok</h1>");

openDb(path.join(config.dataDir, "test.db"));

const now = new Date().toISOString();
const insert = (id, title, isShort, tags, opts = {}) => {
  run(`INSERT INTO videos (id,title,description,duration_ms,width,height,is_short,published_at,hls_path,mp4_path,thumb_path,views)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [
    id, title, opts.description || "", opts.durationMs ?? 120000,
    opts.width ?? 1280, opts.height ?? 720, isShort ? 1 : 0,
    opts.publishedAt ?? now, `/media/hls/${id}/master.m3u8`, `/media/mp4/${id}.mp4`, `/media/thumbs/${id}.webp`,
    opts.views ?? 0,
  ]);
  for (const tag of tags) run("INSERT INTO video_tags (video_id, tag) VALUES (?, ?)", [id, tag]);
};

insert("cook-1", "Cooking pasta", false, ["food", "howto"], { publishedAt: new Date(Date.now() - 86400000).toISOString() });
insert("cook-2", "Cooking bread", false, ["food", "baking"], { publishedAt: new Date(Date.now() - 3600000).toISOString() });
insert("space-1", "Space documentary", false, ["space", "science"], { publishedAt: new Date(Date.now() - 2 * 86400000).toISOString() });
insert("short-1", "Vertical teaser", true, ["food", "teaser"], { height: 1280, width: 720, durationMs: 15000 });

const mediaMp4 = path.join(config.mediaDir, "mp4", "cook-1.mp4");
await mkdir(path.dirname(mediaMp4), { recursive: true });
await writeFile(mediaMp4, Buffer.from("0123456789abcdef"));

run("INSERT INTO users (id, created_at) VALUES (?, ?)", ["user-1", now]);
const token = issueUserToken("user-1");

const server = createHttpServer(createServer());
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const get = (p, headers = {}) => fetch(base + p, { headers });
const auth = { authorization: `Bearer ${token}` };

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDb();
});

test("creates a session and rejects anonymous personalized routes", async () => {
  const res = await fetch(base + "/api/session", { method: "POST" });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.token);
  const me = await get("/api/me");
  assert.equal(me.status, 401);
});

test("health checks answer on both documented paths", async () => {
  for (const p of ["/healthz", "/api/health"]) {
    const res = await get(p);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  }
});

test("feed never returns shorts", async () => {
  const res = await get("/api/feed?limit=50");
  assert.equal(res.status, 200);
  const body = await res.json();
  const ids = body.items.map((v) => v.id);
  assert.ok(!ids.includes("short-1"));
  assert.ok(ids.includes("cook-1"));
});

test("preferences reorder the personalized feed", async () => {
  const save = await fetch(base + "/api/prefs", {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ tags: [{ tag: "space", position: 0 }, { tag: "food", position: 1 }] }),
  });
  assert.equal(save.status, 200);
  const body = await (await get("/api/feed?limit=10", auth)).json();
  assert.equal(body.items[0].id, "space-1");
});

test("muted tags disappear even when filtered", async () => {
  await fetch(base + "/api/prefs", {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ tags: [{ tag: "food", position: 0, muted: true }, { tag: "space", position: 1 }] }),
  });
  const body = await (await get("/api/feed?tags=food", auth)).json();
  assert.equal(body.items.length, 0);
});

test("search matches titles and tags but not shorts", async () => {
  const body = await (await get("/api/search?q=baking")).json();
  assert.deepEqual(body.items.map((v) => v.id), ["cook-2"]);
  const short = await (await get("/api/search?q=teaser")).json();
  assert.equal(short.items.length, 0);
});

test("download links are signed, single-video, and support ranges", async () => {
  const created = await fetch(base + "/api/downloads/cook-1", { method: "POST", headers: auth });
  assert.equal(created.status, 201);
  const info = await created.json();
  assert.match(info.url, /^\/media\/download\/cook-1\?/);

  const full = await fetch(base + info.url);
  assert.equal(full.status, 200);
  assert.equal(await full.text(), "0123456789abcdef");

  const partial = await fetch(base + info.url, { headers: { range: "bytes=2-5" } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get("content-range"), "bytes 2-5/16");
  assert.equal(await partial.text(), "2345");

  const tampered = await fetch(base + info.url.replace("sig=", "sig=x"));
  assert.equal(tampered.status, 403);
});

test("shorts cannot be downloaded", async () => {
  const res = await fetch(base + "/api/downloads/short-1", { method: "POST", headers: auth });
  assert.equal(res.status, 404);
});

test("there is no ads surface", async () => {
  for (const p of ["/api/ads", "/api/ads/config", "/ads.txt"]) {
    const res = await get(p);
    assert.equal(res.status, 404);
  }
});

test("admin routes require the token and can retag", async () => {
  const denied = await get("/api/admin/videos");
  assert.equal(denied.status, 401);
  const admin = { "x-admin-token": "test-admin" };
  const patched = await fetch(base + "/api/admin/videos/cook-2", {
    method: "PATCH",
    headers: { ...admin, "content-type": "application/json" },
    body: JSON.stringify({ tags: ["bread"], title: "Bread basics" }),
  });
  assert.equal(patched.status, 200);
  const body = await patched.json();
  assert.equal(body.title, "Bread basics");
  assert.deepEqual(body.tags, ["bread"]);
  const listed = await (await get("/api/admin/videos", admin)).json();
  assert.ok(listed.items.some((v) => v.id === "cook-2"));
});

test("history is recorded and completed videos leave the feed", async () => {
  const post = await fetch(base + "/api/history", {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ videoId: "cook-1", positionMs: 9000, completed: true }),
  });
  assert.equal(post.status, 200);
  const ids = (await (await get("/api/feed?limit=20", auth)).json()).items.map((v) => v.id);
  assert.ok(!ids.includes("cook-1"));
});

test("static app is served", async () => {
  const res = await get("/");
  assert.equal(res.status, 200);
  assert.match(await res.text(), /ok/);
});

const jsonPost = (p, body, headers = auth) => fetch(base + p, {
  method: "POST",
  headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify(body),
});

test("reactions update like and dislike counts", async () => {
  const before = await (await get("/api/videos/cook-1/social", auth)).json();
  assert.equal(before.likes, 0);
  assert.equal(before.myReaction, 0);

  const liked = await (await jsonPost("/api/videos/cook-1/reaction", { value: 1 })).json();
  assert.equal(liked.likes, 1);
  assert.equal(liked.myReaction, 1);

  const disliked = await (await jsonPost("/api/videos/cook-1/reaction", { value: -1 })).json();
  assert.equal(disliked.likes, 0);
  assert.equal(disliked.dislikes, 1);

  const cleared = await (await jsonPost("/api/videos/cook-1/reaction", { value: 0 })).json();
  assert.equal(cleared.dislikes, 0);
  assert.equal(cleared.myReaction, 0);
});

test("comments can be posted, listed and liked", async () => {
  const created = await jsonPost("/api/videos/cook-1/comments", { text: "Great recipe" });
  assert.equal(created.status, 201);
  const { comment } = await created.json();
  assert.equal(comment.author, "You");

  const list = await (await get("/api/videos/cook-1/comments", auth)).json();
  assert.equal(list.total, 1);
  assert.equal(list.items[0].id, comment.id);

  const liked = await (await jsonPost(`/api/comments/${comment.id}/like`, {})).json();
  assert.equal(liked.likes, 1);
  assert.equal(liked.liked, true);

  const social = await (await get("/api/videos/cook-1/social", auth)).json();
  assert.equal(social.comments, 1);
});

test("subscriptions drive the subscription feed", async () => {
  const sub = await jsonPost("/api/subscriptions", { tag: "bread" });
  assert.equal((await sub.json()).subscribed, true);

  const listed = await (await get("/api/subscriptions", auth)).json();
  assert.ok(listed.tags.some((t) => t.tag === "bread"));

  const feedBody = await (await get("/api/subscriptions/feed", auth)).json();
  assert.ok(feedBody.items.some((v) => v.id === "cook-2"));

  const social = await (await get("/api/videos/cook-2/social", auth)).json();
  assert.equal(social.channel.subscribed, true);
  assert.ok(social.channel.subscribers >= 1);

  const unsub = await jsonPost("/api/subscriptions", { tag: "bread", subscribed: false });
  assert.equal((await unsub.json()).subscribed, false);
});

test("playlists and watch later round-trip videos", async () => {
  const created = await jsonPost("/api/playlists", { name: "Dinner ideas" });
  assert.equal(created.status, 201);
  const playlist = await created.json();

  const added = await jsonPost(`/api/playlists/${playlist.id}/items`, { videoId: "cook-1" });
  assert.equal(added.status, 200);

  const detail = await (await get(`/api/playlists/${playlist.id}`, auth)).json();
  assert.equal(detail.playlist.count, 1);
  assert.equal(detail.items[0].id, "cook-1");

  const removed = await fetch(base + `/api/playlists/${playlist.id}/items/cook-1`, {
    method: "DELETE", headers: auth,
  });
  assert.equal(removed.status, 200);
  const emptied = await (await get(`/api/playlists/${playlist.id}`, auth)).json();
  assert.equal(emptied.items.length, 0);

  await jsonPost("/api/watch-later", { videoId: "space-1" });
  const later = await (await get("/api/watch-later", auth)).json();
  assert.deepEqual(later.items.map((v) => v.id), ["space-1"]);
  const cleared = await fetch(base + "/api/watch-later/space-1", { method: "DELETE", headers: auth });
  assert.equal(cleared.status, 200);
  assert.equal((await (await get("/api/watch-later", auth)).json()).items.length, 0);
});

test("history lists watched videos with progress", async () => {
  const body = await (await get("/api/history", auth)).json();
  const item = body.items.find((i) => i.video.id === "cook-1");
  assert.ok(item);
  assert.equal(item.completed, true);
  assert.equal(item.positionMs, 9000);
});
