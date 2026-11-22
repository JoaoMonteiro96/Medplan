// Confere se nada sai da tela nas larguras combinadas e se o app não dá erro.
// Uso: node ferramentas/testes/larguras.cjs   (depois de npm run build)
const { chromium } = require('playwright');
const { servidor, abrirApp, sobra, irPara } = require('../comum.cjs');
const LARGURAS = [344, 360, 390, 412, 430, 600, 690, 1440]; // 344 = Fold fechado, 412 = celular do João, 690 = Fold aberto
(async () => {
  const srv = await servidor(); const nav = await chromium.launch(); const problemas = [];
  for (const largura of LARGURAS) for (const cenario of ['novo', 'simples', 'completo']) for (const tema of ['claro', 'escuro']) {
    const { ctx, p, erros } = await abrirApp(nav, srv.url, { largura, altura: 900, tema, cenario, escala: 1 });
    const confere = async (onde) => { const s = await sobra(p); if (s > 0) problemas.push(`${largura}px ${cenario} ${tema} ${onde}: passa ${s}px da tela`); };
    if (cenario === 'novo') {
      for (let i = 0; i < 12 && (await p.$('.bv-seguir')); i++) { await confere('guia tela ' + (i + 1)); if (await p.$('.bv-pular')) await p.click('.bv-seguir'); else break; await p.waitForTimeout(250); }
    } else {
      await confere('Hoje');
      for (const aba of ['calendario', 'faturamento', 'despesas', 'organizacao', 'metas']) { await irPara(p, aba); await confere(aba); }
      await irPara(p, 'calendario'); await p.click('#cal-ferias'); await p.waitForTimeout(400); await confere('Férias');
    }
    erros.forEach((e) => problemas.push(`${largura}px ${cenario} ${tema}: erro "${e}"`));
    await ctx.close();
  }
  await nav.close(); srv.fechar();
  console.log(problemas.length ? 'PROBLEMAS:\n' + problemas.join('\n') : 'Tudo certo: nada sai da tela e nenhum erro.');
  process.exit(problemas.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
