const app = document.getElementById("app");
const mediaHost = document.getElementById("media-host");
const toastEl = document.getElementById("toast");

const ICONS = {
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  subscriptions: "M20 8H4V6h16v2zm-2-6H6v2h12V2zm4 10v8c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2zm-6 4l-6-3.27v6.53L16 16z",
  library: "M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z",
  settings: "M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.08.49.12.64l2.11 1.65c-.04.32-.07.64-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z",
  search: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  close: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  play: "M8 5v14l11-7z",
  pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
  download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
  chevron: "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
  playlist: "M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm13-1v8l6-4z",
  thumbUp: "M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z",
  thumbDown: "M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z",
  bookmark: "M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 14-5-2.18L7 17V5h10v12zm-3-7h-2v2h-2v-2H8V8h2V6h2v2h2v2z",
  comment: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z",
  share: "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z",
  pip: "M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",
  send: "M2.01 21 23 12 2.01 3 2 10l15 2-15 2z",
  expandMore: "M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z",
  expandLess: "M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z",
  up: "M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z",
  down: "M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z",
  youtube: "M8 5v14l11-7z",
};

const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] || ICONS.play}"/></svg>`;

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "text") el.textContent = value;
    else if (key === "html") el.innerHTML = value;
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key.startsWith("on")) el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return el;
}

const PALETTE = ["#7C5CFF", "#E94F8A", "#2BB673", "#F4A340", "#4A90E2", "#E2574C", "#9B59B6", "#16A085"];
function hashName(name) {
  let hash = 0;
  for (const char of String(name)) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash);
}
const avatarColor = (name) => PALETTE[hashName(name) % PALETTE.length];
const avatar = (name, size = "") =>
  h("div", { class: `avatar ${size}`.trim(), style: `background:${avatarColor(name)}`, text: (name || "O").slice(0, 1).toUpperCase() });

const channelName = (tags = []) => (tags[0] ? tags[0].charAt(0).toUpperCase() + tags[0].slice(1) : "OwnTube");
const isExternal = (video) => Boolean(video && (video.external || (video.source && video.source !== "local")));
const videoChannel = (video) => video?.channel || channelName(video?.tags);
const channelKey = (video) => video?.channelId || videoChannel(video);
const isYouTubeChannel = (value) => /^UC[A-Za-z0-9_-]{18,}$/.test(String(value || "")) || /^@/.test(String(value || "")) || /youtube\.com/i.test(String(value || ""));

function fmtDuration(ms) {
  if (!ms || ms <= 0) return "";
  const total = Math.round(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

function fmtCount(value) {
  const count = Number(value) || 0;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return `${count}`;
}

function fmtViews(value) {
  return `${fmtCount(value)} views`;
}

function timeAgo(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

const state = {
  token: localStorage.getItem("owntube.token") || "",
  userId: localStorage.getItem("owntube.userId") || "",
  route: { name: "home", param: "" },
  tags: [],
  feed: [],
  cursor: 0,
  selected: new Set(),
  order: [],
  muted: new Set(),
  mini: null,
  youtubeConfigured: null,
  trending: [],
  trendingAt: 0,
  homeExtra: [],
  homeOffset: 0,
  homeLoading: false,
  refreshing: false,
  queue: [],
  autoplay: localStorage.getItem("owntube.autoplay") !== "0",
  audioOnly: localStorage.getItem("owntube.audioOnly") === "1",
  offline: new Set(JSON.parse(localStorage.getItem("owntube.offline") || "[]")),
  renderId: 0,
  commentText: "",
  search: { query: "", results: [], youtube: [], loading: false, message: "", duration: "", sort: "" },
};

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
      const me = await api("/api/me");
      state.userId = me.userId;
      return me;
    } catch {
      state.token = "";
      localStorage.removeItem("owntube.token");
      localStorage.removeItem("owntube.userId");
    }
  }
  const session = await api("/api/session", { method: "POST" });
  state.token = session.token;
  state.userId = session.userId;
  localStorage.setItem("owntube.token", session.token);
  localStorage.setItem("owntube.userId", session.userId);
  return api("/api/me");
}

let toastTimer = 0;
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

/* ---------------- media ---------------- */

const media = document.createElement("video");
media.playsInline = true;
media.setAttribute("playsinline", "");
media.preload = "metadata";
media.controls = false;
media.style.background = "#000";
mediaHost.append(media);

let hls = null;
let mediaErrorHandler = null;
let currentVideo = null;
let lastHistorySave = 0;

function saveHistory() {
  if (!currentVideo) return;
  const completed = media.duration ? media.currentTime / media.duration > 0.92 : false;
  api("/api/history", {
    method: "POST",
    body: JSON.stringify({ videoId: currentVideo.id, positionMs: Math.round(media.currentTime * 1000), completed }),
  }).catch(() => {});
  lastHistorySave = Date.now();
}

media.addEventListener("timeupdate", () => {
  updateMiniBar();
  updateSeekUI();
  if (Date.now() - lastHistorySave > 8000) saveHistory();
});
media.addEventListener("ended", () => {
  saveHistory();
  if (!state.autoplay || state.route.name !== "player") return;
  const next = state.queue.find((id) => id !== currentVideo?.id);
  if (next) navigate(`player/${encodeURIComponent(next)}`);
});
if ("mediaSession" in navigator) {
  const actions = {
    play: () => media.play().catch(() => {}),
    pause: () => media.pause(),
    previoustrack: () => {
      const index = state.queue.indexOf(currentVideo?.id);
      if (index > 0) navigate(`player/${encodeURIComponent(state.queue[index - 1])}`);
    },
    nexttrack: () => {
      const next = state.queue.find((id) => id !== currentVideo?.id);
      if (next) navigate(`player/${encodeURIComponent(next)}`);
    },
  };
  for (const [action, handler] of Object.entries(actions)) {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
  }
}
media.addEventListener("pause", saveHistory);
media.addEventListener("ended", () => {
  saveHistory();
  if (state.mini) syncMiniButton();
});
media.addEventListener("play", () => {
  if (state.mini) syncMiniButton();
});
media.addEventListener("loadedmetadata", updateSeekUI);
media.addEventListener("durationchange", updateSeekUI);

function loadVideo(video, { autoplay = true } = {}) {
  const nextSource = video.hls || video.mp4;
  const sameSource = nextSource === (currentVideo?.hls || currentVideo?.mp4);
  if (currentVideo?.id === video.id && sameSource && (media.currentSrc || media.src)) {
    if (autoplay) media.play().catch(() => {});
    return;
  }
  currentVideo = video;
  state.mini = video;
  if ("mediaSession" in navigator && typeof MediaMetadata !== "undefined") {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: video.title,
        artist: videoChannel(video),
        artwork: video.thumb ? [{ src: video.thumb }] : [],
      });
    } catch {}
  }
  if (hls) {
    hls.destroy();
    hls = null;
  }
  if (mediaErrorHandler) {
    media.removeEventListener("error", mediaErrorHandler);
    mediaErrorHandler = null;
  }
  media.pause();
  media.removeAttribute("src");
  media.load();

  const startAt = (video.progress?.positionMs || 0) / 1000;
  const onMeta = () => {
    if (startAt > 0 && startAt < media.duration - 5) media.currentTime = startAt;
    if (autoplay) media.play().catch(() => {});
    media.removeEventListener("loadedmetadata", onMeta);
    updateSeekUI();
  };
  media.addEventListener("loadedmetadata", onMeta);

  const source = video.hls || video.mp4;
  let fallbackDone = false;
  const useFallback = () => {
    if (fallbackDone || !video.mp4 || video.mp4 === source) {
      toast("This video could not be played. Try again or open another video.");
      return;
    }
    fallbackDone = true;
    if (hls) {
      hls.destroy();
      hls = null;
    }
    if (mediaErrorHandler) {
      media.removeEventListener("error", mediaErrorHandler);
      mediaErrorHandler = null;
    }
    media.src = video.mp4;
    media.load();
    media.play().catch(() => {});
  };
  const onError = () => useFallback();
  mediaErrorHandler = onError;
  media.addEventListener("error", onError);
  if (window.Hls && window.Hls.isSupported() && /\.m3u8($|\?)/.test(source)) {
    hls = new window.Hls({ maxBufferLength: 30 });
    hls.on(window.Hls.Events.ERROR, (_event, data) => {
      if (data && data.fatal) useFallback();
    });
    hls.loadSource(source);
    hls.attachMedia(media);
  } else {
    media.src = source;
  }
  updateMiniBar();
}

function stopPlayback() {
  saveHistory();
  media.pause();
  media.removeAttribute("src");
  media.load();
  if (mediaErrorHandler) {
    media.removeEventListener("error", mediaErrorHandler);
    mediaErrorHandler = null;
  }
  if (hls) {
    hls.destroy();
    hls = null;
  }
  currentVideo = null;
  state.mini = null;
}

function updateSeekUI() {
  const row = app.querySelector("[data-seek]");
  if (!row) return;
  const input = row.querySelector("input");
  const current = row.querySelector("[data-cur]");
  const total = row.querySelector("[data-dur]");
  const duration = Number.isFinite(media.duration) ? media.duration : 0;
  if (current) current.textContent = fmtDuration(media.currentTime * 1000) || "0:00";
  if (total) total.textContent = fmtDuration(duration * 1000) || "0:00";
  if (input && !input.dataset.dragging) {
    input.value = duration > 0 ? String((media.currentTime / duration) * 1000) : "0";
  }
}

/* ---------------- formatting / cards ---------------- */

function thumb(video, extraClass = "") {
  const el = h("div", { class: `thumb ${extraClass}`.trim() });
  if (video.thumb) {
    el.append(h("img", { src: video.thumb, alt: "", loading: "lazy" }));
  }
  const duration = fmtDuration(video.durationMs);
  if (duration) el.append(h("span", { class: "dur", text: duration }));
  return el;
}

function videoCard(video) {
  const channel = videoChannel(video);
  const meta = [
    isExternal(video) ? "▶ YouTube" : "",
    channel,
    fmtViews(video.views),
    timeAgo(video.publishedAt),
  ].filter(Boolean).join("  •  ");
  return h("button", { class: "vcard", onclick: () => openVideo(video) },
    thumb(video),
    h("div", { class: "vrow" },
      avatar(channel),
      h("div", { class: "vtext" },
        h("div", { class: "vtitle", text: video.title }),
        h("div", { class: "vmeta", text: meta }),
      ),
    ),
  );
}

function compactCard(video, { resumeAt = 0 } = {}) {
  const channel = videoChannel(video);
  const parts = [];
  if (isExternal(video)) parts.push("▶ YouTube");
  parts.push(fmtViews(video.views), timeAgo(video.publishedAt));
  const card = h("button", { class: "compact", onclick: () => openVideo(video) },
    thumb(video),
    h("div", { class: "vtext" },
      h("div", { class: "vtitle", text: video.title }),
      h("div", { class: "vsub", text: channel }),
      h("div", { class: "vmeta", text: parts.filter(Boolean).join("  •  ") }),
    ),
  );
  if (resumeAt > 0) {
    const wrap = h("div", {},
      card,
      h("div", { class: "vmeta", style: "padding:0 0 6px 16px", text: `Resume at ${fmtDuration(resumeAt)}` }),
    );
    return wrap;
  }
  return card;
}

function skeletons(count = 4) {
  return Array.from({ length: count }, () => {
    const el = h("div", { class: "vcard skeleton" },
      h("div", { class: "thumb" }),
      h("div", { class: "sk-row" },
        h("div", { class: "sk-avatar" }),
        h("div", { class: "sk-lines" },
          h("div", { class: "sk-line" }),
          h("div", { class: "sk-line short" }),
        ),
      ),
    );
    return el;
  });
}

function openVideo(video) {
  navigate(`player/${encodeURIComponent(video.id)}`);
}

async function importAndPlay(youtubeId) {
  try {
    const data = await api("/api/discover/youtube/import", {
      method: "POST",
      body: JSON.stringify({ videoId: youtubeId }),
    });
    const video = data.video || data;
    if (!video?.id) throw new Error("import returned no video");
    navigate(`player/${encodeURIComponent(video.id)}`);
  } catch (err) {
    toast(err.message);
  }
}

/* ---------------- routing ---------------- */

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [name, ...rest] = raw.split("/");
  return { name: name || "home", param: decodeURIComponent(rest.join("/")) };
}

function navigate(path) {
  const next = `#/${path}`;
  if (location.hash === next) render();
  else location.hash = next;
}

window.addEventListener("hashchange", () => render());

function home() {
  mediaHost.append(media);
  const route = { name: "home" };
  state.route = route;
  renderHome();
}

function tabNav(active) {
  const items = [
    ["home", "Home", "home"],
    ["subscriptions", "Subscriptions", "subscriptions"],
    ["library", "You", "library"],
    ["settings", "Settings", "settings"],
  ];
  const nav = h("nav", { class: "bottomnav" });
  for (const [route, label, iconName] of items) {
    nav.append(h("button", { class: `navitem ${active === route ? "on" : ""}`, onclick: () => navigate(route !== "home" ? route : "home") },
      h("span", { class: "ind", html: icon(iconName) }),
      h("span", { text: label }),
    ));
  }
  return nav;
}

function miniPlayer() {
  if (!state.mini) return null;
  const video = state.mini;
  const el = h("div", { class: "mini" },
    h("div", { class: "mini-row", onclick: () => navigate(`player/${encodeURIComponent(video.id)}`) },
      thumb(video),
      h("div", { class: "vtext" },
        h("div", { class: "vtitle", text: video.title }),
        h("div", { class: "vsub", text: channelName(video.tags) }),
      ),
      h("button", { class: "iconbtn", "data-mini-toggle": "", onclick: (event) => {
        event.stopPropagation();
        if (media.paused) media.play().catch(() => {});
        else media.pause();
      }, html: icon(media.paused ? "play" : "pause") }),
      h("button", { class: "iconbtn", onclick: (event) => {
        event.stopPropagation();
        stopPlayback();
        render();
      }, html: icon("close") }),
    ),
    h("div", { class: "mini-bar" }, h("span", { "data-mini-bar": "" })),
  );
  return el;
}

function appendMini(token = state.renderId) {
  if (!state.mini || token !== state.renderId) return;
  if (state.route.name === "player") return;
  app.append(miniPlayer());
}

function syncMiniButton() {
  const button = app.querySelector("[data-mini-toggle]");
  if (button) button.innerHTML = icon(media.paused ? "play" : "pause");
}

function updateMiniBar() {
  const bar = app.querySelector("[data-mini-bar]");
  if (!bar) return;
  const duration = Number.isFinite(media.duration) ? media.duration : 0;
  bar.style.width = duration > 0 ? `${Math.min(100, (media.currentTime / duration) * 100)}%` : "0";
}

function shell(content, { tab = null, bare = false, mini = false } = {}) {
  const screen = h("div", { class: `screen ${bare ? "bare" : ""}`.trim() }, content);
  app.replaceChildren(screen);
  if (tab) screen.after(tabNav(tab));
  if (mini && state.mini) screen.after(miniPlayer());
  return screen;
}

async function render() {
  state.route = parseRoute();
  const token = ++state.renderId;
  mediaHost.append(media);
  if (state.mini) syncMiniButton();
  try {
    const route = state.route;
    if (route.name === "player") return await renderPlayer(route.param, token);
    if (route.name === "search") return await renderSearch(token);
    if (route.name === "subscriptions") return await renderSubscriptions(token);
    if (route.name === "library") return await renderLibrary(token);
    if (route.name === "settings") return await renderSettings(token);
    if (route.name === "channel") return await renderChannel(route.param, token);
    if (route.name === "playlist") return await renderPlaylist(route.param, token);
    if (route.name === "downloads") return await renderDownloads(token);
    if (route.name === "discover") return await renderDiscover(token);
    return await renderHome(token);
  } catch (err) {
    if (token !== state.renderId) return;
    console.error(err);
    shell(h("div", { class: "error-text", text: `Cannot reach the server: ${err.message}. Start it with "npm start".` }));
  }
}

/* ---------------- home ---------------- */

async function renderHome(token = state.renderId) {
  const screen = h("div", { class: "screen" });
  screen.append(
    h("header", { class: "topbar" },
      h("span", { class: "brand-badge", text: "▶" }),
      h("span", { class: "brand", text: "OwnTube" }),
      h("span", { class: "spacer" }),
      h("button", { class: "iconbtn", "aria-label": "Search", onclick: () => navigate("search"), html: icon("search") }),
    ),
    h("div", { class: "pills", "data-pills": "" }),
    h("div", { class: "feed", "data-feed": "" }, ...skeletons(4)),
  );
  app.replaceChildren(screen, tabNav("home"));
  appendMini(token);

  const [me, tags] = await Promise.all([ensureSession(), state.tags.length ? Promise.resolve({ tags: state.tags }) : api("/api/tags")]);
  if (token !== state.renderId) return;
  state.tags = tags.tags || [];
  state.order = state.tags.map((tag) => tag.tag);
  state.muted = new Set((me.prefs || []).filter((pref) => pref.muted).map((pref) => pref.tag));

  screen.querySelector("[data-pills]").replaceChildren(...pills());
  if (state.youtubeConfigured === null) {
    try {
      const config = await api("/api/discover/youtube/config");
      state.youtubeConfigured = Boolean(config.configured);
    } catch {
      state.youtubeConfigured = false;
    }
    if (token !== state.renderId) return;
  }

  if (!state.feed.length) {
    try {
      await loadFeed();
    } catch (err) {
      screen.querySelector("[data-feed]").replaceChildren(h("div", { class: "error-text", text: `Can't reach the server. ${err.message}` }));
      return;
    }
  }
  if (token !== state.renderId) return;
  paintFeed(screen);
  screen.querySelector("[data-pills]").replaceChildren(...pills());
  paintTrending(screen, token);
}

function pills() {
  const all = h("button", {
    class: `pill ${state.selected.size === 0 ? "on" : ""}`,
    text: "All",
    onclick: async () => {
      state.selected.clear();
      state.feed = [];
      state.homeExtra = [];
      state.homeOffset = 0;
      state.cursor = 0;
      await loadFeed().catch((err) => toast(err.message));
      renderHome();
    },
  });
  const list = [all];
  for (const tag of state.tags) {
    const name = tag.tag;
    list.push(h("button", {
      class: `pill ${state.selected.has(name) ? "on" : ""}`,
      text: channelName([name]),
      onclick: async () => {
        if (state.selected.has(name)) state.selected.delete(name);
        else state.selected.add(name);
        state.feed = [];
        state.cursor = 0;
        await loadFeed().catch((err) => toast(err.message));
        renderHome();
      },
    }));
  }
  list.push(h("button", { class: "pill discover", text: "Discover", onclick: () => navigate("discover") }));
  return list;
}

async function loadFeed({ append = false } = {}) {
  const params = new URLSearchParams({ limit: "24" });
  if (append && state.cursor) params.set("cursor", String(state.cursor));
  if (state.selected.size) params.set("tags", [...state.selected].join(","));
  const data = await api(`/api/feed?${params}`);
  state.feed = append ? state.feed.concat(data.items) : data.items;
  state.cursor = data.nextCursor;
}

async function refreshHome() {
  if (state.refreshing || state.route.name !== "home") return;
  state.refreshing = true;
  try {
    state.feed = [];
    state.homeExtra = [];
    state.homeOffset = 0;
    state.cursor = 0;
    state.trending = [];
    state.trendingAt = 0;
    await loadFeed();
    renderHome();
  } catch (err) {
    toast(err.message);
  } finally {
    state.refreshing = false;
  }
}

function installPullToRefresh() {
  const indicator = h("div", { class: "pull-refresh", "aria-live": "polite" },
    h("span", { class: "spinner small" }),
    h("span", { class: "pull-label", text: "Pull to refresh" }),
  );
  document.body.append(indicator);
  const label = indicator.querySelector(".pull-label");
  let startY = null;
  let distance = 0;

  const reset = () => {
    indicator.classList.remove("visible", "ready");
    indicator.style.transform = "translate(-50%, -60px)";
    label.textContent = "Pull to refresh";
    startY = null;
    distance = 0;
  };

  document.addEventListener("touchstart", (event) => {
    if (state.route.name !== "home" || state.refreshing || event.touches.length !== 1) return;
    if (window.scrollY > 0) return;
    startY = event.touches[0].clientY;
    distance = 0;
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (startY === null || event.touches.length !== 1) return;
    const delta = event.touches[0].clientY - startY;
    if (delta <= 0) {
      distance = 0;
      indicator.classList.remove("visible", "ready");
      indicator.style.transform = "translate(-50%, -60px)";
      return;
    }
    distance = Math.min(delta * 0.5, 120);
    if (distance < 8) return;
    if (event.cancelable) event.preventDefault();
    indicator.classList.add("visible");
    indicator.classList.toggle("ready", distance >= 64);
    indicator.style.transform = `translate(-50%, ${distance - 60}px)`;
    label.textContent = distance >= 64 ? "Release to refresh" : "Pull to refresh";
  }, { passive: false });

  const finish = () => {
    if (startY === null) return;
    const shouldRefresh = distance >= 64;
    if (!shouldRefresh) {
      reset();
      return;
    }
    indicator.classList.add("visible");
    indicator.style.transform = "translate(-50%, 8px)";
    label.textContent = "Refreshing…";
    startY = null;
    distance = 0;
    refreshHome().finally(reset);
  };
  document.addEventListener("touchend", finish, { passive: true });
  document.addEventListener("touchcancel", finish, { passive: true });
}

function paintFeed(root) {
  const feed = root.querySelector("[data-feed]");
  if (!feed) return;
  const nodes = [...state.feed.map(videoCard), ...state.homeExtra.map(remoteVideoCard)];
  feed.replaceChildren(...nodes);
  if (state.cursor) {
    const sentinel = h("div", { class: "center" }, h("div", { class: "spinner" }));
    feed.append(sentinel);
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      loadFeed({ append: true }).then(() => {
        if (state.route.name === "home") paintFeed(root);
      }).catch(() => {});
    }, { rootMargin: "400px" });
    observer.observe(sentinel);
    return;
  }
  const more = h("button", { class: "btn tonal block", text: state.homeLoading ? "Loading…" : "Load more", onclick: (event) => loadMoreHome(root, event.currentTarget) });
  feed.append(more);
}

async function loadMoreHome(root, button) {
  if (state.homeLoading) return;
  state.homeLoading = true;
  button.disabled = true;
  button.textContent = "Loading…";
  try {
    const data = await api(`/api/discover/youtube?q=trending music videos&limit=12&offset=${state.homeOffset}`);
    const seen = new Set([...state.homeExtra, ...state.feed].map((item) => item.youtubeId || item.id));
    const fresh = (data.items || []).filter((item) => !seen.has(item.youtubeId));
    state.homeExtra.push(...fresh);
    state.homeOffset += 12;
  } catch (err) {
    toast(err.message);
  }
  state.homeLoading = false;
  if (state.route.name === "home" && tokenValid(root)) paintFeed(root);
  else button.textContent = "Load more";
  button.disabled = false;
}

function tokenValid(root) {
  return Boolean(root?.isConnected);
}

async function paintTrending(root, token) {
  const fresh = Date.now() - state.trendingAt < 10 * 60 * 1000;
  if (!state.trending.length || !fresh) {
    try {
      const data = await api("/api/discover/youtube/trending?limit=12");
      state.trending = data.items || [];
      state.trendingAt = Date.now();
    } catch {
      return;
    }
  }
  if (token !== state.renderId || state.route.name !== "home") return;
  const feed = root.querySelector("[data-feed]");
  if (!feed || !state.trending.length) return;
  const row = h("div", { class: "yt-row" },
    ...state.trending.map((item) => {
      const card = h("button", {
        class: "yt-card",
        title: item.title,
        onclick: () => importAndPlay(item.youtubeId),
      },
        thumb({ thumb: item.thumb, durationMs: item.durationMs }),
        h("div", { class: "yt-name", text: item.title }),
        h("div", { class: "yt-meta", text: [item.channel, fmtViews(item.views)].filter(Boolean).join("  •  ") }),
      );
      return card;
    }),
  );
  const section = h("section", { class: "yt-section" },
    h("div", { class: "yt-head" },
      h("span", { class: "yt-title", text: "Trending on YouTube" }),
      h("span", { class: "yt-note", text: "tap to play" }),
    ),
    row,
  );
  feed.prepend(section);
}

/* ---------------- search ---------------- */

async function renderSearch(token) {
  const screen = h("div", { class: "screen" });
  const input = h("input", { type: "search", placeholder: "Search OwnTube", value: state.search.query, autocomplete: "off" });
  const clear = h("button", { class: "clear", "aria-label": "Clear", html: icon("close"), onclick: () => { input.value = ""; onQuery(""); } });
  const results = h("div", { "data-results": "" });

  const durationRow = h("div", { class: "searchfilters" });
  for (const [value, label] of [["", "Any"], ["short", "< 4 min"], ["medium", "4–20 min"], ["long", "> 20 min"]]) {
    durationRow.append(h("button", {
      class: `filterpill ${state.search.duration === value ? "on" : ""}`,
      text: label,
      onclick: () => {
        state.search.duration = value;
        for (const chip of durationRow.children) chip.classList.remove("on");
        durationRow.children[["", "short", "medium", "long"].indexOf(value)].classList.add("on");
        runNow(input.value);
      },
    }));
  }
  const sortSelect = h("select", {
    class: "sortselect",
    "aria-label": "Sort results",
    onchange: () => { state.search.sort = sortSelect.value; runNow(input.value); },
  },
    h("option", { value: "", text: "Relevance" }),
    h("option", { value: "newest", text: "Newest" }),
    h("option", { value: "views", text: "Most viewed" }),
  );
  sortSelect.value = state.search.sort;
  durationRow.append(sortSelect);

  screen.append(
    h("div", { class: "searchrow" },
      h("button", { class: "iconbtn", "aria-label": "Back", html: icon("back"), onclick: () => history.length > 1 ? history.back() : navigate("home") }),
      h("div", { class: "searchfield" }, h("span", { html: icon("search") }), input, clear),
    ),
    durationRow,
    results,
  );
  app.replaceChildren(screen);
  appendMini(token);

  let debounce = 0;
  let requestId = 0;

  async function runSearch(query) {
    const id = ++requestId;
    state.search.query = query;
    clear.classList.toggle("hidden", !query);
    if (!query.trim()) {
      state.search.results = [];
      state.search.youtube = [];
      state.search.loading = false;
      state.search.message = "";
      paintSearch(results);
      return;
    }
    state.search.loading = true;
    state.search.message = "";
    paintSearch(results);

    const params = new URLSearchParams({ q: query });
    if (state.search.duration) params.set("duration", state.search.duration);
    if (state.search.sort) params.set("sort", state.search.sort);

    const ytParams = new URLSearchParams({ q: query, limit: "8" });
    if (state.search.duration) ytParams.set("duration", state.search.duration);
    ytParams.set("order", state.search.sort === "newest" ? "date" : state.search.sort === "views" ? "viewCount" : "relevance");

    const localRequest = api(`/api/search?${params}`).catch((err) => ({ items: [], error: err }));
    const youtubeRequest = api(`/api/discover/youtube?${ytParams}`).catch(() => ({ items: [] }));

    const local = await localRequest;
    if (id !== requestId || token !== state.renderId) return;
    state.search.results = local.items || [];
    state.search.message = local.error ? local.error.message : "";
    state.search.loading = false;
    paintSearch(results);

    const youtube = await youtubeRequest;
    if (id !== requestId || token !== state.renderId) return;
    state.search.youtube = youtube.items || [];
    paintSearch(results);
  }

  function runNow(query) {
    clearTimeout(debounce);
    runSearch(query);
  }

  function onQuery(query) {
    clearTimeout(debounce);
    debounce = setTimeout(() => runSearch(query), 300);
  }

  input.addEventListener("input", () => onQuery(input.value));
  paintSearch(results);
  if (state.search.query) runSearch(state.search.query);
  input.focus();
}

function ytSearchRow(item) {
  return h("button", { class: "yt-result", onclick: () => importAndPlay(item.youtubeId) },
    thumb({ thumb: item.thumb, durationMs: item.durationMs }),
    h("div", { class: "vtext" },
      h("div", { class: "vtitle", text: item.title }),
      h("div", { class: "vsub", text: item.channel }),
      h("div", { class: "vmeta", text: `${fmtViews(item.views)}  •  YouTube` }),
    ),
    h("span", { class: "play-badge", html: icon("play") }),
  );
}

function paintSearch(container) {
  const { query, results, youtube, loading, message } = state.search;
  if (loading && results.length === 0 && youtube.length === 0) {
    container.replaceChildren(h("div", { class: "center" }, h("div", { class: "spinner" })));
    return;
  }
  if (message && results.length === 0) {
    container.replaceChildren(h("div", { class: "error-text", text: `Search failed: ${message}` }));
    return;
  }
  if (!query.trim()) {
    container.replaceChildren(h("div", { class: "empty", text: "Search by title, description or #tag. Filters apply to OwnTube and YouTube." }));
    return;
  }
  if (results.length === 0 && youtube.length === 0) {
    container.replaceChildren(h("div", { class: "empty", text: `No results for "${query}"` }));
    return;
  }
  const nodes = results.map((video) => compactCard(video));
  if (youtube.length) {
    nodes.push(h("div", { class: "section-title", text: "From YouTube" }));
    nodes.push(...youtube.map(ytSearchRow));
  }
  container.replaceChildren(...nodes);
}

/* ---------------- subscriptions ---------------- */

async function renderSubscriptions(token) {
  const screen = h("div", { class: "screen" });
  screen.append(
    h("div", { class: "topbar" }, h("span", { html: icon("subscriptions") }), h("span", { class: "brand", style: "font-size:20px", text: "Subscriptions" })),
    h("div", { class: "center" }, h("div", { class: "spinner" })),
  );
  app.replaceChildren(screen, tabNav("subscriptions"));
  appendMini(token);

  let subs = [];
  let videos = [];
  try {
    const [subsData, feedData] = await Promise.all([api("/api/subscriptions"), api("/api/subscriptions/feed")]);
    subs = subsData.tags || [];
    videos = feedData.items || [];
  } catch (err) {
    if (token === state.renderId) screen.lastChild.replaceWith(h("div", { class: "error-text", text: err.message }));
    return;
  }
  if (token !== state.renderId) return;

  screen.lastChild.remove();
  if (subs.length) {
    screen.append(h("div", { class: "section-title", text: "Channels", style: "font-size:13px;color:var(--muted);padding:6px 16px" }));
    for (const channel of subs) {
      screen.append(h("div", { class: "channel-row" },
        h("button", { class: "who", onclick: () => navigate(`channel/${encodeURIComponent(channel.tag)}`) },
          avatar(channelName([channel.tag]), "lg"),
          h("div", { style: "min-width:0" },
            h("div", { class: "name", text: channelName([channel.tag]) }),
            h("div", { class: "sub", text: `${channel.videos} videos  •  ${fmtCount(channel.subscribers)} subscribers` }),
          ),
        ),
        h("button", { class: "btn tonal", text: "Subscribed", onclick: async (event) => {
          event.stopPropagation();
          try {
            await api("/api/subscriptions", { method: "POST", body: JSON.stringify({ tag: channel.tag, subscribed: false }) });
            toast("Unsubscribed");
            render();
          } catch (err) {
            toast(err.message);
          }
        } }),
      ));
    }
    screen.append(h("div", { class: "divider" }));
  } else {
    screen.append(h("div", { class: "empty", style: "text-align:center;padding:40px 24px" },
      h("div", { class: "vtitle", text: "No subscriptions yet" }),
      h("div", { class: "vmeta", text: "Open any video and tap Subscribe on its channel." }),
    ));
  }
  const list = h("div", { class: "feed", style: "padding-top:4px" }, ...videos.map(videoCard));
  screen.append(list);
}

/* ---------------- library ---------------- */

async function renderLibrary(token) {
  const screen = h("div", { class: "screen" });
  screen.append(
    h("div", { class: "topbar" }, h("span", { class: "brand", style: "font-size:22px", text: "You" })),
    h("div", { class: "center" }, h("div", { class: "spinner" })),
  );
  app.replaceChildren(screen, tabNav("library"));

  let history = [];
  let watchLater = [];
  let playlists = [];
  try {
    const [historyData, laterData, playlistData] = await Promise.all([
      api("/api/history"), api("/api/watch-later"), api("/api/playlists"),
    ]);
    history = historyData.items || [];
    watchLater = laterData.items || [];
    playlists = playlistData.items || [];
  } catch (err) {
    if (token !== state.renderId) return;
    screen.lastChild.replaceWith(h("div", { class: "error-text", text: err.message }));
    return;
  }
  if (token !== state.renderId) return;

  screen.lastChild.remove();
  screen.append(h("button", { class: "linkrow", onclick: () => navigate("downloads") },
    h("span", { html: icon("download") }),
    h("span", { class: "label", text: "Downloads" }),
    h("span", { html: icon("chevron") }),
  ));

  if (watchLater.length) {
    screen.append(h("div", { class: "section-title", text: "Watch later" }));
    for (const video of watchLater) screen.append(compactCard(video));
  }

  if (playlists.length) {
    screen.append(h("div", { class: "section-title", text: "Playlists" }));
    for (const playlist of playlists) {
      screen.append(h("button", { class: "linkrow", onclick: () => navigate(`playlist/${encodeURIComponent(playlist.id)}`) },
        h("span", { html: icon("playlist") }),
        h("span", { class: "label", text: playlist.name }),
        h("span", { class: "muted", text: `${playlist.count} videos` }),
      ));
    }
  }

  screen.append(h("div", { class: "section-title", text: "History" }));
  if (!history.length) {
    screen.append(h("div", { class: "empty", text: "Videos you watch show up here." }));
  }
  for (const item of history) {
    if (item.video) screen.append(compactCard(item.video, { resumeAt: item.positionMs > 0 && !item.completed ? item.positionMs : 0 }));
  }
  appendMini(token);
}

async function renderPlaylist(id, token) {
  const screen = h("div", { class: "screen", style: "padding-bottom:24px" });
  screen.append(h("div", { class: "center" }, h("div", { class: "spinner" })));
  app.replaceChildren(screen);
  const detail = await api(`/api/playlists/${encodeURIComponent(id)}`).catch((err) => err);
  if (token !== state.renderId) return;
  if (detail instanceof Error) {
    screen.replaceChildren(h("div", { class: "error-text", text: detail.message }));
    return;
  }
  const items = detail.items || [];
  screen.replaceChildren(
    h("div", { class: "topbar" },
      h("button", { class: "iconbtn", html: icon("back"), onclick: () => navigate("library") }),
      h("div", {},
        h("div", { class: "vtitle", text: detail.playlist?.name || "Playlist" }),
        h("div", { class: "vmeta", text: `${items.length} videos` }),
      ),
    ),
  );
  if (!items.length) {
    screen.append(h("div", { class: "empty", text: "This playlist is empty. Save videos from the player screen." }));
  }
  for (const video of items) screen.append(compactCard(video));
}

async function renderDownloads(token) {
  const screen = h("div", { class: "screen", style: "padding:16px" });
  screen.append(
    h("div", { class: "headline", text: "Downloads" }),
    h("div", { class: "subtle", text: "Videos saved on this device for offline playback." }),
  );
  app.replaceChildren(screen);
  appendMini(token);
  const ids = [...state.offline];
  if (!ids.length) {
    screen.append(h("div", { class: "empty", style: "padding:16px 0", text: "No downloads yet. Tap Download while watching a video to save it offline." }));
    return;
  }
  const list = h("div", { class: "feed", style: "padding:0" });
  screen.append(list);
  for (const id of ids) {
    try {
      const video = await api(`/api/videos/${encodeURIComponent(id)}`);
      if (token !== state.renderId) return;
      list.append(videoCard(video));
    } catch {}
  }
}

/* ---------------- settings ---------------- */

async function renderSettings(token) {
  const screen = h("div", { class: "screen" });
  screen.append(h("div", { class: "center" }, h("div", { class: "spinner" })));
  app.replaceChildren(screen, tabNav("settings"));

  let me;
  try {
    me = await ensureSession();
  } catch (err) {
    if (token !== state.renderId) return;
    screen.replaceChildren(h("div", { class: "error-text", text: err.message }));
    return;
  }
  if (token !== state.renderId) return;

  const prefs = new Map((me.prefs || []).map((pref) => [pref.tag, pref]));
  const tags = (me.tags || []).slice();
  state.order = tags
    .slice()
    .sort((a, b) => {
      const pa = prefs.get(a.tag)?.position;
      const pb = prefs.get(b.tag)?.position;
      return (pa ?? 1e6) - (pb ?? 1e6);
    })
    .map((tag) => tag.tag);
  state.muted = new Set((me.prefs || []).filter((pref) => pref.muted).map((pref) => pref.tag));
  const counts = new Map(tags.map((tag) => [tag.tag, tag.videos]));

  const list = h("div", {});
  const paint = () => {
    list.replaceChildren(...state.order.map((name, index) => h("div", {},
      h("div", { class: "tagrow" },
        h("div", { class: "info" },
          h("div", { class: "name", text: `#${name}` }),
          h("div", { class: "count", text: `${counts.get(name) || 0} videos` }),
        ),
        h("button", { class: "iconbtn", "aria-label": "Move up", html: icon("up"), onclick: () => moveTag(index, -1, paint) }),
        h("button", { class: "iconbtn", "aria-label": "Move down", html: icon("down"), onclick: () => moveTag(index, 1, paint) }),
        h("label", { class: "switch" },
          h("input", { type: "checkbox", checked: state.muted.has(name), onchange: (event) => {
            if (event.target.checked) state.muted.add(name);
            else state.muted.delete(name);
          } }),
          h("span", { class: "track" }),
        ),
      ),
      h("div", { class: "divider", style: "margin:0" }),
    )));
  };
  paint();

  screen.replaceChildren(
    h("div", { class: "settings", style: "flex:1" },
      h("div", { class: "headline", text: "Your feed" }),
      h("div", { class: "subtle", text: "Order tags to steer the feed. Muted tags never appear." }),
      list,
    ),
    h("div", { style: "padding:0 16px 16px;display:flex;gap:12px;align-items:center" },
      h("button", { class: "btn", text: "Save feed", onclick: async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = "Saving…";
        try {
          const payload = state.order.map((tag, position) => ({ tag, position, muted: state.muted.has(tag) }));
          await api("/api/prefs", { method: "POST", body: JSON.stringify({ tags: payload }) });
          state.feed = [];
          state.cursor = 0;
          toast("Saved");
        } catch (err) {
          toast(err.message);
        } finally {
          button.disabled = false;
          button.textContent = "Save feed";
        }
      } }),
    ),
  );
}

function moveTag(index, delta, paint) {
  const next = index + delta;
  if (next < 0 || next >= state.order.length) return;
  const [tag] = state.order.splice(index, 1);
  state.order.splice(next, 0, tag);
  paint();
}

/* ---------------- channel ---------------- */

function remoteVideoCard(item) {
  return h("button", { class: "vcard", onclick: () => importAndPlay(item.youtubeId) },
    thumb({ thumb: item.thumb, durationMs: item.durationMs }),
    h("div", { class: "vrow" },
      h("div", { class: "vtext" },
        h("div", { class: "vtitle", text: item.title }),
        h("div", { class: "vmeta", text: [item.channel, fmtViews(item.views)].filter(Boolean).join("  •  ") }),
      ),
    ),
  );
}

async function renderChannel(tag, token) {
  const name = channelName([tag]);
  const screen = h("div", { class: "screen", style: "padding-bottom:24px" });
  screen.append(h("div", { class: "center" }, h("div", { class: "spinner" })));
  app.replaceChildren(screen);
  const back = h("button", { class: "round-back", "aria-label": "Back", html: icon("back"), onclick: () => (history.length > 1 ? history.back() : navigate("home")) });

  if (isYouTubeChannel(tag)) {
    let info;
    try {
      info = await api(`/api/youtube/channels/${encodeURIComponent(tag)}`);
    } catch (err) {
      if (token !== state.renderId) return;
      screen.replaceChildren(back, h("div", { class: "error-text", text: err.message }));
      return;
    }
    if (token !== state.renderId) return;
    const channelNameText = info.name || name;
    const subTag = `channel:${channelNameText.toLowerCase()}`;
    let subscribed = false;
    let followers = Number(info.followers || 0);
    const subText = h("div", { class: "channel-meta", text: `${(info.videos || []).length} videos  •  ${fmtCount(followers)} subscribers` });
    const subButton = h("button", { class: "btn tonal", text: "Subscribe" });
    subButton.addEventListener("click", async () => {
      try {
        const result = await api("/api/subscriptions", {
          method: "POST",
          body: JSON.stringify({ tag: subTag, subscribed: !subscribed }),
        });
        subscribed = Boolean(result.subscribed);
        followers = Math.max(0, followers + (subscribed ? 1 : -1));
        subButton.textContent = subscribed ? "Subscribed" : "Subscribe";
        subButton.className = `btn ${subscribed ? "tonal" : ""}`;
        subText.textContent = `${(info.videos || []).length} videos  •  ${fmtCount(followers)} subscribers`;
      } catch (err) {
        toast(err.message);
      }
    });
    const picture = info.avatar
      ? h("img", { class: "channel-avatar-img", src: info.avatar, alt: "" })
      : avatar(channelNameText, "xl");
    screen.replaceChildren(
      h("div", { class: "channel-head yt-channel" },
        info.banner ? h("img", { class: "channel-banner", src: info.banner, alt: "" }) : null,
        h("div", { class: "row" },
          picture,
          h("div", { style: "min-width:0" },
            h("div", { class: "channel-name", text: channelNameText }),
            subText,
          ),
        ),
        subButton,
        back,
      ),
      h("div", { class: "section-title", text: "Videos" }),
    );
    const videos = info.videos || [];
    if (!videos.length) screen.append(h("div", { class: "empty", text: "No videos found for this channel." }));
    else screen.append(h("div", { class: "feed", style: "padding-top:4px" }, ...videos.map(remoteVideoCard)));
    appendMini(token);
    return;
  }

  let videos = [];
  let channel = null;
  try {
    const feed = await api(`/api/feed?tags=${encodeURIComponent(tag)}&limit=24`);
    videos = (feed.items || []).filter((video) => (video.tags || []).includes(tag));
    if (videos[0]) {
      const social = await api(`/api/videos/${encodeURIComponent(videos[0].id)}/social`);
      channel = social.channel;
    }
  } catch (err) {
    if (token !== state.renderId) return;
    screen.replaceChildren(back, h("div", { class: "error-text", text: err.message }));
    return;
  }
  if (token !== state.renderId) return;

  let subscribed = Boolean(channel?.subscribed);
  let subscribers = channel?.subscribers || 0;
  const subButton = h("button", { class: "btn tonal", text: subscribed ? "Subscribed" : "Subscribe", style: "margin-top:12px" });
  const subText = h("div", { class: "channel-meta", text: `${videos.length} videos  •  ${fmtCount(subscribers)} subscribers` });
  subButton.addEventListener("click", async () => {
    try {
      const result = await api("/api/subscriptions", { method: "POST", body: JSON.stringify({ tag, subscribed: !subscribed }) });
      subscribed = Boolean(result.subscribed);
      subscribers = Math.max(0, subscribers + (subscribed ? 1 : -1));
      subButton.textContent = subscribed ? "Subscribed" : "Subscribe";
      subButton.className = `btn ${subscribed ? "tonal" : ""}`;
      subText.textContent = `${videos.length} videos  •  ${fmtCount(subscribers)} subscribers`;
    } catch (err) {
      toast(err.message);
    }
  });

  screen.replaceChildren(
    h("div", { class: "channel-head" },
      h("div", { class: "row" },
        avatar(name, "xl"),
        h("div", { style: "min-width:0" },
          h("div", { class: "channel-name", text: name }),
          subText,
        ),
      ),
      subButton,
      back,
    ),
    h("div", { class: "section-title", text: "Videos" }),
  );
  if (!videos.length) screen.append(h("div", { class: "empty", text: "No videos on this channel yet." }));
  const list = h("div", { class: "feed", style: "padding-top:4px" }, ...videos.map(videoCard));
  screen.append(list);
  appendMini(token);
}

/* ---------------- player ---------------- */

async function tryLiveStream(video, screen, token) {
  const surface = h("div", { class: "player-surface prepare-surface" });
  if (video.thumb) surface.append(h("img", { class: "prepare-thumb", src: video.thumb, alt: "" }));
  const loading = h("button", { class: "btn block loading-btn", disabled: true },
    h("span", { class: "spinner small" }), h("span", { text: "Loading…" }));
  surface.append(h("div", { class: "prepare-overlay" }, loading));
  screen.replaceChildren(
    surface,
    h("div", { class: "player-body" },
      h("div", { class: "player-title", text: video.title }),
      h("div", { class: "player-meta", text: videoChannel(video) || "YouTube" }),
    ),
  );
  media.pause();
  media.removeAttribute("src");
  media.load();
  media.src = `/api/stream/${encodeURIComponent(video.id)}`;
  currentVideo = video;
  state.mini = video;
  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      clearTimeout(timer);
      media.removeEventListener("playing", onPlaying);
      media.removeEventListener("error", onError);
    };
    const finish = (ok) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(ok);
    };
    const onPlaying = () => finish(true);
    const onError = () => finish(false);
    const timer = setTimeout(() => finish(false), 12_000);
    media.addEventListener("playing", onPlaying);
    media.addEventListener("error", onError);
    media.play().catch(() => {});
  });
}

function showPreparePlayer(screen, video, token) {
  const surface = h("div", { class: "player-surface prepare-surface" });
  if (video.thumb) surface.append(h("img", { class: "prepare-thumb", src: video.thumb, alt: "" }));
  const loading = h("button", {
    class: "btn block loading-btn",
    disabled: true,
  }, h("span", { class: "spinner small" }), h("span", { text: "Loading…" }));
  const retry = h("button", { class: "btn block", text: "Retry", hidden: true, onclick: () => start() });
  surface.append(h("div", { class: "prepare-overlay" }, loading, retry));
  screen.replaceChildren(
    surface,
    h("div", { class: "player-body" },
      h("div", { class: "player-title", text: video.title }),
      h("div", { class: "player-meta", text: videoChannel(video) || "YouTube" }),
    ),
  );

  async function start() {
    retry.hidden = true;
    loading.hidden = false;
    loading.querySelector("span:last-child").textContent = "Loading…";
    try {
      await api(`/api/videos/${encodeURIComponent(video.id)}/prepare`, { method: "POST" });
    } catch (err) {
      fail(err.message);
      return;
    }
    while (token === state.renderId) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (token !== state.renderId) return;
      let status;
      try {
        status = await api(`/api/videos/${encodeURIComponent(video.id)}/prepare`);
      } catch (err) {
        fail(err.message);
        return;
      }
      if (status.ready) {
        render();
        return;
      }
      if (status.state === "error") {
        fail(status.error || "could not load this video");
        return;
      }
      loading.querySelector("span:last-child").textContent = status.pct
        ? `Loading… ${status.pct}%`
        : "Loading…";
    }
  }

  function fail(message) {
    loading.hidden = false;
    loading.querySelector("span:last-child").textContent = "Can't load this video — tap Retry";
    retry.hidden = false;
    surface.querySelector(".prepare-error")?.remove();
    surface.querySelector(".prepare-overlay").append(
      h("div", { class: "prepare-error", text: message }),
    );
  }

  start();
}

async function saveOffline(video, button, { force = false } = {}) {
  if (!video.mp4) {
    toast("Play it once so it can be cached");
    return;
  }
  if (state.offline.has(video.id) && !force) {
    state.offline.delete(video.id);
    localStorage.setItem("owntube.offline", JSON.stringify([...state.offline]));
    button?.classList.remove("on");
    if (button) button.querySelector("span:last-child").textContent = "Offline";
    toast("Removed from offline");
    return;
  }
  try {
    if (typeof caches === "undefined") throw new Error("this browser has no cache storage");
    const cache = await caches.open("owntube-media-v1");
    const urls = [video.mp4, video.thumb].filter(Boolean);
    await Promise.all(urls.map(async (url) => {
      const response = await fetch(url);
      if (response.ok) await cache.put(url, response.clone());
    }));
    state.offline.add(video.id);
    localStorage.setItem("owntube.offline", JSON.stringify([...state.offline]));
    button?.classList.add("on");
    if (button) button.querySelector("span:last-child").textContent = "Saved";
    toast("Saved for offline");
  } catch (err) {
    toast(`Offline save failed: ${err.message}`);
  }
}

async function renderPlayer(videoId, token) {
  mediaHost.append(media);
  const screen = h("div", { class: "screen bare player" });
  screen.append(h("div", { class: "player-surface" }, h("div", { class: "center" }, h("div", { class: "spinner" }))));
  app.replaceChildren(screen);

  let video;
  let social;
  let comments = [];
  let ytComments = [];
  let related = [];
  let queueSource = [];
  try {
    video = await api(`/api/videos/${encodeURIComponent(videoId)}`);
    const youtubeComments = isExternal(video)
      ? api(`/api/videos/${encodeURIComponent(videoId)}/comments/youtube`)
        .then((data) => data.items || []).catch(() => [])
      : Promise.resolve([]);
    [social, comments, related, ytComments] = await Promise.all([
      api(`/api/videos/${encodeURIComponent(videoId)}/social`).catch(() => null),
      api(`/api/videos/${encodeURIComponent(videoId)}/comments`).then((data) => data.items || []).catch(() => []),
      api(`/api/feed?tags=${encodeURIComponent((video.tags || []).join(","))}&limit=24`)
        .then((data) => (data.items || []).filter((item) => item.id !== video.id).slice(0, 10))
        .catch(() => []),
      youtubeComments,
    ]);
  } catch (err) {
    if (token !== state.renderId) return;
    screen.replaceChildren(
      h("div", { class: "topbar" }, h("button", { class: "iconbtn", html: icon("back"), onclick: () => navigate("home") })),
      h("div", { class: "error-text", text: err.message }),
    );
    return;
  }
  if (token !== state.renderId) return;
  if (isExternal(video) && !video.mp4) {
    stopPlayback();
    const streamed = await tryLiveStream(video, screen, token);
    if (token !== state.renderId) return;
    if (!streamed) {
      showPreparePlayer(screen, video, token);
      return;
    }
    video = { ...video, mp4: `/api/stream/${encodeURIComponent(video.id)}`, hls: "", streamOnly: true };
  }
  queueSource = related.length ? related : (state.feed || []);
  if (!queueSource.length) {
    queueSource = await api("/api/feed?limit=12")
      .then((data) => data.items || [])
      .catch(() => []);
    if (token !== state.renderId) return;
  }
  state.queue = queueSource.map((item) => item.id).filter((id) => id !== video.id);

  state.commentText = "";
  const surface = h("div", { class: "player-surface" });
  if (state.audioOnly) surface.classList.add("audio-only");
  const audioTag = h("div", { class: "audio-tag", hidden: !state.audioOnly },
    h("span", { html: icon("playlist") }),
    h("span", { text: "Audio only" }),
  );
  const playOverlay = h("button", {
    class: "player-play",
    "aria-label": "Play",
    hidden: media.paused === false,
    html: icon("play"),
    onclick: () => media.play().catch((err) => toast(err.message)),
  });
  surface.append(media, audioTag, playOverlay);
  media.addEventListener("playing", () => { playOverlay.hidden = true; });
  media.addEventListener("pause", () => {
    if (state.route.name === "player") playOverlay.hidden = false;
  });
  media.addEventListener("ended", () => { playOverlay.hidden = false; });
  setTimeout(() => loadVideo(video), 0);

  const seekRow = h("div", { class: "seekrow", "data-seek": "" });
  const seek = h("input", { type: "range", min: "0", max: "1000", value: "0", "aria-label": "Seek" });
  seek.addEventListener("pointerdown", () => { seek.dataset.dragging = "1"; });
  const commit = () => {
    delete seek.dataset.dragging;
    const duration = Number.isFinite(media.duration) ? media.duration : 0;
    if (duration > 0) media.currentTime = (Number(seek.value) / 1000) * duration;
  };
  seek.addEventListener("change", commit);
  seek.addEventListener("pointerup", commit);
  seekRow.append(h("span", { "data-cur": "", text: "0:00" }), seek, h("span", { "data-dur": "", text: "0:00" }));

  const likeLabel = () => fmtCount(social?.likes || 0);
  const dislikeLabel = () => fmtCount(social?.dislikes || 0);
  const likeBtn = h("button", { class: `actionpill ${social?.myReaction === 1 ? "on" : ""}`, onclick: () => react(1) }, h("span", { html: icon("thumbUp") }), h("span", { "data-like": "", text: likeLabel() }));
  const dislikeBtn = h("button", { class: `actionpill ${social?.myReaction === -1 ? "on" : ""}`, onclick: () => react(-1) }, h("span", { html: icon("thumbDown") }), h("span", { "data-dislike": "", text: dislikeLabel() }));
  const commentBtn = h("button", { class: "actionpill", onclick: () => {
    const box = screen.querySelector(".comment-box textarea");
    if (!box) return;
    box.scrollIntoView?.({ behavior: "smooth", block: "center" });
    box.focus();
  } }, h("span", { html: icon("comment") }), h("span", { text: "Comment" }));
  const saveBtn = h("button", { class: "actionpill", onclick: () => openSheet() }, h("span", { html: icon("bookmark") }), h("span", { text: "Save" }));
  const shareBtn = h("button", { class: "actionpill", onclick: () => share() }, h("span", { html: icon("share") }), h("span", { text: "Share" }));
  const downloadBtn = h("button", { class: "actionpill", onclick: (event) => download(event.currentTarget) }, h("span", { html: icon("download") }), h("span", { text: "Download" }));
  const pipBtn = h("button", { class: "actionpill", onclick: () => {
    if (media.requestPictureInPicture) media.requestPictureInPicture().catch(() => toast("Picture-in-picture unavailable"));
    else toast("Picture-in-picture unavailable");
  } }, h("span", { html: icon("pip") }), h("span", { text: "PiP" }));
  const audioBtn = h("button", {
    class: `actionpill ${state.audioOnly ? "on" : ""}`,
    onclick: () => {
      state.audioOnly = !state.audioOnly;
      localStorage.setItem("owntube.audioOnly", state.audioOnly ? "1" : "0");
      surface.classList.toggle("audio-only", state.audioOnly);
      audioTag.hidden = !state.audioOnly;
      audioBtn.classList.toggle("on", state.audioOnly);
    },
  }, h("span", { html: icon("playlist") }), h("span", { text: "Audio" }));
  const autoplayBtn = h("button", {
    class: `actionpill ${state.autoplay ? "on" : ""}`,
    onclick: () => {
      state.autoplay = !state.autoplay;
      localStorage.setItem("owntube.autoplay", state.autoplay ? "1" : "0");
      autoplayBtn.classList.toggle("on", state.autoplay);
      toast(state.autoplay ? "Autoplay on" : "Autoplay off");
    },
  }, h("span", { html: icon("chevron") }), h("span", { text: "Autoplay" }));
  const offlineBtn = h("button", {
    class: `actionpill ${state.offline.has(video.id) ? "on" : ""}`,
    onclick: () => {
      if (video.streamOnly || !video.mp4) download(offlineBtn);
      else saveOffline(video, offlineBtn);
    },
  }, h("span", { html: icon("download") }), h("span", { text: state.offline.has(video.id) ? "Saved" : "Offline" }));

  const desc = h("div", { class: "desc" });
  const descBody = h("p", { text: video.description || "No description." });
  const descHead = h("div", { class: "head" },
    h("span", { "data-desc-label": "", text: `Description  •  ${(video.tags || []).map((tag) => `#${tag}`).join(" ")}` }),
    h("span", { "data-desc-icon": "", html: icon("expandMore") }),
  );
  desc.append(descHead, descBody);
  desc.addEventListener("click", () => {
    desc.classList.toggle("open");
    const open = desc.classList.contains("open");
    descHead.querySelector("[data-desc-label]").textContent = open
      ? "Description"
      : `Description  •  ${(video.tags || []).map((tag) => `#${tag}`).join(" ")}`;
    descHead.querySelector("[data-desc-icon]").innerHTML = icon(open ? "expandLess" : "expandMore");
  });

  const channelBox = h("div", { class: "channel-row" });
  const commentList = h("div", { "data-comments": "" });
  const commentInput = h("textarea", { placeholder: "Add a comment…", maxlength: "2000", rows: "1" });
  commentInput.addEventListener("input", () => { state.commentText = commentInput.value; });
  const sendBtn = h("button", { class: "iconbtn", "aria-label": "Post comment", html: icon("send"), onclick: () => postComment() });

  const commentsTitle = h("h3", { "data-comments-title": "", text: `Comments  ${social?.comments ?? comments.length}` });

  surface.append(h("button", { class: "player-back", "aria-label": "Back", html: icon("back"), onclick: () => navigate("home") }));
  screen.replaceChildren(
    surface,
    seekRow,
    h("div", { class: "player-body" },
      h("div", { class: "player-title", text: video.title }),
      h("div", { class: "player-meta", text: `${fmtViews(video.views)}  •  ${timeAgo(video.publishedAt)}` }),
    ),
    h("div", { class: "pillrow" }, likeBtn, dislikeBtn, commentBtn, saveBtn, shareBtn),
    h("div", { class: "pillrow" }, downloadBtn, pipBtn, audioBtn, autoplayBtn, offlineBtn),
    channelBox,
    desc,
    h("div", { class: "comments" },
      h("div", { class: "divider" }),
      commentsTitle,
      h("div", { class: "comment-box" }, commentInput, sendBtn),
    ),
    commentList,
    h("div", { class: "upnext" },
      h("div", { class: "divider" }),
      h("div", { class: "section-title", text: "Up next" }),
    ),
  );

  for (const item of related) screen.append(compactCard(item));
  screen.append(h("button", { class: "btn tonal block", text: "Back", onclick: () => navigate("home") }));

  paintChannel();
  paintComments();

  async function react(value) {
    try {
      const response = await api(`/api/videos/${encodeURIComponent(video.id)}/reaction`, {
        method: "POST",
        body: JSON.stringify({ value: social?.myReaction === value ? 0 : value }),
      });
      social = { ...social, ...response };
      likeBtn.classList.toggle("on", social.myReaction === 1);
      dislikeBtn.classList.toggle("on", social.myReaction === -1);
      likeBtn.querySelector("[data-like]").textContent = likeLabel();
      dislikeBtn.querySelector("[data-dislike]").textContent = dislikeLabel();
    } catch (err) {
      toast(err.message);
    }
  }

  function share() {
    const url = `${location.origin}/#/player/${encodeURIComponent(video.id)}`;
    if (navigator.share) {
      navigator.share({ title: video.title, url }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(url).then(() => toast("Link copied")).catch(() => toast(url));
  }

  async function download(button) {
    button.disabled = true;
    const label = button.querySelector("span:last-child");
    const original = label.textContent;
    label.textContent = "Preparing…";
    try {
      let info = null;
      for (let attempt = 0; attempt < 240; attempt += 1) {
        info = await api(`/api/downloads/${encodeURIComponent(video.id)}`, { method: "POST" });
        if (info.url) break;
        label.textContent = info.pct ? `Preparing ${info.pct}%` : "Preparing…";
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      if (!info?.url) throw new Error("preparation is taking too long");
      const fresh = await api(`/api/videos/${encodeURIComponent(video.id)}`);
      await saveOffline(fresh, offlineBtn, { force: true });
      toast("Downloaded — available offline");
    } catch (err) {
      toast(err.message);
    } finally {
      button.disabled = false;
      if (button === downloadBtn) label.textContent = original;
    }
  }

  function paintChannel() {
    const tag = channelKey(video) || social?.channel?.tag || (video.tags || [])[0];
    const name = videoChannel(video) || social?.channel?.name || channelName(video.tags);
    const subscribed = Boolean(social?.channel?.subscribed);
    const button = social?.channel
      ? h("button", { class: `btn ${subscribed ? "tonal" : ""}`, text: subscribed ? "Subscribed" : "Subscribe", onclick: async () => {
        try {
          const result = await api("/api/subscriptions", {
            method: "POST",
            body: JSON.stringify({ tag, subscribed: !subscribed }),
          });
          social.channel = {
            ...social.channel,
            subscribed: result.subscribed,
            subscribers: Math.max(0, (social.channel.subscribers || 0) + (result.subscribed ? 1 : -1)),
          };
          paintChannel();
        } catch (err) {
          toast(err.message);
        }
      } })
      : null;
    channelBox.replaceChildren(
      h("button", { class: "who", onclick: () => tag && navigate(`channel/${encodeURIComponent(tag)}`) },
        video.channelAvatar ? h("img", { class: "channel-avatar-img sm", src: video.channelAvatar, alt: "" }) : avatar(name, "lg"),
        h("div", { style: "min-width:0" },
          h("div", { class: "name", text: name }),
          h("div", { class: "sub", text: video.channel
            ? `${fmtCount(video.views)} views  •  ${fmtCount(social?.channel?.subscribers || 0)} subscribers`
            : (social?.channel ? `${fmtCount(social.channel.subscribers)} subscribers` : (video.tags || []).map((item) => `#${item}`).join("  ")) }),
        ),
      ),
      button || "",
    );
  }

  function paintComments() {
    const total = (social?.comments ?? comments.length) + ytComments.length;
    commentsTitle.textContent = `Comments  ${total}`;
    const nodes = comments.map((comment) => h("div", { class: "comment", style: "padding:8px 16px" },
      avatar(comment.author || "V", "sm"),
      h("div", { class: "body" },
        h("div", { class: "who", text: `${comment.author || "Viewer"}  •  ${timeAgo(comment.createdAt)}` }),
        h("div", { class: "text", text: comment.body }),
        h("button", { class: `like ${comment.liked ? "on" : ""}`, onclick: async () => {
          try {
            const result = await api(`/api/comments/${encodeURIComponent(comment.id)}/like`, { method: "POST" });
            comment.liked = result.liked;
            comment.likes = result.likes;
            paintComments();
          } catch (err) {
            toast(err.message);
          }
        } }, h("span", { html: icon("thumbUp") }), h("span", { text: comment.likes > 0 ? fmtCount(comment.likes) : "Like" })),
      ),
    ));
    if (ytComments.length) {
      nodes.push(h("div", { class: "section-title", text: "From YouTube" }));
      nodes.push(...ytComments.map((comment) => h("div", { class: "comment yt-comment", style: "padding:8px 16px" },
        comment.avatar
          ? h("img", { class: "comment-avatar", src: comment.avatar, alt: "" })
          : avatar(comment.author || "Y", "sm"),
        h("div", { class: "body" },
          h("div", { class: "who", text: `${comment.author}  •  ${comment.time}  •  YouTube` }),
          h("div", { class: "text", text: comment.body }),
          h("div", { class: "yt-likes", text: `♥ ${comment.likes}  •  ${comment.replies} replies` }),
        ),
      )));
    }
    if (!nodes.length) {
      commentList.replaceChildren(h("div", { class: "empty", style: "padding:8px 16px", text: "No comments yet. Start the conversation." }));
      return;
    }
    commentList.replaceChildren(...nodes);
  }

  async function postComment() {
    const text = commentInput.value.trim();
    if (!text) return;
    sendBtn.disabled = true;
    try {
      const result = await api(`/api/videos/${encodeURIComponent(video.id)}/comments`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      comments = [result.comment || result, ...comments];
      commentInput.value = "";
      state.commentText = "";
      if (social) social.comments = (social.comments || 0) + 1;
      paintComments();
    } catch (err) {
      toast(err.message);
    } finally {
      sendBtn.disabled = false;
    }
  }

  async function openSheet() {
    const backdrop = h("div", { class: "sheet-backdrop" });
    const sheet = h("div", { class: "sheet" }, h("h3", { text: "Save to" }), h("div", { class: "center" }, h("div", { class: "spinner" })));
    backdrop.append(sheet);
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) backdrop.remove(); });
    document.body.append(backdrop);

    let playlists = [];
    try {
      playlists = (await api("/api/playlists")).items || [];
    } catch {}
    const rows = h("div", {});
    const addRow = (name, count, onSave) => rows.append(h("div", { class: "sheet-row" },
      h("div", { class: "info" },
        h("div", { class: "name", text: name }),
        count ? h("div", { class: "count", text: count }) : "",
      ),
      h("button", { class: "btn tonal", text: "Save", onclick: onSave }),
    ));

    addRow("Watch later", "", async () => {
      try {
        await api("/api/watch-later", { method: "POST", body: JSON.stringify({ videoId: video.id }) });
        backdrop.remove();
        toast("Saved to Watch later");
      } catch (err) {
        toast(err.message);
      }
    });
    for (const playlist of playlists) {
      addRow(playlist.name, `${playlist.count} videos`, async () => {
        try {
          await api(`/api/playlists/${encodeURIComponent(playlist.id)}/items`, {
            method: "POST",
            body: JSON.stringify({ videoId: video.id }),
          });
          backdrop.remove();
          toast(`Saved to ${playlist.name}`);
        } catch (err) {
          toast(err.message);
        }
      });
    }

    const nameInput = h("input", { placeholder: "New playlist", maxlength: "100" });
    const create = h("button", { class: "btn", text: "Create", onclick: async () => {
      const name = nameInput.value.trim();
      if (!name) return;
      try {
        const created = await api("/api/playlists", { method: "POST", body: JSON.stringify({ name }) });
        await api(`/api/playlists/${encodeURIComponent(created.id)}/items`, {
          method: "POST",
          body: JSON.stringify({ videoId: video.id }),
        });
        backdrop.remove();
        toast(`Saved to ${created.name}`);
      } catch (err) {
        toast(err.message);
      }
    } });

    sheet.replaceChildren(
      h("h3", { text: "Save to" }),
      rows,
      h("div", { class: "create" }, nameInput, create),
    );
  }
}

/* ---------------- discover ---------------- */

async function renderDiscover(token) {
  const screen = h("div", { class: "screen" });
  const input = h("input", { type: "search", placeholder: "Search YouTube", autocomplete: "off" });
  const status = h("div", { class: "empty", text: "" });
  const results = h("div", { class: "discover-results" });
  const keyInput = h("input", { type: "password", placeholder: "AIza… YouTube Data API key", autocomplete: "off", spellcheck: "false" });
  const urlInput = h("input", { type: "url", placeholder: "Paste a YouTube link", autocomplete: "off", spellcheck: "false" });
  const keySave = h("button", { class: "btn", type: "submit", text: "Save key" });
  const keyForm = h("form", { class: "key-form", hidden: true },
    h("div", { class: "subtle", text: "Paste a YouTube Data API v3 key to enable discovery. It is stored on this server only." }),
    h("div", { class: "key-row" }, keyInput, keySave),
  );
  keyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = keyInput.value.trim();
    if (!value) return;
    keySave.disabled = true;
    keySave.textContent = "Saving…";
    try {
      await api("/api/discover/youtube/config", { method: "POST", body: JSON.stringify({ apiKey: value }) });
      state.youtubeConfigured = true;
      state.trending = [];
      state.trendingAt = 0;
      keyInput.value = "";
      keyForm.hidden = true;
      status.textContent = "YouTube discovery enabled. Search for something.";
    } catch (err) {
      status.textContent = err.message;
    } finally {
      keySave.disabled = false;
      keySave.textContent = "Save key";
    }
  });
  screen.append(
    h("div", { class: "topbar" },
      h("button", { class: "iconbtn", "aria-label": "Back", html: icon("back"), onclick: () => navigate("home") }),
      h("span", { class: "brand", style: "font-size:20px", text: "Discover" }),
    ),
    h("div", { style: "padding:0 12px 6px" },
      h("div", { class: "subtle", text: "Search public videos through the official YouTube Data API. Imports store metadata and the thumbnail only — playback opens on YouTube." }),
      h("form", { class: "searchfield", style: "margin:0", onsubmit: (event) => {
        event.preventDefault();
        run();
      } }, h("span", { html: icon("search") }), input),
    ),
    status,
    keyForm,
    h("form", { class: "url-import", onsubmit: async (event) => {
      event.preventDefault();
      const url = urlInput.value.trim();
      if (!url) return;
      const button = event.currentTarget.querySelector("button");
      button.disabled = true;
      button.textContent = "Importing…";
      try {
        const { video } = await api("/api/discover/youtube/import-url", {
          method: "POST",
          body: JSON.stringify({ url }),
        });
        urlInput.value = "";
        navigate(`player/${encodeURIComponent(video.id)}`);
      } catch (err) {
        status.textContent = err.message;
      } finally {
        button.disabled = false;
        button.textContent = "Import";
      }
    } },
      urlInput,
      h("button", { class: "btn", type: "submit", text: "Import" }),
    ),
    results,
  );
  app.replaceChildren(screen);
  appendMini(token);

  async function run() {
    const query = input.value.trim();
    if (!query) return;
    status.textContent = "Searching…";
    results.replaceChildren();
    try {
      const data = await api(`/api/discover/youtube?q=${encodeURIComponent(query)}&limit=12`);
      status.textContent = `${data.totalResults} results on YouTube`;
      results.replaceChildren(...(data.items || []).map(discoverCard));
    } catch (err) {
      status.textContent = err.message.includes("not configured")
        ? "YouTube discovery is off. Set YOUTUBE_API_KEY on the server to enable it."
        : err.message;
    }
  }

  try {
    const config = await api("/api/discover/youtube/config");
    state.youtubeConfigured = Boolean(config.configured);
    if (!config.configured) {
      status.textContent = "YouTube search and playback run through yt-dlp on this server. Add a Data API key below for richer metadata and trending.";
      keyForm.hidden = false;
    }
  } catch {}
  const engine = await api("/api/media/ytdlp").catch(() => null);
  if (token === state.renderId && engine && !engine.available) {
    status.textContent = `${status.textContent} Playback needs yt-dlp on the server.`;
  }
  if (token !== state.renderId) return;
  input.focus();
}

function discoverCard(item) {
  const card = h("div", { class: "vcard" },
    thumb({ thumb: item.thumb, durationMs: item.durationMs }),
    h("div", { class: "body" },
      h("div", { class: "vtitle", text: item.title }),
      h("div", { class: "duration", text: `${fmtViews(item.views)}  •  ${item.channel}` }),
    ),
  );
  const play = h("button", { class: "btn", text: "Play" });
  play.addEventListener("click", async () => {
    play.disabled = true;
    play.textContent = "Importing…";
    try {
      const data = await api("/api/discover/youtube/import", {
        method: "POST",
        body: JSON.stringify({ videoId: item.youtubeId }),
      });
      const video = data.video || data;
      item.imported = true;
      state.feed = [];
      state.homeExtra = [];
      state.homeOffset = 0;
      state.cursor = 0;
      navigate(`player/${encodeURIComponent(video.id)}`);
    } catch (err) {
      play.disabled = false;
      play.textContent = "Play";
      toast(err.message);
    }
  });
  const yt = h("button", {
    class: "btn tonal",
    text: "Channel",
    onclick: () => navigate(`channel/${encodeURIComponent(item.channelId || item.channel || "YouTube")}`),
  });
  card.append(h("div", { class: "card-actions" }, play, yt));
  return card;
}

/* ---------------- boot ---------------- */

init().catch((err) => {
  console.error(err);
  const hint = location.protocol === "file:"
    ? "Open the server URL (http://127.0.0.1:8787/) instead of the HTML file."
    : `Server: ${location.origin}. Start it with "npm start".`;
  app.replaceChildren(h("div", { class: "error-text", text: `Cannot reach the server: ${err.message}. ${hint}` }));
});

async function init() {
  const me = await ensureSession();
  state.userId = me.userId;
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  installPullToRefresh();
  render();
}
