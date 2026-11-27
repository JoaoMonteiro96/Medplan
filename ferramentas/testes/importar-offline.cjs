// Leitores do Importar (PDF, planilha e foto) guardados no app: funcionam sem internet depois de usados uma vez.
const { chromium } = require('playwright');
const { servidor, dadosDeTeste } = require('../comum.cjs');
(async () => {
  const s = await servidor(); const nav = await chromium.launch(); let falhas = 0;
  const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA ') + m); if (!c) falhas++; };
  const ctx = await nav.newContext({ viewport: { width: 412, height: 915 }, locale: 'pt-BR', serviceWorkers: 'allow' });
  const d = dadosDeTeste('completo');
  await ctx.addInitScript(([d]) => { if (localStorage.getItem('mediplan-data-v2')) return; localStorage.setItem('mediplan-cloud-skip', '1'); localStorage.setItem('mediplan-uso-off', '1'); localStorage.setItem('mediplan-guia', 'antigo'); localStorage.setItem('mediplan-data-v2', JSON.stringify(d)); }, [d]);
  // nada pode vir de fora: só o próprio site
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(e.message));
  await p.goto(s.url); await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(2500);
  await p.reload(); await p.waitForTimeout(2500);
  const carregar = (src) => p.evaluate((src) => new Promise((res) => { const sc = document.createElement('script'); sc.src = src; sc.onload = () => res(true); sc.onerror = () => res(false); document.head.appendChild(sc); }), src);
  const ocr = () => p.evaluate(async () => {
    const cv = document.createElement('canvas'); cv.width = 600; cv.height = 120; const cx = cv.getContext('2d');
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, 600, 120); cx.fillStyle = '#000'; cx.font = 'bold 48px sans-serif'; cx.fillText('PETR4 100', 20, 80);
    const u = (c) => new URL(c, document.baseURI).href;
    const w = await window.Tesseract.createWorker('por', 1, { workerPath: u('libs/tesseract-5.1.1/worker.min.js'), corePath: u('libs/tesseract-core-5.1.1'), langPath: u('libs/tessdata-por-best-int'), workerBlobURL: false });
    try { const { data } = await w.recognize(cv); return data.text; } finally { await w.terminate(); }
  });
  ok(await carregar('libs/pdf-3.11.174.min.js') && await p.evaluate(() => !!window.pdfjsLib), 'leitor de PDF carrega do próprio app');
  ok(await carregar('libs/xlsx-0.18.5.full.min.js') && await p.evaluate(() => !!window.XLSX), 'leitor de planilha carrega do próprio app');
  ok(await carregar('libs/tesseract-5.1.1/tesseract.min.js'), 'leitor de foto carrega do próprio app');
  const t1 = await ocr(); ok(/PETR/.test(t1) && /100/.test(t1), 'leu a foto com internet: ' + JSON.stringify(t1.trim()));
  // sem internet
  await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => !!document.querySelector('.app')), 'app abre sem internet');
  ok(await carregar('libs/pdf-3.11.174.min.js') && await p.evaluate(() => !!window.pdfjsLib), 'leitor de PDF sem internet');
  ok(await carregar('libs/xlsx-0.18.5.full.min.js') && await p.evaluate(() => !!window.XLSX), 'leitor de planilha sem internet');
  ok(await carregar('libs/tesseract-5.1.1/tesseract.min.js'), 'leitor de foto sem internet');
  let t2 = ''; try { t2 = await ocr(); } catch (e) { t2 = 'erro: ' + e.message; }
  ok(/PETR/.test(t2) && /100/.test(t2), 'leu a foto sem internet: ' + JSON.stringify(String(t2).trim()));
  ok(!erros.length, 'sem erros na página ' + erros.join(' | '));
  console.log(falhas ? `${falhas} falha(s)` : 'Tudo certo'); await nav.close(); s.fechar();
})();
