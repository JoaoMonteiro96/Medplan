// Sallos: proventos (dividendos, JCP e rendimentos) de uma ação ou FII, direto da B3 (dados públicos).
// O app chama ?t=BTAL11. A resposta fica guardada 12 horas na tabela "proventos_b3".
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
const b64 = (o: unknown) => btoa(JSON.stringify(o));
const iso = (br: string) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br || "").trim()); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const num = (v: string) => Number(String(v || "").replace(/\./g, "").replace(",", "."));
// sufixo do código -> tipo da ação no código ISIN (3 = ON, 4 = PN, 5 = PNA, 6 = PNB, 11 = unit)
const ISIN: Record<string, string> = { "3": "ACNOR", "4": "ACNPR", "5": "ACNPA", "6": "ACNPB", "7": "ACNPC", "8": "ACNPD", "11": "CDAM" };

const log: string[] = [];
async function b3(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", Accept: "application/json, text/plain, */*", Referer: "https://sistemaswebb3-listados.b3.com.br/" } });
  const txt = await r.text();
  log.push(r.status + " " + txt.slice(0, 120));
  if (!r.ok) return null;
  let j = null; try { j = JSON.parse(txt); } catch (_e) { /* */ }
  return Array.isArray(j) ? j[0] : j;
}

type Prov = { data_com: string | null; pagamento: string | null; valor: number; tipo: string; ref: string };
const lista = (cd: Record<string, string>[]): Prov[] => (cd || []).map((x) => ({ data_com: iso(x.lastDatePrior), pagamento: iso(x.paymentDate), valor: num(x.rate), tipo: String(x.label || "").trim(), ref: String(x.relatedTo || "").trim() }))
  .filter((x) => x.valor > 0 && x.data_com);

async function buscar(t: string) {
  const m = /^([A-Z0-9]{4})(\d{1,2})B?$/.exec(t);
  if (!m) return { proventos: [], nome: "" };
  const [, raiz, suf] = m;
  if (suf === "11") {
    const f = await b3("https://sistemaswebb3-listados.b3.com.br/fundsProxy/fundsCall/GetListedSupplementFunds/" + b64({ cnpj: "0", identifierFund: raiz, typeFund: 7 }));
    if (f && (f.cashDividends?.length || f.fund)) {
      // se vierem várias classes (ex.: units), fica só com a cota do fundo (CTF) ou a unit (CDA)
      const cd = f.cashDividends || [], cls = (x: Record<string, string>) => String(x.isinCode || x.assetIssued || "").slice(6, 9);
      const pref = ["CTF", "CDA"].find((k) => cd.some((x: Record<string, string>) => cls(x) === k));
      return { proventos: lista(pref ? cd.filter((x: Record<string, string>) => cls(x) === pref) : cd), nome: f.fund || "" };
    }
  }
  const c = await b3("https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetListedSupplementCompany/" + b64({ issuingCompany: raiz, language: "pt-br" }));
  if (!c) return { proventos: [], nome: "" };
  const tipo = ISIN[suf];
  const cd = (c.cashDividends || []).filter((x: Record<string, string>) => !tipo || String(x.isinCode || x.assetIssued || "").slice(6).startsWith(tipo));
  return { proventos: lista(cd), nome: c.tradingName || "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return resp("ok");
  const u = new URL(req.url);
  const t = (u.searchParams.get("t") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  log.length = 0;
  if (!t) return resp({ erro: "informe ?t=TICKER" }, 400);
  const { data: c } = await sb.from("proventos_b3").select("dados,em").eq("ticker", t).maybeSingle();
  if (c && !u.searchParams.has("debug") && Date.now() - new Date(c.em).getTime() < 12 * 3600e3) return resp(c.dados);
  try {
    const dados = await buscar(t);
    dados.proventos.sort((a, b) => String(b.data_com).localeCompare(String(a.data_com)));
    if (u.searchParams.has("debug")) return resp({ ...dados, log });
    // só guarda quando veio alguma coisa (se a B3 falhar, tenta de novo na próxima vez)
    // a B3 só mostra uns 12 meses: junta com o que já estava guardado, para o histórico crescer
    const chave = (x: Prov) => `${x.data_com}|${x.tipo}|${x.valor}`;
    const vistos = new Set(dados.proventos.map(chave));
    for (const x of (c?.dados?.proventos || []) as Prov[]) if (!vistos.has(chave(x))) dados.proventos.push(x);
    dados.proventos.sort((a, b) => String(b.data_com).localeCompare(String(a.data_com)));
    if (dados.proventos.length || dados.nome) await sb.from("proventos_b3").upsert({ ticker: t, dados, em: new Date().toISOString() });
    else if (c) return resp(c.dados);
    return resp(dados);
  } catch (e) {
    if (c) return resp(c.dados);
    return resp({ erro: String(e), proventos: [] }, 200);
  }
});
