// Toque com o dedo nos gráficos (Fold fechado, 344 px): cada barra tocada tem que marcar o próprio mês.
// Antes, o aviso de "o dedo saiu" que o celular manda depois do toque apagava a escolha e o gráfico voltava ao último mês.
const path = require('path'); const { chromium } = require('playwright');
const { servidor, dadosDeTeste, irPara } = require('../comum.cjs');
let falhou = false;
(async () => { const s = await servidor(); const nav = await chromium.launch(); const d = dadosDeTeste('completo');
  for (const [W, mob] of [[344, true]]) {
  const ctx = await nav.newContext({ viewport: { width: W, height: 900 }, isMobile: mob, hasTouch: mob, deviceScaleFactor: 2.6, locale: 'pt-BR', serviceWorkers: 'block' });
  await ctx.addInitScript(([d]) => { if (sessionStorage.getItem('t')) return; sessionStorage.setItem('t','1'); localStorage.clear(); const mk = new Date().toISOString().slice(0,7);
    Object.entries({ 'mediplan-cloud-skip':'1','mediplan-uso-off':'1','mediplan-guia':'antigo','mediplan-tema':'claro','mediplan-convite-lembrete':'1','mediplan-convite-colega':'1','mediplan-lembrete-carteira':mk,'mediplan-resumo-visto':mk }).forEach(([k,v]) => localStorage.setItem(k,v));
    localStorage.setItem('mediplan-data-v2', JSON.stringify(d)); }, [d]);
  const p = await ctx.newPage(); await p.route(/^https?:\/\/(?!localhost|127)/, (r) => r.abort());
  await p.goto(s.url); await p.waitForTimeout(2500); await p.addStyleTag({ content: '#splash{display:none!important} .aviso{display:none!important} .dock{pointer-events:none!important}' });
  if (mob) { await p.evaluate(() => { const b = [...document.querySelectorAll('.dock .dk-btn')].find((x) => /Mais/.test(x.textContent)); b && b.click(); }); await p.waitForTimeout(300); await p.evaluate(() => { const b = [...document.querySelectorAll('button,a')].find((x) => x.offsetParent && /^Investimentos/.test(x.textContent.trim())); b && b.click(); }); }
  else await irPara(p, 'investimentos');
  await p.waitForTimeout(800);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.pat-f button')].find((x) => x.textContent === '1A'); b && b.click(); }); await p.waitForTimeout(500);
  const barras = await p.evaluate(() => [...document.querySelectorAll('.pat-bars g[data-barra] rect')].filter((r, k, a) => r.classList.contains('pat-ap')).map((r) => { const b = r.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }));
  const erros = [];
  for (let j = 0; j < barras.length; j++) {
    await p.touchscreen.tap(barras[j][0], barras[j][1]); await p.waitForTimeout(120);
    const on = await p.evaluate(() => [...document.querySelectorAll('.pat-xl span')].findIndex((x) => x.classList.contains('on')));
    if (on !== j) erros.push(`barra ${j} → marcou ${on}`);
  }
  // Contas › Sobra mês a mês (SvgBarChart): toca no centro de cada barra e confere o mês do balão
  if (mob) { await p.evaluate(() => { const b = [...document.querySelectorAll('.dock .dk-btn')].find((x) => /Contas/.test(x.textContent)); b && b.click(); }); } else await irPara(p, 'despesas');
  await p.waitForTimeout(900);
  const info = await p.evaluate(() => { const c = document.querySelector('#oa-sobra-meses .chart-box svg'); if (!c) return null; c.scrollIntoView({ block: 'center' }); return true; });
  await p.waitForTimeout(400);
  const bs = await p.evaluate(() => { const c = document.querySelector('#oa-sobra-meses .chart-box svg'); if (!c) return []; const labs = [...c.querySelectorAll('text')].map((t) => ({ t: t.textContent, x: t.getBoundingClientRect().left + t.getBoundingClientRect().width / 2 })).filter((l) => /^[A-Z][a-z]{2}$/.test(l.t)); const r = c.getBoundingClientRect(); return labs.map((l) => [l.x, r.top + r.height * 0.45, l.t]); });
  const e2 = [];
  for (const [x, y, t] of bs) { await p.touchscreen.tap(x, y); await p.waitForTimeout(150); const tip = await p.evaluate(() => { const e = document.querySelector('#oa-sobra-meses .chart-tip'); return e ? e.textContent : ''; }); if (!tip.toLowerCase().includes(t.toLowerCase().slice(0, 3))) e2.push(t + '→' + tip.slice(0, 12)); }
  console.log(W, 'sobra mês a mês', bs.length, e2.length ? e2.join(', ') : 'ok'); if (e2.length) falhou = true;
  if (!mob) {
    await irPara(p, 'inicio'); await p.waitForTimeout(900);
    const n = await p.evaluate(() => document.querySelectorAll('.chart-box svg').length);
    for (let ci = 0; ci < n; ci++) {
      const bs2 = await p.evaluate((ci) => { const c = document.querySelectorAll('.chart-box svg')[ci]; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return [...c.querySelectorAll('text')].map((t) => ({ t: t.textContent, b: t.getBoundingClientRect() })).filter((l) => /^[A-Z][a-z]{2}$/.test(l.t)).map((l) => [l.b.left + l.b.width / 2, r.top + r.height * 0.5, l.t]); }, ci);
      const e3 = [];
      for (const [x, y, t] of bs2) { await p.mouse.click(x, y); await p.waitForTimeout(120); const tip = await p.evaluate((ci) => { const box = document.querySelectorAll('.chart-box')[ci]; const e = box && box.querySelector('.chart-tip'); return e ? e.textContent : '(sem balão)'; }, ci); if (!tip.toLowerCase().includes(t.toLowerCase())) e3.push(t + '→' + tip.slice(0, 14)); }
      console.log('início gráfico', ci, bs2.length, e3.length ? e3.slice(0, 6).join(', ') : 'ok');
    }
  }
  console.log(W, 'patrimônio', barras.length, 'barras', erros.length ? erros.join(', ') : 'ok'); if (erros.length) falhou = true;
  await ctx.close(); }
  await nav.close(); s.fechar(); console.log(falhou ? 'FALHOU' : 'Tudo certo'); process.exit(falhou ? 1 : 0); })();
