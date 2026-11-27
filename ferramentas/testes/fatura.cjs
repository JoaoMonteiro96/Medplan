// Teste da fatura do cartão no Importar (CSV fictício no formato do C6, com a coluna "Categoria").
// Confere: categoria do banco para nomes genéricos, luz/água/veterinário, "Revisar compras em Outros" e o aprendizado da loja.
// Uso: node ferramentas/testes/fatura.cjs [pasta-para-fotos]
const path = require('path');
const { chromium } = require('playwright');
const { servidor, abrirApp } = require('../comum.cjs');
const SAIDA = process.argv[2];
const CSV = path.join(__dirname, '..', 'dados', 'fatura-teste.csv');
(async () => {
  const s = await servidor(); const nav = await chromium.launch(); let falhas = 0;
  const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA ') + m); if (!c) falhas++; };
  const A = await abrirApp(nav, s.url, { largura: 412 }); const p = A.p;
  const tocar = (re, sel = 'button, a') => p.evaluate(([r, s2]) => { const b = [...document.querySelectorAll(s2)].find((x) => x.offsetParent && new RegExp(r).test(x.textContent.trim())); if (b) b.click(); return !!b; }, [re, sel]);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.dock .dk-btn')].find((x) => /Mais/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(500);
  await tocar('^Importar'); await p.waitForTimeout(700);
  await tocar('Fatura do cart', 'button'); await p.waitForTimeout(500);
  let enviado = false;
  for (const i of await p.$$('input[type=file]')) { const acc = (await i.getAttribute('accept')) || ''; if (/csv/.test(acc)) { await i.setInputFiles(CSV); enviado = true; break; } }
  ok(enviado, 'arquivo enviado'); await p.waitForTimeout(1500);
  const linhas = await p.evaluate(() => [...document.querySelectorAll('.imp-row')].map((r) => [r.querySelector('.imp-desc').textContent, (r.querySelectorAll('select')[1] || {}).value || '']));
  const de = (nome) => (linhas.find((l) => l[0].startsWith(nome)) || [])[1];
  ok(de('PAG*JOSEDASILVASANTOS') === 'restaurante', 'nome de pessoa usa a categoria do banco (Restaurantes): ' + de('PAG*JOSEDASILVASANTOS'));
  ok(de('J R COMERCIO LTDA') === 'mercado', 'empresa genérica usa a categoria do banco (Supermercados): ' + de('J R COMERCIO LTDA'));
  ok(de('ENEL') === 'energia', 'Enel vira Energia: ' + de('ENEL'));
  ok(de('CLINICA VETERINARIA PATAS') === 'pets', 'veterinário vira Pets: ' + de('CLINICA VETERINARIA PATAS'));
  ok(!!(await p.$('#revisar-outros')), 'aparece "Revisar compras em Outros"');
  const mostrar = async (nome) => { if (!SAIDA) return; await p.evaluate(() => { const e = document.querySelector('#revisar-outros') || document.querySelector('.imp-list'); e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -110); }); await p.waitForTimeout(300); await p.screenshot({ path: path.join(SAIDA, nome + '.png') }); };
  await mostrar('fatura-1-revisar');
  await p.evaluate(() => { const l = [...document.querySelectorAll('.rev-l')].find((x) => /COMERCIAL SANTOS/.test(x.textContent)); const b = l && [...l.querySelectorAll('button')].find((x) => x.textContent === 'Mercado'); if (b) b.click(); });
  await p.waitForTimeout(500);
  const santos = await p.evaluate(() => [...document.querySelectorAll('.imp-row')].filter((r) => /COMERCIAL SANTOS/.test(r.textContent)).map((r) => r.querySelectorAll('select')[1].value));
  ok(santos.length === 2 && santos.every((c) => c === 'mercado'), 'as 2 compras da mesma loja mudaram juntas: ' + santos.join(','));
  const aprendido = await p.evaluate(() => JSON.stringify(((JSON.parse(localStorage.getItem('mediplan-data-v2')) || {}).contab || {}).catAprendida || {}));
  ok(/comercial santos/.test(aprendido) && /mercado/.test(aprendido), 'ficou aprendido: ' + aprendido);
  await mostrar('fatura-2-depois');
  ok(!A.erros.length, 'sem erros na página ' + A.erros.join(' | '));
  console.log(falhas ? falhas + ' falha(s)' : 'Tudo certo'); await nav.close(); s.fechar();
})();
