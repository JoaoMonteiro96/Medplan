// Teste da nuvem com um Supabase de mentira: envio, download só do que mudou, mudanças sem internet e excluir conta.
const { chromium } = require('playwright');
const { servidor, dadosDeTeste } = require('../comum.cjs');
const DB = new Map(); let relogio = Date.parse('2026-11-22T10:00:00Z'); const consultas = [];
const agora = () => new Date(relogio += 1000).toISOString();
const MOCK = `(() => {
  const ses = { user: { id: 'u1', email: 'teste@exemplo.com' }, access_token: 'x' };
  const call = (q) => fetch('https://mock.supabase.co/q', { method: 'POST', body: JSON.stringify(q) }).then((r) => r.json());
  const builder = (table) => { const q = { table, op: 'select', filtros: [] }; const b = {
    select(c) { q.op = q.op === 'delete' ? 'delete' : 'select'; return b; }, gt(c, v) { q.filtros.push(['gt', c, v]); return b; }, eq(c, v) { q.filtros.push(['eq', c, v]); return b; },
    order() { return b; }, range(a, z) { q.range = [a, z]; return b; }, in() { return b; },
    upsert(rows) { q.op = 'upsert'; q.rows = rows; return b; }, delete() { q.op = 'delete'; return b; },
    then(ok, no) { return call(q).then(ok, no); } }; return b; };
  window.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: ses } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({}) },
    from: builder, rpc: async () => ({ data: null, error: null }),
    storage: { from: () => ({ list: async () => ({ data: [] }), remove: async () => ({}) }) },
  }) };
})();`;
async function rota(r) {
  const q = JSON.parse(r.request().postData() || '{}'); consultas.push(q);
  let resp = { data: null, error: null };
  if (q.table === 'records') {
    if (q.op === 'upsert') q.rows.forEach((x) => DB.set(x.collection + '|' + x.id, { ...x, updated_at: agora() }));
    else if (q.op === 'delete') DB.clear();
    else { let l = [...DB.values()]; q.filtros.forEach(([f, c, v]) => { if (f === 'gt') l = l.filter((x) => x[c] > v); }); l.sort((a, b) => (a.collection + a.id).localeCompare(b.collection + b.id)); resp.data = l.slice(q.range[0], q.range[1] + 1); }
  } else resp.data = [];
  r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(resp) });
}
(async () => {
  const s = await servidor(); const nav = await chromium.launch(); let falhas = 0;
  const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA ') + m); if (!c) falhas++; };
  const aparelho = async (dados) => {
    const ctx = await nav.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block', locale: 'pt-BR' });
    await ctx.addInitScript(([d]) => { if (sessionStorage.getItem('t')) return; sessionStorage.setItem('t', '1'); localStorage.clear(); localStorage.setItem('mediplan-uso-off', '1'); localStorage.setItem('mediplan-guia', 'antigo'); localStorage.setItem('mediplan-cloud-config', JSON.stringify({ url: 'https://mock.supabase.co', key: 'sb_publishable_teste1234567890' })); if (d) localStorage.setItem('mediplan-data-v2', JSON.stringify(d)); }, [dados]);
    await ctx.route('https://cdn.jsdelivr.net/npm/@supabase/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: MOCK }));
    await ctx.route('https://mock.supabase.co/**', rota);
    await ctx.route(/^https?:\/\/(?!localhost|mock\.supabase|cdn\.jsdelivr\.net\/npm\/@supabase)/, (r) => r.abort());
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(e.message));
    await p.goto(s.url); await p.waitForTimeout(3500); return { ctx, p, erros };
  };
  const ler = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('mediplan-data-v2') || '{}'));
  const dados = dadosDeTeste('completo');
  // 1) aparelho A tem dados e entra pela primeira vez: tudo sobe
  const A = await aparelho(dados);
  const nItens = ['vinculos', 'shifts', 'expenses', 'recurringExpenses', 'investments', 'goals', 'oneOffIncomes', 'presencas', 'extraRecurringIncomes'].reduce((t, c) => t + new Set((dados[c] || []).map((x) => String(x.id))).size, 0);
  ok(DB.size === nItens + 1, `A enviou tudo (${DB.size} de ${nItens + 1})`);
  // 2) aparelho B (vazio) baixa tudo
  const B = await aparelho(null); const dB = await ler(B.p);
  ok((dB.shifts || []).length === new Set(dados.shifts.map((x) => String(x.id))).size && (dB.expenses || []).length === dados.expenses.length, 'B baixou tudo');
  const cur = await B.p.evaluate(() => JSON.parse(localStorage.getItem('mediplan-sync-cursor') || 'null'));
  ok(cur && cur.u === 'u1' && cur.t, 'B guardou até quando baixou: ' + (cur && cur.t));
  // 3) outro aparelho muda a nuvem: edita uma conta, apaga um plantão, cria uma conta nova
  const e0 = dados.expenses[0], s0 = dados.shifts[0];
  DB.set('expenses|' + e0.id, { ...DB.get('expenses|' + e0.id), data: { ...e0, amount: 4321 }, updated_at: agora() });
  DB.set('shifts|' + s0.id, { ...DB.get('shifts|' + s0.id), deleted: true, updated_at: agora() });
  const nova = { ...e0, id: 'nova-1', description: 'Conta criada no outro aparelho', amount: 77 };
  DB.set('expenses|nova-1', { user_id: 'u1', collection: 'expenses', id: 'nova-1', data: nova, deleted: false, updated_at: agora() });
  // e B muda uma conta sem internet (direto no aparelho)
  const e1 = dados.expenses[1];
  await B.p.evaluate(([id]) => { const d = JSON.parse(localStorage.getItem('mediplan-data-v2')); d.expenses.find((x) => String(x.id) === String(id)).amount = 999; localStorage.setItem('mediplan-data-v2', JSON.stringify(d)); }, [e1.id]);
  const antes = consultas.length;
  await B.p.reload(); await B.p.waitForTimeout(3500);
  const sel = consultas.slice(antes).filter((q) => q.table === 'records' && q.op === 'select');
  ok(sel.length && sel.every((q) => q.filtros.some((f) => f[0] === 'gt')), `B pediu só o que mudou (${sel.length} consulta(s), com filtro de data)`);
  const d2 = await ler(B.p);
  ok(d2.expenses.find((x) => String(x.id) === String(e0.id)).amount === 4321, 'B recebeu a conta editada');
  ok(!d2.shifts.some((x) => String(x.id) === String(s0.id)), 'B tirou o plantão apagado');
  ok(d2.expenses.some((x) => x.id === 'nova-1'), 'B recebeu a conta nova');
  ok(d2.expenses.find((x) => String(x.id) === String(e1.id)).amount === 999, 'A mudança feita em B sem internet continua');
  ok(DB.get('expenses|' + e1.id).data.amount === 999, 'e foi enviada para a nuvem');
  // 4) A volta para o app (troca de aba) e recebe tudo
  const antesA = consultas.length;
  await A.p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await A.p.waitForTimeout(2500);
  const dA = await ler(A.p);
  ok(dA.expenses.find((x) => String(x.id) === String(e1.id)).amount === 999 && dA.expenses.some((x) => x.id === 'nova-1') && !dA.shifts.some((x) => String(x.id) === String(s0.id)), 'A recebeu as mudanças ao voltar para o app');
  ok(consultas.slice(antesA).filter((q) => q.table === 'records' && q.op === 'select').every((q) => q.filtros.some((f) => f[0] === 'gt')), 'A também pediu só o que mudou');
  // 5) excluir conta
  B.p.on('dialog', (d) => d.type() === 'prompt' ? d.accept('EXCLUIR') : d.accept());
  await B.p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /engrenagem|Configura/i.test(x.getAttribute('aria-label') || '')); b && b.click(); });
  await B.p.waitForTimeout(800);
  await B.p.evaluate(() => { const r = [...document.querySelectorAll('button, [role=button]')].find((x) => /Nuvem e conta/.test(x.textContent)); r && r.click(); });
  await B.p.waitForTimeout(800);
  const temBotao = await B.p.$('#cc-excluir'); ok(!!temBotao, 'botão Excluir minha conta aparece');
  if (temBotao) { await temBotao.click(); await B.p.waitForTimeout(1500); }
  ok(DB.size === 0, 'nuvem vazia depois de excluir');
  const resto = await B.p.evaluate(() => [localStorage.getItem('mediplan-data-v2'), localStorage.getItem('mediplan-sync-cursor'), localStorage.getItem('mediplan-owner')]);
  ok(resto.every((x) => !x || x === 'null' || !JSON.parse(x) || (JSON.parse(x).shifts || []).length === 0), 'aparelho limpo: ' + JSON.stringify(resto).slice(0, 120));
  ok(!A.erros.length && !B.erros.length, 'sem erros na página ' + A.erros.concat(B.erros).join(' | '));
  
  console.log(falhas ? `${falhas} falha(s)` : 'Tudo certo'); await nav.close(); s.fechar();
})();
