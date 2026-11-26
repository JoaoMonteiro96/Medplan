// Teste do app sem internet e da versão nova (com o service worker ligado, como no celular).
// 1) abre, 2) tira a internet e abre de novo (tem que abrir, com as fontes do app), 3) publica uma "versão nova"
// e confere que o app abre na hora com a cópia guardada e mostra o aviso "Nova versão" com o botão Atualizar.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const { dadosDeTeste } = require('../comum.cjs');
const RAIZ = path.resolve(__dirname, '../..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
let versaoFalsa = null;
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(RAIZ, p), (e, d) => {
    if (e) { r.writeHead(404); r.end(); return; }
    if (p === '/index.html' && versaoFalsa) d = Buffer.from(String(d).replace(/app\.js\?v=\d+/, 'app.js?v=' + versaoFalsa));
    r.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); r.end(d);
  });
});
(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const url = `http://localhost:${srv.address().port}/`;
  const nav = await chromium.launch(); let falhas = 0;
  const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA ') + m); if (!c) falhas++; };
  const ctx = await nav.newContext({ viewport: { width: 412, height: 915 }, locale: 'pt-BR', serviceWorkers: 'allow' });
  const dados = dadosDeTeste('completo');
  await ctx.addInitScript(([d]) => { if (localStorage.getItem('mediplan-data-v2')) return; localStorage.setItem('mediplan-cloud-skip', '1'); localStorage.setItem('mediplan-uso-off', '1'); localStorage.setItem('mediplan-guia', 'antigo'); localStorage.setItem('mediplan-data-v2', JSON.stringify(d)); }, [dados]);
  const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(e.message));
  await p.goto(url); await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(1500);
  await p.reload(); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'cópia guardada ligada');
  // 2) sem internet
  await ctx.setOffline(true);
  await p.reload(); await p.waitForTimeout(3000);
  ok(await p.evaluate(() => !!document.querySelector('.app')), 'abre sem internet');
  ok(await p.evaluate(async () => { await document.fonts.ready; return document.fonts.check('800 20px Manrope') && document.fonts.check('400 14px Inter'); }), 'fontes do app carregadas sem internet');
  await ctx.setOffline(false);
  // 3) versão nova publicada
  versaoFalsa = '209912312359';
  const t0 = Date.now(); await p.reload(); await p.waitForSelector('.app'); const ms = Date.now() - t0;
  ok(ms < 2500, `abriu na hora com a cópia guardada (${ms} ms)`);
  ok(await p.evaluate(() => !/209912312359/.test([...document.scripts].map((s) => s.src).join())), 'enquanto isso, continua na versão que já estava guardada');
  await p.waitForTimeout(4500);
  ok(await p.evaluate(() => /Nova versão do Sallos pronta/.test(document.body.innerText)), 'aviso de versão nova apareceu');
  await p.evaluate(() => { const b = [...document.querySelectorAll('.aviso button')].find((x) => /Atualizar/.test(x.textContent)); b && b.click(); });
  await p.waitForTimeout(3000);
  ok(await p.evaluate(() => /209912312359/.test([...document.scripts].map((s) => s.src).join())), 'depois de Atualizar, está na versão nova');
  ok(await p.evaluate(() => !!document.querySelector('.app')), 'versão nova abriu');
  ok(!erros.length, 'sem erros na página ' + erros.join(' | '));
  console.log(falhas ? `${falhas} falha(s)` : 'Tudo certo'); await nav.close(); srv.close();
})();
