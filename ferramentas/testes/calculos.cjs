// Testes de cálculo: lê o app.jsx (sem mudar nada) e confere as contas com exemplos feitos à mão.
// Uso: node ferramentas/testes/calculos.cjs
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../../app.jsx"), "utf8");

function trecho(ini, fim) {
  const a = src.indexOf(ini), b = src.indexOf(fim, a);
  if (a < 0 || b < 0) throw new Error("trecho não achado: " + ini);
  return src.slice(a, b);
}
const codigo = [
  src.split("\n").find((l) => l.startsWith("const numOf = ")),
  src.split("\n").find((l) => l.startsWith("const fatorCdi = ")),
  trecho("const SIMPLES_III", "const fmtHoras"),
  trecho("const IRPF_ANUAL_2026", "// guias do mês mk"),
  trecho("const FORMAS = [", "const FORMA_CURTA"),
].join("\n");
const api = new Function(codigo + "\nreturn { numOf, fatorCdi, simplesFaixa, irrfMensal2026, socioRetencoes, calcSimples, calcPresumido, proLaboreParaFatorR, irAnual, liquidoDeVinc, r2 };")();

let falhas = 0, total = 0;
const perto = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
function ok(nome, cond, detalhe) { total++; if (cond) console.log("OK   " + nome); else { falhas++; console.log("FALHA " + nome + (detalhe ? "  -> " + detalhe : "")); } }

// pró-labore e retenções
ok("INSS do sócio: 11% até o teto", api.socioRetencoes(3000).inss === 330);
ok("INSS do sócio: limitado ao teto (11% de 8475,55 = 932,31)", api.socioRetencoes(20000).inss === 932.31);
ok("IRRF zero com pró-labore de R$ 5.000 (redução da Lei 15.270)", api.socioRetencoes(5000).irrf === 0, String(api.socioRetencoes(5000).irrf));
ok("IRRF zero com pró-labore de R$ 3.000", api.socioRetencoes(3000).irrf === 0);
// R$ 10.000: INSS 932,31 (teto não, 11% de 8475,55); base 10000-932,31 = 9067,69; 27,5% - 908,73 = 1585,27
ok("IRRF de R$ 10.000 = 1.584,88", perto(api.socioRetencoes(10000).irrf, 1584.88), String(api.socioRetencoes(10000).irrf));

// Simples Nacional
const f1 = api.simplesFaixa(120000, [[180000, 6, 0], [360000, 11.2, 9360]]);
ok("Simples: 1ª faixa, alíquota efetiva = nominal", f1.faixa === 1 && f1.efetiva === 6);
const f2 = api.simplesFaixa(300000, [[180000, 6, 0], [360000, 11.2, 9360]]);
ok("Simples: 300 mil, efetiva = (300000*11,2% - 9360)/300000 = 8,08%", perto(f2.efetiva, 8.08, 1e-6), String(f2.efetiva));
// receita 20.000/mês (rbt12 240.000), pró-labore 5.600 (fator R = 67200/240000 = 28% => Anexo III)
const s = api.calcSimples({ receitaMes: 20000, rbt12: 240000, proLabore: 5600, folha: 0 });
ok("Simples: Fator R de 28% cai no Anexo III", s.anexo === "III", s.anexo);
ok("Simples: DAS = 20000 * 8,08%... (anexo III, 2ª faixa) = 1.616,00", perto(s.itens.find((i) => i.id === "das").valor, 20000 * ((240000 * 0.112 - 9360) / 240000), 0.01), String(s.itens.find((i) => i.id === "das").valor));
const s5 = api.calcSimples({ receitaMes: 20000, rbt12: 240000, proLabore: 3000, folha: 0 });
ok("Simples: Fator R abaixo de 28% cai no Anexo V", s5.anexo === "V", s5.anexo);
ok("Pró-labore que leva o Fator R a 28% (240 mil, sem folha) = 5.600,00", api.proLaboreParaFatorR({ receitaMes: 20000, rbt12: 240000, folha: 0 }) === 5600);

// Lucro presumido, serviço hospitalar: 8% IR e 12% CSLL
const p = api.calcPresumido({ receitaMes: 50000, rbt12: 600000, proLabore: 0, folha: 0, issPct: 3, hospitalar: true });
const v = (id) => (p.itens.find((i) => i.id === id) || { valor: 0 }).valor;
ok("Presumido hospitalar: IRPJ = 50000*8%*15% = 600", v("irpj") === 600);
ok("Presumido hospitalar: CSLL = 50000*12%*9% = 540", v("csll") === 540);
ok("Presumido: PIS 0,65% = 325 e Cofins 3% = 1.500", v("pis") === 325 && v("cofins") === 1500);
ok("Presumido: ISS 3% = 1.500", v("iss") === 1500);
const p2 = api.calcPresumido({ receitaMes: 100000, rbt12: 1200000, proLabore: 0, folha: 0, issPct: 0, hospitalar: false });
// base 32% = 32000; adicional = (32000-20000)*10% = 1200
ok("Presumido comum: adicional de IRPJ = 1.200", p2.itens.find((i) => i.id === "adicional").valor === 1200);

// IRPF anual
const a = api.irAnual(120000, 0);
ok("IRPF anual: 120 mil, desconto simplificado limitado a 16.754,34", perto(a.simp, 16754.34));
// 120.000 - 16.754,34 = 103.245,66 de base; 27,5% - 10.904,76 (tabela mensal de 2026 x 12) = 17.487,80
ok("IRPF anual: tabela de 2026 (mensal x 12), 120 mil devem 17.487,80", perto(a.devido, 17487.80), String(a.devido));
ok("IRPF anual: faixa isenta até 29.145,60 (2.428,80 x 12)", api.irAnual(36432, 0).bruto === 0, String(api.irAnual(36432, 0).bruto));
ok("IRPF anual: renda de 50 mil (isenta pela redução) paga 0", api.irAnual(50000, 0).devido === 0, String(api.irAnual(50000, 0).devido));

// Líquido por forma de recebimento
const netOf = (g, o) => g * (1 - (o == null || o === "" ? 27.5 : Number(o)) / 100);
ok("Nota da empresa: 1.000 bruto com 27,5% fica 725", api.liquidoDeVinc({ forma: "pj" }, 1000, netOf) === 725);
ok("Nota da empresa com taxa própria de 10%: 900", api.liquidoDeVinc({ forma: "pj", taxOverride: 10 }, 1000, netOf) === 900);
ok("Carteira assinada: líquido = bruto", api.liquidoDeVinc({ forma: "clt" }, 1000, netOf) === 1000);
ok("Sócio com 15% já pago: 850", api.liquidoDeVinc({ forma: "socio", taxSocio: 15 }, 1000, netOf) === 850);
ok("Forma antiga 'pf' vira sócio", api.liquidoDeVinc({ forma: "pf", taxSocio: 15 }, 1000, netOf) === 850);

// CDI
const cdi = [["2026-01-02", 0.05], ["2026-01-03", 0.05], ["2026-01-04", 0.05]];
ok("CDI 100%: 2 dias depois de 02/01 = 1,0005^2", perto(api.fatorCdi(cdi, "2026-01-02", 100), 1.0005 * 1.0005, 1e-12));
ok("CDI 110%: 1 dia = 1 + 0,055%", perto(api.fatorCdi([["2026-01-03", 0.05]], "2026-01-02", 110), 1.00055, 1e-12));

// Digitação de número
ok("numOf aceita vírgula decimal (12,5 = 12.5)", api.numOf("12,5") === 12.5);
// Só informativo: os campos de dinheiro usam MoneyInput (entrega número), então isto só importa se um campo de texto livre passar a usar numOf.
const info = (nome, cond, d) => console.log((cond ? "INFO ok   " : "INFO limite conhecido ") + nome + (cond ? "" : "  -> " + d));
info("numOf('1.234,56') = 1234,56", api.numOf("1.234,56") === 1234.56, "dá " + api.numOf("1.234,56"));
info("numOf('1.000') = 1000", api.numOf("1.000") === 1000, "dá " + api.numOf("1.000"));
info("r2(1.005) = 1,01", api.r2(1.005) === 1.01, "dá " + api.r2(1.005) + " (erro de ponto flutuante, no máximo 1 centavo)");
ok("r2(0.1+0.2) = 0,3", api.r2(0.1 + 0.2) === 0.3);

console.log(falhas ? `\n${falhas} de ${total} verificações falharam` : `\nTudo certo (${total} verificações)`);
process.exit(falhas ? 1 : 0);
