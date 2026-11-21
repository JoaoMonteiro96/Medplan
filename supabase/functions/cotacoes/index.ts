// Sallos: central de cotações. Busca na brapi os ativos que os usuários têm e grava na tabela "cotacoes".
// O token fica no segredo BRAPI_TOKEN (Edge Functions > Secrets). Cada ativo é buscado no máximo
// a cada 100 minutos durante o pregão, então chamar várias vezes não gasta o limite da brapi.
import { createClient } from "npm:@supabase/supabase-js@2";

function chaveAdmin(): string {
  const velha = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (velha) return velha;
  try { const j = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); const v = Object.values(j)[0]; if (typeof v === "string") return v; } catch (_e) { /* */ }
  return "";
}
const sb = createClient(Deno.env.get("SUPABASE_URL")!, chaveAdmin(), { auth: { persistSession: false } });
const TOKEN = Deno.env.get("BRAPI_TOKEN") ?? "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const resp = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: cors });

// pregão da B3, em horário de Brasília (UTC-3)
function pregao() {
  const d = new Date(Date.now() - 3 * 3600e3);
  const dia = d.getUTCDay(), min = d.getUTCHours() * 60 + d.getUTCMinutes();
  return dia >= 1 && dia <= 5 && min >= 590 && min <= 1125;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return resp("ok");
  if (!TOKEN) return resp({ erro: "Falta o segredo BRAPI_TOKEN" }, 500);
  const desde = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data: ped } = await sb.from("cotacoes_pedidos").select("ticker").gte("visto_em", desde);
  const todos = [...new Set((ped ?? []).map((r) => r.ticker as string))];
  const { data: ex } = await sb.from("cotacoes").select("ticker,atualizado");
  const quando = new Map((ex ?? []).map((r) => [r.ticker as string, new Date(r.atualizado as string).getTime()]));
  const agora = Date.now(), aberto = pregao();
  const velho = (t: string) => !quando.has(t) || agora - quando.get(t)! > (aberto ? 100 : 14 * 60) * 60e3;
  const alvo = todos.filter(velho).slice(0, 120);
  const feitos: string[] = [], falhas: string[] = [];
  for (const t of alvo) {
    try {
      const r = await fetch("https://brapi.dev/api/quote/" + encodeURIComponent(t), { headers: { Authorization: "Bearer " + TOKEN } });
      if (r.status === 429) { falhas.push(t + " (limite)"); break; }
      const j = await r.json().catch(() => null);
      const p = Number(j?.results?.[0]?.regularMarketPrice);
      if (r.ok && p > 0) {
        await sb.from("cotacoes").upsert({ ticker: t, preco: Math.round(p * 100) / 100, atualizado: new Date().toISOString() });
        feitos.push(t);
      } else falhas.push(t);
    } catch (_e) { falhas.push(t); }
  }
  return resp({ pedidos: todos.length, atualizados: feitos.length, falhas, pregao: aberto });
});
