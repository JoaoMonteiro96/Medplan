// Sallos: histórico de preços de fechamento da bolsa (para a "Análise completa" de cada ativo).
// Lê o arquivo público de cotações históricas da B3 (COTAHIST) e grava o fechamento de cada ativo do
// mercado à vista (ações, units, FIIs e ETFs), com a máxima e a mínima do dia, na tabela "precos_hist".
//   ?dia=AAAA-MM-DD  -> arquivo de um dia (a tarefa "sallos-historico" chama sem nada = revê os últimos 5 dias úteis)
//   ?mes=AAAA-MM     -> arquivo do mês inteiro (usado uma vez para montar os últimos 12 meses)
import { createClient } from "npm:@supabase/supabase-js@2";
import { unzipSync } from "npm:fflate@0.8.2";

function chaveAdmin(): string {
  const velha = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (velha) return velha;
  try { const j = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); const v = Object.values(j)[0]; if (typeof v === "string") return v; } catch (_e) { /* */ }
  return "";
}
const sb = createClient(Deno.env.get("SUPABASE_URL")!, chaveAdmin(), { auth: { persistSession: false } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sallos-cron", "Content-Type": "application/json" };
const resp = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: cors });
const BASE = "https://bvmf.bmfbovespa.com.br/InstDados/SerHist/";

// os últimos n dias úteis antes de hoje (horário de Brasília); feriado sem arquivo é só pulado
function diasUteis(n: number): string[] {
  const d = new Date(Date.now() - 3 * 3600e3), out: string[] = [];
  while (out.length < n) { d.setUTCDate(d.getUTCDate() - 1); if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) out.push(d.toISOString().slice(0, 10)); }
  return out;
}

async function baixar(nome: string): Promise<string> {
  const r = await fetch(BASE + nome, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(nome + ": HTTP " + r.status);
  const zip = new Uint8Array(await r.arrayBuffer());
  const arqs = unzipSync(zip);
  const k = Object.keys(arqs)[0];
  if (!k) throw new Error(nome + ": arquivo vazio");
  return new TextDecoder("latin1").decode(arqs[k]);
}

function ler(txt: string) {
  const rows: { ticker: string; data: string; fechamento: number; maxima: number; minima: number }[] = [];
  let i = 0;
  while (i < txt.length) {
    let f = txt.indexOf("\n", i); if (f < 0) f = txt.length;
    // TIPREG 01, mercado à vista (010); BDI 02 lote padrão, 12 FII, 14 fundos/ETF
    if (txt.startsWith("01", i) && txt.startsWith("010", i + 24)) {
      const bdi = txt.substr(i + 10, 2);
      if (bdi === "02" || bdi === "12" || bdi === "14") {
        const d = txt.substr(i + 2, 8);
        const t = txt.substr(i + 12, 12).trim();
        const p = Number(txt.substr(i + 108, 13)) / 100, mx = Number(txt.substr(i + 69, 13)) / 100, mn = Number(txt.substr(i + 82, 13)) / 100;
        if (t && p > 0) rows.push({ ticker: t, data: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, fechamento: p, maxima: mx || p, minima: mn || p });
      }
    }
    i = f + 1;
  }
  return rows;
}

async function gravar(nome: string) {
  const rows = ler(await baixar(nome));
  for (let i = 0; i < rows.length; i += 2000) {
    const { error } = await sb.from("precos_hist").upsert(rows.slice(i, i + 2000), { onConflict: "ticker,data" });
    if (error) throw new Error("gravar: " + error.message);
  }
  return rows.length;
}
const nomeDia = (dia: string) => `COTAHIST_D${dia.slice(8, 10)}${dia.slice(5, 7)}${dia.slice(0, 4)}.ZIP`;

// Senha das tarefas automáticas: o agendador do Supabase manda o cabeçalho x-sallos-cron com o valor do
// segredo CRON_SEGREDO (guardado no painel, em Edge Functions). Sem esse segredo, a função aceita qualquer
// chamada, para nada parar durante a troca.
const CRON_SEGREDO = Deno.env.get("CRON_SEGREDO") ?? "";
const doAgendador = (req: Request) => !CRON_SEGREDO || req.headers.get("x-sallos-cron") === CRON_SEGREDO;
// aceita só AAAA-MM e AAAA-MM-DD de 2020 até hoje
function dataOk(v: string | null, tam: number) {
  if (!v) return false;
  if (tam === 7 ? !/^\d{4}-(0[1-9]|1[0-2])$/.test(v) : !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v)) return false;
  const d = new Date(v + (tam === 7 ? "-01" : "") + "T12:00:00Z");
  return !isNaN(d.getTime()) && d.getUTCFullYear() >= 2020 && d.getTime() <= Date.now() + 864e5;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return resp("ok");
  if (!doAgendador(req)) return resp({ erro: "sem permissão" }, 401);
  const u = new URL(req.url);
  const mes = u.searchParams.get("mes"), dia = u.searchParams.get("dia");
  if ((mes && !dataOk(mes, 7)) || (dia && !dataOk(dia, 10))) return resp({ erro: "use mes=AAAA-MM ou dia=AAAA-MM-DD" }, 400);
  try {
    if (mes) { const nome = `COTAHIST_M${mes.slice(5, 7)}${mes.slice(0, 4)}.ZIP`; return resp({ arquivo: nome, linhas: await gravar(nome) }); }
    if (dia) return resp({ arquivo: nomeDia(dia), linhas: await gravar(nomeDia(dia)) });
    // sem nada (tarefa diária): revê os últimos 5 dias úteis, para não perder um dia se a B3 atrasar o arquivo
    const out: Record<string, unknown> = {};
    for (const d of diasUteis(5)) { try { out[d] = await gravar(nomeDia(d)); } catch (e) { out[d] = String(e).includes("404") ? "sem arquivo" : String(e); } }
    return resp(out);
  } catch (e) {
    return resp({ erro: String(e) }, 200);
  }
});
