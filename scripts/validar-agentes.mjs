#!/usr/bin/env node
// Confere a configuração da equipe de agentes do Sallos.
// Uso: node scripts/validar-agentes.mjs          (confere tudo)
//      node scripts/validar-agentes.mjs --hook   (chamado pelo Claude Code depois de editar; só roda se o arquivo
//                                                  editado estiver em .claude/ ou for o CLAUDE.md; erro = saída 2)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = process.argv.includes("--hook");

const CAMPOS_AGENTE = new Set(["name", "description", "tools", "disallowedTools", "model", "permissionMode", "mcpServers",
  "hooks", "maxTurns", "skills", "memory", "background", "effort", "isolation", "color", "initialPrompt"]);
const CAMPOS_SKILL = new Set(["name", "description", "argument-hint", "arguments", "disable-model-invocation", "user-invocable",
  "allowed-tools", "model", "effort", "context", "agent", "hooks", "paths", "shell", "when_to_use", "version", "license"]);
const FERRAMENTAS = new Set(["Read", "Grep", "Glob", "Bash", "Edit", "Write", "MultiEdit", "NotebookEdit", "WebSearch",
  "WebFetch", "Agent", "Task", "TodoWrite", "TaskCreate", "TaskUpdate", "TaskList", "TaskGet", "Skill", "LS", "BashOutput",
  "KillShell", "Monitor", "ToolSearch"]);
const MODELOS = new Set(["haiku", "sonnet", "opus", "fable", "inherit"]);
const RESERVADOS = new Set(["help", "init", "clear", "compact", "config", "cost", "doctor", "login", "logout", "memory", "model",
  "permissions", "review", "status", "agents", "hooks", "mcp", "resume", "exit", "bug", "vim", "terminal-setup", "add-dir",
  "ide", "release-notes", "pr-comments", "security-review", "upgrade", "export", "context", "plugin", "rewind", "statusline",
  "todos", "usage", "skills", "fast", "loop", "simplify", "code-review", "run"]);
const NOME_OK = /^[a-z0-9][a-z0-9-]*$/;
const SEM_CHECAR = /^privado\//; // fora do Git: pode não existir nesta cópia

const erros = [];
const avisos = [];
const rel = (p) => path.relative(RAIZ, p);

function cabecalho(arq) {
  const txt = fs.readFileSync(arq, "utf8");
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) { erros.push(`${rel(arq)}: falta o cabeçalho entre linhas "---"`); return null; }
  const campos = {};
  let atual = null;
  for (const linha of m[1].split(/\r?\n/)) {
    if (!linha.trim() || linha.trim().startsWith("#")) continue;
    const c = linha.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (c) {
      atual = c[1];
      if (atual in campos) erros.push(`${rel(arq)}: campo "${atual}" repetido`);
      campos[atual] = c[2].trim().replace(/^["']|["']$/g, "");
    } else if (/^\s/.test(linha) && atual) {
      campos[atual] += " " + linha.trim();
    } else {
      erros.push(`${rel(arq)}: linha do cabeçalho não entendida: "${linha}"`);
    }
  }
  return { campos, corpo: m[2] };
}

function caminhosCitados(arq, corpo) {
  const vistos = new Set();
  for (const m of corpo.matchAll(/`([^`\s]+)`/g)) {
    let c = m[1].replace(/[),.;:]+$/, "");
    if (vistos.has(c)) continue;
    vistos.add(c);
    if (/[<>*|$]|AAAA|\{|\}/.test(c) || c.startsWith("-") || c.startsWith("/")) continue;
    const parecePasta = c.endsWith("/") && /^(docs|ferramentas|scripts|supabase|conheca|privacidade|termos|\.claude|privado)\//.test(c);
    const pareceArq = /^[\w./-]+\.(md|cjs|mjs|js|jsx|py|json|sql|html|ts|sh)$/.test(c) && (c.includes("/") || fs.existsSync(path.join(RAIZ, c)) || /^[A-Z]/.test(c));
    if (!parecePasta && !pareceArq) continue;
    if (SEM_CHECAR.test(c)) continue;
    if (!c.includes("/") && !fs.existsSync(path.join(RAIZ, c))) { avisos.push(`${rel(arq)}: cita "${c}", que não existe na raiz`); continue; }
    if (!fs.existsSync(path.join(RAIZ, c))) erros.push(`${rel(arq)}: cita o caminho "${c}", que não existe`);
  }
}

function lista(v) { return (v || "").split(",").map((s) => s.trim()).filter(Boolean); }

function checarModelo(arq, m) {
  if (m && !MODELOS.has(m) && !/^claude-[a-z0-9-]+$/.test(m)) erros.push(`${rel(arq)}: modelo "${m}" desconhecido`);
}

// ---------- agentes ----------
const dirAg = path.join(RAIZ, ".claude", "agents");
const nomesAg = new Map();
if (fs.existsSync(dirAg)) {
  for (const f of fs.readdirSync(dirAg).filter((f) => f.endsWith(".md")).sort()) {
    const arq = path.join(dirAg, f);
    const h = cabecalho(arq); if (!h) continue;
    const { campos, corpo } = h;
    const base = f.replace(/\.md$/, "");
    for (const k of Object.keys(campos)) if (!CAMPOS_AGENTE.has(k)) erros.push(`${rel(arq)}: campo "${k}" não é aceito em agentes`);
    if (!campos.name) erros.push(`${rel(arq)}: falta "name"`);
    else {
      if (campos.name !== base) erros.push(`${rel(arq)}: name "${campos.name}" diferente do arquivo "${base}"`);
      if (!NOME_OK.test(campos.name)) erros.push(`${rel(arq)}: name "${campos.name}" deve ter só letras minúsculas, números e hífen`);
      if (nomesAg.has(campos.name)) erros.push(`${rel(arq)}: name "${campos.name}" repetido (também em ${nomesAg.get(campos.name)})`);
      nomesAg.set(campos.name, rel(arq));
    }
    if (!campos.description || campos.description.length < 20) erros.push(`${rel(arq)}: "description" ausente ou curta demais`);
    for (const t of lista(campos.tools)) {
      const nomeT = t.replace(/\(.*\)$/, "");
      if (!FERRAMENTAS.has(nomeT) && !nomeT.startsWith("mcp__")) erros.push(`${rel(arq)}: ferramenta "${t}" desconhecida`);
    }
    checarModelo(arq, campos.model);
    if (!corpo.trim()) erros.push(`${rel(arq)}: sem instruções depois do cabeçalho`);
    caminhosCitados(arq, corpo);
  }
} else erros.push(".claude/agents/ não existe");

// ---------- comandos (skills) ----------
const dirSk = path.join(RAIZ, ".claude", "skills");
const nomesSk = new Map();
if (fs.existsSync(dirSk)) {
  for (const d of fs.readdirSync(dirSk).sort()) {
    const pasta = path.join(dirSk, d);
    if (!fs.statSync(pasta).isDirectory()) continue;
    const arq = path.join(pasta, "SKILL.md");
    if (!fs.existsSync(arq)) { erros.push(`${rel(pasta)}: falta SKILL.md`); continue; }
    const h = cabecalho(arq); if (!h) continue;
    const { campos, corpo } = h;
    for (const k of Object.keys(campos)) if (!CAMPOS_SKILL.has(k)) erros.push(`${rel(arq)}: campo "${k}" não é aceito em comandos`);
    const nome = campos.name || d;
    if (campos.name && campos.name !== d) erros.push(`${rel(arq)}: name "${campos.name}" diferente da pasta "${d}"`);
    if (!NOME_OK.test(nome)) erros.push(`${rel(arq)}: nome "${nome}" deve ter só letras minúsculas, números e hífen`);
    if (RESERVADOS.has(nome)) erros.push(`${rel(arq)}: "${nome}" é um comando que já existe no Claude Code`);
    if (nomesSk.has(nome)) erros.push(`${rel(arq)}: nome "${nome}" repetido`);
    nomesSk.set(nome, rel(arq));
    if (!campos.description) erros.push(`${rel(arq)}: falta "description"`);
    for (const k of ["disable-model-invocation", "user-invocable"]) {
      if (k in campos && !["true", "false"].includes(campos[k])) erros.push(`${rel(arq)}: "${k}" deve ser true ou false`);
    }
    checarModelo(arq, campos.model);
    for (const m of corpo.matchAll(/`([a-z0-9-]+)`/g)) {
      // agente citado como responsável precisa existir
      if (/agente|Acione/i.test(corpo.slice(Math.max(0, m.index - 40), m.index)) && !nomesAg.has(m[1]) && !nomesSk.has(m[1]))
        erros.push(`${rel(arq)}: cita o agente "${m[1]}", que não existe`);
    }
    caminhosCitados(arq, corpo);
  }
} else erros.push(".claude/skills/ não existe");

// ---------- documentos da equipe ----------
for (const f of ["GUIA-DA-EQUIPE.md", "PROTOCOLO.md", "STATUS.md", "BACKLOG.md", "DECISOES.md"]) {
  const arq = path.join(RAIZ, "docs", "agentes", f);
  if (!fs.existsSync(arq)) erros.push(`docs/agentes/${f} não existe`);
}

// ---------- settings.json e hooks ----------
const setArq = path.join(RAIZ, ".claude", "settings.json");
if (fs.existsSync(setArq)) {
  let s = null;
  try { s = JSON.parse(fs.readFileSync(setArq, "utf8")); } catch (e) { erros.push(`.claude/settings.json: JSON inválido (${e.message})`); }
  if (s) {
    for (const [evento, grupos] of Object.entries(s.hooks || {})) {
      if (!Array.isArray(grupos)) { erros.push(`settings.json: hooks.${evento} deve ser uma lista`); continue; }
      for (const g of grupos) for (const h of g.hooks || []) {
        if (h.type !== "command" || typeof h.command !== "string") { erros.push(`settings.json: hook de ${evento} sem "command"`); continue; }
        for (const m of h.command.matchAll(/\$\{?CLAUDE_PROJECT_DIR\}?"?\/([^"\s]+)/g)) {
          if (!fs.existsSync(path.join(RAIZ, m[1]))) erros.push(`settings.json: hook de ${evento} chama "${m[1]}", que não existe`);
        }
      }
    }
    for (const k of ["allow", "ask", "deny"]) {
      const v = s.permissions?.[k];
      if (v !== undefined && !Array.isArray(v)) erros.push(`settings.json: permissions.${k} deve ser uma lista`);
    }
  }
} else erros.push(".claude/settings.json não existe");

// ---------- resultado ----------
function terminar() {
  for (const a of avisos) console.log("aviso: " + a);
  if (erros.length) {
    for (const e of erros) console.error("ERRO: " + e);
    console.error(`\n${erros.length} erro(s) na configuração da equipe.`);
    process.exit(HOOK ? 2 : 1);
  }
  if (!HOOK) console.log(`${nomesAg.size} agentes e ${nomesSk.size} comandos conferidos. Tudo certo`);
}

if (HOOK) {
  let entrada = "";
  process.stdin.on("data", (d) => (entrada += d));
  process.stdin.on("end", () => {
    let alvo = "";
    try { const j = JSON.parse(entrada || "{}"); alvo = j?.tool_input?.file_path || j?.tool_input?.notebook_path || ""; } catch (e) { process.exit(0); }
    const r = alvo ? path.relative(RAIZ, path.resolve(RAIZ, alvo)) : "";
    if (!(r.startsWith(".claude" + path.sep) || r === "CLAUDE.md")) process.exit(0);
    terminar();
  });
} else terminar();
