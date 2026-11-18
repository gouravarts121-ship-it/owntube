const state = {
  token: localStorage.getItem("owntube.token") || "",
  userId: localStorage.getItem("owntube.userId") || "",
  prefs: [],
  order: [],
  muted: new Set(),
  activeTags: new Set(),
  cursor: 0,
  feed: [],
  player: null,
  current: null,
  tagsLoaded: false,
};

const $ = (id) => document.getElementById(id);
const api = async (path, options = {}) => {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["content-type"] = "application/json";
  if (state.token) headers.authorization = `Bearer ${state.token}`;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

async function ensureSession() {
  if (state.token) {
    try {
      await api("/api/me");
      return;
    } catch {
      localStorage.removeItem("owntube.token");
      state.token = "";
    }
  }
  const session = await api("/api/session", { method: "POST" });
  state.token = session.token;
  state.userId = session.userId;
  localStorage.setItem("owntube.token", session.token);
  localStorage.setItem("owntube.userId", session.userId);
}

function fmtDuration(ms) {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function card(video) {
  const el = document.createElement("button");
  el.className = "card";
  el.type = "button";
  el.innerHTML = `
    <img loading="lazy" src="${video.thumb}" alt="" />
    <div class="body">
      <h3></h3>
      <div class="meta"><span>${fmtDuration(video.durationMs)}</span><span>${video.views} views</span></div>
      <div class="tags"></div>
    </div>`;
  el.querySelector("h3").textContent = video.title;
  el.querySelector(".tags").textContent = video.tags.map((t) => `#${t}`).join(" ");
  el.addEventListener("click", () => openPlayer(video));
  return el;
}

function renderFeed() {
  const feed = $("feed");
  feed.replaceChildren(...state.feed.map(card));
  $("feed-empty").classList.toggle("hidden", state.feed.length > 0);
  $("more").classList.toggle("hidden", state.cursor == null);
}

async function loadFeed({ append = false } = {}) {
  const params = new URLSearchParams({ limit: "24" });
  if (!append) {
    state.cursor = 0;
    state.feed = [];
  }
  if (state.cursor) params.set("cursor", String(state.cursor));
  if (state.activeTags.size) params.set("tags", [...state.activeTags].join(","));
  const data = await api(`/api/feed?${params}`);
  state.feed = append ? state.feed.concat(data.items) : data.items;
  state.cursor = data.nextCursor;
  renderFeed();
}

function renderActiveTags() {
  const box = $("active-tags");
  box.replaceChildren();
  const tags = [...state.activeTags];
  for (const tag of tags) {
    const chip = document.createElement("button");
    chip.className = "chip on";
    chip.textContent = `${tag} ✕`;
    chip.addEventListener("click", () => {
      state.activeTags.delete(tag);
      renderActiveTags();
      loadFeed();
    });
    box.append(chip);
  }
}

function renderPrefs(tags) {
  const list = $("tag-list");
  list.replaceChildren();
  const ordered = [...tags].sort((a, b) => {
    const pa = state.order.indexOf(a.tag);
    const pb = state.order.indexOf(b.tag);
    return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
  });
  for (const tag of ordered) {
    const row = document.createElement("div");
    row.className = "tag-row" + (state.muted.has(tag.tag) ? " muted-tag" : "");
    const name = document.createElement("span");
    name.textContent = `#${tag.tag}`;
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `${tag.videos} videos`;
    const mute = document.createElement("button");
    mute.className = "ghost";
    mute.textContent = state.muted.has(tag.tag) ? "Unmute" : "Mute";
    mute.addEventListener("click", () => {
      state.muted.has(tag.tag) ? state.muted.delete(tag.tag) : state.muted.add(tag.tag);
      renderPrefs(tags);
    });
    const controls = document.createElement("span");
    controls.className = "row";
    const up = document.createElement("button");
    up.className = "ghost";
    up.textContent = "↑";
    up.addEventListener("click", () => move(tag.tag, -1, tags));
    const down = document.createElement("button");
    down.className = "ghost";
    down.textContent = "↓";
    down.addEventListener("click", () => move(tag.tag, 1, tags));
    const filter = document.createElement("button");
    filter.className = "ghost";
    filter.textContent = state.activeTags.has(tag.tag) ? "Filter on" : "Filter";
    filter.addEventListener("click", () => {
      state.activeTags.has(tag.tag) ? state.activeTags.delete(tag.tag) : state.activeTags.add(tag.tag);
      renderActiveTags();
      loadFeed();
      renderPrefs(tags);
    });
    controls.append(up, down, filter, mute);
    row.append(name, count, controls, document.createElement("span"));
    list.append(row);
  }
}

function move(tag, delta, tags) {
  const order = state.order.filter((t) => t !== tag);
  const current = Math.max(0, state.order.indexOf(tag));
  const next = Math.min(order.length, Math.max(0, current + delta));
  order.splice(next, 0, tag);
  state.order = order;
  renderPrefs(tags);
}

async function savePrefs() {
  const tags = [...state.order].map((tag, position) => ({
    tag,
    position,
    muted: state.muted.has(tag),
  }));
  for (const tag of state.muted) {
    if (!state.order.includes(tag)) tags.push({ tag, position: tags.length, muted: true });
  }
  await api("/api/prefs", { method: "POST", body: JSON.stringify({ tags }) });
  $("prefs-status").textContent = "Saved";
  setTimeout(() => ($("prefs-status").textContent = ""), 1500);
  await loadFeed();
}

function openPlayer(video) {
  state.current = video;
  $("player-title").textContent = video.title;
  $("player-desc").textContent = video.description || "";
  $("player-tags").replaceChildren(...video.tags.map((tag) => {
    const span = document.createElement("span");
    span.className = "chip";
    span.textContent = `#${tag}`;
    return span;
  }));
  $("download-status").textContent = "";
  $("download").disabled = false;

  const el = $("video");
  if (state.player) {
    state.player.destroy();
    state.player = null;
  }
  const startAt = (video.progress?.positionMs || 0) / 1000;
  const save = () => {
    const payload = {
      videoId: video.id,
      positionMs: Math.round(el.currentTime * 1000),
      completed: el.duration ? el.currentTime / el.duration > 0.92 : false,
    };
    api("/api/history", { method: "POST", body: JSON.stringify(payload) }).catch(() => {});
  };
  el.addEventListener("pause", save, { once: false });
  el.addEventListener("ended", save, { once: false });

  if (window.Hls && window.Hls.isSupported()) {
    const hls = new window.Hls({ maxBufferLength: 30 });
    hls.loadSource(video.hls);
    hls.attachMedia(el);
    state.player = hls;
  } else {
    el.src = video.hls;
  }
  el.addEventListener("loadedmetadata", () => {
    if (startAt > 0 && startAt < el.duration - 5) el.currentTime = startAt;
    el.play().catch(() => {});
  }, { once: true });

  $("player").showModal();
}

async function closePlayer() {
  const el = $("video");
  if (state.current) {
    api("/api/history", {
      method: "POST",
      body: JSON.stringify({
        videoId: state.current.id,
        positionMs: Math.round(el.currentTime * 1000),
        completed: el.duration ? el.currentTime / el.duration > 0.92 : false,
      }),
    }).catch(() => {});
  }
  el.pause();
  el.removeAttribute("src");
  el.load();
  if (state.player) {
    state.player.destroy();
    state.player = null;
  }
  $("player").close();
}

async function download() {
  if (!state.current) return;
  $("download").disabled = true;
  $("download-status").textContent = "Preparing…";
  try {
    const info = await api(`/api/downloads/${state.current.id}`, { method: "POST" });
    const a = document.createElement("a");
    a.href = info.url;
    a.download = info.filename;
    document.body.append(a);
    a.click();
    a.remove();
    $("download-status").textContent = `Link valid until ${new Date(info.expiresAt).toLocaleTimeString()}`;
  } catch (err) {
    $("download-status").textContent = err.message;
  } finally {
    $("download").disabled = false;
  }
}

async function init() {
  await ensureSession();
  const me = await api("/api/me");
  state.prefs = me.prefs;
  state.order = me.prefs.filter((p) => !p.muted).sort((a, b) => a.position - b.position).map((p) => p.tag);
  state.muted = new Set(me.prefs.filter((p) => p.muted).map((p) => p.tag));
  renderPrefs(me.tags);
  state.tagsLoaded = true;
  await loadFeed();

  $("settings-toggle").addEventListener("click", () => $("settings").classList.toggle("hidden"));
  $("save-prefs").addEventListener("click", () => savePrefs().catch((e) => alert(e.message)));
  $("more").addEventListener("click", () => loadFeed({ append: true }));
  $("player-close").addEventListener("click", closePlayer);
  $("download").addEventListener("click", download);
  $("player").addEventListener("close", () => { if (state.player) { state.player.destroy(); state.player = null; } });
  $("search-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const q = $("search-input").value.trim();
    if (!q) return loadFeed();
    const data = await api(`/api/search?q=${encodeURIComponent(q)}`);
    state.feed = data.items;
    state.cursor = null;
    $("feed-empty").classList.toggle("hidden", state.feed.length > 0);
    renderFeed();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

init().catch((err) => {
  console.error(err);
  const hint =
    location.protocol === "file:"
      ? "Open the server URL (http://127.0.0.1:8787/) instead of the HTML file."
      : `Server: ${location.origin}. Start it with "npm start".`;
  $("feed-empty").textContent = `Cannot reach the server: ${err.message}. ${hint}`;
  $("feed-empty").classList.remove("hidden");
});
