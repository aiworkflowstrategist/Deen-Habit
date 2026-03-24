const SW_VERSION = "3.0.0";
const CACHE_STATIC = `deenhabit-static-v${SW_VERSION}`;
const CACHE_API    = `deenhabit-api-v${SW_VERSION}`;

const PRECACHE_URLS = ["/", "/index.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];
const API_HOSTS = ["api.aladhan.com", "nominatim.openstreetmap.org", "api.alquran.cloud"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then((c) => c.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  const valid = [CACHE_STATIC, CACHE_API];
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !valid.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => notifyClients({ type: "SW_ACTIVATED", version: SW_VERSION }))
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;
  if (API_HOSTS.some((h) => url.hostname.includes(h))) {
    e.respondWith(networkFirst(e.request, CACHE_API));
    return;
  }
  e.respondWith(cacheFirst(e.request, CACHE_STATIC));
});

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) { const c = await caches.open(cacheName); c.put(req, res.clone()); }
    return res;
  } catch {
    if (req.mode === "navigate") { const f = await caches.match("/index.html"); if (f) return f; }
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    if (res.ok) { const c = await caches.open(cacheName); c.put(req, res.clone()); }
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "offline" }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
}

function notifyClients(payload) {
  self.clients.matchAll({ includeUncontrolled: true, type: "window" })
    .then((clients) => clients.forEach((c) => c.postMessage(payload)));
}

self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});
