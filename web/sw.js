const CACHE = "owntube-v16";
const MEDIA_CACHE = "owntube-media-v1";
const ASSETS = ["/", "/style.css?v=16", "/app.js?v=16", "/hls.min.js", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith("/media/")) {
    event.respondWith((async () => {
      const cache = await caches.open(MEDIA_CACHE);
      const hit = (await cache.match(url.pathname)) || (await cache.match(event.request));
      if (hit) return hit;
      return fetch(event.request);
    })());
    return;
  }

  const shell = event.request.mode === "navigate" || /\.(?:html|css|js|webmanifest|svg)$/.test(url.pathname);
  if (shell) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((hit) => hit || caches.match("/"))),
    );
    return;
  }

  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
