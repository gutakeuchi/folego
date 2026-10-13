const CACHE = "folego-shell-v1";
const ROOT = new URL("./", self.location).href;
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch(ROOT, { cache: "reload" });
    if (!response.ok) throw new Error("App indisponível");
    await cache.put(ROOT, response.clone());
    const html = await response.text();
    const assets = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
      .map(match => new URL(match[1], ROOT))
      .filter(url => url.origin === self.location.origin && /\.(?:js|css|svg|webmanifest)$/.test(url.pathname));
    await cache.addAll(assets.map(url => url.href));
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("folego-shell-") && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.includes("/api/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(ROOT)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  })));
});
