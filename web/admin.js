const $ = (id) => document.getElementById(id);
const tokenInput = $("admin-token");
tokenInput.value = localStorage.getItem("owntube.admin") || "";

const adminApi = async (path, options = {}) => {
  const res = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-admin-token": tokenInput.value,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

function videoRow(video) {
  const wrap = document.createElement("div");
  wrap.className = "tag-row";
  wrap.style.gridTemplateColumns = "1fr 2fr auto";
  const title = document.createElement("input");
  title.value = video.title;
  const tags = document.createElement("input");
  tags.value = video.tags.join(", ");
  const actions = document.createElement("div");
  actions.className = "row";
  const short = document.createElement("button");
  short.className = "ghost";
  short.textContent = video.isShort ? "Short: yes" : "Short: no";
  short.addEventListener("click", () => {
    video.isShort = !video.isShort;
    short.textContent = video.isShort ? "Short: yes" : "Short: no";
  });
  const save = document.createElement("button");
  save.className = "primary";
  save.textContent = "Save";
  save.addEventListener("click", async () => {
    try {
      await adminApi(`/api/admin/videos/${encodeURIComponent(video.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.value,
          tags: tags.value.split(",").map((t) => t.trim()).filter(Boolean),
          isShort: video.isShort,
        }),
      });
      save.textContent = "Saved";
      setTimeout(() => (save.textContent = "Save"), 1200);
    } catch (err) { alert(err.message); }
  });
  actions.append(short, save);
  wrap.append(title, tags, actions);
  return wrap;
}

async function loadVideos() {
  try {
    const data = await adminApi("/api/admin/videos");
    $("videos").replaceChildren(...data.items.map(videoRow));
  } catch (err) {
    $("videos").textContent = err.message;
  }
}

$("ingest").addEventListener("click", async () => {
  localStorage.setItem("owntube.admin", tokenInput.value);
  $("ingest-log").textContent = "Working…";
  try {
    const body = {};
    if ($("ingest-dir").value.trim()) body.directory = $("ingest-dir").value.trim();
    const data = await adminApi("/api/admin/ingest", { method: "POST", body: JSON.stringify(body) });
    $("ingest-log").textContent = [...(data.logs || []), `ingested ${data.ingested.length}`].join("\n");
    await loadVideos();
  } catch (err) {
    $("ingest-log").textContent = err.message;
  }
});

tokenInput.addEventListener("change", () => localStorage.setItem("owntube.admin", tokenInput.value));
loadVideos();
