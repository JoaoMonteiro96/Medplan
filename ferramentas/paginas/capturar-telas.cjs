// Fotos das telas para a página de apresentação (conheca/img/n-*.jpg), com dados fictícios.
// Celular de 390 x 844 em dobro (780 x 1688), sem cortes. Uso: node ferramentas/paginas/capturar-telas.cjs
const path = require('path');
const { chromium } = require('playwright');
const { servidor, dadosDeTeste, irPara } = require('../comum.cjs');
const DEST = path.join(__dirname, '..', '..', 'conheca', 'img');
(async () => {
  const s = await servidor(); const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Bahia', serviceWorkers: 'block' });
  const d = dadosDeTeste('completo');
  await ctx.addInitScript(([d]) => {
    if (sessionStorage.getItem('t')) return; sessionStorage.setItem('t', '1'); localStorage.clear();
    const mk = new Date().toISOString().slice(0, 7);
    Object.entries({ 'mediplan-cloud-skip': '1', 'mediplan-uso-off': '1', 'mediplan-guia': 'antigo', 'mediplan-tema': 'claro', 'mediplan-convite-lembrete': '1', 'mediplan-convite-colega': '1', 'mediplan-lembrete-carteira': mk, 'mediplan-resumo-visto': mk }).forEach(([k, v]) => localStorage.setItem(k, v));
    localStorage.setItem('mediplan-data-v2', JSON.stringify(d));
  }, [d]);
  const p = await ctx.newPage();
  await p.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await p.goto(s.url); await p.waitForTimeout(2800);
  await p.addStyleTag({ content: '#splash{display:none!important} .aviso{display:none!important} *{scrollbar-width:none!important}' });
  const foto = async (nome) => { await p.waitForTimeout(700); await p.screenshot({ path: path.join(DEST, nome + '.jpg'), type: 'jpeg', quality: 88 }); console.log('ok', nome); };
  const tocar = (re) => p.evaluate((r) => { const b = [...document.querySelectorAll('button, a')].find((x) => x.offsetParent && new RegExp(r).test(x.textContent.trim())); if (b) b.click(); return !!b; }, re);
  // Hoje
  await p.evaluate(() => window.scrollTo(0, 0)); await foto('n-hoje');
  // Plantões › Recebimentos
  await irPara(p, 'calendario'); await foto('n-agenda');
  await tocar('^Recebimentos'); await p.waitForTimeout(600); await foto('n-recebimentos');
  // Férias (no calendário)
  await tocar('^Agenda'); await p.waitForTimeout(500);
  await p.click('#cal-ferias').catch(() => {}); await p.waitForTimeout(900); await foto('n-ferias');
  await p.keyboard.press('Escape').catch(() => {}); await p.evaluate(() => { const b = document.querySelector('.sheet-backdrop'); if (b) b.click(); }); await p.waitForTimeout(400);
  // Contas
  await irPara(p, 'despesas'); await p.evaluate(() => window.scrollTo(0, 0)); await foto('n-contas');
  // Impostos
  await p.evaluate(() => { const b = [...document.querySelectorAll('.dock .dk-btn')].find((x) => /Mais/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(500);
  await tocar('^(Impostos|Contabilidade)'); await p.waitForTimeout(800); await p.evaluate(() => window.scrollTo(0, 0)); await foto('n-impostos');
  // Investimentos
  await p.evaluate(() => { const b = [...document.querySelectorAll('.dock .dk-btn')].find((x) => /Mais/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(500);
  await tocar('^Investimentos'); await p.waitForTimeout(900); await p.evaluate(() => window.scrollTo(0, 0)); await foto('n-investimentos');
  await nav.close(); s.fechar();
})();
