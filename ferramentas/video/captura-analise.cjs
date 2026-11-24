// telas da cena "Análise completa" (celular): Investimentos › Ativos › FII › Análise completa
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const V = __dirname, DIST = path.resolve(V, '..', '..'), O = path.join(V, 'cap'); fs.mkdirSync(O, { recursive: true });
const { dadosDeTeste } = require('../comum.cjs');
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; fs.readFile(path.join(DIST, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': /\.js$/.test(p) ? 'text/javascript' : /\.html$/.test(p) ? 'text/html' : /\.png$/.test(p) ? 'image/png' : 'application/json' }); r.end(d); } }); });
const seed = dadosDeTeste(null, () => {});
const T = JSON.parse(fs.readFileSync(path.join(V, 'pontos.json'), 'utf8'));
// preços e proventos fictícios (a B3 de verdade não é chamada na gravação)
function hist() { const out = []; let v = 158.2, s = 7; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; const d = new Date(Date.now() - 368 * 864e5);
  while (d < new Date(Date.now() - 2 * 864e5)) { d.setDate(d.getDate() + 1); if (d.getDay() === 0 || d.getDay() === 6) continue; v = Math.max(140, Math.min(182, v + (r() - 0.455) * 2.0)); out.push({ data: d.toISOString().slice(0, 10), fechamento: +v.toFixed(2), maxima: +(v + r() * 1.4).toFixed(2), minima: +(v - r() * 1.4).toFixed(2) }); } return out; }
function prov() { const out = []; const h = new Date(); for (let k = 0; k < 12; k++) { const dc = new Date(h.getFullYear(), h.getMonth() - k, k === 0 ? 19 : 10); const pg = new Date(dc.getTime() + 9 * 864e5); out.push({ data_com: dc.toISOString().slice(0, 10), pagamento: pg.toISOString().slice(0, 10), valor: k < 4 ? 1.1 : 1.05, tipo: 'RENDIMENTO', ref: '' }); } return out; }
const bb = async (l) => l.evaluate((el) => { const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; });
const CSS = '*{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important} #splash,.aviso{display:none!important}';
(async () => { await new Promise((r) => srv.listen(0, r)); const H = hist(), P = prov();
  const b = await chromium.launch({ args: ['--lang=pt-BR'], env: { ...process.env, LANG: 'pt_BR.UTF-8', LC_ALL: 'pt_BR.UTF-8' } });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Bahia', serviceWorkers: 'block' });
  await ctx.addInitScript((d) => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('mediplan-cloud-skip', '1'); localStorage.setItem('mediplan-guia', 'antigo'); localStorage.setItem('mediplan-uso-off', '1'); localStorage.setItem('mediplan-data-v2', JSON.stringify(d)); } }, seed);
  const m = await ctx.newPage(); await m.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const json = (body) => (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  await m.route('**/rest/v1/precos_hist**', json(H)); await m.route('**/functions/v1/proventos**', json({ nome: 'FII HGLG PAX', proventos: P }));
  await m.goto(`http://localhost:${srv.address().port}/`); await m.waitForTimeout(2200); await m.addStyleTag({ content: CSS });
  const shot = async (n) => { await m.waitForTimeout(400); await m.screenshot({ path: path.join(O, n + '.jpg'), type: 'jpeg', quality: 92 }); };
  await m.click('.dk-btn[aria-label="Mais seções"]'); await m.waitForTimeout(400); await m.click('.dk-item[data-tab="investimentos"]'); await m.waitForTimeout(900);
  await m.evaluate(() => scrollTo(0, 0)); await shot('m-anl-inv');
  const aba = m.locator('button', { hasText: /^Ativos$/ }).first(); await aba.scrollIntoViewIfNeeded(); await m.waitForTimeout(200);
  T['m-anl-aba'] = await bb(aba); await shot('m-anl-inv2');
  await aba.click(); await m.waitForTimeout(500);
  await m.evaluate(() => { const h = [...document.querySelectorAll('.cl-head')].find((x) => /^FII/.test(x.innerText.trim())); if (h && h.getAttribute('aria-expanded') !== 'true') h.click(); }); await m.waitForTimeout(300);
  await m.evaluate(() => document.querySelector('article[data-asset="HGLG11"] .ac-top').click()); await m.waitForTimeout(400);
  await m.evaluate(() => { const el = document.querySelector('[data-analise="HGLG11"]'); scrollTo(0, el.getBoundingClientRect().top + scrollY - 560); }); await m.waitForTimeout(300);
  T['m-anl-botao'] = await bb(m.locator('[data-analise="HGLG11"]')); await shot('m-anl-btn');
  await m.click('[data-analise="HGLG11"]'); await m.waitForTimeout(1200); await shot('m-anl1');
  await m.evaluate(() => { const el = document.querySelector('.anl'); el.scrollTo(0, el.querySelector('.anl-sec').offsetTop - 74); }); await m.waitForTimeout(500); await shot('m-anl2');
  fs.writeFileSync(path.join(V, 'pontos.json'), JSON.stringify(T)); console.log(['m-anl-aba', 'm-anl-botao'].map((k) => k + ' ' + T[k].map(Math.round)).join('\n'));
  await b.close(); srv.close(); })().catch((e) => { console.error(e); process.exit(1); });
