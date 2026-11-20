// Mediplan: código-fonte. O site usa a versão compilada (app.js), gerada por build.py.

import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import * as ReactDOM from "react-dom/client";

const STORAGE_KEY = "mediplan-data-v2";
const GOLD = "#F59E0B";
const TEAL = "#16A34A";
const BRICK = "#DC2626";
const SLATE = "#64748B";
const PALETTE = [TEAL, "#2563EB", GOLD, BRICK, "#8B5CF6", "#0EA5E9", "#F97316", SLATE];

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_ABBR_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const WEEKDAYS_PT = ["D","S","T","Q","Q","S","S"];

const CATEGORY_SUGGESTIONS = ["Renda Fixa","Ações","FII","ETF","Reserva de oportunidade","Outro"];

// ---- helpers de data ----
const addDaysIso = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + Number(n || 0)));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
};
const payDateOf = (s) => s.payDate || s.date;
const shiftMonthKey = (mk, delta) => { const [y, m] = mk.split("-").map(Number); const d = new Date(y, m - 1 + delta, 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
const prazoOptions = (unit, current) => {
  const base = unit === "dias" ? [0, 30, 60, 90] : [0, 1, 2, 3];
  const list = base.includes(Number(current)) || current === undefined ? base : base.concat([Number(current)]).sort((a, b) => a - b);
  return list.map((v) => ({ v, label: prazoText(unit, v) }));
};
const prazoText = (unit, v) => unit === "dias" ? (v === 0 ? "No dia" : v + " dias") : (v === 0 ? "No mesmo mês" : v === 1 ? "1 mês depois" : v + " meses depois");
const PRAZO_OPTIONS = [["0", "No dia"], ["30", "30 dias"], ["60", "60 dias"], ["90", "90 dias"], ["custom", "Outro prazo…"]];

// ---- categorias de despesa (ícones ilustrativos) ----
const EXP_CATS = [
  { id: "moradia", label: "Moradia", color: "#8B5CF6", kw: ["aluguel", "condom", "iptu", "casa", "apto", "apartamento", "financiamento", "moradia", "reforma"] },
  { id: "energia", label: "Energia", color: "#F59E0B", kw: ["energia", "luz", "enel", "cemig", "coelba", "neoenergia", "equatorial", "celpe", "eletric"] },
  { id: "agua", label: "Água", color: "#0EA5E9", kw: ["agua", "água", "saneamento", "embasa", "sabesp", "copasa"] },
  { id: "internet", label: "Internet", color: "#6366F1", kw: ["internet", "wifi", "wi-fi", "fibra", "claro", "vivo fibra", "tv a cabo"] },
  { id: "telefone", label: "Celular", color: "#14B8A6", kw: ["celular", "telefone", "tim", "oi ", "plano movel", "plano móvel"] },
  { id: "mercado", label: "Mercado", color: "#16A34A", kw: ["mercado", "supermercado", "feira", "padaria", "alimenta", "comida", "ifood", "restaurante"] },
  { id: "saude", label: "Saúde", color: "#EF4444", kw: ["plano de saude", "plano de saúde", "unimed", "saude", "saúde", "farmacia", "farmácia", "remedio", "remédio", "dentista", "terapia", "psic", "drogasil", "droga", "raia", "pacheco", "pague menos", "hospital", "clinica", "laboratorio"] },
  { id: "educacao", label: "Educação", color: "#3B82F6", kw: ["escola", "faculdade", "curso", "mensalidade", "educa", "residencia", "residência", "pos", "pós", "livro", "congresso"] },
  { id: "transporte", label: "Transporte", color: "#F97316", kw: ["carro", "gasolina", "combust", "uber", "onibus", "ônibus", "transporte", "ipva", "seguro auto", "estacionamento", "moto"] },
  { id: "cartao", label: "Cartão", color: "#EC4899", kw: ["cartao", "cartão", "fatura", "nubank", "inter", "visa", "master"] },
  { id: "lazer", label: "Lazer", color: "#A855F7", kw: ["netflix", "spotify", "streaming", "cinema", "viagem", "lazer", "disney", "prime", "hbo", "youtube", "jogo"] },
  { id: "academia", label: "Academia", color: "#10B981", kw: ["academia", "pilates", "crossfit", "personal", "esporte", "natação"] },
  { id: "seguro", label: "Seguros", color: "#0891B2", kw: ["seguro", "previdencia", "previdência"] },
  { id: "impostos", label: "Impostos", color: "#64748B", kw: ["imposto", "darf", "crm", "contador", "contabil", "contábil", "inss", "iss", "taxa", "anuidade", "sindicato", "cremeb"] },
  { id: "pets", label: "Pets", color: "#D97706", kw: ["pet", "cachorro", "gato", "veterin", "ração", "racao"] },
  { id: "outros", label: "Outros", color: "#94A3B8", kw: [] },
];
const EXP_CAT_MAP = Object.fromEntries(EXP_CATS.map((c) => [c.id, c]));
const guessExpCat = (desc) => {
  const d = String(desc || "").toLowerCase();
  if (!d) return "outros";
  const palavras = " " + d.replace(/[^a-z0-9\u00e0-\u00fc]+/g, " ") + " ";
  for (const c of EXP_CATS) if (c.kw.some((k) => (k.trim().length <= 4 ? palavras.includes(" " + k.trim() + " ") : d.includes(k)))) return c.id;
  return "outros";
};

// ---- categorias de investimento ----
const INV_CATEGORIES = [
  { id: "Ações", color: "#16A34A", kind: "ticker", type: "A", hint: "Digite o código, ex: EGIE3" },
  { id: "FII", color: "#2563EB", kind: "ticker", type: "F", hint: "Digite o fundo, ex: MXRF11" },
  { id: "ETF", color: "#8B5CF6", kind: "ticker", type: "E", hint: "Digite o ETF, ex: BOVA11" },
  { id: "Renda Fixa", color: "#F59E0B", kind: "list", hint: "Escolha ou digite o título" },
  { id: "Reserva de oportunidade", color: "#0EA5E9", kind: "list", hint: "Onde está a reserva?" },
  { id: "Outro", color: "#7A93A0", kind: "free", hint: "Descreva o investimento" },
];
const INV_CAT_MAP = Object.fromEntries(INV_CATEGORIES.map((c) => [c.id, c]));
const invCatMeta = (id) => INV_CAT_MAP[id] || { id, color: "#7A93A0", kind: "free" };

const FIXED_INCOME_OPTIONS = [
  "Tesouro Selic", "Tesouro IPCA+", "Tesouro Prefixado", "Tesouro Renda+", "CDB", "CDB liquidez diária", "LCI", "LCA", "LC",
  "CRI", "CRA", "Debênture incentivada", "Fundo DI", "Previdência PGBL", "Previdência VGBL", "Conta remunerada",
].map((n) => ({ t: n, n: "", ty: "R" }));
const RESERVE_OPTIONS = [
  "Tesouro Selic", "CDB liquidez diária", "Fundo DI", "Conta remunerada", "LFT (Selic ETF) LFTS11", "Dólar / caixa em moeda forte", "Dinheiro em caixa",
].map((n) => ({ t: n, n: "", ty: "R" }));

const ASSET_RAW = {
  A: `PETR4|Petrobras PN;PETR3|Petrobras ON;VALE3|Vale;ITUB4|Itaú Unibanco PN;ITUB3|Itaú Unibanco ON;BBDC4|Bradesco PN;BBDC3|Bradesco ON;BBAS3|Banco do Brasil;SANB11|Santander Brasil;B3SA3|B3;ABEV3|Ambev;WEGE3|WEG;RENT3|Localiza;SUZB3|Suzano;GGBR4|Gerdau PN;GOAU4|Metalúrgica Gerdau;CSNA3|CSN;USIM5|Usiminas;CMIG4|Cemig PN;CMIG3|Cemig ON;CPLE6|Copel PNB;CPLE3|Copel ON;ELET3|Eletrobras ON;ELET6|Eletrobras PNB;EQTL3|Equatorial;ENGI11|Energisa;EGIE3|Engie Brasil;TAEE11|Taesa;TRPL4|ISA CTEEP;ISAE4|ISA Energia;CPFE3|CPFL Energia;NEOE3|Neoenergia;AURE3|Auren Energia;ALUP11|Alupar;SBSP3|Sabesp;SAPR11|Sanepar;CSMG3|Copasa;RADL3|RaiaDrogasil;RDOR3|Rede D'Or;HAPV3|Hapvida;FLRY3|Fleury;QUAL3|Qualicorp;ODPV3|Odontoprev;PSSA3|Porto Seguro;BBSE3|BB Seguridade;CXSE3|Caixa Seguridade;IRBR3|IRB Brasil RE;MGLU3|Magazine Luiza;LREN3|Lojas Renner;ARZZ3|Arezzo&Co;SOMA3|Grupo Soma;AMER3|Americanas;VIVA3|Vivara;ALPA4|Alpargatas;GRND3|Grendene;CEAB3|C&A;PETZ3|Petz;BHIA3|Casas Bahia;ASAI3|Assaí;PCAR3|Pão de Açúcar;CRFB3|Carrefour Brasil;NTCO3|Natura;MDIA3|M. Dias Branco;SMTO3|São Martinho;BEEF3|Minerva;MRFG3|Marfrig;BRFS3|BRF;JBSS3|JBS;SLCE3|SLC Agrícola;RAIZ4|Raízen;UGPA3|Ultrapar;VBBR3|Vibra Energia;CSAN3|Cosan;PRIO3|PRIO;RECV3|PetroReconcavo;BRAV3|Brava Energia;KLBN11|Klabin;DXCO3|Dexco;EMBR3|Embraer;AZUL4|Azul;GOLL4|Gol;CCRO3|CCR;ECOR3|Ecorodovias;RAIL3|Rumo;STBP3|Santos Brasil;MOVI3|Movida;VAMO3|Vamos;TUPY3|Tupy;RAPT4|Randon;POMO4|Marcopolo;KEPL3|Kepler Weber;MULT3|Multiplan;IGTI11|Iguatemi;ALOS3|Allos;CYRE3|Cyrela;MRVE3|MRV;EZTC3|EZTec;DIRR3|Direcional;TEND3|Tenda;JHSF3|JHSF;CURY3|Cury;PLPL3|Plano&Plano;CVCB3|CVC;TIMS3|TIM;VIVT3|Vivo (Telefônica Brasil);TOTS3|Totvs;LWSA3|Locaweb;CASH3|Méliuz;INTB3|Intelbras;POSI3|Positivo;BPAC11|BTG Pactual;BRSR6|Banrisul;BMGB4|Banco BMG;BPAN4|Banco Pan;ABCB4|ABC Brasil;SMFT3|Smart Fit;YDUQ3|Yduqs;COGN3|Cogna;ANIM3|Ânima;SEER3|Ser Educacional;VULC3|Vulcabras;CAML3|Camil;BRKM5|Braskem PNA;UNIP6|Unipar;CMIN3|CSN Mineração;BRAP4|Bradespar;ENEV3|Eneva;ORVR3|Orizon;HYPE3|Hypera;PGMN3|Pague Menos;DASA3|Dasa;MATD3|Mater Dei;ONCO3|Oncoclínicas;GMAT3|Grupo Mateus;AGRO3|BrasilAgro;TTEN3|3tentos;SBFG3|Grupo SBF (Centauro);LJQQ3|Lojas Quero-Quero;GUAR3|Guararapes;WIZC3|Wiz Soluções;ZAMP3|Zamp;PTBL3|Portobello;LOGG3|LOG Commercial;AAPL34|Apple (BDR);MSFT34|Microsoft (BDR);AMZO34|Amazon (BDR);GOGL34|Alphabet/Google (BDR);NVDC34|Nvidia (BDR);TSLA34|Tesla (BDR);MELI34|Mercado Libre (BDR);DISB34|Disney (BDR);COCA34|Coca-Cola (BDR);BERK34|Berkshire Hathaway (BDR);JPMC34|JPMorgan (BDR)`,
  F: `HGLG11|CSHG Logística;XPLG11|XP Log;BTLG11|BTG Pactual Logística;VILG11|Vinci Logística;LVBI11|VBI Logístico;GGRC11|GGR Covepi Renda;BRCO11|Bresco Logística;MXRF11|Maxi Renda;XPML11|XP Malls;VISC11|Vinci Shopping Centers;HSML11|HSI Malls;MALL11|Malls Brasil Plural;KNRI11|Kinea Renda Imobiliária;HGRE11|CSHG Real Estate;PVBI11|VBI Prime Properties;JSRE11|JS Real Estate Multigestão;RBRP11|RBR Properties;BRCR11|BC Fund;TRXF11|TRX Real Estate;HGRU11|CSHG Renda Urbana;ALZR11|Alianza Trust Renda Imobiliária;KNCR11|Kinea Rendimentos Imobiliários;KNIP11|Kinea Índices de Preços;KNHY11|Kinea High Yield CRI;KNSC11|Kinea Securities;CPTS11|Capitânia Securities II;RECR11|REC Recebíveis Imobiliários;RBRR11|RBR Rendimento High Grade;RBRF11|RBR Alpha Multiestratégia;MCCI11|Mauá Capital Recebíveis;VGIR11|Valora RE III;VGHF11|Valora Hedge Fund;IRDM11|Iridium Recebíveis;HABT11|Habitat II;HCTR11|Hectare CE;HGCR11|CSHG Recebíveis Imobiliários;DEVA11|Devant Recebíveis;URPR11|Urca Prime Renda;BCFF11|BTG Pactual Fundo de Fundos;XPCI11|XP Crédito Imobiliário;XPIN11|XP Industrial;SNAG11|Suno Agro;RZAG11|Riza Agro;RZTR11|Riza Terrax;TGAR11|TG Ativo Real;VINO11|Vinci Offices;GARE11|Guardian Real Estate;PATL11|Pátria Logística;SARE11|Santander Renda de Aluguéis;HFOF11|Hedge Top FoF 3;MGFF11|Mogno Fundo de Fundos;RVBI11|RioBravo Renda Varejo;WPLZ11|W Plaza;ZAVI11|Zavit Real Estate;BTHF11|BTG Hedge Fund FoF;BBPO11|BB Progressivo II;KFOF11|Kinea FoF;VCRI11|Vinci Crédito Imobiliário;VCRA11|Vinci Crédito Agro;JURO11|Juros Real Estate;HGBS11|Hedge Brasil Shopping;FIIB11|Industrial do Brasil;CVBI11|VBI CRI`,
  E: `BOVA11|iShares Ibovespa;IVVB11|iShares S&P 500;SMAL11|iShares Small Cap;BOVV11|It Now Ibovespa;DIVO11|It Now IDIV Dividendos;FIND11|It Now Financeiro;MATB11|It Now Materiais Básicos;ECOO11|iShares Carbono Eficiente;GOLD11|Trend Ouro;HASH11|Hashdex Nasdaq Crypto;QBTC11|QR Bitcoin;ETHE11|Hashdex Ethereum;NASD11|Trend Nasdaq 100;SPXI11|It Now S&P 500;WRLD11|Trend Mercados Globais;XINA11|Trend China;B5P211|It Now IMA-B 5 P2;IMAB11|iShares IMA-B;IRFM11|iShares IRF-M;FIXA11|Trend Pré-fixado;LFTS11|Selic (Tesouro) ETF;TECK11|Trend Tecnologia;USTK11|Trend US Tech;ACWI11|Trend ACWI;EURP11|Trend Europa;GOVE11|It Now IGCT Governança;BRAX11|iShares IBrX 100;PIBB11|It Now PIBB;SMAC11|Trend Small Caps`,
};

const numOf = (v) => { const n = Number(String(v === undefined || v === null ? "" : v).replace(",", ".")); return isFinite(n) ? n : 0; };

// ---- Relatório mensal em PDF: resumo, tabelas detalhadas e totais ----
const pdfTxt = (v) => String(v === undefined || v === null ? "" : v).replace(/ /g, " ").replace(/[−–—]/g, "-").replace(/…/g, "...").replace(/[“”]/g, '"').replace(/[^\x20-\xff]/g, "");
function buildMonthlyReport(doc, D) {
  const W = 210, H = 297, MX = 14, CW = W - MX * 2;
  const INK = [30, 41, 59], DIM = [100, 116, 139], GREEN = [22, 163, 74], RED = [185, 28, 28], HEAD = [15, 23, 42], ZEBRA = [246, 248, 250], RULE = [222, 228, 235];
  const money = (n) => pdfTxt(fmtBRL(n));
  let y = 0;
  const font = (size, bold, color) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...(color || INK)); };
  const fit = (t, w) => { t = pdfTxt(t); if (doc.getTextWidth(t) <= w) return t; while (t.length > 1 && doc.getTextWidth(t + "...") > w) t = t.slice(0, -1); return t + "..."; };
  const space = (h) => { if (y + h > H - 16) { doc.addPage(); y = 16; return true; } return false; };
  const title = (t, sub) => {
    space(22); y += 4;
    font(12.5, true, HEAD); doc.text(pdfTxt(t), MX, y);
    if (sub) { font(8.5, false, DIM); doc.text(pdfTxt(sub), W - MX, y, { align: "right" }); }
    y += 2; doc.setDrawColor(...GREEN); doc.setLineWidth(0.6); doc.line(MX, y, MX + 18, y); y += 4;
  };
  const note = (t) => { font(8.5, false, DIM); space(6); doc.text(pdfTxt(t), MX, y + 3); y += 7; };
  // cols: [{ t: título, w: peso, a: "r" para alinhar à direita }]; rows: matriz de textos; foot: linha de total; tone(r, c): cor opcional
  const table = (cols, rows, foot, tone) => {
    const tw = cols.reduce((a, c) => a + c.w, 0), xs = []; let x = MX;
    cols.forEach((c) => { const w = (c.w / tw) * CW; xs.push([x, w]); x += w; });
    const RH = 6.2, PAD = 1.8;
    const cell = (t, i, yy) => { const [cx, w] = xs[i]; const s = fit(t, w - PAD * 2); if (cols[i].a === "r") doc.text(s, cx + w - PAD, yy, { align: "right" }); else doc.text(s, cx + PAD, yy); };
    const head = () => { doc.setFillColor(...HEAD); doc.rect(MX, y, CW, 6.6, "F"); font(8, true, [255, 255, 255]); cols.forEach((c, i) => cell(c.t, i, y + 4.5)); y += 6.6; };
    space(6.6 + RH * Math.min(rows.length + (foot ? 1 : 0), 3)); head();
    rows.forEach((r, n) => {
      if (space(RH)) head();
      if (n % 2 === 1) { doc.setFillColor(...ZEBRA); doc.rect(MX, y, CW, RH, "F"); }
      r.forEach((t, i) => { font(8.5, false, (tone && tone(r, i, n)) || INK); cell(t, i, y + 4.3); });
      y += RH;
    });
    if (foot) {
      if (space(RH + 1)) head();
      doc.setDrawColor(...HEAD); doc.setLineWidth(0.3); doc.line(MX, y, MX + CW, y);
      foot.forEach((t, i) => { font(8.5, true, INK); cell(t, i, y + 4.6); });
      y += RH + 1;
    } else { doc.setDrawColor(...RULE); doc.setLineWidth(0.2); doc.line(MX, y, MX + CW, y); }
    y += 4;
  };

  // ---- cabeçalho ----
  doc.setFillColor(...HEAD); doc.rect(0, 0, W, 30, "F");
  doc.setFillColor(...GREEN); doc.rect(0, 30, W, 1.2, "F");
  font(18, true, [255, 255, 255]); doc.text("Mediplan", MX, 14);
  font(10, false, [203, 213, 225]); doc.text("Relatório financeiro mensal", MX, 21);
  font(14, true, [255, 255, 255]); doc.text(pdfTxt(D.mesNome), W - MX, 14, { align: "right" });
  font(8.5, false, [203, 213, 225]); doc.text(pdfTxt("Gerado em " + D.geradoEm), W - MX, 21, { align: "right" });
  y = 38;

  // ---- resumo em quadros ----
  const boxes = [["Receita bruta", D.bruto, INK], ["Impostos estimados", D.bruto - D.liquido, RED], ["Receita líquida", D.liquido, GREEN], ["Despesas", D.despesas, RED], ["Investido no mês", D.investido, INK], ["Sobra do mês", D.sobra, D.sobra >= 0 ? GREEN : RED]];
  const bw = (CW - 8) / 3, bh = 17;
  boxes.forEach(([l, v, c], i) => {
    const bx = MX + (i % 3) * (bw + 4), by = y + Math.floor(i / 3) * (bh + 4);
    doc.setFillColor(...ZEBRA); doc.setDrawColor(...RULE); doc.setLineWidth(0.2); doc.rect(bx, by, bw, bh, "FD");
    font(8, false, DIM); doc.text(pdfTxt(l), bx + 3.5, by + 5.5);
    font(12.5, true, c); doc.text(money(v), bx + 3.5, by + 12.8);
  });
  y += bh * 2 + 4 + 6;
  table([{ t: "Indicador", w: 5 }, { t: "Valor", w: 5.2, a: "r" }, { t: "Como ler", w: 7.4 }], [
    ["Carga de impostos sobre a receita", D.bruto > 0 ? pdfTxt(fmtPct(((D.bruto - D.liquido) / D.bruto) * 100)) : "-", "Estimativa pela alíquota configurada no app"],
    ["Despesas sobre a receita líquida", D.liquido > 0 ? pdfTxt(fmtPct((D.despesas / D.liquido) * 100)) : "-", "Quanto do que entrou foi gasto"],
    ["Taxa de poupança", D.liquido > 0 ? pdfTxt(fmtPct(((D.liquido - D.despesas) / D.liquido) * 100)) : "-", "Receita líquida menos despesas, sobre a receita líquida"],
    ["Horas trabalhadas", D.horas > 0 ? pdfTxt(fmtHoras(D.horas)) : "-", D.horas > 0 ? "Ganho líquido por hora: " + money(D.porHora) : "Sem horas lançadas no mês"],
    ["Já recebido / a receber", money(D.recebido) + " / " + money(D.liquido - D.recebido), "Líquido das receitas do mês"],
    ["Já pago / a pagar", money(D.pago) + " / " + money(D.despesas - D.pago), "Despesas do mês"],
    ["Patrimônio total", money(D.patrimonio), "Caixa acumulado mais a carteira a valor atual"],
  ]);

  // ---- receitas ----
  title("Receitas", `${D.receitas.length} lançamento(s)`);
  if (!D.receitas.length) note("Nenhuma receita neste mês.");
  else table([{ t: "Quando", w: 5 }, { t: "Origem", w: 5 }, { t: "Tipo", w: 2.4 }, { t: "Bruto", w: 3, a: "r" }, { t: "Impostos", w: 2.8, a: "r" }, { t: "Líquido", w: 3, a: "r" }, { t: "Situação", w: 2.4 }],
    D.receitas.map((r) => [r.quando, r.nome, r.tipo, money(r.bruto), money(r.bruto - r.liquido), money(r.liquido), r.recebido ? "Recebido" : "Pendente"]),
    ["Total", "", "", money(D.bruto), money(D.bruto - D.liquido), money(D.liquido), ""], (r, i) => (i === 6 ? (r[6] === "Recebido" ? GREEN : RED) : null));
  if (D.trabalho.length) {
    title("Rentabilidade do trabalho", "ganho líquido por hora em cada local");
    table([{ t: "Local", w: 6 }, { t: "Horas", w: 2.5, a: "r" }, { t: "Líquido", w: 3.5, a: "r" }, { t: "Por hora", w: 3.5, a: "r" }],
      D.trabalho.map((t) => [t.nome, pdfTxt(fmtHoras(t.horas)), money(t.liquido), money(t.porHora)]), ["Total", pdfTxt(fmtHoras(D.horas)), money(D.trabalho.reduce((a, t) => a + t.liquido, 0)), money(D.porHora)]);
  }

  // ---- despesas ----
  title("Despesas", `${D.despesasItens.length} conta(s)`);
  if (!D.despesasItens.length) note("Nenhuma despesa neste mês.");
  else {
    table([{ t: "Vencimento", w: 2.6 }, { t: "Descrição", w: 6.5 }, { t: "Categoria", w: 3.4 }, { t: "Tipo", w: 2.4 }, { t: "Valor", w: 3, a: "r" }, { t: "Situação", w: 2.4 }],
      D.despesasItens.map((e) => [e.venc, e.descricao, e.categoria, e.tipo, money(e.valor), e.paga ? "Paga" : "Pendente"]),
      ["Total", "", "", "", money(D.despesas), ""], (r, i) => (i === 5 ? (r[5] === "Paga" ? GREEN : RED) : null));
    title("Despesas por categoria", "da maior para a menor");
    table([{ t: "Categoria", w: 5 }, { t: "Contas", w: 2, a: "r" }, { t: "Valor", w: 3, a: "r" }, { t: "% das despesas", w: 3, a: "r" }, { t: "Limite", w: 3, a: "r" }, { t: "Situação", w: 3.4 }],
      D.categorias.map((c) => [c.nome, String(c.n), money(c.valor), pdfTxt(fmtPct(D.despesas > 0 ? (c.valor / D.despesas) * 100 : 0)), c.limite > 0 ? money(c.limite) : "-", c.limite > 0 ? (c.valor > c.limite ? "Acima do limite" : "Dentro do limite") : "-"]),
      ["Total", String(D.despesasItens.length), money(D.despesas), "100%", D.limiteGeral > 0 ? money(D.limiteGeral) : "-", D.limiteGeral > 0 ? (D.despesas > D.limiteGeral ? "Acima do limite" : "Dentro do limite") : ""],
      (r, i) => (i === 5 && r[5] === "Acima do limite" ? RED : null));
  }

  (D.cartoes || []).forEach((c) => {
    title("Cartão de crédito: " + c.nome, `${c.n} compra(s) na fatura`);
    table([{ t: "Categoria", w: 6 }, { t: "Compras", w: 2.4, a: "r" }, { t: "Valor", w: 3.4, a: "r" }, { t: "% da fatura", w: 3, a: "r" }],
      c.grupos.map((g) => [g.nome, String(g.n), money(g.valor), pdfTxt(fmtPct(c.total > 0 ? (g.valor / c.total) * 100 : 0))]), ["Total da fatura", String(c.n), money(c.total), "100%"]);
  });

  // ---- investimentos ----
  title("Investimentos do mês", `${D.aportes.length} lançamento(s)`);
  if (!D.aportes.length) note("Nenhuma compra ou venda neste mês.");
  else table([{ t: "Data", w: 2.4 }, { t: "Ativo", w: 4.5 }, { t: "Classe", w: 3 }, { t: "Operação", w: 2.6 }, { t: "Qtd.", w: 2.4, a: "r" }, { t: "Preço", w: 3, a: "r" }, { t: "Total", w: 3.4, a: "r" }],
    D.aportes.map((a) => [a.data, a.ativo, a.classe, a.operacao, a.qtd, a.preco, money(a.total)]),
    ["Aportes menos vendas", "", "", "", "", "", money(D.investido)], (r, i) => (i === 3 && r[3] === "Venda" ? RED : null));
  if (D.carteira.length) {
    title("Carteira na data do relatório", `${D.carteira.length} ativo(s)`);
    table([{ t: "Ativo", w: 2.8 }, { t: "Qtd.", w: 2.2, a: "r" }, { t: "Preço médio", w: 3, a: "r" }, { t: "Cotação", w: 3, a: "r" }, { t: "Investido", w: 3.6, a: "r" }, { t: "Valor atual", w: 3.6, a: "r" }, { t: "Resultado", w: 3.6, a: "r" }, { t: "Rent.", w: 2, a: "r" }],
      D.carteira.map((p) => [p.ativo, p.qtd, p.pm, p.cotacao, money(p.custo), money(p.valor), (p.resultado >= 0 ? "+" : "-") + money(Math.abs(p.resultado)), p.pct !== null ? pdfTxt(fmtPct(p.pct)) : "-"]),
      ["Total", "", "", "", money(D.carteiraCusto), money(D.carteiraValor), (D.carteiraValor - D.carteiraCusto >= 0 ? "+" : "-") + money(Math.abs(D.carteiraValor - D.carteiraCusto)), D.carteiraCusto > 0 ? pdfTxt(fmtPct(((D.carteiraValor - D.carteiraCusto) / D.carteiraCusto) * 100)) : "-"],
      (r, i) => (i >= 6 ? (String(r[6]).startsWith("-") ? RED : GREEN) : null));
  }

  // ---- histórico ----
  if (D.historico.length) {
    title("Últimos meses", "para comparar com este mês");
    table([{ t: "Mês", w: 4 }, { t: "Receita líquida", w: 3.5, a: "r" }, { t: "Despesas", w: 3.5, a: "r" }, { t: "Investido", w: 3.5, a: "r" }, { t: "Sobra", w: 3.5, a: "r" }],
      D.historico.map((h) => [h.mes, money(h.liquido), money(h.despesas), money(h.investido), money(h.sobra)]), null, (r, i) => (i === 4 ? (String(r[4]).includes("-") ? RED : GREEN) : null));
  }
  note("Valores líquidos e impostos são estimativas pela alíquota configurada no app e não substituem a apuração do contador.");

  // ---- rodapé com número de página ----
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p); doc.setDrawColor(...RULE); doc.setLineWidth(0.2); doc.line(MX, H - 11, W - MX, H - 11);
    font(8, false, DIM); doc.text(pdfTxt("Mediplan · " + D.mesNome), MX, H - 6.5); doc.text(`Página ${p} de ${n}`, W - MX, H - 6.5, { align: "right" });
  }
  return n;
}

// Soma dos ajustes de preço médio que de fato valeram (os lançados com a posição zerada são ignorados, como em computePortfolio)
function ajustesPM(investments) {
  const q = {}; let tot = 0;
  [...investments].sort((a, b) => (a.date || "").localeCompare(b.date || "") || String(a.id).localeCompare(String(b.id))).forEach((i) => {
    const k = (i.category || "Outro") + "|" + i.description, n = Number(i.qty || 0);
    const st = q[k] = q[k] || { qty: 0, cost: 0 };
    if (i.tipo === "ajuste") { if (st.qty > 0) { const d = Math.max(-st.cost, Number(i.ajuste || 0)); st.cost += d; tot += d; } return; }
    if (n > 0) { if (i.tipo === "venda") { const avg = st.qty > 0 ? st.cost / st.qty : 0, sq = Math.min(n, st.qty); st.cost -= avg * sq; st.qty -= sq; } else { st.qty += n; st.cost += Math.abs(Number(i.amount || 0)); } }
    else st.cost += Number(i.amount || 0);
  });
  return tot;
}
// Calcula posições da carteira (preço médio, valor atual, rentabilidade) a partir dos lançamentos
function computePortfolio(investments, cotacoes) {
  const groups = {};
  [...investments].sort((a, b) => (a.date || "").localeCompare(b.date || "") || String(a.id).localeCompare(String(b.id))).forEach((i) => {
    const cat = i.category || "Outro";
    const key = cat + "|" + i.description;
    const g = groups[key] = groups[key] || { key, category: cat, description: i.description, assetName: i.assetName || ASSET_NAME[i.description] || "", qty: 0, cost: 0, realized: 0, bought: 0, sold: 0, legacyCost: 0, entries: 0 };
    g.entries += 1;
    if (i.assetName && !g.assetName) g.assetName = i.assetName;
    // ajuste manual do preço médio: muda só o custo da posição, sem compra, venda nem movimento de caixa
    if (i.tipo === "ajuste") { if (g.qty > 0) g.cost = Math.max(0, g.cost + Number(i.ajuste || 0)); return; }
    const amt = Number(i.amount || 0);
    const q = Number(i.qty || 0);
    if (q > 0) {
      if (i.tipo === "venda") {
        const avg = g.qty > 0 ? g.cost / g.qty : 0;
        const sellQty = Math.min(q, g.qty);
        g.realized += Math.abs(amt) - avg * sellQty;
        g.cost -= avg * sellQty; g.qty -= sellQty; g.sold += Math.abs(amt);
      } else { g.qty += q; g.cost += Math.abs(amt); g.bought += Math.abs(amt); }
    } else if (amt >= 0) { g.cost += amt; g.legacyCost += amt; g.bought += amt; }
    else { g.cost += amt; g.legacyCost += amt; g.sold += Math.abs(amt); }
  });
  const positions = Object.values(groups).filter((g) => g.qty > 0.0000001 || g.cost > 0.005).map((g) => {
    const meta = invCatMeta(g.category);
    const isQty = g.qty > 0.0000001;
    const cot = cotacoes ? numOf(cotacoes[g.description]) : 0;
    const value = isQty ? (cot > 0 ? g.qty * cot + g.legacyCost : g.cost) : (cot > 0 ? cot : g.cost);
    return { ...g, meta, isQty, cotacao: cot, avg: isQty ? g.cost / g.qty : 0, value, profit: value - g.cost, profitPct: g.cost > 0 ? ((value - g.cost) / g.cost) * 100 : 0 };
  }).sort((a, b) => b.value - a.value);
  const totalCost = positions.reduce((a, p) => a + p.cost, 0);
  const totalValue = positions.reduce((a, p) => a + p.value, 0);
  const totalBought = Object.values(groups).reduce((a, g) => a + g.bought, 0);
  const totalSold = Object.values(groups).reduce((a, g) => a + g.sold, 0);
  return { positions, totalCost, totalValue, totalBought, totalSold, unrealized: totalValue - totalCost };
}
const ASSET_DB = [];
Object.keys(ASSET_RAW).forEach((ty) => ASSET_RAW[ty].split(";").forEach((row) => { const [t, n] = row.split("|"); if (t) ASSET_DB.push({ t, n, ty }); }));
const ASSET_NAME = Object.fromEntries(ASSET_DB.map((a) => [a.t, a.n]));

// IMPORT-PARSERS-START
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const MON_MAP = { jan: 0, fev: 1, feb: 1, mar: 2, abr: 3, apr: 3, mai: 4, may: 4, jun: 5, jul: 6, ago: 7, aug: 7, set: 8, sep: 8, out: 9, oct: 9, nov: 10, dez: 11, dec: 11 };
const pad2 = (n) => String(n).padStart(2, "0");
const stripAcc = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function parseAmountBR(raw) {
  if (raw === null || raw === undefined) return NaN;
  let t = String(raw).replace(/−/g, "-").trim();
  if (!t) return NaN;
  const neg = /^-|^r\$\s*-|-\s*$|\(.*\)|\sd\s*$|\dd\s*$/i.test(t);
  t = t.replace(/[^\d,.]/g, "");
  if (!/\d/.test(t)) return NaN;
  const lc = t.lastIndexOf(","), ld = t.lastIndexOf(".");
  if (lc > ld) t = t.replace(/\./g, "").replace(",", ".");
  else if (ld > lc) {
    const decimals = t.length - ld - 1;
    if (lc === -1 && decimals === 3) t = t.replace(/\./g, "");
    else t = t.replace(/,/g, "");
  }
  const n = parseFloat(t);
  if (isNaN(n)) return NaN;
  return neg ? -n : n;
}

// devolve { iso, hadYear } ou null
function parseDateAny(str, refYear) {
  const t = stripAcc(str).trim().replace(/\s+/g, " ");
  let y, m, d, hadYear = true, mt;
  if ((mt = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { y = +mt[1]; m = +mt[2] - 1; d = +mt[3]; }
  else if ((mt = t.match(/^(\d{4})(\d{2})(\d{2})/))) { y = +mt[1]; m = +mt[2] - 1; d = +mt[3]; }
  else if ((mt = t.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?$/))) {
    d = +mt[1]; m = +mt[2] - 1;
    if (mt[3]) { y = +mt[3]; if (y < 100) y += 2000; } else { y = refYear; hadYear = false; }
  }
  else if ((mt = t.match(/^(\d{1,2}) (?:de )?([a-z]{3})[a-z]*\.?(?: (?:de )?(\d{2,4}))?$/))) {
    d = +mt[1]; m = MON_MAP[mt[2]];
    if (m === undefined) return null;
    if (mt[3]) { y = +mt[3]; if (y < 100) y += 2000; } else { y = refYear; hadYear = false; }
  }
  else return null;
  if (!(m >= 0 && m <= 11 && d >= 1 && d <= 31 && y > 1990 && y < 2100)) return null;
  return { iso: `${y}-${pad2(m + 1)}-${pad2(d)}`, hadYear };
}

function fixYear(parsed, today) {
  if (!parsed) return null;
  if (parsed.hadYear) return parsed.iso;
  const dt = new Date(parsed.iso + "T12:00:00");
  if (dt - today > 45 * 86400000) { const y = Number(parsed.iso.slice(0, 4)) - 1; return y + parsed.iso.slice(4); }
  return parsed.iso;
}

function parseOFX(text) {
  const out = [];
  const chunks = text.split(/<STMTTRN>/i).slice(1);
  chunks.forEach((c, i) => {
    const body = c.split(/<\/STMTTRN>/i)[0];
    const tag = (n) => { const mm = body.match(new RegExp("<" + n + ">\\s*([^<\\r\\n]*)", "i")); return mm ? mm[1].trim() : ""; };
    const dt = parseDateAny(tag("DTPOSTED").slice(0, 8));
    const amtTxt = tag("TRNAMT");
    const amount = /,/.test(amtTxt) ? parseAmountBR(amtTxt) : parseFloat(amtTxt);
    const desc = (tag("MEMO") || tag("NAME") || "Lançamento").replace(/\s+/g, " ");
    if (dt && !isNaN(amount) && amount !== 0) out.push({ date: dt.iso, desc, amount, fitid: tag("FITID") || "", fmt: "ofx" });
  });
  return out;
}

function splitCSVLine(line, delim) {
  const cells = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === delim && !q) { cells.push(cur); cur = ""; }
    else cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function parseCSV(text, refYear, today) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const sample = lines.slice(0, 12).join("\n");
  const count = (ch) => (sample.match(new RegExp(ch === "\t" ? "\\t" : "\\" + ch, "g")) || []).length;
  const delim = [";", ",", "\t"].sort((a, b) => count(b) - count(a))[0];
  const rows = lines.map((l) => splitCSVLine(l, delim));
  const H = { date: /(^|\s)(data|date|dt)(\s|$|\b)/, desc: /descri|hist|lancamento|estabelecimento|title|titulo|memo|detalhe|nome|favorecido|estabelec/, amount: /^(valor|amount|value|quantia)|valor ?\(|valor em|valor r/, credit: /credito|entrada/, debit: /debito|saida/, saldo: /saldo|balance/ };
  let hi = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const n = rows[i].map(stripAcc);
    if (n.some((c) => H.date.test(c)) && n.some((c) => (H.amount.test(c) || H.credit.test(c) || H.debit.test(c)) && !H.saldo.test(c))) { hi = i; break; }
  }
  const out = [];
  if (hi >= 0) {
    const hdr = rows[hi].map(stripAcc);
    const di = hdr.findIndex((c) => H.date.test(c));
    const ai = hdr.findIndex((c) => H.amount.test(c) && !H.saldo.test(c));
    const ci = hdr.findIndex((c) => H.credit.test(c) && !H.saldo.test(c));
    const bi = hdr.findIndex((c) => H.debit.test(c) && !H.saldo.test(c));
    const dIdx = hdr.map((c, i) => (H.desc.test(c) && i !== di ? i : -1)).filter((i) => i >= 0);
    rows.slice(hi + 1).forEach((r) => {
      const dt = fixYear(parseDateAny(r[di] || "", refYear), today);
      let amount;
      if (ai >= 0) amount = parseAmountBR(r[ai]);
      else { const cr = parseAmountBR(r[ci]), db = parseAmountBR(r[bi]); amount = (isNaN(cr) ? 0 : Math.abs(cr)) - (isNaN(db) ? 0 : Math.abs(db)); }
      const desc = (dIdx.length ? dIdx.map((i) => r[i]).filter(Boolean).join(" · ") : r.filter((c, i) => i !== di && i !== ai).join(" ")).replace(/\s+/g, " ").trim();
      if (dt && !isNaN(amount) && amount !== 0) out.push({ date: dt, desc: desc || "Lançamento", amount, fmt: "csv" });
    });
  } else {
    rows.forEach((r) => {
      const di = r.findIndex((c) => parseDateAny(c, refYear));
      if (di < 0) return;
      let ai = -1;
      for (let i = r.length - 1; i > di; i--) if (/\d[.,]\d{2}\s*$/.test(r[i]) && !isNaN(parseAmountBR(r[i]))) { ai = i; break; }
      if (ai < 0) return;
      const desc = r.filter((c, i) => i !== di && i !== ai && !/^-?[\d.,\s]+$/.test(c)).sort((a, b) => b.length - a.length)[0] || "Lançamento";
      const amount = parseAmountBR(r[ai]);
      const dt = fixYear(parseDateAny(r[di], refYear), today);
      if (dt && !isNaN(amount) && amount !== 0) out.push({ date: dt, desc: desc.trim(), amount, fmt: "csv" });
    });
  }
  return out;
}

function itemsToLines(items) {
  const rows = [];
  items.filter((i) => i.str && i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x).forEach((it) => {
    let row = rows.find((r) => Math.abs(r.y - it.y) <= 2.5);
    if (!row) { row = { y: it.y, parts: [] }; rows.push(row); }
    row.parts.push(it);
  });
  return rows.sort((a, b) => b.y - a.y).map((r) => r.parts.sort((a, b) => a.x - b.x).map((p) => p.str.trim()).join(" ").replace(/\s+/g, " ").trim());
}

const DATE_SRC = "(\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?|\\d{1,2}\\s+(?:de\\s+)?(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\\.?(?:\\s+\\d{4})?)";
const AMT_SRC = "((?:-\\s?)?(?:R\\$\\s*)?-?\\s?\\(?(?:\\d{1,3}(?:\\.\\d{3})+|\\d+),\\d{2}\\)?(?:\\s?(?:[CD]|-)(?![\\w]))?)";

function parseStatementLines(lines, refYear, today) {
  const re = new RegExp("(?:^|\\s)" + DATE_SRC + "\\s+(.+?)\\s+" + AMT_SRC + "(?:\\s+" + AMT_SRC + ")?(?=\\s+" + DATE_SRC + "\\s|\\s*$)", "gi");
  const out = [];
  lines.forEach((line) => {
    const L = line.replace(/−/g, "-");
    let mt;
    re.lastIndex = 0;
    while ((mt = re.exec(L))) {
      const desc = mt[2].trim().replace(/^[•*·.]{2,}\s*\d{4}\s+/, "");
      if (/^(saldo|total|subtotal)\b|saldo (anterior|do dia|final|disponivel|disponível)|^limite/i.test(desc)) continue;
      // "Total de compras, 06 OUT a 06 NOV R$ ..." e parecidas: a data está no meio de uma frase de resumo
      if (/total|per[ií]odo|vigente|fechamento|vencimento/i.test(L.slice(0, mt.index)) || /^a \d{1,2} [a-zç]{3}/i.test(desc)) continue;
      const dt = fixYear(parseDateAny(mt[1], refYear), today);
      const amount = parseAmountBR(mt[3]);
      if (dt && !isNaN(amount) && amount !== 0) out.push({ date: dt, desc: desc.replace(/\s+/g, " "), amount, fmt: "pdf" });
    }
  });
  return out;
}

// Lê da fatura do cartão o total a pagar neste mês e o vencimento, quando estão impressos.
function faturaInfo(lines, refYear) {
  const num = "R\\$\\s*((?:\\d{1,3}(?:\\.\\d{3})+|\\d+),\\d{2})";
  const todas = lines.map((l) => String(l).replace(/−/g, "-").replace(/\s+/g, " ").trim());
  const junto = todas.join(" ");
  let total = null, mt;
  const exata = new RegExp("^total a pagar " + num + "$", "i");
  for (const l of todas) { if ((mt = l.match(exata))) { total = parseAmountBR(mt[1]); break; } }
  if (total === null) {
    for (const src of ["fatura[^.]{0,40}?no valor de " + num, "pagamento total da fatura " + num, "total (?:da|desta) fatura:? " + num, "valor total(?: da fatura)?:? " + num, "total a pagar:? " + num]) {
      if ((mt = junto.match(new RegExp(src, "i")))) { total = parseAmountBR(mt[1]); break; }
    }
  }
  let venc = null;
  if ((mt = junto.match(/vencimento:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2} (?:de )?[a-zç]{3}[a-zç]*\.?(?: (?:de )?\d{4})?)/i))) { const d = parseDateAny(mt[1], refYear); if (d) venc = d.iso; }
  return { total: total > 0 ? total : null, venc };
}

function guessYear(text) {
  const counts = {};
  (text.match(/\b20\d{2}\b/g) || []).forEach((y) => { counts[y] = (counts[y] || 0) + 1; });
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best ? Number(best[0]) : new Date().getFullYear();
}
// IMPORT-PARSERS-END

async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((res, rej) => {
    const sc = document.createElement("script");
    sc.src = PDFJS_URL; sc.onload = res;
    sc.onerror = () => rej(new Error("Não consegui carregar o leitor de PDF. Verifique a internet e tente de novo."));
    document.head.appendChild(sc);
  });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  return window.pdfjsLib;
}

async function pdfToLines(buf, password) {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: new Uint8Array(buf), password: password || undefined }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    lines.push(...itemsToLines(tc.items.map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }))));
  }
  return lines;
}

async function readTextSmart(file) {
  const buf = await file.arrayBuffer();
  let txt = new TextDecoder("utf-8").decode(buf);
  if (txt.includes("�")) { try { txt = new TextDecoder("windows-1252").decode(buf); } catch (e) {} }
  return txt;
}


const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
async function loadXlsx() {
  if (window.XLSX) return window.XLSX;
  await new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = XLSX_URL; sc.onload = res; sc.onerror = () => rej(new Error("Não consegui carregar o leitor de Excel. Verifique a internet e tente de novo.")); document.head.appendChild(sc); });
  return window.XLSX;
}
async function fileToTables(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (ext === "xlsx" || ext === "xls") {
    const X = await loadXlsx();
    const wb = X.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
    return wb.SheetNames.map((n) => ({ name: n, rows: X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "" }) }));
  }
  const txt = await readTextSmart(file);
  const lines = txt.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const sample = lines.slice(0, 8).join("\n");
  const delim = (sample.match(/;/g) || []).length >= (sample.match(/,/g) || []).length ? ";" : ",";
  return [{ name: file.name, rows: lines.map((l) => splitCSVLine(l, delim)) }];
}

// B3-PARSERS-START
const normH = (h) => stripAcc(String(h === undefined || h === null ? "" : h)).replace(/\s+/g, " ").trim();
const excelDate = (v) => {
  if (typeof v === "number" && v > 20000 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000); return d.toISOString().slice(0, 10); }
  const p = parseDateAny(String(v || "").trim()); return p ? p.iso : null;
};
const numB3 = (v) => { if (typeof v === "number") return v; const t = String(v === undefined || v === null ? "" : v).trim(); if (!t || t === "-") return NaN; return parseAmountBR(t); };
const tickerFrom = (prod) => { const m = String(prod || "").trim().toUpperCase().match(/^([A-Z]{4}\d{1,2}[A-Z]?)\b/); return m ? m[1] : null; };
const cleanTicker = (t) => { t = String(t || "").trim().toUpperCase(); if (/^[A-Z]{4}\d{1,2}F$/.test(t)) t = t.slice(0, -1); return t; };
const B3_DB = typeof ASSET_DB !== "undefined" ? ASSET_DB : [];
const b3Category = (ticker, sheet, prod) => {
  const sh = normH(sheet), pr = normH(prod);
  if (/tesouro|renda fixa|cdb|lci|lca|debenture|\bcri\b|\bcra\b/.test(sh) || /^(tesouro|cdb|lci|lca|lc |debenture|cri |cra )/.test(pr)) return "Renda Fixa";
  if (/etf/.test(sh)) return "ETF";
  if (/fundo|fii|imobili/.test(sh)) return "FII";
  if (/bdr|acoes|acao/.test(sh)) return "Ações";
  const a = B3_DB.find((x) => x.t === ticker);
  if (a) return a.ty === "F" ? "FII" : a.ty === "E" ? "ETF" : "Ações";
  if (ticker && /11$/.test(ticker)) return "FII";
  if (ticker) return "Ações";
  return "Renda Fixa";
};
function findB3Header(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const h = (rows[i] || []).map(normH);
    if (h.filter(Boolean).length >= 3 && (h.includes("produto") || h.some((x) => x.startsWith("codigo de negociacao")) || h.includes("entrada/saida"))) return i;
  }
  return -1;
}
function parseB3Tables(tables) {
  const out = []; const info = { proventos: 0, eventos: [], outros: 0, tipos: [] };
  const addTipo = (t) => { if (!info.tipos.includes(t)) info.tipos.push(t); };
  tables.forEach(({ name, rows }) => {
    const hi = findB3Header(rows); if (hi < 0) return;
    const H = rows[hi].map(normH);
    const col = (...names) => { for (const n of names) { const i = H.findIndex((h) => h === n); if (i >= 0) return i; } for (const n of names) { const i = H.findIndex((h) => h.startsWith(n)); if (i >= 0) return i; } return -1; };
    const data = rows.slice(hi + 1).filter((r) => r && r.some((c) => String(c).trim() !== ""));
    const cES = col("entrada/saida"), cMov = col("movimentacao"), cProd = col("produto"), cDataNeg = col("data do negocio"), cTipoMov = col("tipo de movimentacao");
    const cCod = col("codigo de negociacao"), cQtd = col("quantidade"), cPreco = col("preco unitario", "preco"), cValOp = col("valor da operacao", "valor"), cData = col("data");
    if (cES >= 0 && cMov >= 0 && cProd >= 0) {
      addTipo("Movimentação");
      data.forEach((r) => {
        const mov = normH(r[cMov]); const es = normH(r[cES]); const prod = String(r[cProd] || "").trim();
        if (!mov || /excluido|cancelado/.test(mov)) return;
        if (/^(dividendo|juros sobre capital|rendimento)/.test(mov)) { info.proventos++; return; }
        if (/^(desdobro|grupamento|bonificacao|fracao|leilao de fracao|direito|cessao|amortizacao|incorporacao)/.test(mov)) { info.eventos.push(`${prod.split(" - ")[0]}: ${String(r[cMov]).trim()} em ${fmtDatePt(excelDate(r[cData]) || "")}`); return; }
        let side = null;
        if (/^(transferencia - liquidacao|compra|venda|aplicacao|resgate|vencimento)/.test(mov)) side = es.startsWith("cred") ? "compra" : es.startsWith("deb") ? "venda" : null;
        if (!side) { info.outros++; return; }
        const date = excelDate(r[cData]); const qty = numB3(r[cQtd]); const price = numB3(r[cPreco]); let val = numB3(r[cValOp]);
        const tk = tickerFrom(prod); const cat = b3Category(tk, name, prod);
        if (isNaN(val) && !isNaN(qty) && !isNaN(price)) val = qty * price;
        if (!date || isNaN(val) || val === 0) { info.outros++; return; }
        const isRF = cat === "Renda Fixa" || !tk;
        out.push({ kind: "trade", src: "mov", date, ticker: isRF ? prod : tk, name: isRF ? "" : prod.split(" - ").slice(1).join(" - ").trim(), category: isRF ? "Renda Fixa" : cat, side,
          qty: !isRF && !isNaN(qty) ? Math.abs(qty) : 0, price: !isRF && !isNaN(price) ? price : 0, amount: Math.abs(val) });
      });
      return;
    }
    if (cDataNeg >= 0 && cCod >= 0 && cTipoMov >= 0) {
      addTipo("Negociação");
      data.forEach((r) => {
        const tipo = normH(r[cTipoMov]); const side = tipo.startsWith("compra") ? "compra" : tipo.startsWith("venda") ? "venda" : null;
        if (!side) return;
        const tk = cleanTicker(r[cCod]); const qty = numB3(r[cQtd]); const price = numB3(r[cPreco]); let val = numB3(r[cValOp]);
        if (isNaN(val) && !isNaN(qty) && !isNaN(price)) val = qty * price;
        const date = excelDate(r[cDataNeg]);
        if (!date || !tk || isNaN(qty) || qty <= 0 || isNaN(val)) return;
        out.push({ kind: "trade", src: "neg", date, ticker: tk, name: "", category: b3Category(tk, name, ""), side, qty, price: isNaN(price) ? val / qty : price, amount: Math.abs(val) });
      });
      return;
    }
    const cFech = col("preco de fechamento"), cVal = col("valor atualizado", "valor liquido", "valor bruto"), cAplic = col("valor aplicado");
    if (cQtd >= 0 && (cFech >= 0 || cVal >= 0) && (cProd >= 0 || cCod >= 0)) {
      addTipo("Posição");
      data.forEach((r) => {
        const prod = cProd >= 0 ? String(r[cProd] || "").trim() : "";
        if (/^total/i.test(prod) || (!prod && (cCod < 0 || !String(r[cCod] || "").trim()))) return;
        const tk = cCod >= 0 && String(r[cCod] || "").trim() ? cleanTicker(r[cCod]) : tickerFrom(prod);
        const cat = b3Category(tk, name, prod);
        const qty = numB3(r[cQtd]); const price = cFech >= 0 ? numB3(r[cFech]) : NaN; let value = cVal >= 0 ? numB3(r[cVal]) : NaN;
        if (isNaN(value) && !isNaN(qty) && !isNaN(price)) value = qty * price;
        if (isNaN(value) || value <= 0) return;
        const applied = cAplic >= 0 ? numB3(r[cAplic]) : NaN;
        if (cat === "Renda Fixa" || !tk) out.push({ kind: "pos", ticker: prod || tk, name: "", category: "Renda Fixa", qty: 0, price: 0, value, applied: isNaN(applied) ? null : applied });
        else out.push({ kind: "pos", ticker: tk, name: prod.split(" - ").slice(1).join(" - ").trim(), category: cat, qty: isNaN(qty) ? 0 : qty, price: isNaN(price) ? (qty > 0 ? value / qty : 0) : price, value });
      });
    }
  });
  const agg = {}; const res = [];
  out.forEach((r) => {
    if (r.kind !== "pos") { res.push(r); return; }
    const k = r.category + "|" + r.ticker;
    if (agg[k]) { agg[k].qty += r.qty; agg[k].value += r.value; if (r.applied) agg[k].applied = (agg[k].applied || 0) + r.applied; }
    else { agg[k] = { ...r }; res.push(agg[k]); }
  });
  return { rows: res, info };
}
// B3-PARSERS-END

const CARD_PAY_RE = /(pag(amento|to)?\.?\s*(de\s+)?fatura|fatura\s*(do\s+)?cart|pagto\.?\s*cart|cart[aã]o de cr[eé]dito)/i;
const INVEST_RE = /(aplica[cç][aã]o|resgate|tesouro direto|corretora|\bcdb\b|\blci\b|\blca\b|invest)/i;
// Agrupa as compras de uma fatura por categoria, da maior para a menor
function faturaGrupos(itens) {
  const map = {};
  (itens || []).forEach((it) => { const m = EXP_CAT_MAP[it.c] || EXP_CAT_MAP.outros; const g = map[m.id] = map[m.id] || { id: m.id, label: m.label, color: m.color, valor: 0, itens: [] }; g.valor += Number(it.v || 0); g.itens.push(it); });
  return Object.values(map).map((g) => ({ ...g, itens: g.itens.sort((a, b) => (a.dt || "").localeCompare(b.dt || "")) })).sort((a, b) => b.valor - a.valor);
}
const cleanDesc = (d) => String(d || "").replace(/\s+/g, " ").trim().slice(0, 70);

const normTxt = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const pad = (n) => String(n).padStart(2, "0");
const dateStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const monthKeyOf = (y, m) => `${y}-${pad(m + 1)}`;
const todayStr = () => { const t = new Date(); return dateStr(t.getFullYear(), t.getMonth(), t.getDate()); };
let DISCRETO = false; // modo discreto: esconde os valores em reais (fica neste aparelho)
const fmtBRL = (n) => (DISCRETO ? "R$ ••••" : (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const fmtDatePt = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const colorForIndex = (i) => PALETTE[i % PALETTE.length];
const clampDay = (y, m, day) => Math.min(Number(day) || 1, new Date(y, m + 1, 0).getDate());

// ---- tiny inline icon set (no external icon dependency) ----
function Ico({ size = 16, color = "currentColor", children }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>);
}
const IconCalendar = (p) => <Ico {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Ico>;
const IconWallet = (p) => <Ico {...p}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></Ico>;
const IconTrending = (p) => <Ico {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Ico>;
const IconPie = (p) => <Ico {...p}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></Ico>;
const IconPlus = (p) => <Ico {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ico>;
const IconTrash = (p) => <Ico {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></Ico>;
const IconChevronLeft = (p) => <Ico {...p}><polyline points="15 18 9 12 15 6"/></Ico>;
const IconChevronRight = (p) => <Ico {...p}><polyline points="9 18 15 12 9 6"/></Ico>;
const IconChevronUp = (p) => <Ico {...p}><polyline points="18 15 12 9 6 15"/></Ico>;
const IconChevronDown = (p) => <Ico {...p}><polyline points="6 9 12 15 18 9"/></Ico>;
const IconX = (p) => <Ico {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ico>;
const IconBuilding = (p) => <Ico {...p}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><line x1="10" y1="6" x2="14" y2="6"/><line x1="10" y1="10" x2="14" y2="10"/><line x1="10" y1="14" x2="14" y2="14"/><line x1="10" y1="18" x2="14" y2="18"/></Ico>;
const IconClock = (p) => <Ico {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Ico>;
const IconReceipt = (p) => <Ico {...p}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></Ico>;
const IconDownload = (p) => <Ico {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Ico>;
const IconUpload = (p) => <Ico {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></Ico>;
const IconHome = (p) => <Ico {...p}><path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></Ico>;
const IconTarget = (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></Ico>;
const IconBell = (p) => <Ico {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/></Ico>;
const IconFileText = (p) => <Ico {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></Ico>;
// logo: o "M" de Mediplan dentro do anel de progresso das metas
const IconEdit = (p) => <Ico {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Ico>;
const IconLogo = (p) => (<svg width={p.size||22} height={p.size||22} viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="none" stroke="#273244" strokeWidth="10" /><circle cx="50" cy="50" r="40" fill="none" stroke="#34D399" strokeWidth="10" strokeLinecap="round" strokeDasharray="188 252" transform="rotate(-90 50 50)" /><path d="M32 68 V34 L50 55 L68 34 V68" fill="none" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" /></svg>);

// ---- self-contained SVG charts (no external charting library) ----

function PrazoPicker({ unit, value, onChange }) {
  const presets = unit === "dias" ? [0, 30, 60, 90] : [0, 1, 2, 3];
  const v = Number(value || 0);
  const [custom, setCustom] = useState(!presets.includes(v));
  return (
    <div>
      <div className="chip-row">
        {presets.map((p) => <button key={p} type="button" className={`chip ${!custom && v === p ? "active" : ""}`} onClick={() => { setCustom(false); onChange(p); }}>{prazoText(unit, p)}</button>)}
        <button type="button" className={`chip ${custom ? "active" : ""}`} onClick={() => setCustom(true)}>Outro</button>
      </div>
      {custom && <input type="number" inputMode="numeric" min="0" style={{ marginTop: 8 }} value={v || ""} placeholder={unit === "dias" ? "Número de dias (ex: 45)" : "Número de meses (ex: 4)"} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />}
    </div>
  );
}

function RangeTabs({ value, onChange, options = [3, 6, 12, 24] }) {
  return (
    <div className="segmented sm">
      {options.map((o) => <button key={o} className={`seg-btn ${value === o ? "active" : ""}`} onClick={() => onChange(o)}>{o}M</button>)}
    </div>
  );
}

function ChartTip({ x, children }) {
  return <div className="chart-tip" style={{ left: `${Math.max(16, Math.min(84, x))}%` }}>{children}</div>;
}

function SvgBarChart({ data, height = 200, color = TEAL, negativeColor = BRICK, signed = false, valueKey = "value", labelKey = "label", onOpen }) {
  const [active, setActive] = useState(null);
  const tapped = useRef(null);
  const W = 600, padTop = 14, padBottom = 26, padX = 12;
  const plotH = height - padTop - padBottom;
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const n = data.length;
  if (n === 0) return <div className="empty-state">Sem dados para exibir.</div>;
  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
  const slot = (W - padX * 2) / n, barW = Math.min(28, slot * 0.62);
  const zeroY = signed ? padTop + plotH / 2 : padTop + plotH;
  const scale = signed ? (plotH / 2) / maxAbs : plotH / maxAbs;
  const click = (i) => { if (tapped.current === i && onOpen) { onOpen(data[i]); tapped.current = null; } else { tapped.current = i; setActive(i); } };
  return (
    <div className="chart-box" onMouseLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: "block" }}>
        {signed && <line x1={padX} x2={W - padX} y1={zeroY} y2={zeroY} stroke="rgba(31,45,58,0.15)" strokeDasharray="3 3" />}
        {data.map((d, i) => {
          const v = values[i];
          const x = padX + slot * i + (slot - barW) / 2;
          const h = Math.max(Math.abs(v) * scale, 1.5);
          const y = v >= 0 ? zeroY - h : zeroY;
          return (
            <g key={i}>
              <rect className="bar-anim" x={x} y={y} width={barW} height={h} rx="3" fill={v >= 0 ? color : negativeColor} opacity={active !== null && active !== i ? 0.4 : 1} style={{ transformOrigin: v >= 0 ? "50% 100%" : "50% 0%" }} />
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="10" fill={active === i ? "#1F2D3A" : "#8FA3A0"} fontWeight={active === i ? 700 : 400} fontFamily="Inter, sans-serif">{d[labelKey]}</text>
              <rect x={padX + slot * i} y="0" width={slot} height={height} fill="transparent" style={{ cursor: "pointer" }} onMouseEnter={() => setActive(i)} onClick={() => click(i)} />
            </g>
          );
        })}
      </svg>
      {active !== null && (
        <ChartTip x={((padX + slot * active + slot / 2) / W) * 100}>
          <b>{data[active].full || data[active][labelKey]}</b><span className="mono">{fmtBRL(values[active])}</span>
          {onOpen && <em>toque de novo para abrir o mês</em>}
        </ChartTip>
      )}
    </div>
  );
}

function SvgAreaChart({ data, height = 200, color = TEAL, valueKey = "value", labelKey = "label", bare = false, onOpen }) {
  const [active, setActive] = useState(null);
  const gradId = useMemo(() => "grad-" + Math.random().toString(36).slice(2, 9), []);
  const tapped = useRef(null);
  const W = 600, padTop = bare ? 6 : 16, padBottom = bare ? 4 : 26, padX = bare ? 0 : 12;
  const plotH = height - padTop - padBottom;
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const n = data.length;
  if (n === 0) return <div className="empty-state">Sem dados para exibir.</div>;
  const maxV = Math.max(1, ...values), minV = Math.min(0, ...values), range = Math.max(1, maxV - minV);
  const stepX = n > 1 ? (W - padX * 2) / (n - 1) : 0;
  const points = values.map((v, i) => [padX + stepX * i, padTop + plotH - ((v - minV) / range) * plotH]);
  const linePath = points.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const areaPath = `${linePath} L${points[n - 1][0].toFixed(1)},${(padTop + plotH).toFixed(1)} L${points[0][0].toFixed(1)},${(padTop + plotH).toFixed(1)} Z`;
  const hitW = n > 1 ? stepX : W;
  const click = (i) => { if (tapped.current === i && onOpen) { onOpen(data[i]); tapped.current = null; } else { tapped.current = i; setActive(i); } };
  return (
    <div className="chart-box" onMouseLeave={() => !bare && setActive(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={bare ? height : undefined} preserveAspectRatio={bare ? "none" : "xMidYMid meet"} style={{ display: "block" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.4" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} stroke="none" className="area-anim" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" />
        {!bare && active !== null && <line x1={points[active][0]} x2={points[active][0]} y1={padTop} y2={padTop + plotH} stroke={color} strokeOpacity="0.35" strokeDasharray="3 3" />}
        {!bare && points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={active === i ? 5 : 2.5} fill={active === i ? "#fff" : color} stroke={color} strokeWidth={active === i ? 2.5 : 0} />)}
        {!bare && data.map((d, i) => <text key={i} x={points[i][0]} y={height - 8} textAnchor="middle" fontSize="10" fill={active === i ? "#1F2D3A" : "#8FA3A0"} fontWeight={active === i ? 700 : 400} fontFamily="Inter, sans-serif">{d[labelKey]}</text>)}
        {!bare && points.map((p, i) => <rect key={"h" + i} x={p[0] - hitW / 2} y="0" width={hitW} height={height} fill="transparent" style={{ cursor: "pointer" }} onMouseEnter={() => setActive(i)} onClick={() => click(i)} />)}
      </svg>
      {!bare && active !== null && (
        <ChartTip x={(points[active][0] / W) * 100}>
          <b>{data[active].full || data[active][labelKey]}</b><span className="mono">{fmtBRL(values[active])}</span>
          {onOpen && <em>toque de novo para abrir o mês</em>}
        </ChartTip>
      )}
    </div>
  );
}

function SvgDualBarChart({ data, height = 200, onOpen }) {
  const [active, setActive] = useState(null);
  const [hidden, setHidden] = useState({});
  const tapped = useRef(null);
  const W = 600, padTop = 12, padBottom = 24, padX = 6;
  const plotH = height - padTop - padBottom;
  const n = data.length;
  if (n === 0) return <div className="empty-state">Sem dados para exibir.</div>;
  const vis = (k) => !hidden[k];
  const all = [0];
  data.forEach((d) => { if (vis("a")) all.push(Number(d.value) || 0); if (vis("b")) all.push(Number(d.expenses) || 0); if (vis("c")) all.push(Number(d.leftover) || 0); });
  const max = Math.max(1, ...all), min = Math.min(0, ...all), range = Math.max(1, max - min);
  const yOf = (v) => padTop + plotH * (1 - (v - min) / range);
  const y0 = yOf(0);
  const slot = (W - padX * 2) / n, barW = Math.min(18, slot / 2 - 2);
  const cx = (i) => padX + slot * i + slot / 2;
  const bar = (v, x, color, i, key) => {
    const y = yOf(v), top = Math.min(y, y0), h = Math.max(Math.abs(y - y0), 1.5);
    return <rect className="bar-anim" x={x} y={top} width={barW} height={h} rx="3" fill={color} opacity={active !== null && active !== i ? 0.4 : 1} style={{ transformOrigin: v >= 0 ? "50% 100%" : "50% 0%" }} />;
  };
  const line = data.map((d, i) => (i === 0 ? "M" : "L") + cx(i).toFixed(1) + "," + yOf(Number(d.leftover) || 0).toFixed(1)).join(" ");
  const click = (i) => { if (tapped.current === i && onOpen) { onOpen(data[i]); tapped.current = null; } else { tapped.current = i; setActive(i); } };
  const series = [["a", "Receita líquida", TEAL], ["b", "Despesas", BRICK], ["c", "Sobra", "#3B82C4"]];
  return (
    <div>
      <div className="chart-box" onMouseLeave={() => setActive(null)}>
        <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: "block" }}>
          <line x1={padX} x2={W - padX} y1={y0} y2={y0} stroke="rgba(31,45,58,0.15)" />
          {data.map((d, i) => (
            <g key={i}>
              {vis("a") && bar(Number(d.value) || 0, cx(i) - barW - 1, TEAL, i)}
              {vis("b") && bar(Number(d.expenses) || 0, cx(i) + 1, BRICK, i)}
              <text x={cx(i)} y={height - 7} textAnchor="middle" fontSize="10" fill={active === i ? "#1F2D3A" : "#8FA3A0"} fontWeight={active === i ? 700 : 400} fontFamily="Inter, sans-serif">{d.label}</text>
            </g>
          ))}
          {vis("c") && <path d={line} fill="none" stroke="#3B82C4" strokeWidth="2" strokeLinejoin="round" />}
          {vis("c") && data.map((d, i) => <circle key={i} cx={cx(i)} cy={yOf(Number(d.leftover) || 0)} r={active === i ? 4.5 : 2.5} fill="#3B82C4" />)}
          {data.map((d, i) => <rect key={"h" + i} x={padX + slot * i} y="0" width={slot} height={height} fill="transparent" style={{ cursor: "pointer" }} onMouseEnter={() => setActive(i)} onClick={() => click(i)} />)}
        </svg>
        {active !== null && (
          <ChartTip x={(cx(active) / W) * 100}>
            <b>{data[active].full || data[active].label}</b>
            <span><i style={{ background: TEAL }} />Receita <b className="mono">{fmtBRL(data[active].value)}</b></span>
            <span><i style={{ background: BRICK }} />Despesas <b className="mono">{fmtBRL(data[active].expenses)}</b></span>
            <span><i style={{ background: "#3B82C4" }} />Sobra <b className="mono">{fmtBRL(data[active].leftover)}</b></span>
            {onOpen && <em>toque de novo para abrir o mês</em>}
          </ChartTip>
        )}
      </div>
      <div className="legend inline toggles">
        {series.map(([k, label, color]) => (
          <button key={k} className={`legend-toggle ${hidden[k] ? "off" : ""}`} onClick={() => setHidden((h) => ({ ...h, [k]: !h[k] }))}><i style={{ background: color }} />{label}</button>
        ))}
      </div>
    </div>
  );
}

function InteractiveDonut({ data, size = 160, stroke = 22, centerLabel = "total" }) {
  const [act, setAct] = useState(null);
  const total = data.reduce((a, d) => a + Math.max(0, Number(d.value) || 0), 0);
  const r = (size - stroke - 8) / 2, c = size / 2, circ = 2 * Math.PI * r;
  let acc = 0;
  const cur = act !== null ? data[act] : null;
  return (
    <div className="donut-wrap">
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} onMouseLeave={() => setAct(null)}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
          {data.map((d, i) => {
            const v = Math.max(0, Number(d.value) || 0);
            const dash = total > 0 ? (v / total) * circ : 0;
            const rot = total > 0 ? (acc / total) * 360 - 90 : -90;
            acc += v;
            return (
              <circle key={d.nome} className="donut-seg" cx={c} cy={c} r={r} fill="none" stroke={d.cor || colorForIndex(i)} strokeWidth={act === i ? stroke + 6 : stroke}
                strokeDasharray={`${dash} ${circ - dash}`} transform={`rotate(${rot} ${c} ${c})`} opacity={act !== null && act !== i ? 0.3 : 1}
                style={{ cursor: "pointer" }} onMouseEnter={() => setAct(i)} onClick={() => setAct(act === i ? null : i)} />
            );
          })}
        </svg>
        <div className="donut-center">
          {cur ? (<><span>{cur.nome}</span><b className="mono">{fmtBRL(cur.value)}</b><span>{total > 0 ? ((cur.value / total) * 100).toFixed(1).replace(".", ",") : 0}%</span></>)
               : (<><span>{centerLabel}</span><b className="mono">{fmtBRL(total)}</b></>)}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 190 }}>
        {data.map((d, i) => (
          <button key={d.nome} className={`rank-row clickable ${act === i ? "on" : ""}`} onClick={() => setAct(act === i ? null : i)} onMouseEnter={() => setAct(i)}>
            <span className="rank-top"><span className="legend-dot" style={{ background: d.cor || colorForIndex(i) }} /><span className="rank-name">{d.nome}</span><span className="mono rank-val">{total > 0 ? ((Math.max(0, d.value) / total) * 100).toFixed(1).replace(".", ",") : "0"}%</span></span>
            <span className="progress-track" style={{ height: 5, display: "block" }}><span className="progress-fill" style={{ display: "block", width: `${total > 0 ? (Math.max(0, d.value) / total) * 100 : 0}%`, background: d.cor || colorForIndex(i) }} /></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SvgDonutChart({ data, size = 190, strokeWidth = 26, valueKey = "value", colorKey = "cor" }) {
  const total = data.reduce((a, d) => a + Number(d[valueKey] || 0), 0) || 1;
  const r = (size - strokeWidth) / 2, c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offsetAcc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={strokeWidth} />
      {data.map((d, i) => {
        const v = Number(d[valueKey] || 0);
        const dash = (v / total) * circumference;
        const rotation = (offsetAcc / total) * 360 - 90;
        offsetAcc += v;
        return (
          <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={d[colorKey] || colorForIndex(i)}
            strokeWidth={strokeWidth} strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(${rotation} ${c} ${c})`}>
            <title>{d.nome || d.name}: {fmtBRL(v)}</title>
          </circle>
        );
      })}
    </svg>
  );
}

function HorizontalBarList({ data, color = BRICK }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <div className="empty-state">Sem dados para exibir.</div>;
  return (
    <div>
      {data.map((d, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
            <span>{d.name}</span><span className="mono">{fmtBRL(d.value)}</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${(d.value / max) * 100}%`, background: color }} /></div>
        </div>
      ))}
    </div>
  );
}


function Ring({ pct, size = 64, stroke = 7, color = TEAL, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(c * p) / 100} ${c}`} />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

function StackBar({ segments, height = 14, showLegend = true }) {
  const segs = segments.filter((x) => x.value > 0);
  const total = segs.reduce((a, x) => a + x.value, 0);
  return (
    <div>
      <div className="stackbar" style={{ height }}>
        {total === 0 ? <div style={{ flex: 1, background: "var(--surface-3)" }} /> : segs.map((x) => <div key={x.label} title={x.label} style={{ width: `${(x.value / total) * 100}%`, background: x.color }} />)}
      </div>
      {showLegend && (
        <div className="legend">
          {segments.map((x) => (
            <div key={x.label} className="legend-row">
              <span className="legend-dot" style={{ background: x.color }} />
              <span className="legend-name">{x.label}</span>
              <span className="legend-val mono">{fmtBRL(x.value)}</span>
              <span className="legend-pct mono">{total > 0 ? Math.round((Math.max(0, x.value) / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Delta({ now, prev, invert = false }) {
  if (!prev) return null;
  const pct = ((now - prev) / Math.abs(prev)) * 100;
  if (!isFinite(pct)) return null;
  const good = invert ? pct <= 0 : pct >= 0;
  return <span className={`delta ${good ? "good" : "bad"}`}>{pct >= 0 ? "+" : "−"}{Math.abs(pct).toFixed(0)}% vs mês anterior</span>;
}

function PerfBars({ items }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.pct)));
  return (
    <div>
      {items.map((i) => (
        <div key={i.label} className="perf-row">
          <span className="perf-name">{i.label}</span>
          <div className="perf-track">
            <span className="perf-mid" />
            <div className={`perf-bar ${i.pct >= 0 ? "" : "neg"}`} style={{ width: `${(Math.abs(i.pct) / max) * 50}%`, background: i.pct >= 0 ? TEAL : BRICK, [i.pct >= 0 ? "left" : "right"]: "50%" }} />
          </div>
          <span className="perf-val mono" style={{ color: i.pct >= 0 ? "var(--teal)" : "var(--brick)" }}>{i.pct >= 0 ? "+" : "−"}{Math.abs(i.pct).toFixed(1).replace(".", ",")}%</span>
        </div>
      ))}
    </div>
  );
}

const EXP_ICON_PATHS = {
  moradia: <><path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
  energia: <polygon points="13 2 4 14 12 14 11 22 20 10 12 10 13 2"/>,
  agua: <path d="M12 3C12 3 5.5 10.5 5.5 15a6.5 6.5 0 0 0 13 0C18.5 10.5 12 3 12 3z"/>,
  internet: <><path d="M2 9a15 15 0 0 1 20 0"/><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
  telefone: <><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>,
  mercado: <><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.5L21 7H6"/></>,
  saude: <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-7.6a5.5 5.5 0 0 0 0-7.8z"/>,
  educacao: <><path d="M22 9 12 4 2 9l10 5 10-5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/></>,
  transporte: <><path d="M3 13l2-6h14l2 6v4H3z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></>,
  cartao: <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>,
  lazer: <><rect x="3" y="4" width="18" height="16" rx="2"/><polygon points="10 9 15 12 10 15 10 9"/></>,
  academia: <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>,
  seguro: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>,
  impostos: <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  pets: <><circle cx="6" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M8 17c0-2.5 2-5 4-5s4 2.5 4 5c0 2-2 3-4 3s-4-1-4-3z"/></>,
  outros: <><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></>,
};
const ExpIcon = ({ id, size = 22, color }) => <Ico size={size} color={color}>{EXP_ICON_PATHS[id] || EXP_ICON_PATHS.outros}</Ico>;
const initialsOf = (d) => { const w = String(d || "").replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/); return ((w.length > 1 ? w[0][0] + w[1][0] : String(d || "").slice(0, 2)) || "?").toUpperCase(); };


const PAGE_TITLES = {
  inicio: ["Início", "Resumo do seu mês"],
  organizacao: ["Organização", "Quanto entrou, quanto falta pagar e quanto sobra"],
  faturamento: ["Faturamento", "Receitas por vínculo, impostos e recebimentos"],
  calendario: ["Calendário de plantões", "Lance plantões e horas trabalhadas"],
  despesas: ["Despesas", "Contas fixas e gastos do mês"],
  investimentos: ["Investimentos", "Carteira, distribuição e rentabilidade"],
  metas: ["Metas", "Teto de gastos e seus objetivos"],
  visao: ["Relatórios", "Comparativos e ganho por hora"],
  contabilidade: ["Contabilidade", "Impostos, notas e imposto de renda"],
  backup: ["Configurações", "Conta, nuvem, tributação e backup"],
  importar: ["Importar", "Extrato, fatura do cartão e planilhas da B3"],
};
const IconRefresh = (p) => <Ico {...p}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></Ico>;
const prefersReducedMotion = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
const fmtQty = (q) => Number(q || 0).toLocaleString("pt-BR", { maximumFractionDigits: Math.abs(Number(q)) < 1 ? 8 : 4 });
// Ativos que a brapi.dev responde sem token (lista da documentação do serviço)
const BRAPI_FREE = ["PETR4", "MGLU3", "VALE3", "ITUB4", "MXRF11", "HGLG11"];

// Número que conta até o valor final ao aparecer ou mudar
function CountUp({ value, format = fmtBRL, duration = 650 }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? target : 0));
  const cur = useRef(prefersReducedMotion() ? target : 0);
  useEffect(() => {
    const from = cur.current, to = target;
    const finish = () => { cur.current = to; setShown(to); };
    if (from === to) return;
    if (prefersReducedMotion() || document.hidden || typeof requestAnimationFrame !== "function") { finish(); return; }
    let raf = 0, start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      const k = Math.min(1, (ts - start) / duration), e = 1 - Math.pow(1 - k, 3);
      if (k >= 1) { finish(); return; }
      cur.current = from + (to - from) * e; setShown(cur.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const guard = setTimeout(finish, duration + 500); // garante o valor final se a animação for pausada
    return () => { cancelAnimationFrame(raf); clearTimeout(guard); };
  }, [target]);
  return format(shown);
}

// Barra de páginas no topo, com rolagem lateral e indicador que desliza até a página ativa
const NAV_LABELS = { organizacao: "Organização", inicio: "Início", faturamento: "Faturamento", calendario: "Calendário", despesas: "Despesas", investimentos: "Investimentos", metas: "Metas", visao: "Relatórios", contabilidade: "Contabilidade", importar: "Importar", backup: "Configurações" };
function NavStrip({ items, active, onPick }) {
  const wrap = useRef(null);
  const [ind, setInd] = useState(null);
  const place = useCallback((smooth) => {
    const w = wrap.current, el = w && w.querySelector('[data-tab="' + active + '"]');
    if (!el) { setInd(null); return; }
    setInd((p) => (p && p.left === el.offsetLeft && p.width === el.offsetWidth ? p : { left: el.offsetLeft, width: el.offsetWidth }));
    const left = Math.max(0, el.offsetLeft - (w.clientWidth - el.offsetWidth) / 2);
    try { w.scrollTo({ left, behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto" }); } catch (e) { w.scrollLeft = left; }
  }, [active]);
  const mounted = useRef(false);
  useLayoutEffect(() => { place(mounted.current); mounted.current = true; }, [place]);
  useEffect(() => {
    const again = () => place(false);
    window.addEventListener("resize", again);
    const t = setTimeout(again, 400); // refaz a medida depois que a fonte carrega
    return () => { window.removeEventListener("resize", again); clearTimeout(t); };
  }, [place]);
  return (
    <nav className="navstrip" aria-label="Páginas">
      <div className="ns-scroll" ref={wrap}>
        {ind && <span className="ns-ind" style={{ transform: `translateX(${ind.left}px)`, width: ind.width }} />}
        {items.map((t) => { const Ic = t.icon; return (
          <button key={t.id} data-tab={t.id} className={`ns-tab ${active === t.id ? "active" : ""}`} aria-current={active === t.id ? "page" : undefined} onClick={() => onPick(t.id)}>
            <Ic size={17} /><span>{NAV_LABELS[t.id] || t.long}</span>
          </button>
        ); })}
      </div>
    </nav>
  );
}

// ================= computador: menu lateral, painéis e gavetas =================
const DESK_MQ = "(min-width: 1100px)";
function useDesk() {
  const get = () => { try { return window.matchMedia(DESK_MQ).matches; } catch (e) { return false; } };
  const [d, setD] = useState(get);
  useEffect(() => {
    let mq; try { mq = window.matchMedia(DESK_MQ); } catch (e) { return; }
    const f = () => setD(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", f); else mq.addListener(f);
    return () => { if (mq.removeEventListener) mq.removeEventListener("change", f); else mq.removeListener(f); };
  }, []);
  return d;
}
const DGV_KEY = "mediplan-dgv";
function DGv({ id, icon, tone = "#16A34A", title, sub, val, wide, open: inicial = false, children }) {
  const [open, setOpen] = useState(() => { try { const m = JSON.parse(localStorage.getItem(DGV_KEY) || "{}"); return id in m ? !!m[id] : inicial; } catch (e) { return inicial; } });
  const toggle = () => setOpen((o) => { const n = !o; try { const m = JSON.parse(localStorage.getItem(DGV_KEY) || "{}"); m[id] = n; localStorage.setItem(DGV_KEY, JSON.stringify(m)); } catch (e) {} return n; });
  return (
    <section className={`dgv ${open ? "open" : ""} ${wide ? "wide" : ""}`} data-dgv={id}>
      <button type="button" className="dgv-h" aria-expanded={open} onClick={toggle}>
        <span className="dgv-ic" style={{ background: tone + "1f", color: tone }}>{icon}</span>
        <span className="dgv-t"><b>{title}</b>{sub ? <small>{sub}</small> : null}</span>
        {val !== undefined && val !== null && val !== "" ? <span className="dgv-v mono">{val}</span> : <span />}
        <span className="dgv-ch" aria-hidden="true"><IconChevronRight size={18} /></span>
      </button>
      {open && <div className="dgv-b">{children}</div>}
    </section>
  );
}
function DGrid({ children }) { return <><div className="dsec">Detalhes · clique para abrir</div><div className="dgvs">{children}</div></>; }
function DSpark({ values = [], color = "#16A34A" }) {
  const v = values.map((x) => Number(x) || 0); if (v.length < 2) return null;
  const mx = Math.max(...v), mn = Math.min(...v), W = 150, H = 26;
  const pts = v.map((x, i) => `${(i * W / (v.length - 1)).toFixed(1)},${(H - 3 - ((x - mn) / (mx - mn || 1)) * (H - 6)).toFixed(1)}`).join(" ");
  return <svg className="dspark" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}
function DKpi({ label, value, sub, tone, subTone, spark, sparkColor }) {
  return (
    <div className="dkpi">
      <small>{label}</small>
      <b className="mono" style={tone ? { color: tone } : null}>{value}</b>
      {sub ? <em style={subTone ? { color: subTone } : null}>{sub}</em> : null}
      {spark ? <DSpark values={spark} color={sparkColor} /> : null}
    </div>
  );
}
const deltaTxt = (now, prev, nome) => { if (!prev) return null; const p = ((now - prev) / Math.abs(prev)) * 100; if (!isFinite(p)) return null; return `${p >= 0 ? "▲" : "▼"} ${Math.abs(p).toFixed(1).replace(".", ",")}% vs ${nome}`; };
// fluxo do mês dia a dia: linha cheia até hoje, tracejada depois
function DFluxo({ fluxoDia = {}, viewYear, viewMonth }) {
  const dias = new Date(viewYear, viewMonth + 1, 0).getDate();
  const hoje = new Date(); const ehMes = hoje.getFullYear() === viewYear && hoje.getMonth() === viewMonth;
  const corte = ehMes ? hoje.getDate() : (new Date(viewYear, viewMonth, 1) < hoje ? dias : 0);
  let acc = 0; const pts = [];
  for (let d = 1; d <= dias; d++) { const f = fluxoDia[d]; if (f) acc += f.entra - f.sai; pts.push(acc); }
  const mx = Math.max(0, ...pts), mn = Math.min(0, ...pts), W = 760, H = 190, padB = 22, padT = 26;
  const X = (i) => (i / (dias - 1)) * W, Y = (v) => padT + (1 - (v - mn) / (mx - mn || 1)) * (H - padT - padB);
  const seg = (a, b) => pts.slice(a, b).map((v, i) => `${X(a + i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const real = corte > 0 ? seg(0, corte) : "", prev = corte < dias ? seg(Math.max(0, corte - 1), dias) : "";
  const fim = pts[dias - 1] || 0, hojeV = corte > 0 ? pts[corte - 1] : 0;
  return (
    <div>
      <svg width="100%" height="190" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Quanto entrou menos o que saiu, somado dia a dia">
        <line x1="0" x2={W} y1={Y(0)} y2={Y(0)} stroke="var(--border)" />
        {real && <polygon points={`0,${Y(0)} ${real} ${X(corte - 1)},${Y(0)}`} fill="#16A34A" opacity=".1" />}
        {real && <polyline points={real} fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        {prev && <polyline points={prev} fill="none" stroke="#16A34A" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />}
        {[1, 5, 10, 15, 20, 25, dias].map((d) => <text key={d} x={X(d - 1)} y={H - 4} fontSize="11" fill="#94A3B8" textAnchor={d === 1 ? "start" : d === dias ? "end" : "middle"}>{d}</text>)}
      </svg>
      <div className="dflx-leg"><span>{corte > 0 && corte < dias ? <>Até hoje: <b className="mono">{fmtBRL(hojeV)}</b></> : null}</span><span>Fim do mês: <b className="mono" style={{ color: fim >= 0 ? "#15803D" : "#B91C1C" }}>{fmtBRL(fim)}</b></span></div>
    </div>
  );
}
function DProximos({ incomeItems = [], expenseItems = [], max = 6, onVer }) {
  const hoje = todayStr();
  const l = [...incomeItems.filter((i) => !i.recebido).map((i) => ({ k: i.key, nome: i.nome, d: i.dateIso, v: Number(i.net) || 0, in: true })),
    ...expenseItems.filter((e) => !e.paid).map((e) => ({ k: e.key, nome: e.description, d: e.dateIso, v: Number(e.amount) || 0, in: false }))].sort((a, b) => String(a.d).localeCompare(String(b.d)));
  if (!l.length) return <div className="empty-state" style={{ padding: "12px 0" }}>Nada pendente neste mês.</div>;
  return (
    <div className="dprox">
      {l.slice(0, max).map((x) => { const atras = x.d < hoje; return (
        <div key={x.k}><span><b>{x.nome}</b><small>{atras ? (x.in ? "atrasado desde " : "venceu em ") + fmtDatePt(x.d) : x.d === hoje ? "hoje" : fmtDatePt(x.d)}</small></span>
          <b className="mono" style={{ color: x.in ? (atras ? "#B45309" : "#15803D") : "#B91C1C" }}>{x.in ? "+" : "−"} {fmtBRL(x.v)}</b></div>
      ); })}
      {l.length > max && onVer && <button type="button" className="link-btn" style={{ marginTop: 8 }} onClick={onVer}>Ver os outros {l.length - max}</button>}
    </div>
  );
}
function DSide({ active, onPick, onNovo, ocultar = [] }) {
  const grupo = (ids) => ids.filter((id) => !ocultar.includes(id)).map((id) => { const t = NAV_ALL.find((x) => x.id === id); if (!t) return null; const Ic = id === "backup" ? IconGear : t.icon; return (
    <button key={id} type="button" data-tab={id} className={`dsb-i ${active === id ? "on" : ""}`} aria-current={active === id ? "page" : undefined} onClick={() => onPick(id)}><Ic size={18} /><span>{NAV_LABELS[id]}</span></button>
  ); });
  return (
    <aside className="dsb" aria-label="Páginas">
      <div className="dsb-brand"><span className="tb-logo"><IconLogo size={22} /></span>Mediplan</div>
      <button type="button" className="dsb-new" onClick={onNovo}><IconPlus size={16} color="#fff" /> Novo lançamento</button>
      <nav>{grupo(["inicio", "faturamento", "calendario", "despesas", "investimentos", "organizacao", "metas", "visao", "contabilidade"])}
        <div className="dsb-g">Ferramentas</div>{grupo(["importar", "backup"])}</nav>
    </aside>
  );
}

// barra de ações suspensa (celular): 5 seções + "Mais", que abre as outras numa folha
const DOCK_IDS = ["inicio", "faturamento", "calendario", "despesas", "investimentos"];
const DOCK_MAIS = ["organizacao", "metas", "visao", "contabilidade", "importar", "backup"];
const DOCK_NOMES = { organizacao: "Organização", metas: "Metas", visao: "Relatórios", contabilidade: "Contabilidade", importar: "Importar", backup: "Ajustes" };
function Dock({ active, onPick, ocultar = [] }) {
  const [mais, setMais] = useState(false);
  useEffect(() => {
    if (!mais) return;
    const k = (e) => { if (e.key === "Escape") setMais(false); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [mais]);
  const ir = (id) => { setMais(false); onPick(id); };
  const emMais = DOCK_MAIS.includes(active);
  return (
    <>
      {mais && (
        <div className="dk-scrim" onClick={() => setMais(false)}>
          <div className="dk-sheet" role="dialog" aria-label="Todas as seções" onClick={(e) => e.stopPropagation()}>
            <h4>Todas as seções</h4>
            <div className="dk-grid">
              {DOCK_MAIS.filter((id) => !ocultar.includes(id)).map((id) => { const t = NAV_ALL.find((x) => x.id === id); const Ic = id === "backup" ? IconGear : t.icon; return (
                <button key={id} type="button" data-tab={id} className={`dk-item ${active === id ? "on" : ""}`} aria-current={active === id ? "page" : undefined} onClick={() => ir(id)}>
                  <span><Ic size={22} /></span>{DOCK_NOMES[id]}
                </button>
              ); })}
            </div>
          </div>
        </div>
      )}
      <nav className="dock" aria-label="Páginas">
        {DOCK_IDS.map((id) => { const t = NAV_ALL.find((x) => x.id === id); const Ic = t.icon; return (
          <button key={id} type="button" data-tab={id} className={`dk-btn ${active === id ? "on" : ""}`} aria-label={NAV_LABELS[id]} title={NAV_LABELS[id]} aria-current={active === id ? "page" : undefined} onClick={() => ir(id)}><Ic size={22} /></button>
        ); })}
        <button type="button" className={`dk-btn ${mais || emMais ? "on" : ""}`} aria-label="Mais seções" aria-expanded={mais} onClick={() => setMais((v) => !v)}><IconMore size={22} /></button>
      </nav>
    </>
  );
}

function Kpi({ label, value, sub, tone, num, fmt }) {
  return (
    <div className="kpi-box">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value mono" style={tone ? { color: tone } : null}>{num !== undefined ? <CountUp value={num} format={fmt} /> : value}</div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  );
}

const IconArrowIn = (p) => <Ico {...p}><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/></Ico>;
const IconArrowOut = (p) => <Ico {...p}><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></Ico>;
const WEEK_PT = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const dayGroupLabel = (iso, todayIso) => {
  const d = new Date(iso + "T12:00:00"), t = new Date(todayIso + "T12:00:00");
  const diff = Math.round((d - t) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  return `${WEEK_PT[d.getDay()].replace(/^./, (c) => c.toUpperCase())}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()].toLowerCase()}`;
};
const dueInfo = (iso, todayIso, paid) => {
  if (paid) return { cls: "paid", text: "Pago" };
  const diff = Math.round((new Date(iso + "T12:00:00") - new Date(todayIso + "T12:00:00")) / 86400000);
  if (diff < 0) return { cls: "late", text: diff === -1 ? "Venceu ontem" : `Venceu há ${-diff} dias` };
  if (diff === 0) return { cls: "warn", text: "Vence hoje" };
  if (diff <= 5) return { cls: "warn", text: diff === 1 ? "Vence amanhã" : `Vence em ${diff} dias` };
  return { cls: "open", text: "Vence " + iso.slice(8, 10) + "/" + iso.slice(5, 7) };
};
const limitStatus = (spent, limit) => {
  if (!limit) return { cls: "none", text: "Sem limite", color: SLATE };
  const pct = (spent / limit) * 100;
  if (pct >= 100) return { cls: "over", text: "Acima do limite", color: BRICK };
  if (pct >= 80) return { cls: "warn", text: "Atenção", color: GOLD };
  return { cls: "ok", text: "Dentro do limite", color: TEAL };
};

function LimitRow({ catId, label, spent, limit, color, icon, editing, onEdit, onSave, onCancel }) {
  const [val, setVal] = useState(limit ? Number(limit) : "");
  const st = limitStatus(spent, limit);
  const pct = limit ? Math.min(100, (spent / limit) * 100) : 0;
  return (
    <div className="lim-row">
      <div className="lim-top">
        {icon ? <span className="lim-ico" style={{ background: color + "1a" }}>{icon}</span> : null}
        <div className="lim-name">{label}<span className="lim-spent mono">{fmtBRL(spent)}{limit ? <> de {fmtBRL(limit)}</> : null}</span></div>
        <span className={`lim-chip ${st.cls}`}>{st.text}</span>
      </div>
      {limit > 0 && <div className="lim-bar"><div style={{ width: pct + "%", background: st.color }} /></div>}
      {editing ? (
        <div className="lim-edit">
          <MoneyInput autoFocus value={val} onChange={setVal} placeholder="Teto mensal (R$)" />
          <button className="btn btn-primary sm" onClick={() => onSave(val)}>Salvar</button>
          {limit > 0 && <button className="btn btn-ghost sm" onClick={() => onSave("")}>Remover</button>}
          <button className="btn btn-ghost sm" onClick={onCancel}>Cancelar</button>
        </div>
      ) : (
        <div className="lim-foot">
          <span>{limit ? (spent <= limit ? `Restam ${fmtBRL(limit - spent)}` : `Passou ${fmtBRL(spent - limit)}`) : "Defina um limite para receber alertas em 80% e 100%"}</span>
          {onEdit && <button className="link-btn" onClick={onEdit}>{limit ? "editar" : "definir limite"}</button>}
        </div>
      )}
    </div>
  );
}


const IconTrendDown = (p) => <Ico {...p}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></Ico>;
const IconAlert = (p) => <Ico {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Ico>;
const IconBulb = (p) => <Ico {...p}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></Ico>;

function InsightList({ items, max }) {
  const shown = max ? items.slice(0, max) : items;
  if (shown.length === 0) return <div className="empty-state" style={{ padding: "10px 0" }}>Preencha alguns meses de receitas e despesas para eu comparar e trazer observações aqui.</div>;
  return (
    <div className="ins-list">
      {shown.map((it) => {
        const Ic = it.tone === "good" ? IconTrending : it.tone === "bad" ? IconTrendDown : it.tone === "warn" ? IconAlert : IconBulb;
        return (
          <div key={it.id} className={`ins ins-${it.tone}`}>
            <span className="ins-ico"><Ic size={17} /></span>
            <div className="ins-body"><b>{it.title}</b><p>{it.text}</p></div>
          </div>
        );
      })}
    </div>
  );
}


function MonthPicker({ year, setYear, viewYear, viewMonth, statsOf, onPick, onClose }) {
  const now = new Date();
  const months = useMemo(() => MONTHS_PT.map((_, m) => ({ m, ...statsOf(year, m) })), [year, statsOf]);
  const maxV = Math.max(1, ...months.map((x) => Math.max(x.net, x.expTotal)));
  const tot = months.reduce((a, x) => ({ net: a.net + x.net, exp: a.exp + x.expTotal }), { net: 0, exp: 0 });
  const saldo = tot.net - tot.exp;
  const short = (v) => (Math.abs(v) >= 1000 ? (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil" : Math.round(v).toLocaleString("pt-BR"));
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet mp-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="mp-head">
          <button className="mp-arrow" onClick={() => setYear(year - 1)} aria-label="Ano anterior"><IconChevronLeft size={18} /></button>
          <b>{year}</b>
          <button className="mp-arrow" onClick={() => setYear(year + 1)} aria-label="Próximo ano"><IconChevronRight size={18} /></button>
          <button className="btn-icon mp-close" onClick={onClose} aria-label="Fechar"><IconX size={18} /></button>
        </div>
        <div className="mp-totals">
          <div><span>Receitas no ano</span><b className="mono" style={{ color: "var(--teal)" }}>{fmtBRL(tot.net)}</b></div>
          <div><span>Despesas no ano</span><b className="mono" style={{ color: "var(--brick)" }}>{fmtBRL(tot.exp)}</b></div>
          <div><span>Saldo do ano</span><b className="mono" style={{ color: saldo >= 0 ? "var(--text)" : "var(--brick)" }}>{fmtBRL(saldo)}</b></div>
        </div>
        <div className="mp-grid">
          {months.map((x) => {
            const sel = year === viewYear && x.m === viewMonth;
            const isNow = year === now.getFullYear() && x.m === now.getMonth();
            const bal = x.net - x.expTotal;
            const empty = x.net === 0 && x.expTotal === 0;
            return (
              <button key={x.m} className={`mp-cell ${sel ? "sel" : ""} ${empty ? "empty" : ""}`} onClick={() => onPick(year, x.m)}>
                <div className="mp-top"><b>{MONTHS_PT[x.m]}</b>{isNow ? <span className="mp-now">hoje</span> : (year > now.getFullYear() || (year === now.getFullYear() && x.m > now.getMonth())) && !empty ? <span className="mp-now fut">previsto</span> : null}</div>
                <div className="mp-bars">
                  <i style={{ width: `${(x.net / maxV) * 100}%`, background: TEAL }} />
                  <i style={{ width: `${(x.expTotal / maxV) * 100}%`, background: BRICK }} />
                </div>
                <div className="mp-row"><span>Receitas</span><b className="mono" style={{ color: "var(--teal)" }}>{short(x.net)}</b></div>
                <div className="mp-row"><span>Gastos</span><b className="mono" style={{ color: "var(--brick)" }}>{short(x.expTotal)}</b></div>
                <div className="mp-row hr"><span>{x.workHours > 0 ? fmtHoras(x.workHours) : "Horas"}</span><b className="mono">{x.workHours > 0 ? "R$ " + Math.round(x.workHourly).toLocaleString("pt-BR") + "/h" : "—"}</b></div>
                <div className="mp-row bal"><span>Saldo</span><b className="mono" style={{ color: bal >= 0 ? "var(--text)" : "var(--brick)" }}>{empty ? "—" : (bal >= 0 ? "+" : "−") + short(Math.abs(bal))}</b></div>
              </button>
            );
          })}
        </div>
        <div className="mp-foot">Valores líquidos, no mês em que entram e saem do caixa. A linha de horas mostra o ganho líquido por hora trabalhada. Toque num mês para abrir.</div>
      </div>
    </div>
  );
}

const IconCalc = (p) => <Ico {...p}><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="8.5" y1="7.5" x2="15.5" y2="7.5"/><line x1="8.5" y1="12" x2="8.6" y2="12"/><line x1="12" y1="12" x2="12.1" y2="12"/><line x1="15.4" y1="12" x2="15.5" y2="12"/><line x1="8.5" y1="16" x2="8.6" y2="16"/><line x1="12" y1="16" x2="12.1" y2="16"/><line x1="15.4" y1="16" x2="15.5" y2="16"/></Ico>;
const IconMore = (p) => <Ico {...p}><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></Ico>;
const IconGear = (p) => <Ico {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></Ico>;
const IconScale = (p) => <Ico {...p}><path d="M12 3v18"/><path d="M5 21h14"/><path d="M3 7h18"/><path d="M6 7 3 14a3.5 3.5 0 0 0 6 0Z"/><path d="M18 7l-3 7a3.5 3.5 0 0 0 6 0Z"/></Ico>;
const NAV_MAIN = [
  { id: "inicio", short: "Início", long: "Início", icon: IconHome },
  { id: "faturamento", short: "Receitas", long: "Faturamento", icon: IconReceipt },
  { id: "calendario", short: "Agenda", long: "Calendário", icon: IconCalendar },
  { id: "despesas", short: "Despesas", long: "Despesas", icon: IconWallet },
  { id: "investimentos", short: "Investir", long: "Investimentos", icon: IconTrending },
  { id: "organizacao", short: "Organizar", long: "Organização", icon: IconScale },
];
const NAV_MORE = [
  { id: "metas", short: "Metas", long: "Metas", icon: IconTarget },
  { id: "visao", short: "Relatórios", long: "Relatórios", icon: IconPie },
  { id: "contabilidade", short: "Contábil", long: "Contabilidade", icon: IconCalc },
  { id: "importar", short: "Importar", long: "Importar extrato", icon: IconUpload },
  { id: "backup", short: "Ajustes", long: "Configurações", icon: IconDownload },
];
const NAV_ALL = NAV_MAIN.concat(NAV_MORE);


// ================= Nuvem (Supabase) =================
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
// Projeto padrão: quem abre o link já encontra a tela de criar conta, sem precisar colar endereço e chave.
// A chave "publishable" é pública por natureza; quem protege os dados é a regra do banco (cada conta só lê e grava as próprias linhas).
const CLOUD_DEFAULT = { url: "https://hhqxkizvcgnohklztkef.supabase.co", key: "sb_publishable_-UA-2TWP5dNL3NLhMjdRhQ_LcT7DWRV" };
const CLOUD_CFG_KEY = "mediplan-cloud-config";
const CLOUD_SKIP_KEY = "mediplan-cloud-skip";
const OWNER_KEY = "mediplan-owner";
const SYNCED_KEY = "mediplan-synced";
const COLLECTIONS = ["vinculos", "shifts", "presencas", "extraRecurringIncomes", "expenses", "recurringExpenses", "investments", "goals", "oneOffIncomes"];
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
// gavetas: cartões que abrem e fecham tocando no título; a escolha fica guardada neste aparelho (começam fechados)
const GV_KEY = "mediplan-gavetas";
const gvLer = () => { try { return JSON.parse(localStorage.getItem(GV_KEY) || "{}") || {}; } catch (e) { return {}; } };
function useGv() {
  const [st, setSt] = useState(gvLer);
  const aberto = (id) => st[id] === true;
  const toggle = (id) => { const cur = { ...gvLer() }; cur[id] = !(cur[id] === true); try { localStorage.setItem(GV_KEY, JSON.stringify(cur)); } catch (e) {} setSt(cur); };
  return {
    c: (id) => "gv" + (aberto(id) ? "" : " gv-closed"),
    t: (id) => ({ role: "button", tabIndex: 0, "aria-expanded": aberto(id), onClick: () => toggle(id), onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(id); } } }),
  };
}
const getCloudCfg = () => {
  try { const c = JSON.parse(lsGet(CLOUD_CFG_KEY) || "null"); if (c && c.url && c.key) return c; } catch (e) {}
  return CLOUD_DEFAULT.url && CLOUD_DEFAULT.key ? CLOUD_DEFAULT : null;
};
const stableStr = (v) => JSON.stringify(v, (k, val) => (val && typeof val === "object" && !Array.isArray(val) ? Object.keys(val).sort().reduce((o, kk) => { o[kk] = val[kk]; return o; }, {}) : val));
let _sb = null, _sbKey = "";
async function getSupabase(cfg) {
  const key = cfg.url + "|" + cfg.key;
  if (_sb && _sbKey === key) return _sb;
  if (!window.supabase) {
    await new Promise((res, rej) => {
      const sc = document.createElement("script"); sc.src = SUPABASE_JS; sc.onload = res;
      sc.onerror = () => rej(new Error("Sem internet para conectar à nuvem."));
      document.head.appendChild(sc);
    });
  }
  _sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "mediplan-auth" } });
  _sbKey = key;
  return _sb;
}
async function fetchAllRecords(sb) {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("records").select("collection,id,data,deleted").order("collection").order("id").range(from, from + 999);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return all;
}
const authMsg = (e) => {
  const m = String((e && e.message) || e || "");
  if (/invalid login/i.test(m)) return "E-mail ou senha incorretos.";
  if (/not confirmed/i.test(m)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/already registered|already been registered/i.test(m)) return "Este e-mail já tem conta. Use “Entrar”.";
  if (/password should be|at least/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/rate limit|too many/i.test(m)) return "Muitas tentativas. Espere alguns minutos e tente de novo.";
  if (/failed to fetch|network|internet/i.test(m)) return "Sem conexão com a internet.";
  return m || "Algo deu errado. Tente de novo.";
};

const AUTH_CSS = `
  body { margin: 0; }
  .auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F6F7F9; padding: 20px; font-family: 'Inter', system-ui, sans-serif; color: #0F172A; }
  .auth-card { width: 100%; max-width: 400px; background: #fff; border: 1px solid #E7EBF0; border-radius: 20px; padding: 28px 24px; box-shadow: 0 10px 30px rgba(15,23,42,0.06); }
  .auth-logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 22px; letter-spacing: -0.03em; margin-bottom: 6px; }
  .auth-logo span { width: 36px; height: 36px; border-radius: 10px; background: #111827; display: inline-flex; align-items: center; justify-content: center; }
  .auth-sub { color: #64748B; font-size: 14px; margin: 0 0 20px; }
  .auth-tabs { display: flex; background: #F1F5F9; border-radius: 10px; padding: 3px; margin-bottom: 16px; }
  .auth-tabs button { flex: 1; border: none; background: none; padding: 9px; border-radius: 8px; font-weight: 600; font-size: 14px; color: #475569; cursor: pointer; font-family: inherit; }
  .auth-tabs button.on { background: #fff; color: #0F172A; box-shadow: 0 1px 2px rgba(15,23,42,0.12); }
  .auth-card label { display: block; font-size: 13px; color: #475569; font-weight: 500; margin: 12px 0 5px; }
  .auth-card input { width: 100%; box-sizing: border-box; border: 1px solid #E7EBF0; border-radius: 10px; padding: 11px 12px; font-size: 15px; font-family: inherit; }
  .auth-card input:focus { outline: none; border-color: #16A34A; }
  .auth-btn { width: 100%; margin-top: 18px; height: 46px; border: none; border-radius: 10px; background: #16A34A; color: #fff; font-weight: 700; font-size: 15px; cursor: pointer; font-family: inherit; }
  .auth-btn:disabled { opacity: .6; }
  .auth-link { background: none; border: none; color: #15803D; font-weight: 600; font-size: 13.5px; cursor: pointer; padding: 10px 0 0; font-family: inherit; }
  .auth-msg { margin-top: 14px; font-size: 13.5px; padding: 10px 12px; border-radius: 10px; background: #F0FDF4; color: #166534; }
  .auth-msg.err { background: #FEF2F2; color: #B91C1C; }
  .auth-foot { margin-top: 18px; padding-top: 14px; border-top: 1px solid #E7EBF0; font-size: 12.5px; color: #94A3B8; }
`;

function AuthScreen({ cfg, onSkip, recovery, onRecovered }) {
  const [mode, setMode] = useState(recovery ? "nova" : "entrar");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(await getSupabase(cfg)); } catch (e) { setMsg({ err: true, text: authMsg(e) }); } finally { setBusy(false); } };
  const back = window.location.origin + window.location.pathname;
  const submit = () => {
    if (mode === "nova") return run(async (sb) => { if (pw.length < 6) throw new Error("at least"); const { error } = await sb.auth.updateUser({ password: pw }); if (error) throw error; setMsg({ text: "Senha alterada." }); onRecovered && onRecovered(); });
    if (!email) return setMsg({ err: true, text: "Digite seu e-mail." });
    if (mode === "esqueci") return run(async (sb) => { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: back }); if (error) throw error; setMsg({ text: "Enviamos um link para criar uma nova senha. Abra o e-mail neste aparelho." }); });
    if (!pw) return setMsg({ err: true, text: "Digite sua senha." });
    if (mode === "criar") return run(async (sb) => {
      const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: back } });
      if (error) throw error;
      if (!data.session) setMsg({ text: "Conta criada. Enviamos um link de confirmação para o seu e-mail. Depois de confirmar, volte aqui e entre." });
    });
    return run(async (sb) => { const { error } = await sb.auth.signInWithPassword({ email, password: pw }); if (error) throw error; });
  };
  return (
    <div className="auth-wrap">
      <style>{AUTH_CSS}</style>
      <div className="auth-card">
        <div className="auth-logo"><span><IconLogo size={26} /></span>Mediplan</div>
        <p className="auth-sub">{mode === "nova" ? "Crie uma nova senha para sua conta." : mode === "esqueci" ? "Vamos enviar um link para você criar uma nova senha." : "Entre para ver seus dados em qualquer aparelho."}</p>
        {(mode === "entrar" || mode === "criar") && (
          <div className="auth-tabs">
            <button className={mode === "entrar" ? "on" : ""} onClick={() => { setMode("entrar"); setMsg(null); }}>Entrar</button>
            <button className={mode === "criar" ? "on" : ""} onClick={() => { setMode("criar"); setMsg(null); }}>Criar conta</button>
          </div>
        )}
        {mode !== "nova" && (<><label>E-mail</label><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value.trim())} placeholder="voce@email.com" /></>)}
        {mode !== "esqueci" && (<><label>{mode === "nova" ? "Nova senha" : "Senha"}</label><input type="password" autoComplete={mode === "entrar" ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder={mode === "entrar" ? "" : "mínimo 6 caracteres"} /></>)}
        <button className="auth-btn" disabled={busy} onClick={submit}>{busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar conta" : mode === "esqueci" ? "Enviar link" : "Salvar nova senha"}</button>
        {mode === "entrar" && <button className="auth-link" onClick={() => { setMode("esqueci"); setMsg(null); }}>Esqueci minha senha</button>}
        {mode === "esqueci" && <button className="auth-link" onClick={() => { setMode("entrar"); setMsg(null); }}>Voltar para entrar</button>}
        {msg && <div className={`auth-msg ${msg.err ? "err" : ""}`}>{msg.text}</div>}
        {mode !== "nova" && <div className="auth-foot">Prefere não usar conta agora? <button className="auth-link" style={{ padding: 0 }} onClick={onSkip}>Usar só neste aparelho</button></div>}
      </div>
    </div>
  );
}

function CloudCard({ cfg, session, cloud, onConnect, onDisconnect, onSyncNow, onLogout, onLogin }) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const label = { synced: "Salvo na nuvem", saving: "Salvando…", loading: "Carregando…", offline: "Sem conexão: salvo no aparelho", auth: "Entre na sua conta", off: "Salvo só neste aparelho" }[cloud.status] || "";
  const connect = () => {
    const u = url.trim().replace(/\/+$/, ""), k = key.trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(u)) return setErr("O endereço deve ser como https://abcdefgh.supabase.co");
    if (/^sb_secret_/i.test(k) || /service_role/i.test(k)) return setErr("Essa é a chave secreta. Nunca use ela no app. Copie a “Publishable key” (começa com sb_publishable_).");
    if (!(/^sb_publishable_[A-Za-z0-9_\-]{10,}$/.test(k) || (/^eyJ/.test(k) && k.length > 80))) return setErr("A chave parece incompleta. Copie a “Publishable key” inteira (começa com sb_publishable_).");
    setErr(""); onConnect({ url: u, key: k });
  };
  return (
    <div className="card">
      <div className="card-head"><h3 className="card-title">Nuvem e conta</h3><span className={`cloud-pill ${cloud.status}`}><i />{label}</span></div>
      {!cfg && (
        <>
          <p className="line-sub" style={{ marginTop: 0 }}>Conecte ao seu banco no Supabase para salvar tudo na nuvem e usar no celular e no computador ao mesmo tempo. O passo a passo está no arquivo LEIA-ME que veio junto com o app.</p>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: "1 / -1" }}><label>Project URL</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://abcdefgh.supabase.co" autoComplete="off" /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label>Publishable key</label><input value={key} onChange={(e) => setKey(e.target.value)} placeholder="sb_publishable_…" autoComplete="off" /></div>
          </div>
          {err && <div className="note-bad">{err}</div>}
          <button className="btn btn-primary" onClick={connect}>Conectar</button>
        </>
      )}
      {cfg && session && (
        <>
          <div className="kv-line"><span>Conta</span><b>{session.user.email}</b></div>
          <div className="kv-line"><span>Última sincronização</span><b>{cloud.at ? new Date(cloud.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</b></div>
          {cloud.status === "offline" && cloud.msg && <div className="note-bad">{cloud.msg}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button className="btn btn-primary" onClick={onSyncNow}>Sincronizar agora</button>
            <button className="btn btn-ghost" onClick={onLogout}>Sair da conta</button>
          </div>
        </>
      )}
      {cfg && !session && (
        <>
          <p className="line-sub" style={{ marginTop: 0 }}>Banco conectado ({cfg.url.replace("https://", "")}). Entre na sua conta para sincronizar.</p>
          {cloud.status === "offline" && cloud.msg && <div className="note-bad">{cloud.msg}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={onLogin}>Entrar ou criar conta</button>
            <button className="btn btn-ghost" onClick={onDisconnect}>Desconectar este banco</button>
          </div>
        </>
      )}
    </div>
  );
}

function App() {
  const [vinculos, setVinculos] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [presencas, setPresencas] = useState([]);
  const [extraRecurringIncomes, setExtraRecurringIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [cotacoes, setCotacoes] = useState({});
  const [brapiToken, setBrapiToken] = useState("");
  const [quoteStatus, setQuoteStatus] = useState("");
  const [quoteRun, setQuoteRun] = useState({ busy: false, done: 0, total: 0, marks: {}, kind: "" });
  const [goals, setGoals] = useState([]);
  const [oneOffIncomes, setOneOffIncomes] = useState([]);
  const [importedKeys, setImportedKeys] = useState({});
  const [importLog, setImportLog] = useState([]);
  const [limits, setLimits] = useState({});
  const [contab, setContab] = useState(CONTAB_DEFAULT);
  const [taxRateGeral, setTaxRateGeral] = useState(27.5);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const fileInputRef = useRef(null);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [activeTab, setActiveTab] = useState("inicio");
  const [selectedDay, setSelectedDay] = useState(null);
  const [navDir, setNavDir] = useState("fwd");
  const goTab = (id) => {
    const from = NAV_ALL.findIndex((x) => x.id === activeTab), to = NAV_ALL.findIndex((x) => x.id === id);
    setNavDir(to >= from ? "fwd" : "back");
    setActiveTab(id);
    try { window.scrollTo({ top: 0 }); } catch (e) {}
  };
  const [chartMonths, setChartMonths] = useState(12);
  const [quickOpen, setQuickOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(null);
  const [signals, setSignals] = useState({ despesas: 0, investimentos: 0 });
  const [chartScope, setChartScope] = useState("month");
  const [gainScope, setGainScope] = useState("mensal");

  const [expanded, setExpanded] = useState({ liquido: true, ganhos: true, ritmo: true });
  const toggleSection = (k) => setExpanded((p) => ({ ...p, [k]: !p[k] }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setVinculos(d.vinculos || []);
        setShifts(d.shifts || []);
        setPresencas(d.presencas || []);
        setExtraRecurringIncomes(d.extraRecurringIncomes || []);
        setExpenses(d.expenses || []);
        setRecurringExpenses(d.recurringExpenses || []);
        setInvestments(d.investments || []);
        setCotacoes(d.cotacoes || {});
        setBrapiToken(d.brapiToken || "");
        setGoals(d.goals || []);
        setOneOffIncomes(d.oneOffIncomes || []); setImportedKeys(d.importedKeys || {}); setImportLog(d.importLog || []); setLimits(d.limits || {}); setContab({ ...CONTAB_DEFAULT, ...(d.contab || {}) });
        setTaxRateGeral(d.taxRateGeral ?? 27.5);
      }
    } catch (e) { /* sem dados salvos ainda */ }
    finally { setLoaded(true); }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          vinculos, shifts, presencas, extraRecurringIncomes, expenses, recurringExpenses, investments, goals, taxRateGeral, cotacoes, brapiToken, oneOffIncomes, importedKeys, importLog, limits, contab
        }));
        setSaveError(false);
      } catch (e) { setSaveError(true); }
    }, 400);
    return () => clearTimeout(t);
  }, [vinculos, shifts, presencas, extraRecurringIncomes, expenses, recurringExpenses, investments, goals, taxRateGeral, cotacoes, brapiToken, oneOffIncomes, importedKeys, importLog, limits, contab, loaded]);


  // ================= sincronização com a nuvem =================
  const [cloudCfg, setCloudCfg] = useState(() => getCloudCfg());
  const [cloudSkip, setCloudSkip] = useState(() => lsGet(CLOUD_SKIP_KEY) === "1");
  const [session, setSession] = useState(null);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [cloud, setCloud] = useState({ status: getCloudCfg() ? "loading" : "off", msg: "" });
  const syncedRef = useRef(null);
  const pulledRef = useRef(false);
  const pushingRef = useRef(false);
  const againRef = useRef(false);
  const sessionRef = useRef(null);
  const latestRef = useRef(null);
  const settersRef = useRef(null);
  latestRef.current = {
    vinculos, shifts, presencas, extraRecurringIncomes, expenses, recurringExpenses, investments, goals, oneOffIncomes,
    settings: { taxRateGeral, cotacoes, brapiToken, importedKeys, importLog, limits, contab },
  };
  settersRef.current = {
    vinculos: setVinculos, shifts: setShifts, presencas: setPresencas, extraRecurringIncomes: setExtraRecurringIncomes, expenses: setExpenses,
    recurringExpenses: setRecurringExpenses, investments: setInvestments, goals: setGoals, oneOffIncomes: setOneOffIncomes,
    settings: (st) => { setTaxRateGeral(st.taxRateGeral ?? 27.5); setCotacoes(st.cotacoes || {}); setBrapiToken(st.brapiToken || ""); setImportedKeys(st.importedKeys || {}); setImportLog(st.importLog || []); setLimits(st.limits || {}); setContab({ ...CONTAB_DEFAULT, ...(st.contab || {}) }); },
  };
  sessionRef.current = session;

  const computeDiff = () => {
    const synced = syncedRef.current, d = latestRef.current, ses = sessionRef.current;
    if (!synced || !ses) return { rows: [], after: [] };
    const rows = [], after = [];
    COLLECTIONS.forEach((c) => {
      const cur = {};
      (d[c] || []).forEach((it) => { if (it && it.id !== undefined && it.id !== null) cur[String(it.id)] = it; });
      Object.keys(cur).forEach((id) => { const j = stableStr(cur[id]); if (synced[c][id] !== j) { rows.push({ user_id: ses.user.id, collection: c, id, data: cur[id], deleted: false }); after.push([c, id, j]); } });
      Object.keys(synced[c]).forEach((id) => { if (!cur[id]) { rows.push({ user_id: ses.user.id, collection: c, id, data: JSON.parse(synced[c][id]), deleted: true }); after.push([c, id, null]); } });
    });
    const sj = stableStr(d.settings);
    if (synced.__settings !== sj) { rows.push({ user_id: ses.user.id, collection: "settings", id: "main", data: d.settings, deleted: false }); after.push(["__settings", null, sj]); }
    return { rows, after };
  };

  const pushToCloud = async () => {
    if (!cloudCfg || !sessionRef.current || !pulledRef.current) return;
    if (pushingRef.current) { againRef.current = true; return; }
    const { rows, after } = computeDiff();
    if (!rows.length) { setCloud((cs) => (cs.status === "synced" ? cs : { status: "synced", msg: "", at: cs.at || Date.now() })); return; }
    pushingRef.current = true;
    setCloud((cs) => ({ ...cs, status: "saving" }));
    try {
      const sb = await getSupabase(cloudCfg);
      for (let i = 0; i < rows.length; i += 400) {
        const { error } = await sb.from("records").upsert(rows.slice(i, i + 400), { onConflict: "user_id,collection,id" });
        if (error) throw error;
      }
      const synced = syncedRef.current;
      after.forEach(([c, id, j]) => { if (c === "__settings") synced.__settings = j; else if (j === null) delete synced[c][id]; else synced[c][id] = j; });
      lsSet(SYNCED_KEY, JSON.stringify(synced));
      setCloud({ status: "synced", msg: "", at: Date.now() });
    } catch (e) {
      setCloud((cs) => ({ ...cs, status: "offline", msg: authMsg(e) }));
    } finally {
      pushingRef.current = false;
      if (againRef.current) { againRef.current = false; setTimeout(() => pushToCloud(), 300); }
    }
  };

  const pullFromCloud = async (mergeLocal) => {
    const sb = await getSupabase(cloudCfg);
    setCloud((cs) => ({ ...cs, status: "loading", msg: "" }));
    const rows = await fetchAllRecords(sb);
    const synced = {}, server = {}, known = {};
    COLLECTIONS.forEach((c) => { synced[c] = {}; server[c] = []; known[c] = new Set(); });
    let settings = null, settingsJson = null;
    rows.forEach((r) => {
      if (r.collection === "settings") { if (!r.deleted && r.data) { settings = r.data; settingsJson = stableStr(r.data); } return; }
      if (!synced[r.collection]) return;
      known[r.collection].add(String(r.id));
      if (r.deleted) return;
      server[r.collection].push(r.data);
      synced[r.collection][String(r.id)] = stableStr(r.data);
    });
    const local = latestRef.current;
    let prev = null;
    if (mergeLocal) { try { prev = JSON.parse(lsGet(SYNCED_KEY) || "null"); } catch (e) { prev = null; } }
    syncedRef.current = { ...synced, __settings: settingsJson };
    COLLECTIONS.forEach((c) => {
      if (!mergeLocal) { settersRef.current[c](server[c]); return; }
      const localMap = {}; (local[c] || []).forEach((it) => { if (it && it.id !== undefined && it.id !== null) localMap[String(it.id)] = it; });
      const snap = (prev && prev[c]) || {};
      const result = [];
      server[c].forEach((it) => {
        const id = String(it.id);
        if (snap[id] !== undefined) {
          if (!localMap[id]) return;                                  // apagado neste aparelho sem internet
          if (stableStr(localMap[id]) !== snap[id]) { result.push(localMap[id]); return; } // editado sem internet
        }
        result.push(it);
      });
      Object.keys(localMap).forEach((id) => { if (!known[c].has(id)) result.push(localMap[id]); }); // criado sem internet
      settersRef.current[c](result);
    });
    if (settings && !(mergeLocal && prev && prev.__settings && stableStr(local.settings) !== prev.__settings)) settersRef.current.settings(settings);
    pulledRef.current = true;
    lsSet(OWNER_KEY, sessionRef.current.user.id);
    lsSet(SYNCED_KEY, JSON.stringify(syncedRef.current));
    setCloud({ status: "synced", msg: "", at: Date.now() });
  };

  // conecta e acompanha o login
  useEffect(() => {
    if (!loaded) return;
    if (!cloudCfg || cloudSkip) { setCloud({ status: "off", msg: "" }); setAuthNeeded(false); return; }
    let alive = true, unsub = null;
    (async () => {
      try {
        setCloud((cs) => ({ ...cs, status: "loading" }));
        const sb = await getSupabase(cloudCfg);
        const { data } = await sb.auth.getSession();
        if (!alive) return;
        setSession(data.session || null);
        if (!data.session) { setAuthNeeded(true); setCloud({ status: "auth", msg: "" }); }
        const sub = sb.auth.onAuthStateChange((event, s) => {
          if (event === "PASSWORD_RECOVERY") { setRecovery(true); setAuthNeeded(true); }
          setSession(s || null);
          if (!s) { pulledRef.current = false; syncedRef.current = null; setAuthNeeded(true); setCloud({ status: "auth", msg: "" }); }
        });
        unsub = () => sub.data.subscription.unsubscribe();
      } catch (e) {
        if (alive) setCloud({ status: "offline", msg: authMsg(e) });
      }
    })();
    return () => { alive = false; if (unsub) unsub(); };
  }, [loaded, cloudCfg, cloudSkip]);

  // ao entrar: baixa os dados (e envia os deste aparelho na primeira vez)
  useEffect(() => {
    if (!session || !cloudCfg) return;
    if (!recovery) setAuthNeeded(false);
    if (pulledRef.current) return;
    const owner = lsGet(OWNER_KEY);
    pullFromCloud(!owner || owner === session.user.id).catch((e) => setCloud({ status: "offline", msg: authMsg(e) }));
  }, [session]);

  // envia as mudanças (com pequeno atraso para juntar edições)
  useEffect(() => {
    if (!session || !pulledRef.current) return;
    const t = setTimeout(() => pushToCloud(), 1200);
    return () => clearTimeout(t);
  }, [vinculos, shifts, presencas, extraRecurringIncomes, expenses, recurringExpenses, investments, goals, oneOffIncomes, taxRateGeral, cotacoes, brapiToken, importedKeys, importLog, limits, contab, session]);

  // tenta de novo quando a internet volta e atualiza ao reabrir o app
  useEffect(() => {
    if (!session) return;
    const onOnline = () => pushToCloud();
    const onVis = () => {
      if (document.visibilityState !== "visible" || !pulledRef.current) return;
      if (computeDiff().rows.length) pushToCloud();
      else pullFromCloud(false).catch(() => {});
    };
    const iv = setInterval(() => { if (computeDiff().rows.length) pushToCloud(); }, 30000);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(iv); window.removeEventListener("online", onOnline); document.removeEventListener("visibilitychange", onVis); };
  }, [session]);

  const cloudActions = {
    connect: (cfg) => { lsSet(CLOUD_CFG_KEY, JSON.stringify(cfg)); lsSet(CLOUD_SKIP_KEY, null); pulledRef.current = false; syncedRef.current = null; setCloudSkip(false); setCloudCfg(cfg); },
    disconnect: () => { if (!window.confirm("Desconectar este banco? Os dados continuam salvos lá e neste aparelho.")) return; lsSet(CLOUD_CFG_KEY, null); _sb = null; pulledRef.current = false; syncedRef.current = null; setSession(null); setCloudCfg(CLOUD_DEFAULT.url ? CLOUD_DEFAULT : null); },
    syncNow: async () => { try { if (computeDiff().rows.length) await pushToCloud(); await pullFromCloud(false); } catch (e) { setCloud({ status: "offline", msg: authMsg(e) }); } },
    login: () => { lsSet(CLOUD_SKIP_KEY, null); setCloudSkip(false); setAuthNeeded(true); },
    skip: () => { lsSet(CLOUD_SKIP_KEY, "1"); setCloudSkip(true); setAuthNeeded(false); },
    logout: async () => {
      if (computeDiff().rows.length && !window.confirm("Ainda há alterações não enviadas para a nuvem. Sair mesmo assim?")) return;
      if (!window.confirm("Sair da conta? Seus dados continuam salvos na nuvem, e este aparelho será limpo.")) return;
      try { const sb = await getSupabase(cloudCfg); await sb.auth.signOut(); } catch (e) {}
      pulledRef.current = false; syncedRef.current = null;
      COLLECTIONS.forEach((c) => settersRef.current[c]([]));
      settersRef.current.settings({});
      lsSet(STORAGE_KEY, null); lsSet(OWNER_KEY, null); lsSet(SYNCED_KEY, null);
      setSession(null); setAuthNeeded(true);
    },
  };
  const cloudLabel = { synced: "Salvo na nuvem", saving: "Salvando…", loading: "Carregando…", offline: "Sem conexão: salvo no aparelho", auth: "Entre na sua conta", off: "Salvo só neste aparelho" }[cloud.status] || "";

  const vinculoMap = useMemo(() => Object.fromEntries(vinculos.map((v) => [v.id, v])), [vinculos]);
  const inMonth = useCallback((iso, y, m) => {
    if (!iso) return false;
    const [yy, mm] = iso.split("-").map(Number);
    return yy === y && mm - 1 === m;
  }, []);
  const netOf = useCallback((gross, override) => {
    const rate = (override === null || override === undefined || override === "") ? Number(taxRateGeral || 0) : Number(override);
    return Number(gross || 0) * (1 - rate / 100);
  }, [taxRateGeral]);

  const buildIncomeItems = (y, m) => {
    const mk = monthKeyOf(y, m);
    const items = [];
    shifts.filter((s) => inMonth(payDateOf(s), y, m)).forEach((s) => {
      const v = vinculoMap[s.vinculoId];
      const delayed = payDateOf(s) !== s.date;
      items.push({ key: "shift-" + s.id, vinculoId: s.vinculoId, forma: formaDe(v), nome: v ? v.nome : "(vínculo removido)", cor: v ? v.cor : GOLD,
        tipo: "plantao", dateIso: payDateOf(s), dateLabel: delayed ? `plantão ${fmtDatePt(s.date).slice(0, 5)} · paga em ${fmtDatePt(payDateOf(s))}` : fmtDatePt(s.date), gross: Number(s.gross || 0), net: formaDe(v) === "pj" ? netOf(s.gross, v ? v.taxOverride : null) : Number(s.gross || 0),
        recebido: !!s.recebido, toggle: () => toggleShiftReceived(s.id), removable: true, remove: () => removeShift(s.id), ref: { t: "shift", id: s.id } });
    });
    const refLabel = (ck) => { const [cy, cm] = ck.split("-").map(Number); return MONTHS_ABBR_PT[cm - 1] + "/" + cy; };
    vinculos.filter((v) => v.tipo === "mensal").forEach((v) => {
      const d = Number(v.prazoMeses || 0);
      const ck = shiftMonthKey(mk, -d);
      if (v.startMonth > ck) return;
      items.push({ key: "mensal-" + v.id + "-" + ck, vinculoId: v.id, forma: formaDe(v), nome: v.nome, cor: v.cor, tipo: "mensal", dateIso: dateStr(y, m, clampDay(y, m, v.diaRecebimento || 5)),
        dateLabel: d > 0 ? `dia ${v.diaRecebimento || 5} · ref. ${refLabel(ck)}` : `dia ${v.diaRecebimento || 5} · mensal fixo`, gross: Number(v.valorMensal || 0), net: formaDe(v) === "pj" ? netOf(v.valorMensal, v.taxOverride) : Number(v.valorMensal || 0),
        recebido: !!(v.recebidoMonths && v.recebidoMonths[ck]), toggle: () => toggleVinculoMensalRecebido(v.id, ck), removable: false, ref: { t: "vinculo", id: v.id } });
      if (formaDe(v) === "clt") {
        const sal = Number(v.valorMensal || 0);
        const extraClt = (k, nome, valor, dia) => items.push({ key: "clt-" + v.id + "-" + mk + "-" + k, vinculoId: v.id, forma: "clt", nome: v.nome + " · " + nome, cor: v.cor, tipo: "mensal", dateIso: dateStr(y, m, clampDay(y, m, dia)),
          dateLabel: nome, gross: valor, net: valor, recebido: !!(v.recebidoMonths && v.recebidoMonths[mk + "-" + k]), toggle: () => toggleVinculoMensalRecebido(v.id, mk + "-" + k), removable: false, ref: { t: "vinculo", id: v.id } });
        if (v.clt13 && m === 10) extraClt("13a", "13º salário (1ª parcela)", sal / 2, 30);
        if (v.clt13 && m === 11) extraClt("13b", "13º salário (2ª parcela)", sal / 2, 20);
        if (v.feriasMes !== null && v.feriasMes !== undefined && v.feriasMes !== "" && Number(v.feriasMes) === m) extraClt("ferias", "1/3 de férias", sal / 3, v.diaRecebimento || 5);
      }
    });
    extraRecurringIncomes.forEach((e) => {
      const d = Number(e.prazoMeses || 0);
      const ck = shiftMonthKey(mk, -d);
      if (e.startMonth > ck) return;
      items.push({ key: "extra-" + e.id + "-" + ck, vinculoId: null, forma: e.tipoReceita === "dividendos" ? "div" : e.tipoReceita === "prolabore" ? "clt" : e.tipoReceita === "aluguel" ? "aluguel" : e.tipoReceita ? "outro" : formaDe(e), nome: e.description, cor: SLATE, tipo: "extra", dateIso: dateStr(y, m, clampDay(y, m, e.diaRecebimento || 5)),
        dateLabel: d > 0 ? `dia ${e.diaRecebimento || 5} · ref. ${refLabel(ck)}` : `dia ${e.diaRecebimento || 5} · recorrente`, gross: Number(e.amount || 0), net: e.tipoReceita ? liquidoReceita(e, e.amount, netOf) : netOf(e.amount, e.taxOverride), tipoReceita: e.tipoReceita,
        recebido: !!(e.recebidoMonths && e.recebidoMonths[ck]), toggle: () => toggleExtraIncomeRecebido(e.id, ck), removable: true, remove: () => removeExtraRecurringIncome(e.id), ref: { t: "extra", id: e.id } });
    });
    oneOffIncomes.filter((o) => inMonth(o.date, y, m)).forEach((o) => {
      items.push({ key: "one-" + o.id, vinculoId: null, forma: o.tipoReceita === "13" ? "clt" : "outro", tipoReceita: o.tipoReceita, nome: o.description, cor: "#3B82C4", tipo: "avulsa", dateIso: o.date, dateLabel: fmtDatePt(o.date) + " · receita extra",
        gross: Number(o.amount || 0), net: o.tipoReceita ? liquidoReceita(o, o.amount, netOf) : o.taxOverride !== undefined && o.taxOverride !== null && String(o.taxOverride) !== "" ? netOf(o.amount, o.taxOverride) : Number(o.amount || 0), recebido: !!o.recebido, toggle: () => setOneOffIncomes((prev) => prev.map((x) => x.id === o.id ? { ...x, recebido: !x.recebido } : x)),
        removable: true, removeOne: () => setOneOffIncomes((prev) => prev.filter((x) => x.id !== o.id)), ref: { t: "avulsa", id: o.id } });
    });
    const suf = { ...FORMA_CURTA, div: "isento", aluguel: "aluguel" };
    items.forEach((it) => { if (suf[it.forma] && !it.key.startsWith("clt-")) it.dateLabel += " · " + suf[it.forma]; });
    return items;
  };

  const buildExpenseItems = (y, m) => {
    const mk = monthKeyOf(y, m);
    const items = [];
    expenses.filter((e) => inMonth(e.dueDate, y, m)).forEach((e) => {
      items.push({ key: "exp-" + e.id, description: e.description, category: e.category || guessExpCat(e.description), amount: Number(e.amount || 0), dateLabel: fmtDatePt(e.dueDate), dateIso: e.dueDate, itens: Array.isArray(e.itens) && e.itens.length ? e.itens : null, ajuste: Number(e.ajuste) || 0,
        tipo: "pontual", dedutivel: e.dedutivel, paid: !!e.paid, toggle: () => toggleExpensePaid(e.id), remove: () => removeExpense(e.id), ref: { t: "exp", id: e.id } });
    });
    recurringExpenses.filter((r) => r.startMonth <= mk && (!r.endMonth || mk <= r.endMonth)).forEach((r) => {
      const aj = (r.ajustes && r.ajustes[mk]) || {};
      const day = clampDay(y, m, aj.diaVencimento || r.diaVencimento || 5);
      const info = r.paidMonths && r.paidMonths[mk];
      const desc = aj.description || r.description;
      items.push({ key: "rec-" + r.id + "-" + mk, description: desc, category: aj.category || r.category || guessExpCat(desc), amount: Number(aj.amount !== undefined ? aj.amount : r.amount || 0), dateLabel: fmtDatePt(dateStr(y, m, day)), dateIso: dateStr(y, m, day),
        tipo: "recorrente", dedutivel: aj.dedutivel !== undefined ? aj.dedutivel : r.dedutivel, paid: !!(info && info.paid), toggle: () => toggleRecurringExpensePaid(r.id, mk), remove: () => removeRecurringExpense(r.id), ref: { t: "rec", id: r.id, mk } });
    });
    return items;
  };

  // Lembretes: o que vence ou cai nos próximos 40 dias e ainda está em aberto. A opção fica só neste aparelho.
  const [notifOn, setNotifOnState] = useState(() => { try { return localStorage.getItem("mediplan-notif") === "1"; } catch (e) { return false; } });
  const [tema, setTemaState] = useState(() => lsGet("mediplan-tema") || "claro");
  const setTema = (t) => { lsSet("mediplan-tema", t); setTemaState(t); };
  useEffect(() => {
    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const aplicar = () => {
      const escuro = tema === "escuro" || (tema === "auto" && mq && mq.matches);
      document.documentElement.setAttribute("data-theme", escuro ? "dark" : "light");
      document.documentElement.style.colorScheme = escuro ? "dark" : "light";
      const m = document.querySelector('meta[name="theme-color"]');
      if (m) { if (!m.dataset.claro) m.dataset.claro = m.getAttribute("content") || "#ffffff"; m.setAttribute("content", escuro ? "#0B1220" : m.dataset.claro); }
    };
    aplicar();
    if (tema !== "auto" || !mq) return;
    if (mq.addEventListener) mq.addEventListener("change", aplicar); else mq.addListener(aplicar);
    return () => { if (mq.removeEventListener) mq.removeEventListener("change", aplicar); else mq.removeListener(aplicar); };
  }, [tema]);
  const [discreto, setDiscretoState] = useState(() => lsGet("mediplan-discreto") === "1");
  DISCRETO = discreto;
  const setDiscreto = (v) => { lsSet("mediplan-discreto", v ? "1" : null); setDiscretoState(!!v); };
  // trava com código de 4 números (só neste aparelho)
  const [pinHash, setPinHashState] = useState(() => lsGet("mediplan-pin") || "");
  const [locked, setLocked] = useState(() => !!lsGet("mediplan-pin"));
  const [bioId, setBioIdState] = useState(() => lsGet("mediplan-bio") || "");
  const setBioId = (id) => { lsSet("mediplan-bio", id || null); setBioIdState(id || ""); };
  const setPinHash = (h) => { lsSet("mediplan-pin", h || null); setPinHashState(h || ""); setLocked(false); if (!h) setBioId(""); };
  useEffect(() => {
    if (!pinHash) return;
    let saiuEm = 0;
    const onVis = () => { if (document.hidden) saiuEm = Date.now(); else if (saiuEm && Date.now() - saiuEm > 60000) setLocked(true); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [pinHash]);
  const setNotifOn = (v) => { setNotifOnState(!!v); try { localStorage.setItem("mediplan-notif", v ? "1" : "0"); } catch (e) {} };
  const lembretes = useMemo(() => {
    const t = new Date(), hoje = todayStr(), fim = addDaysIso(hoje, 40), out = [];
    for (let k = 0; k < 3; k++) {
      const d = new Date(t.getFullYear(), t.getMonth() + k, 1), y = d.getFullYear(), m = d.getMonth();
      buildExpenseItems(y, m).forEach((e) => { if (!e.paid && e.amount > 0 && e.dateIso >= hoje && e.dateIso <= fim) out.push({ key: e.key, date: e.dateIso, tipo: "despesa", nome: e.description, valor: e.amount }); });
      buildIncomeItems(y, m).forEach((i) => { if (!i.recebido && i.net > 0 && i.dateIso && i.dateIso >= hoje && i.dateIso <= fim) out.push({ key: i.key, date: i.dateIso, tipo: "receita", nome: i.nome, valor: i.net }); });
    }
    return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map((i) => ({ ...i,
      t1: i.tipo === "despesa" ? `Vence amanhã: ${i.nome}` : `Amanhã você recebe: ${i.nome}`,
      t0: i.tipo === "despesa" ? `Vence hoje: ${i.nome}` : `Hoje você recebe: ${i.nome}`,
      body: i.tipo === "despesa" ? `${fmtBRL(i.valor)} · vencimento em ${fmtDatePt(i.date)}` : `${fmtBRL(i.valor)} líquidos · previsto para ${fmtDatePt(i.date)}` }));
  }, [expenses, recurringExpenses, shifts, vinculos, extraRecurringIncomes, oneOffIncomes, taxRateGeral]);
  useEffect(() => { if (!loaded) return undefined; const tm = setTimeout(() => syncLembretes(notifOn, lembretes), 600); return () => clearTimeout(tm); }, [loaded, notifOn, lembretes]);

  const monthKey = monthKeyOf(viewYear, viewMonth);
  // Tributação pela contabilidade: a alíquota geral do app passa a ser a carga calculada na simulação
  const contabCarga = useMemo(() => {
    if (contab.modo !== "contab") return null;
    const p = { receitaMes: numOf(contab.receitaMes), rbt12: numOf(contab.rbt12), proLabore: numOf(contab.proLabore), folha: numOf(contab.folha), issPct: numOf(contab.issPct), hospitalar: !!contab.hospitalar, contador: numOf(contab.contador) };
    if (!(p.receitaMes > 0)) return null;
    return Math.round((contab.regime === "presumido" ? calcPresumido(p) : calcSimples(p)).carga * 100) / 100;
  }, [contab]);
  useEffect(() => { if (loaded && contabCarga !== null && Number(taxRateGeral) !== contabCarga) setTaxRateGeral(contabCarga); }, [contabCarga, taxRateGeral, loaded]);
  const monthShifts = shifts.filter((s) => inMonth(s.date, viewYear, viewMonth));
  const monthPresencas = presencas.filter((p) => inMonth(p.date, viewYear, viewMonth));
  const monthIncomeItems = buildIncomeItems(viewYear, viewMonth);
  const monthExpenseItems = buildExpenseItems(viewYear, viewMonth);
  // dinheiro por dia do mês em tela: o que entra (líquido) e o que sai, para colorir o calendário
  const fluxoDia = {};
  const fluxoAdd = (iso, item) => { const d = Number(String(iso).slice(8, 10)); if (!d) return; const f = (fluxoDia[d] = fluxoDia[d] || { entra: 0, sai: 0, itens: [] }); if (item.in) f.entra += item.v; else f.sai += item.v; f.itens.push(item); };
  monthIncomeItems.forEach((it) => fluxoAdd(it.dateIso, { k: it.key, nome: it.nome, v: Number(it.net) || 0, in: true, ok: !!it.recebido }));
  monthExpenseItems.forEach((it) => fluxoAdd(it.dateIso, { k: it.key, nome: it.description, v: Number(it.amount) || 0, in: false, ok: !!it.paid }));
  const monthInvestments = investments.filter((i) => !i.posicaoInicial && inMonth(i.date, viewYear, viewMonth));

  const totalGross = monthIncomeItems.reduce((a, i) => a + i.gross, 0);
  const totalNet = monthIncomeItems.reduce((a, i) => a + i.net, 0);
  const totalPaidExpenses = monthExpenseItems.filter((i) => i.paid).reduce((a, i) => a + i.amount, 0);
  const totalPendingExpenses = monthExpenseItems.filter((i) => !i.paid).reduce((a, i) => a + i.amount, 0);
  const totalExpensesMonth = totalPaidExpenses + totalPendingExpenses;
  const totalInvestedMonth = monthInvestments.reduce((a, i) => a + Number(i.amount || 0), 0);
  const totalHoursMonth = monthShifts.reduce((a, s) => a + Number(s.hours || 0), 0) + monthPresencas.reduce((a, p) => a + Number(p.hours || 0), 0);
  const weeklyHours = totalHoursMonth / 4;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const entriesByDay = useMemo(() => {
    const map = {};
    monthShifts.forEach((s) => { const d = Number(s.date.split("-")[2]); (map[d] = map[d] || []).push({ ...s, _kind: "plantao" }); });
    monthPresencas.forEach((p) => { const d = Number(p.date.split("-")[2]); (map[d] = map[d] || []).push({ ...p, _kind: "presenca" }); });
    // escala fixa dos vínculos mensais; uma presença lançada no dia substitui a escala daquele vínculo
    vinculos.forEach((v) => escalaDoMes(v, viewYear, viewMonth).forEach((e) => {
      if (monthPresencas.some((p) => p.vinculoId === v.id && p.date === e.date)) return;
      (map[e.day] = map[e.day] || []).push({ ...e, hours: e.off ? 0 : e.hours, previsto: e.hours, _kind: "escala" });
    }));
    return map;
  }, [monthShifts, monthPresencas, vinculos, viewYear, viewMonth]);

  const goMonth = (y, m) => { setViewYear(y); setViewMonth(m); setSelectedDay(null); try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) {} };
  const [cargoOpen, setCargoOpen] = useState(false);
  const [importSrc, setImportSrc] = useState(null);
  const desk = useDesk();
  const quickGo = (kind) => {
    setQuickOpen(false);
    if (kind === "cargo") { setCargoOpen(true); return; }
    if (kind === "plantao") {
      const t = new Date(); setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); setSelectedDay(t.getDate()); goTab("calendario");
    } else if (kind === "despesa") { setSignals((x) => ({ ...x, despesas: x.despesas + 1 })); goTab("despesas"); }
    else if (kind === "aporte") { setSignals((x) => ({ ...x, investimentos: x.investimentos + 1 })); goTab("investimentos"); }
    else if (kind === "importar") goTab("importar");
  };
  const changeMonth = (delta) => {
    let m = viewMonth + delta, y = viewYear;
    if (m < 0) { m = 11; y -= 1; } if (m > 11) { m = 0; y += 1; }
    setViewMonth(m); setViewYear(y); setSelectedDay(null);
  };

  const addVinculo = (data) => {
    const v = { id: uid(), nome: data.nome, cor: data.cor, tipo: data.tipo, forma: data.forma || "pj", clt13: !!data.clt13, feriasMes: data.feriasMes === undefined ? null : data.feriasMes, taxOverride: data.taxOverride === "" ? null : Number(data.taxOverride) };
    if (data.tipo === "plantao") v.prazoPadrao = Number(data.prazoPadrao) || 0;
    if (data.tipo === "mensal") {
      v.prazoMeses = Number(data.prazoMeses) || 0;
      v.valorMensal = Number(data.valorMensal) || 0;
      v.diaRecebimento = Number(data.diaRecebimento) || 5;
      v.startMonth = data.startMonth || monthKey;
      v.recebidoMonths = {};
      if (Array.isArray(data.escala) && data.escala.length) v.escala = data.escala;
    }
    setVinculos((prev) => [...prev, v]);
    return v.id;
  };
  const removeVinculo = (id) => {
    setVinculos((prev) => prev.filter((v) => v.id !== id));
    setShifts((prev) => prev.filter((s) => s.vinculoId !== id));
    setPresencas((prev) => prev.filter((p) => p.vinculoId !== id));
  };
  const updateVinculoPrazo = (id, val) => setVinculos((prev) => prev.map((v) => v.id === id ? (v.tipo === "mensal" ? { ...v, prazoMeses: Number(val) || 0 } : { ...v, prazoPadrao: Number(val) || 0 }) : v));
  const updateVinculo = (id, data) => setVinculos((prev) => prev.map((v) => {
    if (v.id !== id) return v;
    const n = { ...v, nome: data.nome, cor: data.cor, forma: data.forma || v.forma || "pj", clt13: !!data.clt13, feriasMes: data.feriasMes === undefined ? v.feriasMes : data.feriasMes, taxOverride: data.taxOverride === "" || data.taxOverride === null || data.taxOverride === undefined ? null : Number(data.taxOverride) };
    if (v.tipo === "plantao") n.prazoPadrao = Number(data.prazoPadrao) || 0;
    else { n.prazoMeses = Number(data.prazoMeses) || 0; n.valorMensal = Number(data.valorMensal) || 0; n.diaRecebimento = Number(data.diaRecebimento) || 5; if (Array.isArray(data.escala) && data.escala.length) n.escala = data.escala; else delete n.escala; }
    return n;
  }));
  const updateExtra = (id, data) => setExtraRecurringIncomes((prev) => prev.map((e) => e.id === id ? { ...e, forma: data.forma || e.forma || "pj", tipoReceita: data.tipoReceita || e.tipoReceita, description: data.description, amount: Number(data.amount) || 0, diaRecebimento: Number(data.diaRecebimento) || 5, prazoMeses: Number(data.prazoMeses) || 0, taxOverride: data.taxOverride === "" || data.taxOverride === null || data.taxOverride === undefined ? null : Number(data.taxOverride) } : e));
  const updateShift = (id, data) => setShifts((prev) => prev.map((s) => s.id === id ? { ...s, gross: Number(data.gross) || 0, hours: Number(data.hours) || 0, date: data.date, prazoDias: Number(data.prazoDias) || 0, payDate: addDaysIso(data.date, Number(data.prazoDias) || 0) } : s));
  const updateOneOff = (id, data) => setOneOffIncomes((prev) => prev.map((o) => o.id === id ? { ...o, description: data.description, amount: Number(data.amount) || 0, date: data.date, taxOverride: Number(data.taxOverride) || 0, recebido: !!data.recebido, forma: data.forma || o.forma || "pf", tipoReceita: data.tipoReceita || o.tipoReceita } : o));
  const addOneOff = (data) => setOneOffIncomes((prev) => [...prev, { id: uid(), description: data.description, amount: Number(data.amount) || 0, date: data.date, taxOverride: Number(data.taxOverride) || 0, recebido: !!data.recebido, forma: data.forma || "pf", tipoReceita: data.tipoReceita || "outro", source: "manual" }]);
  const updateExpense = (id, d) => setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, description: d.description, amount: Number(d.amount) || 0, dueDate: d.dueDate || e.dueDate, category: d.category || e.category, ...(d.dedutivel !== undefined ? { dedutivel: !!d.dedutivel } : {}) } : e));
  // conta que se repete: "só este mês" guarda um ajuste no mês; "daqui em diante" encerra a antiga no mês anterior e cria outra a partir deste
  const updateRecurringExpense = (id, d, mk, modo) => setRecurringExpenses((prev) => {
    const r = prev.find((x) => x.id === id); if (!r) return prev;
    const novo = { description: d.description, amount: Number(d.amount) || 0, diaVencimento: Number(d.diaVencimento) || 5, category: d.category, ...(d.dedutivel !== undefined ? { dedutivel: !!d.dedutivel } : {}) };
    if (modo === "mes") return prev.map((x) => x.id === id ? { ...x, ajustes: { ...(x.ajustes || {}), [mk]: novo } } : x);
    if (mk <= r.startMonth) return prev.map((x) => x.id === id ? { ...x, ...novo, ajustes: {} } : x);
    const pick = (o, f) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => f(k)));
    const velho = { ...r, endMonth: shiftMonthKey(mk, -1), paidMonths: pick(r.paidMonths, (k) => k < mk), ajustes: pick(r.ajustes, (k) => k < mk) };
    const nova = { ...r, ...novo, id: uid(), startMonth: mk, paidMonths: pick(r.paidMonths, (k) => k >= mk), ajustes: {} };
    if (!r.endMonth) delete nova.endMonth;
    return prev.map((x) => x.id === id ? velho : x).concat(nova);
  });
  const updateExtraPrazo = (id, val) => setExtraRecurringIncomes((prev) => prev.map((e) => e.id === id ? { ...e, prazoMeses: Number(val) || 0 } : e));
  const updateShiftPrazo = (id, val) => setShifts((prev) => prev.map((s) => s.id === id ? { ...s, prazoDias: Number(val) || 0, payDate: addDaysIso(s.date, Number(val) || 0) } : s));
  const updateVinculoEscala = (id, escala) => setVinculos((prev) => prev.map((v) => v.id === id ? { ...v, escala } : v));
  const toggleEscalaOff = (id, date) => setVinculos((prev) => prev.map((v) => {
    if (v.id !== id) return v;
    const off = { ...(v.escalaOff || {}) };
    if (off[date]) delete off[date]; else off[date] = true;
    return { ...v, escalaOff: off };
  }));
  const updateVinculoTax = (id, val) => setVinculos((prev) => prev.map((v) => v.id === id ? { ...v, taxOverride: val === "" ? null : Number(val) } : v));
  const toggleVinculoMensalRecebido = (id, mk) => setVinculos((prev) => prev.map((v) => v.id === id ? { ...v, recebidoMonths: { ...v.recebidoMonths, [mk]: !(v.recebidoMonths && v.recebidoMonths[mk]) } } : v));

  const addShift = (day, vinculoId, gross, hours, prazoDias) => {
    const date = dateStr(viewYear, viewMonth, day);
    const prazo = Math.max(0, Number(prazoDias) || 0);
    setShifts((prev) => [...prev, { id: uid(), date, vinculoId, gross: Number(gross) || 0, hours: Number(hours) || 0, recebido: false, prazoDias: prazo, payDate: addDaysIso(date, prazo) }]);
    setVinculos((prev) => prev.map((v) => v.id === vinculoId ? { ...v, prazoPadrao: prazo } : v));
  };
  const removeShift = (id) => setShifts((prev) => prev.filter((s) => s.id !== id));
  // Plantão lançado direto pelo nome do local: o local é criado na hora se ainda não existir. Várias datas = plantão que se repete (uma série)
  const addPlantao = ({ local, gross, hours, prazoDias, datas, taxa, forma, fixo }) => {
    const tx = taxa === undefined || taxa === null || String(taxa).trim() === "" ? undefined : Number(taxa);
    const nome = String(local || "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (!nome || !datas || !datas.length) return null;
    const prazo = Math.max(0, Number(prazoDias) || 0), chave = stripAcc(nome);
    const ja = vinculos.find((v) => v.tipo === "plantao" && stripAcc(v.nome).replace(/\s+/g, " ").trim() === chave);
    const vid = ja ? ja.id : uid();
    const extra = { ...(forma ? { forma } : {}) };
    if (ja) setVinculos((prev) => prev.map((v) => (v.id === vid ? { ...v, ...extra, prazoPadrao: prazo, ...(tx !== undefined ? { taxOverride: tx } : {}), ...(fixo ? { fixos: [...(v.fixos || []), fixo] } : {}) } : v)));
    else setVinculos((prev) => [...prev, { id: vid, nome, cor: PALETTE[prev.length % PALETTE.length], tipo: "plantao", ...extra, taxOverride: tx !== undefined ? tx : null, prazoPadrao: prazo, ...(fixo ? { fixos: [fixo] } : {}) }]);
    const serie = fixo ? fixo.id : datas.length > 1 ? uid() : null, base = uid();
    setShifts((prev) => [...prev, ...datas.map((date, n) => ({ id: base + "-" + n, date, vinculoId: vid, gross: Number(gross) || 0, hours: Number(hours) || 0, recebido: false, prazoDias: prazo, payDate: addDaysIso(date, prazo), ...(serie ? { serie } : {}) }))]);
    return vid;
  };
  const removeShiftSerie = (serie, desde) => {
    setShifts((prev) => prev.filter((s) => !(s.serie && s.serie === serie && s.date >= desde)));
    setVinculos((prev) => prev.map((v) => (v.fixos || []).some((f) => f.id === serie) ? { ...v, fixos: v.fixos.map((f) => f.id === serie ? { ...f, fim: desde } : f) } : v));
  };
  // plantão fixo: mantém os próximos 6 meses criados no Calendário
  useEffect(() => {
    if (!vinculos.some((v) => (v.fixos || []).length)) return;
    const hoje = todayStr(), alvo = isoDe(new Date(Date.now() + 180 * 864e5)), limite = isoDe(new Date(Date.now() + 120 * 864e5));
    const novos = [], ates = {};
    vinculos.forEach((v) => (v.fixos || []).forEach((f) => {
      if (f.fim || !f.ate || f.ate >= limite) return;
      const desde = isoDe(new Date(new Date(f.ate + "T12:00:00").getTime() + 864e5));
      const ds = fixoDatas(f, desde > hoje ? desde : hoje, alvo);
      ds.forEach((date, n) => novos.push({ id: f.id + "-" + date, date, vinculoId: v.id, gross: Number(f.gross) || 0, hours: Number(f.hours) || 0, recebido: false, prazoDias: Number(f.prazo) || 0, payDate: addDaysIso(date, Number(f.prazo) || 0), serie: f.id }));
      ates[f.id] = alvo;
    }));
    if (!Object.keys(ates).length) return;
    setShifts((prev) => { const ja = new Set(prev.map((s) => s.serie + "|" + s.date)); return [...prev, ...novos.filter((s) => !ja.has(s.serie + "|" + s.date))]; });
    setVinculos((prev) => prev.map((v) => (v.fixos || []).some((f) => ates[f.id]) ? { ...v, fixos: v.fixos.map((f) => ates[f.id] ? { ...f, ate: ates[f.id] } : f) } : v));
  }, [vinculos.length, loaded]);
  const toggleShiftReceived = (id) => setShifts((prev) => prev.map((s) => s.id === id ? { ...s, recebido: !s.recebido } : s));
  const addPresenca = (day, vinculoId, hours) => {
    setPresencas((prev) => [...prev, { id: uid(), date: dateStr(viewYear, viewMonth, day), vinculoId, hours: Number(hours) || 0 }]);
  };
  const removePresenca = (id) => setPresencas((prev) => prev.filter((p) => p.id !== id));

  const addExtraRecurringIncome = (data) => {
    setExtraRecurringIncomes((prev) => [...prev, { id: uid(), forma: data.forma || "pj", tipoReceita: data.tipoReceita || "outro", description: data.description, amount: Number(data.amount) || 0,
      diaRecebimento: Number(data.diaRecebimento) || 5, prazoMeses: Number(data.prazoMeses) || 0, startMonth: data.startMonth || monthKey, taxOverride: data.taxOverride === "" ? null : Number(data.taxOverride), recebidoMonths: {} }]);
  };
  const removeExtraRecurringIncome = (id) => setExtraRecurringIncomes((prev) => prev.filter((e) => e.id !== id));
  const toggleExtraIncomeRecebido = (id, mk) => setExtraRecurringIncomes((prev) => prev.map((e) => e.id === id ? { ...e, recebidoMonths: { ...e.recebidoMonths, [mk]: !(e.recebidoMonths && e.recebidoMonths[mk]) } } : e));

  const addExpense = (description, amount, dueDate, category) => setExpenses((prev) => [...prev, { id: uid(), description, category: category || guessExpCat(description), amount: Number(amount) || 0, dueDate, paid: false, paidDate: null }]);
  const toggleExpensePaid = (id) => setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, paid: !e.paid, paidDate: !e.paid ? todayStr() : null } : e));
  const removeExpense = (id) => setExpenses((prev) => prev.filter((e) => e.id !== id));
  // guia de imposto marcada como paga vira uma despesa paga em Impostos
  const pagarGuia = (mk, g) => {
    const id = uid();
    setExpenses((prev) => [...prev, { id, description: g.nome, amount: Math.round(g.valor * 100) / 100, category: "impostos", dueDate: g.data, date: g.data, paid: true, fromContab: true }]);
    setContab((p) => ({ ...p, pagos: { ...(p.pagos || {}), [mk]: { ...((p.pagos || {})[mk] || {}), [g.id]: id } } }));
  };
  const desfazerGuia = (mk, gid) => {
    const exp = ((contab.pagos || {})[mk] || {})[gid];
    if (exp) setExpenses((prev) => prev.filter((e) => e.id !== exp));
    setContab((p) => { const m = { ...((p.pagos || {})[mk] || {}) }; delete m[gid]; return { ...p, pagos: { ...(p.pagos || {}), [mk]: m } }; });
  };
  const contabAba = contab.aba !== false;
  useEffect(() => { if (!contabAba && activeTab === "contabilidade") setActiveTab("inicio"); }, [contabAba, activeTab]);

  const addRecurringExpense = (data) => setRecurringExpenses((prev) => [...prev, { id: uid(), description: data.description, category: data.category || guessExpCat(data.description), amount: Number(data.amount) || 0,
    diaVencimento: Number(data.diaVencimento) || 5, startMonth: data.startMonth || monthKey, paidMonths: {} }]);
  const removeRecurringExpense = (id) => { if (window.confirm("Excluir esta despesa recorrente? Ela deixará de aparecer em todos os meses futuros.")) setRecurringExpenses((prev) => prev.filter((r) => r.id !== id)); };
  const toggleRecurringExpensePaid = (id, mk) => setRecurringExpenses((prev) => prev.map((r) => {
    if (r.id !== id) return r;
    const current = r.paidMonths && r.paidMonths[mk];
    return { ...r, paidMonths: { ...r.paidMonths, [mk]: { paid: !(current && current.paid), paidDate: !(current && current.paid) ? todayStr() : null } } };
  }));

  const addInvestment = (d) => setInvestments((prev) => [...prev, { id: uid(), description: d.description, assetName: d.assetName || "", category: d.category, date: d.date,
    tipo: d.tipo || "compra", qty: d.qty || 0, price: d.price || 0, amount: Number(d.amount) || 0 }]);
  // Ajusta o preço médio de um ativo para o valor informado, registrando a diferença como um lançamento de ajuste
  const adjustAvg = (p, novo) => {
    const n = numOf(novo);
    if (!p || !(p.qty > 0) || !(n > 0)) return false;
    const delta = Math.round((n * p.qty - p.cost) * 100) / 100;
    if (Math.abs(delta) < 0.005) return true;
    setInvestments((prev) => [...prev, { id: uid(), description: p.description, assetName: p.assetName || "", category: p.category, date: todayStr(), tipo: "ajuste", qty: 0, price: n, amount: 0, ajuste: delta }]);
    return true;
  };
  const setCotacao = (key, val) => setCotacoes((prev) => ({ ...prev, [key]: val }));
  const refreshQuotes = async () => {
    if (quoteRun.busy) return;
    const tickers = [...new Set(portfolio.positions.filter((p) => p.isQty && invCatMeta(p.category).kind === "ticker").map((p) => p.description))];
    if (tickers.length === 0) {
      setQuoteRun((r) => ({ ...r, marks: {}, kind: "warn" }));
      setQuoteStatus("Não há ações, FIIs ou ETFs com quantidade para buscar. Lance a compra com quantidade e preço.");
      return;
    }
    const token = (brapiToken || "").trim();
    const next = {}, marks = {};
    const okList = [], needToken = [], notFound = [], other = [];
    let stop = "", netFails = 0; // stop: "notoken" | "token" | "limit" | "net"
    setQuoteStatus("");
    setQuoteRun({ busy: true, done: 0, total: tickers.length, marks: {}, kind: "" });
    for (let k = 0; k < tickers.length; k++) {
      const t = tickers[k];
      if (stop === "notoken" && !BRAPI_FREE.includes(t)) { needToken.push(t); marks[t] = "token"; }
      else if (stop && stop !== "notoken") { other.push(t); marks[t] = "fail"; }
      else {
        try {
          const url = "https://brapi.dev/api/quote/" + encodeURIComponent(t) + (token ? "?token=" + encodeURIComponent(token) : "");
          const r = await fetch(url, { cache: "no-store" });
          let j = null;
          try { j = await r.json(); } catch (e) { j = null; }
          const price = Number(j && j.results && j.results[0] && j.results[0].regularMarketPrice);
          if (r.ok && price > 0) { next[t] = Math.round(price * 100) / 100; marks[t] = "ok"; okList.push(t); netFails = 0; }
          else if (r.status === 401 || (r.status === 403 && !token)) {
            if (token) { stop = "token"; other.push(t); marks[t] = "fail"; }
            else { stop = "notoken"; needToken.push(t); marks[t] = "token"; }
          }
          else if (r.status === 429) { stop = "limit"; other.push(t); marks[t] = "fail"; }
          else if (r.status === 404 || r.ok) { notFound.push(t); marks[t] = "fail"; }
          else { other.push(t); marks[t] = "fail"; }
        } catch (e) {
          other.push(t); marks[t] = "fail"; netFails += 1;
          if (netFails >= 3 && okList.length === 0) stop = "net";
        }
      }
      setQuoteRun((r) => ({ ...r, done: k + 1, marks: { ...marks } }));
    }
    if (okList.length) setCotacoes((prev) => ({ ...prev, ...next }));
    const n = tickers.length;
    const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const parts = [`${okList.length} de ${n} ${n === 1 ? "cotação atualizada" : "cotações atualizadas"} às ${hora}.`];
    if (stop === "notoken") parts.push(`${needToken.length === 1 ? "1 ativo precisa" : needToken.length + " ativos precisam"} de um token gratuito da brapi.dev: sem token, o serviço só responde alguns ativos de teste. Cole o token abaixo e toque em Atualizar cotações de novo.`);
    if (stop === "token") parts.push("A brapi recusou o token. Confira se ele foi colado inteiro e tente de novo.");
    if (stop === "limit") parts.push("A brapi atingiu o limite de consultas. Espere alguns minutos e tente de novo.");
    if (stop === "net") parts.push("Não consegui falar com a brapi. Confira a internet e tente de novo.");
    if (notFound.length) parts.push(`Não encontrados: ${notFound.join(", ")}.`);
    if ((!stop || stop === "notoken") && other.length) parts.push(`Sem resposta: ${other.join(", ")}.`);
    setQuoteStatus(parts.join(" "));
    setQuoteRun({ busy: false, done: n, total: n, marks, kind: okList.length === n ? "ok" : okList.length ? "warn" : "bad" });
  };

  const removeInvestment = (id) => setInvestments((prev) => prev.filter((i) => i.id !== id));
  // Posição inicial: investimento que já existia antes de usar o app. Fica na carteira, mas não é aporte nem sai do caixa.
  const setPosicaoInicial = (date, on) => setInvestments((prev) => prev.map((i) => {
    if (i.date !== date) return i;
    if (on) return { ...i, posicaoInicial: true };
    const { posicaoInicial, ...rest } = i;
    return rest;
  }));

  // ---- CRUD: metas ----
  const addGoal = (data) => setGoals((prev) => [...prev, { id: uid(), nome: data.nome, valorAlvo: Number(data.valorAlvo) || 0, valorAtual: Number(data.valorAtual) || 0, fonte: ["carteira", "patrimonio"].includes(data.fonte) ? data.fonte : "manual", prazo: data.prazo || null, cor: data.cor || GOLD }]);
  const removeGoal = (id) => setGoals((prev) => prev.filter((g) => g.id !== id));
  const contributeGoal = (id, amount) => setGoals((prev) => prev.map((g) => g.id === id ? { ...g, valorAtual: Number(g.valorAtual || 0) + Number(amount || 0) } : g));

  const computeVinculoTotals = (scope) => {
    const map = {};
    const months = scope === "anual" ? [...Array(12).keys()] : [viewMonth];
    months.forEach((m) => {
      buildIncomeItems(viewYear, m).filter((i) => i.vinculoId).forEach((i) => {
        map[i.vinculoId] = map[i.vinculoId] || { vinculoId: i.vinculoId, nome: i.nome, cor: i.cor, value: 0, recebido: true };
        map[i.vinculoId].value += i.net;
        map[i.vinculoId].recebido = map[i.vinculoId].recebido && i.recebido;
      });
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  };
  const netByVinculo = computeVinculoTotals(gainScope);

  const locationDetail = useMemo(() => {
    const map = {};
    monthShifts.forEach((s) => {
      const v = vinculoMap[s.vinculoId]; const key = s.vinculoId || "?";
      map[key] = map[key] || { nome: v ? v.nome : "—", cor: v ? v.cor : SLATE, hours: 0, dates: new Set() };
      map[key].hours += Number(s.hours || 0); map[key].dates.add(s.date);
    });
    monthPresencas.forEach((p) => {
      const v = vinculoMap[p.vinculoId]; const key = p.vinculoId || "?";
      map[key] = map[key] || { nome: v ? v.nome : "—", cor: v ? v.cor : SLATE, hours: 0, dates: new Set() };
      map[key].hours += Number(p.hours || 0); map[key].dates.add(p.date);
    });
    return Object.values(map).map((x) => ({ ...x, dias: x.dates.size })).sort((a, b) => b.hours - a.hours);
  }, [monthShifts, monthPresencas, vinculoMap]);

  // Rentabilidade do trabalho pelo mês trabalhado: só entra na conta por hora a receita que tem horas lançadas
  const workStats = (y, m) => {
    const mk = monthKeyOf(y, m), by = {}, dias = new Set();
    const slot = (id, v) => (by[id] = by[id] || { id, nome: v ? v.nome : "(vínculo removido)", cor: v ? v.cor : SLATE, net: 0, hours: 0, turnos: 0 });
    let semHoras = 0, semHorasNet = 0;
    shifts.forEach((s) => {
      if (!inMonth(s.date, y, m)) return;
      const v = vinculoMap[s.vinculoId], h = Number(s.hours || 0), net = netOf(s.gross, v ? v.taxOverride : null);
      if (h <= 0) { semHoras += 1; semHorasNet += net; return; }
      const o = slot(s.vinculoId || "?", v); o.net += net; o.hours += h; o.turnos += 1; dias.add(s.date);
    });
    presencas.forEach((p) => {
      if (!inMonth(p.date, y, m)) return;
      const h = Number(p.hours || 0); if (h <= 0) return;
      const o = slot(p.vinculoId || "?", vinculoMap[p.vinculoId]); o.hours += h; o.turnos += 1; dias.add(p.date);
    });
    const mensalSemHoras = [];
    vinculos.forEach((v) => {
      if (v.tipo !== "mensal") return;
      // horas da escala fixa, menos os dias marcados como não trabalhados e os que têm presença lançada
      escalaDoMes(v, y, m).forEach((e) => {
        if (e.off || presencas.some((p) => p.vinculoId === v.id && p.date === e.date && Number(p.hours) > 0)) return;
        const s = slot(v.id, v); s.hours += e.hours; s.turnos += 1; dias.add(e.date);
      });
      const o = by[v.id];
      if (o && o.hours > 0) o.net += netOf(v.valorMensal, v.taxOverride);
      else if (v.startMonth <= mk) mensalSemHoras.push(v.nome);
    });
    const byVinculo = Object.values(by).filter((o) => o.hours > 0).map((o) => ({ ...o, hourly: o.net / o.hours })).sort((a, b) => b.hourly - a.hourly);
    const hours = byVinculo.reduce((a, o) => a + o.hours, 0), net = byVinculo.reduce((a, o) => a + o.net, 0);
    return { hours, net, hourly: hours > 0 ? net / hours : 0, dias: dias.size, turnos: byVinculo.reduce((a, o) => a + o.turnos, 0), byVinculo, semHoras, semHorasNet, mensalSemHoras };
  };
  // Faturamento bruto pelo mês trabalhado (plantões e vínculos mensais), usado como sugestão na Contabilidade
  const grossWorked = (y, m) => {
    const mk = monthKeyOf(y, m);
    return shifts.reduce((a, s) => a + (inMonth(s.date, y, m) ? Number(s.gross || 0) : 0), 0) +
      vinculos.reduce((a, v) => a + (v.tipo === "mensal" && v.startMonth <= mk ? Number(v.valorMensal || 0) : 0), 0);
  };

  const monthStats = (y, m) => {
    const inc = buildIncomeItems(y, m);
    const exp = buildExpenseItems(y, m);
    const inv = investments.filter((i) => !i.posicaoInicial && inMonth(i.date, y, m)).reduce((a, i) => a + Number(i.amount || 0), 0);
    const hrs = shifts.filter((s) => inMonth(s.date, y, m)).reduce((a, s) => a + Number(s.hours || 0), 0) +
                presencas.filter((p) => inMonth(p.date, y, m)).reduce((a, p) => a + Number(p.hours || 0), 0);
    const net = inc.reduce((a, i) => a + i.net, 0);
    const expTotal = exp.reduce((a, i) => a + i.amount, 0);
    const w = workStats(y, m);
    return { net, expTotal, invested: inv, hours: Math.max(hrs, w.hours), leftover: net - expTotal - inv, hourly: w.hourly, workHours: w.hours, workHourly: w.hourly };
  };
  const history12 = (() => {
    const arr = [];
    for (let i = chartMonths - 1; i >= 0; i--) {
      let m = viewMonth - i, y = viewYear;
      while (m < 0) { m += 12; y -= 1; }
      const st = monthStats(y, m);
      arr.push({ y, m, full: MONTHS_PT[m] + " " + y, label: MONTHS_ABBR_PT[m], value: Math.round(st.net * 100) / 100, leftover: Math.round(st.leftover * 100) / 100, expenses: Math.round(st.expTotal * 100) / 100, invested: Math.round(st.invested * 100) / 100 });
    }
    return arr;
  })();

  const curStats = monthStats(viewYear, viewMonth);
  const prevStats = (() => { let m = viewMonth - 1, y = viewYear; if (m < 0) { m = 11; y -= 1; } return monthStats(y, m); })();
  const monthBack = (k) => { let m = viewMonth - k, y = viewYear; while (m < 0) { m += 12; y -= 1; } return [y, m]; };
  const workCur = workStats(viewYear, viewMonth);
  const workPrev = workStats(...monthBack(1));
  const workHistory = [5, 4, 3, 2, 1, 0].map((k) => { const [y, m] = monthBack(k); return { y, m, cur: k === 0, label: MONTHS_ABBR_PT[m], full: MONTHS_PT[m] + " " + y, ...workStats(y, m) }; });
  const prevMonthName = MONTHS_PT[monthBack(1)[1]];
  const contabApp = (() => {
    const past = Array.from({ length: 12 }, (_, i) => grossWorked(...monthBack(i + 1)));
    return { mesBruto: grossWorked(viewYear, viewMonth), mesLabel: MONTHS_PT[viewMonth].toLowerCase(), rbt12: past.reduce((a, v) => a + v, 0), meses: past.filter((v) => v > 0).length };
  })();

  const investmentsHistory12 = (() => {
    const arr = [];
    let cursorM = viewMonth, cursorY = viewYear;
    const monthsWindow = [];
    for (let i = chartMonths - 1; i >= 0; i--) {
      let m = viewMonth - i, y = viewYear;
      while (m < 0) { m += 12; y -= 1; }
      monthsWindow.push({ y, m });
    }
    const windowStart = monthsWindow[0];
    const before = investments.filter((inv) => {
      if (inv.posicaoInicial) return true; // a posição inicial já é o ponto de partida do acumulado, sem virar aporte de um mês
      const [iy, im] = inv.date.split("-").map(Number);
      return iy < windowStart.y || (iy === windowStart.y && im - 1 < windowStart.m);
    }).reduce((a, i) => a + Number(i.amount || 0), 0);
    let cumulative = before;
    monthsWindow.forEach(({ y, m }) => {
      const monthTotal = investments.filter((i) => !i.posicaoInicial && inMonth(i.date, y, m)).reduce((a, i) => a + Number(i.amount || 0), 0);
      cumulative += monthTotal;
      arr.push({ full: MONTHS_PT[m] + " " + y, label: MONTHS_ABBR_PT[m], aporte: Math.round(monthTotal * 100) / 100, acumulado: Math.round(cumulative * 100) / 100 });
    });
    return arr;
  })();

  const totalRecebidoAllTime = useMemo(() => {
    let total = shifts.filter((s) => s.recebido).reduce((a, s) => a + netOf(s.gross, vinculoMap[s.vinculoId] ? vinculoMap[s.vinculoId].taxOverride : null), 0);
    vinculos.filter((v) => v.tipo === "mensal").forEach((v) => {
      const rmap = v.recebidoMonths || {};
      total += Object.keys(rmap).filter((k) => rmap[k]).length * netOf(v.valorMensal, v.taxOverride);
    });
    extraRecurringIncomes.forEach((e) => {
      const rmap = e.recebidoMonths || {};
      total += Object.keys(rmap).filter((k) => rmap[k]).length * netOf(e.amount, e.taxOverride);
    });
    oneOffIncomes.forEach((o) => { if (o.recebido) total += Number(o.amount || 0); });
    return total;
  }, [shifts, vinculos, extraRecurringIncomes, oneOffIncomes, vinculoMap, netOf]);

  const totalPagoAllTime = useMemo(() => {
    let total = expenses.filter((e) => e.paid).reduce((a, e) => a + Number(e.amount || 0), 0);
    recurringExpenses.forEach((r) => {
      const pmap = r.paidMonths || {};
      total += Object.values(pmap).filter((x) => x && x.paid).length * Number(r.amount || 0);
    });
    return total;
  }, [expenses, recurringExpenses]);

  const totalInvestedAllTime = investments.filter((i) => !i.posicaoInicial).reduce((a, i) => a + Number(i.amount || 0), 0);
  // os ajustes de preço médio entram aqui para o patrimônio não mudar quando o custo da posição é corrigido
  const posicaoInicialTotal = investments.filter((i) => i.posicaoInicial).reduce((a, i) => a + Number(i.amount || 0), 0) + ajustesPM(investments);
  const portfolio = useMemo(() => computePortfolio(investments, cotacoes), [investments, cotacoes]);
  // meta: valor informado à mão, o valor atual dos investimentos ou o patrimônio total (os dois últimos mudam sozinhos)
  // ---- patrimônio total (recebido - pago, independente de estar em caixa ou investido) ----
  const patrimonioTotal = totalRecebidoAllTime - totalPagoAllTime + posicaoInicialTotal + portfolio.unrealized;
  const valorDaMeta = (g) => (g.fonte === "carteira" ? (portfolio.totalValue || 0) : g.fonte === "patrimonio" ? Math.max(0, patrimonioTotal) : Number(g.valorAtual) || 0);
  const setGoalFonte = (id, fonte) => setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, fonte } : g)));
  const setGoalPatch = (id, patch) => setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  // média do que você investiu por mês nos últimos 6 meses fechados (ou desde o primeiro aporte, se faz menos tempo)
  const aporteMedio = useMemo(() => {
    const now = new Date(), cur = now.getFullYear() * 12 + now.getMonth();
    const lanc = investments.filter((i) => !i.posicaoInicial && i.tipo !== "ajuste" && i.date);
    const idx = (iso) => Number(String(iso).slice(0, 4)) * 12 + Number(String(iso).slice(5, 7)) - 1;
    if (!lanc.length) return 0;
    const primeiro = Math.min(...lanc.map((i) => idx(i.date)));
    const meses = Math.max(1, Math.min(6, cur - primeiro));
    const tot = lanc.filter((i) => idx(i.date) >= cur - meses && idx(i.date) < cur).reduce((a, i) => a + (Number(i.amount) || 0), 0);
    if (cur - primeiro <= 0) return Math.max(0, lanc.filter((i) => idx(i.date) === cur).reduce((a, i) => a + (Number(i.amount) || 0), 0));
    return Math.max(0, tot / meses);
  }, [investments]);
  const saldoRealizado = totalRecebidoAllTime - totalPagoAllTime - totalInvestedAllTime;

  const scopedExpenseAmounts = chartScope === "all" ? expenses.concat(recurringExpenses.map(r => ({ description: r.description, amount: r.amount }))) : monthExpenseItems;
  const scopedInvestments = chartScope === "all" ? investments : monthInvestments;
  const expensesByDesc = useMemo(() => {
    const map = {};
    scopedExpenseAmounts.forEach((e) => { map[e.description] = (map[e.description] || 0) + Number(e.amount || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [scopedExpenseAmounts]);
  const investByCategory = useMemo(() => {
    const map = {};
    scopedInvestments.forEach((i) => { const cat = i.category || "Outro"; map[cat] = (map[cat] || 0) + Number(i.amount || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [scopedInvestments]);

  const workAll = (() => {
    if (chartScope !== "all") return workCur;
    const keys = new Set(); shifts.concat(presencas).forEach((x) => { if (x.date) keys.add(x.date.slice(0, 7)); });
    const fim = monthKeyOf(new Date().getFullYear(), new Date().getMonth());
    vinculos.forEach((v) => { if (v.tipo !== "mensal" || !(v.escala || []).length || !v.startMonth) return; for (let k = v.startMonth, n = 0; k <= fim && n < 240; k = shiftMonthKey(k, 1), n++) keys.add(k); });
    let hours = 0, net = 0;
    keys.forEach((k) => { const [yy, mm] = k.split("-").map(Number); const w = workStats(yy, mm - 1); hours += w.hours; net += w.net; });
    return { hours, net, hourly: hours > 0 ? net / hours : 0 };
  })();
  const scopedHours = workAll.hours;
  const scopedNet = chartScope === "all" ? totalRecebidoAllTime : totalNet;
  const scopedExpensesTotal = chartScope === "all" ? totalPagoAllTime : totalExpensesMonth;
  const scopedInvested = chartScope === "all" ? totalInvestedAllTime : totalInvestedMonth;
  const hourlyRate = workAll.hourly;
  const leftover = scopedNet - scopedExpensesTotal - scopedInvested;

  const downloadBackup = () => {
    const data = JSON.stringify({ vinculos, shifts, presencas, extraRecurringIncomes, expenses, recurringExpenses, investments, goals, taxRateGeral, cotacoes, brapiToken, oneOffIncomes, importedKeys, importLog, limits, contab }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `mediplan-backup-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };
  const handleImportFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        setVinculos(d.vinculos || []); setShifts(d.shifts || []); setPresencas(d.presencas || []);
        setExtraRecurringIncomes(d.extraRecurringIncomes || []); setExpenses(d.expenses || []);
        setRecurringExpenses(d.recurringExpenses || []); setInvestments(d.investments || []);
        setCotacoes(d.cotacoes || {}); setBrapiToken(d.brapiToken || "");
        setGoals(d.goals || []);
        setOneOffIncomes(d.oneOffIncomes || []); setImportedKeys(d.importedKeys || {}); setImportLog(d.importLog || []); setLimits(d.limits || {}); setContab({ ...CONTAB_DEFAULT, ...(d.contab || {}) });
        setTaxRateGeral(d.taxRateGeral ?? 27.5);
      } catch (e) { alert("Não foi possível ler esse arquivo de backup."); }
    };
    reader.readAsText(file);
  };


  const setLimit = (cat, val) => setLimits((p) => { const n = { ...p }; const v = Number(String(val).replace(",", ".")); if (v > 0) n[cat] = v; else delete n[cat]; return n; });


  // ---- insights automáticos (calculados no aparelho) ----
  const insights = (() => {
    const list = [];
    const mAgo = (k) => { let m = viewMonth - k, y = viewYear; while (m < 0) { m += 12; y -= 1; } return [y, m]; };
    const mName = (k) => MONTHS_PT[mAgo(k)[1]].toLowerCase();
    const avg = (arr, f) => (arr.length ? arr.reduce((a, x) => a + f(x), 0) / arr.length : 0);
    const pctTxt = (x) => Math.round(Math.abs(x) * 100) + "%";
    const cur = curStats, prev = prevStats;
    const past = [1, 2, 3, 4, 5, 6].map((k) => { const [y, m] = mAgo(k); return { y, m, ...monthStats(y, m) }; }).filter((x) => x.net > 0 || x.expTotal > 0);
    const isCurrentRealMonth = viewYear === new Date().getFullYear() && viewMonth === new Date().getMonth();

    // ganho por hora pelo mês trabalhado (não pelo mês em que caiu o dinheiro)
    const workRate = (ks) => {
      const hv = {};
      ks.forEach((k) => {
        const [y, m] = mAgo(k);
        shifts.filter((x) => inMonth(x.date, y, m) && Number(x.hours) > 0).forEach((x) => {
          const v = vinculoMap[x.vinculoId]; if (!v) return;
          const o = (hv[v.id] = hv[v.id] || { nome: v.nome, net: 0, h: 0 }); o.net += netOf(x.gross, v.taxOverride); o.h += Number(x.hours);
        });
        vinculos.filter((v) => v.tipo === "mensal" && v.startMonth <= monthKeyOf(y, m)).forEach((v) => {
          const h = (workStats(y, m).byVinculo.find((o) => o.id === v.id) || { hours: 0 }).hours;
          if (h <= 0) return;
          const o = (hv[v.id] = hv[v.id] || { nome: v.nome, net: 0, h: 0 }); o.net += netOf(v.valorMensal, v.taxOverride); o.h += h;
        });
      });
      return Object.values(hv).filter((o) => o.h > 0);
    };

    // 1. receita vs mês anterior
    if (prev.net > 0 && cur.net > 0) {
      const ch = (cur.net - prev.net) / prev.net;
      if (Math.abs(ch) >= 0.1) {
        const by = (items) => { const o = {}; items.forEach((i) => { o[i.nome] = (o[i.nome] || 0) + i.net; }); return o; };
        const [py, pm] = mAgo(1);
        const a = by(buildIncomeItems(viewYear, viewMonth)), b = by(buildIncomeItems(py, pm));
        const drv = [...new Set(Object.keys(a).concat(Object.keys(b)))].map((n) => ({ n, d: (a[n] || 0) - (b[n] || 0) })).sort((x, y) => (ch > 0 ? y.d - x.d : x.d - y.d))[0];
        list.push({ id: "rec", tone: ch > 0 ? "good" : "bad", title: `Receita ${ch > 0 ? "subiu" : "caiu"} ${pctTxt(ch)} em relação a ${mName(1)}`,
          text: `São ${fmtBRL(Math.abs(cur.net - prev.net))} a ${ch > 0 ? "mais" : "menos"}${drv && Math.abs(drv.d) >= 1 ? `, principalmente por ${drv.n} (${drv.d > 0 ? "+" : "−"}${fmtBRL(Math.abs(drv.d))})` : ""}.` });
      }
    }

    // 2. despesas vs média
    const avgExp = avg(past, (x) => x.expTotal);
    if (avgExp > 0 && cur.expTotal > 0) {
      const ch = (cur.expTotal - avgExp) / avgExp;
      if (Math.abs(ch) >= 0.15) {
        const catOf = (items) => { const o = {}; items.forEach((e) => { o[e.category] = (o[e.category] || 0) + e.amount; }); return o; };
        const [py, pm] = mAgo(1);
        const a = catOf(monthExpenseItems), b = catOf(buildExpenseItems(py, pm));
        const drv = Object.keys(a).map((c) => ({ c, d: a[c] - (b[c] || 0) })).sort((x, y) => y.d - x.d)[0];
        list.push({ id: "desp", tone: ch > 0 ? "bad" : "good", title: `Despesas ${pctTxt(ch)} ${ch > 0 ? "acima" : "abaixo"} da sua média`,
          text: `Neste mês: ${fmtBRL(cur.expTotal)}. Média dos meses anteriores: ${fmtBRL(avgExp)}.${ch > 0 && drv && drv.d > 0 ? ` A maior alta em relação a ${mName(1)} foi em ${(EXP_CAT_MAP[drv.c] || EXP_CAT_MAP.outros).label} (+${fmtBRL(drv.d)}).` : ""}` });
      }
    }

    // 3. quanto sobra da renda
    if (cur.net > 0) {
      const rate = (cur.net - cur.expTotal) / cur.net;
      if (rate < 0) list.push({ id: "pou", tone: "bad", title: "Neste mês você gasta mais do que recebe", text: `As despesas passam a receita em ${fmtBRL(cur.expTotal - cur.net)}. Vale rever as maiores categorias de gasto.` });
      else if (rate < 0.1) list.push({ id: "pou", tone: "warn", title: `Sobra só ${pctTxt(rate)} da renda`, text: `Depois das despesas restam ${fmtBRL(cur.net - cur.expTotal)}. Uma referência comum é guardar pelo menos 20%.` });
      else if (rate >= 0.3) list.push({ id: "pou", tone: "good", title: `Você pode guardar ${pctTxt(rate)} da renda`, text: `Depois das despesas sobram ${fmtBRL(cur.net - cur.expTotal)} neste mês.` });
    }

    // 4. ganho por hora por vínculo (últimos 3 meses trabalhados)
    const rates = workRate([0, 1, 2]).filter((o) => o.h >= 6).map((o) => ({ ...o, r: o.net / o.h })).sort((a, b) => b.r - a.r);
    if (rates.length >= 2) {
      const best = rates[0], worst = rates[rates.length - 1];
      const diff = best.r / worst.r - 1;
      if (diff >= 0.15) list.push({ id: "hora", tone: "info", title: `${best.nome} paga ${pctTxt(diff)} mais por hora`, text: `Nos últimos 3 meses: ${best.nome} rende ${fmtBRL(best.r)} por hora líquida e ${worst.nome}, ${fmtBRL(worst.r)}.` });
    }
    // 5. tendência do ganho por hora
    const rateOf = (arr) => { const n = arr.reduce((a, o) => a + o.net, 0), h = arr.reduce((a, o) => a + o.h, 0); return h > 0 ? n / h : 0; };
    const rNow = rateOf(workRate([0])), rPast = rateOf(workRate([1, 2, 3]));
    if (rNow > 0 && rPast > 0) {
      const ch = (rNow - rPast) / rPast;
      if (ch <= -0.1) list.push({ id: "hora2", tone: "warn", title: `Ganho por hora caiu ${pctTxt(ch)}`, text: `Neste mês ${fmtBRL(rNow)}/h, contra ${fmtBRL(rPast)}/h nos 3 meses anteriores. Plantões mais baratos ou mais horas no vínculo mensal puxam a média para baixo.` });
      else if (ch >= 0.1) list.push({ id: "hora2", tone: "good", title: `Ganho por hora subiu ${pctTxt(ch)}`, text: `Neste mês ${fmtBRL(rNow)}/h, contra ${fmtBRL(rPast)}/h nos 3 meses anteriores.` });
    }

    // 6. carga de trabalho
    const weekly = cur.hours / (new Date(viewYear, viewMonth + 1, 0).getDate() / 7);
    if (weekly > 60) list.push({ id: "carga", tone: weekly > 80 ? "bad" : "warn", title: `Média de ${Math.round(weekly)} horas por semana`, text: `Você lançou ${Math.round(cur.hours)} horas em ${MONTHS_PT[viewMonth].toLowerCase()}. Vale olhar se o ritmo é sustentável.` });

    // 7. recebimentos atrasados de meses anteriores
    const late = [];
    [1, 2, 3].forEach((k) => { const [y, m] = mAgo(k); buildIncomeItems(y, m).filter((i) => !i.recebido).forEach((i) => late.push({ ...i, mon: MONTHS_ABBR_PT[m].toLowerCase() })); });
    if (late.length) {
      const tot = late.reduce((a, i) => a + i.net, 0);
      const names = [...new Set(late.map((i) => `${i.nome} (${i.mon})`))].slice(0, 3).join(", ");
      list.push({ id: "atraso", tone: "bad", title: `${fmtBRL(tot)} de meses anteriores sem recebimento`, text: `Ainda não marcados como recebidos: ${names}${late.length > 3 ? " e outros" : ""}. Se já caiu na conta, marque em Receitas ou importe o extrato.` });
    }

    // 8. concentração da renda
    const byV = {}; monthIncomeItems.forEach((i) => { byV[i.nome] = (byV[i.nome] || 0) + i.net; });
    const tot = Object.values(byV).reduce((a, v) => a + v, 0);
    const top = Object.entries(byV).sort((a, b) => b[1] - a[1])[0];
    if (top && tot > 0 && Object.keys(byV).length >= 2 && top[1] / tot >= 0.6) list.push({ id: "conc", tone: "info", title: `${pctTxt(top[1] / tot)} da renda vem de ${top[0]}`, text: "Se esse pagamento atrasar, o impacto no mês é grande. Ter uma reserva cobre esse risco." });

    // 9. projeção até o fim do mês
    if (isCurrentRealMonth) {
      const pin = monthIncomeItems.filter((i) => !i.recebido).reduce((a, i) => a + i.net, 0);
      if (pin > 0 || totalPendingExpenses > 0) list.push({ id: "proj", tone: "info", title: `Saldo previsto no fim do mês: ${fmtBRL(saldoRealizado + pin - totalPendingExpenses)}`, text: `Ainda devem entrar ${fmtBRL(pin)} e sair ${fmtBRL(totalPendingExpenses)} em contas pendentes.` });
    }

    // 10. reserva de emergência
    const avgExpAll = avg(past.concat([{ ...cur }]).filter((x) => x.expTotal > 0), (x) => x.expTotal);
    if (avgExpAll > 0) {
      const liquid = Math.max(0, saldoRealizado) + portfolio.positions.filter((p) => p.category === "Reserva de oportunidade" || p.category === "Renda Fixa").reduce((a, p) => a + p.value, 0);
      const months = liquid / avgExpAll;
      list.push({ id: "reserva", tone: months >= 6 ? "good" : months >= 3 ? "warn" : "bad", title: `Sua reserva cobre ${months.toFixed(1).replace(".", ",")} meses de despesas`,
        text: `${fmtBRL(liquid)} em caixa, renda fixa e reserva, para uma despesa média de ${fmtBRL(avgExpAll)} por mês. ${months >= 6 ? "Acima dos 6 meses que costumam ser recomendados." : "Uma referência comum é ter 6 meses guardados."}` });
    }

    // 11. metas
    const avgSave = avg(past.concat([{ ...cur }]).filter((x) => x.net > 0), (x) => x.net - x.expTotal);
    goals.filter((g) => valorDaMeta(g) < g.valorAlvo).slice(0, 2).forEach((g) => {
      const falta = g.valorAlvo - valorDaMeta(g);
      if (g.prazo) {
        const t = new Date(), d = new Date(g.prazo + "T12:00:00");
        const ml = Math.max(1, (d.getFullYear() - t.getFullYear()) * 12 + d.getMonth() - t.getMonth());
        const need = falta / ml;
        if (avgSave <= 0) list.push({ id: "meta" + g.id, tone: "bad", title: `Meta "${g.nome}" em risco`, text: `Faltam ${fmtBRL(falta)} em ${ml} meses (${fmtBRL(need)}/mês), mas a sua sobra média hoje é zero ou negativa.` });
        else if (need > avgSave) list.push({ id: "meta" + g.id, tone: "warn", title: `Meta "${g.nome}" precisa de ${fmtBRL(need)} por mês`, text: `Sua sobra média é ${fmtBRL(avgSave)}. No ritmo atual, a meta fica para daqui a ${Math.ceil(falta / avgSave)} meses, depois do prazo.` });
        else list.push({ id: "meta" + g.id, tone: "good", title: `Meta "${g.nome}" dentro do prazo`, text: `Precisa de ${fmtBRL(need)} por mês e sua sobra média é ${fmtBRL(avgSave)}.` });
      } else if (avgSave > 0) {
        const n = Math.ceil(falta / avgSave);
        const d = new Date(); d.setMonth(d.getMonth() + n);
        list.push({ id: "meta" + g.id, tone: "info", title: `Meta "${g.nome}" em cerca de ${n} meses`, text: `Se você direcionar a sua sobra média (${fmtBRL(avgSave)}/mês), chega lá por volta de ${MONTHS_PT[d.getMonth()].toLowerCase()} de ${d.getFullYear()}.` });
      }
    });

    // 12. carteira
    if (portfolio.totalValue > 0) {
      const cls = {}; portfolio.positions.forEach((p) => { cls[p.category] = (cls[p.category] || 0) + p.value; });
      const topC = Object.entries(cls).sort((a, b) => b[1] - a[1])[0];
      if (topC && topC[1] / portfolio.totalValue >= 0.7 && Object.keys(cls).length >= 1) list.push({ id: "cart", tone: "info", title: `${pctTxt(topC[1] / portfolio.totalValue)} da carteira está em ${topC[0]}`, text: "Concentração alta numa classe aumenta o risco. Veja a distribuição em Investimentos." });
      const semCot = portfolio.positions.filter((p) => p.isQty && !(p.cotacao > 0)).length;
      if (semCot > 0) list.push({ id: "cot", tone: "info", title: `${semCot} ativo(s) sem cotação atualizada`, text: "A rentabilidade fica pelo preço de compra. Importe a planilha de posição da B3 ou informe a cotação em Investimentos." });
    }

    // 13. contas fixas
    const recTotal = monthExpenseItems.filter((e) => e.tipo === "recorrente").reduce((a, e) => a + e.amount, 0);
    const avgNet = avg(past.concat([{ ...cur }]).filter((x) => x.net > 0), (x) => x.net);
    if (avgNet > 0 && recTotal / avgNet >= 0.5) list.push({ id: "fixas", tone: "warn", title: `Contas fixas levam ${pctTxt(recTotal / avgNet)} da renda média`, text: `São ${fmtBRL(recTotal)} por mês em despesas recorrentes, contra uma renda média de ${fmtBRL(avgNet)}.` });

    const w = { bad: 4, warn: 3, good: 2, info: 1 };
    return list.sort((a, b) => w[b.tone] - w[a.tone]);
  })();

  // ---- importação de extratos ----
  const commitImport = (rows, label, fat) => {
    const bid = uid();
    const newExp = [], newInc = [], keys = [], fatItens = [];
    let baixas = 0;
    rows.forEach((r) => {
      if (r.action === "ignorar") return;
      keys.push(r.key);
      if (r.action === "novo" && fat) fatItens.push({ d: cleanDesc(r.desc), v: Math.abs(r.amount), dt: r.date, c: r.category });
      else if (r.action === "novo") newExp.push({ id: uid() + newExp.length, description: cleanDesc(r.desc), category: r.category, amount: Math.abs(r.amount), dueDate: r.date, paid: true, paidDate: r.date, imported: true, batch: bid });
      else if (r.action === "receita") newInc.push({ id: uid() + newInc.length, description: cleanDesc(r.desc), amount: Math.abs(r.amount), date: r.date, recebido: true, batch: bid });
      else if (r.action === "baixar" && r.matchItem) { if (!r.matchItem.paid) r.matchItem.toggle(); baixas++; }
      else if (r.action === "receber" && r.matchItem) { if (!r.matchItem.recebido) r.matchItem.toggle(); baixas++; }
    });
    // fatura do cartão: uma despesa só, com cada compra guardada dentro dela
    if (fat && fatItens.length) {
      const soma = Math.round(fatItens.reduce((a, i) => a + i.v, 0) * 100) / 100;
      const tot = Number(fat.total) > 0 ? Math.round(Number(fat.total) * 100) / 100 : soma;
      const ajuste = Math.round((tot - soma) * 100) / 100;
      newExp.push({ id: uid() + "f", description: cleanDesc(fat.nome) || "Cartão de crédito", category: "cartao", amount: tot, ...(Math.abs(ajuste) >= 0.01 ? { ajuste } : {}), dueDate: fat.dueDate, paid: !!fat.paid, ...(fat.paid ? { paidDate: fat.dueDate } : {}), imported: true, batch: bid, itens: fatItens });
    }
    setExpenses((p) => [...p, ...newExp]);
    setOneOffIncomes((p) => [...p, ...newInc]);
    setImportedKeys((p) => { const n = { ...p }; keys.forEach((k) => { n[k] = bid; }); return n; });
    const entry = { id: bid, date: todayStr(), label, ...(fat && fatItens.length ? { fatura: fatItens.length } : {}), despesas: newExp.length, entradas: newInc.length, baixas, total: newExp.reduce((a, e) => a + e.amount, 0) };
    setImportLog((p) => [entry, ...p].slice(0, 30));
    return entry;
  };
  const commitB3 = (rows, label) => {
    const bid = uid(); const newInv = []; const cot = {}; const keys = []; let nC = 0;
    const today = todayStr();
    const mk = (o) => ({ id: uid() + newInv.length, assetName: "", batch: bid, ...o });
    rows.forEach((r) => {
      if (r.action === "ignorar") return;
      if (r.kind === "trade") {
        keys.push(r.key);
        newInv.push(mk({ description: r.ticker, assetName: r.name || ASSET_NAME[r.ticker] || "", category: r.category, date: r.date, tipo: r.side, qty: r.qty, price: r.price, amount: r.side === "venda" ? -r.amount : r.amount, source: "b3" }));
        return;
      }
      if (r.category === "Renda Fixa") {
        if (r.action === "valor" && r.target) { cot[r.target] = r.value; nC++; }
        else if (r.action === "criar") { newInv.push(mk({ description: r.ticker, category: "Renda Fixa", date: today, tipo: "compra", qty: 0, price: 0, amount: r.applied || r.value, source: "b3pos" })); cot[r.ticker] = r.value; nC++; }
        return;
      }
      if (r.price > 0) { cot[r.ticker] = r.price; nC++; }
      if (r.action === "criar") newInv.push(mk({ description: r.ticker, assetName: r.name || ASSET_NAME[r.ticker] || "", category: r.category, date: today, tipo: "compra", qty: r.qty, price: r.price, amount: r.qty * r.price, source: "b3pos" }));
      else if (r.action === "ajustar" && r.diff) {
        const q = Math.abs(r.diff);
        newInv.push(mk({ description: r.ticker, assetName: r.name || ASSET_NAME[r.ticker] || "", category: r.category, date: today, tipo: r.diff > 0 ? "compra" : "venda", qty: q, price: r.price, amount: (r.diff > 0 ? 1 : -1) * q * r.price, source: "b3pos" }));
      }
    });
    setInvestments((p) => [...p, ...newInv]);
    setCotacoes((p) => ({ ...p, ...cot }));
    setImportedKeys((p) => { const n = { ...p }; keys.forEach((k) => { n[k] = bid; }); return n; });
    const entry = { id: bid, date: today, label, despesas: 0, entradas: 0, baixas: 0, investimentos: newInv.length, cotacoes: nC, total: 0 };
    setImportLog((p) => [entry, ...p].slice(0, 30));
    return entry;
  };
  const commitPrint = (rows, modo, date) => {
    const bid = uid(); const d = date || todayStr();
    const newInv = rows.map((r, n) => ({ id: uid() + n, batch: bid, description: r.ticker, assetName: ASSET_NAME[r.ticker] || "", category: b3Category(r.ticker), date: d, tipo: "compra", qty: r.qty, price: r.pm, amount: Math.round(r.qty * r.pm * 100) / 100, source: "print", ...(modo === "inicial" ? { posicaoInicial: true } : {}) }));
    setInvestments((p) => [...p, ...newInv]);
    const entry = { id: bid, date: todayStr(), label: modo === "inicial" ? "Print da corretora (carteira inicial)" : "Print da corretora (aporte)", despesas: 0, entradas: 0, baixas: 0, investimentos: newInv.length, cotacoes: 0, total: 0 };
    setImportLog((p) => [entry, ...p].slice(0, 30));
    return entry;
  };
  const undoImport = (bid) => {
    setInvestments((p) => p.filter((i) => i.batch !== bid));
    setExpenses((p) => p.filter((e) => e.batch !== bid));
    setOneOffIncomes((p) => p.filter((o) => o.batch !== bid));
    setImportedKeys((p) => { const n = {}; Object.keys(p).forEach((k) => { if (p[k] !== bid) n[k] = p[k]; }); return n; });
    setImportLog((p) => p.filter((x) => x.id !== bid));
  };

  // ---- apagar lançamentos em massa ----
  // Esvazia as listas pelo mesmo caminho da exclusão individual: a sincronização marca
  // cada item como apagado na nuvem, e ele some dos outros aparelhos sem voltar depois.
  const [wipeUndo, setWipeUndo] = useState(null);
  const wipeData = (cols) => {
    const cur = latestRef.current;
    const chosen = new Set(cols);
    const snapshot = {};
    let removed = 0;
    cols.forEach((c) => { snapshot[c] = cur[c] || []; removed += snapshot[c].length; });
    setWipeUndo({ snapshot, removed, importedKeys: cur.settings.importedKeys, importLog: cur.settings.importLog });
    cols.forEach((c) => settersRef.current[c]([]));
    // libera a reimportação do que foi apagado, para o extrato não ser ignorado como "Já importado antes"
    const importCols = ["expenses", "oneOffIncomes", "investments"];
    const touched = importCols.filter((c) => chosen.has(c));
    if (!touched.length) return;
    const allGone = touched.length === importCols.length;
    const kept = new Set();
    importCols.filter((c) => !chosen.has(c)).forEach((c) => (cur[c] || []).forEach((it) => { if (it.batch) kept.add(it.batch); }));
    const gone = new Set();
    touched.forEach((c) => (cur[c] || []).forEach((it) => { if (it.batch && !kept.has(it.batch)) gone.add(it.batch); }));
    setImportedKeys((p) => { const n = {}; if (!allGone) Object.keys(p).forEach((k) => { if (!gone.has(p[k])) n[k] = p[k]; }); return n; });
    setImportLog((p) => (allGone ? [] : p.filter((x) => !gone.has(x.id))));
  };
  const undoWipe = () => {
    if (!wipeUndo) return;
    Object.keys(wipeUndo.snapshot).forEach((c) => {
      const items = wipeUndo.snapshot[c];
      const ids = new Set(items.map((it) => it.id));
      settersRef.current[c]((p) => [...items, ...p.filter((it) => !ids.has(it.id))]);
    });
    setImportedKeys((p) => ({ ...wipeUndo.importedKeys, ...p }));
    setImportLog((p) => { const ids = new Set(wipeUndo.importLog.map((x) => x.id)); return [...p.filter((x) => !ids.has(x.id)), ...wipeUndo.importLog].slice(0, 30); });
    setWipeUndo(null);
  };


  // ---- alertas / notificações ----
  const alerts = useMemo(() => {
    const list = [];
    const todayIso = todayStr();
    monthExpenseItems.forEach((e) => {
      if (e.paid) return;
      if (e.dateIso < todayIso) list.push({ id: e.key, level: "danger", text: `${e.description} venceu em ${e.dateLabel} e ainda não foi paga` });
      else {
        const days = Math.round((new Date(e.dateIso) - new Date(todayIso)) / 86400000);
        if (days <= 3) list.push({ id: e.key, level: "warning", text: `${e.description} vence em ${e.dateLabel}${days === 0 ? " (hoje)" : ` (em ${days}d)`}` });
      }
    });
    monthIncomeItems.forEach((it) => {
      if (it.tipo !== "plantao" && !it.recebido) list.push({ id: it.key, level: "info", text: `${it.nome} (${it.dateLabel}) ainda não foi marcado como recebido` });
    });
    const spentByCat = {};
    let spentAll = 0;
    monthExpenseItems.forEach((e) => { spentByCat[e.category] = (spentByCat[e.category] || 0) + e.amount; spentAll += e.amount; });
    Object.keys(limits).forEach((c) => {
      const lim = limits[c]; const sp = c === "__total" ? spentAll : (spentByCat[c] || 0);
      if (!lim) return;
      const name = c === "__total" ? "Limite geral do mês" : "Limite de " + ((EXP_CAT_MAP[c] || {}).label || c);
      if (sp >= lim) list.unshift({ id: "lim-" + c, level: "danger", text: `${name}: passou ${fmtBRL(sp - lim)} do limite` });
      else if (sp >= lim * 0.8) list.push({ id: "lim-" + c, level: "warning", text: `${name}: ${Math.round((sp / lim) * 100)}% usado` });
    });
    monthIncomeItems.forEach((it) => {
      if (it.tipo === "plantao" && !it.recebido && it.dateIso < todayIso) list.push({ id: "atraso-" + it.key, level: "danger", text: `${it.nome}: pagamento previsto para ${fmtDatePt(it.dateIso)} ainda não foi marcado como recebido` });
    });
    goals.forEach((g) => {
      if (g.prazo && valorDaMeta(g) < g.valorAlvo && g.prazo < todayIso) list.push({ id: "goal-" + g.id, level: "warning", text: `Meta "${g.nome}" passou do prazo e ainda não foi concluída` });
    });
    return list;
  }, [monthExpenseItems, monthIncomeItems, goals, viewMonth, limits]);

  // ---- relatório mensal em PDF ----
  const generateMonthlyReport = () => {
    if (!window.jspdf) { alert("A biblioteca de PDF ainda está carregando, tente novamente em instantes."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const TIPOS = { plantao: "Plantão", mensal: "Cargo fixo", extra: "Recorrente", avulsa: "Avulsa" };
    const ws = workStats(viewYear, viewMonth), cats = {};
    monthExpenseItems.forEach((e) => { const c = cats[e.category] = cats[e.category] || { id: e.category, nome: (EXP_CAT_MAP[e.category] || EXP_CAT_MAP.outros).label, valor: 0, n: 0, limite: Number(limits[e.category] || 0) }; c.valor += e.amount; c.n += 1; });
    const hist = [];
    for (let k = 5; k >= 0; k--) { const d = new Date(viewYear, viewMonth - k, 1), st = monthStats(d.getFullYear(), d.getMonth()); hist.push({ mes: MONTHS_PT[d.getMonth()] + " de " + d.getFullYear(), liquido: st.net, despesas: st.expTotal, investido: st.invested, sobra: st.leftover }); }
    const D = {
      mesNome: `${MONTHS_PT[viewMonth]} de ${viewYear}`, geradoEm: fmtDatePt(todayStr()),
      bruto: totalGross, liquido: totalNet, despesas: totalExpensesMonth, investido: totalInvestedMonth, sobra: totalNet - totalExpensesMonth - totalInvestedMonth,
      recebido: monthIncomeItems.filter((i) => i.recebido).reduce((a, i) => a + i.net, 0), pago: totalPaidExpenses, patrimonio: patrimonioTotal,
      horas: ws.hours, porHora: ws.hourly, trabalho: ws.byVinculo.map((o) => ({ nome: o.nome, horas: o.hours, liquido: o.net, porHora: o.hourly })),
      receitas: [...monthIncomeItems].sort((a, b) => (a.dateIso || "").localeCompare(b.dateIso || "")).map((i) => ({ quando: i.dateLabel, nome: i.nome, tipo: TIPOS[i.tipo] || i.tipo, bruto: i.gross, liquido: i.net, recebido: i.recebido })),
      despesasItens: [...monthExpenseItems].sort((a, b) => (a.dateIso || "").localeCompare(b.dateIso || "")).map((e) => ({ venc: e.dateLabel, descricao: e.description, categoria: (EXP_CAT_MAP[e.category] || EXP_CAT_MAP.outros).label, tipo: e.tipo === "recorrente" ? "Todo mês" : "Pontual", valor: e.amount, paga: e.paid })),
      cartoes: monthExpenseItems.filter((e) => Array.isArray(e.itens) && e.itens.length).map((e) => { const g = faturaGrupos(e.itens); return { nome: e.description, n: e.itens.length, total: e.amount, grupos: g.map((x) => ({ nome: x.label, n: x.itens.length, valor: x.valor })) }; }),
      categorias: Object.values(cats).sort((a, b) => b.valor - a.valor), limiteGeral: Number(limits.__total || 0),
      aportes: [...monthInvestments].filter((i) => i.tipo !== "ajuste").sort((a, b) => (a.date || "").localeCompare(b.date || "")).map((i) => { const venda = i.tipo === "venda" || Number(i.amount) < 0; return { data: fmtDatePt(i.date), ativo: i.description, classe: i.category, operacao: venda ? "Venda" : "Compra", qtd: i.qty > 0 ? fmtQty(i.qty) : "-", preco: i.qty > 0 ? fmtBRL(i.price) : "-", total: Number(i.amount || 0) }; }),
      carteira: portfolio.positions.map((p) => ({ ativo: p.description, classe: p.category, qtd: p.isQty ? fmtQty(p.qty) : "-", pm: p.isQty ? fmtBRL(p.avg) : "-", cotacao: p.isQty && p.cotacao > 0 ? fmtBRL(p.cotacao) : "-", custo: p.cost, valor: p.value, resultado: p.profit, pct: p.cost > 0 ? p.profitPct : null })),
      carteiraCusto: portfolio.totalCost, carteiraValor: portfolio.totalValue, historico: hist,
    };
    buildMonthlyReport(doc, D);
    doc.save(`mediplan-relatorio-${MONTHS_ABBR_PT[viewMonth]}-${viewYear}.pdf`);
  };


  if (pinHash && locked) {
    return <PinGate hash={pinHash} bioId={bioId} onOk={() => setLocked(false)} onForget={() => { if (!window.confirm("Remover a trava deste aparelho? Seus dados continuam aqui.")) return; setPinHash(""); }} />;
  }

  if (cloudCfg && !cloudSkip && authNeeded && (!session || recovery)) {
    return <AuthScreen key={recovery ? "rec" : "auth"} cfg={cloudCfg} recovery={recovery} onSkip={cloudActions.skip} onRecovered={() => { setRecovery(false); setAuthNeeded(false); }} />;
  }

  return (
    <div className="app">
      <style>{`
        :root {
          --bg: #F1F4F1; --surface: #FFFFFF; --surface-2: #F8FAF8; --surface-3: #EEF3EE;
          --gold: ${GOLD}; --teal: ${TEAL}; --brick: ${BRICK};
          --text: #263532; --text-dim: #7A8B87; --border: rgba(38,53,50,0.09);
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .app { min-height: 100vh; background: var(--bg);
          background-image: radial-gradient(circle at 15% 0%, rgba(76,146,132,0.07), transparent 45%), radial-gradient(circle at 85% 10%, rgba(189,138,61,0.06), transparent 40%);
          color: var(--text); font-family: 'Inter', sans-serif; padding: 20px 16px 60px; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .display { font-family: 'Fraunces', serif; }

        .topbar { max-width: 1020px; margin: 0 auto 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-icon { width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(145deg, var(--teal), #2f6a5c); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .brand-title { font-size: 22px; font-weight: 600; line-height: 1.1; }
        .brand-sub { font-size: 12px; color: var(--text-dim); }

        .month-nav { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 6px 8px; }
        .month-nav button { background: transparent; border: none; color: var(--text); width: 30px; height: 30px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .month-nav button:hover { background: var(--surface-3); }
        .month-label { font-weight: 600; min-width: 148px; text-align: center; font-size: 14px; }

        .hero-bar { max-width: 1020px; margin: 0 auto 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 12px 16px; display: flex; gap: 22px; flex-wrap: wrap; align-items: center; }
        .hero-stat { display: flex; flex-direction: column; gap: 2px; }
        .hero-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); }
        .hero-value { font-size: 15px; font-weight: 700; }

        .backup-bar { max-width: 1020px; margin: 0 auto 14px; display: flex; gap: 8px; flex-wrap: wrap; }
        .backup-bar .btn { background: var(--surface); border: 1px solid var(--border); color: var(--text-dim); }
        .backup-bar .btn:hover { color: var(--text); background: var(--surface-3); }

        .tabs { max-width: 1020px; margin: 0 auto 16px; display: flex; gap: 6px; border-bottom: 1px solid var(--border); overflow-x: auto; }
        .tab-btn { background: transparent; border: none; color: var(--text-dim); padding: 10px 14px; font-size: 13.5px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 7px; white-space: nowrap; }
        .tab-btn.active { color: var(--text); border-bottom-color: var(--teal); }
        .tab-btn:hover { color: var(--text); }

        .panel { max-width: 1020px; margin: 0 auto; }

        .section-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 14px; overflow: hidden; }
        .section-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; cursor: pointer; }
        .section-header:hover { background: var(--surface-3); }
        .section-header-left { display: flex; align-items: center; gap: 10px; }
        .section-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .section-title { font-weight: 700; font-size: 14.5px; }
        .section-sub { font-size: 11.5px; color: var(--text-dim); }
        .section-body { padding: 0 16px 18px; border-top: 1px solid var(--border); padding-top: 14px; }
        .sub-heading { font-size: 12.5px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; margin: 16px 0 8px; }

        .stat-row { display: grid; grid-template-columns: repeat(auto-fit,minmax(140px,1fr)); gap: 10px; margin-bottom: 14px; }
        .stat-card { background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; }
        .stat-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); margin-bottom: 6px; }
        .stat-value { font-size: 17px; font-weight: 600; }
        .stat-value.gold { color: var(--gold); } .stat-value.teal { color: var(--teal); } .stat-value.brick { color: var(--brick); }

        .tax-box { display: flex; align-items: center; gap: 10px; background: var(--surface-2); border: 1px dashed rgba(189,138,61,0.45); border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; flex-wrap: wrap; }
        .tax-box input { width: 80px; background: var(--surface-3); border: 1px solid var(--border); color: var(--gold); border-radius: 7px; padding: 6px 8px; font-family: 'IBM Plex Mono', monospace; font-size: 14px; text-align: center; }
        .tax-box input:focus { outline: none; border-color: var(--gold); }
        .tax-box-label { font-size: 12.5px; color: var(--text-dim); }

        .segmented { display: inline-flex; background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: 3px; margin-bottom: 14px; }
        .seg-btn { background: transparent; border: none; padding: 7px 16px; border-radius: 999px; font-size: 12.5px; font-weight: 600; color: var(--text-dim); cursor: pointer; }
        .seg-btn.active { background: var(--teal); color: #fff; }

        .vinculo-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
        .vinculo-row:last-child { border-bottom: none; }
        .vinculo-left { display: flex; align-items: center; gap: 10px; min-width: 180px; }
        .badge-tipo { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; }
        .badge-tipo.plantao { background: rgba(189,138,61,0.15); color: var(--gold); }
        .badge-tipo.mensal { background: rgba(76,146,132,0.15); color: var(--teal); }
        .badge-tipo.pontual { background: rgba(122,147,160,0.18); color: #7A93A0; }
        .badge-tipo.recorrente { background: rgba(142,127,184,0.18); color: #8E7FB8; }
        .vinculo-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .tax-mini { width: 56px; background: var(--surface-3); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 4px 6px; font-size: 12px; text-align: center; font-family: 'IBM Plex Mono', monospace; }

        .mini-form { background: var(--surface-2); border: 1px dashed var(--border); border-radius: 10px; padding: 12px; margin-top: 10px; }
        .subtle-link { background: none; border: none; color: var(--teal); font-size: 12.5px; font-weight: 700; cursor: pointer; padding: 6px 0; display: inline-flex; align-items: center; gap: 5px; }
        .subtle-link:hover { text-decoration: underline; }

        .shift-line { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; gap: 8px; flex-wrap: wrap; }
        .shift-line:last-child { border-bottom: none; }
        .shift-line-left { display: flex; align-items: center; gap: 9px; }
        .color-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

        .hospital-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .hospital-row:last-child { border-bottom: none; }
        .hospital-row-left { display: flex; align-items: center; gap: 10px; }
        .color-bar { width: 4px; height: 34px; border-radius: 3px; flex-shrink: 0; }
        .hospital-name { font-weight: 600; font-size: 13.5px; }
        .hospital-status { font-size: 11px; }
        .hospital-status.recebido { color: var(--teal); }
        .hospital-status.pendente { color: var(--brick); }
        .hospital-value { font-weight: 700; font-size: 14px; }

        .rhythm-line { font-size: 14px; line-height: 1.6; }
        .rhythm-line b { color: var(--gold); }
        .location-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
        .location-row:last-child { border-bottom: none; }
        .location-left { display: flex; align-items: center; gap: 9px; }

        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .weekday-label { text-align: center; font-size: 11px; color: var(--text-dim); padding-bottom: 4px; }
        .cal-cell { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; min-height: 68px; padding: 6px; cursor: pointer; transition: background .12s; display: flex; flex-direction: column; gap: 4px; }
        .cal-cell:hover { background: var(--surface-3); }
        .cal-cell.empty { background: transparent; border: none; cursor: default; }
        .cal-cell.selected { border-color: var(--gold); background: var(--surface-3); }
        .cal-cell.today .cal-day-num { color: var(--gold); }
        .cal-day-num { font-size: 12px; font-weight: 600; color: var(--text-dim); }
        .cal-chip { font-size: 10px; border-radius: 4px; padding: 1px 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #0d1416; font-weight: 600; }

        .day-panel { margin-top: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
        .day-panel-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }

        .stub-card { position: relative; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px 8px 4px 4px; padding: 10px 12px 12px; margin-bottom: 14px; }
        .stub-tear { position: relative; margin: 8px -12px 0; border-top: 2px dashed rgba(38,53,50,0.16); }
        .stub-tear::before, .stub-tear::after { content: ''; position: absolute; top: -7px; width: 14px; height: 14px; border-radius: 50%; background: var(--surface-2); }
        .stub-tear::before { left: -7px; } .stub-tear::after { right: -7px; }
        .stub-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; padding: 3px 0; }
        .stub-row .k { color: var(--text-dim); } .stub-row .v { font-weight: 600; }
        .stub-head { display: flex; justify-content: space-between; align-items: center; }
        .stub-hospital { font-weight: 700; font-size: 14px; display:flex; align-items:center; gap:6px; }

        .preset-row { display: flex; gap: 6px; margin-top: 4px; }
        .preset-btn { background: var(--surface-3); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 4px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; }
        .preset-btn:hover { background: var(--gold); color: #16130a; border-color: var(--gold); }

        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap: 10px; margin-bottom: 12px; }
        .field label { font-size: 11px; color: var(--text-dim); display: block; margin-bottom: 4px; }
        .field input, .field select { width: 100%; background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 8px 10px; font-size: 13.5px; font-family: inherit; }
        .field input:focus, .field select:focus { outline: none; border-color: var(--gold); }
        .field.color-field { display: flex; flex-direction: column; }
        .color-input-wrap { display: flex; align-items: center; gap: 8px; }
        .color-input-wrap input[type=color] { width: 40px; height: 36px; padding: 2px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); cursor: pointer; }

        .btn { border: none; border-radius: 8px; padding: 9px 16px; font-size: 13.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .btn-primary { background: var(--gold); color: #16130a; } .btn-primary:hover { filter: brightness(1.08); }
        .btn-ghost { background: var(--surface-3); color: var(--text); } .btn-ghost:hover { background: #e2e9e3; }
        .btn-icon { background: transparent; color: var(--text-dim); padding: 6px; border: none; cursor: pointer; }
        .btn-icon:hover { color: var(--brick); }

        .list-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; flex-wrap: wrap; }
        .list-row-main { display: flex; flex-direction: column; gap: 2px; min-width: 160px; }
        .list-row-title { font-weight: 600; font-size: 14px; }
        .list-row-sub { font-size: 12px; color: var(--text-dim); }
        .list-row-right { display: flex; align-items: center; gap: 12px; }
        .amount { font-size: 15px; font-weight: 600; }

        .badge { font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.03em; border: none; cursor: pointer; }
        .badge-paid { background: rgba(76,146,132,0.15); color: var(--teal); }
        .badge-pending { background: rgba(188,109,87,0.15); color: var(--brick); }

        .empty-state { text-align: center; color: var(--text-dim); font-size: 13px; padding: 24px 10px; }

        .chart-scope { display: flex; gap: 8px; margin-bottom: 16px; }
        .scope-btn { background: var(--surface); border: 1px solid var(--border); color: var(--text-dim); padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .scope-btn.active { background: var(--gold); color: #16130a; border-color: var(--gold); }

        .chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 16px; }
        .chart-title { font-size: 13.5px; font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 7px; }
        .chart-title .n { color: var(--text-dim); font-weight: 400; font-size: 12px; }

        .donut-wrap { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
        .donut-total { font-size: 12px; }

        .invest-group-title { font-size: 12.5px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.04em; margin: 14px 0 6px; display: flex; justify-content: space-between; }

        .alert-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 13px; margin-bottom: 8px; }
        .alert-item:last-child { margin-bottom: 0; }
        .alert-danger { background: rgba(188,109,87,0.12); color: var(--brick); }
        .alert-warning { background: rgba(189,138,61,0.12); color: var(--gold); }
        .alert-info { background: rgba(76,146,132,0.12); color: var(--teal); }

        .progress-track { width: 100%; height: 8px; background: var(--surface-3); border-radius: 999px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 999px; transition: width .3s; }


        /* ---- ajustes de layout v3 ---- */
        .app { padding-bottom: 96px; }
        .topbar { position: sticky; top: 0; z-index: 30; background: rgba(241,244,241,0.92); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); margin: 0 auto 10px; padding: 10px 2px; border-bottom: 1px solid var(--border); }
        .hero-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; box-shadow: 0 1px 2px rgba(38,53,50,0.04); }
        .hero-value { font-size: 14.5px; }
        .section-card, .chart-card, .day-panel, .list-row { box-shadow: 0 1px 2px rgba(38,53,50,0.04); }
        .field input, .field select { min-height: 42px; }
        .btn { min-height: 42px; }
        .btn-primary { box-shadow: 0 2px 6px rgba(189,138,61,0.28); }
        .field-hint { font-size: 12px; color: var(--text-dim); margin-top: 6px; }
        .field-hint b { color: var(--teal); }

        .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-dim); border-radius: 999px; padding: 8px 13px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .chip.active { background: var(--teal); border-color: var(--teal); color: #fff; }

        .bottom-nav { display: none; }
        .sheet-backdrop { position: fixed; inset: 0; background: rgba(20,30,28,0.35); z-index: 60; display: flex; align-items: flex-end; justify-content: center; }
        .sheet { width: 100%; max-width: 520px; background: var(--surface); border-radius: 20px 20px 0 0; padding: 10px 14px 28px; box-shadow: 0 -8px 30px rgba(0,0,0,0.15); }
        .sheet-handle { width: 40px; height: 4px; border-radius: 4px; background: var(--border); margin: 0 auto 10px; }
        .sheet-item { width: 100%; display: flex; align-items: center; gap: 12px; background: transparent; border: none; padding: 13px 8px; font-size: 15px; font-weight: 600; color: var(--text); border-radius: 12px; cursor: pointer; text-align: left; }
        .sheet-item.active { background: var(--surface-3); color: var(--teal); }
        .sheet-ico { width: 34px; height: 34px; border-radius: 10px; background: var(--surface-3); display: flex; align-items: center; justify-content: center; color: var(--teal); }

        /* despesas */
        .exp-summary { background: linear-gradient(145deg, #3f8274, #2f6a5c); color: #fff; border-radius: 16px; padding: 16px; margin-bottom: 14px; box-shadow: 0 4px 14px rgba(47,106,92,0.25); }
        .exp-summary-top { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .exp-summary .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; opacity: .8; }
        .exp-summary .big { font-size: 24px; font-weight: 700; margin-top: 2px; }
        .exp-summary .small { font-size: 14px; font-weight: 600; margin-top: 2px; }
        .exp-bar { height: 8px; border-radius: 999px; background: rgba(255,255,255,0.25); margin-top: 14px; overflow: hidden; }
        .exp-bar > div { height: 100%; background: #fff; border-radius: 999px; transition: width .3s; }
        .exp-cat-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 10px; -webkit-overflow-scrolling: touch; }
        .exp-cat-tile { flex: 0 0 auto; min-width: 92px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 10px; text-align: center; }
        .exp-cat-tile .em { font-size: 24px; line-height: 1; }
        .exp-cat-tile .nm { font-size: 11px; color: var(--text-dim); margin-top: 4px; }
        .exp-cat-tile .vl { font-size: 12.5px; font-weight: 700; margin-top: 2px; }
        .exp-card { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(38,53,50,0.04); }
        .exp-card.paid { opacity: .72; }
        .exp-ico { width: 50px; height: 50px; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0; }
        .exp-body { flex: 1; min-width: 0; }
        .exp-title { font-weight: 700; font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .exp-sub { font-size: 12px; color: var(--text-dim); margin-top: 2px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
        .exp-side { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
        .exp-amount { font-weight: 700; font-size: 15px; }
        .exp-card.paid .exp-title { text-decoration: line-through; text-decoration-color: rgba(38,53,50,0.3); }
        .badge-late { background: rgba(188,109,87,0.2); color: var(--brick); font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; text-transform: uppercase; }
        .cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .cat-btn { background: var(--surface-2); border: 1.5px solid var(--border); border-radius: 14px; padding: 8px 2px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 600; color: var(--text-dim); }
        .cat-btn .em { font-size: 22px; line-height: 1.1; }
        .cat-btn.active { border-color: var(--teal); background: rgba(76,146,132,0.1); color: var(--text); }
        .filter-row { display: flex; gap: 6px; margin-bottom: 12px; }

        /* investimentos */
        .asset-wrap { position: relative; }
        .asset-list { position: absolute; left: 0; right: 0; top: calc(100% + 4px); background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.16); z-index: 40; max-height: 300px; overflow-y: auto; }
        .asset-item { display: flex; align-items: baseline; gap: 10px; padding: 11px 12px; cursor: pointer; border-bottom: 1px solid var(--border); }
        .asset-item:last-child { border-bottom: none; }
        .asset-item:hover, .asset-item:active { background: var(--surface-3); }
        .asset-tk { font-weight: 700; font-size: 14px; font-family: 'IBM Plex Mono', monospace; }
        .asset-nm { font-size: 12px; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .inv-cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
        .inv-cat-btn { background: var(--surface-2); border: 1.5px solid var(--border); border-radius: 14px; padding: 10px 4px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; color: var(--text-dim); text-align: center; line-height: 1.15; }
        .inv-cat-btn .em { font-size: 22px; }
        .inv-cat-btn.active { color: var(--text); background: #fff; }
        .inv-head { display: flex; align-items: center; gap: 10px; }
        .inv-head .em { width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }

        @media (max-width: 720px) {
          .app { padding: 0 12px 100px; }
          .topbar { padding: 10px 0; margin-bottom: 8px; }
          .brand-sub { display: none; }
          .brand-icon { width: 36px; height: 36px; }
          .brand-title { font-size: 19px; }
          .month-label { min-width: 118px; font-size: 13px; }
          .tabs { display: none; }
          .hero-bar { grid-template-columns: 1fr 1fr; padding: 12px; gap: 10px 14px; }
          .bottom-nav { display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; background: rgba(255,255,255,0.97); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-top: 1px solid var(--border); padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); box-shadow: 0 -4px 16px rgba(38,53,50,0.07); }
          .bn-btn { flex: 1; background: transparent; border: none; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 0; color: var(--text-dim); font-size: 10.5px; font-weight: 600; cursor: pointer; border-radius: 12px; }
          .bn-btn.active { color: var(--teal); }
          .bn-btn.active svg { stroke-width: 2.4; }
          .cal-cell { min-height: 56px; padding: 4px; }
          .cal-chip { font-size: 9px; padding: 1px 3px; }
        }
        @media (min-width: 721px) { .exp-cat-scroll { flex-wrap: wrap; overflow: visible; } }

        /* carteira estilo Investidor10 */
        .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        @media (min-width: 721px) { .kpi-grid { grid-template-columns: repeat(4, 1fr); } }
        .kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 14px; box-shadow: 0 1px 2px rgba(38,53,50,0.04); position: relative; overflow: hidden; }
        .kpi::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--kpi, var(--teal)); }
        .kpi .lbl { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); font-weight: 600; }
        .kpi .val { font-size: 18px; font-weight: 700; margin-top: 6px; }
        .kpi .sub { font-size: 11.5px; margin-top: 3px; color: var(--text-dim); }
        .pos-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 14px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(38,53,50,0.04); }
        .pos-top { display: flex; align-items: center; gap: 12px; }
        .pos-ico { width: 44px; height: 44px; border-radius: 13px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .pos-name { flex: 1; min-width: 0; }
        .pos-tk { font-weight: 700; font-size: 15px; font-family: 'IBM Plex Mono', monospace; }
        .pos-nm { font-size: 11.5px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pos-val { text-align: right; }
        .pos-val .v { font-weight: 700; font-size: 15px; }
        .pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; margin-top: 3px; }
        .pill.up { background: rgba(76,146,132,0.15); color: var(--teal); }
        .pill.down { background: rgba(188,109,87,0.15); color: var(--brick); }
        .pos-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border); }
        .pos-grid .l { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-dim); }
        .pos-grid .d { font-size: 13px; font-weight: 600; margin-top: 2px; }
        .pos-grid input { width: 100%; min-width: 0; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; padding: 5px 6px; font-size: 13px; font-family: 'IBM Plex Mono', monospace; margin-top: 2px; }
        .tipo-toggle { display: flex; gap: 8px; margin-bottom: 12px; }
        .tipo-btn { flex: 1; padding: 10px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--surface-2); font-weight: 700; font-size: 13.5px; color: var(--text-dim); cursor: pointer; }
        .tipo-btn.buy.active { background: rgba(76,146,132,0.12); border-color: var(--teal); color: var(--teal); }
        .tipo-btn.sell.active { background: rgba(188,109,87,0.12); border-color: var(--brick); color: var(--brick); }
        .quote-box { background: var(--surface-2); border: 1px dashed var(--border); border-radius: 14px; padding: 12px; margin-bottom: 14px; }
        .total-line { font-size: 13px; color: var(--text-dim); margin: -2px 0 10px; }
        .total-line b { color: var(--text); }

        /* ================= v4: layout limpo ================= */
        :root { --bg: #F3F6F5; --surface: #FFFFFF; --surface-2: #F7F9F8; --surface-3: #ECF1EF; --text: #17252A; --text-dim: #6F8480; --border: rgba(23,37,42,0.08); }
        .app { background: var(--bg); background-image: none; }
        .mono { font-family: 'Inter', sans-serif; font-variant-numeric: tabular-nums; letter-spacing: -0.015em; font-weight: 600; }
        .topbar { background: rgba(243,246,245,0.94); border-bottom: none; padding: 12px 2px 10px; }
        .brand-icon { border-radius: 11px; }
        .brand-title { font-size: 21px; }
        .month-nav { border: none; box-shadow: 0 1px 2px rgba(16,40,35,0.06); border-radius: 999px; }
        .month-label { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13.5px; }
        .tabs { border-bottom: none; gap: 4px; margin-bottom: 14px; }
        .tab-btn { border-bottom: none; border-radius: 999px; padding: 9px 14px; }
        .tab-btn.active { background: var(--text); color: #fff; }
        .tab-btn:hover { background: var(--surface-3); color: var(--text); } .tab-btn.active:hover { background: var(--text); color: #fff; }

        .card, .chart-card, .day-panel, .list-row, .exp-card, .pos-card, .kpi, .section-card { border: none; border-radius: 20px; box-shadow: 0 1px 2px rgba(16,40,35,0.05), 0 6px 18px rgba(16,40,35,0.04); }
        .card { background: var(--surface); padding: 16px 16px 14px; margin-bottom: 12px; }
        .card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
        .card-title { font-size: 11.5px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.07em; }
        .card-note { font-size: 11.5px; color: var(--text-dim); }
        .link-btn { background: none; border: none; color: var(--teal); font-weight: 700; font-size: 12.5px; cursor: pointer; padding: 4px 0; }
        .big-num { font-size: 30px; font-weight: 700; line-height: 1.1; }
        .big-sub { font-size: 12.5px; color: var(--text-dim); margin-top: 4px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .note-bad { margin-top: 12px; font-size: 12.5px; color: var(--brick); background: rgba(188,109,87,0.1); padding: 8px 12px; border-radius: 10px; }

        .dash-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .dash-grid > .card, .dash-grid > .hero, .dash-grid > .btn { margin-bottom: 0; }
        @media (min-width: 900px) { .dash-grid { grid-template-columns: 1fr 1fr; } .span2 { grid-column: 1 / -1; } }

        .hero { background: linear-gradient(150deg, #2F7466, #1F4F45); color: #fff; border-radius: 24px; padding: 20px 20px 18px; box-shadow: 0 10px 28px rgba(31,79,69,0.28); overflow: hidden; }
        .hero-top { display: flex; justify-content: space-between; font-size: 12px; opacity: .82; font-weight: 600; letter-spacing: .03em; }
        .hero-num { font-size: 36px; font-weight: 700; letter-spacing: -0.03em; margin: 6px 0 4px; font-variant-numeric: tabular-nums; }
        .hero-spark { margin: 0 -20px; opacity: .9; }
        .hero-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.18); }
        .hero-metrics span { display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; opacity: .72; margin-bottom: 3px; }
        .hero-metrics b { font-size: 14.5px; }

        .stackbar { display: flex; width: 100%; border-radius: 999px; overflow: hidden; gap: 2px; background: var(--surface-3); }
        .stackbar > div { min-width: 3px; }
        .legend { margin-top: 12px; }
        .legend-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; }
        .legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .legend-name { flex: 1; color: var(--text-dim); }
        .legend-val { font-size: 13px; } .legend-pct { color: var(--text-dim); width: 38px; text-align: right; font-size: 12px; }
        .legend.inline { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--text-dim); margin-top: 8px; }
        .legend.inline span { display: inline-flex; align-items: center; gap: 6px; } .legend.inline i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }

        .delta { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
        .delta.good { background: rgba(76,146,132,0.13); color: var(--teal); } .delta.bad { background: rgba(188,109,87,0.13); color: var(--brick); }
        .mini-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 12px; }
        .mini-grid span { display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-dim); margin-bottom: 3px; }
        .mini-grid b { font-size: 16px; display: block; margin-bottom: 4px; }
        .mini-grid .field input { padding: 6px 8px; min-height: 36px; }

        .ring-row { display: flex; gap: 18px; overflow-x: auto; padding-bottom: 4px; }
        .ring-item { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 92px; text-align: center; }
        .ring-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; }
        .ring-name { font-size: 12.5px; font-weight: 600; } .ring-sub { font-size: 11.5px; color: var(--text-dim); }

        .rank-row { margin-bottom: 11px; } .rank-row:last-child { margin-bottom: 0; }
        .rank-top { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-size: 13px; }
        .rank-name { flex: 1; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rank-val { font-size: 13px; }
        .mini-ico { width: 26px; height: 26px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
        .donut-center span { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-dim); } .donut-center b { font-size: 13.5px; }
        .segmented.sm { padding: 2px; margin-bottom: 0; } .segmented.sm .seg-btn { padding: 5px 12px; font-size: 12px; }

        .line-item { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border); }
        .line-item:last-child { border-bottom: none; }
        .line-bar { width: 4px; align-self: stretch; border-radius: 4px; flex-shrink: 0; }
        .line-main { flex: 1; min-width: 0; } .line-title { font-weight: 600; font-size: 14px; } .line-sub { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
        .line-right { display: flex; align-items: center; gap: 10px; } .line-amount { font-size: 14px; }

        .tile { width: 42px; height: 42px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
        .pos-row { border-bottom: 1px solid var(--border); } .pos-row:last-child { border-bottom: none; }
        .pos-head { width: 100%; display: flex; align-items: center; gap: 12px; background: none; border: none; padding: 12px 0; cursor: pointer; text-align: left; font-family: inherit; color: inherit; }
        .pos-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .pos-right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
        .pos-v { font-size: 14.5px; } .pos-detail { padding: 2px 0 14px 54px; }
        .perf-row { display: flex; align-items: center; gap: 10px; margin-bottom: 9px; font-size: 12.5px; }
        .perf-name { width: 64px; font-weight: 700; font-size: 12px; overflow: hidden; text-overflow: ellipsis; }
        .perf-track { flex: 1; height: 14px; position: relative; background: var(--surface-2); border-radius: 7px; }
        .perf-mid { position: absolute; left: 50%; top: -2px; bottom: -2px; width: 1px; background: rgba(23,37,42,0.2); }
        .perf-bar { position: absolute; top: 2px; bottom: 2px; border-radius: 5px; } .perf-val { width: 62px; text-align: right; font-size: 12px; }

        .cal-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
        .cal-summary > div { background: var(--surface); border-radius: 16px; padding: 12px; box-shadow: 0 1px 2px rgba(16,40,35,0.05); }
        .cal-summary span { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-dim); margin-bottom: 3px; } .cal-summary b { font-size: 18px; }
        .cal-cell { border: none; border-radius: 14px; box-shadow: 0 1px 2px rgba(16,40,35,0.04); align-items: flex-start; }
        .cal-cell.selected { background: #fff; box-shadow: 0 0 0 2px var(--teal); }
        .cal-cell.today .cal-day-num { color: #fff; background: var(--teal); border-radius: 999px; padding: 1px 6px; }
        .cal-dots { display: flex; gap: 3px; flex-wrap: wrap; } .cal-dot { width: 8px; height: 8px; border-radius: 50%; }
        .cal-hours { font-size: 10.5px; font-weight: 700; color: var(--text-dim); margin-top: auto; }

        .exp-summary { border-radius: 24px; }
        .exp-card { padding: 12px 14px; }
        .btn { border-radius: 12px; } .btn-primary { background: var(--text); color: #fff; box-shadow: none; } .btn-primary:hover { filter: none; background: #0f1a1e; }
        .btn-ghost { background: var(--surface); box-shadow: 0 1px 2px rgba(16,40,35,0.06); }
        .chip.active, .seg-btn.active, .tipo-btn.buy.active { background: var(--text); border-color: var(--text); color: #fff; }
        .tipo-btn.sell.active { background: var(--brick); border-color: var(--brick); color: #fff; } .tipo-btn.buy.active { background: var(--teal); border-color: var(--teal); }
        .cat-btn.active { border-color: var(--text); background: var(--surface); }
        .scope-btn.active { background: var(--text); border-color: var(--text); color: #fff; }
        .tabs { flex-wrap: wrap; overflow: visible; }
        .hero-metrics b { white-space: nowrap; font-size: 13.5px; }
        .pos-tk { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 14.5px; }
        @media (max-width: 720px) { .big-num { font-size: 28px; } .hero-num { font-size: 33px; } }

        /* ================= v5: layout inspirado no Investidor10 ================= */
        :root { --bg: #EEF1F5; --surface: #FFFFFF; --surface-2: #F6F8FA; --surface-3: #EAEEF3; --text: #1F2D3A; --text-dim: #6B7A8A; --border: #DFE5EC; --nav: #10263A; --teal: ${TEAL}; --brick: ${BRICK}; --gold: ${GOLD}; }
        body { background: var(--bg); }
        .app { background: var(--bg); background-image: none; padding: 0 0 96px; }
        .mono { font-family: 'Inter', sans-serif; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; font-weight: 600; }

        .nav { background: var(--nav); position: sticky; top: 0; z-index: 50; box-shadow: 0 2px 8px rgba(8,20,32,0.25); }
        .nav-inner { max-width: 1180px; margin: 0 auto; display: flex; align-items: center; gap: 18px; padding: 0 16px; min-height: 56px; }
        .nav .brand { gap: 10px; } .nav .brand-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--teal); }
        .nav .brand-title { color: #fff; font-family: 'Inter', sans-serif; font-weight: 800; font-size: 18px; letter-spacing: -0.02em; }
        .nav-links { display: flex; gap: 2px; flex: 1; overflow-x: auto; scrollbar-width: none; }
        .nav-link { background: none; border: none; color: #AFC0CF; padding: 18px 12px 15px; font-size: 13.5px; font-weight: 600; cursor: pointer; border-bottom: 3px solid transparent; white-space: nowrap; font-family: inherit; }
        .nav-link:hover { color: #fff; } .nav-link.active { color: #fff; border-bottom-color: var(--teal); }
        .nav .month-nav { background: rgba(255,255,255,0.09); box-shadow: none; border-radius: 8px; margin-left: auto; padding: 4px 6px; }
        .nav .month-nav button { color: #fff; width: 28px; height: 28px; } .nav .month-nav button:hover { background: rgba(255,255,255,0.12); }
        .nav .month-label { color: #fff; font-size: 13px; min-width: 112px; }

        .page { max-width: 1180px; margin: 0 auto; padding: 0 16px; }
        .page-head { padding: 22px 0 16px; }
        .page-head h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: var(--text); }
        .page-head p { margin: 4px 0 0; font-size: 13.5px; color: var(--text-dim); }
        .panel { max-width: none; margin: 0; }

        .card, .chart-card, .day-panel, .section-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: none; }
        .card { padding: 18px; margin-bottom: 16px; }
        .card.flush { padding: 0; overflow: hidden; }
        .card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
        .card-head.pad { margin: 0; padding: 14px 18px; } .pad-x { padding: 12px 18px 0; }
        .card-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--text); text-transform: none; letter-spacing: -0.01em; }
        .card-note { font-size: 12px; color: var(--text-dim); }
        .link-btn { color: var(--teal); }
        .grid-2 { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 0; } .grid-2 > .card { margin-bottom: 16px; }
        @media (min-width: 900px) { .grid-2 { grid-template-columns: 1fr 1fr; } }
        .dash-grid { display: block; }

        .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
        .kpi-row.three { grid-template-columns: repeat(3, 1fr); }
        .kpi-box { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; border-top: 3px solid var(--teal); }
        .kpi-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); }
        .kpi-value { font-size: 22px; font-weight: 800; margin-top: 8px; letter-spacing: -0.02em; word-break: break-word; }
        .kpi-sub { font-size: 12px; color: var(--text-dim); margin-top: 4px; font-weight: 500; }
        @media (max-width: 900px) { .kpi-row { grid-template-columns: 1fr 1fr; } .kpi-row.three { grid-template-columns: 1fr 1fr 1fr; } .kpi-value { font-size: 19px; } }

        .subtabs-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
        .subtabs { display: flex; gap: 24px; overflow-x: auto; scrollbar-width: none; }
        .subtab { background: none; border: none; padding: 12px 0 11px; font-size: 14px; font-weight: 600; color: var(--text-dim); border-bottom: 3px solid transparent; cursor: pointer; white-space: nowrap; font-family: inherit; margin-bottom: -1px; }
        .subtab.active { color: var(--text); border-bottom-color: var(--teal); }
        .subtabs-row .btn { margin-bottom: 8px; flex-shrink: 0; min-height: 38px; }

        .table-wrap { overflow-x: auto; }
        .tbl { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        .tbl th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); font-weight: 700; padding: 10px 14px; background: var(--surface-2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); white-space: nowrap; }
        .tbl td { padding: 12px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .tbl tr:last-child td { border-bottom: none; }
        .tbl tbody tr:hover td { background: #FAFBFD; }
        .tbl .num { text-align: right; white-space: nowrap; }
        .tbl tr.group td { background: var(--surface-2); font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-dim); }
        .tbl.kv td { padding: 11px 4px; } .tbl.kv tr:first-child td { padding-top: 4px; } .tbl.kv td:first-child { color: var(--text-dim); }
        .asset-cell { display: inline-flex; align-items: center; gap: 10px; text-align: left; }
        .cell-sub { display: block; font-size: 11.5px; color: var(--text-dim); font-weight: 500; }
        .show-sm { display: none; } .table-note { font-size: 12px; color: var(--text-dim); padding: 12px 18px 16px; }
        .cell-input { width: 92px; text-align: right; border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; font-size: 13px; background: #fff; font-family: 'Inter', sans-serif; font-variant-numeric: tabular-nums; }
        .cell-input:focus { outline: none; border-color: var(--teal); }
        .tile.sm { width: 32px; height: 32px; border-radius: 8px; font-size: 11px; }
        .pill.up { background: rgba(22,160,107,0.12); color: var(--teal); } .pill.down { background: rgba(224,82,90,0.12); color: var(--brick); }
        .pill { margin-top: 0; }

        .btn { border-radius: 8px; font-family: inherit; } .btn-primary { background: var(--teal); color: #fff; box-shadow: none; } .btn-primary:hover { background: #118a5b; filter: none; }
        .btn-ghost { background: var(--surface); border: 1px solid var(--border); box-shadow: none; color: var(--text); } .btn-ghost:hover { background: var(--surface-2); }
        .chip.active, .seg-btn.active { background: var(--teal); border-color: var(--teal); color: #fff; }
        .tipo-btn.buy.active { background: var(--teal); border-color: var(--teal); color: #fff; } .tipo-btn.sell.active { background: var(--brick); border-color: var(--brick); color: #fff; }
        .scope-btn.active { background: var(--teal); border-color: var(--teal); color: #fff; }
        .cat-btn.active { border-color: var(--teal); background: rgba(22,160,107,0.08); }
        .segmented { border-radius: 8px; background: var(--surface-2); } .seg-btn { border-radius: 6px; }
        .field input, .field select { border-radius: 8px; background: #fff; border-color: var(--border); } .field input:focus, .field select:focus { border-color: var(--teal); }
        .chip { border-radius: 999px; background: #fff; }

        .goal-line { margin-bottom: 14px; } .goal-top { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13.5px; font-weight: 600; }
        .stackbar { border-radius: 4px; gap: 1px; }
        .delta.good { background: rgba(22,160,107,0.12); color: var(--teal); } .delta.bad { background: rgba(224,82,90,0.12); color: var(--brick); }
        .exp-card { border: 1px solid var(--border); border-radius: 10px; box-shadow: none; }
        .list-row { border: 1px solid var(--border); border-radius: 10px; box-shadow: none; }
        .cal-cell { border: 1px solid var(--border); border-radius: 8px; box-shadow: none; }
        .cal-cell.selected { box-shadow: 0 0 0 2px var(--teal); } .cal-cell.today .cal-day-num { background: var(--teal); }
        .stub-card { border-radius: 8px; } .alert-item { border-radius: 8px; }
        .bottom-nav { background: #fff; border-top: 1px solid var(--border); box-shadow: none; }
        .bn-btn.active { color: var(--teal); }
        .sheet-item.active { color: var(--teal); } .sheet-ico { color: var(--teal); }
        .footnote { max-width: 1180px; padding: 0 16px; }

        @media (max-width: 720px) {
          .nav-links { display: none; } .nav-inner { padding: 0 12px; min-height: 52px; } .nav .month-nav { margin-left: auto; }
          .page { padding: 0 12px; } .page-head { padding: 16px 0 12px; } .page-head h1 { font-size: 21px; }
          .hide-sm { display: none; } .show-sm { display: block; }
          .tbl th, .tbl td { padding: 10px 10px; } .card { padding: 14px; } .card-head.pad { padding: 12px 14px; } .pad-x { padding: 10px 14px 0; }
          .cell-input { width: 76px; } .app { padding: 0 0 90px; }
          .subtabs { gap: 18px; } .subtabs-row .btn { padding: 8px 12px; font-size: 12.5px; }
        }
        .cfg { margin-bottom: 8px; font-size: 12.5px; color: var(--text-dim); } .cfg summary { cursor: pointer; font-weight: 600; padding: 4px 0; }
        .nav-link { padding: 18px 9px 15px; font-size: 13px; } .nav .month-label { min-width: 100px; }
        .show-sm.pill { display: none; } .cell-input.show-sm { display: none; }
        @media (max-width: 720px) { .show-sm.pill { display: block; width: fit-content; margin-left: auto; } .cell-input.show-sm { display: block; margin-top: 6px; width: 120px; text-align: left; } .tbl tr.group td.grp-name { white-space: nowrap; } }

        /* ================= v6: gráficos dinâmicos e fluxo ================= */
        .chart-box { position: relative; }
        .chart-tip { position: absolute; top: -4px; transform: translate(-50%, -100%); background: #10263A; color: #fff; border-radius: 8px; padding: 8px 10px; font-size: 12px; display: flex; flex-direction: column; gap: 3px; min-width: 130px; z-index: 5; pointer-events: none; box-shadow: 0 6px 18px rgba(8,20,32,0.3); }
        .chart-tip b { font-weight: 700; } .chart-tip span { display: flex; align-items: center; gap: 6px; justify-content: space-between; } .chart-tip span i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .chart-tip span b { margin-left: auto; } .chart-tip em { font-style: normal; font-size: 10.5px; opacity: .7; margin-top: 2px; }
        .bar-anim { transform-box: fill-box; animation: barGrow .6s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .area-anim { animation: fadeIn .8s ease both; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .donut-seg { transition: stroke-width .15s, opacity .15s; }
        .legend.inline.toggles { gap: 8px; }
        .legend-toggle { display: inline-flex; align-items: center; gap: 6px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: 5px 11px; font-size: 12px; font-weight: 600; color: var(--text); cursor: pointer; font-family: inherit; }
        .legend-toggle i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; } .legend-toggle.off { opacity: .45; text-decoration: line-through; }
        button.rank-row { display: block; width: 100%; background: none; border: none; text-align: left; padding: 7px 8px; margin: 0 -8px 4px; border-radius: 8px; cursor: pointer; font-family: inherit; color: inherit; }
        button.rank-row.on, button.rank-row:hover { background: var(--surface-2); }
        .tax-mini.wide { width: auto; min-width: 128px; text-align: left; padding: 5px 6px; }

        .quick-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
        .quick-row button { display: flex; flex-direction: column; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 8px; font-size: 13px; font-weight: 700; color: var(--text); cursor: pointer; font-family: inherit; }
        .quick-row button:hover { border-color: var(--teal); }
        .quick-row .qi { width: 40px; height: 40px; border-radius: 12px; background: rgba(22,160,107,0.12); color: var(--teal); display: inline-flex; align-items: center; justify-content: center; }
        .step-line { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); } .step-line:last-child { border-bottom: none; }
        .step-dot { width: 26px; height: 26px; border-radius: 50%; background: var(--surface-3); color: var(--text-dim); font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .step-line.done .step-dot { background: var(--teal); } .step-line.done .step-title { color: var(--text-dim); text-decoration: line-through; }
        .step-main { flex: 1; min-width: 0; } .step-title { font-weight: 700; font-size: 14px; }
        .btn.sm { min-height: 34px; padding: 6px 12px; font-size: 12.5px; }
        .note-info { background: rgba(59,130,196,0.08); border: 1px solid rgba(59,130,196,0.2); color: #2F5E8A; border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }

        .fab { position: fixed; right: 18px; bottom: 88px; width: 54px; height: 54px; border-radius: 50%; border: none; background: var(--teal); box-shadow: 0 6px 18px rgba(22,160,107,0.45); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 45; }
        @media (min-width: 721px) { .fab { bottom: 28px; right: 28px; } .sheet-backdrop { align-items: center; } .sheet { border-radius: 16px; } }
        .sheet-title { font-weight: 800; font-size: 16px; padding: 4px 8px 10px; }
        .sheet.tall { max-height: 88vh; overflow-y: auto; padding-bottom: 28px; }
        .day-panel.flat { border: none; padding: 0; margin: 0; box-shadow: none; }

        /* ================= v6: importação ================= */
        .choice-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .choice { text-align: left; background: var(--surface-2); border: 1.5px solid var(--border); border-radius: 10px; padding: 12px 14px; cursor: pointer; font-family: inherit; color: var(--text); display: flex; flex-direction: column; gap: 4px; }
        .choice span { font-size: 12.5px; color: var(--text-dim); } .choice.on { border-color: var(--teal); background: rgba(22,160,107,0.06); }
        .drop { width: 100%; border: 2px dashed var(--border); background: var(--surface-2); border-radius: 12px; padding: 26px 16px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; font-family: inherit; color: var(--text); }
        .drop:hover { border-color: var(--teal); } .drop b { font-size: 15px; } .drop span { font-size: 12.5px; color: var(--text-dim); text-align: center; }
        .tips { margin-top: 16px; display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--text-dim); background: var(--surface-2); border-radius: 10px; padding: 12px 14px; }
        .tips > b { color: var(--text); }
        .check-line { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-dim); margin-bottom: 10px; }
        .imp-list { border-top: 1px solid var(--border); }
        .imp-row { padding: 12px 18px; border-bottom: 1px solid var(--border); } .imp-row.off { opacity: .55; }
        .imp-top { display: flex; gap: 12px; align-items: flex-start; } .imp-main { flex: 1; min-width: 0; }
        .imp-desc { font-weight: 600; font-size: 14px; word-break: break-word; } .imp-amt { font-size: 14.5px; white-space: nowrap; }
        .imp-ctrl { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
        .imp-ctrl select { flex: 1; min-width: 150px; border: 1px solid var(--border); border-radius: 8px; padding: 7px 8px; font-size: 13px; background: #fff; font-family: inherit; }
        .imp-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 18px; position: sticky; bottom: 64px; background: #fff; border-top: 1px solid var(--border); }
        .btn:disabled { opacity: .5; cursor: not-allowed; }
        @media (max-width: 720px) { .choice-row { grid-template-columns: 1fr; } .imp-row { padding: 12px 14px; } .imp-actions { padding: 12px 14px; } }
        @media (min-width: 721px) { .imp-actions { bottom: 0; } }
        .footnote { max-width: 1020px; margin: 24px auto 0; font-size: 11.5px; color: var(--text-dim); text-align: center; line-height: 1.5; }

        /* ================= v7: visual limpo de app financeiro ================= */
        :root { --bg: #F6F7F9; --surface: #FFFFFF; --surface-2: #F8FAFC; --surface-3: #F1F5F9; --text: #0F172A; --text-dim: #64748B; --border: #E7EBF0; --teal: #16A34A; --brick: #DC2626; --gold: #F59E0B; }
        body, .app { background: var(--bg); }
        .app { padding: 0 !important; font-family: 'Inter', system-ui, sans-serif; color: var(--text); }
        .mono { font-family: 'Inter', system-ui, sans-serif; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }

        .sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 244px; background: #fff; border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 20px 14px 16px; z-index: 40; overflow-y: auto; }
        .sb-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 19px; letter-spacing: -0.03em; padding: 2px 8px 18px; }
        .sb-brand .brand-icon, .tb-logo { width: 32px; height: 32px; border-radius: 10px; background: #111827; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sb-new { display: flex; align-items: center; justify-content: center; gap: 8px; height: 42px; border: none; border-radius: 10px; background: var(--teal); color: #fff; font-weight: 600; font-size: 14px; cursor: pointer; font-family: inherit; margin-bottom: 6px; }
        .sb-new:hover { background: #15803D; }
        .sb-group { font-size: 12px; color: #94A3B8; font-weight: 600; padding: 16px 10px 6px; }
        .sb-item { display: flex; align-items: center; gap: 11px; width: 100%; padding: 9px 10px; border-radius: 9px; border: none; background: none; font-size: 14px; font-weight: 500; color: #334155; cursor: pointer; text-align: left; font-family: inherit; margin-bottom: 1px; }
        .sb-item svg { color: #94A3B8; } .sb-item:hover { background: var(--surface-3); }
        .sb-item.active { background: #F0FDF4; color: #15803D; font-weight: 600; } .sb-item.active svg { color: #16A34A; }
        .sb-foot { margin-top: auto; font-size: 11.5px; color: #94A3B8; padding: 14px 10px 0; }
        .main { margin-left: 244px; min-height: 100vh; }
        .topbar2 { position: sticky; top: 0; z-index: 30; background: rgba(246,247,249,0.92); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 32px 14px; }
        .tb-left { display: flex; align-items: center; gap: 12px; min-width: 0; } .tb-logo { display: none; width: 28px; height: 28px; border-radius: 8px; }
        .tb-title { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; } .tb-sub { margin: 2px 0 0; font-size: 13.5px; color: var(--text-dim); }
        .tb-right { display: flex; align-items: center; gap: 10px; }
        .month-pill { display: flex; align-items: center; gap: 2px; background: #fff; border: 1px solid var(--border); border-radius: 999px; padding: 3px; }
        .month-pill button { width: 30px; height: 30px; border-radius: 50%; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text); }
        .month-pill button:hover { background: var(--surface-3); }
        .month-pill span { font-weight: 600; font-size: 13.5px; min-width: 116px; text-align: center; white-space: nowrap; }
        .tb-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .tb-left > div { min-width: 0; }
        .page { max-width: 1180px; margin: 0; padding: 6px 32px 0; }
        .page-head, .nav, .fab { display: none !important; }
        .footnote { max-width: 1180px; margin: 28px 0 0; padding: 0 32px 24px; text-align: left; color: #94A3B8; }

        .card, .chart-card, .day-panel, .section-card { border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,0.03); }
        .card { padding: 20px; margin-bottom: 16px; }
        .card.flush { padding: 0; }
        .card-head { border-bottom: none; padding-bottom: 0; margin: 0 0 14px; }
        .card-head.pad { padding: 18px 20px 4px; margin: 0; }
        .card-title { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
        .card-note { font-size: 12.5px; color: #94A3B8; }
        .link-btn { color: #15803D; font-weight: 600; font-size: 13px; }
        .grid-2 { gap: 16px; }

        .kpi-row { gap: 14px; }
        .kpi-box { border: 1px solid var(--border); border-top: 1px solid var(--border); border-radius: 16px; padding: 16px 18px; box-shadow: 0 1px 2px rgba(15,23,42,0.03); }
        .kpi-label { text-transform: none; letter-spacing: 0; font-size: 13px; font-weight: 500; color: var(--text-dim); }
        .kpi-value { font-size: 22px; font-weight: 700; margin-top: 6px; }
        .kpi-sub { color: #94A3B8; }

        .greet h2 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; } .greet p { margin: 2px 0 16px; color: var(--text-dim); font-size: 14px; }
        .alert-strip { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .alert-item { display: flex; align-items: center; gap: 10px; border-radius: 12px; padding: 11px 14px; font-size: 13.5px; font-weight: 500; margin: 0; }
        .alert-item .al-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .alert-danger { background: #FEF2F2; color: #B91C1C; } .alert-warning { background: #FFFBEB; color: #B45309; } .alert-info { background: #F0FDF4; color: #15803D; }

        .balance-card { background: #fff; border: 1px solid var(--border); border-radius: 20px; padding: 22px 22px 20px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(15,23,42,0.03); }
        .bc-top { font-size: 14px; color: var(--text-dim); font-weight: 500; }
        .bc-value { font-size: 34px; font-weight: 700; letter-spacing: -0.03em; margin: 4px 0 4px; }
        .bc-sub { font-size: 13px; color: var(--text-dim); } .bc-sub b { color: var(--text); font-weight: 600; }
        .bc-flows { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }
        .flow { display: flex; align-items: flex-start; gap: 10px; background: var(--surface-2); border-radius: 14px; padding: 12px 14px; }
        .flow-ico { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .flow-ico.in { background: #DCFCE7; color: #16A34A; } .flow-ico.out { background: #FEE2E2; color: #DC2626; } .flow-ico.inv { background: #DBEAFE; color: #2563EB; }
        .flow span { display: block; font-size: 12.5px; color: var(--text-dim); } .flow b { display: block; font-size: 16px; font-weight: 700; margin: 1px 0 4px; }
        .flow .delta { display: inline-block; } .bc-flows > * { min-width: 0; } .flow .flow-ico { display: flex; }
        .delta { font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 999px; display: inline-block; text-transform: none; }

        .lim-row { padding: 12px 0; border-bottom: 1px solid var(--border); } .lim-row:last-of-type { border-bottom: none; }
        .lim-top { display: flex; align-items: center; gap: 10px; }
        .lim-ico, .tx-ico { width: 38px; height: 38px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .lim-name { flex: 1; font-weight: 600; font-size: 14px; min-width: 0; } .lim-spent { display: block; font-weight: 500; font-size: 12.5px; color: var(--text-dim); margin-top: 1px; }
        .lim-chip { font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
        .lim-chip.ok { background: #DCFCE7; color: #15803D; } .lim-chip.warn { background: #FEF3C7; color: #B45309; } .lim-chip.over { background: #FEE2E2; color: #B91C1C; } .lim-chip.none { background: var(--surface-3); color: #94A3B8; }
        .lim-bar { height: 8px; border-radius: 999px; background: var(--surface-3); margin: 10px 0 6px; overflow: hidden; } .lim-bar > div { height: 100%; border-radius: 999px; transition: width .4s; }
        .lim-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-dim); margin-top: 4px; }
        .lim-edit { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; } .lim-edit input { flex: 1; min-width: 140px; border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; font-size: 14px; font-family: inherit; }
        .lim-add { display: flex; gap: 8px; margin-top: 12px; } .lim-add select { flex: 1; border: 1px solid var(--border); border-radius: 10px; padding: 8px; font-size: 13px; font-family: inherit; background: #fff; color: var(--text); }

        .tx-group { font-size: 12.5px; font-weight: 600; color: #94A3B8; padding: 14px 0 4px; }
        .tx-row { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border); }
        .tx-row:last-child { border-bottom: none; } .tx-row.is-paid .tx-title { color: var(--text-dim); }
        .tx-main { flex: 1; min-width: 0; } .tx-title { font-weight: 600; font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tx-sub { font-size: 12.5px; color: var(--text-dim); display: flex; gap: 5px; align-items: center; flex-wrap: wrap; margin-top: 2px; }
        .tx-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; } .tx-amt { font-weight: 700; font-size: 14.5px; color: var(--text); white-space: nowrap; }
        .tx-actions { display: flex; align-items: center; gap: 2px; }
        .tx-status { font-size: 12px; font-weight: 600; border: none; border-radius: 999px; padding: 4px 10px; cursor: pointer; font-family: inherit; }
        .tx-status.paid { background: #DCFCE7; color: #15803D; } .tx-status.open { background: var(--surface-3); color: #334155; } .tx-status.open:hover { background: #DCFCE7; color: #15803D; }
        .due { font-size: 11.5px; font-weight: 600; padding: 1px 8px; border-radius: 999px; }
        .due.late { background: #FEE2E2; color: #B91C1C; } .due.warn { background: #FEF3C7; color: #B45309; } .due.open { background: var(--surface-3); color: var(--text-dim); } .due.paid { background: #DCFCE7; color: #15803D; }
        .work-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .work-grid > div { background: var(--surface-2); border-radius: 12px; padding: 12px 14px; } .work-grid span { display: block; font-size: 12.5px; color: var(--text-dim); } .work-grid b { font-size: 18px; font-weight: 700; }
        .step-line { border-bottom: none; padding: 8px 0; } .steps .lim-bar { margin-bottom: 8px; }

        .tbl th { text-transform: none; letter-spacing: 0; font-size: 12.5px; font-weight: 600; color: var(--text-dim); background: var(--surface-2); }
        .tbl tr.group td { text-transform: none; letter-spacing: 0; font-size: 13px; color: var(--text); }
        .badge, .badge-tipo { text-transform: none; letter-spacing: 0; font-size: 11.5px; font-weight: 600; padding: 3px 10px; }
        .badge-paid { background: #DCFCE7; color: #15803D; } .badge-pending { background: #FEF3C7; color: #B45309; }
        .sub-heading { text-transform: none; letter-spacing: 0; font-size: 13.5px; color: var(--text); font-weight: 600; }
        .btn { border-radius: 10px; font-weight: 600; } .btn-primary { background: var(--teal); color: #fff; } .btn-primary:hover { background: #15803D; }
        .btn-ghost { background: #fff; border: 1px solid var(--border); color: var(--text); }
        .chip { border-color: var(--border); color: #475569; } .chip.active, .seg-btn.active, .scope-btn.active { background: #0F172A; border-color: #0F172A; color: #fff; }
        .segmented { background: var(--surface-3); border: none; border-radius: 10px; padding: 3px; } .seg-btn { border-radius: 8px; color: #475569; }
        .segmented .seg-btn.active { background: #fff; color: var(--text); box-shadow: 0 1px 2px rgba(15,23,42,0.12); }
        .tipo-btn { border-radius: 10px; }
        .field label { font-size: 12.5px; color: #475569; font-weight: 500; }
        .field input, .field select { border-radius: 10px; min-height: 42px; border-color: var(--border); }
        .cat-grid { grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .cat-btn { border: 1px solid var(--border); border-radius: 12px; background: #fff; font-size: 11.5px; color: #475569; padding: 8px 2px; }
        .cat-btn .em { width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
        .cat-btn.active { border-color: var(--teal); background: #F0FDF4; color: var(--text); }
        .kpi-row.three { grid-template-columns: repeat(3, 1fr); }
        .cal-cell { border-radius: 12px; } .cal-cell.today .cal-day-num { background: var(--teal); }
        .chart-tip { background: #0F172A; border-radius: 10px; }
        .note-info { background: #F0FDF4; border-color: #BBF7D0; color: #166534; border-radius: 12px; }
        .tile { border-radius: 50%; }
        .sheet { border-radius: 20px 20px 0 0; }
        .sheet-item { padding: 12px 8px; } .sheet-item b { display: block; font-size: 15px; } .sheet-item small { display: block; font-size: 12.5px; color: var(--text-dim); font-weight: 500; }
        .sheet-ico { border-radius: 50%; width: 40px; height: 40px; }
        .bottom-nav { display: none; }

        @media (max-width: 1080px) {
          .sidebar { width: 76px; padding: 18px 10px; } .sb-brand span, .sb-new span, .sb-item span, .sb-group, .sb-foot { display: none; }
          .sb-brand { justify-content: center; padding: 2px 0 16px; } .sb-new { width: 44px; margin: 0 auto 10px; } .sb-item { justify-content: center; padding: 11px 0; }
          .main { margin-left: 76px; }
        }
        @media (max-width: 720px) {
          .sidebar { display: none; } .main { margin-left: 0; }
          .topbar2 { padding: 10px 14px; background: #fff; border-bottom: 1px solid var(--border); }
          .tb-logo { display: flex; } .tb-sub, .tb-new { display: none; } .tb-title { font-size: 17px; }
          .month-pill span { min-width: 92px; font-size: 12.5px; } .month-pill button { width: 28px; height: 28px; }
          .page { padding: 14px 14px 0; } .footnote { padding: 0 14px 24px; } .main { padding-bottom: 84px; }
          .card { padding: 16px; } .card-head.pad { padding: 16px 16px 4px; }
          .kpi-row { gap: 10px; } .kpi-box { padding: 14px; } .kpi-value { font-size: 19px; }
          .bc-flows { grid-template-columns: 1fr; gap: 8px; } .flow { align-items: center; } .flow > div { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: 8px; } .flow > div > span:first-child { width: 100%; } .bc-value { font-size: 30px; }
          .bottom-nav { display: flex; align-items: flex-end; background: #fff; border-top: 1px solid var(--border); padding: 6px 4px calc(8px + env(safe-area-inset-bottom)); }
          .bn-btn { color: #94A3B8; } .bn-btn.active { color: var(--teal); }
          .bn-center { flex: 0 0 auto; width: 56px; height: 56px; margin: -26px 6px 0; border-radius: 50%; border: 4px solid #fff; background: var(--teal); box-shadow: 0 6px 16px rgba(22,163,74,0.4); display: flex; align-items: center; justify-content: center; cursor: pointer; }
          .cat-grid { grid-template-columns: repeat(4, 1fr); }
        }

        /* ================= v8: insights e B3 ================= */
        .ins-list { display: flex; flex-direction: column; gap: 10px; }
        .ins { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; background: var(--surface-2); }
        .ins-ico { width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ins-body b { display: block; font-size: 14px; font-weight: 600; } .ins-body p { margin: 3px 0 0; font-size: 13px; color: var(--text-dim); line-height: 1.45; }
        .ins-good .ins-ico { background: #DCFCE7; color: #16A34A; } .ins-bad .ins-ico { background: #FEE2E2; color: #DC2626; }
        .ins-warn .ins-ico { background: #FEF3C7; color: #D97706; } .ins-info .ins-ico { background: #DBEAFE; color: #2563EB; }
        .choice-row { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 720px) { .choice-row { grid-template-columns: 1fr; } }

        /* ================= v9: nuvem ================= */
        .cloud-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; border: none; padding: 0; margin-left: 8px; vertical-align: middle; cursor: pointer; background: #CBD5E1; }
        .cloud-dot.synced { background: #16A34A; } .cloud-dot.saving, .cloud-dot.loading { background: #F59E0B; } .cloud-dot.offline, .cloud-dot.auth { background: #DC2626; }
        .cloud-foot { display: flex; align-items: center; gap: 8px; background: none; border: none; cursor: pointer; font-family: inherit; text-align: left; }
        .cloud-foot i, .cloud-pill i { width: 8px; height: 8px; border-radius: 50%; background: #CBD5E1; display: inline-block; flex-shrink: 0; }
        .cloud-foot.synced i, .cloud-pill.synced i { background: #16A34A; } .cloud-foot.saving i, .cloud-foot.loading i, .cloud-pill.saving i, .cloud-pill.loading i { background: #F59E0B; }
        .cloud-foot.offline i, .cloud-foot.auth i, .cloud-pill.offline i, .cloud-pill.auth i { background: #DC2626; }
        .cloud-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: #475569; background: var(--surface-3); border-radius: 999px; padding: 4px 10px; }
        .kv-line { display: flex; justify-content: space-between; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 14px; } .kv-line span { color: var(--text-dim); }
        @media (max-width: 1080px) { .cloud-foot { justify-content: center; font-size: 0; gap: 0; } }

        /* ================= v10: seletor de meses ================= */
        .month-pill .mp-open { width: auto; min-width: 116px; height: 30px; padding: 0 10px; border-radius: 999px; font-weight: 600; font-size: 13.5px; font-family: inherit; white-space: nowrap; color: var(--text); }
        .month-pill .mp-open:hover { background: var(--surface-3); }
        .mp-sheet { max-width: 760px; max-height: 90vh; overflow-y: auto; padding-bottom: 22px; }
        .mp-head { display: flex; align-items: center; justify-content: center; gap: 14px; position: relative; padding: 2px 0 12px; }
        .mp-head b { font-size: 20px; font-weight: 800; min-width: 64px; text-align: center; }
        .mp-arrow { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border); background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text); }
        .mp-close { position: absolute; right: 0; top: 2px; }
        .mp-totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
        .mp-totals > div { background: var(--surface-2); border-radius: 12px; padding: 10px 12px; }
        .mp-totals span { display: block; font-size: 11.5px; color: var(--text-dim); } .mp-totals b { font-size: 14.5px; }
        .mp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .mp-cell { text-align: left; background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 10px; cursor: pointer; font-family: inherit; color: var(--text); }
        .mp-cell:hover { border-color: var(--teal); } .mp-cell.sel { border: 2px solid var(--teal); background: #F0FDF4; padding: 9px; }
        .mp-cell.empty { opacity: .55; }
        .mp-top { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 6px; } .mp-top b { font-size: 13.5px; }
        .mp-now { font-size: 10px; font-weight: 700; color: #15803D; background: #DCFCE7; border-radius: 999px; padding: 1px 6px; }
        .mp-now.fut { color: #64748B; background: var(--surface-3); }
        .mp-bars { display: flex; flex-direction: column; gap: 3px; margin-bottom: 6px; } .mp-bars i { display: block; height: 4px; border-radius: 4px; min-width: 2px; }
        .mp-row { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-dim); line-height: 1.6; } .mp-row b { font-size: 12px; }
        .mp-row.bal { border-top: 1px dashed var(--border); margin-top: 3px; padding-top: 3px; } .mp-row.bal span { color: var(--text); font-weight: 600; }
        .mp-foot { font-size: 12px; color: var(--text-dim); margin-top: 12px; text-align: center; }
        @media (max-width: 720px) { .mp-grid { grid-template-columns: repeat(3, 1fr); gap: 6px; } .mp-cell { padding: 8px; } .mp-cell.sel { padding: 7px; } .mp-top b { font-size: 12.5px; } .mp-row { font-size: 10.5px; } .mp-row b { font-size: 11px; } .mp-totals b { font-size: 12.5px; } .month-pill .mp-open { min-width: 92px; font-size: 12.5px; padding: 0 6px; } }

        /* ================= v11: barra de páginas no topo, transições e animações ================= */
        .sidebar, .bottom-nav { display: none !important; }
        .main { margin-left: 0 !important; min-height: 100vh; overflow-x: clip; }
        .topwrap { position: sticky; top: 0; z-index: 30; background: rgba(255,255,255,0.94); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); padding-top: env(safe-area-inset-top); }
        .topbar2 { position: static; background: none; backdrop-filter: none; -webkit-backdrop-filter: none; border-bottom: none; max-width: 1180px; margin: 0 auto; padding: 14px 32px 6px; }
        .tb-logo { display: flex; }
        .navstrip { max-width: 1180px; margin: 0 auto; padding: 0 22px; }
        .ns-scroll { position: relative; display: flex; gap: 4px; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; -webkit-overflow-scrolling: touch; padding: 4px 10px 10px;
          -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%); mask-image: linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%); }
        .ns-scroll::-webkit-scrollbar { display: none; }
        .ns-tab { position: relative; z-index: 1; flex: 0 0 auto; display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 14px; border: none; background: none; border-radius: 999px; font-family: inherit; font-size: 13.5px; font-weight: 600; color: var(--text-dim); cursor: pointer; white-space: nowrap; transition: color .22s ease, transform .15s ease; }
        .ns-tab:hover { color: var(--text); } .ns-tab:active { transform: scale(.95); } .ns-tab.active { color: #fff; }
        .ns-tab:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
        .ns-ind { position: absolute; left: 0; top: 4px; height: 38px; border-radius: 999px; background: #0F172A; box-shadow: 0 4px 12px rgba(15,23,42,0.22); pointer-events: none; transition: transform .34s cubic-bezier(.3,.9,.3,1), width .34s cubic-bezier(.3,.9,.3,1); }
        .page { margin: 0 auto; padding-top: 20px; }
        .footnote { margin: 28px auto 0; text-align: center; }
        .fab2 { display: none; }

        @keyframes pgFwd { from { opacity: 0; transform: translateX(26px); } }
        @keyframes pgBack { from { opacity: 0; transform: translateX(-26px); } }
        @keyframes riseIn { from { opacity: 0; transform: translateY(14px); } }
        @keyframes growX { from { transform: scaleX(0); } }
        @keyframes sheetUp { from { opacity: 0; transform: translateY(48px); } }
        @keyframes popIn { from { opacity: 0; transform: scale(.5); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pg-fwd { animation: pgFwd .34s cubic-bezier(.2,.8,.2,1) backwards; }
        .pg-back { animation: pgBack .34s cubic-bezier(.2,.8,.2,1) backwards; }
        .pg .card, .pg .kpi-box, .pg .day-panel, .pg .asset-card, .pg .ag-head, .pg .quick-row > button { animation: riseIn .46s cubic-bezier(.2,.8,.2,1) backwards; }
        .pg > div > :nth-child(2), .kpi-row > :nth-child(2), .grid-2 > :nth-child(2), .dash-grid > :nth-child(2), .asset-grid > :nth-child(2), .quick-row > :nth-child(2) { animation-delay: .05s; }
        .pg > div > :nth-child(3), .kpi-row > :nth-child(3), .dash-grid > :nth-child(3), .asset-grid > :nth-child(3), .quick-row > :nth-child(3) { animation-delay: .10s; }
        .pg > div > :nth-child(4), .kpi-row > :nth-child(4), .dash-grid > :nth-child(4), .asset-grid > :nth-child(4), .quick-row > :nth-child(4) { animation-delay: .15s; }
        .pg > div > :nth-child(5), .dash-grid > :nth-child(5), .asset-grid > :nth-child(5) { animation-delay: .20s; }
        .pg > div > :nth-child(n+6), .dash-grid > :nth-child(n+6), .asset-grid > :nth-child(n+6) { animation-delay: .24s; }
        .tbl tbody tr { animation: fadeIn .4s ease backwards; }
        .tbl tbody tr:nth-child(2) { animation-delay: .03s; } .tbl tbody tr:nth-child(3) { animation-delay: .06s; } .tbl tbody tr:nth-child(4) { animation-delay: .09s; } .tbl tbody tr:nth-child(5) { animation-delay: .12s; } .tbl tbody tr:nth-child(n+6) { animation-delay: .15s; }
        .progress-fill, .perf-bar, .ac-weight i { transform-origin: left center; animation: growX .7s cubic-bezier(.2,.8,.2,1) .12s backwards; }
        .perf-bar.neg { transform-origin: right center; }
        .sheet-backdrop { animation: fadeIn .2s ease both; } .sheet { animation: sheetUp .32s cubic-bezier(.2,.9,.3,1) backwards; }
        .btn, .chip, .subtab, .seg-btn, .tipo-btn, .sheet-item, .mp-cell, .btn-icon, .month-pill button, .badge { transition: transform .12s ease, background-color .18s ease, border-color .18s ease, color .18s ease, box-shadow .18s ease; }
        .btn:active, .chip:active, .seg-btn:active, .tipo-btn:active, .sheet-item:active, .mp-cell:active { transform: scale(.97); }
        .btn:disabled { opacity: .6; cursor: default; }
        .kpi-box, .asset-card { transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
        @media (hover: hover) { .kpi-box:hover, .asset-card:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(15,23,42,0.07); } }
        .spin { animation: spin .8s linear infinite; }

        /* ---- investimentos: cotações e cartões de ativos ---- */
        .quote-btn { min-height: 36px; padding: 6px 12px; font-size: 12.5px; }
        .quote-track { height: 5px; margin: 2px 0 10px; } .quote-fill { height: 100%; border-radius: 999px; background: var(--teal); transition: width .25s ease; }
        .quote-msg { font-size: 13px; line-height: 1.5; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; background: var(--surface-3); color: #334155; animation: riseIn .3s ease backwards; }
        .quote-msg.ok { background: #F0FDF4; color: #166534; } .quote-msg.warn { background: #FFFBEB; color: #92400E; } .quote-msg.bad { background: #FEF2F2; color: #991B1B; }
        .token-box { border: 1px solid #FDE68A; background: #FFFBEB; border-radius: 12px; padding: 12px 14px; font-size: 13px; color: #78350F; line-height: 1.5; }
        .token-box b { display: block; font-size: 13.5px; } .token-box p { margin: 4px 0 6px; } .token-box ol { margin: 0; padding-left: 18px; } .token-box a { color: #92400E; font-weight: 700; }
        .token-box label { color: #78350F; } .token-box input { background: #fff; }
        .asset-tools { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
        .sort-pick { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--text-dim); margin-left: auto; }
        .sort-pick select { font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text); background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 7px 10px; min-height: 36px; }
        .asset-group { margin-bottom: 8px; }
        .ag-head { display: flex; align-items: center; gap: 10px; padding: 10px 4px 10px; }
        .ag-name { min-width: 0; } .ag-head b { display: block; font-size: 14.5px; } .ag-head small { display: block; font-size: 12px; color: var(--text-dim); margin-top: 1px; }
        .ag-right { margin-left: auto; text-align: right; flex-shrink: 0; } .ag-right small { font-weight: 600; }
        .asset-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; margin-bottom: 10px; }
        @media (min-width: 900px) { .asset-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; } }
        .asset-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 1px 2px rgba(15,23,42,0.03); }
        .asset-card.open { border-color: #CBD5E1; }
        .ac-top { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 12px 10px 14px; background: none; border: none; text-align: left; cursor: pointer; font-family: inherit; color: inherit; }
        .ac-top:focus-visible { outline: 2px solid var(--teal); outline-offset: -2px; border-radius: 16px; }
        .ac-id { flex: 1; min-width: 0; } .ac-id b { display: block; font-size: 15px; } .ac-id > span { display: block; font-size: 12px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ac-val { text-align: right; flex-shrink: 0; } .ac-val b { display: block; font-size: 15px; margin-bottom: 3px; }
        .pill.flat { background: var(--surface-3); color: var(--text-dim); }
        .ac-chev { color: #94A3B8; display: inline-flex; transition: transform .25s ease; } .asset-card.open .ac-chev { transform: rotate(180deg); }
        .ac-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; padding: 0 14px 12px; align-items: end; }
        .ac-stats.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .ac-stat > span { display: block; font-size: 11px; color: var(--text-dim); margin-bottom: 3px; white-space: nowrap; }
        .ac-stat b { display: block; font-size: 13px; font-weight: 600; line-height: 30px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ac-input { width: 100%; min-width: 0; text-align: left; height: 30px; padding: 4px 8px; border-radius: 8px; font-size: 13px; }
        .ac-weight { height: 4px; background: var(--surface-3); margin: 0 14px; border-radius: 999px; overflow: hidden; } .ac-weight i { display: block; height: 100%; border-radius: 999px; }
        .ac-foot { display: flex; justify-content: space-between; gap: 8px; padding: 6px 14px 12px; font-size: 11.5px; color: var(--text-dim); }
        .qmark { font-weight: 700; } .qmark.ok { color: #15803D; } .qmark.token { color: #B45309; } .qmark.fail { color: #B91C1C; }
        .ac-more { border-top: 1px solid var(--border); background: var(--surface-2); padding: 6px 14px 14px; animation: riseIn .3s ease backwards; }
        .ac-hist-title { font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: .04em; margin: 14px 0 4px; }
        .ac-hist { display: grid; grid-template-columns: 78px 1fr auto; column-gap: 10px; align-items: baseline; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
        .ac-hist .ah-kind { font-weight: 700; font-size: 12px; } .ac-hist .ah-qty { grid-column: 1 / 3; font-size: 12px; color: var(--text-dim); } .ac-hist b { grid-row: 1; grid-column: 3; }
        .ac-actions { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
        .pos-preview { border: 1px solid var(--border); background: var(--surface-2); border-radius: 12px; padding: 12px 14px; margin: 0 0 12px; animation: riseIn .3s ease backwards; }
        .pp-title { font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
        .pp-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; } .pp-grid span { display: block; font-size: 11.5px; color: var(--text-dim); } .pp-grid b { font-size: 14px; }
        .pp-after { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border); font-size: 13px; line-height: 1.5; }

        @media (max-width: 720px) {
          .topbar2 { padding: 10px 14px 4px; background: none; border-bottom: none; }
          .navstrip { padding: 0 4px; } .ns-scroll { padding: 4px 10px 8px; } .ns-tab { height: 36px; padding: 0 12px; font-size: 13px; } .ns-ind { height: 36px; }
          .page { padding-top: 14px; } .main { padding-bottom: 96px; }
          .fab2 { display: flex; position: fixed; right: 16px; bottom: calc(18px + env(safe-area-inset-bottom)); width: 56px; height: 56px; border-radius: 50%; border: none; background: var(--teal); box-shadow: 0 8px 20px rgba(22,163,74,0.4); align-items: center; justify-content: center; cursor: pointer; z-index: 45; animation: popIn .4s cubic-bezier(.3,1.4,.5,1) .25s backwards; transition: transform .15s ease; }
          .fab2:active { transform: scale(.92); }
          .ac-top { gap: 10px; } .asset-tools .sort-pick { margin-left: 0; }
          .ac-stats { grid-template-columns: minmax(0, .8fr) minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1.4fr); gap: 6px; } .ac-stats.three { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1.2fr); }
          .ac-stat b { font-size: 12.5px; letter-spacing: -0.01em; } .ac-input { padding: 4px 6px; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: .01ms !important; animation-delay: 0s !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
        }

        /* ================= v12: rentabilidade por hora e contabilidade ================= */
        .wr-top { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 14px; align-items: stretch; }
        .wr-main { background: #F0FDF4; border-radius: 14px; padding: 14px 16px; } .wr-main > span { display: block; font-size: 12.5px; color: #166534; font-weight: 600; }
        .wr-main > b { display: block; font-size: 30px; font-weight: 700; letter-spacing: -0.03em; margin: 2px 0 6px; color: #14532D; }
        .wr-cmp { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; } .wr-cmp small, .wr-none { font-size: 12px; color: #3F6B50; }
        .wr-side { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .wr-side > div { background: var(--surface-2); border-radius: 14px; padding: 12px 14px; min-width: 0; }
        .wr-side span { display: block; font-size: 12px; color: var(--text-dim); } .wr-side b { display: block; font-size: 17px; font-weight: 700; margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .wr-side small { display: block; font-size: 11.5px; color: var(--text-dim); }
        .wr-sub { font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: .04em; margin: 18px 0 8px; }
        .wr-vin { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; column-gap: 10px; row-gap: 6px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .wr-vn b { display: block; font-size: 14px; } .wr-vn small, .wr-vr small { display: block; font-size: 12px; color: var(--text-dim); } .wr-vr { text-align: right; } .wr-vr b { font-size: 15px; }
        .wr-vbar { grid-column: 1 / -1; height: 6px; }
        .wr-hist { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 6px; align-items: end; }
        .wr-col { display: flex; flex-direction: column; align-items: center; gap: 4px; background: none; border: none; padding: 4px 0; cursor: pointer; font-family: inherit; color: var(--text-dim); min-width: 0; border-radius: 10px; }
        .wr-col:hover { background: var(--surface-2); } .wr-colv { font-size: 12px; font-weight: 700; color: var(--text); }
        .wr-bar { width: 100%; max-width: 44px; height: 84px; display: flex; align-items: flex-end; background: var(--surface-2); border-radius: 8px; overflow: hidden; }
        .wr-bar i { display: block; width: 100%; background: #86EFAC; border-radius: 8px; transform-origin: bottom; animation: barGrow .6s cubic-bezier(.2,.8,.2,1) backwards; } .wr-col.cur .wr-bar i { background: var(--teal); }
        .wr-coll { font-size: 11.5px; font-weight: 600; } .wr-col.cur .wr-coll { color: var(--text); } .wr-colh { font-size: 10.5px; min-height: 14px; }
        .wr-note, .note-warn { background: #FFFBEB; border: 1px solid #FDE68A; color: #78350F; border-radius: 12px; padding: 10px 14px; font-size: 13px; line-height: 1.5; margin: 12px 0 0; }
        .note-warn { margin: 0 0 16px; }
        .mp-row.hr { border-top: 1px dashed var(--border); margin-top: 3px; padding-top: 3px; }

        .regime-desc { font-size: 13.5px; line-height: 1.55; color: #475569; margin: 2px 0 14px; } .regime-desc b { color: var(--text); }
        #contab-form .segmented, #contab-modo .segmented { display: flex; } #contab-form .seg-btn, #contab-modo .seg-btn { flex: 1; }
        #contab-form .form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; } #contab-form .link-btn { text-align: left; font-size: 12.5px; padding: 6px 0 0; }
        .ct-check { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; margin: 4px 0 10px; cursor: pointer; } .ct-check input { margin-top: 3px; width: 16px; height: 16px; flex-shrink: 0; } .ct-check small { display: block; font-size: 12px; color: var(--text-dim); margin-top: 2px; }
        .ct-steps { margin: 0; padding: 0; list-style: none; counter-reset: st; }
        .ct-steps li { counter-increment: st; position: relative; padding: 0 0 16px 40px; } .ct-steps li:last-child { padding-bottom: 0; }
        .ct-steps li::before { content: counter(st); position: absolute; left: 0; top: 0; width: 26px; height: 26px; border-radius: 50%; background: var(--surface-3); color: #475569; font-weight: 700; font-size: 12.5px; display: flex; align-items: center; justify-content: center; }
        .ct-steps li::after { content: ""; position: absolute; left: 12.5px; top: 30px; bottom: 4px; width: 1px; background: var(--border); } .ct-steps li:last-child::after { display: none; }
        .ct-steps b { display: block; font-size: 14.5px; margin-bottom: 2px; } .ct-steps span { display: block; font-size: 12.5px; color: var(--text-dim); line-height: 1.5; overflow-wrap: anywhere; }
        .fr-track { position: relative; height: 8px; background: var(--surface-3); border-radius: 999px; margin: 10px 0 20px; }
        .fr-track i { display: block; height: 100%; border-radius: 999px; transform-origin: left center; animation: growX .7s cubic-bezier(.2,.8,.2,1) .12s backwards; }
        .fr-track em { position: absolute; top: -4px; width: 2px; height: 16px; background: #0F172A; font-style: normal; font-size: 11px; font-weight: 700; color: #0F172A; text-indent: -10px; line-height: 50px; white-space: nowrap; }
        .tax-group { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: .04em; padding: 14px 0 6px; border-bottom: 1px solid var(--border); } .tax-group b { color: var(--text); font-size: 13px; }
        .tax-row { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
        .tax-l { min-width: 0; } .tax-l b { display: block; font-size: 14.5px; } .tax-l small, .tax-r small { display: block; font-size: 12px; color: var(--text-dim); line-height: 1.45; margin-top: 2px; } .tax-l .tax-pay { color: #475569; }
        .tax-r { text-align: right; flex-shrink: 0; } .tax-r b { font-size: 15px; }
        .tax-total { display: flex; justify-content: space-between; padding: 14px 0 4px; font-size: 15px; font-weight: 700; } .tax-total b { font-size: 17px; }
        .cmp-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .cmp-col { border: 1px solid var(--border); border-radius: 14px; padding: 12px 14px 6px; min-width: 0; } .cmp-col.sel { border-color: #94A3B8; } .cmp-col.best { background: #F0FDF4; border-color: #BBF7D0; }
        .cmp-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; min-height: 26px; } .cmp-head b { font-size: 14.5px; }
        .cmp-col .kv-line { font-size: 13px; } .cmp-col .kv-line:last-child { border-bottom: none; } .kv-line.total { font-weight: 700; } .kv-line.total span { color: var(--text); }
        .notes { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #475569; } .notes li { margin-bottom: 4px; }
        @media (max-width: 720px) {
          .wr-top { grid-template-columns: 1fr; } .wr-side { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; } .wr-side > div { padding: 10px 12px; } .wr-side > div:last-child { grid-column: 1 / -1; } .wr-side b { font-size: 16px; }
          .wr-main > b { font-size: 28px; } .wr-bar { height: 70px; }
          #contab-form .form-grid { grid-template-columns: 1fr; } .cmp-grid { grid-template-columns: 1fr; }
        }

        /* ================= v14: escala fixa e contabilidade simples ================= */
        .chip.sm { padding: 6px 10px; font-size: 12px; }
        .escala-ed { margin-top: 6px; } .escala-slot { border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; background: #fff; }
        .escala-row { display: flex; align-items: flex-end; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
        .escala-row label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: var(--text-dim); flex: 1; min-width: 110px; }
        .escala-row select, .escala-row input { font-family: inherit; font-size: 14px; padding: 8px 10px; border: 1px solid var(--border); border-radius: 10px; background: #fff; color: var(--text); min-height: 38px; width: 100%; }
        .escala-add { display: flex; gap: 8px; flex-wrap: wrap; }
        .escala-line { padding: 4px 0 12px 19px; border-bottom: 1px solid var(--border); font-size: 12.5px; color: var(--text-dim); }
        .escala-line .subtle-link { padding: 2px 0; }
        .cal-dot.esc { border-radius: 2px; } .cal-dot.off { opacity: .3; }
        .stub-card.off { opacity: .7; } .stub-card.off .stub-hospital { text-decoration: line-through; }
        .ct-q { margin-bottom: 18px; } .ct-q > b { display: block; font-size: 15px; margin-bottom: 8px; } .ct-q .field { max-width: 360px; }
        .ct-mais { margin: 0; } .ct-mais summary { font-size: 13px; color: #475569; }
        .ct-frase { font-size: 17px; line-height: 1.45; margin: 0 0 14px; color: var(--text); } .ct-frase b { font-weight: 700; white-space: nowrap; }
        .ct-bar { display: flex; height: 16px; border-radius: 999px; overflow: hidden; background: var(--surface-3); gap: 2px; } .ct-bar i { display: block; height: 100%; transform-origin: left center; animation: growX .7s cubic-bezier(.2,.8,.2,1) .12s backwards; }
        .ct-leg { margin-top: 10px; } .ct-leg > div { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 14px; } .ct-leg > div:last-child { border-bottom: none; font-weight: 700; }
        .ct-leg span { display: inline-flex; align-items: center; gap: 8px; } .ct-leg i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
        .ct-item { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
        .ct-item > div b { display: block; font-size: 14.5px; } .ct-item small { display: block; font-size: 12.5px; color: var(--text-dim); line-height: 1.45; margin-top: 2px; } .ct-item > b { font-size: 15px; flex-shrink: 0; }
        .ct-details > summary { cursor: pointer; font-weight: 600; font-size: 14px; color: #475569; list-style-position: inside; } .ct-details[open] > summary { margin-bottom: 8px; }
        /* ---- v15: escala com intervalo, lançamento do dia, lembretes e nota de corretagem ---- */
        .escala-row.rep { margin-top: 8px; } .escala-prox { font-size: 12px; color: var(--text-dim); margin-top: 6px; }
        .add-box { border: 1px solid var(--border); border-radius: 14px; padding: 14px; margin-top: 14px; background: var(--surface-2); }
        .add-box .mini-form { background: transparent; border: none; padding: 0; margin-top: 0; }
        .add-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 15px; margin-bottom: 10px; }
        .add-sub { font-size: 13px; color: var(--text-dim); margin: 0 0 12px; }
        .add-tip { font-size: 12.5px; color: var(--text-dim); background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; margin-top: 8px; }
        .add-box select, .add-box input[type=number] { background: #fff; }
        .lb-on { font-size: 11px; font-weight: 700; color: #166534; background: #DCFCE7; border-radius: 999px; padding: 2px 9px; }
        .lb-list { display: flex; flex-direction: column; gap: 5px; font-size: 13px; margin-top: 12px; background: var(--surface-2); border-radius: 10px; padding: 10px 12px; }
        .lb-list b { font-size: 12px; color: var(--text-dim); } .lb-list i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 7px; }
        .lb-list i.out { background: var(--brick); } .lb-list i.in { background: var(--teal); }
        .choice-row { grid-template-columns: repeat(2, 1fr); }
        @media (max-width: 720px) { .choice-row { grid-template-columns: 1fr; } }
        .imp-ctrl .tk-in { width: 130px; border: 1px solid var(--border); border-radius: 8px; padding: 7px 8px; font-size: 13px; background: #fff; font-family: inherit; text-transform: uppercase; }
        .imp-ctrl .tk-in.need { border-color: var(--brick); }
        .pm-line { display: block; margin-top: 3px; color: var(--text); } .pm-line b { color: var(--teal); }
        .escala-rep { margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--border); }
        .escala-q { font-size: 12px; font-weight: 600; color: var(--text-dim); margin: 8px 0 6px; } .escala-rep .escala-q:first-child { margin-top: 0; }
        /* ---- v17: despesas em lista, ajuste de preço médio ---- */
        .xl-cats { margin: 2px 0 12px; } .xl-bar { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: var(--surface-3); } .xl-bar i { display: block; height: 100%; min-width: 2px; }
        .xl-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 8px; font-size: 12px; color: var(--text-dim); } .xl-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; } .xl-legend b { color: var(--text); font-weight: 600; }
        .xl-tools { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12px; color: var(--text-dim); margin-bottom: 8px; }
        .xl { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: #fff; }
        .xl-row { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto 28px; align-items: center; gap: 10px; padding: 8px 10px; border-top: 1px solid var(--border); }
        .xl-head, .xl-date, .xl-cat, .xl-tipo, .xl-st { display: none; }
        .xl-sec { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding: 7px 10px; background: var(--surface-2); font-size: 12px; color: var(--text-dim); border-top: 1px solid var(--border); }
        .xl-secbox:first-of-type .xl-sec, .xl-head + .xl-secbox .xl-sec { border-top: none; }
        .xl-sec b { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--text); } .xl-sec.atrasadas b { color: var(--brick); } .xl-sec.pagas b { color: #15803D; }
        .xl-check { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #CBD5E1; background: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0; transition: background .15s, border-color .15s; }
        .xl-check:hover { border-color: #16A34A; } .xl-check.on { background: #16A34A; border-color: #16A34A; }
        .xl-main { min-width: 0; } .xl-title { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .xl-sub { display: flex; align-items: center; gap: 5px; flex-wrap: nowrap; white-space: nowrap; overflow: hidden; font-size: 12px; color: var(--text-dim); margin-top: 1px; } .xl-sub i, .xl-cat i { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .xl-amt { font-weight: 700; font-size: 14px; white-space: nowrap; text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; } .xl-amt small { font-weight: 600; font-size: 11px; }
        .xl-row.is-paid .xl-title { color: var(--text-dim); text-decoration: line-through; text-decoration-color: rgba(100,116,139,.45); } .xl-row.is-paid .xl-amt { color: var(--text-dim); }
        .xl-total { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px; border-top: 2px solid var(--border); font-size: 13px; color: var(--text-dim); background: var(--surface-2); } .xl-total b { font-size: 15px; color: var(--text); }
        @media (min-width: 721px) {
          .xl-row { grid-template-columns: 26px 52px minmax(0, 1fr) 150px 84px 118px 128px 28px; padding: 7px 12px; }
          .xl-head { display: grid; border-top: none; background: var(--surface-3); font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-dim); } .xl-head .r { text-align: right; }
          .xl-date, .xl-tipo, .xl-st { display: block; font-size: 13px; color: var(--text-dim); } .xl-cat { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .xl-sub, .xl-amt small { display: none; } .xl-row:not(.xl-head):hover { background: var(--surface-2); }
        }
        .pm-edit { background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; margin: 8px 0; }
        .pm-edit label { display: block; font-size: 12px; font-weight: 600; color: var(--text-dim); margin-bottom: 4px; }
        .pm-edit input { width: 100%; font-family: inherit; font-size: 15px; padding: 8px 10px; border: 1px solid var(--border); border-radius: 10px; background: #fff; color: var(--text); }
        .pm-edit .pm-btns { display: flex; gap: 8px; margin-top: 8px; } .pm-edit p { font-size: 12px; color: var(--text-dim); margin: 8px 0 0; }
        .kv-line .link-btn { padding: 0; margin-left: 8px; font-size: 12px; }
        .xl-more { background: none; border: none; padding: 2px 0 0; font-family: inherit; font-size: 12.5px; font-weight: 700; color: var(--teal); cursor: pointer; }
        .xl-fat { background: var(--surface-2); border-top: 1px solid var(--border); padding: 10px 12px 12px; } .xl-fat-h { font-size: 12px; font-weight: 600; color: var(--text-dim); margin-bottom: 6px; }
        .xl-grp { background: #fff; border: 1px solid var(--border); border-radius: 10px; margin-top: 6px; overflow: hidden; }
        .xl-grp-h { width: 100%; display: flex; align-items: center; gap: 10px; background: none; border: none; padding: 9px 10px 6px; font-family: inherit; font-size: 13.5px; color: var(--text); cursor: pointer; text-align: left; }
        .xl-grp-n { flex: 1; min-width: 0; display: flex; align-items: center; gap: 7px; font-weight: 600; flex-wrap: wrap; } .xl-grp-n i { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; } .xl-grp-n small { font-weight: 400; font-size: 12px; color: var(--text-dim); }
        .xl-grp-c { color: var(--text-dim); font-size: 12px; } .xl-grp-bar { height: 4px; background: var(--surface-3); margin: 0 10px 8px; border-radius: 999px; overflow: hidden; } .xl-grp-bar i { display: block; height: 100%; border-radius: 999px; }
        .xl-it { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 6px 10px; border-top: 1px solid var(--border); font-size: 13px; } .xl-it span:first-child { color: var(--text-dim); font-size: 12px; } .xl-it-d { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fat-box { display: flex; flex-direction: column; gap: 4px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 12px 14px; margin: 10px 0 12px; font-size: 13px; } .fat-box > span { color: var(--text-dim); } .fat-box input:not([type=checkbox]) { background: #fff; }
        .choice em { font-style: normal; font-size: 11px; font-weight: 700; color: #166534; background: #DCFCE7; border-radius: 999px; padding: 1px 8px; align-self: flex-start; }
        #day-modo { display: flex; margin-bottom: 0; } #day-modo .seg-btn { flex: 1; }
        .pl-chips { margin-top: 8px; } .pl-chips .chip i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
        .pl-rep { border-top: 1px dashed var(--border); margin: 4px 0 12px; padding-top: 10px; } .pl-rep .escala-q:first-child { margin-top: 0; }
        .add-box input[type=text], .add-box input:not([type]) { background: #fff; }
        .serie-tag { font-size: 10.5px; font-weight: 700; color: #1D4ED8; background: #DBEAFE; border-radius: 999px; padding: 1px 7px; margin-left: 6px; }
      
        /* ================= v27: calendário pela cor do dinheiro ================= */
        .cal-cell.fx-in1, .fx-legend i.fx-in1 { background-color: rgba(22,163,74,.12); } .cal-cell.fx-in2, .fx-legend i.fx-in2 { background-color: rgba(22,163,74,.26); } .cal-cell.fx-in3, .fx-legend i.fx-in3 { background-color: rgba(22,163,74,.46); }
        .cal-cell.fx-out1, .fx-legend i.fx-out1 { background-color: rgba(220,38,38,.11); } .cal-cell.fx-out2 { background-color: rgba(220,38,38,.24); } .cal-cell.fx-out3, .fx-legend i.fx-out3 { background-color: rgba(220,38,38,.42); }
        .cal-cell.fut[class*="fx-"], .fx-legend i.fut { background-image: repeating-linear-gradient(135deg, color-mix(in srgb, var(--surface) 62%, transparent) 0 4px, transparent 4px 8px); }
        .cal-cell[class*="fx-"] .cal-day-num, .cal-cell[class*="fx-"] .cal-hours { color: var(--text); }
        .cal-cell.selected[class*="fx-"] { box-shadow: 0 0 0 2px var(--text); }
        .fx-legend { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 14px; font-size: 12px; color: var(--text-dim); margin-top: 10px; }
        .fx-legend i { display: inline-block; width: 14px; height: 14px; border-radius: 4px; margin: 0 1px; vertical-align: -3px; } .fx-legend i.fx-zero { background: var(--surface); border: 1px solid var(--border); }
        .fx-day { margin: 4px 0 16px; padding: 12px 14px 4px; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--border); } .fx-head { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; font-size: 14px; } .fx-net { font-weight: 700; font-size: 14px; } .fx-net.in, .fx-line b.in { color: #15803D; } .fx-net.out { color: #B91C1C; }
        .fx-line { display: grid; grid-template-columns: 10px 1fr auto; gap: 10px; align-items: center; padding: 9px 0; border-top: 1px solid var(--border); font-size: 14px; }
        .fx-line i { width: 8px; height: 8px; border-radius: 50%; background: #DC2626; } .fx-line i.in { background: #16A34A; }
        .fx-nome { min-width: 0; font-weight: 500; } .fx-nome small { display: block; font-size: 12px; color: var(--text-dim); font-weight: 400; } .fx-line b { white-space: nowrap; }

        .xl-it.xl-aj { grid-template-columns: 1fr auto; display: grid; gap: 10px; border-top: 1px dashed var(--border); margin-top: 8px; padding-top: 10px; color: var(--text-dim); }


        /* ================= v30: engrenagem das configurações ================= */
        .tb-gear { width: 38px; height: 38px; flex-shrink: 0; border-radius: 50%; border: 1px solid var(--border); background: var(--surface); color: var(--text); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
        .tb-gear:hover { background: var(--surface-3); } .tb-gear.on { background: var(--text); color: var(--surface); border-color: var(--text); }
        .tb-gear:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
        @media (max-width: 720px) { .tb-gear { width: 34px; height: 34px; } .tb-right { gap: 6px; } }

        /* ================= v46: formas de recebimento e o novo "Adicionar" ================= */
        .fm-ops { display: flex; flex-direction: column; gap: 8px; }
        .fm-op { display: grid; grid-template-columns: 40px minmax(0, 1fr) 20px; gap: 12px; align-items: center; width: 100%; text-align: left; border: 1.5px solid var(--border); border-radius: 14px; padding: 11px 12px; background: var(--surface, #fff); font: inherit; color: var(--text); cursor: pointer; }
        .fm-op.on { border-color: var(--teal); background: #F0FDF4; }
        .fm-op i { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; font-style: normal; font-size: 19px; }
        .fm-op b { display: block; font-size: 14.5px; } .fm-op small { display: block; font-size: 12.5px; color: var(--text-dim); margin-top: 2px; line-height: 1.35; }
        .fm-op em { display: inline-block; font-style: normal; font-size: 11.5px; font-weight: 700; border-radius: 6px; padding: 2px 7px; margin-top: 6px; }
        .fm-op em.warn { background: #FEF3C7; color: #92400E; } .fm-op em.ok { background: #DCFCE7; color: #15803D; }
        .fm-rad { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #CBD5E1; } .fm-op.on .fm-rad { border: 6px solid var(--teal); }
        .fm-op:focus-visible, .add-op:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
        .rc-info { background: #F1F5F9; color: #334155; border-radius: 10px; padding: 10px 12px; font-size: 13px; line-height: 1.45; margin: 4px 0 12px; }
        .rc-info.warn { background: #FEF3C7; color: #92400E; } .rc-info.ok { background: #ECFDF5; color: #166534; margin-top: 12px; }
        .rc-res { background: var(--surface-2); border-radius: 12px; padding: 10px 12px; margin-top: 10px; font-size: 13.5px; }
        .rc-res > div { display: flex; justify-content: space-between; padding: 3px 0; } .rc-res .t { border-top: 1px solid var(--border); margin-top: 4px; padding-top: 7px; font-weight: 800; } .rc-res .t b { color: #15803D; }
        .add-sheet { max-height: 92vh; overflow-y: auto; }
        .add-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .add-op { display: grid; grid-template-columns: 44px minmax(0, 1fr) 18px; gap: 12px; align-items: center; width: 100%; text-align: left; border: 1.5px solid var(--border); border-radius: 16px; padding: 12px 14px; margin-bottom: 8px; background: var(--surface, #fff); font: inherit; color: var(--text); cursor: pointer; }
        .add-op:hover { border-color: var(--teal); }
        .add-op i { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; font-style: normal; font-size: 21px; }
        .add-op b { display: block; font-size: 15px; } .add-op small { display: block; font-size: 12.5px; color: var(--text-dim); margin-top: 2px; line-height: 1.35; }
        .add-op > svg { color: var(--text-dim); }
        .add-mais { display: flex; gap: 18px; justify-content: center; margin-top: 6px; }
        .seg2 { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; background: var(--surface-3); border-radius: 11px; padding: 3px; }
        .seg2 button { border: none; background: none; font: inherit; font-size: 13.5px; font-weight: 600; color: var(--text-dim); padding: 9px 6px; border-radius: 9px; cursor: pointer; }
        .seg2 button.on { background: var(--surface, #fff); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.12); }
        .pl-add .field { margin-bottom: 12px; } .pl-add .esc-grid { margin-bottom: 14px; }
        .pl-add .esc-grid select, .pl-add .esc-grid input, .pl-add input[type=date] { width: 100%; height: 44px; border: 1px solid var(--border); border-radius: 10px; padding: 0 12px; font: inherit; font-size: 15px; background: var(--surface, #fff); color: var(--text); }
        .pl-add .esc-grid input:focus, .pl-add .esc-grid select:focus { outline: 2px solid var(--teal); outline-offset: 0; border-color: var(--teal); }
        .fz-add-main { font-weight: 700; }
        .ct-fm { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 4px 12px; align-items: center; padding: 11px 0; border-top: 1px solid var(--border); }
        .ct-fm:first-of-type { border-top: none; }
        .ct-fm i { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; font-style: normal; font-size: 17px; }
        .ct-fm-o { grid-column: 2 / -1; font-size: 12.5px; color: var(--text); background: var(--surface-2); border-radius: 8px; padding: 6px 10px; }
        :root[data-theme="dark"] .fm-op.on { background: rgba(52,211,153,.10); }
        :root[data-theme="dark"] .rc-info { background: var(--surface-3); color: var(--text); } :root[data-theme="dark"] .rc-info.warn { background: rgba(245,158,11,.14); color: #FCD34D; } :root[data-theme="dark"] .rc-info.ok { background: rgba(52,211,153,.12); color: #6EE7B7; }

        /* ================= v45: escala fixa mais simples ================= */
        .esc { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
        .esc-sum { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 4px; align-items: center; border: 1px solid var(--border); border-radius: 12px; padding: 6px 6px 6px 12px; background: var(--surface, #fff); }
        .esc-sum-b { border: none; background: none; text-align: left; font: inherit; color: var(--text); padding: 4px 0; cursor: pointer; min-width: 0; }
        .esc-sum-b b { display: block; font-size: 14px; } .esc-sum-b small { display: block; font-size: 12.5px; color: var(--text-dim); margin-top: 1px; }
        .esc-ed { border: 1.5px solid var(--teal); border-radius: 14px; padding: 12px; background: var(--surface, #fff); }
        .esc-l { display: block; font-size: 12.5px; font-weight: 600; color: var(--text-dim); margin-bottom: 5px; }
        .esc-dias { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-bottom: 12px; }
        .esc-dia { height: 40px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface, #fff); font: inherit; font-weight: 700; font-size: 14px; color: var(--text); cursor: pointer; }
        .esc-dia span { display: none; } .esc-dia.on { background: var(--teal); border-color: var(--teal); color: #fff; }
        @media (min-width: 560px) { .esc-dia { font-size: 0; } .esc-dia span { display: inline; font-size: 13.5px; } }
        .esc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px; }
        .esc-grid select { width: 100%; }
        @media (max-width: 559px) { .esc-grid .esc-rep { grid-column: 1 / -1; } }
        .esc-step { display: flex; align-items: center; border: 1px solid var(--border); border-radius: 10px; height: 42px; overflow: hidden; }
        .esc-step button { width: 42px; height: 100%; border: none; background: var(--surface-3); font: inherit; font-size: 18px; font-weight: 700; color: var(--text); cursor: pointer; }
        .esc-step b { flex: 1; text-align: center; font-size: 14.5px; }
        .esc-prox { font-size: 12.5px; color: var(--text-dim); margin-top: 10px; }
        .esc-btns { display: flex; gap: 8px; margin-top: 12px; }
        .esc-foot { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 12.5px; color: var(--text-dim); }

        /* ================= v44: contabilidade (gavetas e cartões também no celular) ================= */
        .dgvs { display: grid; grid-template-columns: 1fr; gap: 10px; align-items: start; }
        .dgv { background: var(--surface, #fff); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .dgv-h { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto 18px; gap: 12px; align-items: center; width: 100%; padding: 13px 14px; border: none; background: none; font: inherit; color: var(--text); text-align: left; cursor: pointer; }
        .dgv-ic { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; }
        .dgv-t { min-width: 0; } .dgv-t b { display: block; font-size: 14.5px; } .dgv-t small { display: block; font-size: 12.5px; color: var(--text-dim); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dgv-v { font-size: 13px; font-weight: 700; white-space: nowrap; }
        .dgv-ch { color: var(--text-dim); display: inline-flex; transition: transform .18s; } .dgv.open .dgv-ch { transform: rotate(90deg); }
        .dgv.open .dgv-h { border-bottom: 1px solid var(--border); }
        .dgv-b { padding: 14px; }
        .dgv-b > div > .card { border: none; box-shadow: none; padding: 0; margin: 0 0 12px; background: none; }
        .dkpi { background: var(--surface, #fff); border: 1px solid var(--border); border-radius: 14px; padding: 12px 14px; min-width: 0; }
        .dkpi small { display: block; font-size: 12.5px; color: var(--text-dim); }
        .dkpi b { display: block; font-size: 19px; font-weight: 800; letter-spacing: -0.02em; margin: 3px 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dkpi em { display: block; font-style: normal; font-size: 12px; font-weight: 600; color: var(--text-dim); }
        .dprox > div { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; font-size: 13.5px; }
        .dprox > div + div { border-top: 1px solid var(--border); }
        .dprox small { display: block; color: var(--text-dim); font-size: 12px; margin-top: 1px; }
        .ct-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
        .ct-sec { font-size: 13px; font-weight: 600; color: var(--text-dim); margin: 18px 4px 8px; }
        .ct-pag { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
        .ct-bol { display: grid; grid-template-columns: 1fr 120px; gap: 10px; margin-bottom: 6px; } .ct-bol .field { margin: 0; }
        .ct-list { margin: 4px 0 6px; }
        .ct-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; align-items: center; padding: 11px 0; border-top: 1px solid var(--border); }
        .ct-row:first-child { border-top: none; }
        .ct-row > .btn { grid-column: 1 / -1; justify-self: start; }
        .ct-row.ct-chk { grid-template-columns: 22px minmax(0, 1fr) auto; cursor: pointer; } .ct-row.ct-chk input { width: 18px; height: 18px; }
        .ct-l { min-width: 0; } .ct-l b { font-size: 14px; } .ct-l small { display: block; font-size: 12.5px; color: var(--text-dim); margin-top: 2px; }
        .ct-v { font-size: 14px; white-space: nowrap; text-align: right; }
        .ct-row.pago .ct-l b, .ct-row.pago .ct-v { color: var(--text-dim); }
        .ctg { display: inline-block; font-size: 11px; font-weight: 700; border-radius: 6px; padding: 2px 7px; margin-left: 7px; vertical-align: 1px; }
        .ctg.ok { background: #DCFCE7; color: #15803D; } .ctg.warn { background: #FEF3C7; color: #92400E; } .ctg.bad { background: #FEE2E2; color: #B91C1C; }
        .ct-cx { display: flex; gap: 14px; align-items: center; margin: 4px 0 8px; }
        .ct-ir .form-grid { margin-bottom: 10px; }
        .ct-ir-res { background: var(--surface-2); border-radius: 12px; padding: 10px 14px; }
        .ct-ir-box { border-radius: 12px; padding: 12px 14px; margin-top: 10px; } .ct-ir-box small { display: block; font-size: 12.5px; color: var(--text-dim); } .ct-ir-box b { display: block; font-size: 21px; font-weight: 800; margin-top: 2px; }
        .ct-ir-box.ok { background: #ECFDF5; } .ct-ir-box.ok b { color: #15803D; } .ct-ir-box.bad { background: #FEF2F2; } .ct-ir-box.bad b { color: #B91C1C; }
        .ct-off { text-align: center; margin: 18px 0 4px; }
        .ct .card { margin-bottom: 12px; }
        @media (min-width: 1100px) {
          .ct .ct-row { grid-template-columns: minmax(0, 1fr) auto 150px; } .ct .ct-row > .btn { grid-column: auto; justify-self: end; }
          .ct .ct-row.ct-chk { grid-template-columns: 22px minmax(0, 1fr) auto; }
          .ct .dgvs { grid-template-columns: 1fr 1fr; gap: 12px; }
          .ct .dkpi b { font-size: 24px; }
        }
        :root[data-theme="dark"] .ctg.ok { background: rgba(52,211,153,.16); color: #34D399; } :root[data-theme="dark"] .ctg.warn { background: rgba(245,158,11,.16); color: #FBBF24; } :root[data-theme="dark"] .ctg.bad { background: rgba(239,68,68,.16); color: #F87171; }
        :root[data-theme="dark"] .ct-ir-box.ok { background: rgba(52,211,153,.12); } :root[data-theme="dark"] .ct-ir-box.bad { background: rgba(239,68,68,.12); }

        /* ================= v42: computador (menu lateral, painéis e gavetas) ================= */
        .dsb { display: none; }
        @media (max-width: 1099px) { .main { margin-left: 0; } }
        @media (min-width: 1100px) {
          .dsb { display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; width: 232px; z-index: 40; background: var(--surface, #fff); border-right: 1px solid var(--border); padding: 20px 14px; overflow-y: auto; }
          .dsb-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 19px; letter-spacing: -0.02em; margin: 0 6px 18px; }
          .dsb-new { display: flex; align-items: center; justify-content: center; gap: 8px; height: 42px; border: none; border-radius: 12px; background: var(--teal); color: #fff; font: inherit; font-weight: 700; font-size: 14px; cursor: pointer; margin-bottom: 16px; }
          .dsb-new:hover { background: #15803D; }
          .dsb nav { display: flex; flex-direction: column; gap: 2px; }
          .dsb-i { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border: none; background: none; border-radius: 10px; font: inherit; font-size: 14px; font-weight: 600; color: var(--text-dim); cursor: pointer; text-align: left; }
          .dsb-i:hover { background: var(--surface-3); color: var(--text); }
          .dsb-i.on { background: #E6F4EC; color: #15803D; }
          .dsb-i:focus-visible, .dgv-h:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
          .dsb-g { font-size: 11.5px; font-weight: 600; color: var(--text-dim); margin: 16px 12px 6px; }
          .main { margin-left: 232px !important; }
          .navstrip { display: none; }
          .topbar2 .tb-logo, .topbar2 .tb-new { display: none; }
          .page { max-width: 1400px; }
          .dgrid { display: grid; gap: 14px; margin-bottom: 14px; }
          .dgrid > .card { margin-bottom: 0; }
          .dkpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
          .dkpi { background: var(--surface, #fff); border: 1px solid var(--border); border-radius: 16px; padding: 16px 18px; }
          .dkpi small { display: block; font-size: 13px; color: var(--text-dim); }
          .dkpi b { display: block; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; margin: 4px 0 2px; }
          .dkpi em { display: block; font-style: normal; font-size: 12.5px; font-weight: 600; color: var(--text-dim); }
          .dspark { display: block; margin-top: 10px; max-width: 100%; }
          .dflx-leg { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-dim); margin-top: 6px; }
          .dprox > div { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; font-size: 13.5px; }
          .dprox > div + div { border-top: 1px solid var(--border); }
          .dprox span b { font-weight: 600; } .dprox small { display: block; color: var(--text-dim); font-size: 12px; margin-top: 1px; }
          .dsec { font-size: 13px; font-weight: 600; color: var(--text-dim); margin: 22px 2px 10px; }
          .dgvs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
          .dgv { background: var(--surface, #fff); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
          .dgv.wide { grid-column: 1 / -1; }
          .dgv-h { display: grid; grid-template-columns: 38px 1fr auto 20px; gap: 14px; align-items: center; width: 100%; padding: 14px 18px; border: none; background: none; font: inherit; color: var(--text); text-align: left; cursor: pointer; }
          .dgv-h:hover { background: var(--surface-2); }
          .dgv-ic { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; }
          .dgv-t b { display: block; font-size: 14.5px; } .dgv-t small { display: block; font-size: 12.5px; color: var(--text-dim); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .dgv-t { min-width: 0; }
          .dgv-v { font-size: 14px; font-weight: 700; white-space: nowrap; }
          .dgv-ch { color: var(--text-dim); display: inline-flex; transition: transform .18s; } .dgv.open .dgv-ch { transform: rotate(90deg); }
          .dgv.open .dgv-h { border-bottom: 1px solid var(--border); }
          .dgv-b { padding: 16px 18px; }
          .dgv-b > .card { border: none; box-shadow: none; padding: 0; margin: 0; background: none; }
          .dgv-b .grid-2 { display: block; } .dgv-b .grid-2 > .card { border: none; box-shadow: none; padding: 0; margin: 0; }
          .dmetas { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } .dmetas > div { display: flex; gap: 12px; align-items: center; font-size: 13.5px; } .dmetas small { display: block; color: var(--text-dim); font-size: 12px; }
          .desk .greet { margin-bottom: 12px; }
          .dgrid .xl-row { grid-template-columns: 26px 50px minmax(0, 1fr) 118px 112px 122px 28px; }
          .dgrid .xl-tipo { display: none !important; }
          .dinv-ev svg { max-height: 220px; }
          /* calendário grande */
          .cal-desk .cal-cell { position: relative; }
          .calendar-grid.cal-desk { gap: 6px; }
          .cal-desk .cal-cell { min-height: 104px; aspect-ratio: auto; align-items: flex-start; justify-content: flex-start; padding: 8px 9px; text-align: left; }
          .cal-desk .cal-day-num { font-size: 13.5px; font-weight: 700; }
          .cal-desk .cal-dots { position: absolute; top: 10px; right: 9px; }
          .cal-desk .cal-hours { position: absolute; bottom: 6px; right: 8px; }
          .cal-lines { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; width: 100%; min-width: 0; }
          .cal-lines span { font-size: 11.5px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .cl-pl { background: #DCFCE7; color: #15803D; border-radius: 5px; padding: 1px 6px; align-self: flex-start; font-weight: 600; }
          .cl-in { color: #15803D; font-weight: 600; } .cl-out { color: #B91C1C; font-weight: 600; } .cl-more { color: var(--text-dim); }
          /* metas em duas colunas */
          .mt { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; align-items: start; }
          .mt > :not(.mt-meta) { grid-column: 1 / -1; }
          :root[data-theme="dark"] .dsb-i.on { background: rgba(52,211,153,.14); color: #34D399; }
          :root[data-theme="dark"] .cl-pl { background: rgba(52,211,153,.16); color: #34D399; }
          :root[data-theme="dark"] .cl-in { color: #4ADE80; } :root[data-theme="dark"] .cl-out { color: #F87171; }
        }
        @media print { .dsb { display: none !important; } .main { margin-left: 0 !important; } }

        /* ================= v41: barra de ações suspensa ================= */
        .dock, .dk-scrim { display: none; }
        @media (max-width: 720px) {
          .navstrip { display: none; }
          .main { padding-bottom: 110px; }
          .dock { display: flex; position: fixed; left: 12px; right: 82px; bottom: calc(14px + env(safe-area-inset-bottom)); height: 58px; border-radius: 29px; z-index: 46;
            align-items: center; justify-content: space-around; padding: 0 4px; background: rgba(255,255,255,.94); border: 1px solid #EEF0F3; box-shadow: 0 10px 30px rgba(15,23,42,.16);
            -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
          .dk-btn { width: 44px; height: 44px; border-radius: 50%; border: none; background: none; color: #64748B; display: grid; place-items: center; cursor: pointer; padding: 0; transition: background .18s, color .18s, transform .12s; }
          .dk-btn:active { transform: scale(.9); }
          .dk-btn.on { background: #E6F4EC; color: #15803D; }
          .dk-btn:focus-visible, .dk-item:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
          .fab2 { bottom: calc(15px + env(safe-area-inset-bottom)) !important; width: 58px !important; height: 58px !important; right: 12px !important; }
          .dk-scrim { display: block; position: fixed; inset: 0; z-index: 44; background: rgba(15,23,42,.35); animation: fadeIn .15s ease; }
          .dk-sheet { position: absolute; left: 10px; right: 10px; bottom: calc(84px + env(safe-area-inset-bottom)); background: var(--surface, #fff); border-radius: 24px; padding: 16px 12px 14px; box-shadow: 0 18px 40px rgba(15,23,42,.25); animation: dkUp .2s ease; }
          .dk-sheet h4 { margin: 0 6px 12px; font-size: 14.5px; }
          .dk-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 4px; }
          .dk-item { border: none; background: none; font: inherit; font-size: 11.5px; font-weight: 600; color: var(--text); display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; padding: 0; }
          .dk-item span { width: 50px; height: 50px; border-radius: 15px; background: var(--surface-3, #F1F5F9); display: grid; place-items: center; color: #334155; }
          .dk-item.on span { background: #E6F4EC; color: #15803D; }
          :root[data-theme="dark"] .dock { background: rgba(17,24,39,.94); border-color: #273244; box-shadow: 0 10px 30px rgba(0,0,0,.45); }
          :root[data-theme="dark"] .dk-btn { color: #94A3B8; } :root[data-theme="dark"] .dk-btn.on, :root[data-theme="dark"] .dk-item.on span { background: rgba(52,211,153,.16); color: #34D399; }
          :root[data-theme="dark"] .dk-item span { color: #CBD5E1; }
        }
        @keyframes dkUp { from { transform: translateY(16px); opacity: 0; } to { transform: none; opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .dk-sheet, .dk-scrim { animation: none; } }
        @media print { .dock, .dk-scrim { display: none !important; } }

        /* ================= v37: investimentos por classe (modelo A) ================= */
        .cl-tot { margin: 2px 0 12px; } .cl-tot b { display: block; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; } .cl-tot small { display: block; font-size: 13px; margin-top: 2px; }
        .cl-bar { display: flex; gap: 2px; height: 12px; border-radius: 6px; overflow: hidden; margin-top: 12px; background: var(--surface-3); } .cl-bar i { display: block; height: 100%; }
        .cl-card { background: var(--surface, #fff); border: 1px solid var(--border); border-radius: 16px; margin-bottom: 10px; overflow: hidden; }
        .cl-head { display: grid; grid-template-columns: 10px 1fr auto 18px; gap: 12px; align-items: center; width: 100%; padding: 14px 16px; background: none; border: none; font: inherit; color: var(--text); text-align: left; cursor: pointer; }
        .cl-head:focus-visible { outline: 2px solid var(--teal); outline-offset: -2px; }
        .cl-dot { width: 10px; height: 10px; border-radius: 3px; }
        .cl-name b { display: block; font-size: 15.5px; } .cl-name small { display: block; font-size: 12.5px; color: var(--text-dim); margin-top: 2px; }
        .cl-val { text-align: right; } .cl-val b { display: block; font-size: 15px; font-weight: 700; } .cl-val small { display: block; font-size: 12.5px; font-weight: 600; margin-top: 2px; }
        .cl-chev { color: var(--text-dim); transition: transform .18s; display: inline-flex; } .cl-card.open .cl-chev { transform: rotate(180deg); }
        .cl-card .asset-grid { display: block; gap: 0; padding: 0; margin: 0; }
        .cl-card .asset-card.cl-row { border: none; border-top: 1px solid var(--border); border-radius: 0; box-shadow: none; transform: none; animation: none; background: transparent; }
        .cl-row .ac-top { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; padding: 11px 16px; }
        .cl-row .ac-id b { font-size: 14.5px; } .cl-row .ac-id span { font-size: 12px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
        .cl-row .ac-val { text-align: right; display: block; } .cl-row .ac-val b { display: block; font-size: 14.5px; } .cl-row .ac-val small { display: block; font-size: 12px; font-weight: 600; color: var(--text-dim); margin-top: 1px; }
        .cl-row.open { background: var(--surface-2, #F8FAFB); }
        .cl-row .ac-stats, .cl-row .ac-foot, .cl-row .ac-more { padding-left: 16px; padding-right: 16px; }
        .cl-row .ac-stats, .cl-row .ac-stats.three { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 14px; padding-top: 4px; padding-bottom: 6px; }
        .cl-row .ac-stat span { white-space: nowrap; } .cl-row .ac-id span { font-weight: 500; }
        @media (min-width: 700px) { .cl-row .ac-stats { grid-template-columns: repeat(4, 1fr); } .cl-row .ac-stats.three { grid-template-columns: repeat(3, 1fr); } }
        .pm-in { font-weight: 700; border-color: var(--teal) !important; }
        .pm-bar { margin: 4px 16px 10px; padding: 12px; border-radius: 12px; background: var(--surface-3); font-size: 13.5px; line-height: 1.45; }
        .pm-bar .pm-btns { display: flex; gap: 8px; margin: 10px 0 6px; flex-wrap: wrap; } .pm-bar small { color: var(--text-dim); font-size: 12px; }
        .cl-more { display: block; width: 100%; text-align: left; padding: 12px 16px; border: none; border-top: 1px solid var(--border); background: none; font: inherit; font-size: 13.5px; font-weight: 600; color: var(--teal); cursor: pointer; }

        /* ================= v36: teto de gastos, metas compactas, print ================= */
        .tt-big { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; margin-top: 2px; }
        .tt-big b { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; } .tt-big span { color: var(--text-dim); font-weight: 600; }
        .tt-bar { height: 10px; border-radius: 5px; background: var(--surface-3); overflow: hidden; margin: 10px 0 6px; } .tt-bar i { display: block; height: 100%; border-radius: 5px; }
        .tt-sub { font-size: 13.5px; color: var(--text-dim); } .tt-sub b { color: var(--text); } .tt-sub .tt-neg { color: #B91C1C; }
        .tt .tt-cat { margin-top: 12px; border-top: 1px solid var(--border); }
        .tt .tt-cat span small { display: block; font-size: 12px; font-weight: 400; color: var(--text-dim); margin-top: 1px; }
        .mt-head { display: flex; justify-content: space-between; align-items: center; margin: 22px 4px 8px; } .mt-head h3 { margin: 0; font-size: 17px; }
        .mt-meta { padding: 0; overflow: hidden; }
        .mt-row { display: grid; grid-template-columns: 48px 1fr 18px; gap: 14px; align-items: center; width: 100%; padding: 14px 16px; border: none; background: none; font: inherit; color: var(--text); text-align: left; cursor: pointer; }
        .mt-row:focus-visible { outline: 2px solid var(--teal); outline-offset: -2px; }
        .mt-txt { min-width: 0; } .mt-txt b { display: block; font-size: 15.5px; font-weight: 600; } .mt-txt small { display: block; font-size: 12.5px; color: var(--text-dim); margin-top: 2px; line-height: 1.4; }
        .mt-chev { color: var(--text-dim); font-size: 20px; transition: transform .18s; } .mt-meta.open .mt-chev { transform: rotate(90deg); }
        .mt-body { padding: 0 16px 16px; border-top: 1px solid var(--border); }
        .mt-body .gp { margin-top: 0; border-top: none; }
        .mt-prazo { font-size: 13px; color: var(--text-dim); padding-top: 12px; }
        .mt-aporte { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; margin-top: 4px; } .mt-aporte .field { flex: 1; min-width: 160px; margin: 0; }
        .xl-edit { padding: 0 6px; }
        .inv-acoes { display: flex; gap: 8px; flex-wrap: wrap; }
        .gp-rend { display: flex; align-items: center; gap: 8px; margin-top: 8px; } .gp-rend input { width: 110px; } .gp-rend span { color: var(--text-dim); font-size: 14px; }
        .pr-res { margin-top: 14px; }
        .pr-top { display: flex; gap: 14px; align-items: center; margin-bottom: 8px; font-size: 13.5px; line-height: 1.45; } .pr-top b { display: block; } .pr-top span { color: var(--text-dim); }
        .pr-thumb { width: 72px; height: 120px; object-fit: cover; object-position: top; border-radius: 10px; border: 1px solid var(--border); flex-shrink: 0; }
        .pr-row { display: grid; grid-template-columns: 22px 1fr 84px 120px; gap: 10px; align-items: end; padding: 10px 0; border-top: 1px solid var(--border); }
        .pr-row > input[type=checkbox] { width: 18px; height: 18px; align-self: center; }
        .pr-row .field { margin: 0; } .pr-row .field label { font-size: 11.5px; } .pr-row .field input { padding: 8px 9px; }
        .pr-tk { align-self: center; } .pr-tk b { display: block; font-size: 15px; } .pr-tk small { color: var(--text-dim); font-size: 12px; }
        .pr-row.off { opacity: .45; }
        .pr-row.falta .field input[value=""] { border-color: #DC2626; background: #FEF2F2; }
        @media (max-width: 420px) { .pr-row { grid-template-columns: 22px 1fr 1fr; } .pr-row > input[type=checkbox] { grid-row: 1; grid-column: 1; } .pr-row .pr-tk { grid-row: 1; grid-column: 2 / -1; } .pr-row .pr-q { grid-row: 2; grid-column: 2; } .pr-row .pr-p { grid-row: 2; grid-column: 3; } }
        :root[data-theme="dark"] .pr-row.falta .field input[value=""] { background: rgba(239,68,68,.12); } :root[data-theme="dark"] .tt-sub .tt-neg { color: #F87171; }

        /* ================= v35: editar lançamentos do faturamento ================= */
        .fz-pen { width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--border); background: var(--surface); color: var(--text-dim); display: inline-grid; place-items: center; cursor: pointer; padding: 0; }
        .fz-pen:hover { color: var(--text); } .fz-pen.on { background: var(--text); color: var(--surface); border-color: var(--text); }
        .fz-pen:focus-visible, .fz-add:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
        tr.fz-aberta td { border-bottom-color: transparent; }
        tr.fz-row td { padding: 0 12px 12px !important; }
        .fz-ed { background: var(--surface-2); border: 1px solid var(--border); border-radius: 14px; padding: 12px; margin: 2px 0 10px; text-align: left; }
        .fz-ed .mini-form { background: none; border: none; padding: 0; margin: 0; }
        .fz-tit { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
        .fz-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; } .fz-btns .fz-del { color: var(--brick); }
        .fz-add-wrap { padding: 2px 16px 6px; border-top: 1px solid var(--border); }
        .fz-add { display: flex; align-items: center; gap: 10px; width: 100%; padding: 13px 0; border: none; background: none; font: inherit; font-weight: 600; font-size: 14.5px; color: var(--teal); cursor: pointer; text-align: left; }
        .fz-add-wrap > .fz-add ~ .fz-add { border-top: 1px solid var(--border); }
        .fz-add i { width: 28px; height: 28px; border-radius: 9px; background: rgba(22,163,74,.12); display: grid; place-items: center; font-style: normal; font-size: 16px; flex-shrink: 0; }
        .fz-add span { flex: 1; } .fz-add em { font-style: normal; color: var(--text-dim); font-size: 18px; transition: transform .15s; } .fz-add[aria-expanded="true"] em { transform: rotate(90deg); }
        .fz-out { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 0; font-size: 14px; }
        .fz-out + .fz-out, .fz-ed + .fz-out { border-top: 1px solid var(--border); }
        .fz-out b { font-weight: 600; } .fz-out small { display: block; font-size: 12px; color: var(--text-dim); margin: 2px 0 0 18px; }
        :root[data-theme="dark"] .fz-add { color: #4ADE80; } :root[data-theme="dark"] .fz-add i { background: rgba(74,222,128,.15); }
        @media (prefers-reduced-motion: reduce) { .fz-add em { transition: none; } }

        /* ================= v34: gavetas ================= */
        .gv-t { cursor: pointer; display: inline-flex; align-items: center; gap: 10px; user-select: none; -webkit-user-select: none; border-radius: 6px; }
        .gv-t::after { content: ""; width: 7px; height: 7px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: translateY(-2px) rotate(45deg); opacity: .45; transition: transform .18s; flex-shrink: 0; }
        .gv-closed .gv-t::after { transform: rotate(-45deg); }
        .gv-t:focus-visible { outline: 2px solid var(--teal); outline-offset: 3px; }
        .gv-closed > :not(.card-head):not(.gv-t) { display: none !important; }
        .gv-closed > .card-head, .gv-closed > .gv-t { margin-bottom: 0 !important; }
        .gv-closed > .card-head > .segmented, .gv-closed > .card-head > .card-note { display: none; }
        .gv-closed.card { padding-top: 16px; padding-bottom: 16px; }
        .gv-closed.card.flush > .card-head { padding-bottom: 16px; }
        @media (prefers-reduced-motion: reduce) { .gv-t::after { transition: none; } }

        /* ================= v32: projeção das metas ================= */
        .gp { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
        .gp-tit { font-size: 14px; font-weight: 600; color: var(--text-dim); }
        .gp-res { font-size: 16px; line-height: 1.4; margin: 4px 0 8px; } .gp-res b { color: #15803D; }
        .gp-prazo { font-size: 13.5px; line-height: 1.4; padding: 9px 12px; border-radius: 10px; margin-bottom: 10px; }
        .gp-prazo.ok { background: #F0FDF4; color: #166534; } .gp-prazo.falta { background: #FFFBEB; color: #92400E; }
        .gp-svg { display: block; max-height: 120px; margin: 2px 0 4px; } .gp-fim { fill: var(--surface); stroke-width: 3; }
        .gp-grid { stroke: var(--border); } .gp-alvo { stroke: #3B82F6; stroke-width: 1.6; stroke-dasharray: 5 5; }
        .gp-lbl { fill: var(--text-dim); font-size: 11px; font-family: inherit; }
        
        .gp-campos { display: grid; grid-template-columns: 1fr; gap: 4px; margin-top: 12px; }
        :root[data-theme="dark"] .gp-res b { color: #4ADE80; } :root[data-theme="dark"] .gp-alvo { stroke: #60A5FA; }
        :root[data-theme="dark"] .gp-prazo.ok { background: rgba(34,197,94,.12); color: #86EFAC; } :root[data-theme="dark"] .gp-prazo.falta { background: rgba(245,158,11,.12); color: #FCD34D; }

        /* ================= v31: organização (caminho do dinheiro) ================= */
        .oa { max-width: 640px; }
        .oa-chips { display: flex; gap: 8px; margin-bottom: 12px; }
        .oa-chips button { flex: 1; font: inherit; font-size: 13.5px; font-weight: 600; padding: 10px 8px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text-dim); cursor: pointer; }
        .oa-chips button.on { background: var(--text); color: var(--surface); border-color: var(--text); }
        .oa-chips button:focus-visible, .oa-li-r button:focus-visible, .oa-ir:focus-visible, .oa-mais:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
        .oa-h { margin: 0 0 6px; font-size: 14.5px; font-weight: 600; color: var(--text-dim); }
        .oa-st { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 6px 12px; padding: 12px 0; }
        .oa-st + .oa-st { border-top: 1px dashed var(--border); }
        .oa-lb { font-size: 15px; color: var(--text); font-weight: 500; min-width: 0; }
        .oa-lb small { display: block; font-size: 12.5px; color: var(--text-dim); font-weight: 400; margin-top: 2px; }
        .oa-v { font-size: 17px; font-weight: 700; white-space: nowrap; text-align: right; }
        .oa .in { color: #15803D; } .oa .out { color: #B91C1C; } .oa .inv { color: #1D4ED8; }
        .oa-bar { grid-column: 1 / -1; display: flex; height: 10px; border-radius: 5px; background: var(--surface-3); overflow: hidden; }
        .oa-bar i { display: block; height: 100%; }
        .oa-bar i.in { background: #16A34A; } .oa-bar i.in2 { background: #BBF7D0; } .oa-bar i.out { background: #EF4444; } .oa-bar i.out2 { background: #FECACA; } .oa-bar i.inv { background: #3B82F6; }
        .oa-res { margin-top: 10px; padding: 14px 16px; border-radius: 14px; background: #F0FDF4; border: 1.5px solid #86EFAC; }
        .oa-res-lb { font-size: 14.5px; font-weight: 600; color: #166534; }
        .oa-res-v { font-size: 36px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.15; color: #15803D; margin: 2px 0 4px; }
        .oa-res-sub { font-size: 13.5px; line-height: 1.45; color: #166534; }
        .oa-res.neg { background: #FEF2F2; border-color: #FCA5A5; } .oa-res.neg .oa-res-lb, .oa-res.neg .oa-res-sub { color: #991B1B; } .oa-res.neg .oa-res-v { color: #B91C1C; }
        .oa-li { display: grid; grid-template-columns: 44px 1fr auto; gap: 12px; align-items: center; padding: 10px 0; }
        .oa-li + .oa-li { border-top: 1px solid var(--border); }
        .oa-li time { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 44px; border-radius: 11px; background: var(--surface-3); font-size: 11px; color: var(--text-dim); line-height: 1.1; }
        .oa-li time b { font-size: 16px; color: var(--text); }
        .oa-li-n { min-width: 0; } .oa-li-n b { display: block; font-size: 14.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .oa-li-n small { display: block; font-size: 12.5px; color: var(--text-dim); margin-top: 1px; } .oa-li-n small.late { color: #B91C1C; font-weight: 600; }
        .oa-li-r { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; } .oa-li-r b { font-size: 14.5px; font-weight: 700; white-space: nowrap; }
        .oa-li-r button { font: inherit; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; }
        .oa-vazio { font-size: 14px; color: var(--text-dim); padding: 8px 0 4px; }
        .oa-mais, .oa-ir { display: block; width: 100%; font: inherit; font-size: 13.5px; font-weight: 600; background: none; border: none; cursor: pointer; padding: 10px 0 2px; text-align: left; }
        .oa-mais { color: var(--text-dim); } .oa-ir { color: #15803D; border-top: 1px solid var(--border); margin-top: 6px; padding-top: 12px; }
        :root[data-theme="dark"] .oa .in, :root[data-theme="dark"] .oa-ir { color: #4ADE80; } :root[data-theme="dark"] .oa .out, :root[data-theme="dark"] .oa-li-n small.late { color: #F87171; } :root[data-theme="dark"] .oa .inv { color: #93C5FD; }
        :root[data-theme="dark"] .oa-bar i.in2 { background: rgba(74,222,128,.35); } :root[data-theme="dark"] .oa-bar i.out2 { background: rgba(248,113,113,.35); }
        :root[data-theme="dark"] .oa-res { background: rgba(34,197,94,.12); border-color: rgba(74,222,128,.45); } :root[data-theme="dark"] .oa-res-lb, :root[data-theme="dark"] .oa-res-sub { color: #86EFAC; } :root[data-theme="dark"] .oa-res-v { color: #4ADE80; }
        :root[data-theme="dark"] .oa-res.neg { background: rgba(239,68,68,.12); border-color: rgba(248,113,113,.45); } :root[data-theme="dark"] .oa-res.neg .oa-res-lb, :root[data-theme="dark"] .oa-res.neg .oa-res-sub { color: #FCA5A5; } :root[data-theme="dark"] .oa-res.neg .oa-res-v { color: #F87171; }

        /* ================= v29: configurações em menu ================= */
        .cfg { max-width: 640px; }
        .cfg-head { text-align: center; padding: 8px 0 20px; }
        .cfg-av { width: 64px; height: 64px; border-radius: 50%; background: var(--teal); color: #fff; display: grid; place-items: center; font-size: 26px; font-weight: 700; margin: 0 auto 10px; }
        .cfg-head h2 { margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -0.01em; overflow-wrap: anywhere; }
        .cfg-chip { display: inline-block; margin-top: 8px; font-size: 12.5px; font-weight: 600; padding: 5px 12px; border-radius: 999px; background: var(--surface-3); color: var(--text-dim); }
        .cfg-group { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; margin-bottom: 14px; overflow: hidden; }
        .cfg-row { display: grid; grid-template-columns: 38px 1fr 18px; gap: 14px; align-items: center; width: 100%; padding: 13px 16px; border: none; background: none; text-align: left; font-family: inherit; color: var(--text); cursor: pointer; position: relative; }
        .cfg-row + .cfg-row::before { content: ""; position: absolute; top: 0; left: 68px; right: 0; height: 1px; background: var(--border); }
        .cfg-row:hover, .cfg-row:focus-visible { background: var(--surface-2); outline: none; }
        .cfg-row > i { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; color: #fff; }
        .cfg-txt { min-width: 0; } .cfg-txt b { display: block; font-size: 15px; font-weight: 600; } .cfg-txt small { display: block; font-size: 12.5px; color: var(--text-dim); margin-top: 1px; }
        .cfg-chev { color: var(--text-dim); opacity: .7; }
        .cfg-sub { max-width: 640px; } .cfg-sub > .day-panel:first-of-type { margin-top: 0; }
        .cfg-back { display: inline-flex; align-items: center; gap: 4px; border: none; background: none; padding: 4px 8px 4px 0; margin: 0 0 12px -4px; font: inherit; font-weight: 600; font-size: 14px; color: var(--teal); cursor: pointer; }

        /* ================= v27: tema escuro ================= */
        :root[data-theme="dark"] { --bg: #0B1220; --surface: #141D2F; --surface-2: #1A2539; --surface-3: #223049; --text: #E6EDF7; --text-dim: #94A3B8; --border: #2A3950; }
        :root[data-theme="dark"] body { background: #0B1220; color: #E6EDF7; }
        :root[data-theme="dark"] input, :root[data-theme="dark"] select, :root[data-theme="dark"] textarea { background: var(--surface-2); color: var(--text); border-color: var(--border); }
        :root[data-theme="dark"] input::placeholder { color: #64748B; }
        :root[data-theme="dark"] .stub-tear { border-top:2px dashed var(--border) }
        :root[data-theme="dark"] .btn-ghost:hover { background:var(--surface-3) }
        :root[data-theme="dark"] .topbar { background:rgba(11,18,32,.92) }
        :root[data-theme="dark"] .exp-bar > div { background:var(--surface) }
        :root[data-theme="dark"] .inv-cat-btn.active { background:var(--surface) }
        @media (max-width: 720px) { :root[data-theme="dark"] .bottom-nav { background:rgba(20,29,47,.97) } }
        :root[data-theme="dark"] .topbar { background:rgba(11,18,32,.94) }
        :root[data-theme="dark"] .cal-cell.selected { background:var(--surface) }
        :root[data-theme="dark"] .tbl tbody tr:hover td { background:var(--surface-2) }
        :root[data-theme="dark"] .cell-input { background:var(--surface) }
        :root[data-theme="dark"] .field input, :root[data-theme="dark"] .field select { background:var(--surface) }
        :root[data-theme="dark"] .chip { background:var(--surface) }
        :root[data-theme="dark"] .bottom-nav { background:var(--surface) }
        :root[data-theme="dark"] .note-info { color:#93C5FD }
        :root[data-theme="dark"] .imp-ctrl select { background:var(--surface) }
        :root[data-theme="dark"] .imp-actions { background:var(--surface) }
        :root[data-theme="dark"] .sidebar { background:var(--surface) }
        :root[data-theme="dark"] .sb-item { color:#CBD5E1 }
        :root[data-theme="dark"] .sb-item.active { background:rgba(34,197,94,.12); color:#4ADE80 }
        :root[data-theme="dark"] .sb-item.active svg { color:#4ADE80 }
        :root[data-theme="dark"] .topbar2 { background:rgba(11,18,32,.92) }
        :root[data-theme="dark"] .month-pill { background:var(--surface) }
        :root[data-theme="dark"] .link-btn { color:#4ADE80 }
        :root[data-theme="dark"] .alert-danger { background:rgba(239,68,68,.13); color:#FCA5A5 }
        :root[data-theme="dark"] .alert-warning { background:rgba(245,158,11,.12); color:#FBBF24 }
        :root[data-theme="dark"] .alert-info { background:rgba(34,197,94,.12); color:#4ADE80 }
        :root[data-theme="dark"] .balance-card { background:var(--surface) }
        :root[data-theme="dark"] .flow-ico.in { background:rgba(34,197,94,.20); color:#4ADE80 }
        :root[data-theme="dark"] .flow-ico.out { background:rgba(239,68,68,.22); color:#F87171 }
        :root[data-theme="dark"] .flow-ico.inv { background:rgba(59,130,246,.24); color:#93C5FD }
        :root[data-theme="dark"] .lim-chip.ok { background:rgba(34,197,94,.20); color:#4ADE80 }
        :root[data-theme="dark"] .lim-chip.warn { background:rgba(245,158,11,.22); color:#FBBF24 }
        :root[data-theme="dark"] .lim-chip.over { background:rgba(239,68,68,.22); color:#FCA5A5 }
        :root[data-theme="dark"] .lim-add select { background:var(--surface) }
        :root[data-theme="dark"] .tx-status.paid { background:rgba(34,197,94,.20); color:#4ADE80 }
        :root[data-theme="dark"] .tx-status.open { color:#CBD5E1 }
        :root[data-theme="dark"] .tx-status.open:hover { background:rgba(34,197,94,.20); color:#4ADE80 }
        :root[data-theme="dark"] .due.late { background:rgba(239,68,68,.22); color:#FCA5A5 }
        :root[data-theme="dark"] .due.warn { background:rgba(245,158,11,.22); color:#FBBF24 }
        :root[data-theme="dark"] .due.paid { background:rgba(34,197,94,.20); color:#4ADE80 }
        :root[data-theme="dark"] .badge-paid { background:rgba(34,197,94,.20); color:#4ADE80 }
        :root[data-theme="dark"] .badge-pending { background:rgba(245,158,11,.22); color:#FBBF24 }
        :root[data-theme="dark"] .btn-ghost { background:var(--surface) }
        :root[data-theme="dark"] .chip { color:#CBD5E1 }
        :root[data-theme="dark"] .chip.active, :root[data-theme="dark"] .seg-btn.active, :root[data-theme="dark"] .scope-btn.active { background:#334155; border-color:#475569 }
        :root[data-theme="dark"] .seg-btn { color:#CBD5E1 }
        :root[data-theme="dark"] .segmented .seg-btn.active { background:var(--surface) }
        :root[data-theme="dark"] .field label { color:#CBD5E1 }
        :root[data-theme="dark"] .cat-btn { background:var(--surface); color:#CBD5E1 }
        :root[data-theme="dark"] .cat-btn.active { background:rgba(34,197,94,.12) }
        :root[data-theme="dark"] .chart-tip { background:#334155 }
        :root[data-theme="dark"] .note-info { background:rgba(34,197,94,.12); border-color:rgba(34,197,94,.35); color:#86EFAC }
        @media (max-width: 720px) { :root[data-theme="dark"] .topbar2 { background:var(--surface) } :root[data-theme="dark"] .bottom-nav { background:var(--surface) } :root[data-theme="dark"] .bn-center { border:4px solid var(--surface) } }
        :root[data-theme="dark"] .ins-good .ins-ico { background:rgba(34,197,94,.20); color:#4ADE80 }
        :root[data-theme="dark"] .ins-bad .ins-ico { background:rgba(239,68,68,.22); color:#F87171 }
        :root[data-theme="dark"] .ins-warn .ins-ico { background:rgba(245,158,11,.22); color:#FBBF24 }
        :root[data-theme="dark"] .ins-info .ins-ico { background:rgba(59,130,246,.24); color:#93C5FD }
        :root[data-theme="dark"] .cloud-dot { background:#475569 }
        :root[data-theme="dark"] .cloud-foot i, :root[data-theme="dark"] .cloud-pill i { background:#475569 }
        :root[data-theme="dark"] .cloud-pill { color:#CBD5E1 }
        :root[data-theme="dark"] .mp-arrow { background:var(--surface) }
        :root[data-theme="dark"] .mp-cell { background:var(--surface) }
        :root[data-theme="dark"] .mp-cell.sel { background:rgba(34,197,94,.12) }
        :root[data-theme="dark"] .mp-now { color:#4ADE80; background:rgba(34,197,94,.20) }
        :root[data-theme="dark"] .mp-now.fut { color:#94A3B8 }
        :root[data-theme="dark"] .topwrap { background:rgba(20,29,47,.96) }
        :root[data-theme="dark"] .ns-ind { background:#334155 }
        :root[data-theme="dark"] .quote-msg { color:#CBD5E1 }
        :root[data-theme="dark"] .quote-msg.ok { background:rgba(34,197,94,.12); color:#86EFAC }
        :root[data-theme="dark"] .quote-msg.warn { background:rgba(245,158,11,.12); color:#FCD34D }
        :root[data-theme="dark"] .quote-msg.bad { background:rgba(239,68,68,.13); color:#FCA5A5 }
        :root[data-theme="dark"] .token-box { border:1px solid rgba(245,158,11,.4); background:rgba(245,158,11,.12); color:#FCD34D }
        :root[data-theme="dark"] .token-box a { color:#FCD34D }
        :root[data-theme="dark"] .token-box label { color:#FCD34D }
        :root[data-theme="dark"] .token-box input { background:var(--surface) }
        :root[data-theme="dark"] .sort-pick select { background:var(--surface) }
        :root[data-theme="dark"] .asset-card { background:var(--surface) }
        :root[data-theme="dark"] .asset-card.open { border-color:#475569 }
        :root[data-theme="dark"] .qmark.ok { color:#4ADE80 }
        :root[data-theme="dark"] .qmark.token { color:#FBBF24 }
        :root[data-theme="dark"] .qmark.fail { color:#FCA5A5 }
        :root[data-theme="dark"] .wr-main { background:rgba(34,197,94,.12) }
        :root[data-theme="dark"] .wr-main > span { color:#86EFAC }
        :root[data-theme="dark"] .wr-main > b { color:#86EFAC }
        :root[data-theme="dark"] .wr-cmp small, :root[data-theme="dark"] .wr-none { color:#86EFAC }
        :root[data-theme="dark"] .wr-note, :root[data-theme="dark"] .note-warn { background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.4); color:#FCD34D }
        :root[data-theme="dark"] .regime-desc { color:#CBD5E1 }
        :root[data-theme="dark"] .ct-steps li::before { color:#CBD5E1 }
        :root[data-theme="dark"] .fr-track em { background:#334155; color:var(--text) }
        :root[data-theme="dark"] .tax-l .tax-pay { color:#CBD5E1 }
        :root[data-theme="dark"] .cmp-col.best { background:rgba(34,197,94,.12); border-color:rgba(34,197,94,.35) }
        :root[data-theme="dark"] .notes { color:#CBD5E1 }
        :root[data-theme="dark"] .escala-slot { background:var(--surface) }
        :root[data-theme="dark"] .escala-row select, :root[data-theme="dark"] .escala-row input { background:var(--surface) }
        :root[data-theme="dark"] .ct-mais summary { color:#CBD5E1 }
        :root[data-theme="dark"] .ct-details > summary { color:#CBD5E1 }
        :root[data-theme="dark"] .add-tip { background:var(--surface) }
        :root[data-theme="dark"] .add-box select, :root[data-theme="dark"] .add-box input[type=number] { background:var(--surface) }
        :root[data-theme="dark"] .lb-on { color:#86EFAC; background:rgba(34,197,94,.20) }
        :root[data-theme="dark"] .imp-ctrl .tk-in { background:var(--surface) }
        :root[data-theme="dark"] .xl { background:var(--surface) }
        :root[data-theme="dark"] .xl-sec.pagas b { color:#4ADE80 }
        :root[data-theme="dark"] .xl-check { border:2px solid #475569; background:var(--surface) }
        :root[data-theme="dark"] .pm-edit input { background:var(--surface) }
        :root[data-theme="dark"] .xl-grp { background:var(--surface) }
        :root[data-theme="dark"] .fat-box { background:rgba(34,197,94,.12); border:1px solid rgba(34,197,94,.35) }
        :root[data-theme="dark"] .fat-box input:not([type=checkbox]) { background:var(--surface) }
        :root[data-theme="dark"] .choice em { color:#86EFAC; background:rgba(34,197,94,.20) }
        :root[data-theme="dark"] .add-box input[type=text], :root[data-theme="dark"] .add-box input:not([type]) { background:var(--surface) }
        :root[data-theme="dark"] .serie-tag { color:#93C5FD; background:rgba(59,130,246,.24) }
        :root[data-theme="dark"] .segmented .seg-btn.active { background: #334155; color: #fff; }
        :root[data-theme="dark"] .cfg-back { color: #4ADE80; }
        :root[data-theme="dark"] .fx-net.in, :root[data-theme="dark"] .fx-line b.in { color: #4ADE80; } :root[data-theme="dark"] .fx-net.out { color: #FCA5A5; }
        :root[data-theme="dark"] .cal-cell.fx-in1 { background-color: rgba(34,197,94,.16); } :root[data-theme="dark"] .cal-cell.fx-in2 { background-color: rgba(34,197,94,.32); } :root[data-theme="dark"] .cal-cell.fx-in3 { background-color: rgba(34,197,94,.52); }
        :root[data-theme="dark"] .cal-cell.fx-out1 { background-color: rgba(239,68,68,.16); } :root[data-theme="dark"] .cal-cell.fx-out2 { background-color: rgba(239,68,68,.30); } :root[data-theme="dark"] .cal-cell.fx-out3 { background-color: rgba(239,68,68,.48); }
`}</style>

      <div className="main">
      <div className="topwrap">
        <header className="topbar2">
          <div className="tb-left">
            <div className="tb-logo"><IconLogo size={22} /></div>
            <div>
              <h1 className="tb-title">{(PAGE_TITLES[activeTab] || [""])[0]}<button className={`cloud-dot ${cloud.status}`} title={cloudLabel} aria-label={cloudLabel} onClick={() => goTab("backup")} /></h1>
              <p className="tb-sub">{(PAGE_TITLES[activeTab] || ["", ""])[1]}</p>
            </div>
          </div>
          <div className="tb-right">
            <div className="month-pill">
              <button onClick={() => changeMonth(-1)} aria-label="Mês anterior"><IconChevronLeft size={17} /></button>
              <button className="mp-open" onClick={() => setPickerYear(viewYear)} aria-label="Ver todos os meses">{MONTHS_PT[viewMonth]} {viewYear}</button>
              <button onClick={() => changeMonth(1)} aria-label="Próximo mês"><IconChevronRight size={17} /></button>
            </div>
            <button type="button" className={`tb-gear ${activeTab === "backup" ? "on" : ""}`} aria-label="Configurações" title="Configurações" aria-current={activeTab === "backup" ? "page" : undefined} onClick={() => goTab("backup")}><IconGear size={19} /></button>
            <button className="btn btn-primary tb-new" onClick={() => setQuickOpen(true)}><IconPlus size={16} color="#fff" /> Novo</button>
          </div>
        </header>
        <NavStrip items={NAV_ALL.filter((t) => t.id !== "backup" && (contabAba || t.id !== "contabilidade"))} active={activeTab} onPick={goTab} />
      </div>
      <Dock active={activeTab} onPick={goTab} ocultar={contabAba ? [] : ["contabilidade"]} />
      <DSide active={activeTab} onPick={goTab} onNovo={() => setQuickOpen(true)} ocultar={contabAba ? [] : ["contabilidade"]} />

      <div className="page">
      <div key={activeTab} className={`panel pg pg-${navDir}`}>
        {activeTab === "organizacao" && (
          <OrganizacaoTab viewYear={viewYear} viewMonth={viewMonth} incomeItems={monthIncomeItems} expenseItems={monthExpenseItems} invItems={monthInvestments.filter((i) => i.tipo !== "ajuste")} goTab={goTab} />
        )}
        {activeTab === "inicio" && (
          <DashboardTab
            viewMonth={viewMonth} viewYear={viewYear}
            patrimonioTotal={patrimonioTotal} saldoRealizado={saldoRealizado} totalInvestedAllTime={totalInvestedAllTime}
            totalNet={totalNet} totalPendingExpenses={totalPendingExpenses} alerts={alerts}
            history12={history12} goals={goals} generateMonthlyReport={generateMonthlyReport}
            setActiveTab={goTab} curStats={curStats} prevStats={prevStats} portfolio={portfolio}
            chartMonths={chartMonths} setChartMonths={setChartMonths} goMonth={goMonth} quickGo={quickGo}
            setup={{ vinculos: vinculos.length, shifts: shifts.length, expenses: expenses.length + recurringExpenses.length, investments: investments.length }}
            monthExpenseItems={monthExpenseItems} limits={limits} monthShiftsCount={monthShifts.length} insights={insights}
            desk={desk} fluxoDia={fluxoDia} monthIncomeItems={monthIncomeItems} vincData={netByVinculo} history12={history12}
            workCard={<WorkRateCard compact cur={workCur} prev={workPrev} history={workHistory} monthName={MONTHS_PT[viewMonth]} prevName={prevMonthName} onCalendar={() => goTab("calendario")} onDetails={() => goTab("faturamento")} goMonth={goMonth} />} workCur={workCur}
          />
        )}
        {activeTab === "faturamento" && (
          <FaturamentoTab onAdd={() => setQuickOpen(true)} taxaPadrao={contabCarga !== null ? contabCarga : Number(taxRateGeral) || 0}
            expanded={expanded} toggleSection={toggleSection} viewMonth={viewMonth} monthKey={monthKey}
            monthIncomeItems={monthIncomeItems}
            totalGross={totalGross} totalNet={totalNet}
            vinculos={vinculos} addVinculo={addVinculo} removeVinculo={removeVinculo} updateVinculoTax={updateVinculoTax} updateVinculoPrazo={updateVinculoPrazo} updateVinculoEscala={updateVinculoEscala}
            extraRecurringIncomes={extraRecurringIncomes} addExtraRecurringIncome={addExtraRecurringIncome} removeExtraRecurringIncome={removeExtraRecurringIncome} updateExtraPrazo={updateExtraPrazo}
            shifts={shifts} oneOffIncomes={oneOffIncomes} updateVinculo={updateVinculo} updateExtra={updateExtra} updateShift={updateShift} updateOneOff={updateOneOff} addOneOff={addOneOff}
            netByVinculo={netByVinculo} gainScope={gainScope} setGainScope={setGainScope} history12={history12}
            chartMonths={chartMonths} setChartMonths={setChartMonths} goMonth={goMonth}
            workCard={<WorkRateCard cur={workCur} prev={workPrev} history={workHistory} monthName={MONTHS_PT[viewMonth]} prevName={prevMonthName} onCalendar={() => goTab("calendario")} goMonth={goMonth} />}
            discreto={discreto} setDiscreto={setDiscreto} desk={desk}
          />
        )}
        {activeTab === "calendario" && (
          <CalendarTab
            cells={cells} entriesByDay={entriesByDay} selectedDay={selectedDay} setSelectedDay={setSelectedDay}
            viewYear={viewYear} viewMonth={viewMonth} vinculos={vinculos} addVinculo={addVinculo}
            addShift={addShift} addPlantao={addPlantao} removeShiftSerie={removeShiftSerie} shifts={shifts} removeShift={removeShift} toggleShiftReceived={toggleShiftReceived} updateShiftPrazo={updateShiftPrazo}
            addPresenca={addPresenca} removePresenca={removePresenca} toggleEscalaOff={toggleEscalaOff}
            vinculoMap={vinculoMap} netOf={netOf} setActiveTab={goTab} fluxoDia={fluxoDia} desk={desk}
          />
        )}
        {activeTab === "despesas" && (
          <ExpensesTab
            monthExpenseItems={monthExpenseItems} addExpense={addExpense} addRecurringExpense={addRecurringExpense}
            viewYear={viewYear} viewMonth={viewMonth} totalPending={totalPendingExpenses} openSignal={signals.despesas} limits={limits} setLimit={setLimit} updateExpense={updateExpense} updateRecurringExpense={updateRecurringExpense}
            desk={desk} history12={history12} chartMonths={chartMonths} setChartMonths={setChartMonths} goMonth={goMonth} goTab={goTab}
          />
        )}
        {activeTab === "investimentos" && (
          <InvestmentsTab investments={investments} portfolio={portfolio} cotacoes={cotacoes}
            addInvestment={addInvestment} removeInvestment={removeInvestment} adjustAvg={adjustAvg}
            setCotacao={setCotacao} brapiToken={brapiToken} setBrapiToken={setBrapiToken} refreshQuotes={refreshQuotes} quoteStatus={quoteStatus} quoteRun={quoteRun}
            viewYear={viewYear} viewMonth={viewMonth} investmentsHistory12={investmentsHistory12} chartMonths={chartMonths} setChartMonths={setChartMonths} openSignal={signals.investimentos} discreto={discreto} setDiscreto={setDiscreto} desk={desk} />
        )}
        {activeTab === "metas" && (
          <GoalsTab goals={goals} addGoal={addGoal} removeGoal={removeGoal} contributeGoal={contributeGoal} valorDaMeta={valorDaMeta} setGoalFonte={setGoalFonte} setGoalPatch={setGoalPatch} aporteMedio={aporteMedio} monthExpenseItems={monthExpenseItems} limits={limits} setLimit={setLimit} viewYear={viewYear} viewMonth={viewMonth} />
        )}
        {activeTab === "visao" && (
          <OverviewTab chartScope={chartScope} setChartScope={setChartScope} expensesByDesc={expensesByDesc} investByCategory={investByCategory}
            hourlyRate={hourlyRate} leftover={leftover} scopedHours={scopedHours} history12={history12} insights={insights} />
        )}
        {activeTab === "contabilidade" && contabAba && (
          <ContabTab contab={contab} setContab={setContab} app={contabApp} taxRateGeral={taxRateGeral} setTaxRateGeral={setTaxRateGeral}
            desk={desk} viewYear={viewYear} viewMonth={viewMonth} monthIncomeItems={monthIncomeItems}
            prevIncomeItems={buildIncomeItems(...(viewMonth === 0 ? [viewYear - 1, 11] : [viewYear, viewMonth - 1]))}
            yearIncomeItems={Array.from({ length: 12 }, (_, m) => buildIncomeItems(viewYear, m)).flat()}
            yearExpenseItems={Array.from({ length: 12 }, (_, m) => buildExpenseItems(viewYear, m)).flat()}
            pagarGuia={pagarGuia} desfazerGuia={desfazerGuia} />
        )}
        {activeTab === "importar" && (
          <ImportTab buildExpenseItems={buildExpenseItems} buildIncomeItems={buildIncomeItems} importedKeys={importedKeys}
            commitImport={commitImport} importLog={importLog} undoImport={undoImport} goTab={goTab}
            commitB3={commitB3} portfolio={portfolio} investments={investments} commitPrint={commitPrint} fonteInicial={importSrc} limparFonte={() => setImportSrc(null)} />
        )}
        {activeTab === "backup" && (
          <BackupTab contabAba={contabAba} setContabAba={(v) => setContab((p) => ({ ...p, aba: v }))} taxRateGeral={taxRateGeral} setTaxRateGeral={setTaxRateGeral} contabAuto={contab.modo === "contab"} downloadBackup={downloadBackup} fileInputRef={fileInputRef} handleImportFile={handleImportFile} saveError={saveError}
            notifCard={<LembretesCard on={notifOn} setOn={setNotifOn} itens={lembretes} />}
            themeCard={<ThemeCard tema={tema} setTema={setTema} />} goTab={goTab} conta={session && session.user ? session.user.email : ""} cloudLabel={cloudLabel} resumo={{ tema, discreto, pinOn: !!pinHash, notifOn }}
            privacyCard={<PrivacyCard discreto={discreto} setDiscreto={setDiscreto} pinOn={!!pinHash} onSetPin={setPinHash} bioId={bioId} onSetBio={setBioId} onRemovePin={() => { if (window.confirm("Remover a trava deste aparelho?")) setPinHash(""); }} />}
            posicaoCard={<PosicaoInicialCard investments={investments} onToggle={setPosicaoInicial} />}
            wipeCard={<WipeDataCard data={latestRef.current} onWipe={wipeData} undo={wipeUndo} onUndo={undoWipe} onDismissUndo={() => setWipeUndo(null)} downloadBackup={downloadBackup} />}
            cloudCard={<CloudCard cfg={cloudCfg} session={session} cloud={cloud} onConnect={cloudActions.connect} onDisconnect={cloudActions.disconnect} onSyncNow={cloudActions.syncNow} onLogout={cloudActions.logout} onLogin={cloudActions.login} />} />
        )}
      </div>
      </div>

      {pickerYear !== null && (
        <MonthPicker year={pickerYear} setYear={setPickerYear} viewYear={viewYear} viewMonth={viewMonth} statsOf={monthStats}
          onPick={(y, m) => { setPickerYear(null); goMonth(y, m); }} onClose={() => setPickerYear(null)} />
      )}
      {quickOpen && (
        <AddSheet inicial={typeof quickOpen === "string" ? quickOpen : null} onClose={() => setQuickOpen(false)} onDespesa={() => quickGo("despesa")} onOutro={(k) => quickGo(k)}
          vinculos={vinculos} taxaPadrao={contabCarga !== null ? contabCarga : Number(taxRateGeral) || 0} monthKey={monthKey}
          addPlantao={addPlantao} addVinculo={addVinculo} addExtra={addExtraRecurringIncome} addOneOff={addOneOff} />
      )}

      {cargoOpen && (
        <QuickCargoFixo onClose={() => setCargoOpen(false)} monthKey={monthKey} onSave={(d) => addVinculo(d)} />
      )}

      <button className="fab2" aria-label="Novo lançamento" onClick={() => setQuickOpen(true)}><IconPlus size={26} color="#fff" /></button>

      <div className="footnote">
        {session ? `Conectado como ${session.user.email}. Seus dados ficam salvos na nuvem e neste aparelho.` : "Os dados ficam salvos neste aparelho. Para usar em mais de um aparelho, conecte a nuvem em Configurações."}
      </div>
      </div>
    </div>
  );
}

// ================= adicionar: uma só porta de entrada (plantão, cargo, receitas, despesa) =================
const isoDe = (d) => dateStr(d.getFullYear(), d.getMonth(), d.getDate());
const segundaDe = (iso) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
// datas de um plantão fixo entre "desde" e "ate"
function fixoDatas(f, desde, ate) {
  const out = []; if (!f || !(f.dias || []).length) return out;
  const d = new Date((desde > f.inicio ? desde : f.inicio) + "T12:00:00"), fim = new Date(ate + "T12:00:00"), m0 = segundaDe(f.inicio);
  for (let n = 0; d <= fim && n < 800; n++, d.setDate(d.getDate() + 1)) {
    if (!f.dias.includes(d.getDay())) continue;
    const iso = isoDe(d);
    if (f.fim && iso >= f.fim) break;
    if (f.cada === "mes") {
      const ult = d.getDate() + 7 > new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const occ = Math.floor((d.getDate() - 1) / 7) + 1;
      if (!(Number(f.ordem) === 5 ? ult : occ === (Number(f.ordem) || 1))) continue;
    } else if (Number(f.cada) > 1) {
      const w = Math.round((segundaDe(iso) - m0) / (7 * 864e5));
      if (w < 0 || w % Number(f.cada) !== 0) continue;
    }
    out.push(iso);
  }
  return out;
}
const ADD_OPCOES = [
  ["plantao", "Plantão", "12 ou 24 horas. Um dia só ou fixo, repetindo toda semana.", "🩺", "#FEF3C7"],
  ["cargo", "Cargo fixo", "Diarismo, coordenação, supervisão, preceptoria. Recebe todo mês.", "🏥", "#DBEAFE"],
  ["recorrente", "Receita que se repete", "Aluguel, dividendos, pró-labore. Entra todo mês.", "🔁", "#EDE9FE"],
  ["unica", "Receita única", "Processo, 13º, um Pix de quem te devia, restituição.", "💰", "#DCFCE7"],
  ["despesa", "Despesa", "Conta fixa ou gasto do mês.", "💳", "#FEE2E2"],
];
function AddSheet({ inicial, onClose, onDespesa, onOutro, vinculos, taxaPadrao, monthKey, addPlantao, addVinculo, addExtra, addOneOff }) {
  const [kind, setKind] = useState(inicial || null);
  const [funcao, setFuncao] = useState("Diarismo");
  const titulo = kind ? (ADD_OPCOES.find((o) => o[0] === kind) || [])[1] : "O que você quer adicionar?";
  useEffect(() => { const k = (e) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet add-sheet" role="dialog" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="add-top">{kind && !inicial && <button type="button" className="link-btn" onClick={() => setKind(null)}>‹ Voltar</button>}<div className="sheet-title" style={{ margin: 0 }}>{titulo}</div></div>
        {!kind && (
          <>
            {ADD_OPCOES.map(([k, l, d, ic, bg]) => (
              <button key={k} type="button" className="add-op" data-add={k} onClick={() => (k === "despesa" ? onDespesa() : setKind(k))}>
                <i style={{ background: bg }} aria-hidden="true">{ic}</i><span><b>{l}</b><small>{d}</small></span><IconChevronRight size={18} />
              </button>
            ))}
            <div className="add-mais">
              <button type="button" className="link-btn" onClick={() => onOutro("aporte")}>Investimento</button>
              <button type="button" className="link-btn" onClick={() => onOutro("importar")}>Importar extrato</button>
            </div>
          </>
        )}
        {kind === "plantao" && <PlantaoAddForm vinculos={vinculos} taxaPadrao={taxaPadrao} onSave={(d) => { addPlantao(d); onClose(); }} />}
        {kind === "cargo" && (
          <>
            <div className="field"><label>Função</label>
              <div className="chip-row">{["Diarismo", "Coordenação", "Supervisão", "Preceptoria", "Outra"].map((p) => <button key={p} type="button" className={`chip sm ${funcao === p ? "active" : ""}`} aria-pressed={funcao === p} onClick={() => setFuncao(p)}>{p}</button>)}</div>
            </div>
            <VinculoForm key={funcao} fixo taxaPadrao={taxaPadrao} defaultNome={funcao === "Outra" ? "" : funcao} defaultStartMonth={monthKey} onSubmit={(d) => { addVinculo(d); onClose(); }} />
          </>
        )}
        {kind === "recorrente" && <ExtraIncomeForm onSubmit={(d) => { addExtra({ ...d, startMonth: monthKey }); onClose(); }} onCancel={onClose} />}
        {kind === "unica" && <OneOffEditForm novo defaultDate={todayStr()} onSubmit={(d) => { addOneOff(d); onClose(); }} onCancel={onClose} />}
      </div>
    </div>
  );
}
function PlantaoAddForm({ vinculos = [], taxaPadrao, onSave }) {
  const locais = vinculos.filter((v) => v.tipo === "plantao");
  const [local, setLocal] = useState("");
  const [modo, setModo] = useState("um");
  const [data, setData] = useState(todayStr());
  const [dias, setDias] = useState([new Date().getDay()]);
  const [cada, setCada] = useState("1");
  const [ordem, setOrdem] = useState(1);
  const [inicio, setInicio] = useState(todayStr());
  const [dur, setDur] = useState(12);
  const [durOutra, setDurOutra] = useState("");
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState("pj");
  const [taxa, setTaxa] = useState(taxaPadrao ? String(taxaPadrao).replace(".", ",") : "");
  const [prazo, setPrazo] = useState(0);
  const [erro, setErro] = useState("");
  const escolherLocal = (v) => { setLocal(v.nome); setForma(formaDe(v)); if (v.taxOverride !== null && v.taxOverride !== undefined && formaDe(v) === "pj") setTaxa(String(v.taxOverride).replace(".", ",")); setPrazo(Number(v.prazoPadrao) || 0); setErro(""); };
  const horas = dur === "outra" ? Number(String(durOutra).replace(",", ".")) || 0 : dur;
  const tx = forma === "pj" ? Number(String(taxa).replace(",", ".")) || 0 : 0;
  const liq = (Number(valor) || 0) * (1 - tx / 100);
  const cfg = { dias, cada: cada === "mes" ? "mes" : Number(cada), ordem, inicio };
  const datas = modo === "um" ? [data] : fixoDatas(cfg, inicio, isoDe(new Date(new Date(inicio + "T12:00:00").getTime() + 180 * 864e5)));
  const porMes = modo === "fixo" ? (cada === "mes" ? 1 : (dias.length * 4.33) / (Number(cada) || 1)) : 0;
  const prox = modo === "fixo" ? datas.slice(0, 3).map((d) => fmtDatePt(d).slice(0, 5)) : [];
  const salvar = () => {
    if (!local.trim()) { setErro("Diga onde é o plantão."); return; }
    if (!(Number(valor) > 0)) { setErro("Informe o valor do plantão."); return; }
    if (!(horas > 0)) { setErro("Informe a duração do plantão."); return; }
    if (forma === "pj" && String(taxa).trim() === "") { setErro("Informe o imposto da sua empresa."); return; }
    if (!datas.length) { setErro(modo === "um" ? "Escolha a data." : "Escolha os dias da semana."); return; }
    onSave({ local, gross: Number(valor), hours: horas, prazoDias: prazo, datas, taxa: tx, forma, fixo: modo === "fixo" ? { ...cfg, id: uid(), gross: Number(valor), hours: horas, prazo, ate: datas[datas.length - 1] } : null });
  };
  return (
    <div className="mini-form pl-add">
      <div className="field"><label htmlFor="pa-local">Onde</label><input id="pa-local" value={local} onChange={(e) => { setLocal(e.target.value); setErro(""); }} placeholder="Ex.: Hospital São Lucas" />
        {locais.length > 0 && <div className="chip-row" style={{ marginTop: 6 }}>{locais.slice(0, 6).map((v) => <button key={v.id} type="button" className={`chip sm ${local === v.nome ? "active" : ""}`} onClick={() => escolherLocal(v)}>{v.nome}</button>)}</div>}</div>
      <div className="field"><label>Esse plantão é</label>
        <div className="seg2" role="group"><button type="button" className={modo === "um" ? "on" : ""} aria-pressed={modo === "um"} onClick={() => setModo("um")}>Só um dia</button><button type="button" className={modo === "fixo" ? "on" : ""} aria-pressed={modo === "fixo"} onClick={() => setModo("fixo")}>Fixo, se repete</button></div></div>
      {modo === "um" ? (
        <div className="field"><label htmlFor="pa-data">Data</label><input id="pa-data" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
      ) : (
        <>
          <div className="field"><label>Dias</label>
            <div className="esc-dias" role="group" aria-label="Dias da semana">{ORDEM_SEM.map((d) => { const on = dias.includes(d); return <button key={d} type="button" className={`esc-dia ${on ? "on" : ""}`} aria-pressed={on} onClick={() => setDias(on ? dias.filter((x) => x !== d) : [...dias, d])}>{DIAS_SEM[d].slice(0, 1)}<span>{DIAS_SEM[d]}</span></button>; })}</div></div>
          <div className="esc-grid">
            <label><span className="esc-l">Frequência</span><select value={cada} onChange={(e) => setCada(e.target.value)}><option value="1">Semanal</option><option value="2">Quinzenal</option><option value="3">A cada 3 semanas</option><option value="mes">Mensal</option></select></label>
            <label><span className="esc-l">A partir de</span><input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
            {cada === "mes" && <label><span className="esc-l">Semana do mês</span><select value={ordem} onChange={(e) => setOrdem(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((o) => <option key={o} value={o}>{o === 5 ? "Última" : o + "ª"} semana</option>)}</select></label>}
          </div>
        </>
      )}
      <div className="esc-grid" style={{ marginTop: 10 }}>
        <div><span className="esc-l">Duração</span><div className="seg2">{[12, 24, "outra"].map((d) => <button key={d} type="button" className={dur === d ? "on" : ""} aria-pressed={dur === d} onClick={() => setDur(d)}>{d === "outra" ? "Outra" : d + "h"}</button>)}</div>
          {dur === "outra" && <input style={{ marginTop: 6 }} type="text" inputMode="decimal" placeholder="Horas, ex.: 6" value={durOutra} onChange={(e) => setDurOutra(e.target.value.replace(/[^0-9,.]/g, ""))} />}</div>
        <label><span className="esc-l">Valor do plantão</span><MoneyInput value={valor} onChange={(v) => { setValor(v); setErro(""); }} /></label>
      </div>
      <FormaPicker value={forma} onChange={setForma} />
      {forma === "pj" && <div className="field"><label>Imposto da sua empresa (%)</label><input type="text" inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value.replace(/[^0-9,.]/g, ""))} placeholder="Ex.: 15,5" />{taxaPadrao ? <div className="field-hint">Sugerido pela Contabilidade: {String(taxaPadrao).replace(".", ",")}%.</div> : null}</div>}
      <div className="field"><label>Quando paga</label><PrazoPicker unit="dias" value={prazo} onChange={setPrazo} /></div>
      {Number(valor) > 0 && (
        <div className="rc-info ok" data-resumo>
          {modo === "um" ? <>Plantão de {fmtHoras(horas)} em {fmtDatePt(data)}: {fmtBRL(Number(valor))}{forma === "pj" ? <>, fica com você {fmtBRL(liq)}</> : null}.</>
            : <>{dias.length ? ORDEM_SEM.filter((d) => dias.includes(d)).map((d) => DIAS_SEM[d]).join(", ") : "Escolha os dias"} · {fmtHoras(horas)} · {fmtBRL(Number(valor))}. Cerca de <b>{fmtBRL(liq * porMes)}</b> por mês{forma === "pj" ? ", já sem o imposto" : ""}. Próximos: {prox.join(", ")}. Os plantões entram no Calendário e dá para tirar um dia específico.</>}
        </div>
      )}
      {erro && <div className="note-bad" style={{ marginTop: 8 }}>{erro}</div>}
      <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={salvar}>{modo === "fixo" ? "Salvar plantão fixo" : "Salvar plantão"}</button>
    </div>
  );
}

// atalho "Cargo fixo" do botão +: abre direto o cadastro de cargo fixo (diarismo, coordenação, preceptoria)
function QuickCargoFixo({ onClose, onSave, monthKey }) {
  const [escolhido, setEscolhido] = useState("");
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="sheet-handle" />
        <div className="sheet-title">Novo cargo fixo</div>
        <p className="add-sub">Escolha o tipo ou digite um nome. O salário do mês entra sozinho e a escala aparece no calendário.</p>
        <div className="chip-row" style={{ marginBottom: 10 }}>
          {["Diarismo", "Coordenação", "Preceptoria", "Outro"].map((p) => <button key={p} type="button" className={`chip sm ${escolhido === p ? "active" : ""}`} onClick={() => setEscolhido(p === "Outro" ? "__" : p)}>{p}</button>)}
        </div>
        <VinculoForm key={escolhido} fixo defaultNome={escolhido === "__" ? "" : escolhido} defaultStartMonth={monthKey}
          onSubmit={(d) => { onSave(d); onClose(); }} />
        <div style={{ marginTop: 10, textAlign: "center" }}><button className="link-btn" onClick={onClose}>Cancelar</button></div>
      </div>
    </div>
  );
}

function SectionShell({ icon, iconBg, title, subtitle, expanded, onToggle, children }) {
  return (
    <div className="section-card">
      <div className="section-header" onClick={onToggle}>
        <div className="section-header-left">
          <div className="section-icon" style={{ background: iconBg }}>{icon}</div>
          <div><div className="section-title">{title}</div><div className="section-sub">{subtitle}</div></div>
        </div>
        {expanded ? <IconChevronUp size={18} color="#8FA3A0" /> : <IconChevronDown size={18} color="#8FA3A0" />}
      </div>
      {expanded && <div className="section-body">{children}</div>}
    </div>
  );
}

// valor em reais com ponto de milhar enquanto digita: os números entram pela direita (12480 vira 124,80; 1248000 vira 12.480,00)
function MoneyInput({ value, onChange, id, placeholder = "0,00", ...rest }) {
  const txt = value === "" || value === null || value === undefined ? "" : (Number(value) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <input id={id} inputMode="numeric" autoComplete="off" value={txt} placeholder={placeholder} onChange={(e) => { const d = e.target.value.replace(/\D/g, "").replace(/^0+/, ""); onChange(d === "" ? "" : Number(d) / 100); }} {...rest} />;
}

function FormBtns({ label, onSubmit, onCancel, onDelete }) {
  return (
    <div className="fz-btns">
      <button type="button" className="btn btn-primary" onClick={onSubmit}>{label}</button>
      {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>}
      {onDelete && <button type="button" className="btn btn-ghost fz-del" onClick={onDelete}><IconTrash size={14} /> Excluir</button>}
    </div>
  );
}

// como o dinheiro do trabalho chega: nota da própria empresa, Pix como sócio de outra empresa ou carteira assinada
const FORMAS = [
  ["pj", "Nota da minha empresa", "Você emite a nota, paga os impostos e fica com o resto.", "o app calcula o imposto", "#DBEAFE", "🧾"],
  ["socio", "Pix de empresa em que sou sócio", "Outra empresa paga sua parte direto no seu CPF.", "imposto já pago pela empresa", "#EDE9FE", "🤝"],
  ["clt", "Carteira assinada", "Salário que já cai líquido na conta. Inclui 13º e férias.", "imposto já descontado", "#DCFCE7", "📄"],
];
const formaDe = (x) => { const f = x && x.forma === "pf" ? "socio" : x && x.forma; return FORMAS.some((y) => y[0] === f) ? f : "pj"; };
const FORMA_CURTA = { pj: "", socio: "Pix como sócio", clt: "carteira assinada" };
function FormaPicker({ value = "pj", onChange }) {
  return (
    <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>Como esse dinheiro chega até você?</label>
      <div className="fm-ops" role="radiogroup" aria-label="Como esse dinheiro chega até você">
        {FORMAS.map(([k, l, d, selo, bg, ic]) => (
          <button key={k} type="button" role="radio" aria-checked={value === k} className={`fm-op ${value === k ? "on" : ""}`} data-forma={k} onClick={() => onChange(k)}>
            <i style={{ background: bg }} aria-hidden="true">{ic}</i>
            <span><b>{l}</b><small>{d}</small><em className={k === "pj" ? "warn" : "ok"}>{selo}</em></span>
            <span className="fm-rad" aria-hidden="true" />
          </button>
        ))}
      </div>
      {value === "socio" && <div className="field-hint">Isento para você. Acima de R$ 50 mil por mês da mesma empresa, ela retém 10% na fonte.</div>}
    </div>
  );
}
// imposto mensal de pessoa física (carnê-leão), tabela de 2026 com a redução até R$ 7.350
function irMensal(base) {
  const fx = [[2428.80, 0, 0], [2826.65, 7.5, 182.16], [3751.05, 15, 394.16], [4664.68, 22.5, 675.49], [Infinity, 27.5, 908.73]].find((f) => base <= f[0]);
  const bruto = Math.max(0, base * fx[1] / 100 - fx[2]);
  const red = base <= 5000 ? bruto : base <= 7350 ? Math.max(0, 978.62 - 0.133145 * base) : 0;
  return Math.max(0, bruto - Math.min(bruto, red));
}
// tipos de receita: o app já sabe como fica o imposto de cada um
const REC_REPETE = [
  ["aluguel", "Aluguel", "Aluguel recebido no seu CPF paga imposto pelo carnê-leão. O app calcula e lembra todo mês na Contabilidade."],
  ["dividendos", "Dividendos", "Dividendos são isentos de imposto de renda."],
  ["prolabore", "Pró-labore", "Informe o valor que cai na conta. INSS e imposto já vêm descontados."],
  ["outro", "Outra", "Se tiver imposto a descontar, informe a porcentagem."],
];
const REC_UNICA = [
  ["processo", "Processo", "Informe o valor que caiu na conta. O imposto, se houver, já vem descontado pelo tribunal."],
  ["13", "13º salário", "O imposto já vem descontado pela empresa. Informe o valor que caiu."],
  ["pix", "Pix de quem me devia", "Dinheiro que te devolveram não é renda e não tem imposto."],
  ["restituicao", "Restituição do IR", "A restituição não é renda e não tem imposto."],
  ["outro", "Outro", "Se tiver imposto a descontar, informe a porcentagem."],
];
const recInfo = (lista, k) => lista.find((x) => x[0] === k) || lista[lista.length - 1];
// líquido de uma receita conforme o tipo
const liquidoReceita = (o, amount, netOf) => {
  const a = Number(amount) || 0;
  if (o.tipoReceita === "aluguel") return a - irMensal(a);
  if (o.tipoReceita && o.tipoReceita !== "outro") return a;
  if (o.taxOverride === undefined || o.taxOverride === null || String(o.taxOverride) === "") return a;
  return netOf(a, o.taxOverride);
};

function ExtraIncomeForm({ inicial, onSubmit, onCancel, onDelete }) {
  const ini = inicial || {};
  const [tipoReceita, setTipo] = useState(ini.tipoReceita || (inicial ? "outro" : "aluguel"));
  const [description, setDescription] = useState(ini.description || (inicial ? "" : "Aluguel"));
  const [amount, setAmount] = useState(inicial ? Number(ini.amount) || 0 : "");
  const [diaRecebimento, setDia] = useState(ini.diaRecebimento || 5);
  const [taxOverride, setTax] = useState(ini.taxOverride !== null && ini.taxOverride !== undefined ? String(ini.taxOverride) : "");
  const [prazoMeses, setPrazo] = useState(Number(ini.prazoMeses) || 0);
  const [erro, setErro] = useState("");
  const info = recInfo(REC_REPETE, tipoReceita);
  const escolher = (k) => { const ant = recInfo(REC_REPETE, tipoReceita)[1]; if (!description.trim() || description === ant) setDescription(k === "outro" ? "" : recInfo(REC_REPETE, k)[1]); setTipo(k); setErro(""); };
  const submit = () => {
    if (!description.trim()) { setErro("Dê um nome para a receita."); return; }
    if (!(Number(amount) > 0)) { setErro("Informe o valor."); return; }
    onSubmit({ description: description.trim(), amount: Number(amount), diaRecebimento, taxOverride: tipoReceita === "outro" ? (String(taxOverride).trim() === "" ? 0 : Number(String(taxOverride).replace(",", "."))) : 0, prazoMeses, tipoReceita, forma: tipoReceita === "dividendos" ? "div" : tipoReceita === "prolabore" ? "clt" : "pf" });
    if (!inicial) { setDescription(""); setAmount(""); setTax(""); setPrazo(0); }
    setErro("");
  };
  const v = Number(amount) || 0, leao = tipoReceita === "aluguel" ? irMensal(v) : 0;
  return (
    <div className="mini-form">
      <div className="field"><label>O que é</label>
        <div className="chip-row" role="group" aria-label="Tipo de receita">{REC_REPETE.map(([k, l]) => <button key={k} type="button" className={`chip sm ${tipoReceita === k ? "active" : ""}`} aria-pressed={tipoReceita === k} onClick={() => escolher(k)}>{l}</button>)}</div>
      </div>
      <div className={`rc-info ${tipoReceita === "aluguel" ? "warn" : ""}`}>{info[2]}</div>
      <div className="form-grid">
        <div className="field"><label>Nome</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Aluguel da sala" /></div>
        <div className="field"><label>{tipoReceita === "prolabore" ? "Quanto cai na conta por mês" : "Valor por mês"}</label><MoneyInput value={amount} onChange={(x) => { setAmount(x); setErro(""); }} /></div>
        <div className="field"><label>Cai todo dia</label><input type="number" min="1" max="31" value={diaRecebimento} onChange={(e) => setDia(e.target.value)} /></div>
        {tipoReceita === "outro" && <div className="field"><label>Imposto (%), se tiver</label><input type="number" inputMode="decimal" min="0" value={taxOverride} placeholder="0" onChange={(e) => setTax(e.target.value)} /></div>}
      </div>
      {tipoReceita === "aluguel" && v > 0 && <div className="rc-res"><div><span>Aluguel</span><b className="mono">{fmtBRL(v)}</b></div><div><span>Carnê-leão estimado</span><b className="mono" style={{ color: "#B91C1C" }}>− {fmtBRL(leao)}</b></div><div className="t"><span>Fica com você</span><b className="mono">{fmtBRL(v - leao)}</b></div></div>}
      {erro && <div className="note-bad" style={{ marginTop: 8 }}>{erro}</div>}
      <FormBtns label={inicial ? "Salvar alterações" : "Salvar receita"} onSubmit={submit} onCancel={onCancel} onDelete={onDelete} />
    </div>
  );
}

function ShiftEditForm({ shift, onSubmit, onCancel, onDelete }) {
  const [gross, setGross] = useState(Number(shift.gross) || 0);
  const [hours, setHours] = useState(shift.hours || "");
  const [date, setDate] = useState(shift.date);
  const [prazo, setPrazo] = useState(Number(shift.prazoDias) || 0);
  const submit = () => { if (!date) return; onSubmit({ gross: Number(gross) || 0, hours: Number(hours) || 0, date, prazoDias: Number(prazo) || 0 }); };
  return (
    <div className="mini-form">
      <div className="form-grid">
        <div className="field"><label>Valor bruto (R$)</label><MoneyInput value={gross} onChange={setGross} /></div>
        <div className="field"><label>Horas</label><input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
        <div className="field"><label>Data do plantão</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>Paga em quanto tempo?</label><PrazoPicker unit="dias" value={prazo} onChange={setPrazo} /></div>
      </div>
      <FormBtns label="Salvar alterações" onSubmit={submit} onCancel={onCancel} onDelete={onDelete} />
    </div>
  );
}

function OneOffEditForm({ item, onSubmit, onCancel, onDelete, novo, defaultDate }) {
  const it = item || {};
  const tipoIni = it.tipoReceita || (novo ? "processo" : "outro");
  const [tipoReceita, setTipo] = useState(tipoIni);
  const [description, setDescription] = useState(it.description || (novo ? "Processo" : ""));
  const [amount, setAmount] = useState(novo ? "" : Number(it.amount) || 0);
  const [date, setDate] = useState(it.date || defaultDate || todayStr());
  const [tax, setTax] = useState(it.taxOverride !== undefined && it.taxOverride !== null ? String(it.taxOverride) : "");
  const [recebido, setRecebido] = useState(novo ? (it.date || defaultDate || todayStr()) <= todayStr() : !!it.recebido);
  const [erro, setErro] = useState("");
  const info = recInfo(REC_UNICA, tipoReceita);
  const escolher = (k) => { const ant = recInfo(REC_UNICA, tipoReceita)[1]; if (!description.trim() || description === ant) setDescription(k === "outro" ? "" : recInfo(REC_UNICA, k)[1]); setTipo(k); setErro(""); };
  const submit = () => {
    if (!description.trim()) { setErro("Diga o que é essa receita."); return; }
    if (!(Number(amount) > 0)) { setErro("Informe o valor."); return; }
    if (!date) { setErro("Informe a data."); return; }
    onSubmit({ description: description.trim(), amount: Number(amount) || 0, date, taxOverride: tipoReceita === "outro" ? (Number(String(tax).replace(",", ".")) || 0) : 0, recebido, tipoReceita, forma: tipoReceita === "13" ? "clt" : "pf" });
  };
  const liq = (Number(amount) || 0) * (1 - (tipoReceita === "outro" ? (Number(String(tax).replace(",", ".")) || 0) : 0) / 100);
  return (
    <div className="mini-form">
      <div className="field"><label>O que é</label>
        <div className="chip-row" role="group" aria-label="Tipo de receita">{REC_UNICA.map(([k, l]) => <button key={k} type="button" className={`chip sm ${tipoReceita === k ? "active" : ""}`} aria-pressed={tipoReceita === k} onClick={() => escolher(k)}>{l}</button>)}</div>
      </div>
      <div className="rc-info">{info[2]}</div>
      <div className="form-grid">
        <div className="field"><label>Nome</label><input value={description} onChange={(e) => { setDescription(e.target.value); setErro(""); }} placeholder="Ex.: Processo trabalhista" /></div>
        <div className="field"><label>{tipoReceita === "outro" ? "Valor" : "Valor que caiu"}</label><MoneyInput value={amount} onChange={(v) => { setAmount(v); setErro(""); }} /></div>
        <div className="field"><label>Data</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        {tipoReceita === "outro" && <div className="field"><label>Imposto (%), se tiver</label><input type="number" inputMode="decimal" min="0" value={tax} placeholder="0" onChange={(e) => setTax(e.target.value)} /></div>}
      </div>
      <label className="chk-line" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontSize: 14 }}><input type="checkbox" checked={recebido} onChange={(e) => setRecebido(e.target.checked)} /> Já recebi</label>
      {tipoReceita === "outro" && Number(tax) > 0 && Number(amount) > 0 && <div className="field-hint" style={{ marginTop: 6 }}>Fica com você: <b>{fmtBRL(liq)}</b></div>}
      {erro && <div className="note-bad" style={{ marginTop: 8 }}>{erro}</div>}
      <FormBtns label={novo ? "Salvar receita" : "Salvar alterações"} onSubmit={submit} onCancel={onCancel} onDelete={onDelete} />
    </div>
  );
}

function VinculoForm({ onSubmit, defaultStartMonth, fixo, defaultNome, inicial, onCancel, onDelete, taxaPadrao }) {
  const ini = inicial || {};
  const [nome, setNome] = useState(inicial ? ini.nome || "" : defaultNome || "");
  const [cor, setCor] = useState(ini.cor || PALETTE[0]);
  const [tipo, setTipo] = useState(inicial ? ini.tipo : fixo ? "mensal" : "plantao");
  const [taxOverride, setTaxOverride] = useState(ini.taxOverride !== null && ini.taxOverride !== undefined && formaDe(ini) === "pj" ? String(ini.taxOverride) : (taxaPadrao ? String(taxaPadrao).replace(".", ",") : ""));
  const [valorMensal, setValorMensal] = useState(inicial && ini.tipo === "mensal" ? Number(ini.valorMensal) || 0 : "");
  const [diaRecebimento, setDiaRecebimento] = useState(ini.diaRecebimento || 5);
  const [prazoPadrao, setPrazoPadrao] = useState(Number(ini.prazoPadrao) || 0);
  const [prazoMeses, setPrazoMeses] = useState(Number(ini.prazoMeses) || 0);
  const [escala, setEscala] = useState(Array.isArray(ini.escala) ? ini.escala : []);
  const [forma, setForma] = useState(formaDe(ini));
  const [clt13, setClt13] = useState(inicial ? !!ini.clt13 : true);
  const [feriasMes, setFeriasMes] = useState(ini.feriasMes === undefined || ini.feriasMes === null ? "" : String(ini.feriasMes));

  const [erroV, setErroV] = useState("");
  const submit = () => {
    if (!String(nome).trim()) { setErroV("Dê um nome para o vínculo."); return; }
    if (tipo === "mensal" && !(Number(valorMensal) > 0)) { setErroV("Informe o valor que você recebe por mês."); return; }
    const tx = Number(String(taxOverride).replace(",", "."));
    if (forma === "pj" && (String(taxOverride).trim() === "" || !(tx >= 0))) { setErroV("Informe o imposto da sua empresa. Se não souber, use o valor sugerido."); return; }
    setErroV("");
    onSubmit({ nome, cor, tipo, taxOverride: forma === "pj" ? tx : 0, valorMensal, diaRecebimento, prazoPadrao, prazoMeses, escala, forma, clt13: forma === "clt" && tipo === "mensal" ? clt13 : false, feriasMes: forma === "clt" && tipo === "mensal" && feriasMes !== "" ? Number(feriasMes) : null, startMonth: defaultStartMonth });
    if (!inicial) { setNome(""); setValorMensal(""); setPrazoPadrao(0); setPrazoMeses(0); setEscala([]); }
  };

  return (
    <div className="mini-form">
      <div className="form-grid">
        <div className="field"><label>Nome do vínculo</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Hospital São Lucas, UTI Municipal..." /></div>
        <div className="field color-field"><label>Cor</label><div className="color-input-wrap"><input type="color" value={cor} onChange={(e) => setCor(e.target.value)} /></div></div>
        {!fixo && !inicial && <div className="field"><label>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="plantao">Plantão avulso (lançado no calendário)</option>
            <option value="mensal">Cargo fixo com salário mensal (diarista, contrato...)</option>
          </select>
        </div>}
        <FormaPicker value={forma} onChange={(f) => { setForma(f); setErroV(""); }} />
        {forma === "pj" && <div className="field"><label>Imposto da sua empresa (%)</label><input type="text" inputMode="decimal" value={taxOverride} onChange={(e) => { setTaxOverride(e.target.value.replace(/[^0-9,.]/g, "")); setErroV(""); }} placeholder="Ex.: 15,5" />{taxaPadrao ? <div className="field-hint">Sugerido pela Contabilidade: {String(taxaPadrao).replace(".", ",")}%. Se o contador passou outro número, troque.</div> : null}</div>}
        {tipo === "mensal" && (
          <>
            <div className="field"><label>{forma === "clt" ? "Quanto cai na sua conta por mês" : forma === "socio" ? "Quanto cai no Pix por mês" : "Valor por mês (bruto, da nota)"}</label><MoneyInput value={valorMensal} onChange={(v) => { setValorMensal(v); setErroV(""); }} /></div>
            <div className="field"><label>Cai todo dia</label><input type="number" min="1" max="31" value={diaRecebimento} onChange={(e) => setDiaRecebimento(e.target.value)} /></div>
            {forma === "pj" && Number(valorMensal) > 0 && String(taxOverride).trim() !== "" && <div className="rc-res" style={{ gridColumn: "1 / -1" }}><div><span>Valor da nota</span><b className="mono">{fmtBRL(Number(valorMensal))}</b></div><div><span>Imposto</span><b className="mono" style={{ color: "#B91C1C" }}>− {fmtBRL(Number(valorMensal) * (Number(String(taxOverride).replace(",", ".")) || 0) / 100)}</b></div><div className="t"><span>Fica com você</span><b className="mono">{fmtBRL(Number(valorMensal) * (1 - (Number(String(taxOverride).replace(",", ".")) || 0) / 100))}</b></div></div>}
            {forma === "clt" && (
              <>
                <label className="ct-check" style={{ gridColumn: "1 / -1", marginTop: 0 }}><input type="checkbox" checked={clt13} onChange={(e) => setClt13(e.target.checked)} /><span>Recebo 13º salário<small>Entra metade em novembro e metade em dezembro.</small></span></label>
                <div className="field"><label>Mês das férias (recebe +1/3)</label><select value={feriasMes} onChange={(e) => setFeriasMes(e.target.value)}><option value="">Não informar</option>{MONTHS_PT.map((m, i) => <option key={i} value={i}>{m}</option>)}</select></div>
              </>
            )}
            <div className="field" style={{ gridColumn: "1 / -1" }}><label>Escala fixa (opcional)</label><EscalaEditor value={escala} onChange={setEscala} /></div>
          </>
        )}
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>{tipo === "mensal" ? "Esta empresa paga o mês trabalhado quando?" : "Esta empresa paga o plantão em quanto tempo?"}</label>
          {tipo === "mensal"
            ? <PrazoPicker key="m" unit="meses" value={prazoMeses} onChange={setPrazoMeses} />
            : <PrazoPicker key="p" unit="dias" value={prazoPadrao} onChange={setPrazoPadrao} />}
          <div className="field-hint">{tipo === "mensal" ? "Ex.: “1 mês depois” significa que o trabalho de outubro entra no caixa em novembro." : "Você ainda poderá ajustar o prazo de cada plantão na hora de lançar."}</div>
        </div>
      </div>
      {erroV && <div className="note-bad" style={{ marginTop: 8 }}>{erroV}</div>}
      {inicial
        ? <FormBtns label="Salvar alterações" onSubmit={submit} onCancel={onCancel} onDelete={onDelete} />
        : <button className="btn btn-primary" onClick={submit}><IconPlus size={15} /> {fixo ? "Salvar cargo fixo" : "Salvar vínculo"}</button>}
    </div>
  );
}

function VinculoManager({ vinculos, addVinculo, removeVinculo, updateVinculoTax, updateVinculoPrazo, updateVinculoEscala, monthKey }) {
  const [showForm, setShowForm] = useState(vinculos.length === 0);
  const [editEscala, setEditEscala] = useState(null);
  return (
    <div>
      {vinculos.length === 0 ? (
        <div className="empty-state">Nenhum vínculo cadastrado ainda. Crie o primeiro para começar a lançar plantões ou renda mensal fixa.</div>
      ) : (
        vinculos.map((v) => (
          <React.Fragment key={v.id}>
          <div className="vinculo-row" style={v.tipo === "mensal" ? { borderBottom: "none" } : null}>
            <div className="vinculo-left">
              <span className="color-dot" style={{ background: v.cor }} />
              <span className="hospital-name">{v.nome}</span>
              <span className={`badge-tipo ${v.tipo}`}>{v.tipo === "mensal" ? "Mensal fixo" : "Plantão"}</span>
            </div>
            <div className="vinculo-right">
              {v.tipo === "mensal" && <span className="list-row-sub mono">{fmtBRL(v.valorMensal)} · dia {v.diaRecebimento}</span>}
              <span className="tax-box-label">Paga:</span>
              <select className="tax-mini wide" value={v.tipo === "mensal" ? (v.prazoMeses || 0) : (v.prazoPadrao || 0)} onChange={(e) => updateVinculoPrazo(v.id, e.target.value)}>
                {prazoOptions(v.tipo === "mensal" ? "meses" : "dias", v.tipo === "mensal" ? (v.prazoMeses || 0) : (v.prazoPadrao || 0)).map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
              <span className="tax-box-label">Tributação:</span>
              <input className="tax-mini" type="number" value={v.taxOverride ?? ""} placeholder="geral" onChange={(e) => updateVinculoTax(v.id, e.target.value)} />
              <button className="btn-icon" onClick={() => { if (window.confirm(`Remover o vínculo "${v.nome}"? Os lançamentos associados também serão removidos.`)) removeVinculo(v.id); }}><IconTrash size={15} /></button>
            </div>
          </div>
          {v.tipo === "mensal" && (
            <div className="escala-line" data-escala={v.nome}>
              <span>{(v.escala || []).length ? "Escala fixa: " + escalaResumo(v) : "Sem escala fixa. As horas deste vínculo não entram na rentabilidade."}</span>{" "}
              <button className="subtle-link" onClick={() => setEditEscala(editEscala === v.id ? null : v.id)}>{editEscala === v.id ? "Fechar" : (v.escala || []).length ? "Editar escala" : "Definir escala"}</button>
              {editEscala === v.id && <EscalaEditor value={v.escala || []} onChange={(e) => updateVinculoEscala(v.id, e)} />}
            </div>
          )}
          </React.Fragment>
        ))
      )}
      {showForm ? <VinculoForm onSubmit={(d) => { addVinculo(d); setShowForm(false); }} defaultStartMonth={monthKey} />
        : <button className="subtle-link" onClick={() => setShowForm(true)}><IconPlus size={13} /> Novo vínculo</button>}
    </div>
  );
}

function ExtraIncomeManager({ extraRecurringIncomes, addExtraRecurringIncome, removeExtraRecurringIncome, updateExtraPrazo, monthKey }) {
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [diaRecebimento, setDiaRecebimento] = useState(5);
  const [taxOverride, setTaxOverride] = useState("");
  const [prazoMeses, setPrazoMeses] = useState(0);

  const submit = () => {
    if (!description || !amount) return;
    addExtraRecurringIncome({ description, amount, diaRecebimento, prazoMeses, startMonth: monthKey, taxOverride });
    setDescription(""); setAmount(""); setPrazoMeses(0); setShowForm(false);
  };

  return (
    <div>
      {extraRecurringIncomes.length > 0 && extraRecurringIncomes.map((e) => (
        <div className="vinculo-row" key={e.id}>
          <div className="vinculo-left"><span className="color-dot" style={{ background: SLATE }} /><span className="hospital-name">{e.description}</span><span className="badge-tipo recorrente">Recorrente</span></div>
          <div className="vinculo-right">
            <span className="list-row-sub mono">{fmtBRL(e.amount)} · dia {e.diaRecebimento}</span>
            <select className="tax-mini wide" value={e.prazoMeses || 0} onChange={(ev) => updateExtraPrazo(e.id, ev.target.value)}>
              {prazoOptions("meses", e.prazoMeses || 0).map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
            <button className="btn-icon" onClick={() => removeExtraRecurringIncome(e.id)}><IconTrash size={15} /></button>
          </div>
        </div>
      ))}
      {showForm ? (
        <div className="mini-form">
          <div className="form-grid">
            <div className="field"><label>Descrição</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Aluguel de consultório" /></div>
            <div className="field"><label>Valor (R$)</label><MoneyInput value={amount} onChange={setAmount} /></div>
            <div className="field"><label>Dia de recebimento</label><input type="number" min="1" max="31" value={diaRecebimento} onChange={(e) => setDiaRecebimento(e.target.value)} /></div>
            <div className="field"><label>Tributação (%) — opcional</label><input type="number" value={taxOverride} onChange={(e) => setTaxOverride(e.target.value)} placeholder="usa a geral" /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label>Quando esse valor é pago?</label><PrazoPicker unit="meses" value={prazoMeses} onChange={setPrazoMeses} /></div>
          </div>
          <button className="btn btn-primary" onClick={submit}><IconPlus size={15} /> Salvar receita recorrente</button>
        </div>
      ) : <button className="subtle-link" onClick={() => setShowForm(true)}><IconPlus size={13} /> Nova receita recorrente (fora de vínculo)</button>}
    </div>
  );
}

function FaturamentoTab({
  expanded, toggleSection, viewMonth, monthKey, monthIncomeItems, totalGross, totalNet,
  vinculos, addVinculo, removeVinculo, updateVinculoTax, updateVinculoPrazo, updateVinculoEscala, extraRecurringIncomes, addExtraRecurringIncome, removeExtraRecurringIncome, updateExtraPrazo,
  shifts = [], oneOffIncomes = [], updateVinculo, updateExtra, updateShift, updateOneOff, addOneOff, onAdd, taxaPadrao,
  netByVinculo, gainScope, setGainScope, history12, chartMonths, setChartMonths, goMonth, workCard, discreto, setDiscreto, desk
}) {
  const gv = useGv();
  const [editKey, setEditKey] = useState(null);
  const [addOpen, setAddOpen] = useState(vinculos.length === 0 ? "vinculo" : null);
  const fechar = () => setEditKey(null);
  const confirmaVinculo = (v) => { if (window.confirm(`Excluir o vínculo "${v.nome}"? Os plantões e presenças dele também serão apagados.`)) { removeVinculo(v.id); fechar(); } };
  const confirmaExtra = (e) => { if (window.confirm(`Excluir a receita "${e.description}"? Ela some de todos os meses.`)) { removeExtraRecurringIncome(e.id); fechar(); } };
  const editorVinculo = (v) => <VinculoForm key={"v" + v.id} inicial={v} taxaPadrao={taxaPadrao} onSubmit={(d) => { updateVinculo(v.id, d); fechar(); }} onCancel={fechar} onDelete={() => confirmaVinculo(v)} />;
  const editorExtra = (e) => <ExtraIncomeForm key={"e" + e.id} inicial={e} onSubmit={(d) => { updateExtra(e.id, d); fechar(); }} onCancel={fechar} onDelete={() => confirmaExtra(e)} />;
  const editor = (it) => {
    const r = it.ref || {};
    if (r.t === "vinculo") { const v = vinculos.find((x) => x.id === r.id); return v ? <><div className="fz-tit">Editar {v.nome}</div>{editorVinculo(v)}<div className="field-hint" style={{ marginTop: 8 }}>A mudança vale para todos os meses deste cargo.</div></> : null; }
    if (r.t === "extra") { const e = extraRecurringIncomes.find((x) => x.id === r.id); return e ? <><div className="fz-tit">Editar {e.description}</div>{editorExtra(e)}</> : null; }
    if (r.t === "shift") { const s = shifts.find((x) => x.id === r.id); return s ? <><div className="fz-tit">Editar plantão de {fmtDatePt(s.date)} · {it.nome}</div><ShiftEditForm key={s.id} shift={s} onSubmit={(d) => { updateShift(s.id, d); fechar(); }} onCancel={fechar} onDelete={() => { if (window.confirm("Excluir este plantão?")) { it.remove(); fechar(); } }} /></> : null; }
    if (r.t === "avulsa") { const o = oneOffIncomes.find((x) => x.id === r.id); return o ? <><div className="fz-tit">Editar receita extra</div><OneOffEditForm key={o.id} item={o} onSubmit={(d) => { updateOneOff(o.id, d); fechar(); }} onCancel={fechar} onDelete={() => { if (window.confirm("Excluir esta entrada?")) { it.removeOne(); fechar(); } }} /></> : null; }
    return null;
  };
  const vincNoMes = new Set(monthIncomeItems.map((i) => i.vinculoId).filter(Boolean));
  const extraNoMes = new Set(monthIncomeItems.filter((i) => i.ref && i.ref.t === "extra").map((i) => i.ref.id));
  const outros = [...vinculos.filter((v) => !vincNoMes.has(v.id)).map((v) => ({ k: "v-" + v.id, nome: v.nome, cor: v.cor, sub: v.tipo === "mensal" ? "cargo fixo" : "local de plantão", ed: () => editorVinculo(v) })),
    ...extraRecurringIncomes.filter((e) => !extraNoMes.has(e.id)).map((e) => ({ k: "e-" + e.id, nome: e.description, cor: SLATE, sub: "receita recorrente", ed: () => editorExtra(e) }))];
  const gavetas = outros.length ? [["outros", `Outros vínculos e receitas (${outros.length})`]] : [];
  const sorted = [...monthIncomeItems].sort((a, b) => a.tipo === b.tipo ? 0 : (a.tipo === "plantao" ? -1 : 1));
  const received = monthIncomeItems.filter((i) => i.recebido).reduce((a, i) => a + i.net, 0);
  const donutData = netByVinculo.map((h) => ({ nome: h.nome, value: h.value, cor: h.cor }));

  return (
    <div>
      <EyeBtn on={discreto} toggle={() => setDiscreto(!discreto)} />
      <div className="kpi-row">
        <Kpi label="Receita bruta" value={fmtBRL(totalGross)} />
        <Kpi label="Impostos" value={fmtBRL(totalGross - totalNet)} tone="var(--brick)" />
        <Kpi label="Receita líquida" value={fmtBRL(totalNet)} sub="entra neste mês" />
        <Kpi label="Já recebido" value={fmtBRL(received)} tone="var(--teal)" sub={totalNet > 0 ? Math.round((received / totalNet) * 100) + "% do líquido" : null} />
      </div>


      {!desk && (<>
      {workCard}

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Por vínculo</h3>
            <div className="segmented sm"><button className={`seg-btn ${gainScope === "mensal" ? "active" : ""}`} onClick={() => setGainScope("mensal")}>Mês</button><button className={`seg-btn ${gainScope === "anual" ? "active" : ""}`} onClick={() => setGainScope("anual")}>Ano</button></div>
          </div>
          {donutData.length === 0 ? <div className="empty-state">Cadastre um vínculo e lance plantões para ver a distribuição.</div> : <InteractiveDonut data={donutData} size={150} stroke={20} centerLabel={gainScope === "anual" ? "ano" : "mês"} />}
        </div>

        <div className="card">
          <div className="card-head"><h3 className="card-title">Rendimento</h3><RangeTabs value={chartMonths} onChange={setChartMonths} /></div>
          <SvgAreaChart data={history12} height={200} color={TEAL} valueKey="value" onOpen={(d) => goMonth(d.y, d.m)} />
        </div>
      </div>

      </>)}
      <div className={desk ? "dgrid" : ""} style={desk ? { gridTemplateColumns: "1.7fr 1fr", alignItems: "start" } : null}>
      <div className="card flush">
        <div className="card-head pad"><h3 className="card-title">Lançamentos de {MONTHS_PT[viewMonth]}</h3><span className="card-note">toque no status para marcar como recebido</span></div>
        {sorted.length === 0 ? <div className="empty-state">Nenhuma receita neste mês ainda.</div> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Vínculo</th><th className="hide-sm">Data</th><th className="num hide-sm">Bruto</th><th className="num">Líquido</th><th>Status</th><th /></tr></thead>
              <tbody>
                {sorted.map((it) => (
                  <React.Fragment key={it.key}>
                  <tr className={editKey === it.key ? "fz-aberta" : ""}>
                    <td><span className="asset-cell"><span className="legend-dot" style={{ background: it.cor }} /><span><b>{it.nome}</b><span className="cell-sub show-sm">{it.dateLabel}</span></span></span></td>
                    <td className="hide-sm">{it.dateLabel}{it.tipo !== "plantao" && !/ref\./.test(it.dateLabel) ? (it.tipo === "mensal" ? "" : "") : ""}</td>
                    <td className="num mono hide-sm">{fmtBRL(it.gross)}</td>
                    <td className="num mono">{fmtBRL(it.net)}</td>
                    <td><button className={`badge ${it.recebido ? "badge-paid" : "badge-pending"}`} onClick={it.toggle}>{it.recebido ? "Recebido" : "Pendente"}</button></td>
                    <td className="num"><button type="button" className={`fz-pen ${editKey === it.key ? "on" : ""}`} aria-label={"Editar " + it.nome} aria-expanded={editKey === it.key} onClick={() => setEditKey(editKey === it.key ? null : it.key)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></button></td>
                  </tr>
                  {editKey === it.key && <tr className="fz-row"><td colSpan={6}><div className="fz-ed">{editor(it)}</div></td></tr>}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="fz-add-wrap">
          {onAdd && <button type="button" className="fz-add fz-add-main" id="fz-adicionar" onClick={onAdd}><i aria-hidden="true">+</i><span>Adicionar plantão, cargo ou receita</span></button>}
          {gavetas.map(([k, l]) => (
            <React.Fragment key={k}>
              <button type="button" className="fz-add" aria-expanded={addOpen === k} onClick={() => setAddOpen(addOpen === k ? null : k)}><i aria-hidden="true">{k === "outros" ? "≡" : addOpen === k ? "−" : "+"}</i><span>{l}</span><em aria-hidden="true">›</em></button>
              {addOpen === k && (
                <div className="fz-ed">
                  {k === "vinculo" && <VinculoForm onSubmit={(d) => { addVinculo(d); setAddOpen(null); }} defaultStartMonth={monthKey} />}
                  {k === "extra" && <ExtraIncomeForm onSubmit={(d) => { addExtraRecurringIncome({ ...d, startMonth: monthKey }); setAddOpen(null); }} />}
                  {k === "avulsa" && <OneOffEditForm novo defaultDate={todayStr().slice(0, 7) === monthKey ? todayStr() : monthKey + "-05"} onSubmit={(d) => { addOneOff(d); setAddOpen(null); }} onCancel={() => setAddOpen(null)} />}
                  {k === "outros" && outros.map((o) => (
                    <React.Fragment key={o.k}>
                      <div className="fz-out"><span><span className="legend-dot" style={{ background: o.cor, marginRight: 8 }} /><b>{o.nome}</b><small>{o.sub} · sem lançamento neste mês</small></span>
                        <button type="button" className={`fz-pen ${editKey === o.k ? "on" : ""}`} aria-label={"Editar " + o.nome} aria-expanded={editKey === o.k} onClick={() => setEditKey(editKey === o.k ? null : o.k)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></button></div>
                      {editKey === o.k && <div className="fz-ed" style={{ marginTop: 0 }}>{o.ed()}</div>}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      {desk && (
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">Por vínculo</h3>
            <div className="segmented sm"><button className={`seg-btn ${gainScope === "mensal" ? "active" : ""}`} onClick={() => setGainScope("mensal")}>Mês</button><button className={`seg-btn ${gainScope === "anual" ? "active" : ""}`} onClick={() => setGainScope("anual")}>Ano</button></div>
          </div>
          {donutData.length === 0 ? <div className="empty-state">Cadastre um vínculo e lance plantões para ver a distribuição.</div> : <InteractiveDonut data={donutData} size={150} stroke={20} centerLabel={gainScope === "anual" ? "ano" : "mês"} />}
        </div>

      )}
      </div>
      {desk && (
        <DGrid>
          <DGv id="fat-12m" open icon={<IconTrending size={18} />} title="Receita líquida mês a mês" sub={`últimos ${chartMonths} meses`} val={"média " + fmtBRL(history12.length ? history12.reduce((a, h) => a + h.value, 0) / history12.length : 0)}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}><RangeTabs value={chartMonths} onChange={setChartMonths} /></div>
            <SvgAreaChart data={history12} height={220} color={TEAL} valueKey="value" onOpen={(d) => goMonth(d.y, d.m)} />
          </DGv>
          <DGv id="fat-hora" icon={<IconCalendar size={18} />} tone="#DB2777" title="Ganho por hora" sub="pelo mês trabalhado" val="">{workCard}</DGv>
          <DGv id="fat-imp" icon={<IconCalc size={18} />} tone="#2563EB" title="Impostos por vínculo" sub={totalGross > 0 ? `${((totalGross - totalNet) / totalGross * 100).toFixed(1).replace(".", ",")}% da receita bruta` : "sem receita no mês"} val={fmtBRL(totalGross - totalNet)}>
            <div className="dprox">{Object.values(monthIncomeItems.reduce((m, it) => { const k = it.nome; m[k] = m[k] || { nome: k, cor: it.cor, imp: 0, bruto: 0 }; m[k].imp += it.gross - it.net; m[k].bruto += it.gross; return m; }, {})).sort((a, b) => b.imp - a.imp).map((x) => (
              <div key={x.nome}><span><b><span className="legend-dot" style={{ background: x.cor, marginRight: 8 }} />{x.nome}</b><small>{x.bruto > 0 ? ((x.imp / x.bruto) * 100).toFixed(1).replace(".", ",") + "% do bruto" : ""}</small></span><b className="mono">{fmtBRL(x.imp)}</b></div>
            ))}</div>
          </DGv>
          <DGv id="fat-pend" icon={<IconCalendar size={18} />} tone="#B45309" title="A receber" sub={monthIncomeItems.filter((i) => !i.recebido && i.dateIso < todayStr()).length ? monthIncomeItems.filter((i) => !i.recebido && i.dateIso < todayStr()).length + " atrasado(s)" : "nada atrasado"} val={fmtBRL(monthIncomeItems.filter((i) => !i.recebido).reduce((a, i) => a + i.net, 0))}>
            <DProximos incomeItems={monthIncomeItems} expenseItems={[]} max={10} />
          </DGv>
        </DGrid>
      )}
    </div>
  );
}

const WIPE_GROUPS = [
  { id: "plantoes", label: "Plantões e presenças", cols: ["shifts", "presencas"] },
  { id: "receitas", label: "Receitas avulsas", cols: ["oneOffIncomes"] },
  { id: "recorrentes", label: "Receitas recorrentes", cols: ["extraRecurringIncomes"] },
  { id: "despesas", label: "Despesas", cols: ["expenses"] },
  { id: "fixas", label: "Despesas fixas", cols: ["recurringExpenses"] },
  { id: "investimentos", label: "Investimentos", cols: ["investments"] },
  { id: "metas", label: "Metas", cols: ["goals"] },
  { id: "vinculos", label: "Vínculos", hint: "também apaga plantões e presenças", cols: ["vinculos"] },
];

function WipeDataCard({ data, onWipe, undo, onUndo, onDismissUndo, downloadBackup }) {
  const [sel, setSel] = useState({});
  const [typed, setTyped] = useState("");
  const countOf = (g) => g.cols.reduce((a, c) => a + (data[c] || []).length, 0);
  const isOn = (g) => !!sel[g.id] || (g.id === "plantoes" && !!sel.vinculos);
  const available = WIPE_GROUPS.filter((g) => countOf(g) > 0);
  const chosen = available.filter(isOn);
  const total = chosen.reduce((a, g) => a + countOf(g), 0);
  const allOn = available.length > 0 && available.every(isOn);
  const ready = total > 0 && typed.trim().toUpperCase() === "APAGAR";
  const toggleAll = () => { const n = {}; if (!allOn) available.forEach((g) => { n[g.id] = true; }); setSel(n); };
  const submit = () => {
    if (!ready) return;
    onWipe(chosen.reduce((a, g) => [...a, ...g.cols], []));
    setSel({}); setTyped("");
  };
  const rowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 14, cursor: "pointer" };
  return (
    <div className="day-panel" id="wipe-card">
      <div className="day-panel-title"><span>Apagar lançamentos</span></div>
      {undo && (
        <div role="status" style={{ background: "var(--surface-3)", borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{undo.removed} {undo.removed === 1 ? "registro apagado" : "registros apagados"}. Você pode desfazer até fechar ou recarregar o app.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={onUndo}>Desfazer</button>
            <button className="btn btn-ghost" onClick={onDismissUndo}>Ok</button>
          </div>
        </div>
      )}
      {available.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>Não há lançamentos para apagar.</p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 0 }}>
            Escolha o que apagar. Vale para todos os meses e para todos os aparelhos conectados à sua conta. Baixe um backup antes, porque ele é a forma de recuperar os dados depois de fechar o app.
          </p>
          <label style={{ ...rowStyle, fontWeight: 600 }}>
            <input type="checkbox" checked={allOn} onChange={toggleAll} />
            <span style={{ flex: 1 }}>Selecionar tudo</span>
          </label>
          {available.map((g) => {
            const forced = g.id === "plantoes" && !!sel.vinculos;
            return (
              <label key={g.id} style={{ ...rowStyle, opacity: forced ? 0.65 : 1 }}>
                <input type="checkbox" checked={isOn(g)} disabled={forced} onChange={(e) => setSel((p) => ({ ...p, [g.id]: e.target.checked }))} />
                <span style={{ flex: 1 }}>{g.label}{g.hint && <span style={{ display: "block", fontSize: 12, color: "var(--text-dim)" }}>{g.hint}</span>}</span>
                <span className="mono" style={{ color: "var(--text-dim)" }}>{countOf(g)}</span>
              </label>
            );
          })}
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="wipe-confirm">Para confirmar, digite APAGAR</label>
            <input id="wipe-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" placeholder="APAGAR" />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button className="btn btn-ghost" onClick={downloadBackup}><IconDownload size={15} /> Baixar backup</button>
            <button className="btn" disabled={!ready} onClick={submit} style={{ background: "var(--brick)", color: "#fff", opacity: ready ? 1 : 0.45, cursor: ready ? "pointer" : "not-allowed" }}>
              <IconTrash size={15} /> {total > 0 ? `Apagar ${total} ${total === 1 ? "registro" : "registros"}` : "Apagar"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PosicaoInicialCard({ investments, onToggle }) {
  const [showAll, setShowAll] = useState(false);
  const groups = useMemo(() => {
    const map = {};
    investments.forEach((i) => {
      if (!i.date || i.tipo === "ajuste") return;
      const g = map[i.date] = map[i.date] || { date: i.date, count: 0, total: 0, marked: 0 };
      g.count += 1; g.total += Number(i.amount || 0); if (i.posicaoInicial) g.marked += 1;
    });
    return Object.values(map).sort((a, b) => (b.marked > 0) - (a.marked > 0) || b.total - a.total);
  }, [investments]);
  const shown = showAll ? groups : groups.slice(0, 5);
  return (
    <div className="day-panel" id="posicao-card">
      <div className="day-panel-title"><span>Posição inicial da carteira</span></div>
      <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 0 }}>
        Marque a data dos investimentos que você já tinha e cadastrou de uma vez. Eles continuam na carteira e no patrimônio, mas não contam como aporte do mês, não aparecem como pico nos gráficos e não saem do saldo em caixa.
      </p>
      {groups.length === 0 ? <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>Não há investimentos lançados.</p> : shown.map((g) => {
        const on = g.marked > 0;
        return (
          <div key={g.date} className="posicao-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{fmtDatePt(g.date)}{on && <span className="badge badge-paid" style={{ cursor: "default", marginLeft: 8 }}>Posição inicial</span>}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{g.count} {g.count === 1 ? "lançamento" : "lançamentos"} · {fmtBRL(g.total)}</div>
            </div>
            <button className={on ? "btn btn-ghost" : "btn btn-primary"} style={{ flexShrink: 0 }} onClick={() => onToggle(g.date, !on)}>{on ? "Desmarcar" : "Marcar"}</button>
          </div>
        );
      })}
      {groups.length > 5 && <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setShowAll((v) => !v)}>{showAll ? "Mostrar menos" : `Ver todas as ${groups.length} datas`}</button>}
    </div>
  );
}

// ---- Lembretes: aviso no celular um dia antes de uma despesa vencer ou de um pagamento cair ----
const LEMBRETES_CACHE = "mediplan-lembretes", LEMBRETES_TAG = "mediplan-lembretes";
const notifSuporte = () => typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
const swReady = () => new Promise((res) => {
  if (!("serviceWorker" in navigator)) return res(null);
  let fim = false; const t = setTimeout(() => { if (!fim) { fim = true; res(null); } }, 3000);
  navigator.serviceWorker.ready.then((r) => { if (!fim) { fim = true; clearTimeout(t); res(r); } }).catch(() => { if (!fim) { fim = true; clearTimeout(t); res(null); } });
});
// Guarda a lista no aparelho (fora da nuvem) para o serviço em segundo plano consultar, e pede uma conferência agora
async function syncLembretes(on, items) {
  try {
    if (typeof caches === "undefined") return;
    const c = await caches.open(LEMBRETES_CACHE);
    await c.put("./__lembretes.json", new Response(JSON.stringify({ on: !!on, at: Date.now(), items: on ? items : [] }), { headers: { "Content-Type": "application/json" } }));
    const reg = await swReady();
    if (!reg) return;
    if (!on) { if (reg.periodicSync) { try { await reg.periodicSync.unregister(LEMBRETES_TAG); } catch (e) {} } return; }
    if (reg.active) reg.active.postMessage({ type: LEMBRETES_TAG });
    if (reg.periodicSync) { try { await reg.periodicSync.register(LEMBRETES_TAG, { minInterval: 6 * 3600 * 1000 }); } catch (e) {} }
  } catch (e) {}
}
async function notifTeste() {
  const titulo = "Mediplan: lembretes ativados", opts = { body: "É assim que o aviso aparece, um dia antes de cada vencimento e de cada pagamento.", icon: "icon-192.png", badge: "icon-192.png", tag: "mediplan-teste" };
  try { const reg = await swReady(); if (reg && reg.showNotification) { await reg.showNotification(titulo, opts); return true; } } catch (e) {}
  try { new Notification(titulo, opts); return true; } catch (e) { return false; }
}

function LembretesCard({ on, setOn, itens }) {
  const sup = notifSuporte();
  const [perm, setPerm] = useState(sup ? Notification.permission : "unsupported");
  const [msg, setMsg] = useState("");
  const ativo = on && perm === "granted";
  const ativar = async () => {
    setMsg("");
    let p = Notification.permission;
    if (p === "default") { try { p = await Notification.requestPermission(); } catch (e) { p = Notification.permission; } }
    setPerm(p);
    if (p !== "granted") { setMsg("O celular bloqueou os avisos deste app. Para liberar, toque no cadeado ao lado do endereço do site, depois em Permissões e Notificações."); return; }
    setOn(true);
    const okT = await notifTeste();
    setMsg(okT ? "Pronto. Enviei um aviso de teste agora." : "Lembretes ligados, mas o aviso de teste não saiu neste navegador.");
  };
  const testar = async () => { const okT = await notifTeste(); setMsg(okT ? "Aviso de teste enviado." : "O aviso de teste não saiu neste navegador."); };
  const prox = itens.slice(0, 5);
  return (
    <div className="day-panel" id="lembretes-card">
      <div className="day-panel-title"><span>Lembretes no celular</span>{ativo && <span className="lb-on">ligados</span>}</div>
      <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 0 }}>
        Um aviso um dia antes do vencimento de cada despesa e um dia antes de cada pagamento que você vai receber (salário, plantão e outras entradas).
      </p>
      {!sup ? (
        <div className="note-info" style={{ marginBottom: 0 }}>Este navegador não permite avisos. No iPhone, adicione o Mediplan à Tela de Início e abra por lá. No Android, use o Chrome.</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!ativo ? <button className="btn btn-primary" id="lb-ativar" onClick={ativar}><IconBell size={15} /> Ativar lembretes</button> : (
              <>
                <button className="btn btn-ghost" id="lb-testar" onClick={testar}><IconBell size={15} /> Enviar aviso de teste</button>
                <button className="btn btn-ghost" id="lb-desativar" onClick={() => { setOn(false); setMsg("Lembretes desligados neste aparelho."); }}>Desativar</button>
              </>
            )}
          </div>
          {msg && <div className="field-hint" id="lb-msg" style={{ marginTop: 10 }}>{msg}</div>}
          {ativo && (
            <div className="lb-list" id="lb-list">
              <b>Próximos avisos (chegam um dia antes da data)</b>
              {prox.length === 0 && <span>Nada a pagar ou a receber nos próximos 40 dias.</span>}
              {prox.map((i) => <span key={i.key + i.date}><i className={i.tipo === "despesa" ? "out" : "in"} />{fmtDatePt(i.date).slice(0, 5)} · {i.tipo === "despesa" ? "vence" : "cai"} {i.nome} · {fmtBRL(i.valor)}</span>)}
              {itens.length > prox.length && <span>e mais {itens.length - prox.length}.</span>}
            </div>
          )}
          <div className="field-hint" style={{ marginTop: 10 }}>
            Vale para este aparelho. Para o aviso chegar com o app fechado, use o Chrome no Android com o Mediplan instalado na tela inicial. Quem decide a hora de conferir é o celular, então o aviso pode atrasar. Sempre que você abre o app, ele confere na hora.
          </div>
        </>
      )}
    </div>
  );
}

// botão de olho: esconde ou mostra os valores (é o mesmo modo discreto)
function EyeBtn({ on, toggle }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
      <button type="button" className="btn btn-ghost sm" onClick={toggle} aria-pressed={on} aria-label={on ? "Mostrar valores" : "Ocultar valores"} title={on ? "Mostrar valores" : "Ocultar valores"}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />{on && <line x1="3" y1="3" x2="21" y2="21" />}
        </svg>
        {on ? " Mostrar valores" : " Ocultar valores"}
      </button>
    </div>
  );
}

// digital / rosto do aparelho (WebAuthn). É uma confirmação local: o app só verifica que a pessoa passou pelo sensor.
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => { const t = s.replace(/-/g, "+").replace(/_/g, "/"); const bin = atob(t + "===".slice((t.length + 3) % 4)); return Uint8Array.from(bin, (c) => c.charCodeAt(0)); };
async function bioDisponivel() {
  try { return !!(window.PublicKeyCredential && navigator.credentials && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())); } catch (e) { return false; }
}
async function bioCadastrar() {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: "Mediplan" },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "mediplan", displayName: "Mediplan" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" }, timeout: 60000 } });
  return b64u(cred.rawId);
}
async function bioConfirmar(id) {
  try {
    const c = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: "public-key", id: unb64u(id) }], userVerification: "required", timeout: 60000 } });
    return !!c;
  } catch (e) { return false; }
}

async function hashPin(p) {
  try {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("mediplan:" + p));
    return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
  } catch (e) { return "p:" + p; }
}

function PinGate({ hash, bioId, onOk, onForget }) {
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState("");
  const usarDigital = async () => { if (await bioConfirmar(bioId)) onOk(); else setErro("Não reconheci a digital. Use o código."); };
  useEffect(() => { if (bioId) usarDigital(); }, []);
  const tentar = async () => {
    if ((await hashPin(pin)) === hash) onOk();
    else { setErro("Código errado."); setPin(""); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg, #f5f5f5)", display: "grid", placeItems: "center", padding: 16, zIndex: 1000 }}>
      <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
        <h2 style={{ margin: "0 0 6px" }}>Mediplan bloqueado</h2>
        <p style={{ margin: "0 0 16px", color: "var(--text-dim)" }}>Digite seu código de 4 números.</p>
        <input type="password" inputMode="numeric" autoComplete="off" maxLength={4} aria-label="Código" value={pin} autoFocus
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setErro(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" && pin.length === 4) tentar(); }}
          style={{ fontSize: 24, textAlign: "center", letterSpacing: 8, width: "100%", padding: 10 }} />
        {erro && <div className="note-bad" style={{ marginTop: 10 }}>{erro}</div>}
        <button className="btn btn-primary" style={{ marginTop: 14, width: "100%" }} disabled={pin.length !== 4} onClick={tentar}>Entrar</button>
        {bioId && <button className="btn btn-ghost" style={{ marginTop: 10, width: "100%" }} onClick={usarDigital}>Usar digital ou rosto</button>}
        <div style={{ marginTop: 14 }}><button className="link-btn" onClick={onForget}>Esqueci o código</button></div>
      </div>
    </div>
  );
}

// ---- Organização financeira (modelo "caminho do dinheiro"): entra − contas − investido = livre para gastos extras ----
function OrganizacaoTab({ viewYear, viewMonth, incomeItems, expenseItems, invItems, goTab }) {
  const gv = useGv();
  const [prev, setPrevState] = useState(() => lsGet("mediplan-org-previstos") !== "0");
  const setPrev = (v) => { lsSet("mediplan-org-previstos", v ? "1" : "0"); setPrevState(v); };
  const [verTudo, setVerTudo] = useState({});
  const N = new Date(viewYear, viewMonth + 1, 0).getDate();
  const agora = new Date();
  const rel = viewYear * 12 + viewMonth - (agora.getFullYear() * 12 + agora.getMonth());
  const hojeIso = todayStr();
  const soma = (l, f) => l.reduce((a, x) => a + (Number(f(x)) || 0), 0);
  const recebido = soma(incomeItems.filter((i) => i.recebido), (i) => i.net);
  const aReceber = soma(incomeItems.filter((i) => !i.recebido), (i) => i.net);
  const pagas = soma(expenseItems.filter((e) => e.paid), (e) => e.amount);
  const aPagar = soma(expenseItems.filter((e) => !e.paid), (e) => e.amount);
  const investido = soma(invItems, (i) => i.amount);
  const nAportes = invItems.filter((i) => Number(i.amount) > 0).length;
  const entra = recebido + (prev ? aReceber : 0);
  const contas = pagas + (prev ? aPagar : 0);
  const livre = entra - contas - investido;
  const base = Math.max(entra, contas + Math.max(0, investido), 1);
  const pct = (v) => `${Math.max(0, Math.min(100, (v / base) * 100))}%`;
  const mes = MONTHS_PT[viewMonth].toLowerCase(), abr = (MONTHS_ABBR_PT[viewMonth] || "").toLowerCase();
  const diasRest = rel === 0 ? N - agora.getDate() + 1 : 0;
  const diaBox = (iso) => <time><b>{Number(String(iso).slice(8, 10))}</b>{(MONTHS_ABBR_PT[Number(String(iso).slice(5, 7)) - 1] || "").toLowerCase()}</time>;
  const subRec = (it) => it.tipo === "plantao" ? (String(it.dateLabel || "").startsWith("plantão ") ? "plantão de " + String(it.dateLabel).slice(8, 13) : "plantão") : it.tipo === "mensal" ? "cargo fixo" : it.tipo === "extra" ? "renda recorrente" : "entrada avulsa";
  const subPag = (iso) => {
    const d = Math.round((new Date(iso + "T12:00:00") - new Date(hojeIso + "T12:00:00")) / 86400000);
    if (d < -1) return { t: `atrasada há ${-d} dias`, late: true };
    if (d === -1) return { t: "venceu ontem", late: true };
    if (d === 0) return { t: "vence hoje", late: true };
    if (d === 1) return { t: "vence amanhã" };
    return { t: `vence em ${d} dias` };
  };
  const vaiCair = incomeItems.filter((i) => !i.recebido).sort((a, b) => String(a.dateIso).localeCompare(String(b.dateIso)));
  const vaiSair = expenseItems.filter((e) => !e.paid).sort((a, b) => String(a.dateIso).localeCompare(String(b.dateIso)));
  const lista = (id, itens, render, vazio, aba, txtAba) => {
    const max = verTudo[id] ? itens.length : 5;
    return (
      <>
        {itens.length === 0 && <div className="oa-vazio">{vazio}</div>}
        {itens.slice(0, max).map(render)}
        {itens.length > 5 && <button type="button" className="oa-mais" onClick={() => setVerTudo((p) => ({ ...p, [id]: !p[id] }))}>{verTudo[id] ? "Mostrar menos" : `Mostrar mais ${itens.length - 5}`}</button>}
        <button type="button" className="oa-ir" onClick={() => goTab(aba)}>{txtAba}</button>
      </>
    );
  };
  return (
    <div className="oa">
      <div className="oa-chips" role="group" aria-label="O que entra na conta">
        <button type="button" className={!prev ? "on" : ""} aria-pressed={!prev} onClick={() => setPrev(false)}>Só o que já aconteceu</button>
        <button type="button" className={prev ? "on" : ""} aria-pressed={prev} onClick={() => setPrev(true)}>Mês completo</button>
      </div>

      <div className="card oa-flow">
        <h3 className="oa-h">O caminho do dinheiro em {mes}</h3>
        <div className="oa-st">
          <span className="oa-lb">Entra no mês<small>{fmtBRL(recebido)} já caiu{prev ? ` · ${fmtBRL(aReceber)} ainda vai cair` : ""}</small></span>
          <b className="oa-v in mono">{fmtBRL(entra)}</b>
          <div className="oa-bar"><i className="in" style={{ width: pct(recebido) }} />{prev && <i className="in2" style={{ width: pct(aReceber) }} />}</div>
        </div>
        <div className="oa-st">
          <span className="oa-lb">Contas do mês<small>{fmtBRL(pagas)} pagas{prev ? ` · ${fmtBRL(aPagar)} a pagar` : ""}</small></span>
          <b className="oa-v out mono">− {fmtBRL(contas)}</b>
          <div className="oa-bar"><i className="out" style={{ width: pct(pagas) }} />{prev && <i className="out2" style={{ width: pct(aPagar) }} />}</div>
        </div>
        <div className="oa-st">
          <span className="oa-lb">Investido<small>{nAportes === 0 ? "nenhum aporte neste mês" : nAportes === 1 ? "1 aporte neste mês" : `${nAportes} aportes neste mês`}</small></span>
          <b className="oa-v inv mono">− {fmtBRL(Math.max(0, investido))}</b>
          <div className="oa-bar"><i className="inv" style={{ width: pct(Math.max(0, investido)) }} /></div>
        </div>
        <div className={`oa-res ${livre < 0 ? "neg" : ""}`}>
          <div className="oa-res-lb">{prev ? (livre >= 0 ? "Livre para gastos extras" : "Falta para fechar o mês") : (livre >= 0 ? "Sobrou até agora" : "Saiu mais do que entrou")}</div>
          <div className="oa-res-v mono">{fmtBRL(Math.abs(livre))}</div>
          <div className="oa-res-sub">
            {!prev && <>{livre >= 0 ? "Contando só o que já caiu e o que já foi pago." : "Até agora, as contas pagas e os investimentos passaram o que já caiu."}</>}
            {prev && rel === 0 && livre > 0 && diasRest > 0 && <>Dá cerca de <b>{fmtBRL(livre / diasRest)} por dia</b> {diasRest === 1 ? "hoje" : `nos ${diasRest} dias que faltam`}.</>}
            {prev && rel === 0 && livre < 0 && <>As contas e os investimentos do mês passam o que entra.</>}
            {prev && rel < 0 && (livre >= 0 ? <>Foi o que sobrou em {mes}.</> : <>Em {mes}, as saídas passaram as entradas.</>)}
            {prev && rel > 0 && <>Previsão com o que já está lançado para {mes}.</>}
            {!prev && (aReceber > 0 || aPagar > 0) && <> Sem contar {fmtBRL(aReceber)} a receber e {fmtBRL(aPagar)} a pagar.</>}
          </div>
        </div>
      </div>

      <div className="card oa-list">
        <h3 className="oa-h">Ainda vai cair</h3>
        {lista("cair", vaiCair, (it) => (
          <div key={it.key} className="oa-li">
            {diaBox(it.dateIso)}
            <span className="oa-li-n"><b>{it.nome}</b><small>{subRec(it)}</small></span>
            <span className="oa-li-r"><b className="in mono">{fmtBRL(it.net)}</b>{typeof it.toggle === "function" && <button type="button" onClick={it.toggle}>Recebi</button>}</span>
          </div>
        ), `Tudo o que estava previsto para ${mes} já caiu.`, "faturamento", "Ver todas as receitas")}
      </div>

      <div className="card oa-list">
        <h3 className="oa-h">Ainda vai sair</h3>
        {lista("sair", vaiSair, (it) => { const s = subPag(it.dateIso); return (
          <div key={it.key} className="oa-li">
            {diaBox(it.dateIso)}
            <span className="oa-li-n"><b>{it.description}</b><small className={s.late ? "late" : ""}>{s.t}</small></span>
            <span className="oa-li-r"><b className="mono">{fmtBRL(it.amount)}</b>{typeof it.toggle === "function" && <button type="button" onClick={it.toggle}>Paguei</button>}</span>
          </div>
        ); }, `Nenhuma conta em aberto em ${mes}.`, "despesas", "Ver todas as contas")}
      </div>
    </div>
  );
}

function ThemeCard({ tema, setTema }) {
  return (
    <div className="day-panel">
      <div className="day-panel-title"><span>Aparência</span></div>
      <div className="chip-row" role="group" aria-label="Tema">
        {[["claro", "Claro"], ["escuro", "Escuro"], ["auto", "Igual ao celular"]].map(([k, l]) => (
          <button key={k} type="button" data-tema={k} className={`chip sm ${tema === k ? "active" : ""}`} aria-pressed={tema === k} onClick={() => setTema(k)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function PrivacyCard({ discreto, setDiscreto, pinOn, onSetPin, onRemovePin, bioId, onSetBio }) {
  const [novo, setNovo] = useState("");
  const [conf, setConf] = useState("");
  const [erro, setErro] = useState("");
  const [bioOk, setBioOk] = useState(false);
  useEffect(() => { bioDisponivel().then(setBioOk); }, []);
  const ativarBio = async () => {
    try { onSetBio(await bioCadastrar()); setErro(""); } catch (e) { setErro("Não consegui ativar a digital neste aparelho."); }
  };
  const ativar = async () => {
    if (!/^\d{4}$/.test(novo)) { setErro("Use 4 números."); return; }
    if (novo !== conf) { setErro("Os dois códigos não batem."); return; }
    onSetPin(await hashPin(novo)); setNovo(""); setConf(""); setErro("");
  };
  return (
    <div className="day-panel">
      <div className="day-panel-title"><span>Privacidade</span></div>
      <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 0 }}>Modo discreto: esconde todos os valores em reais deste aparelho, para você mostrar a tela sem expor o saldo.</p>
      <button className="btn btn-ghost sm" onClick={() => setDiscreto(!discreto)}>{discreto ? "Desligar modo discreto" : "Ligar modo discreto"}</button>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "16px 0 8px" }}>Trava com código: pede os 4 números ao abrir o app e depois de ficar fora dele por mais de 1 minuto. É uma proteção de tela neste aparelho, não substitui o bloqueio do celular.</p>
      {pinOn ? (
        <>
          <div className="field-hint" style={{ marginBottom: 8 }}>Trava ativa neste aparelho.</div>
          {bioOk && (bioId ? (
            <div style={{ marginBottom: 10 }}><div className="field-hint" style={{ marginBottom: 6 }}>Digital ou rosto ligado: você pode usar no lugar do código.</div><button className="btn btn-ghost sm" onClick={() => onSetBio("")}>Desligar digital</button></div>
          ) : (
            <div style={{ marginBottom: 10 }}><button className="btn btn-ghost sm" onClick={ativarBio}>Usar digital ou rosto</button></div>
          ))}
          {erro && <div className="note-bad" style={{ marginBottom: 8 }}>{erro}</div>}
          <button className="btn btn-ghost sm" onClick={onRemovePin}>Remover trava</button>
        </>
      ) : (
        <>
          <div className="field"><label htmlFor="pin-novo">Código de 4 números</label><input id="pin-novo" type="password" inputMode="numeric" maxLength={4} value={novo} onChange={(e) => { setNovo(e.target.value.replace(/\D/g, "").slice(0, 4)); setErro(""); }} autoComplete="off" /></div>
          <div className="field"><label htmlFor="pin-conf">Repita o código</label><input id="pin-conf" type="password" inputMode="numeric" maxLength={4} value={conf} onChange={(e) => { setConf(e.target.value.replace(/\D/g, "").slice(0, 4)); setErro(""); }} autoComplete="off" /></div>
          {erro && <div className="note-bad" style={{ marginBottom: 8 }}>{erro}</div>}
          <button className="btn btn-ghost sm" onClick={ativar}>Ativar trava</button>
        </>
      )}
    </div>
  );
}

function BackupTab({ contabAba = true, setContabAba, taxRateGeral, setTaxRateGeral, downloadBackup, fileInputRef, handleImportFile, saveError, cloudCard, wipeCard, posicaoCard, contabAuto, notifCard, privacyCard, themeCard, goTab, conta, cloudLabel, resumo = {} }) {
  const [sec, setSec] = useState(null);
  const taxa = (
    <div className="day-panel" style={{ marginTop: 0 }}>
      <div className="day-panel-title"><span>Imposto padrão</span></div>
      <div className="tax-box" style={{ marginBottom: 0 }}>
        <span className="tax-box-label">Tributação geral (usada quando um vínculo não tem taxa própria)</span>
        <input id="cfg-tax" type="number" value={taxRateGeral} onChange={(e) => setTaxRateGeral(e.target.value)} step="0.1" disabled={!!contabAuto} />
        <span className="tax-box-label">%</span>
      </div>
      {contabAuto && <div className="field-hint">Calculada pela aba Contabilidade. Para digitar uma porcentagem, escolha “Porcentagem fixa” lá.</div>}
    </div>
  );
  const backup = (
    <div className="day-panel" style={{ marginTop: 0 }}>
      <div className="day-panel-title"><span>Backup dos dados</span></div>
      <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 0 }}>
        Baixe uma cópia dos seus dados de vez em quando. Ela serve para restaurar tudo se algo der errado, mesmo usando a nuvem.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={downloadBackup}><IconDownload size={15} /> Baixar backup (.json)</button>
        <button className="btn btn-ghost" onClick={() => fileInputRef.current.click()}><IconUpload size={15} /> Importar backup</button>
        <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => handleImportFile(e.target.files[0])} />
      </div>
      {saveError && <div style={{ color: "var(--brick)", marginTop: 10, fontSize: 13 }}>Não foi possível salvar as últimas alterações neste navegador.</div>}
    </div>
  );
  const abaContab = (
    <div className="day-panel" style={{ marginTop: 0 }}>
      <div className="day-panel-title"><span>Aba Contabilidade</span></div>
      <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 0 }}>A aba é opcional. Ela mostra a agenda de impostos, a caixinha do imposto, as notas emitidas e a estimativa do imposto de renda. Quem não tem empresa ou deixa tudo com o contador pode escondê-la.</p>
      <button type="button" className={`btn ${contabAba ? "btn-ghost" : "btn-primary"}`} id="cfg-contab-aba" onClick={() => setContabAba && setContabAba(!contabAba)}>{contabAba ? "Esconder a aba" : "Mostrar a aba"}</button>
      <div className="field-hint">A tributação padrão continua em “Imposto padrão”, mesmo com a aba escondida.</div>
    </div>
  );
  const SECS = { contababa: abaContab, nuvem: cloudCard, aparencia: themeCard, privacidade: privacyCard, lembretes: notifCard, imposto: taxa, carteira: posicaoCard, backup, apagar: wipeCard };
  if (sec) return (
    <div className="cfg-sub">
      <button type="button" className="cfg-back" onClick={() => setSec(null)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg> Configurações</button>
      {SECS[sec]}
    </div>
  );
  const ic = (d) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
  const row = (id, cor, icon, label, sub, onClick) => (
    <button type="button" key={id} className="cfg-row" data-cfg={id} onClick={onClick || (() => setSec(id))}>
      <i style={{ background: cor }}>{icon}</i>
      <span className="cfg-txt"><b>{label}</b>{sub ? <small>{sub}</small> : null}</span>
      <svg className="cfg-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18" /></svg>
    </button>
  );
  const temaTxt = { claro: "Claro", escuro: "Escuro", auto: "Igual ao celular" }[resumo.tema] || "Claro";
  return (
    <div className="cfg">
      <div className="cfg-head">
        <div className="cfg-av" aria-hidden="true">{conta ? conta.slice(0, 1).toUpperCase() : ic(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>)}</div>
        <h2>{conta || "Sem conta neste aparelho"}</h2>
        <span className="cfg-chip">{cloudLabel}</span>
        {saveError && <div className="note-bad" style={{ marginTop: 10 }}>Não foi possível salvar as últimas alterações neste navegador.</div>}
      </div>
      <div className="cfg-group">
        {row("nuvem", "#3B82F6", ic(<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8.5 4.8 4.8 0 0 1 17.5 18Z" />), "Nuvem e conta", conta ? "Entrar, sair e sincronizar" : "Criar conta ou entrar")}
        {row("aparencia", "#7C5CFC", ic(<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />), "Aparência", temaTxt)}
        {row("privacidade", "#64748B", ic(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>), "Privacidade e trava", (resumo.discreto ? "Valores escondidos" : "Valores à mostra") + (resumo.pinOn ? ", trava ligada" : ", sem trava"))}
        {row("lembretes", "#F59E0B", ic(<><path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7" /><path d="M10 20a2 2 0 0 0 4 0" /></>), "Lembretes no celular", resumo.notifOn ? "Ligados" : "Desligados")}
      </div>
      <div className="cfg-group">
        {row("contababa", "#0F766E", ic(<><rect x="5" y="3" width="14" height="18" rx="2" /><line x1="8.5" y1="8" x2="15.5" y2="8" /><line x1="8.5" y1="13" x2="15.5" y2="13" /></>), "Aba Contabilidade", contabAba ? "Aparecendo" : "Escondida")}
        {row("imposto", "#14B8A6", ic(<><line x1="19" y1="5" x2="5" y2="19" /><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /></>), "Imposto padrão", contabAuto ? "Calculado pela Contabilidade" : (Number(taxRateGeral) || 0).toLocaleString("pt-BR") + "%")}
        {row("carteira", "#22C55E", ic(<><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></>), "Posição inicial da carteira", "O que você já tinha investido")}
        {row("backup", "#3B82F6", ic(<><path d="M12 4v11" /><polyline points="7 10 12 15 17 10" /><path d="M5 20h14" /></>), "Backup dos dados", "Baixar ou restaurar uma cópia")}
        {row("apagar", "#EF4444", ic(<><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>), "Apagar dados", "Limpar lançamentos deste aparelho")}
      </div>
      {goTab && (
        <div className="cfg-group">
          {row("ir-metas", "#F59E0B", ic(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>), "Metas", null, () => goTab("metas"))}
          {row("ir-relatorios", "#7C5CFC", ic(<><path d="M12 3a9 9 0 1 0 9 9h-9Z" /><path d="M15 3.5A9 9 0 0 1 20.5 9H15Z" /></>), "Relatórios", null, () => goTab("visao"))}
          {contabAba && row("ir-contabilidade", "#14B8A6", ic(<><rect x="5" y="3" width="14" height="18" rx="2" /><line x1="8.5" y1="8" x2="15.5" y2="8" /><line x1="8.5" y1="13" x2="15.5" y2="13" /><line x1="8.5" y1="17" x2="12" y2="17" /></>), "Contabilidade", null, () => goTab("contabilidade"))}
          {row("ir-importar", "#64748B", ic(<><path d="M12 15V4" /><polyline points="7 9 12 4 17 9" /><path d="M5 20h14" /></>), "Importar extrato, fatura ou nota", null, () => goTab("importar"))}
        </div>
      )}
    </div>
  );
}


// ================= Contabilidade (aba opcional): agenda de impostos, caixinha, notas e o ano =================
function baixarCsv(nome, linhas) {
  const esc = (v) => { const t = String(v === undefined || v === null ? "" : v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const num = (v) => (typeof v === "number" ? v.toFixed(2).replace(".", ",") : v);
  const csv = "﻿" + linhas.map((l) => l.map((c) => esc(num(c))).join(";")).join("\n");
  try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (e) {}
}
function ContabTab({ contab, setContab, app, taxRateGeral, setTaxRateGeral, desk, viewYear, viewMonth, monthIncomeItems = [], prevIncomeItems = [], yearIncomeItems = [], yearExpenseItems = [], pagarGuia, desfazerGuia }) {
  const set = (k, v) => setContab((p) => ({ ...p, [k]: v }));
  const mk = monthKeyOf(viewYear, viewMonth);
  const mes = MONTHS_PT[viewMonth].toLowerCase(), mesAnt = MONTHS_PT[(viewMonth + 11) % 12].toLowerCase();
  const hoje = todayStr();
  const boleto = contab.pagamento === "boleto";
  // agenda
  const prevPJ = prevIncomeItems.filter((i) => i.forma === "pj");
  const prevGross = prevPJ.reduce((a, i) => a + (Number(i.gross) || 0), 0);
  const prevTax = prevPJ.reduce((a, i) => a + Math.max(0, (Number(i.gross) || 0) - (Number(i.net) || 0)), 0);
  const prevPFtax = prevIncomeItems.filter((i) => i.forma === "aluguel").reduce((a, i) => a + Math.max(0, (Number(i.gross) || 0) - (Number(i.net) || 0)), 0);
  const guias = contabGuias(contab, viewYear, viewMonth, prevGross, prevTax);
  if (prevPFtax > 0.004) { const dUlt = new Date(viewYear, viewMonth + 1, 0).getDate(); guias.push({ id: "carneleao", nome: "Carnê-leão do aluguel", dia: dUlt, data: dateStr(viewYear, viewMonth, dUlt), valor: prevPFtax, sub: "imposto do aluguel recebido no mês anterior, pago no site da Receita", estimado: true }); }
  const pagos = (contab.pagos && contab.pagos[mk]) || {};
  const totGuias = guias.reduce((a, g) => a + g.valor, 0);
  const totPago = guias.filter((g) => pagos[g.id]).reduce((a, g) => a + g.valor, 0);
  // caixinha: a parte de imposto de cada recebimento
  const recebidos = monthIncomeItems.filter((i) => (i.forma === "pj" || i.forma === "aluguel") && i.recebido && (Number(i.gross) || 0) - (Number(i.net) || 0) > 0.004);
  const sep = contab.separado || {};
  const alvo = recebidos.reduce((a, i) => a + (i.gross - i.net), 0);
  const guardado = recebidos.filter((i) => sep[i.key]).reduce((a, i) => a + (i.gross - i.net), 0);
  const pctCx = alvo > 0 ? Math.round((guardado / alvo) * 100) : 0;
  const gruposCx = Object.values(recebidos.reduce((acc, i) => { const g = acc[i.nome] || (acc[i.nome] = { nome: i.nome, keys: [], imp: 0, bruto: 0, n: 0, ult: "" }); g.keys.push(i.key); g.imp += i.gross - i.net; g.bruto += i.gross; g.n += 1; if (i.dateIso > g.ult) g.ult = i.dateIso; return acc; }, {}));
  const grupoSep = (g) => g.keys.every((k) => sep[k]);
  const toggleGrupo = (g) => { const v = !grupoSep(g); setContab((p) => { const n = { ...(p.separado || {}) }; g.keys.forEach((k) => { n[k] = v; }); return { ...p, separado: n }; }); };
  // notas por tomador
  const notasMap = contab.notas || {};
  const semNotaPorForma = monthIncomeItems.filter((i) => i.forma === "socio" || i.forma === "clt");
  const tomadores = Object.values(monthIncomeItems.filter((i) => i.forma === "pj").reduce((acc, i) => {
    const k = i.nome || "Outros"; const t = acc[k] || (acc[k] = { nome: k, cor: i.cor, bruto: 0, n: 0, pend: 0, atras: false, data: null });
    t.bruto += Number(i.gross) || 0; t.n += 1;
    if (!i.recebido) { t.pend += 1; if (i.dateIso < hoje) t.atras = true; if (!t.data || i.dateIso < t.data) t.data = i.dateIso; }
    return acc;
  }, {})).sort((a, b) => b.bruto - a.bruto);
  const notaKey = (n) => mk + "|" + n;
  const toggleNota = (n) => setContab((p) => ({ ...p, notas: { ...(p.notas || {}), [notaKey(n)]: !(p.notas || {})[notaKey(n)] } }));
  const semPag = tomadores.filter((t) => notasMap[notaKey(t.nome)] && t.pend > 0);
  const semNota = tomadores.filter((t) => !notasMap[notaKey(t.nome)]);
  // o ano
  const ir = contab.ir || {};
  const setIr = (k, v) => setContab((p) => ({ ...p, ir: { ...(p.ir || {}), [k]: v } }));
  const pl = numOf(contab.proLabore);
  const calcPl = contab.modo === "contab" && pl > 0 ? (contab.regime === "presumido" ? calcPresumido(contabParams(contab, numOf(contab.receitaMes) || app.mesBruto || 0)) : calcSimples(contabParams(contab, numOf(contab.receitaMes) || app.mesBruto || 0))) : null;
  const vItem = (id) => (calcPl ? (calcPl.itens.find((i) => i.id === id) || { valor: 0 }).valor : 0);
  const anoNaoPJ = yearIncomeItems.filter((i) => i.forma === "clt" || i.forma === "aluguel");
  const anoIsento = yearIncomeItems.filter((i) => i.forma === "socio" || i.forma === "div");
  const anoClt = yearIncomeItems.filter((i) => i.forma === "clt");
  const somaG = (l) => l.reduce((a, i) => a + (Number(i.gross) || 0), 0), somaT = (l) => l.reduce((a, i) => a + Math.max(0, (Number(i.gross) || 0) - (Number(i.net) || 0)), 0);
  const sug = { rend: pl * 12 + somaG(anoNaoPJ), inss: vItem("inss") * 12, retido: vItem("irrf") * 12 + somaT(anoClt) };
  const val = (k) => (ir[k] === undefined || ir[k] === "" || ir[k] === null ? sug[k] || 0 : numOf(ir[k]));
  const dedAno = yearExpenseItems.filter(ehDedutivel);
  const somaCat = (c) => dedAno.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0);
  const dep = Math.max(0, Math.round(numOf(ir.dependentes)));
  const rend = val("rend");
  const saude = somaCat("saude"), educ = Math.min(somaCat("educacao"), IR_EDU_LIMITE * (1 + dep));
  const pgbl = Math.min(numOf(ir.pgbl), rend * 0.12);
  const deducoes = val("inss") + saude + educ + dep * IR_DEP_ANUAL + pgbl;
  const irr = irAnual(rend, deducoes);
  const retido = val("retido");
  const saldoIr = retido - irr.devido;
  const outrosDed = dedAno.filter((e) => !["saude", "educacao"].includes(e.category));
  const porCat = Object.values(dedAno.reduce((m, e) => { const c = EXP_CAT_MAP[e.category] || EXP_CAT_MAP.outros; (m[c.id] = m[c.id] || { nome: c.label, cor: c.color, v: 0, n: 0 }).v += e.amount; m[c.id].n += 1; return m; }, {})).sort((a, b) => b.v - a.v);
  // relatório
  const relatorio = (ano) => {
    const inc = ano ? yearIncomeItems : monthIncomeItems, exps = ano ? dedAno : yearExpenseItems.filter((e) => e.dateIso && e.dateIso.slice(0, 7) === mk && ehDedutivel(e));
    const L = [["Mediplan · relatório para o contador", ano ? "ano de " + viewYear : mes + " de " + viewYear], [], ["RECEITAS"], ["Data", "Tomador", "Valor bruto", "Imposto estimado", "Líquido", "Recebido", "Nota emitida"]];
    inc.forEach((i) => L.push([fmtDatePt(i.dateIso), i.nome, Number(i.gross) || 0, (Number(i.gross) || 0) - (Number(i.net) || 0), Number(i.net) || 0, i.recebido ? "sim" : "não", notasMap[(i.dateIso || "").slice(0, 7) + "|" + i.nome] ? "sim" : "não"]));
    L.push([], ["Total bruto", "", inc.reduce((a, i) => a + (Number(i.gross) || 0), 0)]);
    if (!ano) { L.push([], ["GUIAS DO MÊS"], ["Guia", "Vencimento", "Valor", "Pago"]); guias.forEach((g) => L.push([g.nome, fmtDatePt(g.data), g.valor, pagos[g.id] ? "sim" : "não"])); }
    L.push([], ["DESPESAS DEDUTÍVEIS"], ["Data", "Descrição", "Categoria", "Valor"]);
    exps.forEach((e) => L.push([fmtDatePt(e.dateIso), e.description, (EXP_CAT_MAP[e.category] || EXP_CAT_MAP.outros).label, e.amount]));
    baixarCsv(`mediplan-contador-${ano ? viewYear : mk}.csv`, L);
  };
  const tag = (t, c) => <span className={`ctg ${c}`}>{t}</span>;
  const stGuia = (g) => pagos[g.id] ? tag("pago", "ok") : g.data < hoje ? tag("vencida", "bad") : g.data === hoje ? tag("vence hoje", "bad") : tag("a pagar", "warn");

  const kpis = (
    <div className={desk ? "dkpis" : "ct-kpis"}>
      <DKpi label={"Impostos de " + mes} value={fmtBRL(totGuias)} sub={guias.length ? `${guias.length} ${guias.length === 1 ? "guia" : "guias"} · ${guias.filter((g) => pagos[g.id]).length} paga(s)` : "nada a pagar"} />
      <DKpi label="Caixinha do imposto" value={fmtBRL(guardado)} sub={alvo - guardado > 0.004 ? "falta separar " + fmtBRL(alvo - guardado) : "tudo separado"} subTone={alvo - guardado > 0.004 ? "#B45309" : "#15803D"} />
      <DKpi label="Notas sem pagamento" value={String(semPag.length)} sub={semPag.length ? fmtBRL(semPag.reduce((a, t) => a + t.bruto, 0)) + " a receber" : semNota.length ? semNota.length + " sem nota marcada" : "tudo em dia"} subTone={semPag.some((t) => t.atras) ? "#B91C1C" : "#64748B"} />
      <DKpi label={"IR de " + viewYear + " (estimativa)"} value={rend > 0 ? (saldoIr >= 0 ? "+ " : "− ") + fmtBRL(Math.abs(saldoIr)) : "—"} tone={rend > 0 ? (saldoIr >= 0 ? "#15803D" : "#B91C1C") : null} sub={rend > 0 ? (saldoIr >= 0 ? "a restituir" : "a pagar") : "informe seus rendimentos"} />
    </div>
  );
  const GRUPOS = [
    ["pj", "Nota da minha empresa", "🧾", "#DBEAFE", (v) => "Imposto estimado: " + fmtBRL(v.imp) + ". As guias estão na agenda abaixo."],
    ["socio", "Pix de empresa em que sou sócio", "🤝", "#EDE9FE", () => "Nada a pagar. Entra como rendimento isento na declaração."],
    ["clt", "Carteira assinada", "📄", "#DCFCE7", () => "Nada a pagar. O imposto já vem descontado no holerite."],
    ["div", "Dividendos", "📈", "#FEF3C7", () => "Isentos. Não entram na conta de impostos."],
    ["aluguel", "Aluguel", "🏠", "#FCE7F3", (v) => "Carnê-leão estimado: " + fmtBRL(v.imp) + ", pago até o fim do mês seguinte."],
    ["outro", "Outras receitas", "💰", "#F1F5F9", () => "Processo, Pix devolvido e restituição não têm imposto a pagar."],
  ];
  const resumoFormas = GRUPOS.map(([k, nome, ic, bg, oque]) => {
    const l = monthIncomeItems.filter((i) => i.forma === k);
    if (!l.length) return null;
    const v = { tot: l.reduce((a, i) => a + (Number(i.gross) || 0), 0), imp: l.reduce((a, i) => a + Math.max(0, (Number(i.gross) || 0) - (Number(i.net) || 0)), 0) };
    return { k, nome, ic, bg, v, oque: oque(v), quem: [...new Set(l.map((i) => i.nome.split(" · ")[0]))].slice(0, 3).join(", ") };
  }).filter(Boolean);
  const quadro = (
    <div className="card" id="ct-formas">
      <div className="card-head"><h3 className="card-title">Seus recebimentos e os impostos</h3><span className="card-note">{mes}</span></div>
      {resumoFormas.length === 0 ? <div className="empty-state" style={{ padding: "12px 0" }}>Nenhuma receita em {mes}.</div> : resumoFormas.map((g) => (
        <div key={g.k} className="ct-fm" data-forma={g.k}>
          <i style={{ background: g.bg }} aria-hidden="true">{g.ic}</i>
          <span className="ct-l"><b>{g.nome}</b><small>{g.quem}</small></span>
          <b className="mono ct-v">{fmtBRL(g.v.tot)}</b>
          <div className="ct-fm-o">{g.oque}</div>
        </div>
      ))}
    </div>
  );
  const agenda = (
    <div className="card" id="ct-agenda">
      <div className="card-head"><h3 className="card-title">Agenda de impostos</h3><span className="card-note">{mes} · referente a {mesAnt}</span></div>
      <div className="ct-pag" role="group" aria-label="Como você paga os impostos">
        <button type="button" className={`chip sm ${!boleto ? "active" : ""}`} aria-pressed={!boleto} onClick={() => set("pagamento", "guias")}>Pago as guias</button>
        <button type="button" className={`chip sm ${boleto ? "active" : ""}`} aria-pressed={boleto} onClick={() => set("pagamento", "boleto")}>Boleto único do contador</button>
      </div>
      {boleto && (
        <div className="ct-bol">
          <div className="field"><label htmlFor="ct-bol-v">Valor do boleto (R$)</label><MoneyInput id="ct-bol-v" value={contab.boletoValor === undefined ? "" : contab.boletoValor} onChange={(v) => set("boletoValor", v)} placeholder="em branco: o app estima" /></div>
          <div className="field"><label htmlFor="ct-bol-d">Vence todo dia</label><input id="ct-bol-d" type="number" min="1" max="31" value={contab.boletoDia || 20} onChange={(e) => set("boletoDia", e.target.value)} /></div>
        </div>
      )}
      {guias.length === 0 ? <div className="empty-state" style={{ padding: "12px 0" }}>{prevGross > 0 ? "Nenhuma guia neste mês." : `Sem receitas em ${mesAnt}, então não há imposto a pagar em ${mes}.`}</div> : (
        <div className="ct-list">
          {guias.map((g) => (
            <div key={g.id} className={`ct-row ${pagos[g.id] ? "pago" : ""}`} data-guia={g.id}>
              <span className="ct-l"><b>{g.nome}</b>{stGuia(g)}<small>vence {fmtDatePt(g.data)}{g.sub ? " · " + g.sub : ""}</small></span>
              <b className="mono ct-v">{fmtBRL(g.valor)}</b>
              <button type="button" className={`btn ${pagos[g.id] ? "btn-ghost" : "btn-primary"} sm`} onClick={() => pagos[g.id] ? desfazerGuia(mk, g.id) : pagarGuia(mk, g)}>{pagos[g.id] ? "Desfazer" : "Marcar como pago"}</button>
            </div>
          ))}
        </div>
      )}
      <div className="field-hint">Ao marcar como pago, a guia entra em Despesas, em Impostos. {guias.some((g) => g.estimado) ? "Valores estimados: confira com o contador." : ""}</div>
    </div>
  );
  const caixinha = (
    <div className="card" id="ct-caixa">
      <div className="card-head"><h3 className="card-title">Caixinha do imposto</h3><span className="card-note">a parte do imposto de cada recebimento, menos CLT</span></div>
      {recebidos.length === 0 ? <div className="empty-state" style={{ padding: "12px 0" }}>Quando um pagamento cair, aparece aqui quanto dele é imposto para você separar.</div> : (<>
        <div className="ct-cx">
          <Ring pct={pctCx} size={86} stroke={9} color="#0F766E"><b style={{ fontSize: 15 }}>{pctCx}%</b></Ring>
          <div><b className="mono" style={{ fontSize: 20, display: "block" }}>{fmtBRL(guardado)} separados</b><span className="line-sub">de {fmtBRL(alvo)} de imposto dos recebimentos de {mes}</span>{alvo - guardado > 0.004 && <span style={{ display: "block", color: "#B45309", fontWeight: 600, fontSize: 13.5 }}>Falta separar {fmtBRL(alvo - guardado)}</span>}</div>
        </div>
        <div className="ct-list">
          {gruposCx.map((g) => { const ok = grupoSep(g); return (
            <label key={g.nome} className="ct-row ct-chk">
              <input type="checkbox" checked={ok} onChange={() => toggleGrupo(g)} />
              <span className="ct-l"><b>{g.nome}{g.n > 1 ? <small style={{ display: "inline", marginLeft: 6 }}>({g.n})</small> : null}</b><small>{g.n > 1 ? "último em " : "recebido "}{fmtDatePt(g.ult)} · {fmtBRL(g.bruto)}</small></span>
              <b className="mono ct-v" style={{ color: ok ? "#15803D" : null }}>{ok ? "✓ " : "separe "}{fmtBRL(g.imp)}</b>
            </label>
          ); })}
        </div>
        <div className="field-hint">Marque quando passar o valor para uma conta ou caixinha separada. O valor vem da tributação de cada vínculo.</div>
      </>)}
    </div>
  );
  const notas = (
    <div className="card" id="ct-notas">
      <div className="card-head"><h3 className="card-title">Nota × recebimento</h3><span className="card-note">{mes}</span></div>
      {semNotaPorForma.length > 0 && <div className="field-hint" style={{ marginTop: 0, marginBottom: 6 }}>Não precisam de nota: {[...new Set(semNotaPorForma.map((i) => i.nome.split(" · ")[0] + " (" + FORMA_CURTA[i.forma] + ")"))].join(", ")}.</div>}
      {tomadores.length === 0 ? <div className="empty-state" style={{ padding: "12px 0" }}>{semNotaPorForma.length ? "Nenhuma receita com nota em " + mes + "." : "Nenhuma receita em " + mes + "."}</div> : (
        <div className="ct-list">
          {tomadores.map((t) => { const emit = !!notasMap[notaKey(t.nome)]; return (
            <div key={t.nome} className="ct-row" data-tomador={t.nome}>
              <span className="ct-l"><b><span className="legend-dot" style={{ background: t.cor, marginRight: 7 }} />{t.nome}{t.n > 1 ? <small style={{ display: "inline", marginLeft: 6 }}>({t.n})</small> : null}</b>
                <small>{emit ? "nota emitida" : <b style={{ color: "#B45309" }}>falta emitir a nota</b>} · {t.pend === 0 ? <b style={{ color: "#15803D" }}>recebido</b> : t.atras ? <b style={{ color: "#B91C1C" }}>pagamento atrasado</b> : "previsto " + fmtDatePt(t.data)}</small></span>
              <b className="mono ct-v">{fmtBRL(t.bruto)}</b>
              <button type="button" className={`btn ${emit ? "btn-ghost" : "btn-primary"} sm`} onClick={() => toggleNota(t.nome)}>{emit ? "Desmarcar nota" : "Nota emitida"}</button>
            </div>
          ); })}
        </div>
      )}
    </div>
  );
  const irBody = (
    <div className="ct-ir">
      <div className="form-grid">
        <div className="field"><label>Rendimentos tributáveis no ano (R$)</label><MoneyInput value={ir.rend === undefined || ir.rend === "" ? "" : ir.rend} placeholder={sug.rend ? Math.round(sug.rend).toLocaleString("pt-BR") : "0"} onChange={(v) => setIr("rend", v)} /><div className="field-hint">Pró-labore, salário CLT e aluguel. {sug.rend > 0 ? "Em branco usa o que está lançado no app." : ""} Pix como sócio e dividendos são isentos e não entram aqui.</div></div>
        <div className="field"><label>Imposto já retido no ano (R$)</label><MoneyInput value={ir.retido === undefined || ir.retido === "" ? "" : ir.retido} placeholder={sug.retido ? Math.round(sug.retido).toLocaleString("pt-BR") : "0"} onChange={(v) => setIr("retido", v)} /><div className="field-hint">Está no informe de rendimentos. Em branco usa o desconto dos vínculos CLT.</div></div>
        <div className="field"><label>INSS pago no ano (R$)</label><MoneyInput value={ir.inss === undefined || ir.inss === "" ? "" : ir.inss} placeholder={sug.inss ? Math.round(sug.inss).toLocaleString("pt-BR") : "0"} onChange={(v) => setIr("inss", v)} /></div>
        <div className="field"><label>Previdência privada PGBL no ano (R$)</label><MoneyInput value={ir.pgbl === undefined ? "" : ir.pgbl} onChange={(v) => setIr("pgbl", v)} /></div>
        <div className="field"><label>Dependentes</label><input type="number" min="0" value={ir.dependentes || ""} placeholder="0" onChange={(e) => setIr("dependentes", e.target.value)} /></div>
      </div>
      <div className="ct-ir-res">
        <div className="kv-line"><span>Saúde (despesas dedutíveis)</span><b className="mono">{fmtBRL(saude)}</b></div>
        <div className="kv-line"><span>Educação (até o limite)</span><b className="mono">{fmtBRL(educ)}</b></div>
        <div className="kv-line"><span>{irr.usaSimp ? "Desconto simplificado (melhor para você)" : "Deduções (declaração completa, melhor para você)"}</span><b className="mono">− {fmtBRL(irr.usaSimp ? irr.simp : irr.deducoes)}</b></div>
        <div className="kv-line"><span>Imposto devido no ano</span><b className="mono">{fmtBRL(irr.devido)}</b></div>
        {anoIsento.length > 0 && <div className="kv-line"><span>Rendimentos isentos (Pix como sócio e dividendos)</span><b className="mono">{fmtBRL(somaG(anoIsento))}</b></div>}
        <div className={`ct-ir-box ${saldoIr >= 0 ? "ok" : "bad"}`}><small>Declaração de {viewYear + 1}</small><b className="mono">{rend <= 0 ? "Informe seus rendimentos" : (saldoIr >= 0 ? "A restituir " : "A pagar ") + fmtBRL(Math.abs(saldoIr))}</b></div>
      </div>
      <div className="field-hint">Estimativa simplificada com a tabela de {viewYear >= 2026 ? 2026 : viewYear} e a redução para rendas até R$ 88.200 por ano. Não substitui a declaração nem o contador.</div>
    </div>
  );
  const dedBody = porCat.length === 0 ? <div className="empty-state">Nenhuma despesa dedutível em {viewYear}. Saúde e escola entram sozinhas; para outras, abra a despesa pelo lápis e marque “Dedutível”.</div> : (
    <div>
      <div className="dprox">{porCat.map((c) => <div key={c.nome}><span><b><span className="legend-dot" style={{ background: c.cor, marginRight: 8 }} />{c.nome}</b><small>{c.n} lançamento(s)</small></span><b className="mono">{fmtBRL(c.v)}</b></div>)}</div>
      {outrosDed.length > 0 && <div className="field-hint">Cursos, congressos e anuidade do conselho só abatem no IR de quem é autônomo e faz livro-caixa. Eles vão para o relatório do contador.</div>}
    </div>
  );
  const relBody = (
    <div>
      <p className="line-sub" style={{ marginTop: 0 }}>Planilha com receitas por tomador, notas, guias e despesas dedutíveis. Abre no Excel ou no Google Planilhas.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={() => relatorio(false)}><IconDownload size={15} /> Planilha de {mes}</button>
        <button className="btn btn-ghost" onClick={() => relatorio(true)}><IconDownload size={15} /> Ano de {viewYear}</button>
      </div>
    </div>
  );
  const calcSub = contab.modo === "contab" ? (contab.regime === "presumido" ? "Lucro Presumido" : "Simples Nacional") + " · calculado pelo app" : "porcentagem fixa de " + (Number(taxRateGeral) || 0).toLocaleString("pt-BR") + "%";
  const gavetas = (
    <>
      <div className={desk ? "dsec" : "ct-sec"}>Para o ano</div>
      <div className="dgvs">
        <DGv id="ct-ir" wide={desk} open icon={<IconCalc size={18} />} tone="#15803D" title={"Imposto de renda de " + viewYear} sub="estimativa com o que está no app" val={rend > 0 ? (saldoIr >= 0 ? "a restituir " : "a pagar ") + fmtBRL(Math.abs(saldoIr)) : ""}>{irBody}</DGv>
        <DGv id="ct-ded" icon={<IconReceipt size={18} />} tone="#6D28D9" title="Despesas dedutíveis" sub="saúde, escola, cursos e conselho" val={fmtBRL(dedAno.reduce((a, e) => a + e.amount, 0))}>{dedBody}</DGv>
        <DGv id="ct-rel" icon={<IconDownload size={18} />} tone="#1D4ED8" title="Relatório para o contador" sub="planilha do mês ou do ano" val="">{relBody}</DGv>
        <DGv id="ct-calc" icon={<IconCalc size={18} />} tone="#334155" title="Como o imposto é calculado" sub={calcSub} val="">
          <ContabCalc contab={contab} setContab={setContab} app={app} taxRateGeral={taxRateGeral} setTaxRateGeral={setTaxRateGeral} />
        </DGv>
      </div>
    </>
  );
  return (
    <div className={`ct ${desk ? "desk" : ""}`}>
      {kpis}
      {quadro}
      {desk ? (
        <>
          <div className="dgrid" style={{ gridTemplateColumns: "1.4fr 1fr", alignItems: "start" }}>{agenda}{caixinha}</div>
          {notas}
        </>
      ) : (<>{agenda}{caixinha}{notas}</>)}
      {gavetas}
      <div className="ct-off"><button type="button" className="link-btn" onClick={() => { if (window.confirm("Esconder a aba Contabilidade? Dá para mostrar de novo em Configurações.")) set("aba", false); }}>Não uso esta aba: esconder</button></div>
    </div>
  );
}

// ---- Contabilidade: regras de 2026 usadas na simulação de tributos da PJ ----
// Simples Nacional (LC 123/2006): [limite da receita em 12 meses, alíquota nominal %, parcela a deduzir]
const SIMPLES_III = [[180000, 6, 0], [360000, 11.2, 9360], [720000, 13.5, 17640], [1800000, 16, 35640], [3600000, 21, 125640], [4800000, 33, 648000]];
const SIMPLES_V = [[180000, 15.5, 0], [360000, 18, 4500], [720000, 19.5, 9900], [1800000, 20.5, 17100], [3600000, 23, 62100], [4800000, 30.5, 540000]];
const FATOR_R_MIN = 0.28;
const INSS_TETO_2026 = 8475.55, SALARIO_MINIMO_2026 = 1621;
// IRRF mensal 2026: [limite da base, alíquota %, parcela a deduzir]
const IRRF_2026 = [[2428.8, 0, 0], [2826.65, 7.5, 182.16], [3751.05, 15, 394.16], [4664.68, 22.5, 675.49], [Infinity, 27.5, 908.73]];
const IRRF_SIMPLIFICADO = 607.2;
const DIVIDENDO_LIMITE_MES = 50000;
const PRESUMIDO_LIMITE_ANO = 5000000; // LC 224/2025: presunção 10% maior sobre a receita acima deste valor

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function simplesFaixa(rbt12, tabela) {
  const r = Math.max(0, Number(rbt12) || 0);
  let i = tabela.findIndex((f) => r <= f[0]);
  if (i < 0) i = tabela.length - 1;
  const [limite, nominal, deduz] = tabela[i];
  const efetiva = r > 0 ? ((r * nominal) / 100 - deduz) / r * 100 : nominal;
  return { faixa: i + 1, limite, nominal, deduz, efetiva, acimaDoLimite: r > 4800000 };
}

// IRRF sobre o pró-labore, com o desconto simplificado quando ele é maior e a redução da Lei 15.270/2025
function irrfMensal2026(bruto, inss) {
  const b = Math.max(0, Number(bruto) || 0);
  const base = Math.max(0, b - Math.max(Number(inss) || 0, IRRF_SIMPLIFICADO));
  const linha = IRRF_2026.find((f) => base <= f[0]);
  const imposto = Math.max(0, (base * linha[1]) / 100 - linha[2]);
  let reducao = 0;
  if (b <= 5000) reducao = Math.min(312.89, imposto);
  else if (b <= 7350) reducao = Math.min(imposto, Math.max(0, 978.62 - 0.133145 * b));
  return r2(Math.max(0, imposto - reducao));
}

function socioRetencoes(proLabore) {
  const pl = Math.max(0, Number(proLabore) || 0);
  const inss = r2(Math.min(pl, INSS_TETO_2026) * 0.11);
  return { inss, irrf: irrfMensal2026(pl, inss) };
}

// p: { receitaMes, rbt12, proLabore, folha, issPct, hospitalar, contador }
function calcSimples(p, anexoForcado) {
  const receita = Math.max(0, Number(p.receitaMes) || 0);
  const rbt12 = Number(p.rbt12) > 0 ? Number(p.rbt12) : receita * 12;
  const pl = Math.max(0, Number(p.proLabore) || 0), folha = Math.max(0, Number(p.folha) || 0);
  const fgts = r2(folha * 0.08);
  const folha12 = (pl + folha + fgts) * 12;
  const fatorR = rbt12 > 0 ? folha12 / rbt12 : 0;
  const anexo = anexoForcado || (fatorR >= FATOR_R_MIN ? "III" : "V");
  const fx = simplesFaixa(rbt12, anexo === "III" ? SIMPLES_III : SIMPLES_V);
  const das = r2((receita * fx.efetiva) / 100);
  const s = socioRetencoes(pl);
  const itens = [
    { id: "das", nome: "DAS do Simples Nacional", quem: "empresa", base: receita, aliq: fx.efetiva, valor: das, guia: "DAS, uma guia única", venc: "dia 20 do mês seguinte", obs: "Reúne IRPJ, CSLL, PIS, Cofins, INSS patronal e ISS." },
  ];
  if (fgts > 0) itens.push({ id: "fgts", nome: "FGTS dos funcionários", quem: "empresa", base: folha, aliq: 8, valor: fgts, guia: "FGTS Digital", venc: "dia 20 do mês seguinte" });
  itens.push({ id: "inss", nome: "INSS do sócio", quem: "socio", base: Math.min(pl, INSS_TETO_2026), aliq: 11, valor: s.inss, guia: "DARF da DCTFWeb, descontado do pró-labore", venc: "em geral, dia 20 do mês seguinte", obs: pl > INSS_TETO_2026 ? "Limitado ao teto do INSS." : "" });
  itens.push({ id: "irrf", nome: "IRRF do pró-labore", quem: "socio", base: pl, aliq: pl > 0 ? (s.irrf / pl) * 100 : 0, valor: s.irrf, guia: "DARF da DCTFWeb, descontado do pró-labore", venc: "em geral, dia 20 do mês seguinte", obs: "Tabela progressiva de 2026, com a redução para pró-labore de até R$ 7.350." });
  return fechar({ regime: "simples", receita, rbt12, pl, folha, fatorR, folha12, anexo, faixa: fx, itens }, p);
}

function calcPresumido(p) {
  const receita = Math.max(0, Number(p.receitaMes) || 0);
  const rbt12 = Number(p.rbt12) > 0 ? Number(p.rbt12) : receita * 12;
  const pl = Math.max(0, Number(p.proLabore) || 0), folha = Math.max(0, Number(p.folha) || 0);
  const iss = Math.max(0, Number(p.issPct) || 0);
  const excedente = rbt12 > PRESUMIDO_LIMITE_ANO ? (rbt12 - PRESUMIDO_LIMITE_ANO) / rbt12 : 0; // parte da receita acima de R$ 5 milhões no ano
  const presIR = (p.hospitalar ? 8 : 32) * (1 + 0.1 * excedente), presCS = (p.hospitalar ? 12 : 32) * (1 + 0.1 * excedente);
  const baseIR = (receita * presIR) / 100, baseCS = (receita * presCS) / 100;
  const irpj = r2(baseIR * 0.15), adicional = r2(Math.max(0, baseIR - 20000) * 0.1), csll = r2(baseCS * 0.09);
  const pis = r2(receita * 0.0065), cofins = r2(receita * 0.03), issV = r2((receita * iss) / 100);
  const cpp = r2((pl + folha) * 0.2), fgts = r2(folha * 0.08);
  const s = socioRetencoes(pl);
  const tri = "trimestral: último dia útil do mês seguinte ao trimestre";
  const itens = [
    { id: "irpj", nome: "IRPJ", quem: "empresa", base: baseIR, aliq: 15, valor: irpj, guia: "DARF", venc: tri, obs: `15% sobre ${fmtPct(presIR)} do faturamento (lucro presumido).` },
  ];
  if (adicional > 0) itens.push({ id: "adicional", nome: "Adicional de IRPJ", quem: "empresa", base: baseIR - 20000, aliq: 10, valor: adicional, guia: "DARF", venc: tri, obs: "10% sobre o lucro presumido acima de R$ 20 mil por mês (R$ 60 mil no trimestre)." });
  itens.push({ id: "csll", nome: "CSLL", quem: "empresa", base: baseCS, aliq: 9, valor: csll, guia: "DARF", venc: tri, obs: `9% sobre ${fmtPct(presCS)} do faturamento.` });
  itens.push({ id: "pis", nome: "PIS", quem: "empresa", base: receita, aliq: 0.65, valor: pis, guia: "DARF", venc: "dia 25 do mês seguinte" });
  itens.push({ id: "cofins", nome: "Cofins", quem: "empresa", base: receita, aliq: 3, valor: cofins, guia: "DARF", venc: "dia 25 do mês seguinte" });
  itens.push({ id: "iss", nome: "ISS", quem: "empresa", base: receita, aliq: iss, valor: issV, guia: "guia da prefeitura", venc: "varia conforme o município", obs: "A alíquota vai de 2% a 5%, conforme a cidade." });
  itens.push({ id: "cpp", nome: "INSS patronal", quem: "empresa", base: pl + folha, aliq: 20, valor: cpp, guia: "DARF da DCTFWeb", venc: "em geral, dia 20 do mês seguinte", obs: "20% sobre o pró-labore e os salários." });
  if (fgts > 0) itens.push({ id: "fgts", nome: "FGTS dos funcionários", quem: "empresa", base: folha, aliq: 8, valor: fgts, guia: "FGTS Digital", venc: "dia 20 do mês seguinte" });
  itens.push({ id: "inss", nome: "INSS do sócio", quem: "socio", base: Math.min(pl, INSS_TETO_2026), aliq: 11, valor: s.inss, guia: "DARF da DCTFWeb, descontado do pró-labore", venc: "em geral, dia 20 do mês seguinte", obs: pl > INSS_TETO_2026 ? "Limitado ao teto do INSS." : "" });
  itens.push({ id: "irrf", nome: "IRRF do pró-labore", quem: "socio", base: pl, aliq: pl > 0 ? (s.irrf / pl) * 100 : 0, valor: s.irrf, guia: "DARF da DCTFWeb, descontado do pró-labore", venc: "em geral, dia 20 do mês seguinte", obs: "Tabela progressiva de 2026, com a redução para pró-labore de até R$ 7.350." });
  return fechar({ regime: "presumido", receita, rbt12, pl, folha, presIR, presCS, excedente, itens }, p);
}

function fmtPct(n) { return (Math.round(n * 100) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%"; }

function fechar(r, p) {
  const soma = (q) => r2(r.itens.filter((i) => i.quem === q).reduce((a, i) => a + i.valor, 0));
  const empresa = soma("empresa"), socio = soma("socio"), total = r2(empresa + socio);
  const contador = Math.max(0, Number(p.contador) || 0);
  const lucro = r2(r.receita - empresa - r.pl - r.folha - contador);
  const liquidoSocio = r2(r.pl - socio + Math.max(0, lucro));
  return { ...r, empresa, socio, total, contador, lucro, liquidoSocio,
    carga: r.receita > 0 ? (total / r.receita) * 100 : 0, cargaEmpresa: r.receita > 0 ? (empresa / r.receita) * 100 : 0,
    retencaoLucros: lucro > DIVIDENDO_LIMITE_MES ? r2(lucro * 0.1) : 0 };
}

// Pró-labore mensal que leva o Fator R a 28%, mantendo os salários informados
function proLaboreParaFatorR(p) {
  const receita = Math.max(0, Number(p.receitaMes) || 0);
  const rbt12 = Number(p.rbt12) > 0 ? Number(p.rbt12) : receita * 12;
  const folha = Math.max(0, Number(p.folha) || 0);
  const alvo = Math.round(((FATOR_R_MIN * rbt12) / 12 - folha * 1.08) * 1e6) / 1e6; // evita erro de ponto flutuante antes de arredondar para cima
  return Math.max(0, Math.ceil(alvo * 100) / 100);
}

const fmtHoras = (h) => (Math.round((Number(h) || 0) * 10) / 10).toLocaleString("pt-BR") + "h";
// despesa dedutível: marcada à mão ou, sem marcação, saúde e educação
const ehDedutivel = (e) => (e.dedutivel !== undefined && e.dedutivel !== null ? !!e.dedutivel : ["saude", "educacao"].includes(e.category));
// IRPF anual do ano-calendário 2026 (declaração de 2027), com a redução da Lei 15.270/2025
const IRPF_ANUAL_2026 = [[28467.20, 0, 0], [33919.80, 7.5, 2135.04], [45012.60, 15, 4679.03], [55976.16, 22.5, 8054.97], [Infinity, 27.5, 10853.78]];
const IR_DEP_ANUAL = 2275.08, IR_EDU_LIMITE = 3561.50, IR_SIMPLIFICADO_LIMITE = 16754.34;
function irAnual(rend, deducoes) {
  const simp = Math.min(rend * 0.2, IR_SIMPLIFICADO_LIMITE);
  const usaSimp = simp >= deducoes;
  const base = Math.max(0, rend - (usaSimp ? simp : deducoes));
  const fx = IRPF_ANUAL_2026.find((f) => base <= f[0]);
  const bruto = Math.max(0, base * fx[1] / 100 - fx[2]);
  const red = rend <= 60000 ? Math.min(bruto, 2694.15) : rend <= 88200 ? Math.max(0, 8429.73 - 0.095575 * rend) : 0;
  return { base, bruto, reducao: Math.min(bruto, red), devido: Math.max(0, bruto - Math.min(bruto, red)), usaSimp, simp, deducoes };
}
// guias do mês mk (competência do mês anterior). prevGross: bruto do mês anterior; prevTax: imposto estimado do mês anterior
function contabParams(contab, receitaMes) {
  return { receitaMes, rbt12: numOf(contab.rbt12), proLabore: numOf(contab.proLabore), folha: numOf(contab.folha), issPct: numOf(contab.issPct), hospitalar: !!contab.hospitalar, contador: 0 };
}
function contabGuias(contab, y, m, prevGross, prevTax) {
  const g = [];
  const contador = numOf(contab.contador);
  if (contab.modo === "contab" && prevGross > 0) {
    const r = contab.regime === "presumido" ? calcPresumido(contabParams(contab, prevGross)) : calcSimples(contabParams(contab, prevGross));
    const v = (ids) => r.itens.filter((i) => ids.includes(i.id)).reduce((a, i) => a + i.valor, 0);
    if (contab.regime === "presumido") {
      g.push({ id: "piscofins", nome: "PIS e Cofins", dia: 25, valor: v(["pis", "cofins"]) });
      if (v(["iss"]) > 0) g.push({ id: "iss", nome: "ISS", dia: 10, valor: v(["iss"]), sub: "o dia varia conforme a cidade" });
      if ([0, 3, 6, 9].includes(m)) g.push({ id: "irpjcsll", nome: "IRPJ e CSLL do trimestre", dia: 30, valor: v(["irpj", "adicional", "csll"]) * 3, sub: "pago a cada 3 meses" });
      g.push({ id: "dctf", nome: "INSS e IR (DCTFWeb)", dia: 20, valor: v(["cpp", "inss", "irrf"]), sub: "inclui o do seu pró-labore" });
    } else {
      g.push({ id: "das", nome: "DAS do Simples", dia: 20, valor: v(["das"]) });
      if (v(["inss", "irrf"]) > 0) g.push({ id: "dctf", nome: "INSS e IR do pró-labore", dia: 20, valor: v(["inss", "irrf"]) });
    }
    if (v(["fgts"]) > 0) g.push({ id: "fgts", nome: "FGTS dos funcionários", dia: 20, valor: v(["fgts"]) });
  } else if (prevTax > 0.004) {
    g.push({ id: "impostos", nome: "Impostos do mês anterior", dia: 20, valor: prevTax, sub: "estimativa pela tributação dos seus vínculos", estimado: true });
  }
  if (contab.pagamento === "boleto") {
    const total = g.reduce((a, x) => a + x.valor, 0) + contador;
    const fixo = numOf(contab.boletoValor);
    const dia = Number(contab.boletoDia) || 20;
    const valor = fixo > 0 ? fixo : total;
    return valor > 0.004 ? [{ id: "boleto", nome: "Boleto do contador", dia, data: dateStr(y, m, clampDay(y, m, dia)), valor, sub: fixo > 0 ? "o contador paga os impostos" : "estimativa: impostos + contador. O contador paga as guias.", estimado: !(fixo > 0) }] : [];
  }
  if (contador > 0) g.push({ id: "contador", nome: "Contador", dia: Number(contab.contadorDia) || 10, valor: contador });
  return g.filter((x) => x.valor > 0.004).map((x) => ({ ...x, data: dateStr(y, m, clampDay(y, m, x.dia)) }));
}

const CONTAB_DEFAULT = { modo: "fixa", regime: "simples", receitaMes: "", rbt12: "", proLabore: "", folha: "", issPct: "5", hospitalar: false, contador: "" };

// Rentabilidade do trabalho: horas do mês e ganho líquido por hora, pelo mês trabalhado
function WorkRateCard({ cur, prev, history, monthName, prevName, compact, onCalendar, onDetails, goMonth }) {
  const tot = history.reduce((a, h) => ({ net: a.net + h.net, hours: a.hours + h.hours }), { net: 0, hours: 0 });
  const media = tot.hours > 0 ? tot.net / tot.hours : 0;
  const mesesComHoras = history.filter((h) => h.hours > 0).length;
  const maxHist = Math.max(1, ...history.map((h) => h.hourly));
  const maxVin = Math.max(1, ...cur.byVinculo.map((v) => v.hourly));
  const dH = cur.hours - prev.hours;
  return (
    <div className="card work-card" id={compact ? "work-card-home" : "work-card"}>
      <div className="card-head">
        <h3 className="card-title">Rentabilidade do trabalho</h3>
        {compact ? <button className="link-btn" onClick={onDetails}>ver por vínculo</button> : <span className="card-note">pelo mês trabalhado</span>}
      </div>
      {cur.hours <= 0 ? (
        <div className="empty-state" style={{ padding: "6px 0 2px" }}>
          Ainda não há horas lançadas em {monthName.toLowerCase()}. Informe as horas de cada plantão no Calendário para ver quanto você ganha por hora.
          <div style={{ marginTop: 10 }}><button className="btn btn-ghost sm" onClick={onCalendar}>Abrir o Calendário</button></div>
        </div>
      ) : (
        <>
          <div className="wr-top">
            <div className="wr-main">
              <span>Ganho líquido por hora</span>
              <b className="mono"><CountUp value={cur.hourly} /></b>
              {prev.hours > 0 ? <div className="wr-cmp"><Delta now={cur.hourly} prev={prev.hourly} /><small>{prevName}: {fmtBRL(prev.hourly)}</small></div> : <small className="wr-none">Sem horas no mês anterior para comparar.</small>}
            </div>
            <div className="wr-side">
              <div><span>Horas trabalhadas</span><b className="mono">{fmtHoras(cur.hours)}</b><small>{prev.hours > 0 ? (dH === 0 ? "igual ao mês anterior" : `${dH > 0 ? "+" : "−"}${fmtHoras(Math.abs(dH))} que em ${prevName.toLowerCase()}`) : `em ${cur.dias} ${cur.dias === 1 ? "dia" : "dias"}`}</small></div>
              <div><span>Recebido por esse trabalho</span><b className="mono">{fmtBRL(cur.net)}</b><small>líquido, {cur.turnos} {cur.turnos === 1 ? "lançamento" : "lançamentos"}</small></div>
              <div><span>Média de {history.length} meses</span><b className="mono">{mesesComHoras > 1 ? fmtBRL(media) : "—"}</b><small>{mesesComHoras > 1 ? (cur.hourly >= media ? "este mês ficou acima" : "este mês ficou abaixo") : "precisa de mais meses"}</small></div>
            </div>
          </div>
          {!compact && (
            <>
              <div className="wr-sub">Por vínculo</div>
              {cur.byVinculo.map((v, i) => (
                <div key={v.id} className="wr-vin">
                  <span className="legend-dot" style={{ background: v.cor }} />
                  <div className="wr-vn"><b>{v.nome}</b><small>{fmtHoras(v.hours)} · {fmtBRL(v.net)} líquidos{i === 0 && cur.byVinculo.length > 1 ? " · melhor valor por hora" : ""}</small></div>
                  <div className="wr-vr"><b className="mono">{fmtBRL(v.hourly)}</b><small>por hora</small></div>
                  <div className="progress-track wr-vbar"><div className="progress-fill" style={{ width: `${(v.hourly / maxVin) * 100}%`, background: v.cor }} /></div>
                </div>
              ))}
              <div className="wr-sub">Ganho por hora nos últimos {history.length} meses</div>
              <div className="wr-hist">
                {history.map((h) => (
                  <button key={h.y + "-" + h.m} className={`wr-col ${h.cur ? "cur" : ""}`} onClick={() => goMonth(h.y, h.m)} aria-label={`${h.full}: ${h.hours > 0 ? fmtBRL(h.hourly) + " por hora, " + fmtHoras(h.hours) : "sem horas"}`}>
                    <span className="wr-colv mono">{h.hours > 0 ? Math.round(h.hourly).toLocaleString("pt-BR") : "—"}</span>
                    <span className="wr-bar"><i style={{ height: `${h.hours > 0 ? Math.max(4, (h.hourly / maxHist) * 100) : 0}%` }} /></span>
                    <span className="wr-coll">{h.label}</span>
                    <span className="wr-colh mono">{h.hours > 0 ? fmtHoras(h.hours) : ""}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {cur.semHoras > 0 && <div className="wr-note">{cur.semHoras} {cur.semHoras === 1 ? "plantão sem horas ficou" : "plantões sem horas ficaram"} fora da conta ({fmtBRL(cur.semHorasNet)}). Informe as horas no Calendário para incluir.</div>}
          {!compact && <div className="field-hint">A conta divide o valor líquido dos plantões e dos vínculos com horas lançadas pelas horas trabalhadas no mês, mesmo que o pagamento caia depois.</div>}
        </>
      )}
    </div>
  );
}

// ---- Escala fixa de vínculos mensais (diarismo, meio turno): gera horas e aparece no calendário ----
const TURNOS = { manha: "Manhã", tarde: "Tarde", noite: "Noite", dia: "Dia todo" };
const DIAS_SEM = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const ORDEM_SEM = [1, 2, 3, 4, 5, 6, 0];
// Datas de um plantão que se repete: a cada N semanas ou uma vez por mês (o mesmo dia da semana, na mesma posição do mês)
const DIA_SEM_NOME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
function ordemNoMes(iso) { const [y, m, d] = iso.split("-").map(Number); return { wd: new Date(y, m - 1, d).getDay(), n: Math.ceil(d / 7) }; }
const ordemTxt = (iso) => { const o = ordemNoMes(iso); return `${o.wd === 0 || o.wd === 6 ? "todo" : "toda"} ${o.n}${o.wd === 0 || o.wd === 6 ? "º" : "ª"} ${DIA_SEM_NOME[o.wd]} do mês`.replace("todo 5º", "todo último").replace("toda 5ª", "toda última"); };
function plantaoDatas(inicio, rep, meses) {
  if (!inicio || rep === "nao" || !rep) return inicio ? [inicio] : [];
  const [y, m, d] = inicio.split("-").map(Number), nm = Math.max(1, Number(meses) || 1);
  const fim = dateStr(y + Math.floor((m - 1 + nm) / 12), (m - 1 + nm) % 12, clampDay(y + Math.floor((m - 1 + nm) / 12), (m - 1 + nm) % 12, d));
  const out = [];
  if (rep === "mes") {
    const o = ordemNoMes(inicio);
    for (let k = 0; k <= nm; k++) {
      const yy = y + Math.floor((m - 1 + k) / 12), mm = (m - 1 + k) % 12, ult = new Date(yy, mm + 1, 0).getDate();
      let dia = 1 + ((o.wd - new Date(yy, mm, 1).getDay() + 7) % 7) + (o.n - 1) * 7;
      while (dia > ult) dia -= 7;
      const iso = dateStr(yy, mm, dia);
      if (iso >= inicio && iso < fim) out.push(iso);
    }
    return out.length ? out : [inicio];
  }
  const passo = 7 * Math.max(1, Number(rep) || 1);
  for (let iso = inicio; iso < fim && out.length < 320; iso = addDaysIso(iso, passo)) out.push(iso);
  return out;
}
// Semanas contadas de segunda a domingo, para o sábado e o domingo do mesmo fim de semana ficarem juntos
const semanaIdx = (iso) => { const [y, m, d] = String(iso).split("-").map(Number); return Math.floor((Date.UTC(y, m - 1, d) / 86400000 - 4) / 7); };
const slotCada = (s) => { const c = Math.round(Number(s && s.cada) || 1); return c > 1 ? c : 1; };
const slotMensal = (s) => !!s && s.cada === "mes";
const ORD_TXT = { 1: "1º", 2: "2º", 3: "3º", 4: "4º", 5: "último" };
// Posição, dentro do mês, da semana (segunda a domingo) em que a data cai. Quem manda é o primeiro dia do horário naquela semana (o sábado, num fim de semana).
function semanaDoMes(dias, iso) {
  const anc = [1, 2, 3, 4, 5, 6, 0].find((x) => (dias || []).includes(x));
  if (anc === undefined) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const a = addDaysIso(addDaysIso(iso, -((new Date(y, m - 1, d).getDay() + 6) % 7)), (anc + 6) % 7);
  return { n: Math.ceil(Number(a.slice(8, 10)) / 7), ultima: addDaysIso(a, 7).slice(0, 7) !== a.slice(0, 7) };
}
const slotNaSemana = (s, iso) => { if (slotMensal(s)) { const w = semanaDoMes(s.dias, iso), o = Number(s.ordem) || 1; return !!w && (o >= 5 ? w.ultima : w.n === o); } const c = slotCada(s); if (c === 1 || !s.inicio) return true; return (((semanaIdx(iso) - semanaIdx(s.inicio)) % c) + c) % c === 0; };
function escalaProximas(s, n) {
  const out = [], hoje = todayStr();
  for (let k = 0; k < 150 && out.length < n; k++) { const iso = addDaysIso(hoje, k); const [y, m, d] = iso.split("-").map(Number); if ((s.dias || []).includes(new Date(y, m - 1, d).getDay()) && slotNaSemana(s, iso)) out.push(iso); }
  return out;
}
const slotFds = (s) => (s.dias || []).length > 0 && (s.dias || []).every((d) => d === 6 || d === 0);
const repTxt = (n, fds, cap) => {
  const t = n <= 1 ? "semanal" : n === 2 ? "quinzenal" : `a cada ${n} semanas`;
  return cap ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};
// Próximas semanas (de segunda a domingo) em que os dias deste horário ainda não passaram, para escolher qual é a da vez
function escalaSemanas(s, n) {
  const out = [], hoje = todayStr(), [y, m, d] = hoje.split("-").map(Number);
  const seg = addDaysIso(hoje, -((new Date(y, m - 1, d).getDay() + 6) % 7));
  for (let k = 0; k < 8 && out.length < n; k++) {
    const dias = ORDEM_SEM.filter((x) => (s.dias || []).includes(x)).map((x) => addDaysIso(seg, k * 7 + ((x + 6) % 7))).filter((iso) => iso >= hoje);
    if (!dias.length) continue;
    const c = (iso) => fmtDatePt(iso).slice(0, 5);
    out.push({ inicio: dias[0], label: dias.length === 1 ? c(dias[0]) : dias.length === 2 ? `${c(dias[0])} e ${c(dias[1])}` : `${c(dias[0])} a ${c(dias[dias.length - 1])}` });
  }
  return out;
}
function escalaDoMes(v, y, m) {
  if (!v || v.tipo !== "mensal" || !Array.isArray(v.escala) || v.escala.length === 0) return [];
  if (v.startMonth && v.startMonth > monthKeyOf(y, m)) return [];
  const out = [], n = new Date(y, m + 1, 0).getDate(), off = v.escalaOff || {};
  for (let d = 1; d <= n; d++) {
    const wd = new Date(y, m, d).getDay(), date = dateStr(y, m, d);
    v.escala.forEach((s) => { if ((s.dias || []).includes(wd) && Number(s.horas) > 0 && slotNaSemana(s, date)) out.push({ id: "esc-" + v.id + "-" + s.id + "-" + date, slotId: s.id, vinculoId: v.id, date, day: d, turno: s.turno, hours: Number(s.horas), off: !!off[date] }); });
  }
  return out;
}
function escalaDiasTxt(dias) {
  const d = ORDEM_SEM.filter((x) => (dias || []).includes(x));
  if (d.length === 0) return "sem dias";
  const key = d.join(",");
  if (key === "1,2,3,4,5") return "Seg a Sex";
  if (key === "6,0") return "Sáb e Dom";
  if (d.length === 7) return "Todos os dias";
  return d.map((x) => DIAS_SEM[x]).join(", ");
}
const escalaResumo = (v) => (v.escala || []).map((s) => `${escalaDiasTxt(s.dias)} · ${(TURNOS[s.turno] || "").toLowerCase()} · ${fmtHoras(s.horas)}${slotMensal(s) ? ` · mensal (${ORD_TXT[Number(s.ordem) || 1]} ${slotFds(s) ? "fim de semana" : "semana"})` : slotCada(s) > 1 ? ` · ${repTxt(slotCada(s), slotFds(s))}` : ""}`).join("  |  ");
const escalaHorasSemana = (escala) => (escala || []).reduce((a, s) => a + ((s.dias || []).length * (Number(s.horas) || 0)) / (slotMensal(s) ? 4.35 : slotCada(s)), 0);

function EscalaEditor({ value, onChange }) {
  const list = value || [];
  const [edit, setEdit] = useState(null);
  const upd = (id, patch) => onChange(list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const add = () => { const id = uid(); onChange([...list, { id, dias: [1, 2, 3, 4, 5], turno: "manha", horas: 6 }]); setEdit(id); };
  const remover = (id) => { onChange(list.filter((x) => x.id !== id)); if (edit === id) setEdit(null); };
  const diasTxt = (d = []) => {
    const o = ORDEM_SEM.filter((x) => d.includes(x));
    if (!o.length) return "Sem dias";
    if (o.length === 5 && [1, 2, 3, 4, 5].every((x) => o.includes(x))) return "Seg a Sex";
    if (o.length === 7) return "Todos os dias";
    if (o.length === 2 && o.includes(6) && o.includes(0)) return "Sáb e Dom";
    return o.map((x) => DIAS_SEM[x]).join(", ");
  };
  const freqTxt = (s) => slotMensal(s) ? `Mensal, ${ORD_TXT[Number(s.ordem) || 1]} ${slotFds(s) ? "fim de semana" : "semana"} do mês` : repTxt(slotCada(s), slotFds(s), true);
  const freqVal = (s) => (slotMensal(s) ? "mes" : String(slotCada(s)));
  const setFreq = (s, v) => {
    if (v === "mes") upd(s.id, { cada: "mes", ordem: Number(s.ordem) || 1 });
    else { const n = Number(v); upd(s.id, n > 1 ? { cada: n, inicio: (escalaSemanas(s, 1)[0] || {}).inicio || todayStr() } : { cada: 1 }); }
  };
  return (
    <div className="esc">
      {list.length === 0 && <div className="field-hint" style={{ marginTop: 0 }}>Opcional. Cadastre os períodos fixos de trabalho para que as horas sejam lançadas no Calendário.</div>}
      {list.map((s) => {
        const c = slotCada(s), mes = slotMensal(s), fds = slotFds(s), temDias = (s.dias || []).length > 0;
        const px = (c > 1 || mes) && temDias ? escalaProximas(s, 3) : [];
        if (edit !== s.id) return (
          <div key={s.id} className="esc-sum" data-escala={s.id}>
            <button type="button" className="esc-sum-b" onClick={() => setEdit(s.id)} aria-label={"Editar " + diasTxt(s.dias)}>
              <b>{diasTxt(s.dias)} · {TURNOS[s.turno] || "Manhã"} · {fmtHoras(Number(s.horas) || 0)}</b>
              <small>{freqTxt(s)}{px.length ? " · próximas datas: " + px.map((d) => fmtDatePt(d).slice(0, 5)).join(", ") : ""}</small>
            </button>
            <button type="button" className="btn-icon" aria-label="Editar horário" onClick={() => setEdit(s.id)}><IconEdit size={15} /></button>
            <button type="button" className="btn-icon" aria-label="Remover horário" onClick={() => remover(s.id)}><IconTrash size={15} /></button>
          </div>
        );
        const ops = c > 1 ? escalaSemanas(s, c).slice(0, c) : [];
        const atual = ops.find((o) => slotNaSemana(s, o.inicio));
        return (
          <div key={s.id} className="esc-ed" data-escala={s.id}>
            <div className="esc-l">Dias</div>
            <div className="esc-dias" role="group" aria-label="Dias da semana">
              {ORDEM_SEM.map((d) => { const on = (s.dias || []).includes(d); return (
                <button key={d} type="button" className={`esc-dia ${on ? "on" : ""}`} aria-pressed={on} onClick={() => upd(s.id, { dias: on ? s.dias.filter((x) => x !== d) : [...(s.dias || []), d] })}>{DIAS_SEM[d].slice(0, 1)}<span>{DIAS_SEM[d]}</span></button>
              ); })}
            </div>
            <div className="esc-grid">
              <label><span className="esc-l">Turno</span>
                <select value={s.turno} onChange={(e) => upd(s.id, { turno: e.target.value })}>{Object.keys(TURNOS).map((k) => <option key={k} value={k}>{TURNOS[k]}</option>)}</select></label>
              <div><span className="esc-l">Horas por dia</span>
                <div className="esc-step">
                  <button type="button" aria-label="Menos meia hora" onClick={() => upd(s.id, { horas: Math.max(0.5, (Number(s.horas) || 0) - 0.5) })}>−</button>
                  <b>{fmtHoras(Number(s.horas) || 0)}</b>
                  <button type="button" aria-label="Mais meia hora" onClick={() => upd(s.id, { horas: Math.min(24, (Number(s.horas) || 0) + 0.5) })}>+</button>
                </div></div>
              <label className="esc-rep"><span className="esc-l">Frequência</span>
                <select value={freqVal(s)} onChange={(e) => setFreq(s, e.target.value)}>
                  {[1, 2, 3].map((n) => <option key={n} value={String(n)}>{repTxt(n, fds, true)}</option>)}
                  <option value="mes">Mensal</option>
                </select></label>
              {c > 1 && temDias && (
                <label><span className="esc-l">Próximo dia trabalhado</span>
                  <select value={atual ? atual.inicio : ""} onChange={(e) => upd(s.id, { inicio: e.target.value })}>
                    {!atual && <option value="">Selecione</option>}
                    {ops.map((o) => <option key={o.inicio} value={o.inicio}>{o.label}</option>)}
                  </select></label>
              )}
              {mes && (
                <label><span className="esc-l">Semana do mês</span>
                  <select value={Number(s.ordem) || 1} onChange={(e) => upd(s.id, { ordem: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5].map((o) => <option key={o} value={o}>{o === 5 ? "Último" : ORD_TXT[o]} do mês</option>)}
                  </select></label>
              )}
            </div>
            {px.length > 0 && <div className="esc-prox" data-prox>Próximas datas: {px.map((d) => fmtDatePt(d).slice(0, 5)).join(", ")}</div>}
            <div className="esc-btns">
              <button type="button" className="btn btn-primary sm" onClick={() => setEdit(null)}>Pronto</button>
              <button type="button" className="btn btn-ghost sm" onClick={() => remover(s.id)}>Remover</button>
            </div>
          </div>
        );
      })}
      <div className="esc-foot">
        <button type="button" className="btn btn-ghost sm" onClick={add}><IconPlus size={14} /> {list.length ? "Adicionar outro período" : "Adicionar período"}</button>
        {list.length > 0 && <span>Carga média: {fmtHoras(escalaHorasSemana(list))} por semana</span>}
      </div>
    </div>
  );
}

// Contabilidade: porcentagem fixa ou cálculo simples dos impostos da PJ, com a conta detalhada à parte
function ContabCalc({ contab, setContab, app, taxRateGeral, setTaxRateGeral }) {
  const set = (k, v) => setContab((p) => ({ ...p, [k]: v }));
  const usaContab = contab.modo === "contab";
  const p = { receitaMes: numOf(contab.receitaMes), rbt12: numOf(contab.rbt12), proLabore: numOf(contab.proLabore), folha: numOf(contab.folha), issPct: numOf(contab.issPct), hospitalar: !!contab.hospitalar, contador: numOf(contab.contador) };
  const simples = calcSimples(p), presumido = calcPresumido(p);
  const isS = contab.regime !== "presumido";
  const res = isS ? simples : presumido, outro = isS ? presumido : simples;
  const has = p.receitaMes > 0;
  const pct = (n, d = 2) => (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";
  const plAlvo = proLaboreParaFatorR(p);
  const alt = simples.anexo === "V" ? calcSimples({ ...p, proLabore: Math.max(plAlvo, p.proLabore) }) : calcSimples(p, "V");
  const ganhoFatorR = simples.anexo === "V" ? simples.total - alt.total : alt.total - simples.total;
  const dif = Math.abs(simples.total - presumido.total);
  const menor = simples.total <= presumido.total ? "simples" : "presumido";
  const val = (id) => (res.itens.find((i) => i.id === id) || { valor: 0 }).valor;
  const num = (k, label, hint, extra) => (
    <div className="field">
      <label htmlFor={"ct-" + k}>{label}</label>
      <MoneyInput id={"ct-" + k} value={contab[k] === undefined || contab[k] === null ? "" : contab[k]} onChange={(v) => set(k, v)} />
      {extra}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
  // lista em linguagem simples: o que é pago, quando e quanto
  const simplesLista = (isS
    ? [["DAS", "A guia única da empresa no Simples. Vence todo dia 20.", val("das")]]
    : [["Imposto sobre o lucro (IRPJ e CSLL)", "Pago a cada 3 meses. Aqui aparece a parte de um mês, para você reservar.", val("irpj") + val("adicional") + val("csll")],
       ["PIS e Cofins", "Pagos todo mês, até o dia 25.", val("pis") + val("cofins")],
       ["ISS", "Imposto da prefeitura sobre o serviço.", val("iss")],
       ["INSS da empresa", "20% sobre o seu pró-labore e os salários.", val("cpp")]]
  ).concat([
    ["FGTS dos funcionários", "8% sobre os salários.", val("fgts")],
    ["INSS do sócio", "Conta para a sua aposentadoria. Sai do seu pró-labore.", val("inss")],
    ["Imposto de renda do pró-labore", "Também sai do seu pró-labore.", val("irrf")],
  ]).filter((x) => x[2] > 0.004);
  const outros = res.folha + res.contador;
  const fica = Math.max(0, res.liquidoSocio);
  const partes = [["Impostos", res.total, "var(--brick)"], ["Funcionários e contador", outros, "#94A3B8"], ["Fica com você", fica, "var(--teal)"]].filter((x) => x[1] > 0.004);
  const somaPartes = partes.reduce((a, x) => a + x[1], 0) || 1;
  const linha = (i) => (
    <div key={i.id} className="tax-row" data-tax={i.id}>
      <div className="tax-l">
        <b>{i.nome}</b>
        <small className="mono">{fmtBRL(i.base)} × {pct(i.aliq)}</small>
        {i.obs ? <small>{i.obs}</small> : null}
        <small className="tax-pay">{i.guia} · {i.venc}</small>
      </div>
      <div className="tax-r"><b className="mono">{fmtBRL(i.valor)}</b><small>{pct(res.receita > 0 ? (i.valor / res.receita) * 100 : 0)} do faturamento</small></div>
    </div>
  );
  const col = (r, nome, id) => (
    <div className={`cmp-col ${menor === id ? "best" : ""} ${(id === "simples") === isS ? "sel" : ""}`} data-regime={id}>
      <div className="cmp-head"><b>{nome}</b>{menor === id && dif >= 0.01 ? <span className="badge badge-paid" style={{ cursor: "default" }}>menor carga</span> : null}</div>
      <div className="kv-line"><span>Tributos da empresa</span><b className="mono">{fmtBRL(r.empresa)}</b></div>
      <div className="kv-line"><span>Descontos do sócio</span><b className="mono">{fmtBRL(r.socio)}</b></div>
      <div className="kv-line total"><span>Total no mês</span><b className="mono">{fmtBRL(r.total)}</b></div>
      <div className="kv-line"><span>Carga sobre o faturamento</span><b className="mono">{pct(r.carga)}</b></div>
      <div className="kv-line"><span>Sobra para o sócio</span><b className="mono">{fmtBRL(r.liquidoSocio)}</b></div>
    </div>
  );
  const modoCard = (
    <div className="card" id="contab-modo">
      <div className="card-head"><h3 className="card-title">Como informar o imposto</h3></div>
      <div className="segmented" role="group" aria-label="Forma de informar o imposto">
        <button className={`seg-btn ${!usaContab ? "active" : ""}`} onClick={() => set("modo", "fixa")}>Porcentagem fixa</button>
        <button className={`seg-btn ${usaContab ? "active" : ""}`} onClick={() => set("modo", "contab")}>Calcular para mim</button>
      </div>
      {!usaContab ? (
        <>
          <p className="regime-desc">Você informa uma porcentagem única, e o app desconta esse valor de cada plantão e vínculo sem alíquota própria.</p>
          <div className="field" style={{ maxWidth: 260 }}>
            <label htmlFor="ct-fixa">Imposto sobre o que você recebe (%)</label>
            <input id="ct-fixa" type="number" inputMode="decimal" step="0.1" min="0" max="100" value={taxRateGeral} onChange={(e) => setTaxRateGeral(e.target.value === "" ? "" : Math.min(100, Math.max(0, Number(e.target.value))))} />
          </div>
          <div className="field-hint">Use a porcentagem que o seu contador informou. Se quiser que o app estime esse número a partir do faturamento da empresa, escolha “Calcular para mim”.</div>
        </>
      ) : (
        <p className="regime-desc" style={{ marginBottom: 0 }}>Responda às 3 perguntas abaixo. O app estima os impostos da empresa e passa a usar esse resultado para calcular o valor líquido dos seus plantões.</p>
      )}
    </div>
  );
  if (!usaContab) return <div>{modoCard}</div>;
  return (
    <div>
      {modoCard}

      <div className="card" id="contab-form">
        <div className="card-head"><h3 className="card-title">Sobre a sua empresa</h3></div>
        <div className="ct-q">
          <b>1. Como a empresa paga imposto?</b>
          <div className="segmented" role="group" aria-label="Regime tributário">
            <button className={`seg-btn ${isS ? "active" : ""}`} onClick={() => set("regime", "simples")}>Simples Nacional</button>
            <button className={`seg-btn ${!isS ? "active" : ""}`} onClick={() => set("regime", "presumido")}>Lucro Presumido</button>
          </div>
          <div className="field-hint" style={{ marginTop: 0 }}>{isS ? "No Simples, a empresa paga uma guia única por mês, o DAS." : "No Lucro Presumido, a empresa paga vários impostos separados, com alíquotas fixas."} Se não souber qual é o seu, pergunte ao contador.</div>
        </div>
        <div className="ct-q">
          <b>2. Quanto a empresa recebe por mês?</b>
          {num("receitaMes", "Valor total das notas do mês (R$)", null,
            app.mesBruto > 0 ? <button type="button" className="link-btn" onClick={() => set("receitaMes", String(r2(app.mesBruto)))}>Usar {fmtBRL(app.mesBruto)} de {app.mesLabel}, lançados no app</button> : null)}
        </div>
        <div className="ct-q">
          <b>3. Quanto você retira de pró-labore por mês?</b>
          {num("proLabore", "Pró-labore (R$)", "É o seu “salário” como sócio, definido com o contador. O resto do que sobra na empresa você retira como lucro.")}
        </div>
        <details className="cfg ct-mais">
          <summary>Mais opções (não são obrigatórias)</summary>
          <div className="form-grid" style={{ marginTop: 10 }}>
            {num("rbt12", "Faturamento dos últimos 12 meses (R$)", "Em branco, o app usa 12 vezes o valor do mês.",
              app.rbt12 > 0 ? <button type="button" className="link-btn" onClick={() => set("rbt12", String(r2(app.rbt12)))}>Usar {fmtBRL(app.rbt12)} do app ({app.meses} de 12 meses com dados)</button> : null)}
            {num("folha", "Salários de funcionários (R$ por mês)", "Deixe em branco se não tiver funcionários.")}
            {!isS && num("issPct", "ISS da sua cidade (%)", "Varia de 2% a 5%, conforme o município.")}
            {num("contador", "Mensalidade do contador (R$)", "Não é imposto, mas reduz o que sobra.")}
          </div>
          {!isS && (
            <label className="ct-check">
              <input type="checkbox" checked={!!contab.hospitalar} onChange={(e) => set("hospitalar", e.target.checked)} />
              <span>Minha empresa tem equiparação hospitalar<small>Reduz o imposto sobre o lucro. Vale só para serviços hospitalares de empresas que cumprem regras específicas; consultas não entram. Confirme com o contador.</small></span>
            </label>
          )}
        </details>
      </div>

      {!has ? (
        <div className="card"><div className="empty-state">Informe quanto a empresa recebe por mês para ver o resultado. Até lá, o app continua usando {pct(Number(taxRateGeral) || 0)}.</div></div>
      ) : (
        <>
          <div className="card" id="contab-resumo">
            <div className="card-head"><h3 className="card-title">Resultado</h3><span className="card-note">estimativa por mês</span></div>
            <p className="ct-frase">De cada <b>R$ 100</b> que a empresa recebe, cerca de <b style={{ color: "var(--brick)" }}>{fmtBRL(res.carga)}</b> vão para impostos.</p>
            <div className="ct-bar" role="img" aria-label={partes.map((x) => `${x[0]}: ${fmtBRL(x[1])}`).join("; ")}>
              {partes.map((x) => <i key={x[0]} style={{ width: `${(x[1] / somaPartes) * 100}%`, background: x[2] }} />)}
            </div>
            <div className="ct-leg">
              {partes.map((x) => <div key={x[0]}><span><i style={{ background: x[2] }} />{x[0]}</span><b className="mono">{fmtBRL(x[1])}</b></div>)}
            </div>
            <div className="quote-msg ok" role="status" style={{ margin: "14px 0 0" }}>O app passou a usar {pct(res.carga)} como imposto dos seus plantões e vínculos.</div>
          </div>

          {p.proLabore <= 0 && <div className="note-warn">Informe o pró-labore. Sócio que trabalha na empresa precisa retirar pelo menos um salário mínimo ({fmtBRL(SALARIO_MINIMO_2026)}).</div>}
          {p.proLabore > 0 && p.proLabore < SALARIO_MINIMO_2026 && <div className="note-warn">O pró-labore informado está abaixo do salário mínimo, de {fmtBRL(SALARIO_MINIMO_2026)}.</div>}
          {isS && simples.faixa.acimaDoLimite && <div className="note-warn">O faturamento de 12 meses passa de R$ 4,8 milhões, o limite do Simples Nacional.</div>}

          <div className="card" id="contab-lista">
            <div className="card-head"><h3 className="card-title">O que é pago todo mês</h3></div>
            {simplesLista.map((x) => (
              <div key={x[0]} className="ct-item"><div><b>{x[0]}</b><small>{x[1]}</small></div><b className="mono">{fmtBRL(x[2])}</b></div>
            ))}
            <div className="tax-total"><span>Total de impostos</span><b className="mono">{fmtBRL(res.total)}</b></div>
            {res.retencaoLucros > 0 && <div className="note-warn" style={{ marginTop: 12, marginBottom: 0 }}>O lucro do mês passa de R$ 50 mil. Desde 2026, retiradas de lucro acima desse valor podem ter 10% de imposto de renda retido, cerca de {fmtBRL(res.retencaoLucros)} neste caso. Esse valor não está somado acima. Fale com o contador.</div>}
          </div>

          {isS && (
            <div className="card" id="contab-dica">
              <div className="card-head"><h3 className="card-title">Dá para pagar menos?</h3></div>
              {simples.anexo === "V" ? (
                ganhoFatorR > 0
                  ? <p className="regime-desc" style={{ margin: 0 }}>Talvez. Hoje a empresa cai na tabela mais cara do Simples, porque o pró-labore é baixo perto do faturamento. Com pró-labore de <b className="mono">{fmtBRL(Math.max(plAlvo, p.proLabore))}</b>, ela passaria para a tabela mais barata, e o total de impostos cairia cerca de <b className="mono" style={{ color: "var(--teal)" }}>{fmtBRL(ganhoFatorR)}</b> por mês. Leve esse número ao seu contador antes de mudar.</p>
                  : <p className="regime-desc" style={{ margin: 0 }}>Nesta simulação, não. A empresa está na tabela mais cara do Simples, mas subir o pró-labore para mudar de tabela custaria mais em INSS e imposto de renda do que a economia.</p>
              ) : (
                <p className="regime-desc" style={{ margin: 0 }}>A empresa já está na tabela mais barata do Simples. Para continuar nela, o pró-labore precisa ficar em pelo menos <b className="mono">{fmtBRL(plAlvo)}</b> por mês. Abaixo disso, o DAS subiria de {fmtBRL(simples.itens[0].valor)} para {fmtBRL(alt.itens[0].valor)}.</p>
              )}
            </div>
          )}

          <div className="card" id="contab-outro">
            <div className="card-head"><h3 className="card-title">E no outro regime?</h3></div>
            <p className="regime-desc" style={{ margin: 0 }}>
              No {isS ? "Lucro Presumido" : "Simples Nacional"}, com os mesmos dados, os impostos seriam de <b className="mono">{fmtBRL(outro.total)}</b> por mês{dif < 0.01 ? ", o mesmo valor." : <>: <b className="mono" style={{ color: outro.total > res.total ? "var(--brick)" : "var(--teal)" }}>{fmtBRL(dif)} {outro.total > res.total ? "a mais" : "a menos"}</b>.</>} A troca de regime só costuma ser possível na virada do ano e depende de outros fatores, então decida com o contador.
            </p>
          </div>

          <details className="card ct-details" id="contab-detalhe">
            <summary>Ver a conta detalhada</summary>
            <div className="ct-details-body">
              {isS && (
                <div id="contab-passos">
                  <div className="wr-sub" style={{ marginTop: 6 }}>Como o DAS é calculado (Anexo {simples.anexo})</div>
                  <ol className="ct-steps">
                    <li>
                      <b>Fator R: {pct(simples.fatorR * 100)}</b>
                      <span className="mono">{fmtBRL(simples.folha12)} de folha em 12 meses ÷ {fmtBRL(simples.rbt12)} de faturamento</span>
                      <div className="fr-track"><i style={{ width: `${Math.min(100, (simples.fatorR / 0.5) * 100)}%`, background: simples.fatorR >= FATOR_R_MIN ? "var(--teal)" : "var(--gold)" }} /><em style={{ left: "56%" }}>28%</em></div>
                      <span>{simples.fatorR >= FATOR_R_MIN ? "Com 28% ou mais, serviços médicos são tributados pelo Anexo III, de alíquotas menores." : "Abaixo de 28%, serviços médicos são tributados pelo Anexo V, de alíquotas maiores."}</span>
                    </li>
                    <li><b>{simples.faixa.faixa}ª faixa do Anexo {simples.anexo}</b><span>Faturamento de 12 meses de até {fmtBRL(simples.faixa.limite)}: alíquota nominal de {pct(simples.faixa.nominal, 1)} e parcela a deduzir de {fmtBRL(simples.faixa.deduz)}.</span></li>
                    <li><b>Alíquota efetiva: {pct(simples.faixa.efetiva)}</b><span className="mono">({fmtBRL(simples.rbt12)} × {pct(simples.faixa.nominal, 1)} − {fmtBRL(simples.faixa.deduz)}) ÷ {fmtBRL(simples.rbt12)}</span></li>
                    <li><b>DAS do mês: {fmtBRL(simples.itens[0].valor)}</b><span className="mono">{fmtBRL(simples.receita)} × {pct(simples.faixa.efetiva)}</span></li>
                  </ol>
                </div>
              )}
              <div id="contab-tributos">
                <div className="wr-sub">Tributo por tributo ({isS ? "Simples Nacional" : "Lucro Presumido"})</div>
                <div className="tax-group">Pagos pela empresa<b className="mono">{fmtBRL(res.empresa)}</b></div>
                {res.itens.filter((i) => i.quem === "empresa").map(linha)}
                <div className="tax-group">Descontados do pró-labore do sócio<b className="mono">{fmtBRL(res.socio)}</b></div>
                {res.itens.filter((i) => i.quem === "socio").map(linha)}
                <div className="tax-total"><span>Total no mês</span><b className="mono">{fmtBRL(res.total)}</b></div>
                {!isS && presumido.excedente > 0 && <div className="field-hint">Como o faturamento anual passa de R$ 5 milhões, a conta aplica o acréscimo de 10% no lucro presumido sobre o excedente (LC 224/2025), regra em discussão na Justiça.</div>}
              </div>
              <div id="contab-comparar">
                <div className="wr-sub">Comparação entre os regimes</div>
                <div className="cmp-grid">{col(simples, "Simples Nacional", "simples")}{col(presumido, "Lucro Presumido", "presumido")}</div>
              </div>
              <div id="contab-notas">
                <div className="wr-sub">O que a conta considera</div>
                <ul className="notes">
                  <li>Regras de 2026: tabelas dos Anexos III e V do Simples, tabela mensal do IRRF e teto do INSS de {fmtBRL(INSS_TETO_2026)}.</li>
                  <li>O Fator R é estimado com o pró-labore e os salários atuais multiplicados por 12. O cálculo oficial usa os 12 meses anteriores.</li>
                  <li>No Lucro Presumido, IRPJ e CSLL são trimestrais e aparecem divididos por mês. O lucro presumido acima de R$ 20 mil por mês paga adicional de 10% de IRPJ.</li>
                  <li>Ficam de fora: ISS fixo de sociedade de profissionais, retenções feitas na nota fiscal, encargos de terceiros sobre salários, dependentes no IRRF, o Lucro Real e os novos tributos da reforma tributária (CBS e IBS).</li>
                </ul>
              </div>
            </div>
          </details>
        </>
      )}
      <div className="footnote" style={{ margin: "4px 0 0", padding: 0, textAlign: "left" }}>Os valores são estimativas com as regras de 2026, para dar uma ideia do custo. Eles não substituem o seu contador.</div>
    </div>
  );
}

function DashboardTab({ viewMonth, viewYear, patrimonioTotal, saldoRealizado, totalInvestedAllTime, totalNet, totalPendingExpenses, alerts, history12, goals, generateMonthlyReport, setActiveTab, curStats, prevStats, portfolio, chartMonths, setChartMonths, goMonth, quickGo, setup, monthExpenseItems, limits, monthShiftsCount, insights, workCard, workCur, desk, fluxoDia, monthIncomeItems = [], vincData = [] }) {
  const gv = useGv();
  const todayIso = todayStr();
  const h = new Date().getHours();
  const hello = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const byCat = useMemo(() => {
    const map = {};
    monthExpenseItems.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([id, value]) => { const m = EXP_CAT_MAP[id] || EXP_CAT_MAP.outros; return { id, nome: m.label, value, cor: m.color }; }).sort((a, b) => b.value - a.value);
  }, [monthExpenseItems]);
  const spentAll = byCat.reduce((a, c) => a + c.value, 0);
  const limited = Object.keys(limits).filter((c) => c !== "__total").map((c) => {
    const m = EXP_CAT_MAP[c] || EXP_CAT_MAP.outros; const sp = (byCat.find((x) => x.id === c) || {}).value || 0;
    return { id: c, m, sp, lim: limits[c], pct: sp / limits[c] };
  }).sort((a, b) => b.pct - a.pct).slice(0, 4);
  const upcoming = monthExpenseItems.filter((e) => !e.paid).sort((a, b) => a.dateIso.localeCompare(b.dateIso)).slice(0, 5);
  const steps = [
    { done: setup.vinculos > 0, label: "Cadastre onde você trabalha", go: () => setActiveTab("faturamento"), cta: "Cadastrar" },
    { done: setup.shifts > 0, label: "Lance seus plantões", go: () => quickGo("plantao"), cta: "Lançar" },
    { done: setup.expenses > 0, label: "Registre suas despesas", go: () => quickGo("despesa"), cta: "Adicionar" },
    { done: setup.investments > 0, label: "Registre seus investimentos", go: () => quickGo("aporte"), cta: "Adicionar" },
  ];
  const pending = steps.filter((x) => !x.done);

  const prevNome = MONTHS_PT[(viewMonth + 11) % 12].toLowerCase();
  if (desk) {
    const sobra = curStats.net - curStats.expTotal;
    const hs = history12.slice(-12);
    const metasNoRitmo = goals.length;
    return (
      <div className="desk">
        <div className="greet"><h2>{hello}!</h2><p>Este é o painel de {MONTHS_PT[viewMonth].toLowerCase()} de {viewYear}.</p></div>
        {alerts.length > 0 && (
          <div className="alert-strip">
            {alerts.slice(0, 3).map((a) => <div key={a.id} className={`alert-item alert-${a.level}`}><span className="al-dot" />{a.text}</div>)}
          </div>
        )}
        <div className="dkpis">
          <DKpi label="Receita líquida" value={fmtBRL(curStats.net)} sub={deltaTxt(curStats.net, prevStats.net, prevNome)} subTone={curStats.net >= prevStats.net ? "#15803D" : "#B91C1C"} spark={hs.map((h) => h.value)} sparkColor="#16A34A" />
          <DKpi label="Despesas" value={fmtBRL(curStats.expTotal)} sub={deltaTxt(curStats.expTotal, prevStats.expTotal, prevNome)} subTone={curStats.expTotal <= prevStats.expTotal ? "#15803D" : "#B91C1C"} spark={hs.map((h) => h.expenses)} sparkColor="#F59E0B" />
          <DKpi label="Sobra do mês" value={fmtBRL(sobra)} tone={sobra < 0 ? "#B91C1C" : null} sub={curStats.net > 0 ? Math.round((sobra / curStats.net) * 100) + "% da receita" : null} subTone="#15803D" spark={hs.map((h) => h.value - h.expenses)} sparkColor="#0F766E" />
          <DKpi label="Patrimônio" value={fmtBRL(patrimonioTotal)} sub={"investido " + fmtBRL(portfolio.totalValue || totalInvestedAllTime)} subTone="#64748B" spark={hs.map((h) => h.invested)} sparkColor="#7C3AED" />
        </div>
        <div className="dgrid" style={{ gridTemplateColumns: "1.9fr 1fr" }}>
          <div className="card"><div className="card-head"><h3 className="card-title">Dinheiro do mês, dia a dia</h3><span className="card-note">o que entrou menos o que saiu · tracejado é previsão</span></div><DFluxo fluxoDia={fluxoDia} viewYear={viewYear} viewMonth={viewMonth} /></div>
          <div className="card"><div className="card-head"><h3 className="card-title">Próximos lançamentos</h3><span className="card-note">entra e sai</span></div><DProximos incomeItems={monthIncomeItems} expenseItems={monthExpenseItems} max={5} onVer={() => setActiveTab("despesas")} /></div>
        </div>
        <DGrid>
          <DGv id="ini-12m" open icon={<IconTrending size={18} />} title="Receitas x despesas" sub={`últimos ${chartMonths} meses`} val={"sobra média " + fmtBRL(history12.length ? history12.reduce((a, h) => a + h.value - h.expenses, 0) / history12.length : 0)}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}><RangeTabs value={chartMonths} onChange={setChartMonths} /></div>
            <SvgDualBarChart data={history12} height={230} onOpen={(d) => goMonth(d.y, d.m)} />
          </DGv>
          <DGv id="ini-vinc" icon={<IconReceipt size={18} />} tone="#2563EB" title="Receita por vínculo" sub={vincData.length ? `${vincData[0].nome} é o maior` : "sem receitas"} val={vincData.length + " fonte" + (vincData.length === 1 ? "" : "s")}>
            {vincData.length === 0 ? <div className="empty-state">Nenhuma receita ainda.</div> : <InteractiveDonut data={vincData.map((h) => ({ nome: h.nome, value: h.value, cor: h.cor }))} size={170} stroke={22} centerLabel="mês" />}
          </DGv>
          <DGv id="ini-hora" icon={<IconCalendar size={18} />} tone="#DB2777" title="Ganho por hora e trabalho" sub={`${monthShiftsCount} plantões · ${workCur.dias} dias trabalhados`} val={workCur.hourly > 0 ? fmtBRL(workCur.hourly) + "/h" : "—"}>{workCard}</DGv>
          <DGv id="ini-cat" icon={<IconWallet size={18} />} tone="#F59E0B" title="Gastos por categoria" sub={byCat.length ? `${byCat[0].nome} é o maior gasto` : "sem despesas"} val={fmtBRL(spentAll)}>
            {byCat.length === 0 ? <div className="empty-state">Nenhuma despesa neste mês ainda.</div> : <InteractiveDonut data={byCat} size={170} stroke={22} centerLabel="gasto no mês" />}
          </DGv>
          <DGv id="ini-teto" icon={<IconTarget size={18} />} tone="#0F766E" title="Teto de gastos" sub={limits.__total > 0 ? `${Math.round((spentAll / limits.__total) * 100)}% do teto usado` : "ainda não definido"} val={limits.__total > 0 ? fmtBRL(limits.__total) : ""}>
            {limits.__total > 0 && <LimitRow label="Limite geral do mês" spent={spentAll} limit={limits.__total} color={TEAL} />}
            {limited.map((x) => <LimitRow key={x.id} label={x.m.label} spent={x.sp} limit={x.lim} color={x.m.color} icon={<ExpIcon id={x.id} size={17} color={x.m.color} />} />)}
            {Object.keys(limits).length === 0 && <div className="empty-state" style={{ padding: "10px 0" }}>Defina o teto em Metas. O app avisa em 80% e quando passar.</div>}
            <button className="link-btn" onClick={() => setActiveTab("metas")}>gerenciar teto</button>
          </DGv>
          <DGv id="ini-metas" icon={<IconTarget size={18} />} tone="#7C3AED" title="Metas" sub={goals.length ? goals.slice(0, 2).map((g) => g.nome).join(" · ") : "nenhuma meta ainda"} val={metasNoRitmo ? metasNoRitmo + " meta" + (metasNoRitmo === 1 ? "" : "s") : ""}>
            {goals.length === 0 ? <div className="empty-state">Defina uma meta para acompanhar aqui.</div> : <div className="dmetas">{goals.map((g) => {
              const at = g.fonte === "carteira" ? (portfolio.totalValue || 0) : g.fonte === "patrimonio" ? Math.max(0, patrimonioTotal) : Number(g.valorAtual) || 0;
              const pct = Math.min(100, (at / Math.max(g.valorAlvo, 1)) * 100);
              return <div key={g.id}><Ring pct={pct} size={58} stroke={7} color={g.cor}><b style={{ fontSize: 12 }}>{pct.toFixed(0)}%</b></Ring><span><b>{g.nome}</b><small className="mono">{fmtBRL(at)} de {fmtBRL(g.valorAlvo)}</small></span></div>;
            })}</div>}
          </DGv>
          <DGv id="ini-ins" wide icon={<IconTrending size={18} />} tone="#A16207" title="Insights do mês" sub={insights.length ? insights[0].title : "nada novo por enquanto"} val={insights.length ? insights.length + (insights.length === 1 ? " novidade" : " novidades") : ""}>
            <InsightList items={insights} max={6} />
          </DGv>
        </DGrid>
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={generateMonthlyReport}><IconFileText size={15} /> Baixar relatório do mês (PDF)</button>
      </div>
    );
  }
  return (
    <div>
      <div className="greet"><h2>{hello}!</h2><p>Este é o resumo de {MONTHS_PT[viewMonth].toLowerCase()} de {viewYear}.</p></div>

      {alerts.length > 0 && (
        <div className="alert-strip">
          {alerts.slice(0, 3).map((a) => <div key={a.id} className={`alert-item alert-${a.level}`}><span className="al-dot" />{a.text}</div>)}
        </div>
      )}

      <div className="balance-card">
        <div className="bc-top">Saldo em caixa</div>
        <div className="bc-value mono" style={saldoRealizado < 0 ? { color: "var(--brick)" } : null}><CountUp value={saldoRealizado} /></div>
        <div className="bc-sub">Patrimônio total <b className="mono">{fmtBRL(patrimonioTotal)}</b> · investido <b className="mono">{fmtBRL(portfolio.totalValue || totalInvestedAllTime)}</b></div>
        <div className="bc-flows">
          <div className="flow"><span className="flow-ico in"><IconArrowIn size={18} /></span><div><span>Receitas do mês</span><b className="mono">{fmtBRL(curStats.net)}</b><Delta now={curStats.net} prev={prevStats.net} /></div></div>
          <div className="flow"><span className="flow-ico out"><IconArrowOut size={18} /></span><div><span>Despesas do mês</span><b className="mono">{fmtBRL(curStats.expTotal)}</b><Delta now={curStats.expTotal} prev={prevStats.expTotal} invert /></div></div>
          <div className="flow"><span className="flow-ico inv"><IconTrending size={18} /></span><div><span>Investido no mês</span><b className="mono">{fmtBRL(curStats.invested)}</b></div></div>
        </div>
      </div>

      {workCard}

      <div className={"card " + gv.c("insights")}>
        <div className="card-head"><h3 className="card-title gv-t" {...gv.t("insights")}>Insights do mês</h3>{insights.length > 4 && <button className="link-btn" onClick={() => setActiveTab("visao")}>ver todos ({insights.length})</button>}</div>
        <InsightList items={insights} max={4} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3 className="card-title">Receitas x despesas</h3><RangeTabs value={chartMonths} onChange={setChartMonths} /></div>
          <SvgDualBarChart data={history12} height={210} onOpen={(d) => goMonth(d.y, d.m)} />
        </div>
        <div className="card">
          <div className="card-head"><h3 className="card-title">Gastos por categoria</h3><button className="link-btn" onClick={() => setActiveTab("despesas")}>ver despesas</button></div>
          {byCat.length === 0 ? <div className="empty-state">Nenhuma despesa neste mês ainda.</div> : <InteractiveDonut data={byCat} size={160} stroke={22} centerLabel="gasto no mês" />}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3 className="card-title">Teto de gastos</h3><button className="link-btn" onClick={() => setActiveTab("metas")}>{Object.keys(limits).length ? "gerenciar" : "definir"}</button></div>
          {limits.__total > 0 && <LimitRow label="Limite geral do mês" spent={spentAll} limit={limits.__total} color={TEAL} />}
          {limited.map((x) => <LimitRow key={x.id} label={x.m.label} spent={x.sp} limit={x.lim} color={x.m.color} icon={<ExpIcon id={x.id} size={17} color={x.m.color} />} />)}
          {Object.keys(limits).length === 0 && <div className="empty-state" style={{ padding: "10px 0" }}>Defina quanto quer gastar por categoria. O app avisa quando chegar a 80% e quando passar do limite.</div>}
        </div>
        <div className="card">
          <div className="card-head"><h3 className="card-title">Próximas contas</h3><button className="link-btn" onClick={() => setActiveTab("despesas")}>ver todas</button></div>
          {upcoming.length === 0 ? <div className="empty-state" style={{ padding: "10px 0" }}>Nenhuma conta pendente neste mês.</div> : upcoming.map((e) => {
            const m = EXP_CAT_MAP[e.category] || EXP_CAT_MAP.outros; const di = dueInfo(e.dateIso, todayIso, e.paid);
            return (
              <div key={e.key} className="tx-row">
                <span className="tx-ico" style={{ background: m.color + "1a" }}><ExpIcon id={m.id} size={18} color={m.color} /></span>
                <div className="tx-main"><div className="tx-title">{e.description}</div><div className="tx-sub"><span className={`due ${di.cls}`}>{di.text}</span></div></div>
                <div className="tx-right"><span className="tx-amt mono">{fmtBRL(e.amount)}</span><button className="tx-status open" onClick={e.toggle}>Pagar</button></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3 className="card-title">Seu mês de trabalho</h3><button className="link-btn" onClick={() => setActiveTab("calendario")}>abrir agenda</button></div>
          <div className="work-grid">
            <div><span>Plantões</span><b className="mono">{monthShiftsCount}</b></div>
            <div><span>Dias trabalhados</span><b className="mono">{workCur.dias}</b></div>
            <div><span>Horas por semana</span><b className="mono">{fmtHoras(curStats.hours / (new Date(viewYear, viewMonth + 1, 0).getDate() / 7))}</b></div>
            <div><span>A receber</span><b className="mono">{fmtBRL(totalNet)}</b></div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3 className="card-title">Metas</h3><button className="link-btn" onClick={() => setActiveTab("metas")}>{goals.length ? "ver todas" : "criar meta"}</button></div>
          {goals.length === 0 ? <div className="empty-state" style={{ padding: "8px 0" }}>Defina uma meta para acompanhar o progresso aqui.</div> : (
            [...goals].slice(0, 3).map((g) => {
              const atualMeta = g.fonte === "carteira" ? (portfolio.totalValue || 0) : g.fonte === "patrimonio" ? Math.max(0, patrimonioTotal) : Number(g.valorAtual) || 0;
              const pct = Math.min(100, (atualMeta / Math.max(g.valorAlvo, 1)) * 100);
              return (
                <div key={g.id} className="goal-line">
                  <div className="goal-top"><span className="rank-name">{g.nome}</span><span className="mono">{pct.toFixed(0)}%</span></div>
                  <div className="lim-bar" style={{ margin: "6px 0" }}><div style={{ width: `${pct}%`, background: g.cor }} /></div>
                  <div className="line-sub mono">{fmtBRL(atualMeta)} de {fmtBRL(g.valorAlvo)}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <button className="btn btn-ghost" onClick={generateMonthlyReport}><IconFileText size={15} /> Baixar relatório do mês (PDF)</button>
    </div>
  );
}

function ExpenseEditForm({ item, onSubmit, onCancel, onDelete }) {
  const rec = item.tipo === "recorrente";
  const [description, setDescription] = useState(item.description || "");
  const [amount, setAmount] = useState(Number(item.amount) || 0);
  const [dueDate, setDueDate] = useState(item.dateIso);
  const [dia, setDia] = useState(Number(String(item.dateIso || "").slice(8, 10)) || 5);
  const [category, setCategory] = useState(item.category || "outros");
  const [modo, setModo] = useState("diante");
  const [dedutivel, setDedutivel] = useState(ehDedutivel(item));
  const [erro, setErro] = useState("");
  const submit = () => {
    if (!description.trim()) { setErro("Dê um nome para a conta."); return; }
    if (!(Number(amount) > 0)) { setErro("Informe o valor."); return; }
    onSubmit({ description: description.trim(), amount: Number(amount), dueDate, diaVencimento: Number(dia) || 5, category, dedutivel }, modo);
  };
  return (
    <div className="mini-form">
      <div className="form-grid">
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>Descrição</label><input value={description} onChange={(e) => { setDescription(e.target.value); setErro(""); }} /></div>
        <div className="field"><label>Valor (R$)</label><MoneyInput value={amount} onChange={(v) => { setAmount(v); setErro(""); }} /></div>
        {rec
          ? <div className="field"><label>Vence todo dia</label><input type="number" min="1" max="31" value={dia} onChange={(e) => setDia(e.target.value)} /></div>
          : <div className="field"><label>Vencimento</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>}
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>Categoria</label>
          <select value={category} onChange={(e) => { setCategory(e.target.value); if (item.dedutivel === undefined) setDedutivel(["saude", "educacao"].includes(e.target.value)); }}>{EXP_CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        </div>
        <label className="ct-check" style={{ gridColumn: "1 / -1", marginTop: 0 }}>
          <input type="checkbox" checked={dedutivel} onChange={(e) => setDedutivel(e.target.checked)} />
          <span>Dedutível no imposto de renda<small>Saúde e escola já vêm marcadas. Use também para cursos, congressos e anuidade do conselho, para o relatório do contador.</small></span>
        </label>
        {rec && (
          <div className="field" style={{ gridColumn: "1 / -1" }}><label>A mudança vale para</label>
            <div className="chip-row" role="group" aria-label="A mudança vale para">
              {[["diante", "Este mês em diante"], ["mes", "Só este mês"]].map(([k, l]) => <button key={k} type="button" className={`chip sm ${modo === k ? "active" : ""}`} aria-pressed={modo === k} onClick={() => setModo(k)}>{l}</button>)}
            </div>
            <div className="field-hint">Os meses que já passaram não mudam.</div>
          </div>
        )}
      </div>
      {erro && <div className="note-bad" style={{ marginTop: 8 }}>{erro}</div>}
      <FormBtns label="Salvar alterações" onSubmit={submit} onCancel={onCancel} onDelete={onDelete} />
    </div>
  );
}

// ---- teto de gastos do mês (antes ficava em Despesas): geral no topo, por categoria em gaveta ----
function TetoGastos({ monthExpenseItems = [], limits = {}, setLimit, viewYear, viewMonth }) {
  const [editGeral, setEditGeral] = useState(false);
  const [valor, setValor] = useState("");
  const [catAberta, setCatAberta] = useState(false);
  const [editing, setEditing] = useState(null);
  const [addCat, setAddCat] = useState("");
  const [extraCats, setExtraCats] = useState([]);
  const total = monthExpenseItems.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const spentBy = {}; monthExpenseItems.forEach((e) => { spentBy[e.category] = (spentBy[e.category] || 0) + (Number(e.amount) || 0); });
  const catIds = [...new Set(Object.keys(spentBy).concat(Object.keys(limits).filter((c) => c !== "__total"), extraCats))]
    .sort((a, b) => ((spentBy[b] || 0) / (limits[b] || 1e9)) - ((spentBy[a] || 0) / (limits[a] || 1e9)) || (spentBy[b] || 0) - (spentBy[a] || 0));
  const freeCats = EXP_CATS.filter((c) => !catIds.includes(c.id));
  const lim = Number(limits.__total) || 0, pct = lim ? total / lim : 0, falta = lim - total;
  const agora = new Date(), N = new Date(viewYear, viewMonth + 1, 0).getDate();
  const rel = viewYear * 12 + viewMonth - (agora.getFullYear() * 12 + agora.getMonth());
  const diasRest = rel === 0 ? N - agora.getDate() + 1 : rel > 0 ? N : 0;
  const cor = pct >= 1 ? "#DC2626" : pct >= 0.8 ? "#F59E0B" : "#16A34A";
  const comLimite = catIds.filter((c) => limits[c]);
  const passou = comLimite.filter((c) => (spentBy[c] || 0) > limits[c]);
  return (
    <div className="card tt" id="teto-card">
      <div className="card-head"><h3 className="card-title">Teto de gastos do mês</h3>{lim > 0 && !editGeral && <button className="link-btn" onClick={() => { setValor(lim); setEditGeral(true); }}>editar</button>}</div>
      {editGeral ? (
        <div>
          <div className="field"><label htmlFor="tt-valor">Quanto você quer gastar no mês (R$)</label><MoneyInput id="tt-valor" value={valor} onChange={setValor} /></div>
          <FormBtns label="Salvar teto" onSubmit={() => { setLimit("__total", Number(valor) || 0); setEditGeral(false); }} onCancel={() => setEditGeral(false)} onDelete={lim ? () => { setLimit("__total", 0); setEditGeral(false); } : null} />
        </div>
      ) : !lim ? (
        <div>
          <p className="line-sub" style={{ marginTop: 0 }}>Defina quanto quer gastar por mês. O app avisa quando você passar de 80% e de 100%.</p>
          <button className="btn btn-primary" onClick={() => { setValor(""); setEditGeral(true); }}>Definir teto</button>
        </div>
      ) : (
        <div>
          <div className="tt-big"><b className="mono">{fmtBRL(total)}</b><span className="mono">de {fmtBRL(lim)}</span></div>
          <div className="tt-bar"><i style={{ width: Math.min(100, pct * 100) + "%", background: cor }} /></div>
          <div className="tt-sub">{Math.round(pct * 100)}% usado · {falta >= 0
            ? <>faltam <b>{fmtBRL(falta)}</b>{diasRest > 0 && falta > 0 ? <>, cerca de {fmtBRL(falta / diasRest)} por dia</> : null}</>
            : <>passou <b className="tt-neg">{fmtBRL(-falta)}</b> do teto</>}</div>
          <div className="field-hint">O app avisa quando você passar de 80% e de 100% do teto.</div>
        </div>
      )}
      <button type="button" className="fz-add tt-cat" aria-expanded={catAberta} onClick={() => setCatAberta(!catAberta)}>
        <i aria-hidden="true">≡</i><span>Teto por categoria<small>{comLimite.length ? `${comLimite.length} ${comLimite.length === 1 ? "categoria" : "categorias"}${passou.length ? ` · ${passou.length} ${passou.length === 1 ? "passou" : "passaram"} do teto` : ""}` : "nenhuma definida"}</small></span><em aria-hidden="true">›</em>
      </button>
      {catAberta && (
        <div className="tt-cats">
          {catIds.length === 0 && <div className="field-hint">Ainda não há despesas neste mês.</div>}
          {catIds.map((c) => { const m = EXP_CAT_MAP[c] || EXP_CAT_MAP.outros; return (
            <LimitRow key={c} catId={c} label={m.label} spent={spentBy[c] || 0} limit={limits[c] || 0} color={m.color} icon={<ExpIcon id={c} size={17} color={m.color} />}
              editing={editing === c} onEdit={() => setEditing(c)} onCancel={() => setEditing(null)} onSave={(v) => { setLimit(c, v); setEditing(null); }} />
          ); })}
          {freeCats.length > 0 && (
            <div className="lim-add">
              <select value={addCat} onChange={(e) => setAddCat(e.target.value)}>
                <option value="">Teto para outra categoria…</option>
                {freeCats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <button className="btn btn-ghost sm" disabled={!addCat} onClick={() => { setExtraCats((p) => [...p, addCat]); setEditing(addCat); setAddCat(""); }}>Adicionar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoalEditForm({ g, onSave, onCancel, onDelete }) {
  const [nome, setNome] = useState(g.nome || "");
  const [valorAlvo, setValorAlvo] = useState(Number(g.valorAlvo) || 0);
  const [valorAtual, setValorAtual] = useState(Number(g.valorAtual) || 0);
  const [prazo, setPrazo] = useState(g.prazo || "");
  const [cor, setCor] = useState(g.cor || GOLD);
  const manual = (g.fonte || "manual") === "manual";
  return (
    <div className="mini-form">
      <div className="form-grid">
        <div className="field"><label>Nome da meta</label><input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div className="field"><label>Valor alvo (R$)</label><MoneyInput value={valorAlvo} onChange={setValorAlvo} /></div>
        {manual && <div className="field"><label>Valor já acumulado (R$)</label><MoneyInput value={valorAtual} onChange={setValorAtual} /></div>}
        <div className="field"><label>Prazo</label><input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
        <div className="field color-field"><label>Cor</label><div className="color-input-wrap"><input type="color" value={cor} onChange={(e) => setCor(e.target.value)} /></div></div>
      </div>
      <FormBtns label="Salvar alterações" onSubmit={() => { if (!nome.trim() || !(Number(valorAlvo) > 0)) return; onSave({ nome: nome.trim(), valorAlvo: Number(valorAlvo), ...(manual ? { valorAtual: Number(valorAtual) || 0 } : {}), prazo: prazo || null, cor }); }} onCancel={onCancel} onDelete={onDelete} />
    </div>
  );
}

// em quantos meses a meta chega, com o aporte e o rendimento escolhidos (mesma conta da projeção)
const mesesAteMeta = (g, atual, aporteSugerido) => {
  const alvo = Number(g.valorAlvo) || 0;
  const manualAp = g.aporteMensal !== null && g.aporteMensal !== undefined && g.aporteMensal !== "";
  const aporte = manualAp ? Math.max(0, Number(g.aporteMensal) || 0) : Math.max(0, Math.round(aporteSugerido || 0));
  const rAno = Number(g.rendimentoAno) || 0, r = rAno > 0 ? Math.pow(1 + rAno / 100, 1 / 12) - 1 : 0;
  let v = Math.max(0, atual); if (v >= alvo) return 0;
  for (let k = 1; k <= 600; k++) { v = v * (1 + r) + aporte; if (v >= alvo) return k; }
  return null;
};

// ---- print da corretora: o texto é lido no próprio aparelho (Tesseract), sem enviar a imagem para ninguém ----
const TESS_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  await new Promise((res, rej) => {
    const sc = document.createElement("script");
    sc.src = TESS_URL; sc.onload = res;
    sc.onerror = () => rej(new Error("Não consegui carregar o leitor de imagem. Verifique a internet e tente de novo."));
    document.head.appendChild(sc);
  });
  return window.Tesseract;
}
// deixa o print mais fácil de ler: aumenta, passa para cinza e clareia o fundo escuro (modo escuro das corretoras)
async function prepararPrint(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Não consegui abrir essa imagem.")); i.src = url; });
    const esc = Math.min(3, Math.max(1, 1600 / Math.max(1, img.width)));
    const cv = document.createElement("canvas"); cv.width = Math.round(img.width * esc); cv.height = Math.round(img.height * esc);
    const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0, cv.width, cv.height);
    const d = cx.getImageData(0, 0, cv.width, cv.height), px = d.data; let soma = 0;
    for (let i = 0; i < px.length; i += 4) { const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; px[i] = px[i + 1] = px[i + 2] = y; soma += y; }
    if (soma / (px.length / 4) < 115) for (let i = 0; i < px.length; i += 4) { px[i] = px[i + 1] = px[i + 2] = 255 - px[i]; }
    cx.putImageData(d, 0, 0);
    return cv;
  } finally { URL.revokeObjectURL(url); }
}
async function lerPrint(file, onProg) {
  const imagem = await prepararPrint(file);
  if (window.__mediplanOCR) return window.__mediplanOCR(imagem, file);
  const T = await loadTesseract();
  const worker = await T.createWorker("por", 1, { logger: (m) => { if (m && m.status === "recognizing text" && onProg) onProg(m.progress || 0); } });
  try { const { data } = await worker.recognize(imagem); return (data && data.text) || ""; } finally { try { await worker.terminate(); } catch (e) {} }
}
// encontra os ativos no texto do print: código (PETR4, HGLG11…), quantidade e preço médio
const SUF_OK = /^(3|4|5|6|7|8|11|12|13|3[1-9])$/;
function parsePrintCarteira(texto) {
  const linhas = String(texto || "").split(/\r?\n/).map((l) => l.replace(/[|_]/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
  const hits = [];
  linhas.forEach((l, i) => {
    const re = /\b([A-Z0-9]{4})\s?([0-9OIl]{1,2})F?\b/gi; let m;
    while ((m = re.exec(l))) {
      const letras = m[1].toUpperCase().replace(/0/g, "O").replace(/1/g, "I").replace(/5/g, "S").replace(/8/g, "B");
      const nums = m[2].toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1");
      const t = letras + nums;
      if (/^[A-Z]{4}$/.test(letras) && /\d/.test(m[2]) && SUF_OK.test(nums) && (m[1] === m[1].toUpperCase()) && !hits.some((h) => h.t === t)) hits.push({ i, t, fim: m.index + m[0].length });
    }
  });
  const dinheiro = /(?:R\$\s*)?(-?\d{1,3}(?:\.\d{3})+,\d{2,8}|-?\d+,\d{2,8})/g;
  return hits.map((h, n) => {
    const ate = n + 1 < hits.length ? Math.max(hits[n + 1].i, h.i + 1) : Math.min(linhas.length, h.i + 4);
    const bloco = [linhas[h.i].slice(h.fim)].concat(linhas.slice(h.i + 1, Math.min(ate, h.i + 4))).join(" \n ");
    const plano = stripAcc(bloco.toLowerCase());
    let qty = null, pm = null, mt;
    if ((mt = plano.match(/(?:quantidade|qtde?\.?|qnt\.?|quant\.?)\s*:?\s*(\d{1,3}(?:\.\d{3})+|\d+)(?![\d,])/))) qty = Number(mt[1].replace(/\./g, ""));
    else if ((mt = plano.match(/(\d{1,3}(?:\.\d{3})+|\d+)(?![\d,])\s*(?:cotas?|acoes|acao|unidades?|un\b|papeis)/))) qty = Number(mt[1].replace(/\./g, ""));
    if ((mt = plano.match(/(?:preco medio|p\.?\s?medio|pm|custo medio|medio)\s*:?\s*(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+,\d{2,8}|\d+,\d{2,8})/))) pm = parseAmountBR(mt[1]);
    const valores = []; let v; dinheiro.lastIndex = 0; while ((v = dinheiro.exec(bloco))) valores.push(parseAmountBR(v[1]));
    if (qty === null) {
      const semDinheiro = bloco.replace(dinheiro, " ").replace(/\d{2}\/\d{2}(\/\d{2,4})?/g, " ");
      const ints = (semDinheiro.match(/\b\d{1,3}(?:\.\d{3})+\b|\b\d{1,7}\b/g) || []).map((x) => Number(x.replace(/\./g, ""))).filter((x) => x > 0 && x < 10000000);
      if (ints.length) qty = ints[0];
    }
    if (pm === null && qty && valores.length >= 2) {
      // se um valor vezes a quantidade dá outro valor do bloco (o total), esse valor é o preço
      const cand = valores.find((a) => valores.some((b) => b !== a && b > 0 && Math.abs(a * qty - b) / b < 0.015));
      if (cand && valores.filter((a) => valores.some((b) => b !== a && b > 0 && Math.abs(a * qty - b) / b < 0.015)).length === 1) pm = cand;
    }
    return { ticker: h.t, qty: qty || "", pm: pm || "" };
  });
}

function PrintImport({ commitPrint, investments = [], goTab }) {
  const [img, setImg] = useState(null);
  const [busy, setBusy] = useState("");
  const [erro, setErro] = useState("");
  const [rows, setRows] = useState([]);
  const [modo, setModo] = useState("inicial");
  const [data, setData] = useState(todayStr());
  const [feito, setFeito] = useState(null);
  const ref = useRef(null);
  const jaTem = new Set(investments.map((i) => String(i.description || "").toUpperCase()));
  const abrir = async (file) => {
    if (!file) return;
    setErro(""); setRows([]); setFeito(null);
    setImg(URL.createObjectURL(file));
    setBusy("Lendo o print… na primeira vez o leitor é baixado, pode levar alguns segundos.");
    try {
      const txt = await lerPrint(file, (p) => setBusy(`Lendo o print… ${Math.round(p * 100)}%`));
      const achados = parsePrintCarteira(txt);
      if (!achados.length) setErro("Não encontrei códigos de ativos nesse print. Tente um print mais nítido, só da lista de ativos.");
      setRows(achados.map((r) => ({ ...r, on: !jaTem.has(r.ticker) })));
    } catch (e) { setErro(e.message || "Não consegui ler esse print."); }
    setBusy("");
  };
  const setRow = (i, p) => setRows((prev) => prev.map((r, n) => (n === i ? { ...r, ...p } : r)));
  const marcados = rows.filter((r) => r.on);
  const faltando = marcados.filter((r) => !(Number(r.qty) > 0) || !(Number(r.pm) > 0));
  const adicionar = () => {
    if (!marcados.length || faltando.length) return;
    const e = commitPrint(marcados.map((r) => ({ ticker: r.ticker, qty: Number(r.qty), pm: Number(r.pm) })), modo, modo === "aporte" ? data : todayStr());
    setFeito(e); setRows([]); setImg(null);
  };
  return (
    <div className="pr">
      {feito && <div className="note-info" role="status">{feito.investimentos} {feito.investimentos === 1 ? "ativo adicionado" : "ativos adicionados"} {modo === "inicial" ? "como carteira inicial" : "como aporte"}. Dá para desfazer no histórico de importações, abaixo.{goTab && <> <button className="link-btn" onClick={() => goTab("investimentos")}>Ver investimentos</button></>}</div>}
      <button className="drop" onClick={() => ref.current && ref.current.click()}>
        <IconUpload size={26} color={TEAL} />
        <b>{img ? "Trocar imagem" : "Escolher print"}</b>
        <span>Print da tela de carteira ou de uma compra, na sua corretora.</span>
      </button>
      <input ref={ref} id="print-file" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { abrir(e.target.files[0]); e.target.value = ""; }} />
      {busy && <div className="field-hint" style={{ marginTop: 10 }} role="status">{busy}</div>}
      {erro && <div className="note-bad">{erro}</div>}
      {rows.length > 0 && (
        <div className="pr-res">
          <div className="pr-top">
            {img && <img src={img} alt="Print escolhido" className="pr-thumb" />}
            <div><b>Encontrei {rows.length} {rows.length === 1 ? "ativo" : "ativos"}.</b><span>Confira a quantidade e o preço médio antes de adicionar. O que eu não consegui ler fica em vermelho.</span></div>
          </div>
          {rows.map((r, i) => {
            const falta = r.on && (!(Number(r.qty) > 0) || !(Number(r.pm) > 0));
            return (
              <div key={r.ticker + i} className={`pr-row ${r.on ? "" : "off"} ${falta ? "falta" : ""}`}>
                <input type="checkbox" checked={r.on} onChange={(e) => setRow(i, { on: e.target.checked })} aria-label={"Incluir " + r.ticker} />
                <div className="pr-tk"><b>{r.ticker}</b><small>{jaTem.has(r.ticker) ? "já está na carteira" : b3Category(r.ticker)}</small></div>
                <div className="field pr-q"><label>Qtd.</label><input inputMode="numeric" value={r.qty === "" ? "" : Number(r.qty).toLocaleString("pt-BR")} onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); setRow(i, { qty: d === "" ? "" : Number(d) }); }} aria-label={"Quantidade de " + r.ticker} /></div>
                <div className="field pr-p"><label>Preço médio</label><MoneyInput value={r.pm} onChange={(v) => setRow(i, { pm: v })} aria-label={"Preço médio de " + r.ticker} /></div>
              </div>
            );
          })}
          {faltando.length > 0 && <div className="note-bad">Complete a quantidade e o preço médio de {faltando.map((r) => r.ticker).join(", ")}.</div>}
          <div className="field" style={{ marginTop: 12 }}><label>Adicionar como</label>
            <div className="chip-row" role="group" aria-label="Adicionar como">
              <button type="button" className={`chip sm ${modo === "inicial" ? "active" : ""}`} aria-pressed={modo === "inicial"} onClick={() => setModo("inicial")}>Carteira inicial</button>
              <button type="button" className={`chip sm ${modo === "aporte" ? "active" : ""}`} aria-pressed={modo === "aporte"} onClick={() => setModo("aporte")}>Aporte novo</button>
            </div>
            <div className="field-hint">{modo === "inicial" ? "Para o que você já tinha antes de usar o app. Não conta como aporte do mês." : "Para uma compra nova. Entra como investimento na data abaixo."}</div>
          </div>
          {modo === "aporte" && <div className="field" style={{ maxWidth: 220 }}><label>Data da compra</label><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>}
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!marcados.length || faltando.length > 0} onClick={adicionar}>Adicionar {marcados.length} {marcados.length === 1 ? "ativo" : "ativos"}</button>
        </div>
      )}
      <div className="tips">
        <b>Como funciona</b>
        <span>1. Na corretora, abra a tela da sua carteira (ou o comprovante de uma compra) e tire um print.</span>
        <span>2. Escolha o print aqui. O app procura os códigos dos ativos, a quantidade e o preço médio.</span>
        <span>3. Confira, corrija o que precisar e escolha se é carteira inicial ou aporte novo.</span>
        <span>A imagem é lida no seu celular e não é enviada para lugar nenhum. Na primeira vez, o leitor de imagem é baixado da internet.</span>
      </div>
    </div>
  );
}

// ---- projeção da meta: com o aporte mensal (e um rendimento opcional), em que mês a meta é alcançada ----
const MES_LONGO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
function GoalProjection({ g, atual, aporteSugerido, onPatch }) {
  const alvo = Number(g.valorAlvo) || 0;
  const manual = g.aporteMensal !== null && g.aporteMensal !== undefined && g.aporteMensal !== "";
  const aporte = manual ? Math.max(0, Number(g.aporteMensal) || 0) : Math.max(0, Math.round(aporteSugerido || 0));
  const rAno = Number(g.rendimentoAno) || 0;
  const r = rAno > 0 ? Math.pow(1 + rAno / 100, 1 / 12) - 1 : 0;
  const [txt, setTxt] = useState(manual ? Number(g.aporteMensal) || 0 : "");
  const salvar = () => { onPatch({ aporteMensal: txt === "" ? null : Math.max(0, Number(txt) || 0) }); };
  const [outroRend, setOutroRend] = useState(![0, 6, 10, 12].includes(Number(g.rendimentoAno) || 0));
  const [rendTxt, setRendTxt] = useState(Number(g.rendimentoAno) ? String(g.rendimentoAno).replace(".", ",") : "");
  const salvarRend = () => { const v = Math.min(100, Math.max(0, parseFloat(String(rendTxt).replace(",", ".")) || 0)); onPatch({ rendimentoAno: Math.round(v * 100) / 100 }); };

  const serie = [Math.max(0, atual)]; let n = serie[0] >= alvo ? 0 : null;
  for (let k = 1; k <= 600 && n === null; k++) { const v = serie[k - 1] * (1 + r) + aporte; serie.push(v); if (v >= alvo) n = k; }
  const hoje = new Date();
  const dataK = (k) => new Date(hoje.getFullYear(), hoje.getMonth() + k, 1);
  const horiz = n === null ? Math.min(serie.length - 1, 24) : Math.max(n, 6);
  while (serie.length <= horiz) serie.push(serie[serie.length - 1] * (1 + r) + aporte);
  // curva suave (sem barras): um ponto por mês até a meta
  const W = 340, H = 96, pt = 14, pb = 18, pl = 4, pr = 4, iw = W - pl - pr, ih = H - pt - pb;
  const maxV = Math.max(alvo, serie[horiz], 1) * 1.06;
  const minV = Math.max(0, serie[0] - (maxV - serie[0]) * 0.2);
  const X = (k) => pl + (iw * k) / horiz, Y = (v) => pt + ih * (1 - (Math.max(minV, v) - minV) / Math.max(1, maxV - minV));
  const pts = []; for (let k = 0; k <= horiz; k++) pts.push([X(k), Y(serie[k])]);
  let curva = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    curva += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  const area = `${curva} L${X(horiz).toFixed(1)},${pt + ih} L${X(0).toFixed(1)},${pt + ih} Z`;
  const curto = (k) => { const d = dataK(k); return `${(MONTHS_ABBR_PT[d.getMonth()] || "").toLowerCase()}/${String(d.getFullYear()).slice(2)}`; };
  const gid = "gpg-" + g.id;
  const tempo = (m) => { const a = Math.floor(m / 12), mm = m % 12; return [a ? `${a} ${a === 1 ? "ano" : "anos"}` : "", mm ? `${mm} ${mm === 1 ? "mês" : "meses"}` : ""].filter(Boolean).join(" e "); };
  const dN = n !== null ? dataK(n) : null;
  let precisa = null, mPrazo = null;
  if (g.prazo && n !== 0) {
    const t = new Date(g.prazo + "T12:00:00");
    mPrazo = Math.max(1, (t.getFullYear() - hoje.getFullYear()) * 12 + (t.getMonth() - hoje.getMonth()));
    const f = Math.pow(1 + r, mPrazo);
    precisa = Math.max(0, r > 0 ? ((alvo - atual * f) * r) / (f - 1) : (alvo - atual) / mPrazo);
  }
  return (
    <div className="gp">
      <div className="gp-tit">Projeção</div>
      <div className="gp-res">
        {n === 0 && <><b>Você já alcançou esta meta.</b></>}
        {n !== null && n > 0 && <>Você alcança em <b>{MES_LONGO[dN.getMonth()]} de {dN.getFullYear()}</b>, daqui a {tempo(n)}.</>}
        {n === null && (aporte === 0 && r === 0 ? <>Sem aporte por mês, a meta não sai do lugar. Diga quanto você investe por mês.</> : <>Com esse ritmo, leva mais de 50 anos.</>)}
      </div>
      {precisa !== null && (
        <div className={`gp-prazo ${precisa <= aporte + 0.5 ? "ok" : "falta"}`}>
          {precisa <= aporte + 0.5 ? <>Dá para chegar até o prazo ({fmtDatePt(g.prazo)}).</> : <>Para chegar até {fmtDatePt(g.prazo)}, você precisaria de <b>{fmtBRL(precisa)} por mês</b>.</>}
        </div>
      )}
      <svg className="gp-svg" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Projeção da meta ${g.nome}`}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={g.cor} stopOpacity=".28" /><stop offset="1" stopColor={g.cor} stopOpacity="0" /></linearGradient></defs>
        <line className="gp-alvo" x1={pl} x2={W - pr} y1={Y(alvo)} y2={Y(alvo)} />
        <path d={area} fill={`url(#${gid})`} />
        <path d={curva} fill="none" stroke={g.cor} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={X(0)} cy={Y(serie[0])} r="3.5" fill={g.cor} />
        {n !== null && n > 0 && <circle className="gp-fim" cx={X(n)} cy={Y(serie[n])} r="5" stroke={g.cor} />}
        <text className="gp-lbl" x={pl} y={H - 4}>hoje</text>
        <text className="gp-lbl" x={W - pr} y={H - 4} textAnchor="end">{n !== null && n > 0 ? curto(n) : curto(horiz)}</text>
        <text className="gp-lbl" x={pl} y={Math.max(10, Y(alvo) - 4)}>meta {fmtBRL(alvo)}</text>
      </svg>
      <div className="gp-campos">
        <div className="field">
          <label htmlFor={"gp-ap-" + g.id}>Aporte por mês (R$)</label>
          <MoneyInput id={"gp-ap-" + g.id} value={txt} placeholder={Math.round(aporteSugerido || 0).toLocaleString("pt-BR")} onChange={setTxt} onBlur={salvar} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
          <div className="field-hint">{manual ? "Valor que você definiu." : `Em branco: média dos seus investimentos nos últimos 6 meses (${fmtBRL(aporteSugerido || 0)}).`}</div>
        </div>
        <div className="field">
          <label>Rendimento estimado</label>
          <div className="chip-row" role="group" aria-label="Rendimento estimado ao ano">
            {[[0, "Sem rendimento"], [6, "6% ao ano"], [10, "10% ao ano"], [12, "12% ao ano"]].map(([v, l]) => <button key={v} type="button" className={`chip sm ${!outroRend && rAno === v ? "active" : ""}`} aria-pressed={!outroRend && rAno === v} onClick={() => { setOutroRend(false); onPatch({ rendimentoAno: v }); }}>{l}</button>)}
            <button type="button" className={`chip sm ${outroRend ? "active" : ""}`} aria-pressed={outroRend} onClick={() => { setOutroRend(true); setRendTxt(rAno ? String(rAno).replace(".", ",") : ""); }}>Outro valor</button>
          </div>
          {outroRend && (
            <div className="gp-rend">
              <input id={"gp-rend-" + g.id} inputMode="decimal" value={rendTxt} placeholder="Ex.: 8,5" aria-label="Rendimento ao ano, em %"
                onChange={(e) => setRendTxt(e.target.value.replace(/[^0-9,.]/g, ""))}
                onBlur={salvarRend} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
              <span>% ao ano</span>
            </div>
          )}
        </div>
      </div>
      <div className="field-hint">É uma estimativa. Rendimento passado não garante rendimento futuro.</div>
    </div>
  );
}

function GoalsTab({ goals, addGoal, removeGoal, contributeGoal, valorDaMeta, setGoalFonte, setGoalPatch, aporteMedio = 0, monthExpenseItems = [], limits = {}, setLimit, viewYear, viewMonth }) {
  const FONTES = [["manual", "Eu informo"], ["carteira", "Meus investimentos"], ["patrimonio", "Meu patrimônio"]];
  const [showForm, setShowForm] = useState(goals.length === 0);
  const [nome, setNome] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [fonte, setFonte] = useState("manual");
  const [prazo, setPrazo] = useState("");
  const [cor, setCor] = useState(PALETTE[0]);
  const [contributions, setContributions] = useState({});
  const [aberta, setAberta] = useState(null);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");
  const submit = () => {
    if (!nome.trim()) { setErro("Dê um nome para a meta."); return; }
    if (!(Number(valorAlvo) > 0)) { setErro("Informe o valor alvo."); return; }
    addGoal({ nome: nome.trim(), valorAlvo, valorAtual, fonte, prazo, cor });
    setNome(""); setValorAlvo(""); setValorAtual(""); setFonte("manual"); setPrazo(""); setShowForm(false); setErro("");
  };
  const quando = (g, atual) => {
    const n = mesesAteMeta(g, atual, aporteMedio);
    if (n === 0) return "meta alcançada";
    if (n === null) return "defina o aporte mensal";
    const d = new Date(); const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
    return `alcança em ${(MONTHS_ABBR_PT[t.getMonth()] || "").toLowerCase()}/${String(t.getFullYear()).slice(2)}`;
  };
  return (
    <div className="mt">
      <TetoGastos monthExpenseItems={monthExpenseItems} limits={limits} setLimit={setLimit} viewYear={viewYear} viewMonth={viewMonth} />

      <div className="mt-head"><h3>Metas</h3><button type="button" className="link-btn" onClick={() => setShowForm((v) => !v)}>{showForm ? "Fechar" : "+ Nova meta"}</button></div>
      {showForm && (
        <div className="card">
          <div className="form-grid">
            <div className="field"><label>Nome da meta</label><input value={nome} onChange={(e) => { setNome(e.target.value); setErro(""); }} placeholder="Ex: Reserva de emergência" /></div>
            <div className="field"><label>Valor alvo (R$)</label><MoneyInput value={valorAlvo} onChange={(v) => { setValorAlvo(v); setErro(""); }} /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>De onde vem o valor?</label>
              <div className="chip-row">
                {FONTES.map(([k, l]) => <button key={k} type="button" className={`chip sm ${fonte === k ? "active" : ""}`} aria-pressed={fonte === k} onClick={() => setFonte(k)}>{l}</button>)}
              </div>
            </div>
            {fonte === "manual" && <div className="field"><label>Valor já acumulado (R$)</label><MoneyInput value={valorAtual} onChange={setValorAtual} /></div>}
            <div className="field"><label>Prazo</label><input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
            <div className="field color-field"><label>Cor</label><div className="color-input-wrap"><input type="color" value={cor} onChange={(e) => setCor(e.target.value)} /></div></div>
          </div>
          {erro && <div className="note-bad" style={{ marginTop: 8 }}>{erro}</div>}
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={submit}><IconPlus size={15} /> Criar meta</button>
        </div>
      )}
      {goals.length === 0 && !showForm && <div className="empty-state">Nenhuma meta cadastrada ainda. Toque em “Nova meta”.</div>}

      {goals.map((g) => {
        const atual = valorDaMeta(g);
        const pct = Math.min(100, (atual / Math.max(g.valorAlvo, 1)) * 100);
        const ab = aberta === g.id;
        return (
          <div key={g.id} className={`card mt-meta ${ab ? "open" : ""}`}>
            <button type="button" className="mt-row" aria-expanded={ab} onClick={() => { setAberta(ab ? null : g.id); setEditando(null); }}>
              <Ring pct={pct} size={48} stroke={6} color={g.cor}><b style={{ fontSize: 11 }}>{pct.toFixed(0)}%</b></Ring>
              <span className="mt-txt"><b>{g.nome}</b><small><span className="mono">{fmtBRL(atual)}</span> de <span className="mono">{fmtBRL(g.valorAlvo)}</span> · {quando(g, atual)}</small></span>
              <span className="mt-chev" aria-hidden="true">›</span>
            </button>
            {ab && (
              <div className="mt-body">
                {editando === g.id ? (
                  <GoalEditForm g={g} onSave={(p) => { setGoalPatch(g.id, p); setEditando(null); }} onCancel={() => setEditando(null)}
                    onDelete={() => { if (window.confirm(`Excluir a meta "${g.nome}"?`)) { removeGoal(g.id); setAberta(null); setEditando(null); } }} />
                ) : (
                  <>
                    {g.prazo && <div className="mt-prazo">Prazo: {fmtDatePt(g.prazo)}</div>}
                    <GoalProjection g={g} atual={atual} aporteSugerido={aporteMedio} onPatch={(p) => setGoalPatch(g.id, p)} />
                    <div className="field" style={{ marginTop: 12 }}>
                      <label>De onde vem o valor</label>
                      <div className="chip-row" role="group" aria-label={"Origem do valor de " + g.nome}>
                        {FONTES.map(([k, l]) => <button key={k} type="button" className={`chip sm ${(g.fonte || "manual") === k ? "active" : ""}`} aria-pressed={(g.fonte || "manual") === k} onClick={() => setGoalFonte(g.id, k)}>{l}</button>)}
                      </div>
                    </div>
                    {(g.fonte || "manual") === "manual" && (
                      <div className="mt-aporte">
                        <div className="field"><label>Adicionar aporte (R$)</label><MoneyInput value={contributions[g.id] || ""} onChange={(v) => setContributions((p) => ({ ...p, [g.id]: v }))} /></div>
                        <button className="btn btn-ghost" onClick={() => { const v = Number(contributions[g.id]) || 0; if (v > 0) { contributeGoal(g.id, v); setContributions((p) => ({ ...p, [g.id]: "" })); } }}><IconPlus size={14} /> Adicionar</button>
                      </div>
                    )}
                    <div className="fz-btns"><button type="button" className="btn btn-ghost" onClick={() => setEditando(g.id)}>Editar meta</button></div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CalendarTab({ cells, entriesByDay, selectedDay, setSelectedDay, viewYear, viewMonth, vinculos, addVinculo,
  addShift, addPlantao, removeShiftSerie, shifts, removeShift, toggleShiftReceived, updateShiftPrazo, addPresenca, removePresenca, vinculoMap, netOf, setActiveTab, toggleEscalaOff, fluxoDia = {}, desk }) {
  const [modo, setModo] = useState("plantao");
  const fxMax = Object.values(fluxoDia).reduce((a, f) => Math.max(a, Math.abs(f.entra - f.sai)), 0);
  const fxClasse = (day) => { const f = fluxoDia[day]; if (!f || !fxMax) return ""; const net = f.entra - f.sai; if (Math.abs(net) < 0.005) return ""; const r = Math.abs(net) / fxMax; return (net > 0 ? "fx-in" : "fx-out") + (r < 0.34 ? 1 : r < 0.67 ? 2 : 3); };
  const fxSel = selectedDay ? fluxoDia[selectedDay] : null;
  const [local, setLocal] = useState("");
  const [taxa, setTaxa] = useState("");
  const [rep, setRep] = useState("nao");
  const [repMeses, setRepMeses] = useState(60);
  const [fixoId, setFixoId] = useState("");
  const plLocais = vinculos.filter((v) => v.tipo === "plantao");
  const fixos = vinculos.filter((v) => v.tipo === "mensal");
  const fixoSel = fixos.find((v) => v.id === fixoId) || fixos[0] || null;
  const diaIso = selectedDay ? dateStr(viewYear, viewMonth, selectedDay) : "";
  const datas = plantaoDatas(diaIso, rep, repMeses);
  const [gross, setGross] = useState("");
  const [hours, setHours] = useState("");
  const [showNewVinculo, setShowNewVinculo] = useState(false);
  const [prazoDias, setPrazoDias] = useState(0);
  const [erro, setErro] = useState("");
  useEffect(() => { setErro(""); setShowNewVinculo(false); setRep("nao"); }, [selectedDay]);
  const today = todayStr();
  const dayEntries = selectedDay ? (entriesByDay[selectedDay] || []) : [];
  const allEntries = Object.values(entriesByDay).flat();
  const nPlantoes = allEntries.filter((e) => e._kind === "plantao").length;
  const totHoras = allEntries.reduce((a, e) => a + Number(e.hours || 0), 0);
  const usedVinc = vinculos.filter((v) => allEntries.some((e) => e.vinculoId === v.id));

  const submitPlantao = () => {
    if (!String(local).trim()) { setErro("Digite onde foi o plantão."); return; }
    if (!(Number(gross) > 0)) { setErro("Informe o valor do plantão."); return; }
    if (String(taxa).trim() === "" || !(Number(taxa) >= 0)) { setErro("Informe a tributação do plantão. Use 0 se não tiver imposto."); return; }
    addPlantao({ local, gross, hours, prazoDias, datas, taxa });
    setGross(""); setHours(""); setErro(""); setRep("nao");
  };
  const submitFixo = () => {
    if (!fixoSel) return;
    if (!(Number(hours) > 0)) { setErro("Informe quantas horas você trabalhou neste dia."); return; }
    addPresenca(selectedDay, fixoSel.id, hours);
    setHours(""); setErro("");
  };

  return (
    <>
      <div className={`kpi-row ${desk ? "" : "three"}`}>
        <Kpi label="Plantões" value={nPlantoes} />
        <Kpi label="Horas no mês" value={totHoras.toFixed(0) + "h"} />
        <Kpi label="Dias trabalhados" value={Object.values(entriesByDay).filter((l) => l.some((e) => !e.off)).length} />
        {desk && <Kpi label="Saldo do mês" value={fmtBRL(Object.values(fluxoDia).reduce((a, f) => a + f.entra - f.sai, 0))} sub="entra menos sai" />}
      </div>
      <div className={`calendar-grid ${desk ? "cal-desk" : ""}`}>
        {WEEKDAYS_PT.map((w, i) => <div key={i} className="weekday-label">{w}</div>)}
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="cal-cell empty" />;
          const iso = dateStr(viewYear, viewMonth, day);
          const dEntries = entriesByDay[day] || [];
          const isToday = iso === today, isSelected = selectedDay === day;
          return (
            <div key={idx} className={`cal-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${fxClasse(day)} ${iso > today ? "fut" : ""}`} onClick={() => setSelectedDay(day)}>
              <span className="cal-day-num mono">{day}</span>
              {dEntries.length > 0 && (
                <div className="cal-dots">{dEntries.slice(0, 4).map((e) => { const v = vinculoMap[e.vinculoId]; return <span key={e.id} className={`cal-dot ${e._kind === "escala" ? "esc" : ""} ${e.off ? "off" : ""}`} style={{ background: v ? v.cor : GOLD }} />; })}</div>
              )}
              {dEntries.some((e) => !e.off) && <span className="cal-hours">{fmtHoras(dEntries.reduce((a, e) => a + Number(e.hours || 0), 0))}</span>}
              {desk && (() => { const f = fluxoDia[day]; const pl = dEntries.filter((e) => e._kind === "plantao" && !e.off).length; const its = f ? f.itens : [];
                return (pl > 0 || its.length > 0) ? (
                  <div className="cal-lines">
                    {pl > 0 && <span className="cl-pl">{pl} {pl === 1 ? "plantão" : "plantões"}</span>}
                    {its.slice(0, 3).map((x) => <span key={x.k} className={x.in ? "cl-in" : "cl-out"}>{x.in ? "+" : "−"} {x.nome}</span>)}
                    {its.length > 3 && <span className="cl-more">+{its.length - 3}</span>}
                  </div>) : null; })()}
            </div>
          );
        })}
      </div>

      <div className="fx-legend">
        <span>saiu mais <i className="fx-out3" /><i className="fx-out1" /><i className="fx-zero" /><i className="fx-in1" /><i className="fx-in3" /> entrou mais</span>
        <span><i className="fx-in2 fut" /> listrado é previsão</span>
      </div>
      {usedVinc.length > 0 && (
        <div className="legend inline" style={{ marginTop: 10 }}>{usedVinc.map((v) => <span key={v.id}><i style={{ background: v.cor }} />{v.nome}</span>)}</div>
      )}

      {selectedDay && (
        <div className="sheet-backdrop" onClick={() => setSelectedDay(null)}><div className="sheet tall" onClick={(e) => e.stopPropagation()}><div className="sheet-handle" />
        <div className="day-panel flat">
          <div className="day-panel-title"><span>Lançamentos em {pad(selectedDay)}/{pad(viewMonth + 1)}/{viewYear}</span><button className="btn-icon" onClick={() => setSelectedDay(null)}><IconX size={16} /></button></div>
          {fxSel && (
            <div className="fx-day">
              <div className="fx-head"><b>Dinheiro neste dia</b><span className={`fx-net ${fxSel.entra - fxSel.sai >= 0 ? "in" : "out"}`}>{fxSel.entra - fxSel.sai >= 0 ? "+ " : "− "}{fmtBRL(Math.abs(fxSel.entra - fxSel.sai))}</span></div>
              {fxSel.itens.map((it) => (
                <div key={it.k} className="fx-line">
                  <i className={it.in ? "in" : "out"} />
                  <span className="fx-nome">{it.nome}<small>{it.in ? (it.ok ? "recebido" : "a receber") : (it.ok ? "pago" : "a pagar")}</small></span>
                  <b className={it.in ? "in" : ""}>{it.in ? "+ " : "− "}{fmtBRL(it.v)}</b>
                </div>
              ))}
            </div>
          )}

          {dayEntries.length === 0 && <div className="empty-state">Nenhum lançamento neste dia ainda.</div>}

          {dayEntries.map((e) => {
            const v = vinculoMap[e.vinculoId];
            if (e._kind === "plantao") {
              return (
                <div key={e.id} className="stub-card">
                  <div className="stub-head"><span className="stub-hospital"><span className="color-dot" style={{ background: v ? v.cor : GOLD }} /><IconBuilding size={14} /> {v ? v.nome : "?"}{e.serie && <small className="serie-tag">repete</small>}</span><button className="btn-icon" aria-label="Apagar este plantão" onClick={() => removeShift(e.id)}><IconTrash size={15} /></button></div>
                  <div className="stub-tear" />
                  <div className="stub-row"><span className="k">Valor bruto</span><span className="v mono">{fmtBRL(e.gross)}</span></div>
                  <div className="stub-row"><span className="k">Horas trabalhadas</span><span className="v mono">{e.hours || 0}h</span></div>
                  <div className="stub-row"><span className="k">Tributação</span><span className="v mono" style={{ color: "var(--brick)" }}>- {fmtBRL(e.gross - netOf(e.gross, v ? v.taxOverride : null))}</span></div>
                  <div className="stub-row"><span className="k">Valor líquido</span><span className="v mono" style={{ color: "var(--gold)" }}>{fmtBRL(netOf(e.gross, v ? v.taxOverride : null))}</span></div>
                  <div className="stub-row"><span className="k">Prazo de pagamento</span>
                    <select className="tax-mini wide" value={e.prazoDias || 0} onChange={(ev) => updateShiftPrazo(e.id, ev.target.value)}>
                      {prazoOptions("dias", e.prazoDias || 0).map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                    </select></div>
                  <div className="stub-row"><span className="k">Cai no caixa em</span><span className="v mono">{fmtDatePt(payDateOf(e))}</span></div>
                  <div className="stub-row"><span className="k">Pagamento</span><button className={`badge ${e.recebido ? "badge-paid" : "badge-pending"}`} onClick={() => toggleShiftReceived(e.id)}>{e.recebido ? "Recebido" : "Não recebido"}</button></div>
                  {e.serie && (() => { const n = (shifts || []).filter((x) => x.serie === e.serie && x.date > e.date).length; return n > 0 ? <div className="stub-row"><span className="k">Plantão que se repete</span><button type="button" className="link-btn" data-serie-del onClick={() => removeShiftSerie(e.serie, e.date)}>Apagar este e os {n} seguintes</button></div> : null; })()}
                </div>
              );
            }
            if (e._kind === "escala") {
              return (
                <div key={e.id} className={`stub-card ${e.off ? "off" : ""}`} data-escala-dia={v ? v.nome : ""}>
                  <div className="stub-head"><span className="stub-hospital"><span className="color-dot" style={{ background: v ? v.cor : SLATE }} /><IconClock size={14} /> {v ? v.nome : "?"} ({(TURNOS[e.turno] || "").toLowerCase()}, escala fixa)</span></div>
                  <div className="stub-tear" />
                  <div className="stub-row"><span className="k">Horas previstas</span><span className="v mono">{e.off ? "não trabalhado" : fmtHoras(e.previsto)}</span></div>
                  <div className="stub-row"><span className="k">Pagamento</span><span className="v" style={{ color: "var(--text-dim)" }}>via renda mensal fixa deste vínculo</span></div>
                  <div className="stub-row"><span className="k">{e.off ? "Este dia não conta nas horas" : "Não trabalhou neste dia?"}</span><button className="btn btn-ghost sm" onClick={() => toggleEscalaOff(e.vinculoId, e.date)}>{e.off ? "Voltar a contar" : "Não trabalhei"}</button></div>
                  {!e.off && <div className="field-hint">Trabalhou outro número de horas? Lance as horas deste vínculo abaixo: elas substituem a escala neste dia.</div>}
                </div>
              );
            }
            return (
              <div key={e.id} className="stub-card">
                <div className="stub-head"><span className="stub-hospital"><span className="color-dot" style={{ background: v ? v.cor : SLATE }} /><IconClock size={14} /> {v ? v.nome : "?"} (presença)</span><button className="btn-icon" onClick={() => removePresenca(e.id)}><IconTrash size={15} /></button></div>
                <div className="stub-tear" />
                <div className="stub-row"><span className="k">Horas trabalhadas</span><span className="v mono">{e.hours || 0}h</span></div>
                <div className="stub-row"><span className="k">Pagamento</span><span className="v" style={{ color: "var(--text-dim)" }}>via renda mensal fixa deste vínculo</span></div>
              </div>
            );
          })}

          <div className="add-box" id="day-add">
            <div className="add-head"><b>Adicionar neste dia</b></div>
            <div className="segmented" id="day-modo" role="tablist">
              <button type="button" role="tab" aria-selected={modo === "plantao"} className={`seg-btn ${modo === "plantao" ? "active" : ""}`} data-modo="plantao" onClick={() => { setModo("plantao"); setErro(""); setShowNewVinculo(false); }}>Plantão</button>
              <button type="button" role="tab" aria-selected={modo === "fixo"} className={`seg-btn ${modo === "fixo" ? "active" : ""}`} data-modo="fixo" onClick={() => { setModo("fixo"); setErro(""); }}>Cargo fixo (diarista)</button>
            </div>
            {modo === "plantao" ? (
              <>
                <div className="field" style={{ marginTop: 12 }}>
                  <label htmlFor="pl-local">Onde foi o plantão?</label>
                  <input id="pl-local" value={local} onChange={(e) => { setLocal(e.target.value); setErro(""); }} placeholder="Ex.: Hospital São Lucas, UPA Centro" autoComplete="off" />
                  {plLocais.length > 0 && (
                    <div className="chip-row pl-chips" role="group" aria-label="Locais já usados">
                      {plLocais.map((v) => { const on = stripAcc(local).trim() === stripAcc(v.nome).trim(); return <button key={v.id} type="button" data-local={v.nome} className={`chip sm ${on ? "active" : ""}`} aria-pressed={on} onClick={() => { setLocal(v.nome); setPrazoDias(Number(v.prazoPadrao) || 0); setTaxa(v.taxOverride !== null && v.taxOverride !== undefined ? String(v.taxOverride) : ""); setErro(""); }}><i style={{ background: v.cor }} />{v.nome}</button>; })}
                    </div>
                  )}
                  <div className="field-hint">{plLocais.length ? "Toque em um local já usado ou digite um novo. Local novo fica guardado sozinho." : "É só digitar o nome. O local fica guardado para as próximas vezes."}</div>
                </div>
                <div className="form-grid" style={{ marginTop: 10 }}>
                  <div className="field"><label htmlFor="pl-valor">Valor do plantão (R$) *</label><MoneyInput id="pl-valor" value={gross} onChange={(v) => { setGross(v); setErro(""); }} /></div>
                  <div className="field"><label htmlFor="pl-taxa">Tributação (%) *</label><input id="pl-taxa" type="number" inputMode="decimal" min="0" value={taxa} onChange={(e) => { setTaxa(e.target.value); setErro(""); }} placeholder="Ex.: 20" /></div>
                  <div className="field">
                    <label htmlFor="pl-horas">Horas trabalhadas (opcional)</label>
                    <input id="pl-horas" type="number" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="12" />
                    <div className="preset-row">
                      <button type="button" className="preset-btn" onClick={() => setHours(6)}>6h</button>
                      <button type="button" className="preset-btn" onClick={() => setHours(12)}>12h</button>
                      <button type="button" className="preset-btn" onClick={() => setHours(24)}>24h</button>
                    </div>
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>Quando você recebe?</label>
                    <PrazoPicker key={"pl:" + prazoDias} unit="dias" value={prazoDias} onChange={setPrazoDias} />
                    {selectedDay && <div className="field-hint">Cairá no caixa em <b>{fmtDatePt(addDaysIso(diaIso, prazoDias))}</b></div>}
                  </div>
                </div>
                <div className="pl-rep" id="pl-rep">
                  <div className="escala-q">Este plantão se repete?</div>
                  <div className="chip-row" role="group" aria-label="Repetição">
                    {[["nao", "Não, só este dia"], ["1", "Toda semana"], ["2", "Semana sim, semana não"], ["3", "A cada 3 semanas"], ["mes", "1 vez por mês"]].map(([k, l]) => <button key={k} type="button" data-rep={k} className={`chip sm ${rep === k ? "active" : ""}`} aria-pressed={rep === k} onClick={() => setRep(k)}>{l}</button>)}
                  </div>
                  {rep !== "nao" && (
                    <>
                      <div className="escala-prox" id="pl-resumo">Serão lançados <b>{datas.length} plantões</b>{rep === "mes" ? ` (${ordemTxt(diaIso)})` : ""}: {datas.slice(0, 4).map((d) => fmtDatePt(d).slice(0, 5)).join(", ")}{datas.length > 4 ? ` … até ${fmtDatePt(datas[datas.length - 1])}` : ""}. Depois dá para apagar ou ajustar cada um.</div>
                    </>
                  )}
                </div>
                {erro && <div className="note-bad" id="day-erro" style={{ marginBottom: 10 }}>{erro}</div>}
                <button className="btn btn-primary" id="day-save" onClick={submitPlantao}><IconPlus size={15} /> {datas.length > 1 ? `Salvar ${datas.length} plantões` : "Salvar plantão"}</button>
              </>
            ) : showNewVinculo ? (
              <>
                <div className="add-head" style={{ marginTop: 14 }}><b>Novo cargo fixo</b><button type="button" className="link-btn" id="day-novo-cancel" onClick={() => setShowNewVinculo(false)}>Cancelar</button></div>
                <p className="add-sub">Para trabalho com salário mensal e dias fixos, como diarista ou meio turno. Você cadastra uma vez e o salário entra sozinho todo mês.</p>
                <VinculoForm fixo onSubmit={(d) => { const id = addVinculo(d); setFixoId(id); setShowNewVinculo(false); }} defaultStartMonth={monthKeyOf(viewYear, viewMonth)} />
              </>
            ) : fixos.length === 0 ? (
              <>
                <p className="add-sub" style={{ marginTop: 12 }}>Cargo fixo é o trabalho com salário mensal e dias certos, como diarista ou meio turno. Ele fica separado dos plantões: o salário entra sozinho todo mês e a escala aparece no calendário.</p>
                <button className="btn btn-primary" id="day-novo" onClick={() => setShowNewVinculo(true)}><IconPlus size={15} /> Cadastrar cargo fixo</button>
              </>
            ) : (
              <>
                <div className="field" style={{ marginTop: 12 }}>
                  <label htmlFor="day-vinculo">Qual cargo fixo?</label>
                  <select id="day-vinculo" value={fixoSel ? fixoSel.id : ""} onChange={(e) => { setFixoId(e.target.value); setErro(""); }}>
                    {fixos.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                  </select>
                </div>
                <div className="add-tip" id="day-tip">O salário deste cargo já entra sozinho todo mês. Aqui você só anota as horas deste dia{fixoSel && (fixoSel.escala || []).length ? ", e elas substituem a escala fixa nesta data." : "."}</div>
                <div className="field" style={{ marginTop: 10 }}>
                  <label htmlFor="fx-horas">Horas trabalhadas neste dia</label>
                  <input id="fx-horas" type="number" inputMode="decimal" value={hours} onChange={(e) => { setHours(e.target.value); setErro(""); }} placeholder="6" />
                  <div className="preset-row">
                    <button type="button" className="preset-btn" onClick={() => setHours(6)}>6h</button>
                    <button type="button" className="preset-btn" onClick={() => setHours(12)}>12h</button>
                    <button type="button" className="preset-btn" onClick={() => setHours(24)}>24h</button>
                  </div>
                </div>
                {erro && <div className="note-bad" id="day-erro" style={{ marginBottom: 10 }}>{erro}</div>}
                <button className="btn btn-primary" id="day-save" onClick={submitFixo}><IconPlus size={15} /> Salvar horas do dia</button>
                <div style={{ marginTop: 8 }}><button type="button" className="subtle-link" id="day-novo" onClick={() => { setShowNewVinculo(true); setErro(""); }}><IconPlus size={13} /> Cadastrar outro cargo fixo</button></div>
              </>
            )}
          </div>
        </div></div></div>
      )}
    </>
  );
}

function ExpensesTab({ monthExpenseItems, addExpense, addRecurringExpense, viewYear, viewMonth, totalPending, openSignal, limits, setLimit, updateExpense, updateRecurringExpense, desk, history12 = [], chartMonths, setChartMonths, goMonth, goTab }) {
  const [editKey, setEditKey] = useState(null);
  const gv = useGv();
  const [showForm, setShowForm] = useState(false);
  useEffect(() => { if (openSignal) setShowForm(true); }, [openSignal]);
  const [mode, setMode] = useState("recorrente");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(dateStr(viewYear, viewMonth, 5));
  const [diaVencimento, setDiaVencimento] = useState(5);
  const [cat, setCat] = useState("outros");
  const [catTouched, setCatTouched] = useState(false);
  const [filter, setFilter] = useState("todas");
  const [sort, setSort] = useState("data");
  const [openFat, setOpenFat] = useState(null);
  const [openGrp, setOpenGrp] = useState({});
  const [editing, setEditing] = useState(null);
  const [addCat, setAddCat] = useState("");
  const [extraCats, setExtraCats] = useState([]);
  const today = todayStr();

  useEffect(() => { setDueDate(dateStr(viewYear, viewMonth, 5)); }, [viewYear, viewMonth]);
  const onDesc = (v) => { setDescription(v); if (!catTouched) setCat(guessExpCat(v)); };

  const submit = () => {
    if (!description || !amount) return;
    if (mode === "pontual") addExpense(description, amount, dueDate, cat);
    else addRecurringExpense({ description, amount, diaVencimento, startMonth: monthKeyOf(viewYear, viewMonth), category: cat });
    setDescription(""); setAmount(""); setCat("outros"); setCatTouched(false); setShowForm(false);
  };

  const total = monthExpenseItems.reduce((a, e) => a + e.amount, 0);
  const paidTotal = monthExpenseItems.filter((e) => e.paid).reduce((a, e) => a + e.amount, 0);
  const pct = total > 0 ? Math.round((paidTotal / total) * 100) : 0;

  const spentBy = useMemo(() => {
    const map = {};
    monthExpenseItems.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return map;
  }, [monthExpenseItems]);
  const catIds = [...new Set(Object.keys(spentBy).concat(Object.keys(limits).filter((c) => c !== "__total"), extraCats))]
    .sort((a, b) => ((spentBy[b] || 0) / (limits[b] || 1e9)) - ((spentBy[a] || 0) / (limits[a] || 1e9)) || (spentBy[b] || 0) - (spentBy[a] || 0));
  const freeCats = EXP_CATS.filter((c) => !catIds.includes(c.id));

  const visible = monthExpenseItems.filter((e) => filter === "todas" ? true : filter === "pagas" ? e.paid : !e.paid)
    .sort((a, b) => (a.dateIso || "").localeCompare(b.dateIso || ""));
  const catLabel = (e) => (EXP_CAT_MAP[e.category] || EXP_CAT_MAP.outros).label;
  const byDate = (a, b) => (a.dateIso || "").localeCompare(b.dateIso || "") || a.description.localeCompare(b.description);
  const ordem = { data: byDate, valor: (a, b) => b.amount - a.amount || byDate(a, b), categoria: (a, b) => catLabel(a).localeCompare(catLabel(b)) || byDate(a, b) };
  const sorted = [...visible].sort(ordem[sort] || byDate);
  const secs = [
    { id: "atrasadas", titulo: "Atrasadas", items: sorted.filter((e) => !e.paid && e.dateIso < today) },
    { id: "apagar", titulo: "A pagar", items: sorted.filter((e) => !e.paid && e.dateIso >= today) },
    { id: "pagas", titulo: "Pagas", items: sorted.filter((e) => e.paid) },
  ].filter((x) => x.items.length > 0);
  const catResumo = Object.keys(spentBy).map((c) => { const m = EXP_CAT_MAP[c] || EXP_CAT_MAP.outros; return { id: c, label: m.label, color: m.color, valor: spentBy[c] }; }).filter((c) => c.valor > 0).sort((a, b) => b.valor - a.valor);

  return (
    <div>
      <div className="kpi-row">
        <Kpi label="Total do mês" value={fmtBRL(total)} />
        <Kpi label="Já pago" value={fmtBRL(paidTotal)} tone="var(--teal)" sub={pct + "% quitado"} />
        <Kpi label="Falta pagar" value={fmtBRL(totalPending)} tone="var(--brick)" />
        <Kpi label="Contas no mês" value={monthExpenseItems.length} sub={monthExpenseItems.filter((e) => !e.paid).length + " pendente(s)"} />
      </div>

      <div className={desk ? "dgrid" : ""} style={desk ? { gridTemplateColumns: "1.7fr 1fr", alignItems: "start" } : null}>
      <div className="card">
        <div className="card-head">
          <h3 className="card-title">Contas de {MONTHS_PT[viewMonth].toLowerCase()}</h3>
          <div className="segmented sm">
            {[["todas", "Todas"], ["pendentes", "Pendentes"], ["pagas", "Pagas"]].map(([k, l]) => (
              <button key={k} className={`seg-btn ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
        </div>
        {visible.length === 0 && <div className="empty-state">{monthExpenseItems.length === 0 ? "Nenhuma despesa cadastrada neste mês." : "Nada por aqui neste filtro."}</div>}
        {total > 0 && (
          <div className="xl-cats" id="exp-cats">
            <div className="xl-bar">{catResumo.map((c) => <i key={c.id} style={{ width: `${(c.valor / total) * 100}%`, background: c.color }} title={`${c.label}: ${fmtBRL(c.valor)}`} />)}</div>
            <div className="xl-legend">{catResumo.slice(0, 5).map((c) => <span key={c.id}><i style={{ background: c.color }} />{c.label} <b>{Math.round((c.valor / total) * 100)}%</b></span>)}{catResumo.length > 5 && <span>+{catResumo.length - 5}</span>}</div>
          </div>
        )}
        {visible.length > 1 && (
          <div className="xl-tools">
            <span>Ordenar por</span>
            {[["data", "Vencimento"], ["valor", "Maior valor"], ["categoria", "Categoria"]].map(([k, l]) => <button key={k} type="button" data-sort={k} className={`chip sm ${sort === k ? "active" : ""}`} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>)}
          </div>
        )}
        {visible.length > 0 && (
          <div className="xl" id="exp-list">
            <div className="xl-row xl-head"><span /><span>Venc.</span><span>Descrição</span><span>Categoria</span><span className="xl-tipo">Tipo</span><span className="r">Valor</span><span>Situação</span><span /></div>
            {secs.map((sec) => (
              <div key={sec.id} className="xl-secbox" data-sec={sec.id}>
                <div className={`xl-sec ${sec.id}`}><b>{sec.titulo}</b><span>{sec.items.length} {sec.items.length === 1 ? "conta" : "contas"} · {fmtBRL(sec.items.reduce((a, e) => a + e.amount, 0))}</span></div>
                {sec.items.map((e) => {
                  const meta = EXP_CAT_MAP[e.category] || EXP_CAT_MAP.outros;
                  const di = dueInfo(e.dateIso, today, e.paid), dm = e.dateIso.slice(8, 10) + "/" + e.dateIso.slice(5, 7);
                  const linha = (
                    <div key={e.key} className={`xl-row ${e.paid ? "is-paid" : ""}`} data-exp={e.description}>
                      <button type="button" className={`xl-check ${e.paid ? "on" : ""}`} aria-pressed={e.paid} aria-label={e.paid ? `Desmarcar ${e.description} como paga` : `Marcar ${e.description} como paga`} onClick={e.toggle}>
                        {e.paid && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      </button>
                      <span className="xl-date mono">{dm}</span>
                      <div className="xl-main">
                        <div className="xl-title">{e.description}</div>
                        {e.itens && <button type="button" className="xl-more" data-fat-open aria-expanded={openFat === e.key} onClick={() => setOpenFat(openFat === e.key ? null : e.key)}>{openFat === e.key ? "Fechar" : `Ver os ${e.itens.length} gastos`} <span aria-hidden="true">{openFat === e.key ? "▴" : "▾"}</span></button>}
                        <div className="xl-sub"><span className="mono">{dm}</span><span>·</span><i style={{ background: meta.color }} /><span>{meta.label}</span>{e.tipo === "recorrente" && <><span>·</span><span>todo mês</span></>}</div>
                      </div>
                      <span className="xl-cat"><i style={{ background: meta.color }} />{meta.label}</span>
                      <span className="xl-tipo">{e.tipo === "recorrente" ? "Todo mês" : "Pontual"}</span>
                      <span className="xl-amt"><span className="mono">{fmtBRL(e.amount)}</span>{!e.paid && di.cls !== "open" && <small className={`due ${di.cls}`}>{di.text}</small>}</span>
                      <span className="xl-st"><span className={`due ${di.cls}`}>{e.paid ? "Paga" : di.text}</span></span>
                      <button type="button" className={`fz-pen ${editKey === e.key ? "on" : ""}`} aria-label={`Editar ${e.description}`} aria-expanded={editKey === e.key} onClick={() => setEditKey(editKey === e.key ? null : e.key)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></button>
                    </div>
                  );
                  const ed = editKey === e.key && e.ref ? (
                    <div className="xl-edit" key={e.key + "-ed"}><div className="fz-ed">
                      <div className="fz-tit">Editar {e.description}</div>
                      <ExpenseEditForm item={e} onCancel={() => setEditKey(null)}
                        onDelete={() => { if (e.tipo === "recorrente") { e.remove(); } else if (window.confirm(`Excluir "${e.description}"?`)) e.remove(); setEditKey(null); }}
                        onSubmit={(d, modo) => { if (e.ref.t === "exp") updateExpense(e.ref.id, d); else updateRecurringExpense(e.ref.id, d, e.ref.mk, modo); setEditKey(null); }} />
                    </div></div>
                  ) : null;
                  if (e.itens && openFat === e.key) return (
                    <React.Fragment key={e.key}>
                      {linha}{ed}
                      <div className="xl-fat" data-fat={e.description}>
                        <div className="xl-fat-h">Gastos desta fatura por categoria</div>
                        {faturaGrupos(e.itens).map((g) => { const gk = e.key + "|" + g.id, ab = !!openGrp[gk]; return (
                          <div key={g.id} className="xl-grp">
                            <button type="button" className="xl-grp-h" data-grp={g.label} aria-expanded={ab} onClick={() => setOpenGrp((p) => ({ ...p, [gk]: !p[gk] }))}>
                              <span className="xl-grp-n"><i style={{ background: g.color }} />{g.label}<small>{g.itens.length} {g.itens.length === 1 ? "compra" : "compras"} · {Math.round((g.valor / (e.amount || 1)) * 100)}%</small></span>
                              <b className="mono">{fmtBRL(g.valor)}</b><span className="xl-grp-c" aria-hidden="true">{ab ? "▴" : "▾"}</span>
                            </button>
                            <div className="xl-grp-bar"><i style={{ width: `${Math.min(100, (g.valor / (e.amount || 1)) * 100)}%`, background: g.color }} /></div>
                            {ab && g.itens.map((it, n) => <div key={n} className="xl-it"><span className="mono">{(it.dt || "").slice(8, 10)}/{(it.dt || "").slice(5, 7)}</span><span className="xl-it-d">{it.d}</span><b className="mono">{fmtBRL(it.v)}</b></div>)}
                          </div>
                        ); })}
                        {Math.abs(e.ajuste || 0) >= 0.01 && (
                          <div className="xl-it xl-aj"><span className="xl-it-d">{e.ajuste < 0 ? "Créditos, estornos e pagamentos a mais do mês anterior" : "Encargos e saldo que veio do mês anterior"}</span><b className="mono">{e.ajuste < 0 ? "− " : "+ "}{fmtBRL(Math.abs(e.ajuste))}</b></div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                  return ed ? <React.Fragment key={e.key}>{linha}{ed}</React.Fragment> : linha;
                })}
              </div>
            ))}
            <div className="xl-total"><span>{filter === "todas" ? "Total do mês" : "Total deste filtro"} · {visible.length} {visible.length === 1 ? "conta" : "contas"}</span><b className="mono">{fmtBRL(visible.reduce((a, e) => a + e.amount, 0))}</b></div>
          </div>
        )}
        <div className="field-hint" style={{ marginTop: 10 }}>Toque no círculo para marcar a conta como paga.</div>
      </div>
      {desk && (() => {
        const m = {}; monthExpenseItems.forEach((e) => { const c = EXP_CAT_MAP[e.category] ? e.category : "outros"; m[c] = (m[c] || 0) + e.amount; });
        const d = Object.entries(m).map(([c, v]) => ({ nome: (EXP_CAT_MAP[c] || EXP_CAT_MAP.outros).label, value: v, cor: (EXP_CAT_MAP[c] || EXP_CAT_MAP.outros).color })).sort((a, b) => b.value - a.value);
        return <div className="card"><div className="card-head"><h3 className="card-title">Por categoria</h3><span className="card-note">{MONTHS_PT[viewMonth].toLowerCase()}</span></div>{d.length ? <InteractiveDonut data={d} size={170} stroke={22} centerLabel="no mês" /> : <div className="empty-state">Nenhuma despesa ainda.</div>}</div>;
      })()}
      </div>
      {(() => { const conteudo = (
      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3 className="card-title">{showForm ? "Nova despesa" : "Adicionar despesa"}</h3>{showForm && <button className="btn-icon" onClick={() => setShowForm(false)}><IconX size={16} /></button>}</div>
          {!showForm ? (
            <div>
              <p className="line-sub" style={{ marginTop: 0 }}>Cadastre contas fixas uma vez só e elas aparecem todo mês. Também dá para importar o extrato do banco.</p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}><IconPlus size={16} color="#fff" /> Nova despesa</button>
            </div>
          ) : (
            <div>
              <div className="segmented">
                <button className={`seg-btn ${mode === "recorrente" ? "active" : ""}`} onClick={() => setMode("recorrente")}>Todo mês</button>
                <button className={`seg-btn ${mode === "pontual" ? "active" : ""}`} onClick={() => setMode("pontual")}>Só este mês</button>
              </div>
              <div className="form-grid">
                <div className="field" style={{ gridColumn: "1 / -1" }}><label>Descrição</label><input value={description} onChange={(e) => onDesc(e.target.value)} placeholder="Ex: Aluguel, energia, Netflix..." /></div>
                <div className="field"><label>Valor (R$)</label><MoneyInput value={amount} onChange={setAmount} /></div>
                {mode === "pontual" ? (
                  <div className="field"><label>Vencimento</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                ) : (
                  <div className="field"><label>Vence todo dia</label><input type="number" inputMode="numeric" min="1" max="31" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} /></div>
                )}
              </div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Categoria</label>
                <div className="cat-grid">
                  {EXP_CATS.map((c) => (
                    <button key={c.id} type="button" className={`cat-btn ${cat === c.id ? "active" : ""}`} onClick={() => { setCat(c.id); setCatTouched(true); }}>
                      <span className="em" style={{ background: cat === c.id ? c.color + "1f" : "transparent" }}><ExpIcon id={c.id} size={19} color={cat === c.id ? c.color : "#94A3B8"} /></span>{c.label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" onClick={submit}><IconPlus size={15} color="#fff" /> Salvar despesa</button>
            </div>
          )}
        </div>

      </div>
      ); return desk ? (
        <DGrid>
          <DGv id="desp-add" wide open icon={<IconPlus size={18} />} title="Adicionar despesa" sub="conta fixa ou só deste mês" val="">{conteudo}</DGv>
          <DGv id="desp-12m" icon={<IconTrending size={18} />} tone="#F59E0B" title="Despesas mês a mês" sub={`últimos ${chartMonths} meses`} val={"média " + fmtBRL(history12.length ? history12.reduce((a, h) => a + h.expenses, 0) / history12.length : 0)}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}><RangeTabs value={chartMonths} onChange={setChartMonths} /></div>
            <SvgAreaChart data={history12} height={200} color="#F59E0B" valueKey="expenses" onOpen={(d) => goMonth && goMonth(d.y, d.m)} />
          </DGv>
          <DGv id="desp-venc" icon={<IconCalendar size={18} />} tone="#B91C1C" title="Próximos vencimentos" sub={monthExpenseItems.filter((e) => !e.paid).length + " conta(s) a pagar"} val={fmtBRL(totalPending)}>
            <DProximos incomeItems={[]} expenseItems={monthExpenseItems} max={10} />
          </DGv>
          <DGv id="desp-imp" icon={<IconUpload size={18} />} tone="#334155" title="Importar extrato ou fatura" sub="PDF, OFX ou planilha" val="">
            <p className="line-sub" style={{ marginTop: 0 }}>Traga as despesas do banco ou do cartão de uma vez.</p>
            <button className="btn btn-ghost" onClick={() => goTab && goTab("importar")}>Abrir Importar</button>
          </DGv>
        </DGrid>
      ) : conteudo; })()}

    </div>
  );
}

function AssetInput({ value, onChange, onPick, options, placeholder, showAllOnEmpty }) {
  const [open, setOpen] = useState(false);
  const q = normTxt(value).trim();
  const results = useMemo(() => {
    if (!q) return showAllOnEmpty ? options.slice(0, 8) : [];
    const scored = [];
    options.forEach((o) => {
      const t = normTxt(o.t), n = normTxt(o.n);
      let sc = -1;
      if (t.startsWith(q)) sc = 0;
      else if (n.split(/[\s\-\/&]+/).some((w) => w.startsWith(q))) sc = 1;
      else if (t.includes(q)) sc = 2;
      else if (n.includes(q)) sc = 3;
      if (sc >= 0) scored.push([sc, o]);
    });
    scored.sort((x, y) => x[0] - y[0] || x[1].t.localeCompare(y[1].t));
    return scored.slice(0, 8).map((x) => x[1]);
  }, [q, options, showAllOnEmpty]);

  return (
    <div className="asset-wrap">
      <input value={value} autoComplete="off" autoCapitalize="characters" spellCheck={false}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 180)} placeholder={placeholder} />
      {open && results.length > 0 && (
        <div className="asset-list">
          {results.map((o) => (
            <div key={o.t} className="asset-item" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(o); setOpen(false); }}>
              <span className="asset-tk">{o.t}</span>
              {o.n && <span className="asset-nm">{o.n}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InvestmentsTab({ investments, portfolio, cotacoes, addInvestment, removeInvestment, adjustAvg,
  setCotacao, brapiToken, setBrapiToken, refreshQuotes, quoteStatus, quoteRun, viewYear, viewMonth, investmentsHistory12, chartMonths, setChartMonths, openSignal, discreto, setDiscreto, abrirPrint, desk }) {
  const gv = useGv();
  const [tab, setTab] = useState("resumo");
  const [showForm, setShowForm] = useState(false);
  useEffect(() => { if (openSignal) { setShowForm(true); setTab("resumo"); } }, [openSignal]);
  const [catFilter, setCatFilter] = useState("todas");
  const [sortBy, setSortBy] = useState("valor");
  const [openKey, setOpenKey] = useState(null);
  const [catsAbertas, setCatsAbertas] = useState(null); // null = só a maior classe aberta
  const [catsTodas, setCatsTodas] = useState({});
  const [pmDraft, setPmDraft] = useState({});
  const [pmEdit, setPmEdit] = useState(null); // { key, value, erro }
  const formRef = useRef(null);
  const todayIso = todayStr();

  // ----- formulário -----
  const [tipo, setTipo] = useState("compra");
  const [category, setCategory] = useState("Ações");
  const [scope, setScope] = useState("geral");      // geral = valor total da categoria | ativo = por ação/fundo
  const [entry, setEntry] = useState("valor");      // valor = só o valor gasto | qtd = quantidade x preço
  const [description, setDescription] = useState("");
  const [assetName, setAssetName] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso);
  const meta = invCatMeta(category);
  const isTicker = meta.kind === "ticker";
  const byAsset = isTicker && scope === "ativo";
  const needsDesc = !isTicker || byAsset;
  const useQty = byAsset && entry === "qtd";
  const options = useMemo(() => {
    if (isTicker) return ASSET_DB.filter((a) => a.ty === meta.type);
    if (category === "Renda Fixa") return FIXED_INCOME_OPTIONS;
    if (category === "Reserva de oportunidade") return RESERVE_OPTIONS;
    return [];
  }, [category]);
  const pickCategory = (id) => { setCategory(id); setDescription(""); setAssetName(""); };
  const formTotal = useQty ? numOf(qty) * numOf(price) : numOf(amount);

  const submit = () => {
    if (formTotal <= 0) return;
    let desc = description.trim(), name = assetName;
    if (isTicker && !byAsset) { desc = `${category} (geral)`; name = "Lançamento geral da categoria"; }
    else if (isTicker) { desc = desc.toUpperCase(); name = name || ASSET_NAME[desc] || ""; }
    if (!desc) return;
    if (useQty && numOf(qty) <= 0) return;
    addInvestment({ description: desc, assetName: name, category, date, tipo, qty: useQty ? numOf(qty) : 0, price: useQty ? numOf(price) : 0, amount: tipo === "venda" ? -formTotal : formTotal });
    setDescription(""); setAssetName(""); setQty(""); setPrice(""); setAmount(""); setShowForm(false); setTab("ativos");
  };

  // ----- derivados -----
  const { positions, totalCost, totalValue, totalBought, totalSold } = portfolio;
  const profit = totalValue - totalCost;
  const profitPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const totalReturn = totalValue + totalSold - totalBought;
  const returnPct = totalBought > 0 ? (totalReturn / totalBought) * 100 : 0;
  const sgn = (n) => (n >= 0 ? "+" : "−");
  const signPct = (n) => sgn(n) + Math.abs(n).toFixed(2).replace(".", ",") + "%";
  const pctOf = (v) => (totalValue > 0 ? ((v / totalValue) * 100).toFixed(1).replace(".", ",") : "0") + "%";

  const classes = useMemo(() => {
    const map = {};
    positions.forEach((p) => { map[p.category] = (map[p.category] || 0) + p.value; });
    return Object.entries(map).map(([cat, value]) => ({ nome: cat, value, cor: invCatMeta(cat).color })).sort((a, b) => b.value - a.value);
  }, [positions]);
  const presentCats = classes.map((c) => c.nome);
  const perf = positions.filter((p) => p.cost > 0 && p.cotacao > 0).map((p) => ({ label: p.description, pct: p.profitPct })).sort((a, b) => b.pct - a.pct);
  const topPos = positions.slice(0, 8).map((p) => ({ name: p.description, value: p.value }));
  const sorters = {
    valor: (a, b) => b.value - a.value,
    alta: (a, b) => b.profitPct - a.profitPct,
    baixa: (a, b) => a.profitPct - b.profitPct,
    az: (a, b) => a.description.localeCompare(b.description),
  };
  const grouped = presentCats.filter((c) => catFilter === "todas" || c === catFilter).map((c) => ({ cat: c, items: positions.filter((p) => p.category === c).sort(sorters[sortBy] || sorters.valor) }));
  const somaG = (g) => g.items.reduce((a, p) => a + p.value, 0);
  const gruposOrd = [...grouped].sort((x, y) => somaG(y) - somaG(x));
  const maiorCat = gruposOrd.length ? gruposOrd[0].cat : null;
  const tickerCount = positions.filter((p) => p.isQty && p.meta.kind === "ticker").length;
  // posição que o lançamento em preenchimento vai alterar, para mostrar o efeito antes de salvar
  const held = needsDesc && description.trim() ? positions.find((p) => p.category === category && p.description.toUpperCase() === description.trim().toUpperCase()) : null;
  const startTrade = (p, kind) => {
    setTipo(kind); setCategory(p.category); setScope("ativo"); setEntry(p.isQty ? "qtd" : "valor");
    setDescription(p.description); setAssetName(p.assetName || ""); setQty(""); setAmount("");
    setPrice(p.isQty && p.cotacao > 0 ? String(p.cotacao) : "");
    setShowForm(true);
    setTimeout(() => { try { formRef.current.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }); } catch (e) {} }, 60);
  };

  return (
    <div>
      <EyeBtn on={discreto} toggle={() => setDiscreto(!discreto)} />
      <div className="kpi-row">
        <Kpi label="Total investido" num={totalCost} sub="custo das posições" />
        <Kpi label="Patrimônio atual" num={totalValue} sub={positions.length + " posição(ões)"} />
        <Kpi label="Variação" num={profit} fmt={(n) => sgn(n) + " " + fmtBRL(Math.abs(n))} tone={profit >= 0 ? "var(--teal)" : "var(--brick)"} sub={signPct(profitPct) + " sobre o custo"} />
        <Kpi label="Rentabilidade" num={returnPct} fmt={signPct} tone={returnPct >= 0 ? "var(--teal)" : "var(--brick)"} sub="considera vendas" />
      </div>
      {desk && positions.length > 0 && (
        <div className="dgrid" style={{ gridTemplateColumns: "1fr", marginBottom: 14 }}>
          <div className="card dinv-ev"><div className="card-head"><h3 className="card-title">Quanto você já investiu, mês a mês</h3><RangeTabs value={chartMonths} onChange={setChartMonths} /></div>
            <SvgAreaChart data={investmentsHistory12} height={170} color="#7C3AED" valueKey="acumulado" /></div>
        </div>
      )}

      <div className="subtabs-row">
        <div className="subtabs">
          {[["resumo", "Resumo"], ["ativos", "Ativos"], ["lancamentos", "Lançamentos"], ["evolucao", "Evolução"]].map(([k, l]) => (
            <button key={k} className={`subtab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <div className="inv-acoes">
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? "Fechar" : "Novo lançamento"}</button>
        </div>
      </div>

      {showForm && (
        <div className="card" ref={formRef}>
          <div className="card-head"><h3 className="card-title">Novo lançamento</h3></div>
          <div className="tipo-toggle">
            <button className={`tipo-btn buy ${tipo === "compra" ? "active" : ""}`} onClick={() => setTipo("compra")}>Compra / aporte</button>
            <button className={`tipo-btn sell ${tipo === "venda" ? "active" : ""}`} onClick={() => setTipo("venda")}>Venda / resgate</button>
          </div>
          <div className="field"><label>Categoria</label>
            <div className="chip-row">{INV_CATEGORIES.map((c) => <button key={c.id} type="button" className={`chip ${category === c.id ? "active" : ""}`} onClick={() => pickCategory(c.id)}>{c.id}</button>)}</div>
          </div>
          {isTicker && (
            <div className="field" style={{ marginTop: 14 }}><label>Como você quer lançar?</label>
              <div className="segmented" style={{ marginBottom: 0 }}>
                <button className={`seg-btn ${scope === "geral" ? "active" : ""}`} onClick={() => setScope("geral")}>Valor total em {category}</button>
                <button className={`seg-btn ${scope === "ativo" ? "active" : ""}`} onClick={() => setScope("ativo")}>Por ativo</button>
              </div>
              {scope === "geral" && <div className="field-hint">Ex.: “investi R$ 10.000 em {category.toLowerCase()} em geral”, sem detalhar cada ativo. Você pode detalhar depois.</div>}
            </div>
          )}
          <div className="form-grid" style={{ marginTop: 14 }}>
            {needsDesc && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>{isTicker ? "Ativo" : "Descrição"}</label>
                {meta.kind === "free" ? (
                  <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={meta.hint} />
                ) : (
                  <AssetInput value={description} options={options} showAllOnEmpty={meta.kind === "list"} placeholder={meta.hint}
                    onChange={(v) => { setDescription(v); setAssetName(""); }} onPick={(o) => { setDescription(o.t); setAssetName(o.n || ""); }} />
                )}
                {assetName && <div className="field-hint"><b>{description}</b> · {assetName}</div>}
                {isTicker && !assetName && description && <div className="field-hint">Não achou na lista? Pode seguir digitando o código normalmente.</div>}
              </div>
            )}
            {byAsset && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <div className="segmented sm" style={{ marginBottom: 0 }}>
                  <button className={`seg-btn ${entry === "valor" ? "active" : ""}`} onClick={() => setEntry("valor")}>Valor gasto</button>
                  <button className={`seg-btn ${entry === "qtd" ? "active" : ""}`} onClick={() => setEntry("qtd")}>Quantidade x preço</button>
                </div>
              </div>
            )}
            {useQty ? (
              <>
                <div className="field"><label>Quantidade</label><input type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" /></div>
                <div className="field"><label>Preço unitário (R$)</label><MoneyInput value={price} onChange={setPrice} /></div>
              </>
            ) : (
              <div className="field"><label>{tipo === "venda" ? "Valor resgatado / vendido (R$)" : "Valor investido (R$)"}</label><MoneyInput value={amount} onChange={setAmount} /></div>
            )}
            <div className="field"><label>Data</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          {held && (() => {
            const q = numOf(qty), pr = numOf(price);
            const buying = tipo !== "venda";
            const newQty = held.qty + q, newAvg = newQty > 0 ? (held.cost + q * pr) / newQty : 0;
            const sellQty = Math.min(q, held.qty), sellResult = (pr - held.avg) * sellQty;
            return (
              <div className="pos-preview">
                <div className="pp-title">Sua posição em {held.description}</div>
                <div className="pp-grid">
                  {held.isQty ? (
                    <>
                      <div><span>Você tem</span><b className="mono">{fmtQty(held.qty)}</b></div>
                      <div><span>Preço médio</span><b className="mono">{fmtBRL(held.avg)}</b></div>
                      <div><span>Cotação</span><b className="mono">{held.cotacao > 0 ? fmtBRL(held.cotacao) : "—"}</b></div>
                    </>
                  ) : (
                    <>
                      <div><span>Investido</span><b className="mono">{fmtBRL(held.cost)}</b></div>
                      <div><span>Valor atual</span><b className="mono">{held.cotacao > 0 ? fmtBRL(held.value) : "—"}</b></div>
                    </>
                  )}
                </div>
                {useQty && held.isQty && held.cotacao > 0 && !price && (
                  <button type="button" className="btn btn-ghost sm" style={{ marginTop: 10 }} onClick={() => setPrice(String(held.cotacao))}>Usar a cotação atual ({fmtBRL(held.cotacao)})</button>
                )}
                {useQty && held.isQty && q > 0 && pr > 0 && buying && (
                  <div className="pp-after">Depois desta compra: <b className="mono">{fmtQty(newQty)}</b> no total, com preço médio de <b className="mono">{fmtBRL(newAvg)}</b>.</div>
                )}
                {useQty && held.isQty && q > 0 && pr > 0 && !buying && (
                  <div className="pp-after">
                    {q > held.qty + 0.0000001 ? `Você só tem ${fmtQty(held.qty)}. A venda será limitada a essa quantidade. ` : ""}
                    Resultado desta venda: <b className="mono" style={{ color: sellResult >= 0 ? "var(--teal)" : "var(--brick)" }}>{sellResult >= 0 ? "+" : "−"} {fmtBRL(Math.abs(sellResult))}</b>. Restam <b className="mono">{fmtQty(held.qty - sellQty)}</b>.
                  </div>
                )}
              </div>
            );
          })()}
          {formTotal > 0 && <div className="total-line">Total do lançamento: <b className="mono">{fmtBRL(formTotal)}</b></div>}
          <button className="btn btn-primary" onClick={submit}>Salvar {tipo === "venda" ? "venda" : "compra"}</button>
        </div>
      )}

      {/* ---------- RESUMO ---------- */}
      {tab === "resumo" && (
        <div>
          <div className="grid-2">
            <div className="card">
              <div className="card-head"><h3 className="card-title">Distribuição da carteira</h3><span className="card-note">por classe</span></div>
              {classes.length === 0 ? <div className="empty-state">Registre seu primeiro lançamento para ver a distribuição.</div> : (
                <InteractiveDonut data={classes} size={160} stroke={22} centerLabel="total" />
              )}
            </div>
            <div className="card">
              <div className="card-head"><h3 className="card-title">Maiores posições</h3></div>
              {topPos.length === 0 ? <div className="empty-state">Nada por aqui ainda.</div> : <HorizontalBarList data={topPos} color={TEAL} />}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3 className="card-title">Desempenho por ativo</h3><span className="card-note">sobre o custo</span></div>
            {perf.length === 0 ? <div className="empty-state">Informe a cotação (ou o valor atual) de cada ativo na aba “Ativos” para ver quem está subindo e quem está caindo.</div> : <PerfBars items={perf} />}
          </div>
        </div>
      )}

      {/* ---------- ATIVOS (cartões) ---------- */}
      {tab === "ativos" && (
        <div>
          <div className="card" id="quotes-card">
            <div className="card-head">
              <h3 className="card-title">Carteira</h3>
              <button className="btn btn-ghost quote-btn" disabled={quoteRun.busy} onClick={refreshQuotes}>
                <span className={quoteRun.busy ? "spin" : ""} style={{ display: "inline-flex" }}><IconRefresh size={15} /></span>
                {quoteRun.busy ? `Buscando ${quoteRun.done} de ${quoteRun.total}` : "Atualizar cotações"}
              </button>
            </div>
            {positions.length > 0 && (
              <div className="cl-tot">
                <b className="mono">{fmtBRL(totalValue)}</b>
                <small className="mono" style={{ color: profit >= 0 ? "var(--teal)" : "var(--brick)" }}>{sgn(profit)} {fmtBRL(Math.abs(profit))} ({signPct(profitPct)}) sobre o custo</small>
                <div className="cl-bar" role="img" aria-label="Divisão da carteira por classe">
                  {presentCats.map((c) => { const v = positions.filter((p) => p.category === c).reduce((a, p) => a + p.value, 0); return totalValue > 0 && v > 0 ? <i key={c} title={c + " " + pctOf(v)} style={{ width: (v / totalValue) * 100 + "%", background: invCatMeta(c).color }} /> : null; })}
                </div>
              </div>
            )}
            {quoteRun.busy && <div className="progress-track quote-track"><div className="quote-fill" style={{ width: `${quoteRun.total ? (quoteRun.done / quoteRun.total) * 100 : 0}%` }} /></div>}
            {quoteStatus && !quoteRun.busy && <div className={`quote-msg ${quoteRun.kind}`} role="status">{quoteStatus}</div>}
            {(!brapiToken || Object.values(quoteRun.marks || {}).includes("token")) && (
              <div className="token-box">
                <b>Para atualizar todos os ativos, cole um token gratuito da brapi.dev.</b>
                <p>Sem token, o serviço só responde alguns ativos de teste, como PETR4 e VALE3. Por isso os outros preços não mudam.</p>
                <ol>
                  <li>Crie uma conta grátis em <a href="https://brapi.dev" target="_blank" rel="noopener noreferrer">brapi.dev</a>.</li>
                  <li>Copie o token no painel da sua conta.</li>
                  <li>Cole no campo abaixo e toque em Atualizar cotações.</li>
                </ol>
                <div className="field" style={{ margin: "10px 0 0" }}>
                  <label htmlFor="brapi-token">Token da brapi.dev</label>
                  <input id="brapi-token" value={brapiToken} onChange={(e) => setBrapiToken(e.target.value.trim())} placeholder="cole seu token aqui" autoComplete="off" />
                </div>
              </div>
            )}
            {positions.length > 0 && (
              <div className="asset-tools">
                <label className="sort-pick">Ordenar ativos por
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="valor">Maior valor</option>
                    <option value="alta">Maior alta</option>
                    <option value="baixa">Maior queda</option>
                    <option value="az">Nome (A a Z)</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          {positions.length === 0 ? <div className="card"><div className="empty-state">Nenhuma posição ainda. Toque em “Novo lançamento”.</div></div> : gruposOrd.map((g, gi) => {
            const sub = g.items.reduce((a, p) => a + p.value, 0);
            const subProfit = sub - g.items.reduce((a, p) => a + p.cost, 0);
            const aberta = catsAbertas === null ? gi === 0 : catsAbertas.includes(g.cat);
            const alternar = () => setCatsAbertas((prev) => { const atual = prev === null ? [maiorCat] : prev; return atual.includes(g.cat) ? atual.filter((c) => c !== g.cat) : [...atual, g.cat]; });
            const LIM = 5, todas = catsTodas[g.cat] || g.items.length <= LIM + 1;
            const itens = todas ? g.items : g.items.slice(0, LIM);
            return (
              <section key={g.cat} className={`cl-card ${aberta ? "open" : ""}`} data-classe={g.cat}>
                <button type="button" className="cl-head" aria-expanded={aberta} onClick={alternar}>
                  <span className="cl-dot" style={{ background: invCatMeta(g.cat).color }} />
                  <span className="cl-name"><b>{g.cat}</b><small>{g.items.length} {g.items.length === 1 ? "ativo" : "ativos"} · {pctOf(sub)}</small></span>
                  <span className="cl-val"><b className="mono">{fmtBRL(sub)}</b><small className="mono" style={{ color: subProfit >= 0 ? "var(--teal)" : "var(--brick)" }}>{sgn(subProfit)} {fmtBRL(Math.abs(subProfit))}</small></span>
                  <span className="cl-chev" aria-hidden="true"><IconChevronDown size={18} /></span>
                </button>
                {aberta && (
                <div className="asset-grid">
                  {itens.map((p) => {
                    const open = openKey === p.key;
                    const hasQuote = p.cotacao > 0;
                    const mark = quoteRun.marks[p.description];
                    const weight = totalValue > 0 ? (p.value / totalValue) * 100 : 0;
                    const hist = open ? investments.filter((i) => i.description === p.description && (i.category || "Outro") === p.category).sort((a, b) => (b.date || "").localeCompare(a.date || "")) : [];
                    const quoteInput = (
                      <input className="cell-input ac-input" type="number" inputMode="decimal" aria-label={(p.isQty ? "Cotação de " : "Valor atual de ") + p.description}
                        value={cotacoes[p.description] ?? ""} placeholder={p.isQty ? p.avg.toFixed(2) : p.cost.toFixed(2)} onChange={(e) => setCotacao(p.description, e.target.value)} />
                    );
                    return (
                      <article key={p.key} className={`asset-card cl-row ${open ? "open" : ""}`} data-asset={p.description}>
                        <button className="ac-top" aria-expanded={open} onClick={() => setOpenKey(open ? null : p.key)}>
                          <span className="ac-id"><b>{p.description}</b><span className="mono">{p.isQty ? `${fmtQty(p.qty)} · PM ${fmtBRL(p.avg)}${hasQuote ? " · hoje " + fmtBRL(p.cotacao) : ""}` : `aplicado ${fmtBRL(p.cost)}`}</span></span>
                          <span className="ac-val">
                            <b className="mono">{fmtBRL(p.value)}</b>
                            {hasQuote ? <small className="mono" style={{ color: p.profit >= 0 ? "var(--teal)" : "var(--brick)" }}>{signPct(p.profitPct)}</small> : <small>sem cotação</small>}
                          </span>
                        </button>
                        {open && (<>
                        <div className={`ac-stats ${p.isQty ? "" : "three"}`}>
                          {p.isQty ? (
                            <>
                              <div className="ac-stat"><span>Quantidade</span><b className="mono" title={fmtQty(p.qty)}>{fmtQty(p.qty)}</b></div>
                              <div className="ac-stat"><span>Preço médio (R$)</span><MoneyInput className="cell-input ac-input pm-in" aria-label={"Preço médio de " + p.description} value={pmDraft[p.key] !== undefined ? pmDraft[p.key] : Math.round(p.avg * 100) / 100} onChange={(v) => setPmDraft((d) => ({ ...d, [p.key]: v }))} /></div>
                              <div className="ac-stat"><span>Cotação (R$)</span>{quoteInput}</div>
                            </>
                          ) : (
                            <>
                              <div className="ac-stat"><span>Investido</span><b className="mono">{fmtBRL(p.cost)}</b></div>
                              <div className="ac-stat"><span>Valor atual (R$)</span>{quoteInput}</div>
                            </>
                          )}
                          <div className="ac-stat"><span>Resultado</span><b className="mono" style={hasQuote ? { color: p.profit >= 0 ? "var(--teal)" : "var(--brick)" } : null}>{hasQuote ? sgn(p.profit) + " " + fmtBRL(Math.abs(p.profit)) : "—"}</b></div>
                        </div>
                        {p.isQty && pmDraft[p.key] !== undefined && Math.abs((Number(pmDraft[p.key]) || 0) - Math.round(p.avg * 100) / 100) >= 0.005 && (
                          <div className="pm-bar" data-pm-bar>
                            <p>{Number(pmDraft[p.key]) > 0 ? <>Preço médio passa de {fmtBRL(p.avg)} para <b>{fmtBRL(Number(pmDraft[p.key]))}</b>. Total investido fica {fmtBRL(Number(pmDraft[p.key]) * p.qty)}.</> : "Digite um preço maior que zero."}</p>
                            <div className="pm-btns">
                              <button type="button" className="btn btn-primary sm" data-pm-salvar disabled={!(Number(pmDraft[p.key]) > 0)} onClick={() => { if (adjustAvg(p, pmDraft[p.key])) setPmDraft((d) => { const n = { ...d }; delete n[p.key]; return n; }); }}>Salvar preço médio</button>
                              <button type="button" className="btn btn-ghost sm" onClick={() => setPmDraft((d) => { const n = { ...d }; delete n[p.key]; return n; })}>Cancelar</button>
                            </div>
                            <small>Use para igualar ao preço médio da corretora. Não mexe no seu caixa. Para desfazer, apague o ajuste em Lançamentos.</small>
                          </div>
                        )}
                        <div className="ac-foot">
                          <span>{pctOf(p.value)} da carteira</span>
                          {mark && <span className={`qmark ${mark}`}>{mark === "ok" ? "cotação atualizada" : mark === "token" ? "precisa de token" : "sem retorno"}</span>}
                        </div>
                        </>)}
                        {open && (
                          <div className="ac-more">
                            {p.isQty && <div className="kv-line"><span>Quantidade</span><b className="mono">{fmtQty(p.qty)}</b></div>}
                            <div className="kv-line"><span>Total investido</span><b className="mono">{fmtBRL(p.cost)}</b></div>
                            <div className="kv-line"><span>Valor atual</span><b className="mono">{fmtBRL(p.value)}</b></div>
                            {Math.abs(p.realized) > 0.005 && <div className="kv-line"><span>Resultado de vendas</span><b className="mono" style={{ color: p.realized >= 0 ? "var(--teal)" : "var(--brick)" }}>{sgn(p.realized)} {fmtBRL(Math.abs(p.realized))}</b></div>}
                            <div className="ac-hist-title">{hist.length} {hist.length === 1 ? "lançamento" : "lançamentos"}</div>
                            {hist.map((i) => {
                              const sell = i.tipo === "venda" || Number(i.amount) < 0;
                              if (i.tipo === "ajuste") return (
                                <div key={i.id} className="ac-hist" data-ajuste>
                                  <span className="ah-date">{fmtDatePt(i.date)}</span>
                                  <span className="ah-kind" style={{ color: "var(--text-dim)" }}>Ajuste do preço médio</span>
                                  <span className="ah-qty mono">para {fmtBRL(i.price)}</span>
                                  <b className="mono">{Number(i.ajuste) >= 0 ? "+" : "−"} {fmtBRL(Math.abs(i.ajuste))}</b>
                                </div>
                              );
                              return (
                                <div key={i.id} className="ac-hist">
                                  <span className="ah-date">{fmtDatePt(i.date)}</span>
                                  <span className="ah-kind" style={{ color: i.posicaoInicial ? "var(--text-dim)" : sell ? "var(--brick)" : "var(--teal)" }}>{i.posicaoInicial ? "Posição inicial" : sell ? "Venda" : "Compra"}</span>
                                  <span className="ah-qty mono">{i.qty > 0 ? `${fmtQty(i.qty)} × ${fmtBRL(i.price)}` : ""}</span>
                                  <b className="mono">{fmtBRL(Math.abs(i.amount))}</b>
                                </div>
                              );
                            })}
                            <div className="ac-actions">
                              <button className="btn btn-primary sm" onClick={() => startTrade(p, "compra")}>Comprar mais</button>
                              <button className="btn btn-ghost sm" onClick={() => startTrade(p, "venda")}>Vender</button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                  {!todas && <button type="button" className="cl-more" onClick={() => setCatsTodas((p) => ({ ...p, [g.cat]: true }))}>Ver os {g.items.length} ativos</button>}
                </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* ---------- LANÇAMENTOS ---------- */}
      {tab === "lancamentos" && (
        <div className="card flush">
          <div className="card-head pad"><h3 className="card-title">Histórico de lançamentos</h3><span className="card-note">{investments.length} registro(s)</span></div>
          {investments.length === 0 ? <div className="empty-state">Nenhum lançamento ainda.</div> : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Data</th><th>Ativo</th><th>Tipo</th><th className="num hide-sm">Qtd.</th><th className="num hide-sm">Preço</th><th className="num">Total</th><th /></tr></thead>
                <tbody>
                  {[...investments].sort((a, b) => b.date.localeCompare(a.date)).map((i) => {
                    const sell = i.tipo === "venda" || Number(i.amount) < 0;
                    return (
                      <tr key={i.id}>
                        <td>{fmtDatePt(i.date).slice(0, 5)}<span className="cell-sub">{i.date.slice(0, 4)}</span></td>
                        <td><b>{i.description}</b><span className="cell-sub">{i.category}</span></td>
                        <td><span className={`badge ${i.posicaoInicial || i.tipo === "ajuste" ? "" : sell ? "badge-pending" : "badge-paid"}`} style={{ cursor: "default" }}>{i.tipo === "ajuste" ? "Ajuste de preço médio" : i.posicaoInicial ? "Posição inicial" : sell ? "Venda" : "Compra"}</span></td>
                        <td className="num mono hide-sm">{i.qty > 0 ? Number(i.qty) : "—"}</td>
                        <td className="num mono hide-sm">{i.qty > 0 || i.tipo === "ajuste" ? fmtBRL(i.price) : "—"}</td>
                        <td className="num mono" style={{ color: sell ? "var(--brick)" : "var(--text)" }}>{i.tipo === "ajuste" ? (Number(i.ajuste) >= 0 ? "+ " : "− ") + fmtBRL(Math.abs(i.ajuste)) : fmtBRL(Math.abs(i.amount))}</td>
                        <td className="num"><button className="btn-icon" onClick={() => removeInvestment(i.id)}><IconTrash size={15} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------- EVOLUÇÃO ---------- */}
      {tab === "evolucao" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-head"><h3 className="card-title">Aportes líquidos</h3><RangeTabs value={chartMonths} onChange={setChartMonths} /></div>
            <SvgBarChart data={investmentsHistory12} height={200} color={GOLD} negativeColor={BRICK} signed valueKey="aporte" />
          </div>
          <div className="card">
            <div className="card-head"><h3 className="card-title">Evolução do investido</h3><span className="card-note">acumulado</span></div>
            <SvgAreaChart data={investmentsHistory12} height={200} color={TEAL} valueKey="acumulado" />
          </div>
        </div>
      )}
    </div>
  );
}


// ---- Nota de corretagem (PDF no padrão SINACOR, usado pela maioria das corretoras) ----
const NOTA_CLASSE = { ON: "3", PN: "4", PNA: "5", PNB: "6", PNC: "7", PND: "8", UNT: "11", CI: "11" };
const notaNum = (t) => Number(String(t).replace(/\./g, "").replace(",", "."));
const notaIso = (t) => { const m = String(t).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const tickerValido = (t) => /^[A-Z]{4}\d{1,2}$/.test(String(t || ""));
// Descobre o código de negociação a partir da "especificação do título" da nota
function notaAtivo(specRaw) {
  const spec = String(specRaw || "").toUpperCase().replace(/\s+/g, " ").trim();
  const tk = spec.match(/(?:^|\s)([A-Z]{4}\d{1,2})F?(?=\s|$)/);
  if (tk) return { ticker: tk[1], name: ASSET_NAME[tk[1]] || "", incerto: false };
  const toks = stripAcc(spec).toUpperCase().split(" ").filter(Boolean);
  let ci = -1;
  for (let i = 1; i < toks.length; i++) if (NOTA_CLASSE[toks[i]]) { ci = i; break; }
  const suf = ci > 0 ? NOTA_CLASSE[toks[ci]] : "";
  const nomeT = (ci > 0 ? toks.slice(0, ci) : toks).filter((t) => !/^(FII|ETF|S\/A|SA)$/.test(t)).map((t) => t.replace(/[^A-Z0-9]/g, "")).filter(Boolean);
  if (!nomeT.length) return { ticker: "", name: "", incerto: true };
  const nn = nomeT.join(""), n1 = nomeT[0];
  const cands = ASSET_DB.filter((a) => {
    if (suf && !(a.t.endsWith(suf) && a.t.length === 4 + suf.length)) return false;
    const dw = stripAcc(a.n).toUpperCase().split(/\s+/).map((t) => t.replace(/[^A-Z0-9]/g, "")).filter((t) => t && !NOTA_CLASSE[t]);
    if (!dw.length) return false;
    const dn = dw.join("");
    return dn === nn || dn.startsWith(nn) || (dn.length >= 4 && nn.startsWith(dn)) || (n1.length >= 4 && dw.some((w) => w === n1 || w.startsWith(n1)));
  });
  if (cands.length === 1) return { ticker: cands[0].t, name: cands[0].n, incerto: true };
  return { ticker: "", name: "", incerto: true };
}
function parseNotaCorretagem(lines) {
  const RE = /(?:^|\s)([CV])\s+(VISTA|FRACION[AÁ]RIO)\s+(.+?)\s+(\d[\d.]*)\s+(\d[\d.]*,\d{2,8})\s+(\d[\d.]*,\d{2})\s+([DC])\s*$/i;
  const OUTROS = /(?:^|\s)[CV]\s+(OP[CÇ][AÃ]O|TERMO|EXERC|FUTURO|LEIL[AÃ]O)/i;
  const trades = []; let cur = null, outros = 0, ehNota = false;
  (lines || []).forEach((raw, i) => {
    const l = String(raw || "").replace(/\s+/g, " ").trim();
    if (/nota de (corretagem|negocia)/i.test(l)) ehNota = true;
    if (/data\s+preg[aã]o/i.test(l)) {
      let d = notaIso(l);
      for (let k = 1; !d && k <= 3 && i + k < lines.length; k++) d = notaIso(lines[i + k]);
      if (d) cur = d;
    }
    const m = l.match(RE);
    if (!m) { if (OUTROS.test(l)) outros++; return; }
    const qty = notaNum(m[4]), price = notaNum(m[5]), amount = notaNum(m[6]);
    if (!(qty > 0) || !(amount > 0)) return;
    const spec = m[3].replace(/(\s+(?:[#@]+|[#@]?[DHXPYLTIBAC28][#@]?))+$/i, "").replace(/^\d{2}\/\d{2}\s+/, "").trim();
    trades.push({ date: cur, spec, side: m[1].toUpperCase() === "C" ? "compra" : "venda", qty, price, amount });
  });
  const primeira = (trades.find((t) => t.date) || {}).date || null;
  const groups = {};
  trades.forEach((t) => {
    const date = t.date || primeira || todayStr();
    const k = [date, stripAcc(t.spec), t.side, t.price].join("|");
    if (groups[k]) { groups[k].qty += t.qty; groups[k].amount = Math.round((groups[k].amount + t.amount) * 100) / 100; }
    else groups[k] = { ...t, date, semData: !t.date && !primeira };
  });
  const rows = Object.values(groups).map((t) => {
    const a = notaAtivo(t.spec);
    return { kind: "trade", src: "neg", nota: true, date: t.date, semData: t.semData, ticker: a.ticker, spec: t.spec, name: a.name, incerto: a.incerto,
      category: a.ticker ? b3Category(a.ticker, "", "") : "Ações", side: t.side, qty: t.qty, price: t.price, amount: t.amount };
  });
  return { rows, outros, ehNota: ehNota || rows.length > 0, datas: [...new Set(rows.map((r) => r.date))].sort() };
}

function ImportTab({ buildExpenseItems, buildIncomeItems, importedKeys, commitImport, importLog, undoImport, goTab, commitB3, portfolio, investments, commitPrint, fonteInicial, limparFonte }) {
  const [b3raw, setB3raw] = useState([]);
  const [b3info, setB3info] = useState(null);
  const [source, setSource] = useState(fonteInicial || "extrato");
  useEffect(() => { if (fonteInicial && limparFonte) limparFonte(); }, []);
  const [raw, setRaw] = useState([]);
  const [label, setLabel] = useState("");
  const [invert, setInvert] = useState(false);
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [pwdFile, setPwdFile] = useState(null);
  const [password, setPassword] = useState("");
  const [filter, setFilter] = useState("todos");
  const [done, setDone] = useState(null);
  const [fatNome, setFatNome] = useState("Cartão de crédito");
  const [fatVenc, setFatVenc] = useState("");
  const [fatPago, setFatPago] = useState(null);
  const [fatInfo, setFatInfo] = useState(null);
  const [fatTotal, setFatTotal] = useState("");
  const fileRef = useRef(null);

  const reset = () => { setRaw([]); setB3raw([]); setB3info(null); setEdits({}); setLabel(""); setError(""); setInvert(false); setPwdFile(null); setPassword(""); setFatNome("Cartão de crédito"); setFatVenc(""); setFatPago(null); setFatInfo(null); setFatTotal(""); };

  const handleFiles = async (files, pwd) => {
    setError(""); setDone(null);
    const list = Array.from(files || []);
    if (!list.length) return;
    const today = new Date();
    if (source === "nota") {
      let rowsAll = [], outros = 0;
      for (const f of list) {
        try {
          setBusy("Lendo " + f.name + "…");
          const r = parseNotaCorretagem(await pdfToLines(await f.arrayBuffer(), pwd));
          if (r.rows.length === 0) setError(r.ehNota ? `Li “${f.name}”, mas não achei compras ou vendas à vista nela.` : `Não reconheci “${f.name}” como nota de corretagem. Se o PDF for uma foto ou escaneado, o app não consegue ler.`);
          rowsAll = rowsAll.concat(r.rows); outros += r.outros;
        } catch (e) {
          if (e && e.name === "PasswordException") { setPwdFile(f); setBusy(""); setError(pwd ? "Senha incorreta. Tente de novo." : "Esta nota tem senha. Digite abaixo (em geral, os primeiros dígitos do CPF)."); return; }
          setError(`Não consegui ler “${f.name}”: ${e && e.message ? e.message : e}`);
        }
      }
      setBusy(""); setPwdFile(null); setPassword("");
      if (rowsAll.length) {
        setB3raw((p) => p.concat(rowsAll));
        setB3info((p) => ({ proventos: 0, eventos: [], outros: (p ? p.outros : 0) + outros, tipos: ["Nota de corretagem"], nota: true, notaOutros: (p && p.notaOutros ? p.notaOutros : 0) + outros }));
        setLabel((l) => (l ? l + ", " : "") + list.map((f) => f.name).join(", "));
      }
      return;
    }
    if (source === "b3") {
      let rowsAll = [], inf = { proventos: 0, eventos: [], outros: 0, tipos: [] };
      for (const f of list) {
        try {
          setBusy("Lendo " + f.name + "…");
          const { rows, info } = parseB3Tables(await fileToTables(f));
          if (rows.length === 0) setError(`Não reconheci “${f.name}” como planilha da B3. Use os arquivos de Posição, Negociação ou Movimentação da Área do Investidor.`);
          rowsAll = rowsAll.concat(rows);
          inf = { proventos: inf.proventos + info.proventos, eventos: inf.eventos.concat(info.eventos), outros: inf.outros + info.outros, tipos: [...new Set(inf.tipos.concat(info.tipos))] };
        } catch (e) { setError(`Não consegui ler “${f.name}”: ${e && e.message ? e.message : e}`); }
      }
      setBusy("");
      if (rowsAll.length) {
        setB3raw((p) => p.concat(rowsAll));
        setB3info((p) => p ? { proventos: p.proventos + inf.proventos, eventos: p.eventos.concat(inf.eventos), outros: p.outros + inf.outros, tipos: [...new Set(p.tipos.concat(inf.tipos))] } : inf);
        setLabel((l) => (l ? l + ", " : "") + list.map((f) => f.name).join(", "));
      }
      return;
    }
    let all = [];
    for (const f of list) {
      const name = f.name || "arquivo";
      const ext = (name.split(".").pop() || "").toLowerCase();
      try {
        setBusy("Lendo " + name + "…");
        let rows = [];
        if (ext === "pdf" || f.type === "application/pdf") {
          const lines = await pdfToLines(await f.arrayBuffer(), pwd);
          rows = parseStatementLines(lines, guessYear(lines.join(" ")), today);
          const fi = faturaInfo(lines, guessYear(lines.join(" ")));
          if (fi.total || fi.venc) setFatInfo(fi);
        } else {
          const txt = await readTextSmart(f);
          if (/<OFX>|<STMTTRN>/i.test(txt) || ext === "ofx" || ext === "ofc" || ext === "qfx") rows = parseOFX(txt);
          else if (ext === "csv" || ext === "txt" || /[;,\t]/.test(txt)) rows = parseCSV(txt, guessYear(txt), today);
        }
        if (rows.length === 0) setError(`Não encontrei lançamentos em “${name}”. Se for PDF escaneado (foto), o app não consegue ler; tente baixar o extrato em OFX ou CSV no app do banco.`);
        all = all.concat(rows.map((r, i) => ({ ...r, id: name + ":" + i })));
      } catch (e) {
        if (e && e.name === "PasswordException") { setPwdFile(f); setBusy(""); setError(pwd ? "Senha incorreta. Tente de novo." : "Este PDF tem senha. Digite a senha abaixo (geralmente os primeiros dígitos do CPF)."); return; }
        setError(`Não consegui ler “${name}”: ${e && e.message ? e.message : e}`);
      }
    }
    setBusy(""); setPwdFile(null); setPassword("");
    if (all.length) {
      setRaw((prev) => prev.concat(all));
      setLabel((l) => (l ? l + ", " : "") + list.map((f) => f.name).join(", "));
    }
  };

  // classifica cada linha: nova despesa, baixa de conta existente, entrada, ou ignorar
  const rows = useMemo(() => {
    const today = new Date();
    const expCache = {}, incCache = {};
    const used = new Set();
    const monthOf = (iso) => [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1];
    return raw.map((r) => {
      let amount = Number(r.amount);
      if (r.fmt !== "ofx" && source === "fatura") amount = -amount;
      if (invert) amount = -amount;
      const out = amount < 0;
      const key = r.fitid ? "fit:" + r.fitid + ":" + amount.toFixed(2) : `${r.date}|${amount.toFixed(2)}|${stripAcc(r.desc).replace(/\s+/g, " ").slice(0, 40)}`;
      const base = { id: r.id, date: r.date, desc: r.desc, amount, out, key, category: guessExpCat(r.desc), action: out ? "novo" : "receita", reason: "", matchItem: null, matchLabel: "" };
      let auto = null;
      if (importedKeys[key]) auto = { action: "ignorar", reason: "Já importado antes" };
      else if (out && source === "extrato" && CARD_PAY_RE.test(r.desc)) auto = { action: "ignorar", reason: "Pagamento de fatura. Importe a fatura do cartão para ver cada gasto" };
      else if (!out && source === "fatura") auto = { action: "ignorar", reason: "Crédito na fatura (pagamento ou estorno)" };
      else if (source !== "fatura" && INVEST_RE.test(r.desc)) auto = { action: "ignorar", reason: "Parece aplicação ou resgate de investimento" };
      let row = auto ? { ...base, ...auto } : base;
      if (!auto) {
        const [y, m] = monthOf(r.date);
        const mk = y + "-" + m;
        const abs = Math.abs(amount);
        if (out) {
          const items = (expCache[mk] = expCache[mk] || buildExpenseItems(y, m)).filter((i) => !i.paid && !used.has(i.key));
          const best = items.map((i) => ({ i, diff: Math.abs(i.amount - abs) })).filter((x) => x.diff <= Math.max(0.5, x.i.amount * 0.005)).sort((a, b) => a.diff - b.diff)[0];
          if (best) { used.add(best.i.key); row = { ...row, action: "baixar", matchItem: best.i, matchLabel: `${best.i.description} · vence ${best.i.dateLabel.slice(0, 5)}` }; }
        } else {
          const items = (incCache[mk] = incCache[mk] || buildIncomeItems(y, m)).filter((i) => !i.recebido && !used.has(i.key));
          const best = items.map((i) => ({ i, diff: Math.abs(i.net - abs) })).filter((x) => x.diff <= Math.max(2, x.i.net * 0.02)).sort((a, b) => a.diff - b.diff)[0];
          if (best) { used.add(best.i.key); row = { ...row, action: "receber", matchItem: best.i, matchLabel: `${best.i.nome} · ${fmtBRL(best.i.net)}` }; }
        }
      }
      const ed = edits[r.id];
      return ed ? { ...row, ...ed } : row;
    });
  }, [raw, source, invert, edits, importedKeys]);


  // ---------- revisão B3 ----------
  const b3rows = useMemo(() => {
    if (!b3raw.length) return [];
    const hasNeg = b3raw.some((r) => r.kind === "trade" && r.src === "neg");
    const posMap = {}; portfolio.positions.forEach((p) => { posMap[p.description] = p; });
    const manualTk = new Set(investments.filter((i) => !String(i.source || "").startsWith("b3")).map((i) => i.description));
    const base = b3raw.map((r0, idx) => {
      const id = "b3:" + idx;
      let r = r0;
      if (r0.nota) {
        // na nota, o código pode ser corrigido na revisão; sem código válido a linha não entra
        const ed = edits[id] || {};
        const tk = cleanTicker(ed.ticker !== undefined ? ed.ticker : r0.ticker);
        r = { ...r0, ticker: tk, name: tk === r0.ticker ? r0.name : (ASSET_NAME[tk] || ""), category: tickerValido(tk) ? ((portfolio.positions.find((x) => x.isQty && x.description === tk) || {}).category || b3Category(tk, "", "")) : r0.category };
        if (!tickerValido(tk)) return { ...r, id, key: "", action: "ignorar", semTicker: true, reason: "Digite o código do ativo (ex.: PETR4) para importar" };
      }
      if (r.kind !== "trade") return { ...r, id };
      const key = `b3t:${r.date}|${r.ticker}|${r.side}|${r.qty}|${Number(r.amount).toFixed(2)}`;
      let action = "importar", reason = "";
      if (importedKeys[key]) { action = "ignorar"; reason = "Já importado antes"; }
      else if (hasNeg && r.src === "mov" && r.category !== "Renda Fixa") { action = "ignorar"; reason = "Já vem na planilha de negociação"; }
      else if (r.category === "Renda Fixa" && portfolio.positions.some((x) => x.category === "Renda Fixa" && (stripAcc(x.description).includes(stripAcc(r.ticker)) || stripAcc(r.ticker).includes(stripAcc(x.description))))) { action = "ignorar"; reason = "Você já tem esse título na carteira"; }
      else if (manualTk.has(r.ticker)) reason = "Você já lançou este ativo à mão. Confira para não duplicar";
      else if (r.nota && r.incerto && !(edits[id] && edits[id].ticker !== undefined)) reason = "Código deduzido pelo nome que está na nota. Confira";
      const row = { ...r, id, key, action, reason };
      return edits[id] ? { ...row, ...edits[id], ticker: row.ticker } : row;
    });
    const batchQty = {}; const batchRF = new Set();
    base.forEach((r) => { if (r.kind === "trade" && r.action === "importar" && r.category === "Renda Fixa") batchRF.add(r.ticker); });
    base.forEach((r) => { if (r.kind === "trade" && r.action === "importar" && r.qty > 0) batchQty[r.ticker] = (batchQty[r.ticker] || 0) + (r.side === "compra" ? r.qty : -r.qty); });
    // preço médio depois das compras da nota: (custo atual + compras) / (quantidade atual + quantidade comprada)
    const pmNota = {};
    base.forEach((r) => { if (r.nota && r.action === "importar" && r.side === "compra" && r.qty > 0) { const g = pmNota[r.ticker] = pmNota[r.ticker] || { qty: 0, amount: 0 }; g.qty += r.qty; g.amount += r.amount; } });
    return base.map((r) => {
      if (r.nota && r.action === "importar" && r.side === "compra" && pmNota[r.ticker]) {
        const pos = portfolio.positions.find((x) => x.isQty && x.description === r.ticker), g = pmNota[r.ticker];
        const novo = ((pos ? pos.cost : 0) + g.amount) / ((pos ? pos.qty : 0) + g.qty);
        return { ...r, pmAntes: pos ? pos.avg : null, pmDepois: novo };
      }
      if (r.kind !== "pos") return r;
      let row;
      if (r.category === "Renda Fixa") {
        const n = stripAcc(r.ticker);
        const p = posMap[r.ticker] || portfolio.positions.find((x) => x.category === "Renda Fixa" && (stripAcc(x.description).includes(n) || n.includes(stripAcc(x.description))));
        row = p ? { ...r, action: "valor", target: p.description, hasApp: true, reason: `Atualiza o valor atual de “${p.description}”` }
          : batchRF.has(r.ticker) ? { ...r, action: "valor", target: r.ticker, hasApp: true, reason: "Atualiza o valor do título importado acima" }
          : { ...r, action: "criar", hasApp: false, reason: "Título novo na carteira" };
      } else {
        const p = posMap[r.ticker];
        const appQty = (p ? p.qty : 0) + (batchQty[r.ticker] || 0);
        if (!p && !batchQty[r.ticker]) row = { ...r, action: "criar", hasApp: false, reason: "Ativo novo. O preço médio fica igual ao de fechamento; ajuste depois se souber o real" };
        else if (Math.abs(appQty - r.qty) < 0.0001) row = { ...r, action: "cotacao", hasApp: true, reason: "Quantidade confere. Só atualiza a cotação" };
        else row = { ...r, action: "ajustar", hasApp: true, diff: r.qty - appQty, reason: `No app: ${Number(appQty.toFixed(4))} · na B3: ${r.qty}` };
      }
      return edits[r.id] ? { ...row, ...edits[r.id] } : row;
    });
  }, [b3raw, edits, importedKeys, portfolio, investments]);
  const b3Options = (r) => {
    if (r.semTicker) return [["ignorar", "Falta o código do ativo"]];
    if (r.kind === "trade") return [["importar", r.side === "compra" ? "Importar compra" : "Importar venda"], ["ignorar", "Ignorar"]];
    if (r.category === "Renda Fixa") return (r.target ? [["valor", "Atualizar valor atual"]] : []).concat([["criar", "Adicionar à carteira"], ["ignorar", "Ignorar"]]);
    return r.hasApp ? [["cotacao", "Só atualizar cotação"]].concat(r.diff ? [["ajustar", "Ajustar quantidade para a da B3"]] : []).concat([["ignorar", "Ignorar"]]) : [["criar", "Adicionar à carteira"], ["ignorar", "Ignorar"]];
  };
  const b3active = b3rows.filter((r) => r.action !== "ignorar");
  const doImportB3 = () => { const entry = commitB3(b3rows, label || (source === "nota" ? "Nota de corretagem" : "Planilha B3")); setDone(entry); reset(); };

  const setEdit = (id, patch) => setEdits((p) => ({ ...p, [id]: { ...(p[id] || {}), ...patch } }));
  const active = rows.filter((r) => r.action !== "ignorar");
  const sum = (arr) => arr.reduce((a, r) => a + Math.abs(r.amount), 0);
  const novos = rows.filter((r) => r.action === "novo"), baixas = rows.filter((r) => r.action === "baixar" || r.action === "receber"), entradas = rows.filter((r) => r.action === "receita"), ignor = rows.filter((r) => r.action === "ignorar");
  const shown = rows.filter((r) => filter === "todos" ? true : filter === "saidas" ? r.out && r.action !== "ignorar" : filter === "entradas" ? !r.out && r.action !== "ignorar" : r.action === "ignorar")
    .sort((a, b) => b.date.localeCompare(a.date));

  const ehFatura = source === "fatura" && novos.length > 0;
  const fatVencDef = useMemo(() => { const ds = novos.map((r) => r.date).sort(); return ds.length ? addDaysIso(ds[ds.length - 1], 10) : todayStr(); }, [rows]);
  const fatVencV = fatVenc || (fatInfo && fatInfo.venc) || fatVencDef, fatPagoV = fatPago === null ? fatVencV < todayStr() : fatPago;
  // valor da fatura: o que você digitar; se não, o total a pagar lido do PDF; se não houver, a soma das compras
  const fatSoma = Math.round(novos.reduce((a, r) => a + Math.abs(r.amount), 0) * 100) / 100;
  const fatDigitado = fatTotal.trim() === "" ? NaN : parseAmountBR(fatTotal.includes(",") ? fatTotal : fatTotal.replace(".", ","));
  const fatLido = fatInfo && fatInfo.total ? fatInfo.total : null;
  const fatTotV = fatDigitado > 0 ? fatDigitado : (fatLido || fatSoma);
  const fatDif = Math.round((fatTotV - fatSoma) * 100) / 100;
  const doImport = () => {
    const entry = commitImport(rows, label || "Importação", ehFatura ? { nome: fatNome, dueDate: fatVencV, paid: fatPagoV, total: fatTotV } : null);
    setDone(entry); reset();
  };

  const actionOptions = (r) => r.out
    ? [["novo", source === "fatura" ? "Incluir na fatura" : "Criar despesa (já paga)"], ...(r.matchItem ? [["baixar", "Dar baixa: " + r.matchItem.description]] : []), ["ignorar", "Ignorar"]]
    : [["receita", "Registrar como entrada"], ...(r.matchItem ? [["receber", "Marcar recebido: " + r.matchItem.nome]] : []), ["ignorar", "Ignorar"]];

  return (
    <div>
      {done && (
        <div className="card done-card">
          <div className="card-head"><h3 className="card-title">Importação concluída</h3></div>
          <div className="line-sub" style={{ fontSize: 14, color: "var(--text)" }}>
            {done.investimentos !== undefined
              ? `${done.investimentos} lançamento(s) de investimento criado(s) e ${done.cotacoes} cotação(ões) atualizada(s).`
              : done.fatura ? `Fatura lançada como uma despesa só, de ${fmtBRL(done.total)}, com ${done.fatura} compra(s) dentro. ${done.baixas} conta(s) conciliada(s).`
              : `${done.despesas} despesa(s) criada(s) (${fmtBRL(done.total)}), ${done.baixas} conta(s) conciliada(s) e ${done.entradas} entrada(s) registrada(s).`}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {done.investimentos !== undefined ? <button className="btn btn-primary sm" onClick={() => goTab("investimentos")}>Ver carteira</button> : <button className="btn btn-primary sm" onClick={() => goTab("despesas")}>Ver despesas</button>}
            <button className="btn btn-ghost sm" onClick={() => goTab("faturamento")}>Ver receitas</button>
            <button className="btn btn-ghost sm" onClick={() => goTab("inicio")}>Ver painel</button>
          </div>
        </div>
      )}

      {raw.length === 0 && b3raw.length === 0 && (
        <div className="card">
          <div className="card-head"><h3 className="card-title">1. O que você quer fazer?</h3></div>
          <div className="choice-row">
            <button className={`choice ${source === "extrato" ? "on" : ""}`} onClick={() => setSource("extrato")}><b>Extrato da conta</b><em>Todo mês</em><span>Para conferir o que entrou e o que saiu da sua conta: pagamentos recebidos, contas, PIX e boletos</span></button>
            <button className={`choice ${source === "fatura" ? "on" : ""}`} onClick={() => setSource("fatura")}><b>Fatura do cartão</b><em>Todo mês</em><span>Para lançar a fatura como uma despesa só. Os gastos ficam dentro dela, por categoria</span></button>
            <button className={`choice ${source === "b3" ? "on" : ""}`} onClick={() => setSource("b3")}><b>Planilha da B3</b><em>Uma vez, no começo</em><span>Para cadastrar a carteira de investimentos que você já tem: ações, FIIs, ETFs e Tesouro</span></button>
            <button className={`choice ${source === "nota" ? "on" : ""}`} id="src-nota" onClick={() => setSource("nota")}><b>Nota de corretagem</b><em>Todo mês</em><span>Para adicionar os investimentos feitos no mês: as compras e vendas do PDF da corretora</span></button>
          </div>

          <div className="card-head" style={{ marginTop: 18 }}><h3 className="card-title">{source === "print" ? "2. Escolha o print" : "2. Anexe o arquivo"}</h3></div>
          {source === "print" ? <PrintImport commitPrint={commitPrint} investments={investments} goTab={goTab} /> : (<>
          <button className="drop" onClick={() => fileRef.current && fileRef.current.click()}>
            <IconUpload size={26} color={TEAL} />
            <b>Escolher arquivo</b>
            <span>{source === "nota" ? "PDF da nota de corretagem (ou nota de negociação) da sua corretora. Pode escolher várias." : source === "b3" ? "Planilhas de Posição, Negociação ou Movimentação (Excel ou CSV). Pode escolher várias." : "OFX, CSV ou PDF baixados do app ou site do banco. Pode escolher vários."}</span>
          </button>
          <input ref={fileRef} type="file" multiple accept={source === "nota" ? ".pdf,application/pdf" : source === "b3" ? ".xlsx,.xls,.csv" : ".ofx,.ofc,.qfx,.csv,.txt,.pdf,application/pdf,text/csv"} style={{ display: "none" }} onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
          {busy && <div className="field-hint" style={{ marginTop: 10 }}>{busy}</div>}
          {error && <div className="note-bad">{error}</div>}
          {pwdFile && (
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="field"><label>Senha do PDF</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" /></div>
              <div className="field" style={{ display: "flex", alignItems: "flex-end" }}><button className="btn btn-primary" onClick={() => handleFiles([pwdFile], password)}>Abrir PDF</button></div>
            </div>
          )}
          {source === "nota" ? (
          <div className="tips" id="nota-tips">
            <b>Como funciona</b>
            <span>1. Baixe a nota no app ou site da corretora (em geral em <b>Extratos</b> ou <b>Notas de corretagem</b>), ou use o PDF que chega por e-mail.</span>
            <span>2. Anexe aqui. O app lê cada compra e venda de ações, FIIs e ETFs, com data, quantidade e preço.</span>
            <span>O <b>preço médio</b> de cada ativo é recalculado com o preço de compra da nota, somando ao que você já tem na carteira.</span>
            <span>3. Confira a lista e toque em Importar. Notas já importadas não entram de novo.</span>
            <span>As taxas da nota (corretagem, emolumentos) não são somadas ao preço. Opções, termo e futuros ficam de fora.</span>
            <span>O arquivo é lido no seu celular e não é enviado para lugar nenhum.</span>
          </div>
          ) : source === "b3" ? (
          <div className="tips">
            <b>Como baixar da B3</b>
            <span>1. Entre em <b>investidor.b3.com.br</b> com seu CPF e senha.</span>
            <span>2. Vá em <b>Extratos</b> e escolha <b>Negociação</b>. Filtre todo o período desde a sua primeira compra e baixe em Excel. É dela que sai o preço médio correto.</span>
            <span>3. Depois, em <b>Posição</b>, baixe a planilha atual. Ela atualiza as cotações e confere as quantidades.</span>
            <span>A planilha de <b>Movimentação</b> também funciona. Os proventos dela são ignorados, e desdobramentos e bonificações aparecem como aviso para ajuste manual.</span>
          </div>
          ) : (
          <div className="tips">
            <b>Qual formato escolher?</b>
            <span><b>OFX</b> é o mais confiável. Quase todo banco oferece em “Extrato” → “Exportar” ou “Baixar”.</span>
            <span><b>CSV</b> também funciona bem. O Nubank, por exemplo, envia a fatura em CSV por e-mail.</span>
            <span><b>PDF</b> funciona na maioria dos casos, mas cada banco monta o arquivo de um jeito. Por isso, sempre confira a revisão antes de importar.</span>
            <span>Nada é gravado antes de você confirmar, e o arquivo não sai do seu celular.</span>
          </div>
          )}
          </>)}
        </div>
      )}


      {b3raw.length > 0 && (
        <>
          <div className="kpi-row">
            <Kpi label="Compras e vendas" value={b3rows.filter((r) => r.kind === "trade" && r.action !== "ignorar").length} sub="lançamentos novos" />
            {b3info && b3info.nota && !b3rows.some((r) => r.kind === "pos") ? (
              <>
                <Kpi label="Compras" value={fmtBRL(b3rows.filter((r) => r.action !== "ignorar" && r.side === "compra").reduce((a, r) => a + r.amount, 0))} sub="total a importar" />
                <Kpi label="Vendas" value={fmtBRL(b3rows.filter((r) => r.action !== "ignorar" && r.side === "venda").reduce((a, r) => a + r.amount, 0))} tone="var(--brick)" sub="total a importar" />
              </>
            ) : (
              <>
                <Kpi label="Posições" value={b3rows.filter((r) => r.kind === "pos").length} sub="ativos na planilha" />
                <Kpi label="Cotações" value={b3rows.filter((r) => r.kind === "pos" && r.action !== "ignorar").length} tone="var(--teal)" sub="serão atualizadas" />
              </>
            )}
            <Kpi label="Ignorados" value={b3rows.filter((r) => r.action === "ignorar").length} />
          </div>
          {b3info && b3info.nota && (
            <div className="note-info" id="nota-aviso">
              Confira o código de cada ativo antes de importar. As taxas da nota não entram no preço.
              {b3rows.some((r) => r.semTicker) && <div style={{ marginTop: 4 }}>Em {b3rows.filter((r) => r.semTicker).length} linha(s) a nota traz só o nome da empresa. Digite o código para elas entrarem.</div>}
              {b3info.notaOutros > 0 && <div style={{ marginTop: 4 }}>{b3info.notaOutros} operação(ões) de opções, termo ou futuros ficaram de fora.</div>}
            </div>
          )}
          {b3info && (b3info.proventos > 0 || b3info.eventos.length > 0) && (
            <div className="note-info">
              {b3info.proventos > 0 && <div>{b3info.proventos} provento(s) da planilha foram ignorados.</div>}
              {b3info.eventos.length > 0 && <div style={{ marginTop: 4 }}>Eventos que mudam a quantidade e precisam de ajuste manual: {b3info.eventos.slice(0, 6).join("; ")}{b3info.eventos.length > 6 ? "…" : ""}. Importar a planilha de Posição corrige a quantidade.</div>}
            </div>
          )}
          <div className="card flush">
            <div className="card-head pad">
              <h3 className="card-title">Revise antes de importar</h3>
              <span className="card-note">{b3info ? b3info.tipos.join(" + ") : ""}</span>
            </div>
            <div className="imp-list">
              {b3rows.map((r) => (
                <div key={r.id} className={`imp-row ${r.action === "ignorar" ? "off" : ""}`}>
                  <div className="imp-top">
                    <div className="imp-main">
                      <div className="imp-desc">{r.kind === "trade" ? `${r.side === "compra" ? "Compra" : "Venda"} · ${r.ticker || r.spec}` : r.ticker}</div>
                      <div className="line-sub">
                        {r.kind === "trade" ? `${fmtDatePt(r.date)} · ${r.category}${r.qty > 0 ? ` · ${Number(r.qty)} x ${fmtBRL(r.price)}` : ""}` : `${r.category}${r.qty > 0 ? ` · ${Number(r.qty)} un. · fechamento ${fmtBRL(r.price)}` : ""}`}
                        {r.nota && r.ticker ? " · na nota: " + r.spec : ""}
                        {r.pmDepois ? <span className="pm-line" data-pm>{r.pmAntes ? <>Preço médio: {fmtBRL(r.pmAntes)} → <b>{fmtBRL(r.pmDepois)}</b></> : <>Preço médio inicial: <b>{fmtBRL(r.pmDepois)}</b></>}</span> : null}
                        {r.reason ? " · " + r.reason : ""}
                      </div>
                    </div>
                    <div className="mono imp-amt" style={{ color: r.kind === "trade" ? (r.side === "compra" ? "var(--text)" : "var(--brick)") : "var(--teal)" }}>{fmtBRL(r.kind === "trade" ? r.amount : r.value)}</div>
                  </div>
                  <div className="imp-ctrl">
                    {r.nota && <input className={`tk-in ${r.semTicker ? "need" : ""}`} aria-label="Código do ativo" placeholder="Código (PETR4)" maxLength={7} value={(edits[r.id] && edits[r.id].ticker !== undefined) ? edits[r.id].ticker : r.ticker} onChange={(e) => setEdit(r.id, { ticker: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} />}
                    <select value={r.action} onChange={(e) => setEdit(r.id, { action: e.target.value })}>
                      {b3Options(r).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <div className="imp-actions">
              <button className="btn btn-ghost" onClick={reset}>Cancelar</button>
              <button className="btn btn-primary" disabled={b3active.length === 0} onClick={doImportB3}>Importar {b3active.length} item(ns)</button>
            </div>
          </div>
        </>
      )}

      {raw.length > 0 && (
        <>
          <div className="kpi-row">
            <Kpi label="Novas despesas" value={novos.length} sub={fmtBRL(sum(novos))} tone="var(--brick)" />
            <Kpi label="Contas conciliadas" value={baixas.length} sub="dar baixa no que já existe" tone="var(--teal)" />
            <Kpi label="Entradas" value={entradas.length} sub={fmtBRL(sum(entradas))} />
            <Kpi label="Ignorados" value={ignor.length} sub="não serão importados" />
          </div>

          <div className="card flush">
            <div className="card-head pad">
              <h3 className="card-title">Revise antes de importar</h3>
              <button className="link-btn" onClick={() => fileRef.current && fileRef.current.click()}>adicionar arquivo</button>
            </div>
            <input ref={fileRef} type="file" multiple accept=".ofx,.ofc,.qfx,.csv,.txt,.pdf,application/pdf,text/csv" style={{ display: "none" }} onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
            <div className="pad-x">
              <div className="chip-row" style={{ marginBottom: 10 }}>
                {[["todos", `Todos (${rows.length})`], ["saidas", "Saídas"], ["entradas", "Entradas"], ["ignorados", `Ignorados (${ignor.length})`]].map(([k, l]) => (
                  <button key={k} className={`chip ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>{l}</button>
                ))}
              </div>
              <label className="check-line"><input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} /> Inverter sinais (use se as compras aparecerem como entradas)</label>
              {error && <div className="note-bad">{error}</div>}
              {ehFatura && (
                <div className="fat-box" id="fat-box">
                  <b id="fat-total-txt">Tudo entra como uma despesa só: {fmtBRL(fatTotV)}</b>
                  <span>{fatLido && !(fatDigitado > 0) ? "Esse é o total a pagar que está na fatura. " : ""}As {novos.length} compras ficam guardadas dentro dela. Em Despesas, toque na fatura para ver os gastos por categoria.</span>
                  {Math.abs(fatDif) >= 0.01 && <span id="fat-dif">As compras marcadas somam {fmtBRL(fatSoma)}. A diferença de {fmtBRL(Math.abs(fatDif))} {fatDif < 0 ? "são créditos, estornos e pagamentos a mais do mês anterior" : "são encargos ou saldo que veio do mês anterior"}, e fica anotada dentro da fatura.</span>}
                  <div className="field" style={{ marginTop: 8 }}><label htmlFor="fat-total">Valor a pagar neste mês (R$)</label><input id="fat-total" inputMode="decimal" value={fatTotal} onChange={(e) => setFatTotal(e.target.value)} placeholder={fatTotV.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} /><div className="field-hint">Deixe em branco para usar {fatLido ? "o total lido do PDF" : "a soma das compras"}.</div></div>
                  <div className="form-grid" style={{ marginTop: 8 }}>
                    <div className="field"><label>Nome</label><input id="fat-nome" value={fatNome} onChange={(e) => setFatNome(e.target.value)} placeholder="Cartão de crédito" /></div>
                    <div className="field"><label>Vencimento da fatura</label><input id="fat-venc" type="date" value={fatVencV} onChange={(e) => setFatVenc(e.target.value)} /></div>
                  </div>
                  <label className="check-line"><input id="fat-pago" type="checkbox" checked={fatPagoV} onChange={(e) => setFatPago(e.target.checked)} /> Esta fatura já foi paga</label>
                </div>
              )}
            </div>
            <div className="imp-list">
              {shown.length === 0 && <div className="empty-state">Nada neste filtro.</div>}
              {shown.map((r) => (
                <div key={r.id} className={`imp-row ${r.action === "ignorar" ? "off" : ""}`}>
                  <div className="imp-top">
                    <div className="imp-main"><div className="imp-desc">{r.desc}</div><div className="line-sub">{fmtDatePt(r.date)}{r.reason ? " · " + r.reason : ""}{r.matchLabel && (r.action === "baixar" || r.action === "receber") ? " · conta encontrada: " + r.matchLabel : ""}</div></div>
                    <div className="mono imp-amt" style={{ color: r.out ? "var(--brick)" : "var(--teal)" }}>{r.out ? "−" : "+"} {fmtBRL(Math.abs(r.amount))}</div>
                  </div>
                  <div className="imp-ctrl">
                    <select value={r.action} onChange={(e) => setEdit(r.id, { action: e.target.value })}>
                      {actionOptions(r).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    {r.out && r.action === "novo" && (
                      <select value={r.category} onChange={(e) => setEdit(r.id, { category: e.target.value })}>
                        {EXP_CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="imp-actions">
              <button className="btn btn-ghost" onClick={reset}>Cancelar</button>
              <button className="btn btn-primary" disabled={active.length === 0} onClick={doImport}>Importar {active.length} lançamento(s)</button>
            </div>
          </div>
        </>
      )}

      {importLog.length > 0 && (
        <div className="card">
          <div className="card-head"><h3 className="card-title">Importações anteriores</h3></div>
          {importLog.map((l) => (
            <div key={l.id} className="line-item">
              <div className="line-main"><div className="line-title">{l.label}</div><div className="line-sub">{fmtDatePt(l.date)} · {l.investimentos !== undefined ? `${l.investimentos} lançamento(s) de investimento, ${l.cotacoes} cotação(ões)` : `${l.despesas} despesa(s), ${l.entradas} entrada(s), ${l.baixas} baixa(s)`}</div></div>
              <button className="btn btn-ghost sm" onClick={() => { if (window.confirm("Desfazer esta importação? Os lançamentos criados por ela serão apagados. Baixas em contas e cotações atualizadas não são revertidas.")) undoImport(l.id); }}>Desfazer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OverviewTab({ chartScope, setChartScope, expensesByDesc, investByCategory, hourlyRate, leftover, scopedHours, history12, insights }) {
  const gv = useGv();
  return (
    <div>
      <div className={"card " + gv.c("insightsrel")}>
        <div className="card-head"><h3 className="card-title gv-t" {...gv.t("insightsrel")}>Insights</h3><span className="card-note">calculados no seu aparelho</span></div>
        <InsightList items={insights} />
      </div>
      <div className="chart-scope">
        <button className={`scope-btn ${chartScope === "month" ? "active" : ""}`} onClick={() => setChartScope("month")}>Mês atual</button>
        <button className={`scope-btn ${chartScope === "all" ? "active" : ""}`} onClick={() => setChartScope("all")}>Todo o período</button>
      </div>

      <div className="stat-row">
        <div className="stat-card"><div className="stat-label">Ganho por hora trabalhada</div><div className="stat-value gold mono">{fmtBRL(hourlyRate)}</div></div>
        <div className="stat-card"><div className="stat-label">Horas consideradas</div><div className="stat-value mono">{scopedHours.toFixed(0)}h</div></div>
        <div className="stat-card"><div className="stat-label">Sobra do período</div><div className="stat-value mono" style={{ color: leftover >= 0 ? "var(--teal)" : "var(--brick)" }}>{fmtBRL(leftover)}</div></div>
      </div>

      <div className="chart-card">
        <div className="chart-title"><IconTrending size={15} color={TEAL} /> Sobra por mês <span className="n">(líquido − despesas − investido, últimos 12 meses)</span></div>
        <SvgBarChart data={history12} height={200} color={TEAL} negativeColor={BRICK} signed valueKey="leftover" />
      </div>

      <div className="chart-card">
        <div className="chart-title"><IconWallet size={15} color={BRICK} /> Maiores gastos <span className="n">(por descrição)</span></div>
        {expensesByDesc.length === 0 ? <div className="empty-state">Sem despesas registradas ainda.</div> : (
          <HorizontalBarList data={expensesByDesc} color={BRICK} />
        )}
      </div>

      <div className="chart-card">
        <div className="chart-title"><IconTrending size={15} color={TEAL} /> Montantes investidos <span className="n">(por categoria)</span></div>
        {investByCategory.length === 0 ? <div className="empty-state">Sem investimentos registrados ainda.</div> : (
          <div className="donut-wrap">
            <SvgDonutChart data={investByCategory.map((d, i) => ({ ...d, cor: PALETTE[i % PALETTE.length] }))} size={190} strokeWidth={26} valueKey="value" colorKey="cor" />
            <div style={{ flex: 1, minWidth: 180 }}>
              {investByCategory.map((d, i) => (
                <div key={d.name} className="hospital-row">
                  <div className="hospital-row-left">
                    <span className="color-bar" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <div className="hospital-name">{d.name}</div>
                  </div>
                  <div className="hospital-value mono">{fmtBRL(d.value)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
