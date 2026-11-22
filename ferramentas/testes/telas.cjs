// Tira as fotos das telas principais para mandar ao João antes de publicar.
// Uso: node ferramentas/testes/telas.cjs [simples|completo|novo]   (padrão: completo)
// Salva em ferramentas/saida/ (pasta ignorada pelo git): celular 412px claro, Fold fechado 344px escuro e computador 1440px.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const { servidor, abrirApp, irPara, isoDaqui } = require('../comum.cjs');
const cenario = process.argv[2] || 'completo';
const SAIDA = path.join(__dirname, '..', 'saida'); fs.mkdirSync(SAIDA, { recursive: true });
(async () => {
  const srv = await servidor(); const nav = await chromium.launch({ args: ['--lang=pt-BR'], env: { ...process.env, LANG: 'pt_BR.UTF-8' } });
  for (const [largura, altura, tema] of [[412, 915, 'claro'], [344, 760, 'escuro'], [1440, 900, 'claro']]) {
    const { ctx, p } = await abrirApp(nav, srv.url, { largura, altura, tema, cenario });
    const foto = async (nome) => { await p.waitForTimeout(400); await p.screenshot({ path: path.join(SAIDA, `${cenario}-${nome}-${largura}-${tema}.png`) }); };
    if (cenario === 'novo') {
      for (let i = 1; i <= 12 && (await p.$('.bv-seguir')); i++) { await foto('guia' + i); if (!(await p.$('.bv-pular'))) break; await p.click('.bv-seguir'); }
    } else {
      await foto('hoje');
      for (const aba of ['calendario', 'faturamento', 'despesas']) { await irPara(p, aba); await p.evaluate(() => scrollTo(0, 0)); await foto(aba); }
      await irPara(p, 'calendario'); await p.click('#cal-ferias'); await p.waitForTimeout(400);
      await p.fill('#fer-ini', isoDaqui(2)); await p.fill('#fer-fim', isoDaqui(16)); await p.waitForTimeout(300); await foto('ferias');
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      if (largura < 721) { await p.click('button[aria-label="Mais seções"]'); await p.waitForTimeout(400); await foto('mais'); }
    }
    await ctx.close();
  }
  await nav.close(); srv.fechar(); console.log('Fotos em', SAIDA);
})().catch((e) => { console.error(e); process.exit(1); });
