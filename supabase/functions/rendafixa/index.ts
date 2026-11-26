// Sallos: preços do Tesouro Direto e CDI do dia.
// Uma vez por dia (pg_cron "sallos-rendafixa") esta função:
//  1. baixa o arquivo público do Tesouro Nacional (PrecoTaxaTesouroDireto.csv) e grava o preço de cada título
//     na tabela "tesouro_precos" (só os dias que ainda não estão lá);
//  2. busca o CDI diário no Banco Central (série 12 do SGS) e grava na tabela "cdi_diario".
// Os dados são públicos. Ninguém de fora grava: só esta função, com a chave de serviço do próprio Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

function chaveAdmin(): string {
  const velha = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (velha) return velha;
  try { const j = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); const v = Object.values(j)[0]; if (typeof v === "string") return v; } catch (_e) { /* */ }
  return "";
}
const sb = createClient(Deno.env.get("SUPABASE_URL")!, chaveAdmin(), { auth: { persistSession: false } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const resp = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: cors });

const DATASET = "df56aa42-484a-4a59-8184-7676580c81e3"; // "Taxas dos Títulos Ofertados pelo Tesouro Direto"
const CSV_PADRAO = "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv";
const DESDE = "2017-01-01"; // histórico guardado (para achar o preço do dia da compra)

const iso = (br: string) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br.trim()); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
const n = (v: string) => { let t = String(v ?? "").trim(); if (t.includes(",")) t = t.replace(/\./g, "").replace(",", "."); const x = Number(t); return t && isFinite(x) && x > 0 ? x : null; };
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

async function urlCsv(): Promise<string> {
  try {
    const r = await fetch(`https://www.tesourotransparente.gov.br/ckan/api/3/action/package_show?id=${DATASET}`);
    const j = await r.json();
    const res = (j?.result?.resources ?? []).find((x: { url?: string }) => /PrecoTaxaTesouroDireto\.csv$/i.test(x.url ?? ""));
    if (res?.url) return res.url as string;
  } catch (_e) { /* usa o endereço conhecido */ }
  return CSV_PADRAO;
}

async function tesouro() {
  const { data: ult } = await sb.from("tesouro_precos").select("data").order("data", { ascending: false }).limit(1);
  const ultima = ult?.[0]?.data as string | undefined;
  // revisa os últimos 7 dias (o Tesouro às vezes corrige um dia já publicado)
  const corte = ultima ? new Date(new Date(ultima + "T12:00:00Z").getTime() - 7 * 864e5).toISOString().slice(0, 10) : DESDE;
  const r = await fetch(await urlCsv());
  if (!r.ok) throw new Error("arquivo do Tesouro: HTTP " + r.status);
  const txt = new TextDecoder("latin1").decode(new Uint8Array(await r.arrayBuffer()));
  const linhas = txt.split(/\r?\n/);
  const cab = linhas[0].split(";").map(sem);
  const col = (...nomes: string[]) => cab.findIndex((c) => nomes.some((x) => c === x));
  const iT = col("tipo titulo"), iV = col("data vencimento"), iD = col("data base"),
    iTC = col("taxa compra manha"), iTV = col("taxa venda manha"), iPC = col("pu compra manha"), iPV = col("pu venda manha"), iPB = col("pu base manha");
  if ([iT, iV, iD, iPV].some((i) => i < 0)) throw new Error("colunas do arquivo mudaram: " + linhas[0]);
  const novos: Record<string, unknown>[] = [];
  for (let k = 1; k < linhas.length; k++) {
    const p = linhas[k].split(";");
    if (p.length < cab.length) continue;
    const d = iso(p[iD]);
    if (!d || d < corte) continue;
    const pv = n(p[iPV]), pb = n(p[iPB]);
    if (!pv && !pb) continue;
    novos.push({ titulo: p[iT].trim(), vencimento: iso(p[iV]), data: d, taxa_compra: n(p[iTC]), taxa_venda: n(p[iTV]), pu_compra: n(p[iPC]), pu_venda: pv ?? pb, pu_base: pb });
  }
  for (let i = 0; i < novos.length; i += 1000) {
    const { error } = await sb.from("tesouro_precos").upsert(novos.slice(i, i + 1000), { onConflict: "titulo,vencimento,data" });
    if (error) throw new Error("gravar tesouro: " + error.message);
  }
  return { linhas: novos.length, desde: corte };
}

async function cdi() {
  const { data: ult } = await sb.from("cdi_diario").select("data").order("data", { ascending: false }).limit(1);
  const ultima = ult?.[0]?.data as string | undefined;
  const ini = ultima ? new Date(new Date(ultima + "T12:00:00Z").getTime() + 864e5) : new Date(DESDE + "T12:00:00Z");
  const br = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");
  const hoje = new Date();
  if (ini > hoje) return { linhas: 0 };
  const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${br(ini)}&dataFinal=${br(hoje)}`);
  if (!r.ok) throw new Error("CDI do Banco Central: HTTP " + r.status);
  const j = await r.json();
  const rows = (Array.isArray(j) ? j : []).map((x: { data: string; valor: string }) => ({ data: iso(x.data), taxa: Number(String(x.valor).replace(",", ".")) }))
    .filter((x: { data: string; taxa: number }) => x.data && isFinite(x.taxa));
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await sb.from("cdi_diario").upsert(rows.slice(i, i + 1000), { onConflict: "data" });
    if (error) throw new Error("gravar CDI: " + error.message);
  }
  return { linhas: rows.length };
}

// IPCA do mês (série 433 do Banco Central), para comparar a carteira com a inflação
async function ipca() {
  const br = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");
  const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${br(new Date(DESDE + "T12:00:00Z"))}&dataFinal=${br(new Date())}`);
  if (!r.ok) throw new Error("IPCA do Banco Central: HTTP " + r.status);
  const j = await r.json();
  const rows = (Array.isArray(j) ? j : []).map((x: { data: string; valor: string }) => ({ mes: iso(x.data), taxa: Number(String(x.valor).replace(",", ".")) }))
    .filter((x: { mes: string; taxa: number }) => x.mes && isFinite(x.taxa));
  if (rows.length) { const { error } = await sb.from("ipca_mensal").upsert(rows, { onConflict: "mes" }); if (error) throw new Error("gravar IPCA: " + error.message); }
  return { linhas: rows.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return resp("ok");
  const out: Record<string, unknown> = {};
  try { out.tesouro = await tesouro(); } catch (e) { out.tesouro = { erro: String(e) }; }
  try { out.cdi = await cdi(); } catch (e) { out.cdi = { erro: String(e) }; }
  try { out.ipca = await ipca(); } catch (e) { out.ipca = { erro: String(e) }; }
  return resp(out);
});
