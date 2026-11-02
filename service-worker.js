// Mediplan: busca sempre a versão mais nova quando há internet; sem internet, usa a cópia guardada.
const CACHE_NAME = "mediplan-202611012103";
const ASSETS = ["./", "./index.html", "./app.js", "./manifest.json", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co") || url.hostname.endsWith("supabase.in") || url.hostname.includes("brapi.dev")) return; // dados nunca vão para o cache
  e.respondWith(fetch(req).then((res) => { if (res.ok && (url.origin === location.origin || res.type === "cors")) { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {}); } return res; }).catch(() => caches.match(req, { ignoreSearch: true })));
});
