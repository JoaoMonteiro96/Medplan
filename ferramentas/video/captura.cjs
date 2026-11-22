const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const V = __dirname, DIST = path.resolve(V, '..', '..'), O = path.join(V, 'cap'); fs.mkdirSync(O, { recursive: true });
const { dadosDeTeste, isoDaqui } = require('../comum.cjs');
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; fs.readFile(path.join(DIST, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': /\.js$/.test(p) ? 'text/javascript' : /\.html$/.test(p) ? 'text/html' : /\.png$/.test(p) ? 'image/png' : 'application/json' }); r.end(d); } }); });
const seed = dadosDeTeste();
const T = {};
const bb = async (p, sel, page) => { const l = typeof sel === 'string' ? p.locator(sel).first() : sel; const r = await l.evaluate((el) => { const b = el.getBoundingClientRect(); return [b.x, b.y + (window.scrollY || 0), b.width, b.height, window.scrollY || 0]; }); return page ? r.slice(0, 4) : [r[0], r[1] - r[4], r[2], r[3]]; };
const CSS = '*{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important} #splash{display:none!important}';
(async () => { await new Promise((r) => srv.listen(0, r));
  const b = await chromium.launch({ args: ['--lang=pt-BR'], env: { ...process.env, LANG: 'pt_BR.UTF-8', LANGUAGE: 'pt_BR', LC_ALL: 'pt_BR.UTF-8' } }); const url = `http://localhost:${srv.address().port}/`;
  const mk = async (opt) => { const ctx = await b.newContext({ ...opt, locale: 'pt-BR', timezoneId: 'America/Bahia', serviceWorkers: 'block' });
    await ctx.addInitScript((d) => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('mediplan-cloud-skip', '1'); localStorage.setItem('mediplan-guia', 'antigo'); localStorage.setItem('mediplan-uso-off', '1'); localStorage.setItem('mediplan-data-v2', JSON.stringify(d)); } }, seed);
    const p = await ctx.newPage(); await p.route(/^https?:\/\/(?!localhost)/, (r) => r.abort()); await p.goto(url); await p.waitForTimeout(2200);
    await p.addStyleTag({ content: CSS }); await aviso(p, false); return p; };
  const aviso = async (p, mostrar) => p.evaluate((m) => { let st = document.getElementById('cap-aviso'); if (!st) { st = document.createElement('style'); st.id = 'cap-aviso'; document.head.appendChild(st); } st.textContent = m ? '' : '.aviso{display:none!important}'; }, mostrar);
  const hide = async (p, sels) => p.evaluate((s) => { let st = document.getElementById('vid-css'); if (!st) { st = document.createElement('style'); st.id = 'vid-css'; document.head.appendChild(st); } st.textContent = s ? s + '{visibility:hidden!important}' : ''; }, sels);
  const shot = async (p, n, o = {}) => { await p.waitForTimeout(350); await p.screenshot({ path: path.join(O, n + '.jpg'), type: 'jpeg', quality: 92, ...o }); };
  const fechar = async (p) => { await p.keyboard.press('Escape'); await p.waitForTimeout(300); for (let i = 0; i < 3; i++) { const n = await p.evaluate(() => { const x = document.querySelector('.sheet-backdrop'); if (x) { x.dispatchEvent(new MouseEvent('click', { bubbles: true })); x.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } return !!x; }); if (!n) break; await p.waitForTimeout(400); } };
  const top = async (p) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200); };
  const yPag = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + window.scrollY : 0; }, sel);
  // ================= COMPUTADOR =================
  const d = await mk({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const go = async (t) => { await d.click(`.dsb-i[data-tab="${t}"]`); await d.waitForTimeout(800); await top(d); };
  const fullD = async (n) => { await top(d); await shot(d, n + '-vp'); await hide(d, '.dsb,.topwrap'); await shot(d, n + '-full', { fullPage: true }); await hide(d, '');
    await d.locator('.topwrap').first().screenshot({ path: path.join(O, n + '-top.png') }); await d.locator('.dsb').first().screenshot({ path: path.join(O, n + '-side.png') });
    T[n + '-h'] = await d.evaluate(() => document.documentElement.scrollHeight); };
  T.dside = await bb(d, '.dsb'); T.dtop = await bb(d, '.topwrap');
  await fullD('d-inicio');
  for (const t of ['inicio', 'faturamento', 'calendario', 'despesas', 'investimentos', 'organizacao', 'contabilidade', 'visao', 'metas', 'importar']) { try { T['d-nav-' + t] = await bb(d, `.dsb-i[data-tab="${t}"]`); } catch (e) {} }
  await go('calendario'); await shot(d, 'd-cal');
  T['d-cal-saldo'] = await bb(d, d.locator('.kpi-box', { hasText: 'Saldo do mês' }).first());
  T['d-cal-kpis'] = await bb(d, d.locator('.kpi-box', { hasText: 'Plantões' }).first());
  T['d-cal-14'] = await bb(d, d.locator('.cal-cell', { has: d.locator('.cal-day-num', { hasText: /^14$/ }) }).first());
  await d.locator('.cal-cell', { has: d.locator('.cal-day-num', { hasText: /^14$/ }) }).first().click(); await d.waitForTimeout(600); await shot(d, 'd-cal-dia');
  await fechar(d);
  await go('investimentos'); await fullD('d-inv');
  await go('contabilidade'); await fullD('d-contab');
  // ================= CELULAR =================
  const m = await mk({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const vpM = async (n) => { await hide(m, ''); await shot(m, n); };
  const fullM = async (n) => { await top(m); await shot(m, n + '-vp'); await hide(m, '.dock,.topbar2'); await shot(m, n + '-full', { fullPage: true }); await hide(m, '');
    await m.locator('.topbar2').first().screenshot({ path: path.join(O, n + '-top.png') }); T[n + '-h'] = await m.evaluate(() => document.documentElement.scrollHeight); };
  await m.locator('.dock').first().screenshot({ path: path.join(O, 'm-dock.png'), omitBackground: true });
  T.mdock = await bb(m, '.dock'); T.mtop = await bb(m, '.topbar2'); T.mnovo = await bb(m, '.dk-novo');
  await fullM('m-inicio');
  for (const t of ['inicio', 'calendario', 'despesas']) T['m-dock-' + t] = await bb(m, `.dock .dk-btn[data-tab="${t}"]`);
  T['m-mais'] = await bb(m, '.dk-btn[aria-label="Mais seções"]');
  // Hoje: um toque em Recebi
  const rec = m.locator('#hoje-card .hoje-it.t-receber .dia-chk').first(); T['m-hoje-recebi'] = await bb(m, rec);
  await aviso(m, true); await rec.click(); await m.waitForTimeout(500); await vpM('m-hoje2'); await aviso(m, false);
  await fullM('m-hoje3'); T['m-hoje3-pagar'] = await yPag(m, '#pagar-agora-mini');
  // + Plantão
  await m.click('.dk-novo'); await m.waitForTimeout(500); await vpM('m-add'); T['m-add-plantao'] = await bb(m, '.add-op[data-add="plantao"]');
  await m.click('.add-op[data-add="plantao"]'); await m.waitForTimeout(400); await vpM('m-plantao'); T['m-fixo'] = await bb(m, 'button:has-text("Fixo, se repete")');
  await m.click('button:has-text("Fixo, se repete")'); await m.waitForTimeout(400); await vpM('m-fixo'); T['m-dia'] = await bb(m, '.add-sheet button:text-is("T")');
  await m.locator('.add-sheet button:text-is("T")').first().click(); await m.waitForTimeout(300); await vpM('m-dia');
  await m.locator('.add-sheet .fm-op').first().evaluate((el) => el.scrollIntoView({ block: 'center' })); await m.waitForTimeout(300); await vpM('m-forma');
  await fechar(m); await top(m);
  // Contas e Organizar
  await m.click('.dock .dk-btn[data-tab="despesas"]'); await m.waitForTimeout(700); await fullM('m-desp');
  T['m-seg2'] = await bb(m, '.grp-seg button:nth-child(2)');
  await m.click('.grp-seg button:nth-child(2)'); await m.waitForTimeout(700); await fullM('m-org'); T['m-org-sug'] = await yPag(m, '#oa-sugestao');
  // Mais (aberto sobre a tela Hoje)
  await m.click('.dock .dk-btn[data-tab="inicio"]'); await m.waitForTimeout(700); await top(m);
  await m.click('.dk-btn[aria-label="Mais seções"]'); await m.waitForTimeout(400); await vpM('m-maismenu');
  for (const t of ['investimentos', 'metas', 'visao', 'contabilidade', 'importar', 'backup']) T['m-item-' + t] = await bb(m, `.dk-item[data-tab="${t}"]`);
  T['m-item-vale'] = await bb(m, '#dk-vale');
  // Vale a pena?
  await m.click('#dk-vale'); await m.waitForTimeout(500); await vpM('m-vale0');
  const chips = m.locator('.sheet.vale .chip-row').first().locator('.chip'); const upa = chips.filter({ hasText: 'UPA Norte' }).first();
  T['m-vale-upa'] = await bb(m, upa); T['m-vale-valor'] = await bb(m, '#vale-valor');
  await upa.click(); await m.waitForTimeout(300); await vpM('m-vale1');
  await m.fill('#vale-valor', '180000'); await m.locator('#vale-valor').blur(); await m.waitForTimeout(400); await vpM('m-vale');
  await fechar(m); await top(m);
  const mais = async (t) => { await m.click('.dk-btn[aria-label="Mais seções"]'); await m.waitForTimeout(400); await m.click(`.dk-item[data-tab="${t}"]`); await m.waitForTimeout(800); await top(m); };
  // Importar
  await mais('importar'); await vpM('m-imp'); T['m-imp-cart'] = await bb(m, '#src-carteira');
  await m.click('#src-carteira'); await m.waitForTimeout(400); await fullM('m-imp2');
  // Metas
  await mais('metas'); await fullM('m-metas'); T['m-meta1'] = await bb(m, '.mt-meta .mt-row');
  await m.click('.mt-meta .mt-row'); await m.waitForTimeout(600); await fullM('m-metas2'); T['m-metas2-chart'] = await yPag(m, '.gp-chart'); T['m-metas2-pl'] = await yPag(m, '.gpl');
  // Ajustes
  await mais('backup'); await fullM('m-backup');
  // Férias (celular)
  await m.click('.dock .dk-btn[data-tab="calendario"]'); await m.waitForTimeout(800); await top(m); await vpM('m-cal'); T['m-cal-ferias'] = await bb(m, '#cal-ferias');
  await m.click('#cal-ferias'); await m.waitForTimeout(500); await vpM('m-fer0'); T['m-fer-ini'] = await bb(m, '#fer-ini');
  await m.fill('#fer-ini', isoDaqui(2)); await m.fill('#fer-fim', isoDaqui(16)); await m.locator('#fer-fim').blur(); await m.waitForTimeout(400); await vpM('m-fer1');
  await m.evaluate(() => { const x = document.querySelector('#ferias-sheet'); x.scrollTop = x.scrollHeight; }); await m.waitForTimeout(300); await vpM('m-fer2'); T['m-fer-salvar'] = await bb(m, '#fer-salvar');
  await m.click('#fer-salvar'); await m.waitForTimeout(400); await fechar(m); await top(m); await vpM('m-cal2');
  // Guia de abertura (pessoa nova, sem dados)
  const gc = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Bahia', serviceWorkers: 'block' });
  await gc.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('mediplan-cloud-skip', '1'); localStorage.setItem('mediplan-uso-off', '1'); } });
  const g = await gc.newPage(); await g.route(/^https?:\/\/(?!localhost)/, (r) => r.abort()); await g.goto(url); await g.waitForTimeout(2200); await g.addStyleTag({ content: CSS }); await aviso(g, false);
  await shot(g, 'm-guia1'); T['m-bv-seguir'] = await bb(g, '.bv-seguir');
  for (let i = 1; i < 10; i++) { await g.click('.bv-seguir'); await g.waitForTimeout(350); if ([4, 8, 9].includes(i)) await shot(g, 'm-guia' + (i + 1)); }
  T['m-bv-completo'] = await bb(g, '.modo-op[data-modo="completo"]'); T['m-bv-comecar'] = await bb(g, '.bv-seguir');
  await g.click('.modo-op[data-modo="completo"]'); await g.waitForTimeout(300); await shot(g, 'm-guia10c');
  fs.writeFileSync(path.join(V, 'pontos.json'), JSON.stringify(T)); console.log(Object.keys(T).join(' '));
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
