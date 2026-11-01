// Mediplan: código-fonte. O site usa a versão compilada (app.js), gerada por build.py.

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  for (const c of EXP_CATS) if (c.kw.some((k) => d.includes(k))) return c.id;
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

// Calcula posições da carteira (preço médio, valor atual, rentabilidade) a partir dos lançamentos
function computePortfolio(investments, cotacoes) {
  const groups = {};
  [...investments].sort((a, b) => (a.date || "").localeCompare(b.date || "") || String(a.id).localeCompare(String(b.id))).forEach((i) => {
    const cat = i.category || "Outro";
    const key = cat + "|" + i.description;
    const g = groups[key] = groups[key] || { key, category: cat, description: i.description, assetName: i.assetName || ASSET_NAME[i.description] || "", qty: 0, cost: 0, realized: 0, bought: 0, sold: 0, legacyCost: 0, entries: 0 };
    g.entries += 1;
    if (i.assetName && !g.assetName) g.assetName = i.assetName;
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
const AMT_SRC = "((?:R\\$\\s*)?-?\\s?\\(?(?:\\d{1,3}(?:\\.\\d{3})+|\\d+),\\d{2}\\)?(?:\\s?(?:[CD]|-)(?![\\w]))?)";

function parseStatementLines(lines, refYear, today) {
  const re = new RegExp("(?:^|\\s)" + DATE_SRC + "\\s+(.+?)\\s+" + AMT_SRC + "(?:\\s+" + AMT_SRC + ")?(?=\\s+" + DATE_SRC + "\\s|\\s*$)", "gi");
  const out = [];
  lines.forEach((line) => {
    const L = line.replace(/−/g, "-");
    let mt;
    re.lastIndex = 0;
    while ((mt = re.exec(L))) {
      const desc = mt[2].trim();
      if (/^(saldo|total|subtotal)\b|saldo (anterior|do dia|final|disponivel|disponível)|^limite/i.test(desc)) continue;
      const dt = fixYear(parseDateAny(mt[1], refYear), today);
      const amount = parseAmountBR(mt[3]);
      if (dt && !isNaN(amount) && amount !== 0) out.push({ date: dt, desc: desc.replace(/\s+/g, " "), amount, fmt: "pdf" });
    }
  });
  return out;
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
const cleanDesc = (d) => String(d || "").replace(/\s+/g, " ").trim().slice(0, 70);

const normTxt = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const pad = (n) => String(n).padStart(2, "0");
const dateStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const monthKeyOf = (y, m) => `${y}-${pad(m + 1)}`;
const todayStr = () => { const t = new Date(); return dateStr(t.getFullYear(), t.getMonth(), t.getDate()); };
const fmtBRL = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
const IconLogo = (p) => (<svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7V3z" fill={p.color || "#FFFFFF"} /></svg>);

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
            <div className="perf-bar" style={{ width: `${(Math.abs(i.pct) / max) * 50}%`, background: i.pct >= 0 ? TEAL : BRICK, [i.pct >= 0 ? "left" : "right"]: "50%" }} />
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
  faturamento: ["Faturamento", "Receitas por vínculo, impostos e recebimentos"],
  calendario: ["Calendário de plantões", "Lance plantões e horas trabalhadas"],
  despesas: ["Despesas", "Contas do mês, limites por categoria"],
  investimentos: ["Investimentos", "Carteira, distribuição e rentabilidade"],
  metas: ["Metas", "Acompanhe seus objetivos financeiros"],
  visao: ["Relatórios", "Comparativos e ganho por hora"],
  backup: ["Configurações", "Conta, nuvem, tributação e backup"],
  importar: ["Importar", "Extrato, fatura do cartão e planilhas da B3"],
};
function Kpi({ label, value, sub, tone }) {
  return (
    <div className="kpi-box">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value mono" style={tone ? { color: tone } : null}>{value}</div>
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
  const [val, setVal] = useState(limit ? String(limit) : "");
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
          <input type="number" inputMode="decimal" autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder="Limite mensal (R$)" />
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
                <div className="mp-row bal"><span>Saldo</span><b className="mono" style={{ color: bal >= 0 ? "var(--text)" : "var(--brick)" }}>{empty ? "—" : (bal >= 0 ? "+" : "−") + short(Math.abs(bal))}</b></div>
              </button>
            );
          })}
        </div>
        <div className="mp-foot">Valores líquidos, no mês em que entram e saem do caixa. Toque num mês para abrir.</div>
      </div>
    </div>
  );
}

const IconMore = (p) => <Ico {...p}><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></Ico>;
const NAV_MAIN = [
  { id: "inicio", short: "Início", long: "Início", icon: IconHome },
  { id: "faturamento", short: "Receitas", long: "Faturamento", icon: IconReceipt },
  { id: "calendario", short: "Agenda", long: "Calendário", icon: IconCalendar },
  { id: "despesas", short: "Despesas", long: "Despesas", icon: IconWallet },
  { id: "investimentos", short: "Investir", long: "Investimentos", icon: IconTrending },
];
const NAV_MORE = [
  { id: "metas", short: "Metas", long: "Metas", icon: IconTarget },
  { id: "visao", short: "Relatórios", long: "Relatórios", icon: IconPie },
  { id: "importar", short: "Importar", long: "Importar extrato", icon: IconUpload },
  { id: "backup", short: "Ajustes", long: "Configurações", icon: IconDownload },
];
const NAV_ALL = NAV_MAIN.concat(NAV_MORE);


// ================= Nuvem (Supabase) =================
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
// Projeto padrão (opcional). Também dá para conectar pela tela Configurações, sem mexer no código.
const CLOUD_DEFAULT = { url: "", key: "" };
const CLOUD_CFG_KEY = "mediplan-cloud-config";
const CLOUD_SKIP_KEY = "mediplan-cloud-skip";
const OWNER_KEY = "mediplan-owner";
const SYNCED_KEY = "mediplan-synced";
const COLLECTIONS = ["vinculos", "shifts", "presencas", "extraRecurringIncomes", "expenses", "recurringExpenses", "investments", "goals", "oneOffIncomes"];
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
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
  .auth-logo span { width: 36px; height: 36px; border-radius: 10px; background: #16A34A; display: inline-flex; align-items: center; justify-content: center; }
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
        <div className="auth-logo"><span><IconLogo size={18} /></span>Mediplan</div>
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
  const [goals, setGoals] = useState([]);
  const [oneOffIncomes, setOneOffIncomes] = useState([]);
  const [importedKeys, setImportedKeys] = useState({});
  const [importLog, setImportLog] = useState([]);
  const [limits, setLimits] = useState({});
  const [taxRateGeral, setTaxRateGeral] = useState(27.5);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const fileInputRef = useRef(null);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [activeTab, setActiveTab] = useState("inicio");
  const [selectedDay, setSelectedDay] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const goTab = (id) => { setActiveTab(id); setMoreOpen(false); try { window.scrollTo({ top: 0 }); } catch (e) {} };
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
        setOneOffIncomes(d.oneOffIncomes || []); setImportedKeys(d.importedKeys || {}); setImportLog(d.importLog || []); setLimits(d.limits || {});
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
          vinculos, shifts, presencas, extraRecurringIncomes, expenses, recurringExpenses, investments, goals, taxRateGeral, cotacoes, brapiToken, oneOffIncomes, importedKeys, importLog, limits
        }));
        setSaveError(false);
      } catch (e) { setSaveError(true); }
    }, 400);
    return () => clearTimeout(t);
  }, [vinculos, shifts, presencas, extraRecurringIncomes, expenses, recurringExpenses, investments, goals, taxRateGeral, cotacoes, brapiToken, oneOffIncomes, importedKeys, importLog, limits, loaded]);


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
    settings: { taxRateGeral, cotacoes, brapiToken, importedKeys, importLog, limits },
  };
  settersRef.current = {
    vinculos: setVinculos, shifts: setShifts, presencas: setPresencas, extraRecurringIncomes: setExtraRecurringIncomes, expenses: setExpenses,
    recurringExpenses: setRecurringExpenses, investments: setInvestments, goals: setGoals, oneOffIncomes: setOneOffIncomes,
    settings: (st) => { setTaxRateGeral(st.taxRateGeral ?? 27.5); setCotacoes(st.cotacoes || {}); setBrapiToken(st.brapiToken || ""); setImportedKeys(st.importedKeys || {}); setImportLog(st.importLog || []); setLimits(st.limits || {}); },
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
  }, [vinculos, shifts, presencas, extraRecurringIncomes, expenses, recurringExpenses, investments, goals, oneOffIncomes, taxRateGeral, cotacoes, brapiToken, importedKeys, importLog, limits, session]);

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
      items.push({ key: "shift-" + s.id, vinculoId: s.vinculoId, nome: v ? v.nome : "(vínculo removido)", cor: v ? v.cor : GOLD,
        tipo: "plantao", dateLabel: delayed ? `plantão ${fmtDatePt(s.date).slice(0, 5)} · paga em ${fmtDatePt(payDateOf(s))}` : fmtDatePt(s.date), gross: Number(s.gross || 0), net: netOf(s.gross, v ? v.taxOverride : null),
        recebido: !!s.recebido, toggle: () => toggleShiftReceived(s.id), removable: true, remove: () => removeShift(s.id) });
    });
    const refLabel = (ck) => { const [cy, cm] = ck.split("-").map(Number); return MONTHS_ABBR_PT[cm - 1] + "/" + cy; };
    vinculos.filter((v) => v.tipo === "mensal").forEach((v) => {
      const d = Number(v.prazoMeses || 0);
      const ck = shiftMonthKey(mk, -d);
      if (v.startMonth > ck) return;
      items.push({ key: "mensal-" + v.id + "-" + ck, vinculoId: v.id, nome: v.nome, cor: v.cor, tipo: "mensal",
        dateLabel: d > 0 ? `dia ${v.diaRecebimento || 5} · ref. ${refLabel(ck)}` : `dia ${v.diaRecebimento || 5} · mensal fixo`, gross: Number(v.valorMensal || 0), net: netOf(v.valorMensal, v.taxOverride),
        recebido: !!(v.recebidoMonths && v.recebidoMonths[ck]), toggle: () => toggleVinculoMensalRecebido(v.id, ck), removable: false });
    });
    extraRecurringIncomes.forEach((e) => {
      const d = Number(e.prazoMeses || 0);
      const ck = shiftMonthKey(mk, -d);
      if (e.startMonth > ck) return;
      items.push({ key: "extra-" + e.id + "-" + ck, vinculoId: null, nome: e.description, cor: SLATE, tipo: "extra",
        dateLabel: d > 0 ? `dia ${e.diaRecebimento || 5} · ref. ${refLabel(ck)}` : `dia ${e.diaRecebimento || 5} · recorrente`, gross: Number(e.amount || 0), net: netOf(e.amount, e.taxOverride),
        recebido: !!(e.recebidoMonths && e.recebidoMonths[ck]), toggle: () => toggleExtraIncomeRecebido(e.id, ck), removable: true, remove: () => removeExtraRecurringIncome(e.id) });
    });
    oneOffIncomes.filter((o) => inMonth(o.date, y, m)).forEach((o) => {
      items.push({ key: "one-" + o.id, vinculoId: null, nome: o.description, cor: "#3B82C4", tipo: "avulsa", dateLabel: fmtDatePt(o.date) + " · entrada avulsa",
        gross: Number(o.amount || 0), net: Number(o.amount || 0), recebido: !!o.recebido, toggle: () => setOneOffIncomes((prev) => prev.map((x) => x.id === o.id ? { ...x, recebido: !x.recebido } : x)),
        removable: true, removeOne: () => setOneOffIncomes((prev) => prev.filter((x) => x.id !== o.id)) });
    });
    return items;
  };

  const buildExpenseItems = (y, m) => {
    const mk = monthKeyOf(y, m);
    const items = [];
    expenses.filter((e) => inMonth(e.dueDate, y, m)).forEach((e) => {
      items.push({ key: "exp-" + e.id, description: e.description, category: e.category || guessExpCat(e.description), amount: Number(e.amount || 0), dateLabel: fmtDatePt(e.dueDate), dateIso: e.dueDate,
        tipo: "pontual", paid: !!e.paid, toggle: () => toggleExpensePaid(e.id), remove: () => removeExpense(e.id) });
    });
    recurringExpenses.filter((r) => r.startMonth <= mk).forEach((r) => {
      const day = clampDay(y, m, r.diaVencimento || 5);
      const info = r.paidMonths && r.paidMonths[mk];
      items.push({ key: "rec-" + r.id + "-" + mk, description: r.description, category: r.category || guessExpCat(r.description), amount: Number(r.amount || 0), dateLabel: fmtDatePt(dateStr(y, m, day)), dateIso: dateStr(y, m, day),
        tipo: "recorrente", paid: !!(info && info.paid), toggle: () => toggleRecurringExpensePaid(r.id, mk), remove: () => removeRecurringExpense(r.id) });
    });
    return items;
  };

  const monthKey = monthKeyOf(viewYear, viewMonth);
  const monthShifts = shifts.filter((s) => inMonth(s.date, viewYear, viewMonth));
  const monthPresencas = presencas.filter((p) => inMonth(p.date, viewYear, viewMonth));
  const monthIncomeItems = buildIncomeItems(viewYear, viewMonth);
  const monthExpenseItems = buildExpenseItems(viewYear, viewMonth);
  const monthInvestments = investments.filter((i) => inMonth(i.date, viewYear, viewMonth));

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
    return map;
  }, [monthShifts, monthPresencas]);

  const goMonth = (y, m) => { setViewYear(y); setViewMonth(m); setSelectedDay(null); try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) {} };
  const quickGo = (kind) => {
    setQuickOpen(false);
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
    const v = { id: uid(), nome: data.nome, cor: data.cor, tipo: data.tipo, taxOverride: data.taxOverride === "" ? null : Number(data.taxOverride) };
    if (data.tipo === "plantao") v.prazoPadrao = Number(data.prazoPadrao) || 0;
    if (data.tipo === "mensal") {
      v.prazoMeses = Number(data.prazoMeses) || 0;
      v.valorMensal = Number(data.valorMensal) || 0;
      v.diaRecebimento = Number(data.diaRecebimento) || 5;
      v.startMonth = data.startMonth || monthKey;
      v.recebidoMonths = {};
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
  const updateExtraPrazo = (id, val) => setExtraRecurringIncomes((prev) => prev.map((e) => e.id === id ? { ...e, prazoMeses: Number(val) || 0 } : e));
  const updateShiftPrazo = (id, val) => setShifts((prev) => prev.map((s) => s.id === id ? { ...s, prazoDias: Number(val) || 0, payDate: addDaysIso(s.date, Number(val) || 0) } : s));
  const updateVinculoTax = (id, val) => setVinculos((prev) => prev.map((v) => v.id === id ? { ...v, taxOverride: val === "" ? null : Number(val) } : v));
  const toggleVinculoMensalRecebido = (id, mk) => setVinculos((prev) => prev.map((v) => v.id === id ? { ...v, recebidoMonths: { ...v.recebidoMonths, [mk]: !(v.recebidoMonths && v.recebidoMonths[mk]) } } : v));

  const addShift = (day, vinculoId, gross, hours, prazoDias) => {
    const date = dateStr(viewYear, viewMonth, day);
    const prazo = Math.max(0, Number(prazoDias) || 0);
    setShifts((prev) => [...prev, { id: uid(), date, vinculoId, gross: Number(gross) || 0, hours: Number(hours) || 0, recebido: false, prazoDias: prazo, payDate: addDaysIso(date, prazo) }]);
    setVinculos((prev) => prev.map((v) => v.id === vinculoId ? { ...v, prazoPadrao: prazo } : v));
  };
  const removeShift = (id) => setShifts((prev) => prev.filter((s) => s.id !== id));
  const toggleShiftReceived = (id) => setShifts((prev) => prev.map((s) => s.id === id ? { ...s, recebido: !s.recebido } : s));
  const addPresenca = (day, vinculoId, hours) => {
    setPresencas((prev) => [...prev, { id: uid(), date: dateStr(viewYear, viewMonth, day), vinculoId, hours: Number(hours) || 0 }]);
  };
  const removePresenca = (id) => setPresencas((prev) => prev.filter((p) => p.id !== id));

  const addExtraRecurringIncome = (data) => {
    setExtraRecurringIncomes((prev) => [...prev, { id: uid(), description: data.description, amount: Number(data.amount) || 0,
      diaRecebimento: Number(data.diaRecebimento) || 5, prazoMeses: Number(data.prazoMeses) || 0, startMonth: data.startMonth || monthKey, taxOverride: data.taxOverride === "" ? null : Number(data.taxOverride), recebidoMonths: {} }]);
  };
  const removeExtraRecurringIncome = (id) => setExtraRecurringIncomes((prev) => prev.filter((e) => e.id !== id));
  const toggleExtraIncomeRecebido = (id, mk) => setExtraRecurringIncomes((prev) => prev.map((e) => e.id === id ? { ...e, recebidoMonths: { ...e.recebidoMonths, [mk]: !(e.recebidoMonths && e.recebidoMonths[mk]) } } : e));

  const addExpense = (description, amount, dueDate, category) => setExpenses((prev) => [...prev, { id: uid(), description, category: category || guessExpCat(description), amount: Number(amount) || 0, dueDate, paid: false, paidDate: null }]);
  const toggleExpensePaid = (id) => setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, paid: !e.paid, paidDate: !e.paid ? todayStr() : null } : e));
  const removeExpense = (id) => setExpenses((prev) => prev.filter((e) => e.id !== id));

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
  const setCotacao = (key, val) => setCotacoes((prev) => ({ ...prev, [key]: val }));
  const refreshQuotes = async () => {
    const tickers = [...new Set(portfolio.positions.filter((p) => p.isQty && invCatMeta(p.category).kind === "ticker").map((p) => p.description))];
    if (tickers.length === 0) { setQuoteStatus("Cadastre compras de ações, FIIs ou ETFs com quantidade para buscar cotações."); return; }
    setQuoteStatus("Buscando cotações…");
    let ok = 0, fail = [];
    const next = {};
    for (const t of tickers) {
      try {
        const url = "https://brapi.dev/api/quote/" + encodeURIComponent(t) + (brapiToken ? "?token=" + encodeURIComponent(brapiToken) : "");
        const r = await fetch(url);
        const j = await r.json();
        const price = j && j.results && j.results[0] && j.results[0].regularMarketPrice;
        if (price > 0) { next[t] = price; ok += 1; } else fail.push(t);
      } catch (e) { fail.push(t); }
    }
    setCotacoes((prev) => ({ ...prev, ...next }));
    setQuoteStatus(`${ok} de ${tickers.length} cotações atualizadas` + (fail.length ? ` (sem retorno: ${fail.join(", ")}; digite manualmente ou use um token da brapi.dev)` : "") + ` às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
  };

  const removeInvestment = (id) => setInvestments((prev) => prev.filter((i) => i.id !== id));

  // ---- CRUD: metas ----
  const addGoal = (data) => setGoals((prev) => [...prev, { id: uid(), nome: data.nome, valorAlvo: Number(data.valorAlvo) || 0, valorAtual: Number(data.valorAtual) || 0, prazo: data.prazo || null, cor: data.cor || GOLD }]);
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

  const monthStats = (y, m) => {
    const inc = buildIncomeItems(y, m);
    const exp = buildExpenseItems(y, m);
    const inv = investments.filter((i) => inMonth(i.date, y, m)).reduce((a, i) => a + Number(i.amount || 0), 0);
    const hrs = shifts.filter((s) => inMonth(s.date, y, m)).reduce((a, s) => a + Number(s.hours || 0), 0) +
                presencas.filter((p) => inMonth(p.date, y, m)).reduce((a, p) => a + Number(p.hours || 0), 0);
    const net = inc.reduce((a, i) => a + i.net, 0);
    const expTotal = exp.reduce((a, i) => a + i.amount, 0);
    return { net, expTotal, invested: inv, hours: hrs, leftover: net - expTotal - inv, hourly: hrs > 0 ? net / hrs : 0 };
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
      const [iy, im] = inv.date.split("-").map(Number);
      return iy < windowStart.y || (iy === windowStart.y && im - 1 < windowStart.m);
    }).reduce((a, i) => a + Number(i.amount || 0), 0);
    let cumulative = before;
    monthsWindow.forEach(({ y, m }) => {
      const monthTotal = investments.filter((i) => inMonth(i.date, y, m)).reduce((a, i) => a + Number(i.amount || 0), 0);
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

  const totalInvestedAllTime = investments.reduce((a, i) => a + Number(i.amount || 0), 0);
  const portfolio = useMemo(() => computePortfolio(investments, cotacoes), [investments, cotacoes]);
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

  const scopedHours = chartScope === "all" ? (shifts.reduce((a, s) => a + Number(s.hours || 0), 0) + presencas.reduce((a, p) => a + Number(p.hours || 0), 0)) : totalHoursMonth;
  const scopedNet = chartScope === "all" ? totalRecebidoAllTime : totalNet;
  const scopedExpensesTotal = chartScope === "all" ? totalPagoAllTime : totalExpensesMonth;
  const scopedInvested = chartScope === "all" ? totalInvestedAllTime : totalInvestedMonth;
  const hourlyRate = scopedHours > 0 ? scopedNet / scopedHours : 0;
  const leftover = scopedNet - scopedExpensesTotal - scopedInvested;

  const downloadBackup = () => {
    const data = JSON.stringify({ vinculos, shifts, presencas, extraRecurringIncomes, expenses, recurringExpenses, investments, goals, taxRateGeral, cotacoes, brapiToken, oneOffIncomes, importedKeys, importLog, limits }, null, 2);
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
        setOneOffIncomes(d.oneOffIncomes || []); setImportedKeys(d.importedKeys || {}); setImportLog(d.importLog || []); setLimits(d.limits || {});
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
          const h = presencas.filter((p) => p.vinculoId === v.id && inMonth(p.date, y, m)).reduce((a, p) => a + Number(p.hours || 0), 0);
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
    goals.filter((g) => g.valorAtual < g.valorAlvo).slice(0, 2).forEach((g) => {
      const falta = g.valorAlvo - g.valorAtual;
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
  const commitImport = (rows, label) => {
    const bid = uid();
    const newExp = [], newInc = [], keys = [];
    let baixas = 0;
    rows.forEach((r) => {
      if (r.action === "ignorar") return;
      keys.push(r.key);
      if (r.action === "novo") newExp.push({ id: uid() + newExp.length, description: cleanDesc(r.desc), category: r.category, amount: Math.abs(r.amount), dueDate: r.date, paid: true, paidDate: r.date, imported: true, batch: bid });
      else if (r.action === "receita") newInc.push({ id: uid() + newInc.length, description: cleanDesc(r.desc), amount: Math.abs(r.amount), date: r.date, recebido: true, batch: bid });
      else if (r.action === "baixar" && r.matchItem) { if (!r.matchItem.paid) r.matchItem.toggle(); baixas++; }
      else if (r.action === "receber" && r.matchItem) { if (!r.matchItem.recebido) r.matchItem.toggle(); baixas++; }
    });
    setExpenses((p) => [...p, ...newExp]);
    setOneOffIncomes((p) => [...p, ...newInc]);
    setImportedKeys((p) => { const n = { ...p }; keys.forEach((k) => { n[k] = bid; }); return n; });
    const entry = { id: bid, date: todayStr(), label, despesas: newExp.length, entradas: newInc.length, baixas, total: newExp.reduce((a, e) => a + e.amount, 0) };
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

  // ---- patrimônio total (recebido - pago, independente de estar em caixa ou investido) ----
  const patrimonioTotal = totalRecebidoAllTime - totalPagoAllTime + portfolio.unrealized;

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
    goals.forEach((g) => {
      if (g.prazo && g.valorAtual < g.valorAlvo && g.prazo < todayIso) list.push({ id: "goal-" + g.id, level: "warning", text: `Meta "${g.nome}" passou do prazo e ainda não foi concluída` });
    });
    return list;
  }, [monthExpenseItems, monthIncomeItems, goals, viewMonth, limits]);

  // ---- relatório mensal em PDF ----
  const generateMonthlyReport = () => {
    if (!window.jspdf) { alert("A biblioteca de PDF ainda está carregando, tente novamente em instantes."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    const line = (text, size = 11, bold = false, color = [38, 53, 50]) => {
      doc.setFontSize(size);
      doc.setFont(undefined, bold ? "bold" : "normal");
      doc.setTextColor(...color);
      doc.text(text, 14, y);
      y += size * 0.6 + 4;
    };
    line("Mediplan — Relatório Mensal", 18, true, [76, 146, 132]);
    line(`${MONTHS_PT[viewMonth]} de ${viewYear}`, 12, false, [122, 139, 135]);
    y += 4;
    line("Receitas", 14, true);
    if (monthIncomeItems.length === 0) line("Nenhuma receita lançada.");
    monthIncomeItems.forEach((it) => line(`${it.nome} (${it.dateLabel}) — ${fmtBRL(it.net)} ${it.recebido ? "[recebido]" : "[pendente]"}`));
    line(`Total líquido: ${fmtBRL(totalNet)}`, 12, true);
    y += 4;
    line("Despesas", 14, true);
    if (monthExpenseItems.length === 0) line("Nenhuma despesa lançada.");
    monthExpenseItems.forEach((it) => line(`${it.description} (${it.dateLabel}) — ${fmtBRL(it.amount)} ${it.paid ? "[pago]" : "[pendente]"}`));
    line(`Total de despesas: ${fmtBRL(totalExpensesMonth)}`, 12, true);
    y += 4;
    line("Investimentos", 14, true);
    if (monthInvestments.length === 0) line("Nenhum aporte neste mês.");
    monthInvestments.forEach((it) => line(`${it.description} (${it.category}) — ${fmtBRL(it.amount)}`));
    line(`Total investido no mês: ${fmtBRL(totalInvestedMonth)}`, 12, true);
    y += 6;
    line(`Saldo do mês (líquido − despesas − investido): ${fmtBRL(totalNet - totalExpensesMonth - totalInvestedMonth)}`, 12, true, [76, 146, 132]);
    line(`Patrimônio total acumulado: ${fmtBRL(patrimonioTotal)}`, 12, true, [189, 138, 61]);
    doc.save(`mediplan-relatorio-${MONTHS_ABBR_PT[viewMonth]}-${viewYear}.pdf`);
  };


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
        .sb-brand .brand-icon, .tb-logo { width: 32px; height: 32px; border-radius: 10px; background: var(--teal); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
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
      `}</style>

      <aside className="sidebar">
        <div className="sb-brand"><div className="brand-icon"><IconLogo size={18} /></div><span>Mediplan</span></div>
        <button className="sb-new" onClick={() => setQuickOpen(true)}><IconPlus size={17} color="#fff" /><span>Novo lançamento</span></button>
        <nav className="sb-nav">
          {[["Principal", ["inicio", "faturamento", "calendario", "despesas"]], ["Patrimônio", ["investimentos", "metas", "visao"]], ["Ferramentas", ["importar", "backup"]]].map(([g, ids]) => (
            <div key={g}>
              <div className="sb-group">{g}</div>
              {ids.map((id) => { const t = NAV_ALL.find((x) => x.id === id); const Ic = t.icon; return (
                <button key={id} className={`sb-item ${activeTab === id ? "active" : ""}`} onClick={() => goTab(id)} title={t.long}><Ic size={18} /><span>{t.long}</span></button>
              ); })}
            </div>
          ))}
        </nav>
        <button className={`sb-foot cloud-foot ${cloud.status}`} onClick={() => goTab("backup")}><i />{cloudLabel}</button>
      </aside>

      <div className="main">
      <header className="topbar2">
        <div className="tb-left">
          <div className="tb-logo"><IconLogo size={15} /></div>
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
          <button className="btn btn-primary tb-new" onClick={() => setQuickOpen(true)}><IconPlus size={16} color="#fff" /> Novo</button>
        </div>
      </header>

      <div className="page">
      <div className="panel">
        {activeTab === "inicio" && (
          <DashboardTab
            viewMonth={viewMonth} viewYear={viewYear}
            patrimonioTotal={patrimonioTotal} saldoRealizado={saldoRealizado} totalInvestedAllTime={totalInvestedAllTime}
            totalNet={totalNet} totalPendingExpenses={totalPendingExpenses} alerts={alerts}
            history12={history12} goals={goals} generateMonthlyReport={generateMonthlyReport}
            setActiveTab={setActiveTab} curStats={curStats} prevStats={prevStats} portfolio={portfolio}
            chartMonths={chartMonths} setChartMonths={setChartMonths} goMonth={goMonth} quickGo={quickGo}
            setup={{ vinculos: vinculos.length, shifts: shifts.length, expenses: expenses.length + recurringExpenses.length, investments: investments.length }}
            monthExpenseItems={monthExpenseItems} limits={limits} monthShiftsCount={monthShifts.length} insights={insights}
          />
        )}
        {activeTab === "faturamento" && (
          <FaturamentoTab
            expanded={expanded} toggleSection={toggleSection} viewMonth={viewMonth} monthKey={monthKey}
            monthIncomeItems={monthIncomeItems}
            totalGross={totalGross} totalNet={totalNet}
            vinculos={vinculos} addVinculo={addVinculo} removeVinculo={removeVinculo} updateVinculoTax={updateVinculoTax} updateVinculoPrazo={updateVinculoPrazo}
            extraRecurringIncomes={extraRecurringIncomes} addExtraRecurringIncome={addExtraRecurringIncome} removeExtraRecurringIncome={removeExtraRecurringIncome} updateExtraPrazo={updateExtraPrazo}
            netByVinculo={netByVinculo} gainScope={gainScope} setGainScope={setGainScope} history12={history12}
            chartMonths={chartMonths} setChartMonths={setChartMonths} goMonth={goMonth}
          />
        )}
        {activeTab === "calendario" && (
          <CalendarTab
            cells={cells} entriesByDay={entriesByDay} selectedDay={selectedDay} setSelectedDay={setSelectedDay}
            viewYear={viewYear} viewMonth={viewMonth} vinculos={vinculos} addVinculo={addVinculo}
            addShift={addShift} removeShift={removeShift} toggleShiftReceived={toggleShiftReceived} updateShiftPrazo={updateShiftPrazo}
            addPresenca={addPresenca} removePresenca={removePresenca}
            vinculoMap={vinculoMap} netOf={netOf} setActiveTab={setActiveTab}
          />
        )}
        {activeTab === "despesas" && (
          <ExpensesTab
            monthExpenseItems={monthExpenseItems} addExpense={addExpense} addRecurringExpense={addRecurringExpense}
            viewYear={viewYear} viewMonth={viewMonth} totalPending={totalPendingExpenses} openSignal={signals.despesas} limits={limits} setLimit={setLimit}
          />
        )}
        {activeTab === "investimentos" && (
          <InvestmentsTab investments={investments} portfolio={portfolio} cotacoes={cotacoes}
            addInvestment={addInvestment} removeInvestment={removeInvestment}
            setCotacao={setCotacao} brapiToken={brapiToken} setBrapiToken={setBrapiToken} refreshQuotes={refreshQuotes} quoteStatus={quoteStatus}
            viewYear={viewYear} viewMonth={viewMonth} investmentsHistory12={investmentsHistory12} chartMonths={chartMonths} setChartMonths={setChartMonths} openSignal={signals.investimentos} />
        )}
        {activeTab === "metas" && (
          <GoalsTab goals={goals} addGoal={addGoal} removeGoal={removeGoal} contributeGoal={contributeGoal} />
        )}
        {activeTab === "visao" && (
          <OverviewTab chartScope={chartScope} setChartScope={setChartScope} expensesByDesc={expensesByDesc} investByCategory={investByCategory}
            hourlyRate={hourlyRate} leftover={leftover} scopedHours={scopedHours} history12={history12} insights={insights} />
        )}
        {activeTab === "importar" && (
          <ImportTab buildExpenseItems={buildExpenseItems} buildIncomeItems={buildIncomeItems} importedKeys={importedKeys}
            commitImport={commitImport} importLog={importLog} undoImport={undoImport} goTab={goTab}
            commitB3={commitB3} portfolio={portfolio} investments={investments} />
        )}
        {activeTab === "backup" && (
          <BackupTab taxRateGeral={taxRateGeral} setTaxRateGeral={setTaxRateGeral} downloadBackup={downloadBackup} fileInputRef={fileInputRef} handleImportFile={handleImportFile} saveError={saveError}
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
        <div className="sheet-backdrop" onClick={() => setQuickOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">O que você quer lançar?</div>
            {[["plantao", "Plantão", "no calendário", IconCalendar, TEAL], ["despesa", "Despesa", "conta fixa ou pontual", IconWallet, BRICK], ["aporte", "Investimento", "aporte, compra ou venda", IconTrending, "#2563EB"], ["importar", "Importar extrato", "OFX, CSV ou PDF do banco", IconUpload, SLATE]].map(([k, l, sub, Ic, c]) => (
              <button key={k} className="sheet-item" onClick={() => quickGo(k)}><span className="sheet-ico" style={{ background: c + "1a", color: c }}><Ic size={18} /></span><span><b>{l}</b><small>{sub}</small></span></button>
            ))}
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {[["inicio", "Início", IconHome], ["faturamento", "Receitas", IconReceipt]].map(([id, l, Ic]) => (
          <button key={id} className={`bn-btn ${activeTab === id ? "active" : ""}`} onClick={() => goTab(id)}><Ic size={21} /><span>{l}</span></button>
        ))}
        <button className="bn-center" aria-label="Novo lançamento" onClick={() => setQuickOpen(true)}><IconPlus size={26} color="#fff" /></button>
        {[["despesas", "Despesas", IconWallet]].map(([id, l, Ic]) => (
          <button key={id} className={`bn-btn ${activeTab === id ? "active" : ""}`} onClick={() => goTab(id)}><Ic size={21} /><span>{l}</span></button>
        ))}
        <button className={`bn-btn ${["calendario", "investimentos", "metas", "visao", "importar", "backup"].includes(activeTab) || moreOpen ? "active" : ""}`} onClick={() => setMoreOpen((v) => !v)}><IconMore size={21} /><span>Mais</span></button>
      </nav>
      {moreOpen && (
        <div className="sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            {["calendario", "investimentos", "metas", "visao", "importar", "backup"].map((id) => { const t = NAV_ALL.find((x) => x.id === id); const Ic = t.icon; return (
              <button key={id} className={`sheet-item ${activeTab === id ? "active" : ""}`} onClick={() => goTab(id)}><span className="sheet-ico"><Ic size={18} /></span>{t.long}</button>
            ); })}
          </div>
        </div>
      )}

      <div className="footnote">
        {session ? `Conectado como ${session.user.email}. Seus dados ficam salvos na nuvem e neste aparelho.` : "Os dados ficam salvos neste aparelho. Para usar em mais de um aparelho, conecte a nuvem em Configurações."}
      </div>
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

function VinculoForm({ onSubmit, defaultStartMonth }) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(PALETTE[0]);
  const [tipo, setTipo] = useState("plantao");
  const [taxOverride, setTaxOverride] = useState("");
  const [valorMensal, setValorMensal] = useState("");
  const [diaRecebimento, setDiaRecebimento] = useState(5);
  const [prazoPadrao, setPrazoPadrao] = useState(0);
  const [prazoMeses, setPrazoMeses] = useState(0);

  const submit = () => {
    if (!nome) return;
    onSubmit({ nome, cor, tipo, taxOverride, valorMensal, diaRecebimento, prazoPadrao, prazoMeses, startMonth: defaultStartMonth });
    setNome(""); setValorMensal(""); setPrazoPadrao(0); setPrazoMeses(0);
  };

  return (
    <div className="mini-form">
      <div className="form-grid">
        <div className="field"><label>Nome do vínculo</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Hospital São Lucas, UTI Municipal..." /></div>
        <div className="field color-field"><label>Cor</label><div className="color-input-wrap"><input type="color" value={cor} onChange={(e) => setCor(e.target.value)} /></div></div>
        <div className="field"><label>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="plantao">Plantão avulso (lançado no calendário)</option>
            <option value="mensal">Vínculo mensal fixo (diarista, contrato...)</option>
          </select>
        </div>
        <div className="field"><label>Tributação específica (%) — opcional</label><input type="number" value={taxOverride} onChange={(e) => setTaxOverride(e.target.value)} placeholder="usa a geral" /></div>
        {tipo === "mensal" && (
          <>
            <div className="field"><label>Valor mensal bruto (R$)</label><input type="number" value={valorMensal} onChange={(e) => setValorMensal(e.target.value)} placeholder="0,00" /></div>
            <div className="field"><label>Dia de recebimento</label><input type="number" min="1" max="31" value={diaRecebimento} onChange={(e) => setDiaRecebimento(e.target.value)} /></div>
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
      <button className="btn btn-primary" onClick={submit}><IconPlus size={15} /> Salvar vínculo</button>
    </div>
  );
}

function VinculoManager({ vinculos, addVinculo, removeVinculo, updateVinculoTax, updateVinculoPrazo, monthKey }) {
  const [showForm, setShowForm] = useState(vinculos.length === 0);
  return (
    <div>
      {vinculos.length === 0 ? (
        <div className="empty-state">Nenhum vínculo cadastrado ainda. Crie o primeiro para começar a lançar plantões ou renda mensal fixa.</div>
      ) : (
        vinculos.map((v) => (
          <div className="vinculo-row" key={v.id}>
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
            <div className="field"><label>Valor (R$)</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></div>
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
  vinculos, addVinculo, removeVinculo, updateVinculoTax, updateVinculoPrazo, extraRecurringIncomes, addExtraRecurringIncome, removeExtraRecurringIncome, updateExtraPrazo,
  netByVinculo, gainScope, setGainScope, history12, chartMonths, setChartMonths, goMonth
}) {
  const [manage, setManage] = useState(vinculos.length === 0);
  const sorted = [...monthIncomeItems].sort((a, b) => a.tipo === b.tipo ? 0 : (a.tipo === "plantao" ? -1 : 1));
  const received = monthIncomeItems.filter((i) => i.recebido).reduce((a, i) => a + i.net, 0);
  const donutData = netByVinculo.map((h) => ({ nome: h.nome, value: h.value, cor: h.cor }));

  return (
    <div>
      <div className="kpi-row">
        <Kpi label="Receita bruta" value={fmtBRL(totalGross)} />
        <Kpi label="Impostos" value={fmtBRL(totalGross - totalNet)} tone="var(--brick)" />
        <Kpi label="Receita líquida" value={fmtBRL(totalNet)} sub="entra neste mês" />
        <Kpi label="Já recebido" value={fmtBRL(received)} tone="var(--teal)" sub={totalNet > 0 ? Math.round((received / totalNet) * 100) + "% do líquido" : null} />
      </div>

      <div className="note-info">O valor aparece no mês em que cai no caixa. Se uma empresa paga depois, ajuste o prazo em “Vínculos e receitas fixas”, no fim da página.</div>

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

      <div className="card flush">
        <div className="card-head pad"><h3 className="card-title">Lançamentos de {MONTHS_PT[viewMonth]}</h3><span className="card-note">toque no status para marcar como recebido</span></div>
        {sorted.length === 0 ? <div className="empty-state">Nenhuma receita neste mês ainda.</div> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Vínculo</th><th className="hide-sm">Data</th><th className="num hide-sm">Bruto</th><th className="num">Líquido</th><th>Status</th><th /></tr></thead>
              <tbody>
                {sorted.map((it) => (
                  <tr key={it.key}>
                    <td><span className="asset-cell"><span className="legend-dot" style={{ background: it.cor }} /><span><b>{it.nome}</b><span className="cell-sub show-sm">{it.dateLabel}</span></span></span></td>
                    <td className="hide-sm">{it.dateLabel}{it.tipo !== "plantao" && !/ref\./.test(it.dateLabel) ? (it.tipo === "mensal" ? "" : "") : ""}</td>
                    <td className="num mono hide-sm">{fmtBRL(it.gross)}</td>
                    <td className="num mono">{fmtBRL(it.net)}</td>
                    <td><button className={`badge ${it.recebido ? "badge-paid" : "badge-pending"}`} onClick={it.toggle}>{it.recebido ? "Recebido" : "Pendente"}</button></td>
                    <td className="num">{it.removeOne ? <button className="btn-icon" onClick={it.removeOne}><IconTrash size={15} /></button> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head"><h3 className="card-title">Vínculos e receitas fixas</h3><button className="link-btn" onClick={() => setManage((v) => !v)}>{manage ? "fechar" : "gerenciar"}</button></div>
        {!manage && <div className="line-sub">{vinculos.length} vínculo(s) · {extraRecurringIncomes.length} receita(s) recorrente(s)</div>}
        {manage && (
          <>
            <div className="sub-heading" style={{ marginTop: 0 }}>Vínculos de trabalho</div>
            <VinculoManager vinculos={vinculos} addVinculo={addVinculo} removeVinculo={removeVinculo} updateVinculoTax={updateVinculoTax} updateVinculoPrazo={updateVinculoPrazo} monthKey={monthKey} />
            <div className="sub-heading">Outras receitas recorrentes</div>
            <ExtraIncomeManager extraRecurringIncomes={extraRecurringIncomes} addExtraRecurringIncome={addExtraRecurringIncome} removeExtraRecurringIncome={removeExtraRecurringIncome} updateExtraPrazo={updateExtraPrazo} monthKey={monthKey} />
          </>
        )}
      </div>
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

function BackupTab({ taxRateGeral, setTaxRateGeral, downloadBackup, fileInputRef, handleImportFile, saveError, cloudCard, wipeCard }) {
  return (
    <div>
      {cloudCard}
      <div className="day-panel" style={{ marginTop: 0 }}>
        <div className="day-panel-title"><span>Configurações gerais</span></div>
        <div className="tax-box" style={{ marginBottom: 0 }}>
          <span className="tax-box-label">Tributação geral (usada quando um vínculo não tem taxa própria)</span>
          <input type="number" value={taxRateGeral} onChange={(e) => setTaxRateGeral(e.target.value)} step="0.1" />
          <span className="tax-box-label">%</span>
        </div>
      </div>

      <div className="day-panel">
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

      {wipeCard}
    </div>
  );
}

function DashboardTab({ viewMonth, viewYear, patrimonioTotal, saldoRealizado, totalInvestedAllTime, totalNet, totalPendingExpenses, alerts, history12, goals, generateMonthlyReport, setActiveTab, curStats, prevStats, portfolio, chartMonths, setChartMonths, goMonth, quickGo, setup, monthExpenseItems, limits, monthShiftsCount, insights }) {
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

  return (
    <div>
      <div className="greet"><h2>{hello}!</h2><p>Este é o resumo de {MONTHS_PT[viewMonth].toLowerCase()} de {viewYear}.</p></div>

      {alerts.length > 0 && (
        <div className="alert-strip">
          {alerts.slice(0, 3).map((a) => <div key={a.id} className={`alert-item alert-${a.level}`}><span className="al-dot" />{a.text}</div>)}
        </div>
      )}

      {pending.length > 0 && (
        <div className="card steps">
          <div className="card-head"><h3 className="card-title">Comece por aqui</h3><span className="card-note">{4 - pending.length} de 4</span></div>
          <div className="lim-bar" style={{ marginTop: 0 }}><div style={{ width: ((4 - pending.length) / 4) * 100 + "%", background: TEAL }} /></div>
          {steps.map((st, i) => (
            <div key={i} className={`step-line ${st.done ? "done" : ""}`}>
              <span className="step-dot">{st.done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : i + 1}</span>
              <div className="step-main"><div className="step-title">{st.label}</div></div>
              {!st.done && <button className="btn btn-ghost sm" onClick={st.go}>{st.cta}</button>}
            </div>
          ))}
        </div>
      )}

      <div className="balance-card">
        <div className="bc-top">Saldo em caixa</div>
        <div className="bc-value mono" style={saldoRealizado < 0 ? { color: "var(--brick)" } : null}>{fmtBRL(saldoRealizado)}</div>
        <div className="bc-sub">Patrimônio total <b className="mono">{fmtBRL(patrimonioTotal)}</b> · investido <b className="mono">{fmtBRL(portfolio.totalValue || totalInvestedAllTime)}</b></div>
        <div className="bc-flows">
          <div className="flow"><span className="flow-ico in"><IconArrowIn size={18} /></span><div><span>Receitas do mês</span><b className="mono">{fmtBRL(curStats.net)}</b><Delta now={curStats.net} prev={prevStats.net} /></div></div>
          <div className="flow"><span className="flow-ico out"><IconArrowOut size={18} /></span><div><span>Despesas do mês</span><b className="mono">{fmtBRL(curStats.expTotal)}</b><Delta now={curStats.expTotal} prev={prevStats.expTotal} invert /></div></div>
          <div className="flow"><span className="flow-ico inv"><IconTrending size={18} /></span><div><span>Investido no mês</span><b className="mono">{fmtBRL(curStats.invested)}</b></div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3 className="card-title">Insights do mês</h3>{insights.length > 4 && <button className="link-btn" onClick={() => setActiveTab("visao")}>ver todos ({insights.length})</button>}</div>
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
          <div className="card-head"><h3 className="card-title">Limites de gastos</h3><button className="link-btn" onClick={() => setActiveTab("despesas")}>{Object.keys(limits).length ? "gerenciar" : "definir"}</button></div>
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
            <div><span>Horas</span><b className="mono">{curStats.hours.toFixed(0)}h</b></div>
            <div><span>Ganho por hora</span><b className="mono">{fmtBRL(curStats.hourly)}</b></div>
            <div><span>A receber</span><b className="mono">{fmtBRL(totalNet)}</b></div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3 className="card-title">Metas</h3><button className="link-btn" onClick={() => setActiveTab("metas")}>{goals.length ? "ver todas" : "criar meta"}</button></div>
          {goals.length === 0 ? <div className="empty-state" style={{ padding: "8px 0" }}>Defina uma meta para acompanhar o progresso aqui.</div> : (
            [...goals].slice(0, 3).map((g) => {
              const pct = Math.min(100, (g.valorAtual / Math.max(g.valorAlvo, 1)) * 100);
              return (
                <div key={g.id} className="goal-line">
                  <div className="goal-top"><span className="rank-name">{g.nome}</span><span className="mono">{pct.toFixed(0)}%</span></div>
                  <div className="lim-bar" style={{ margin: "6px 0" }}><div style={{ width: `${pct}%`, background: g.cor }} /></div>
                  <div className="line-sub mono">{fmtBRL(g.valorAtual)} de {fmtBRL(g.valorAlvo)}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <button className="btn btn-ghost" onClick={generateMonthlyReport}><IconFileText size={15} /> Baixar resumo do mês (PDF)</button>
    </div>
  );
}

function GoalsTab({ goals, addGoal, removeGoal, contributeGoal }) {
  const [showForm, setShowForm] = useState(goals.length === 0);
  const [nome, setNome] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [prazo, setPrazo] = useState("");
  const [cor, setCor] = useState(PALETTE[0]);
  const [contributions, setContributions] = useState({});

  const submit = () => {
    if (!nome || !valorAlvo) return;
    addGoal({ nome, valorAlvo, valorAtual, prazo, cor });
    setNome(""); setValorAlvo(""); setValorAtual(""); setPrazo(""); setShowForm(false);
  };

  const monthsUntil = (prazo) => {
    if (!prazo) return null;
    const today = new Date();
    const target = new Date(prazo);
    const months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
    return Math.max(1, months);
  };

  return (
    <div>
      {goals.length === 0 && <div className="empty-state" style={{ marginBottom: 12 }}>Nenhuma meta cadastrada ainda — crie a primeira abaixo.</div>}

      {goals.map((g) => {
        const pct = Math.min(100, (g.valorAtual / Math.max(g.valorAlvo, 1)) * 100);
        const m = monthsUntil(g.prazo);
        const faltam = Math.max(0, g.valorAlvo - g.valorAtual);
        const mensal = m ? faltam / m : null;
        return (
          <div key={g.id} className="chart-card">
            <div className="stub-head">
              <span className="stub-hospital"><span className="color-dot" style={{ background: g.cor }} /> {g.nome}</span>
              <button className="btn-icon" onClick={() => { if (window.confirm(`Remover a meta "${g.nome}"?`)) removeGoal(g.id); }}><IconTrash size={15} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "12px 0 6px" }}>
              <Ring pct={pct} size={84} stroke={9} color={g.cor}><b>{pct.toFixed(0)}%</b></Ring>
              <div>
                <div className="big-num mono" style={{ fontSize: 20 }}>{fmtBRL(g.valorAtual)}</div>
                <div className="big-sub">de {fmtBRL(g.valorAlvo)} · faltam {fmtBRL(Math.max(0, g.valorAlvo - g.valorAtual))}</div>
              </div>
            </div>
            <div className="stub-row" style={{ marginTop: 10 }}>
              <span className="k">Prazo</span><span className="v">{g.prazo ? fmtDatePt(g.prazo) : "sem prazo definido"}</span>
            </div>
            {mensal !== null && (
              <div className="stub-row"><span className="k">Necessário por mês</span><span className="v mono" style={{ color: "var(--gold)" }}>{fmtBRL(mensal)}</span></div>
            )}
            <div className="form-grid" style={{ marginTop: 10, marginBottom: 8 }}>
              <div className="field">
                <label>Aportar nesta meta</label>
                <input type="number" value={contributions[g.id] || ""} onChange={(e) => setContributions((p) => ({ ...p, [g.id]: e.target.value }))} placeholder="0,00" />
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => { const v = Number(contributions[g.id]) || 0; if (v > 0) { contributeGoal(g.id, v); setContributions((p) => ({ ...p, [g.id]: "" })); } }}>
              <IconPlus size={14} /> Adicionar aporte
            </button>
          </div>
        );
      })}

      {showForm ? (
        <div className="mini-form">
          <div className="form-grid">
            <div className="field"><label>Nome da meta</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Reserva de emergência" /></div>
            <div className="field"><label>Valor alvo (R$)</label><input type="number" value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} placeholder="0,00" /></div>
            <div className="field"><label>Valor já acumulado (R$)</label><input type="number" value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} placeholder="0,00" /></div>
            <div className="field"><label>Prazo</label><input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
            <div className="field color-field"><label>Cor</label><div className="color-input-wrap"><input type="color" value={cor} onChange={(e) => setCor(e.target.value)} /></div></div>
          </div>
          <button className="btn btn-primary" onClick={submit}><IconPlus size={15} /> Criar meta</button>
        </div>
      ) : <button className="subtle-link" onClick={() => setShowForm(true)}><IconPlus size={13} /> Nova meta</button>}
    </div>
  );
}

function CalendarTab({ cells, entriesByDay, selectedDay, setSelectedDay, viewYear, viewMonth, vinculos, addVinculo,
  addShift, removeShift, toggleShiftReceived, updateShiftPrazo, addPresenca, removePresenca, vinculoMap, netOf, setActiveTab }) {
  const [vinculoId, setVinculoId] = useState(vinculos[0] ? vinculos[0].id : "");
  const [gross, setGross] = useState("");
  const [hours, setHours] = useState("");
  const [showNewVinculo, setShowNewVinculo] = useState(false);
  const [prazoDias, setPrazoDias] = useState(0);
  const today = todayStr();
  const dayEntries = selectedDay ? (entriesByDay[selectedDay] || []) : [];
  const selectedVinculo = vinculoMap[vinculoId];
  const allEntries = Object.values(entriesByDay).flat();
  const nPlantoes = allEntries.filter((e) => e._kind === "plantao").length;
  const totHoras = allEntries.reduce((a, e) => a + Number(e.hours || 0), 0);
  const usedVinc = vinculos.filter((v) => allEntries.some((e) => e.vinculoId === v.id));

  useEffect(() => { if (!vinculoId && vinculos[0]) setVinculoId(vinculos[0].id); }, [vinculos]);
  // ao trocar de vínculo, sugere o prazo padrão da empresa
  useEffect(() => {
    const v = vinculoMap[vinculoId];
    setPrazoDias(v && v.prazoPadrao ? Number(v.prazoPadrao) : 0);
  }, [vinculoId]);

  const submit = () => {
    if (!vinculoId || !selectedVinculo) return;
    if (selectedVinculo.tipo === "plantao") {
      if (!gross) return;
      addShift(selectedDay, vinculoId, gross, hours, prazoDias);
    } else {
      if (!hours) return;
      addPresenca(selectedDay, vinculoId, hours);
    }
    setGross(""); setHours("");
  };

  return (
    <>
      <div className="kpi-row three">
        <Kpi label="Plantões" value={nPlantoes} />
        <Kpi label="Horas no mês" value={totHoras.toFixed(0) + "h"} />
        <Kpi label="Dias trabalhados" value={Object.keys(entriesByDay).length} />
      </div>
      <div className="calendar-grid">
        {WEEKDAYS_PT.map((w, i) => <div key={i} className="weekday-label">{w}</div>)}
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="cal-cell empty" />;
          const iso = dateStr(viewYear, viewMonth, day);
          const dEntries = entriesByDay[day] || [];
          const isToday = iso === today, isSelected = selectedDay === day;
          return (
            <div key={idx} className={`cal-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`} onClick={() => setSelectedDay(day)}>
              <span className="cal-day-num mono">{day}</span>
              {dEntries.length > 0 && (
                <div className="cal-dots">{dEntries.slice(0, 4).map((e) => { const v = vinculoMap[e.vinculoId]; return <span key={e.id} className="cal-dot" style={{ background: v ? v.cor : GOLD }} />; })}</div>
              )}
              {dEntries.length > 0 && <span className="cal-hours">{dEntries.reduce((a, e) => a + Number(e.hours || 0), 0)}h</span>}
            </div>
          );
        })}
      </div>

      {usedVinc.length > 0 && (
        <div className="legend inline" style={{ marginTop: 10 }}>{usedVinc.map((v) => <span key={v.id}><i style={{ background: v.cor }} />{v.nome}</span>)}</div>
      )}

      {selectedDay && (
        <div className="sheet-backdrop" onClick={() => setSelectedDay(null)}><div className="sheet tall" onClick={(e) => e.stopPropagation()}><div className="sheet-handle" />
        <div className="day-panel flat">
          <div className="day-panel-title"><span>Lançamentos em {pad(selectedDay)}/{pad(viewMonth + 1)}/{viewYear}</span><button className="btn-icon" onClick={() => setSelectedDay(null)}><IconX size={16} /></button></div>

          {dayEntries.length === 0 && <div className="empty-state">Nenhum lançamento neste dia ainda.</div>}

          {dayEntries.map((e) => {
            const v = vinculoMap[e.vinculoId];
            if (e._kind === "plantao") {
              return (
                <div key={e.id} className="stub-card">
                  <div className="stub-head"><span className="stub-hospital"><span className="color-dot" style={{ background: v ? v.cor : GOLD }} /><IconBuilding size={14} /> {v ? v.nome : "?"}</span><button className="btn-icon" onClick={() => removeShift(e.id)}><IconTrash size={15} /></button></div>
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

          {vinculos.length === 0 ? (
            <div className="empty-state">
              Cadastre um vínculo antes de lançar. <button className="subtle-link" style={{ display: "inline" }} onClick={() => setActiveTab("faturamento")}>Ir para Faturamento</button>
            </div>
          ) : (
            <div className="form-grid" style={{ marginTop: 6 }}>
              <div className="field">
                <label>Vínculo</label>
                <select value={vinculoId} onChange={(e) => setVinculoId(e.target.value)}>
                  {vinculos.map((v) => <option key={v.id} value={v.id}>{v.nome} ({v.tipo === "mensal" ? "mensal" : "plantão"})</option>)}
                </select>
              </div>
              {selectedVinculo && selectedVinculo.tipo === "plantao" && (
                <div className="field"><label>Valor bruto (R$)</label><input type="number" inputMode="decimal" value={gross} onChange={(e) => setGross(e.target.value)} placeholder="0,00" /></div>
              )}
              {selectedVinculo && selectedVinculo.tipo === "plantao" && (
                <div className="field">
                  <label>Pago em quanto tempo?</label>
                  <PrazoPicker key={vinculoId + ":" + prazoDias} unit="dias" value={prazoDias} onChange={setPrazoDias} />
                  {selectedDay && <div className="field-hint">Cairá no caixa em <b>{fmtDatePt(addDaysIso(dateStr(viewYear, viewMonth, selectedDay), prazoDias))}</b></div>}
                </div>
              )}
              <div className="field">
                <label>Horas trabalhadas</label>
                <input type="number" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="12" />
                <div className="preset-row">
                  <button type="button" className="preset-btn" onClick={() => setHours(12)}>12h</button>
                  <button type="button" className="preset-btn" onClick={() => setHours(24)}>24h</button>
                </div>
              </div>
            </div>
          )}
          {vinculos.length > 0 && <button className="btn btn-primary" onClick={submit}><IconPlus size={15} /> Adicionar lançamento</button>}

          {!showNewVinculo ? <div style={{ marginTop: 10 }}><button className="subtle-link" onClick={() => setShowNewVinculo(true)}><IconPlus size={13} /> Novo vínculo rápido</button></div> :
            <VinculoForm onSubmit={(d) => { const id = addVinculo(d); setVinculoId(id); setShowNewVinculo(false); }} defaultStartMonth={monthKeyOf(viewYear, viewMonth)} />}
        </div></div></div>
      )}
    </>
  );
}

function ExpensesTab({ monthExpenseItems, addExpense, addRecurringExpense, viewYear, viewMonth, totalPending, openSignal, limits, setLimit }) {
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
  const groups = [];
  visible.forEach((e) => { const g = groups[groups.length - 1]; if (g && g.iso === e.dateIso) g.items.push(e); else groups.push({ iso: e.dateIso, items: [e] }); });

  return (
    <div>
      <div className="kpi-row">
        <Kpi label="Total do mês" value={fmtBRL(total)} />
        <Kpi label="Já pago" value={fmtBRL(paidTotal)} tone="var(--teal)" sub={pct + "% quitado"} />
        <Kpi label="Falta pagar" value={fmtBRL(totalPending)} tone="var(--brick)" />
        <Kpi label="Contas no mês" value={monthExpenseItems.length} sub={monthExpenseItems.filter((e) => !e.paid).length + " pendente(s)"} />
      </div>

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
        {groups.map((g) => (
          <div key={g.iso}>
            <div className="tx-group">{dayGroupLabel(g.iso, today)}</div>
            {g.items.map((e) => {
              const meta = EXP_CAT_MAP[e.category] || EXP_CAT_MAP.outros;
              const di = dueInfo(e.dateIso, today, e.paid);
              return (
                <div key={e.key} className={`tx-row ${e.paid ? "is-paid" : ""}`}>
                  <span className="tx-ico" style={{ background: meta.color + "1a" }}><ExpIcon id={meta.id} size={19} color={meta.color} /></span>
                  <div className="tx-main">
                    <div className="tx-title">{e.description}</div>
                    <div className="tx-sub"><span>{meta.label}</span><span>·</span><span>{e.tipo === "recorrente" ? "todo mês" : "pontual"}</span>{!e.paid && <span className={`due ${di.cls}`}>{di.text}</span>}</div>
                  </div>
                  <div className="tx-right">
                    <span className="tx-amt mono">− {fmtBRL(e.amount)}</span>
                    <div className="tx-actions">
                      <button className={`tx-status ${e.paid ? "paid" : "open"}`} onClick={e.toggle}>{e.paid ? "Pago" : "Marcar pago"}</button>
                      <button className="btn-icon" onClick={e.remove} aria-label="Excluir"><IconTrash size={15} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
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
                <div className="field"><label>Valor (R$)</label><input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></div>
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
        <div className="card">
          <div className="card-head"><h3 className="card-title">Limites por categoria</h3></div>
          <LimitRow catId="__total" label="Limite geral do mês" spent={total} limit={limits.__total || 0} color={TEAL}
            editing={editing === "__total"} onEdit={() => setEditing("__total")} onCancel={() => setEditing(null)} onSave={(v) => { setLimit("__total", v); setEditing(null); }} />
          {catIds.map((c) => { const m = EXP_CAT_MAP[c] || EXP_CAT_MAP.outros; return (
            <LimitRow key={c} catId={c} label={m.label} spent={spentBy[c] || 0} limit={limits[c] || 0} color={m.color} icon={<ExpIcon id={c} size={17} color={m.color} />}
              editing={editing === c} onEdit={() => setEditing(c)} onCancel={() => setEditing(null)} onSave={(v) => { setLimit(c, v); setEditing(null); }} />
          ); })}
          {freeCats.length > 0 && (
            <div className="lim-add">
              <select value={addCat} onChange={(e) => setAddCat(e.target.value)}>
                <option value="">Limite para outra categoria…</option>
                {freeCats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <button className="btn btn-ghost sm" disabled={!addCat} onClick={() => { setExtraCats((p) => [...p, addCat]); setEditing(addCat); setAddCat(""); }}>Adicionar</button>
            </div>
          )}
        </div>

      </div>

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

function InvestmentsTab({ investments, portfolio, cotacoes, addInvestment, removeInvestment,
  setCotacao, brapiToken, setBrapiToken, refreshQuotes, quoteStatus, viewYear, viewMonth, investmentsHistory12, chartMonths, setChartMonths, openSignal }) {
  const [tab, setTab] = useState("resumo");
  const [showForm, setShowForm] = useState(false);
  useEffect(() => { if (openSignal) { setShowForm(true); setTab("resumo"); } }, [openSignal]);
  const [catFilter, setCatFilter] = useState("todas");
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
  const grouped = presentCats.filter((c) => catFilter === "todas" || c === catFilter).map((c) => ({ cat: c, items: positions.filter((p) => p.category === c) }));

  return (
    <div>
      <div className="kpi-row">
        <Kpi label="Total investido" value={fmtBRL(totalCost)} sub="custo das posições" />
        <Kpi label="Patrimônio atual" value={fmtBRL(totalValue)} sub={positions.length + " posição(ões)"} />
        <Kpi label="Variação" value={sgn(profit) + " " + fmtBRL(Math.abs(profit))} tone={profit >= 0 ? "var(--teal)" : "var(--brick)"} sub={signPct(profitPct) + " sobre o custo"} />
        <Kpi label="Rentabilidade" value={signPct(returnPct)} tone={returnPct >= 0 ? "var(--teal)" : "var(--brick)"} sub="considera vendas" />
      </div>

      <div className="subtabs-row">
        <div className="subtabs">
          {[["resumo", "Resumo"], ["ativos", "Ativos"], ["lancamentos", "Lançamentos"], ["evolucao", "Evolução"]].map(([k, l]) => (
            <button key={k} className={`subtab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? "Fechar" : "Novo lançamento"}</button>
      </div>

      {showForm && (
        <div className="card">
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
                <div className="field"><label>Preço unitário (R$)</label><input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" /></div>
              </>
            ) : (
              <div className="field"><label>{tipo === "venda" ? "Valor resgatado / vendido (R$)" : "Valor investido (R$)"}</label><input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></div>
            )}
            <div className="field"><label>Data</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
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

      {/* ---------- ATIVOS (tabela) ---------- */}
      {tab === "ativos" && (
        <div className="card flush">
          <div className="card-head pad">
            <h3 className="card-title">Meus ativos</h3>
            <button className="btn btn-ghost" style={{ minHeight: 32, padding: "5px 12px", fontSize: 12.5 }} onClick={refreshQuotes}>Atualizar cotações</button>
          </div>
          <div className="pad-x">
            {presentCats.length > 1 && (
              <div className="chip-row" style={{ marginBottom: 10 }}>
                <button className={`chip ${catFilter === "todas" ? "active" : ""}`} onClick={() => setCatFilter("todas")}>Todas</button>
                {presentCats.map((c) => <button key={c} className={`chip ${catFilter === c ? "active" : ""}`} onClick={() => setCatFilter(c)}>{c}</button>)}
              </div>
            )}
            <details className="cfg">
              <summary>Cotação automática (opcional)</summary>
              <div className="field" style={{ margin: "8px 0" }}>
                <label>Token brapi.dev</label>
                <input value={brapiToken} onChange={(e) => setBrapiToken(e.target.value.trim())} placeholder="cole seu token aqui" autoComplete="off" />
              </div>
            </details>
            {quoteStatus && <div className="field-hint" style={{ marginBottom: 8 }}>{quoteStatus}</div>}
          </div>
          {positions.length === 0 ? <div className="empty-state">Nenhuma posição ainda. Toque em “Novo lançamento”.</div> : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Ativo</th><th className="num hide-sm">Qtd.</th><th className="num hide-sm">Preço médio</th><th className="num hide-sm">Cotação / valor atual</th><th className="num">Patrimônio</th><th className="num hide-sm">Variação</th><th className="num hide-sm">% carteira</th></tr></thead>
                <tbody>
                  {grouped.map((g) => {
                    const sub = g.items.reduce((a, p) => a + p.value, 0);
                    return (
                      <React.Fragment key={g.cat}>
                        <tr className="group"><td colSpan="1" className="grp-name"><span className="legend-dot" style={{ background: invCatMeta(g.cat).color, display: "inline-block", marginRight: 8 }} />{g.cat}</td><td className="hide-sm" colSpan="3" /><td className="num mono">{fmtBRL(sub)}</td><td className="hide-sm" /><td className="num hide-sm mono">{pctOf(sub)}</td></tr>
                        {g.items.map((p) => (
                          <tr key={p.key}>
                            <td><span className="asset-cell"><span className="tile sm" style={{ background: p.meta.color + "1f", color: p.meta.color }}>{initialsOf(p.description)}</span><span><b>{p.description}</b><span className="cell-sub">{p.assetName || p.category}</span><input className="cell-input show-sm" type="number" inputMode="decimal" value={cotacoes[p.description] ?? ""} placeholder={p.isQty ? "cotação " + p.avg.toFixed(2) : "valor atual"} onChange={(e) => setCotacao(p.description, e.target.value)} /></span></span></td>
                            <td className="num mono hide-sm">{p.isQty ? Number(p.qty.toFixed(4)) : "—"}</td>
                            <td className="num mono hide-sm">{p.isQty ? fmtBRL(p.avg) : "—"}</td>
                            <td className="num hide-sm"><input className="cell-input" type="number" inputMode="decimal" value={cotacoes[p.description] ?? ""} placeholder={p.isQty ? p.avg.toFixed(2) : p.cost.toFixed(2)} onChange={(e) => setCotacao(p.description, e.target.value)} /></td>
                            <td className="num"><span className="mono">{fmtBRL(p.value)}</span><span className={`pill show-sm ${p.profit >= 0 ? "up" : "down"}`} style={{ marginTop: 4 }}>{signPct(p.profitPct)}</span></td>
                            <td className="num hide-sm"><span className={`pill ${p.profit >= 0 ? "up" : "down"}`}>{signPct(p.profitPct)}</span></td>
                            <td className="num mono hide-sm">{pctOf(p.value)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="table-note">Para lançamentos sem quantidade (ex.: “Ações (geral)” ou renda fixa), digite na coluna Cotação o valor atual total.</div>
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
                        <td><span className={`badge ${sell ? "badge-pending" : "badge-paid"}`} style={{ cursor: "default" }}>{sell ? "Venda" : "Compra"}</span></td>
                        <td className="num mono hide-sm">{i.qty > 0 ? Number(i.qty) : "—"}</td>
                        <td className="num mono hide-sm">{i.qty > 0 ? fmtBRL(i.price) : "—"}</td>
                        <td className="num mono" style={{ color: sell ? "var(--brick)" : "var(--text)" }}>{fmtBRL(Math.abs(i.amount))}</td>
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


function ImportTab({ buildExpenseItems, buildIncomeItems, importedKeys, commitImport, importLog, undoImport, goTab, commitB3, portfolio, investments }) {
  const [b3raw, setB3raw] = useState([]);
  const [b3info, setB3info] = useState(null);
  const [source, setSource] = useState("extrato");
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
  const fileRef = useRef(null);

  const reset = () => { setRaw([]); setB3raw([]); setB3info(null); setEdits({}); setLabel(""); setError(""); setInvert(false); setPwdFile(null); setPassword(""); };

  const handleFiles = async (files, pwd) => {
    setError(""); setDone(null);
    const list = Array.from(files || []);
    if (!list.length) return;
    const today = new Date();
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
      else if (INVEST_RE.test(r.desc)) auto = { action: "ignorar", reason: "Parece aplicação ou resgate de investimento" };
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
    const base = b3raw.map((r, idx) => {
      const id = "b3:" + idx;
      if (r.kind !== "trade") return { ...r, id };
      const key = `b3t:${r.date}|${r.ticker}|${r.side}|${r.qty}|${Number(r.amount).toFixed(2)}`;
      let action = "importar", reason = "";
      if (importedKeys[key]) { action = "ignorar"; reason = "Já importado antes"; }
      else if (hasNeg && r.src === "mov" && r.category !== "Renda Fixa") { action = "ignorar"; reason = "Já vem na planilha de negociação"; }
      else if (r.category === "Renda Fixa" && portfolio.positions.some((x) => x.category === "Renda Fixa" && (stripAcc(x.description).includes(stripAcc(r.ticker)) || stripAcc(r.ticker).includes(stripAcc(x.description))))) { action = "ignorar"; reason = "Você já tem esse título na carteira"; }
      else if (manualTk.has(r.ticker)) reason = "Você já lançou este ativo à mão. Confira para não duplicar";
      const row = { ...r, id, key, action, reason };
      return edits[id] ? { ...row, ...edits[id] } : row;
    });
    const batchQty = {}; const batchRF = new Set();
    base.forEach((r) => { if (r.kind === "trade" && r.action === "importar" && r.category === "Renda Fixa") batchRF.add(r.ticker); });
    base.forEach((r) => { if (r.kind === "trade" && r.action === "importar" && r.qty > 0) batchQty[r.ticker] = (batchQty[r.ticker] || 0) + (r.side === "compra" ? r.qty : -r.qty); });
    return base.map((r) => {
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
    if (r.kind === "trade") return [["importar", r.side === "compra" ? "Importar compra" : "Importar venda"], ["ignorar", "Ignorar"]];
    if (r.category === "Renda Fixa") return (r.target ? [["valor", "Atualizar valor atual"]] : []).concat([["criar", "Adicionar à carteira"], ["ignorar", "Ignorar"]]);
    return r.hasApp ? [["cotacao", "Só atualizar cotação"]].concat(r.diff ? [["ajustar", "Ajustar quantidade para a da B3"]] : []).concat([["ignorar", "Ignorar"]]) : [["criar", "Adicionar à carteira"], ["ignorar", "Ignorar"]];
  };
  const b3active = b3rows.filter((r) => r.action !== "ignorar");
  const doImportB3 = () => { const entry = commitB3(b3rows, label || "Planilha B3"); setDone(entry); reset(); };

  const setEdit = (id, patch) => setEdits((p) => ({ ...p, [id]: { ...(p[id] || {}), ...patch } }));
  const active = rows.filter((r) => r.action !== "ignorar");
  const sum = (arr) => arr.reduce((a, r) => a + Math.abs(r.amount), 0);
  const novos = rows.filter((r) => r.action === "novo"), baixas = rows.filter((r) => r.action === "baixar" || r.action === "receber"), entradas = rows.filter((r) => r.action === "receita"), ignor = rows.filter((r) => r.action === "ignorar");
  const shown = rows.filter((r) => filter === "todos" ? true : filter === "saidas" ? r.out && r.action !== "ignorar" : filter === "entradas" ? !r.out && r.action !== "ignorar" : r.action === "ignorar")
    .sort((a, b) => b.date.localeCompare(a.date));

  const doImport = () => {
    const entry = commitImport(rows, label || "Importação");
    setDone(entry); reset();
  };

  const actionOptions = (r) => r.out
    ? [["novo", "Criar despesa (já paga)"], ...(r.matchItem ? [["baixar", "Dar baixa: " + r.matchItem.description]] : []), ["ignorar", "Ignorar"]]
    : [["receita", "Registrar como entrada"], ...(r.matchItem ? [["receber", "Marcar recebido: " + r.matchItem.nome]] : []), ["ignorar", "Ignorar"]];

  return (
    <div>
      {done && (
        <div className="card done-card">
          <div className="card-head"><h3 className="card-title">Importação concluída</h3></div>
          <div className="line-sub" style={{ fontSize: 14, color: "var(--text)" }}>
            {done.investimentos !== undefined
              ? `${done.investimentos} lançamento(s) de investimento criado(s) e ${done.cotacoes} cotação(ões) atualizada(s).`
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
          <div className="card-head"><h3 className="card-title">1. O que você vai importar?</h3></div>
          <div className="choice-row">
            <button className={`choice ${source === "extrato" ? "on" : ""}`} onClick={() => setSource("extrato")}><b>Extrato da conta</b><span>Entradas (pagamentos dos hospitais) e saídas (contas, PIX, boletos)</span></button>
            <button className={`choice ${source === "fatura" ? "on" : ""}`} onClick={() => setSource("fatura")}><b>Fatura do cartão</b><span>Compras do cartão, cada uma vira uma despesa</span></button>
            <button className={`choice ${source === "b3" ? "on" : ""}`} onClick={() => setSource("b3")}><b>Planilha da B3</b><span>Sua carteira da Área do Investidor: ações, FIIs, ETFs e Tesouro</span></button>
          </div>

          <div className="card-head" style={{ marginTop: 18 }}><h3 className="card-title">2. Anexe o arquivo</h3></div>
          <button className="drop" onClick={() => fileRef.current && fileRef.current.click()}>
            <IconUpload size={26} color={TEAL} />
            <b>Escolher arquivo</b>
            <span>{source === "b3" ? "Planilhas de Posição, Negociação ou Movimentação (Excel ou CSV). Pode escolher várias." : "OFX, CSV ou PDF baixados do app ou site do banco. Pode escolher vários."}</span>
          </button>
          <input ref={fileRef} type="file" multiple accept={source === "b3" ? ".xlsx,.xls,.csv" : ".ofx,.ofc,.qfx,.csv,.txt,.pdf,application/pdf,text/csv"} style={{ display: "none" }} onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
          {busy && <div className="field-hint" style={{ marginTop: 10 }}>{busy}</div>}
          {error && <div className="note-bad">{error}</div>}
          {pwdFile && (
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="field"><label>Senha do PDF</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" /></div>
              <div className="field" style={{ display: "flex", alignItems: "flex-end" }}><button className="btn btn-primary" onClick={() => handleFiles([pwdFile], password)}>Abrir PDF</button></div>
            </div>
          )}
          {source === "b3" ? (
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
        </div>
      )}


      {b3raw.length > 0 && (
        <>
          <div className="kpi-row">
            <Kpi label="Compras e vendas" value={b3rows.filter((r) => r.kind === "trade" && r.action !== "ignorar").length} sub="lançamentos novos" />
            <Kpi label="Posições" value={b3rows.filter((r) => r.kind === "pos").length} sub="ativos na planilha" />
            <Kpi label="Cotações" value={b3rows.filter((r) => r.kind === "pos" && r.action !== "ignorar").length} tone="var(--teal)" sub="serão atualizadas" />
            <Kpi label="Ignorados" value={b3rows.filter((r) => r.action === "ignorar").length} />
          </div>
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
                      <div className="imp-desc">{r.kind === "trade" ? `${r.side === "compra" ? "Compra" : "Venda"} · ${r.ticker}` : r.ticker}</div>
                      <div className="line-sub">
                        {r.kind === "trade" ? `${fmtDatePt(r.date)} · ${r.category}${r.qty > 0 ? ` · ${Number(r.qty)} x ${fmtBRL(r.price)}` : ""}` : `${r.category}${r.qty > 0 ? ` · ${Number(r.qty)} un. · fechamento ${fmtBRL(r.price)}` : ""}`}
                        {r.reason ? " · " + r.reason : ""}
                      </div>
                    </div>
                    <div className="mono imp-amt" style={{ color: r.kind === "trade" ? (r.side === "compra" ? "var(--text)" : "var(--brick)") : "var(--teal)" }}>{fmtBRL(r.kind === "trade" ? r.amount : r.value)}</div>
                  </div>
                  <div className="imp-ctrl">
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
  return (
    <div>
      <div className="card">
        <div className="card-head"><h3 className="card-title">Insights</h3><span className="card-note">calculados no seu aparelho</span></div>
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
