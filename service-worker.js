// Sallos: busca sempre a versão mais nova quando há internet; sem internet, usa a cópia guardada.
const CACHE_NAME = "mediplan-202611201955";
const REM_CACHE = "mediplan-lembretes"; // lista de lembretes gravada pelo app; não é apagada nas atualizações
const ASSETS = ["./", "./index.html", "./app.js", "./manifest.json", "./sallos-192.png", "./sallos-512.png", "./sallos-180.png", "./sallos-32.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE_NAME && k !== REM_CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co") || url.hostname.endsWith("supabase.in") || url.hostname.includes("brapi.dev")) return; // dados nunca vão para o cache
  e.respondWith(fetch(req).then((res) => { if (res.ok && (url.origin === location.origin || res.type === "cors")) { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {}); } return res; }).catch(() => caches.match(req, { ignoreSearch: true })));
});

// ---- Lembretes: avisa um dia antes de uma despesa vencer ou de um pagamento cair ----
// O app grava a lista em REM_CACHE. Aqui ela é conferida quando o app abre (mensagem) e, onde o celular permite, em segundo plano (periodicsync).
const remRead = async (name, fallback) => { try { const c = await caches.open(REM_CACHE); const r = await c.match(name); return r ? await r.json() : fallback; } catch (e) { return fallback; } };
const remWrite = async (name, value) => { const c = await caches.open(REM_CACHE); await c.put(name, new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } })); };
const remIso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
async function checkReminders(agora) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return 0;
  const data = await remRead("./__lembretes.json", null);
  if (!data || !data.on || !Array.isArray(data.items)) return 0;
  const sent = await remRead("./__lembretes-enviados.json", {});
  const now = agora || new Date(), hoje = remIso(now), amanha = remIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const limite = remIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10));
  Object.keys(sent).forEach((k) => { if (sent[k] < limite) delete sent[k]; });
  let n = 0;
  for (const it of data.items) {
    if (it.date !== hoje && it.date !== amanha) continue;
    const k = it.key + "|" + it.date;
    if (sent[k]) continue; // um aviso por conta: na véspera ou, se o celular não conferiu na véspera, no próprio dia
    await self.registration.showNotification(it.date === amanha ? it.t1 : it.t0, { body: it.body, icon: "sallos-192.png", badge: "sallos-192.png", tag: k, data: { url: self.registration.scope } });
    sent[k] = it.date; n++;
  }
  await remWrite("./__lembretes-enviados.json", sent);
  return n;
}
self.addEventListener("message", (e) => { if (e.data && e.data.type === "mediplan-lembretes") e.waitUntil(checkReminders()); });
self.addEventListener("periodicsync", (e) => { if (e.tag === "mediplan-lembretes") e.waitUntil(checkReminders()); });
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => { const c = cs.find((x) => x.url.startsWith(url)); return c ? c.focus() : self.clients.openWindow(url); }));
});
