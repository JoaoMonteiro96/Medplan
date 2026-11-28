// Nota de corretagem americana (modelo Apex Clearing, usado pela Nomad): lê compras e vendas em dólar.
// Usa a nota fictícia ferramentas/dados/nota-exterior-teste.pdf (gerada por ferramentas/dados/gerar-nota-exterior.py).
const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const { servidor, dadosDeTeste } = require('../comum.cjs');
(async () => {
  const s = await servidor(); const nav = await chromium.launch(); const p = await nav.newPage();
  await p.route(/^https?:\/\/(?!localhost|127)/, (r) => r.abort());
  await p.addInitScript(([d]) => { localStorage.clear(); localStorage.setItem('mediplan-cloud-skip', '1'); localStorage.setItem('mediplan-data-v2', JSON.stringify(d)); }, [dadosDeTeste('completo')]);
  await p.goto(s.url); await p.waitForTimeout(2500);
  const b64 = fs.readFileSync(path.join(__dirname, '..', 'dados', 'nota-exterior-teste.pdf')).toString('base64');
  const r = await p.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const linhas = await window.__mp.pdfToLines(bin.buffer);
    let res = window.__mp.parseNotaCorretagem(linhas);
    if (!res.rows.length) res = { rows: window.__mp.lerTradesExterior(linhas) };
    return res.rows.map((x) => [x.ticker, x.side, x.qty, x.price, x.amount, x.date, x.category, x.moeda, x.name].join('|'));
  }, b64);
  const esperado = ['NVDA|compra|3.14316|159.0755|500|2026-11-13|Exterior|USD|NVIDIA CORPORATION COM', 'VOO|compra|2.5|612.4|1531|2026-11-13|Exterior|USD|VANGUARD S&P 500 ETF', 'AAPL|venda|4|230.1|920.38|2026-11-13|Exterior|USD|APPLE INC COM'];
  const falhas = esperado.filter((e) => !r.includes(e));
  console.log(r.join('\n'));
  console.log(falhas.length ? 'FALHOU: faltou ' + falhas.join(' ; ') : 'Tudo certo');
  await nav.close(); s.fechar(); process.exit(falhas.length ? 1 : 0);
})();
