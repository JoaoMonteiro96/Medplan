// Peças comuns dos testes e da gravação do vídeo: servidor local, dados fictícios e abertura do app.
// O Playwright precisa estar instalado (npm i -g playwright, ou o que já vier no ambiente).
const http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.css': 'text/css', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.gz': 'application/gzip' };

// serve a pasta do repositório (o mesmo que o GitHub Pages publica)
function servidor() {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(RAIZ, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); r.end(d); } });
  });
  return new Promise((ok) => srv.listen(0, () => ok({ url: `http://localhost:${srv.address().port}/`, fechar: () => srv.close() })));
}

// dados fictícios (Hospital Central, UPA Norte, Hospital São Lucas...) com as datas trazidas para hoje.
// O arquivo foi montado em 21/11/2026; tudo anda junto para o "hoje" do teste ter plantões e contas.
// antes: função opcional que mexe nos dados com as datas originais (novembro de 2026), antes de trazê-las para hoje
function dadosDeTeste(extra, antes) {
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'dados', 'teste.json'), 'utf8'));
  if (antes) antes(base);
  const BASE = new Date('2026-11-21T12:00:00'), hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  const dd = Math.round((hoje - BASE) / 864e5), dm = (hoje.getFullYear() - 2026) * 12 + (hoje.getMonth() - 10);
  const pad = (n) => String(n).padStart(2, '0');
  const dia = (x) => { const d = new Date(x + 'T12:00:00'); d.setDate(d.getDate() + dd); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const mes = (x) => { const d = new Date(+x.slice(0, 4), +x.slice(5, 7) - 1 + dm, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const mexe = (v) => {
    if (typeof v === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? dia(v) : /^\d{4}-\d{2}$/.test(v) ? mes(v) : v;
    if (Array.isArray(v)) return v.map(mexe);
    if (v && typeof v === 'object') { const o = {}; for (const k in v) o[/^\d{4}-\d{2}-\d{2}$/.test(k) ? dia(k) : /^\d{4}-\d{2}$/.test(k) ? mes(k) : k] = mexe(v[k]); return o; }
    return v;
  };
  const d = dd === 0 ? base : mexe(base);
  if (extra === 'simples') d.contab = { ...(d.contab || {}), modoApp: 'simples' };
  return d;
}
const isoDaqui = (dias) => { const d = new Date(); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); };

// abre o app num navegador de teste.
// cenario: 'completo' (com dados), 'simples' (com dados, modo Simples) ou 'novo' (sem dados: aparece o guia)
async function abrirApp(navegador, url, { largura = 412, altura = 915, tema = 'claro', cenario = 'completo', escala = 2 } = {}) {
  const cel = largura < 721;
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: escala, isMobile: cel, hasTouch: cel, locale: 'pt-BR', timezoneId: 'America/Bahia', serviceWorkers: 'block' });
  const dados = cenario === 'novo' ? null : dadosDeTeste(cenario);
  await ctx.addInitScript(([d, t]) => {
    if (sessionStorage.getItem('teste')) return; sessionStorage.setItem('teste', '1'); localStorage.clear();
    localStorage.setItem('mediplan-cloud-skip', '1'); localStorage.setItem('mediplan-uso-off', '1'); localStorage.setItem('mediplan-tema', t);
    if (d) { localStorage.setItem('mediplan-guia', 'antigo'); localStorage.setItem('mediplan-data-v2', JSON.stringify(d)); }
  }, [dados, tema]);
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  await p.route(/^https?:\/\/(?!localhost|fonts\.googleapis\.com|fonts\.gstatic\.com)/, (r) => r.abort());
  await p.goto(url); await p.waitForTimeout(2600);
  await p.addStyleTag({ content: '#splash{display:none!important}' });
  return { ctx, p, erros };
}
// quanto a página passa da largura da tela (0 = nada saindo para o lado)
const sobra = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
// troca de tela pelo menu de baixo (celular) ou pela barra lateral (computador)
const irPara = async (p, aba) => { await p.evaluate((a) => { const b = [...document.querySelectorAll(`.dock .dk-btn[data-tab="${a}"], .dsb-i[data-tab="${a}"]`)].find((x) => x.offsetParent); if (b) b.click(); }, aba); await p.waitForTimeout(800); };

module.exports = { RAIZ, servidor, dadosDeTeste, isoDaqui, abrirApp, sobra, irPara };
