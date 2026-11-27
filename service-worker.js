// Sallos: abre na hora com a cópia guardada e busca a versão nova por trás. Quando chega versão nova,
// avisa o app ("Nova versão pronta") e a próxima abertura já usa a nova. Sem internet, usa a cópia guardada.
const CACHE_NAME = "mediplan-202611262103";
const REM_CACHE = "mediplan-lembretes"; // lista de lembretes gravada pelo app; não é apagada nas atualizações
const FONTES = ["inter-latin-400", "inter-latin-500", "inter-latin-600", "inter-latin-700", "inter-latin-800", "manrope-latin-500", "manrope-latin-600", "manrope-latin-700", "manrope-latin-800"].map((f) => "./fontes/" + f + "-normal.woff2");
const ASSETS = ["./index.html", "./manifest.json", "./sallos-192.png", "./sallos-512.png", "./sallos-180.png", "./sallos-32.png", "./sallos-badge.png", "./libs/supabase-2.45.4.js", ...FONTES];
const versaoDe = (html) => { const m = /app\.js\?v=(\d+)/.exec(html || ""); return m ? m[1] : ""; };
// guarda a página e o app desta versão (o app.js com o número da versão, para nunca misturar versões)
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE_NAME);
    const pag = await fetch("./index.html", { cache: "no-cache" });
    if (!pag.ok) throw new Error("página " + pag.status);
    const html = await pag.clone().text();
    await c.put("./index.html", pag);
    const v = versaoDe(html);
    if (v) await c.add(new Request("./app.js?v=" + v, { cache: "no-cache" }));
    await Promise.all(ASSETS.filter((a) => a !== "./index.html").map((a) => c.add(new Request(a, { cache: "no-cache" })).catch(() => {})));
  })());
  self.skipWaiting();
});
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE_NAME && k !== REM_CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co") || url.hostname.endsWith("supabase.in") || url.hostname.includes("brapi.dev")) return; // dados nunca vão para o cache
  const raiz = new URL(self.registration.scope).pathname;
  const mesma = url.origin === location.origin;
  // a página do app: abre a cópia guardada na hora e confere a nova por trás
  if (mesma && (url.pathname === raiz || url.pathname === raiz + "index.html")) {
    const pronto = caches.open(CACHE_NAME).then(async (c) => { const guardada = await c.match("./index.html"); return { c, guardada, vVelha: guardada ? versaoDe(await guardada.clone().text()) : "" }; });
    const nova = pronto.then(async ({ c, vVelha }) => {
      const res = await fetch("./index.html", { cache: "no-cache" });
      if (!res.ok) return res;
      const html = await res.clone().text();
      const vNova = versaoDe(html);
      if (vNova && vNova !== vVelha) await c.add(new Request("./app.js?v=" + vNova, { cache: "no-cache" })); // só troca a página se o app novo veio junto
      await c.put("./index.html", res.clone());
      if (vVelha && vNova && vNova !== vVelha) (await self.clients.matchAll({ type: "window" })).forEach((cl) => cl.postMessage({ type: "sallos-nova-versao", v: vNova }));
      return res;
    });
    e.waitUntil(nova.catch(() => {}));
    e.respondWith(pronto.then(({ guardada }) => guardada || nova).catch(() => caches.match("./index.html")).then((r) => r || new Response("Sem internet", { status: 503 })));
    return;
  }
  // o app (app.js?v=...): cada versão nunca muda, então a cópia guardada vale sempre
  if (mesma && /\/app\.js$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((g) => g || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copy)); } return res; }).catch(() => caches.match(req, { ignoreSearch: true }))));
    return;
  }
  // fontes e bibliotecas guardadas no app: a cópia guardada primeiro
  if (mesma && (url.pathname.includes("/fontes/") || url.pathname.includes("/libs/"))) {
    e.respondWith(caches.match(req).then((g) => g || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copy)); } return res; })));
    return;
  }
  // o resto: rede primeiro, cópia guardada sem internet
  e.respondWith(fetch(req).then((res) => { if (res.ok && (mesma || res.type === "cors")) { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {}); } return res; }).catch(() => caches.match(req, { ignoreSearch: true })));
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
    await self.registration.showNotification(it.date === amanha ? it.t1 : it.t0, { body: it.body, icon: "sallos-192.png", badge: "sallos-badge.png", tag: k, data: { url: self.registration.scope } });
    sent[k] = it.date; n++;
  }
  await remWrite("./__lembretes-enviados.json", sent);
  return n;
}
self.addEventListener("message", (e) => { if (e.data && e.data.type === "mediplan-lembretes") e.waitUntil(checkReminders()); });
// o app pergunta qual versão está guardada para a próxima abertura (se for mais nova, ele oferece "Atualizar")
self.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "sallos-checar" || !e.source) return;
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.match("./index.html")).then((r) => r ? r.text() : "").then((html) => e.source.postMessage({ type: "sallos-versao", v: versaoDe(html) })).catch(() => {}));
});
self.addEventListener("periodicsync", (e) => { if (e.tag === "mediplan-lembretes") e.waitUntil(checkReminders()); });
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => { const c = cs.find((x) => x.url.startsWith(url)); return c ? c.focus() : self.clients.openWindow(url); }));
});
