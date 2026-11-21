// Monta o app: compila app.jsx em app.js e troca a versão no index.html e no service-worker.js
// (a versão nova faz o celular baixar o app atualizado). Uso: npm install (uma vez) e depois npm run build
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

const agora = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date());
const versao = process.argv[2] || agora.replace(/\D/g, "").slice(0, 12);

await build({
  entryPoints: ["app.jsx"], bundle: true, minify: true, target: "es2019", charset: "ascii", legalComments: "none",
  format: "iife", define: { "process.env.NODE_ENV": '"production"' }, loader: { ".jsx": "jsx" }, logLevel: "warning", outfile: "app.js",
});

const troca = (arq, re, novo) => { const s = readFileSync(arq, "utf8"); if (!re.test(s)) throw new Error("não achei a versão em " + arq); writeFileSync(arq, s.replace(re, novo)); };
troca("index.html", /app\.js\?v=\d+/, "app.js?v=" + versao);
troca("service-worker.js", /mediplan-\d+/, "mediplan-" + versao);
console.log("Pronto. Versão " + versao);
