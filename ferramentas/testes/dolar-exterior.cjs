// Exterior: o app grava o dólar (PTAX) do dia de cada compra e calcula o custo em reais por ele, como as corretoras.
// Usa respostas simuladas do Banco Central e da AwesomeAPI (sem internet de verdade).
const { chromium } = require('playwright');
const { servidor, dadosDeTeste } = require('../comum.cjs');
const PTAX = { '2026-03-09': 5.70, '2026-03-10': 5.80, '2026-06-12': 5.10 }; // 13/06/2026 é sábado: vale o de sexta (12/06)
async function rodar(nav, url, fonte) {
  const d = dadosDeTeste('completo');
  d.investments.push({ id: 'v1', description: 'VOO', category: 'Exterior', tipo: 'compra', qty: 2, price: 500, amount: 1000, date: '2026-03-10' });
  d.investments.push({ id: 'v2', description: 'VOO', category: 'Exterior', tipo: 'compra', qty: 2, price: 550, amount: 1100, date: '2026-06-13' });
  d.cotacoes = { ...(d.cotacoes || {}), VOO: 600, __USD: 5.5 };
  const p = await nav.newPage();
  await p.route(/^https?:\/\/(?!localhost|127)/, (r) => {
    const u = r.request().url();
    if (/olinda\.bcb/.test(u)) return fonte === 'bcb' ? r.fulfill({ contentType: 'application/json', body: JSON.stringify({ value: Object.entries(PTAX).map(([dd, v]) => ({ cotacaoVenda: v, dataHoraCotacao: dd + ' 13:09:00.000' })) }) }) : r.abort();
    if (/awesomeapi.*daily/.test(u)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(Object.entries(PTAX).map(([dd, v]) => ({ bid: String(v), timestamp: String(Date.parse(dd + 'T15:00:00Z') / 1000) }))) });
    return r.abort();
  });
  await p.addInitScript(([d]) => { if (sessionStorage.getItem('t')) return; sessionStorage.setItem('t', '1'); localStorage.clear(); localStorage.setItem('mediplan-cloud-skip', '1'); localStorage.setItem('mediplan-data-v2', JSON.stringify(d)); }, [d]);
  await p.goto(url); await p.waitForTimeout(4500);
  const r = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('mediplan-data-v2')); return d.investments.filter((i) => i.description === 'VOO').map((i) => i.fx); });
  await p.close();
  return r;
}
(async () => {
  const s = await servidor(); const nav = await chromium.launch(); const falhas = [];
  for (const fonte of ['bcb', 'awesome']) {
    const fx = await rodar(nav, s.url, fonte);
    console.log(fonte, 'dólar gravado:', fx.join(', '));
    if (fx[0] !== 5.8 || fx[1] !== 5.1) falhas.push(fonte + ': esperava 5.8 e 5.1 (sábado usa sexta), veio ' + fx.join(', '));
  }
  // conta: custo em reais = 1000×5,80 + 1100×5,10 = 11.410; valor hoje = 4×600×5,50 = 13.200; ganho do ativo = (2400−2100)×5,5 = 1.650; efeito do dólar = 13.200 − 11.410 − 1.650 = 140
  const p = await nav.newPage(); await p.route(/^https?:\/\/(?!localhost|127)/, (r) => r.abort());
  await p.goto(s.url); await p.waitForTimeout(1500);
  const c = await p.evaluate(() => {
    const inv = [{ id: 'a', description: 'VOO', category: 'Exterior', tipo: 'compra', qty: 2, amount: 1000, date: '2026-03-10', fx: 5.8 }, { id: 'b', description: 'VOO', category: 'Exterior', tipo: 'compra', qty: 2, amount: 1100, date: '2026-06-13', fx: 5.1 }, { id: 'c', description: 'VOO', category: 'Exterior', tipo: 'venda', qty: 1, amount: 600, date: '2026-07-01', fx: 5.3 }];
    return window.__carteira ? window.__carteira(inv, { VOO: 600, __USD: 5.5 }) : null;
  });
  if (!c) falhas.push('window.__carteira não existe');
  else {
    const v = c.positions[0];
    const ok = (a, b) => Math.abs(a - b) < 0.02;
    // depois da venda de 1 de 4: custo em reais 11.410 × 3/4 = 8.557,50; PM em dólar 525
    if (!ok(v.cost, 8557.5)) falhas.push('custo em reais ' + v.cost);
    if (!ok(v.avgUsd, 525)) falhas.push('preço médio em dólar ' + v.avgUsd);
    if (!ok(v.value, 3 * 600 * 5.5)) falhas.push('valor hoje ' + v.value);
    if (!ok(v.realized, 600 * 5.3 - 11410 / 4)) falhas.push('resultado da venda ' + v.realized);
    if (!ok(c.totalBought, 11410)) falhas.push('total comprado ' + c.totalBought);
    console.log('custo R$', v.cost.toFixed(2), '· PM US$', v.avgUsd.toFixed(2), '· venda R$', v.realized.toFixed(2), '· efeito do dólar R$', v.efeitoCambio.toFixed(2));
  }
  console.log(falhas.length ? 'FALHOU: ' + falhas.join(' ; ') : 'Tudo certo');
  await nav.close(); s.fechar(); process.exit(falhas.length ? 1 : 0);
})();
