#!/usr/bin/env python3
"""Testes do guarda.py. Rode: python3 .claude/hooks/testar-guarda.py"""
import json, os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
GUARDA = os.path.join(AQUI, "guarda.py")
RAIZ = os.path.dirname(os.path.dirname(AQUI))


def rodar(entrada, cwd=RAIZ):
    txt = entrada if isinstance(entrada, str) else json.dumps(entrada)
    r = subprocess.run([sys.executable, GUARDA], input=txt, capture_output=True, text=True, cwd=cwd,
                       env={**os.environ, "CLAUDE_PROJECT_DIR": RAIZ})
    if r.returncode != 0:
        return "erro:" + r.stderr.strip()
    if not r.stdout.strip():
        return None
    return json.loads(r.stdout)["hookSpecificOutput"]["permissionDecision"]


def bash(cmd):
    return {"tool_name": "Bash", "tool_input": {"command": cmd}, "cwd": RAIZ}


def arq(tool, caminho):
    return {"tool_name": tool, "tool_input": {"file_path": caminho}, "cwd": RAIZ}


CASOS = [
    # ---- deny: apagar raiz ou pasta pessoal
    ("rm -rf na raiz", bash("rm -rf /"), "deny"),
    ("rm -rf ~", bash("rm -rf ~"), "deny"),
    ("rm -rf $HOME", bash("rm -rf $HOME"), "deny"),
    ("rm -fr /home/user", bash("rm -fr /home/user"), "deny"),
    ("sudo rm -rf /*", bash("sudo rm -rf /*"), "deny"),
    # ---- deny: segredos
    ("cat .env", bash("cat .env"), "deny"),
    ("cp .env.local", bash("cp .env.local /tmp/x"), "deny"),
    ("Read .env", arq("Read", "/home/user/Medplan/.env"), "deny"),
    ("Edit .env.production", arq("Edit", "/home/user/Medplan/.env.production"), "deny"),
    ("Write chave.pem", arq("Write", "/home/user/Medplan/chave.pem"), "deny"),
    ("Read id_rsa", arq("Read", "/root/.ssh/id_rsa"), "deny"),
    ("Read arquivo com secret", arq("Read", "/home/user/Medplan/supabase/secrets.json"), "deny"),
    ("less app.keystore", bash("less android/app.keystore"), "deny"),
    ("Read .jks", arq("Read", "/x/upload.jks"), "deny"),
    # ---- ask: publicar
    ("push no main", bash("git push origin main"), "ask"),
    ("push HEAD:main", bash("git push -q origin HEAD:main"), "ask"),
    ("push forçado", bash("git push --force origin ccr-123"), "ask"),
    ("push com +", bash("git push origin +ccr-123"), "ask"),
    ("push para ramo qualquer", bash("git push origin outro-ramo"), "ask"),
    ("supabase deploy", bash("supabase functions deploy cotacoes"), "ask"),
    ("supabase db push", bash("supabase db push"), "ask"),
    ("npx vercel", bash("npx vercel --prod"), "ask"),
    # ---- ask: git perigoso
    ("merge saindo do main", bash("git checkout main && git merge ccr-1"), "ask"),
    ("reset --hard", bash("git reset --hard HEAD~1"), "ask"),
    ("clean -fd", bash("git clean -fd"), "ask"),
    ("restore .", bash("git restore ."), "ask"),
    ("checkout -- .", bash("git checkout -- ."), "ask"),
    ("branch -D", bash("git branch -D velho"), "ask"),
    ("stash drop", bash("git stash drop"), "ask"),
    ("stash clear", bash("git stash clear"), "ask"),
    # ---- ask: apagar pastas do projeto
    ("rm -r pasta do projeto", bash("rm -r conheca"), "ask"),
    ("rm -rf ferramentas/saida", bash("rm -rf ferramentas/saida"), "ask"),
    # ---- ask: instalar
    ("npm install pacote", bash("npm install lodash"), "ask"),
    ("npm i -D pacote", bash("npm i -D vitest"), "ask"),
    ("yarn add", bash("yarn add react-query"), "ask"),
    ("pnpm add", bash("pnpm add zod"), "ask"),
    ("pip install pacote", bash("pip install requests"), "ask"),
    ("python -m pip install", bash("python3 -m pip install numpy"), "ask"),
    ("pip install reportlab e outro", bash("pip install reportlab numpy"), "ask"),
    # ---- ask: configurações
    ("Edit settings.json", arq("Edit", "/home/user/Medplan/.claude/settings.json"), "ask"),
    ("Write settings.local.json", arq("Write", "/home/user/Medplan/.claude/settings.local.json"), "ask"),
    ("Edit CNAME", arq("Edit", "/home/user/Medplan/CNAME"), "ask"),
    ("sed -i no settings", bash("sed -i 's/a/b/' .claude/settings.json"), "ask"),
    ("echo > CNAME", bash("echo x > CNAME"), "ask"),
    # ---- liberado
    ("npm install sozinho", bash("npm install"), None),
    ("npm run build", bash("npm run build"), None),
    ("teste de larguras", bash("node ferramentas/testes/larguras.cjs"), None),
    ("pip install reportlab (relatório)", bash("pip install reportlab"), None),
    ("relatório de uso", bash("python3 ferramentas/relatorio/relatorio.py"), None),
    ("push ramo de trabalho", bash("git push -u origin ccr-69106799-dfuppb"), None),
    ("push ramo claude/", bash("git push origin claude/teste"), None),
    ("git status", bash("git status"), None),
    ("git commit com a palavra secreta", bash('git commit -m "Nunca use chave secreta (sb_secret)"'), None),
    ("texto com a palavra Secrets entre parênteses", bash("cat <<'EOF'\n// (Edge Functions > Secrets).\nEOF"), None),
    ("nome de tabela do banco com secrets", bash("psql -c 'select name from vault.decrypted_secrets'"), None),
    ("cat de arquivo secrets.json", bash("cat config/secrets.json"), "deny"),
    ("cp de client_secret.json", bash("cp client_secret.json /tmp/x"), "deny"),
    ("grep por chave secreta", bash('grep -rn "sb_secret\\|service_role" app.jsx'), None),
    ("rm -rf na pasta temporária", bash("rm -rf /tmp/claude-0/x/scratchpad/fontes"), None),
    ("rm de um arquivo", bash("rm ferramentas/saida/prev-1.png"), None),
    ("Read app.jsx", arq("Read", "/home/user/Medplan/app.jsx"), None),
    ("Edit app.jsx", arq("Edit", "/home/user/Medplan/app.jsx"), None),
    ("Read settings.json", arq("Read", "/home/user/Medplan/.claude/settings.json"), None),
    ("Read .env.example", arq("Read", "/home/user/Medplan/.env.example"), None),
    ("Glob (outra ferramenta)", {"tool_name": "Glob", "tool_input": {"pattern": "**/*.env"}}, None),
    # ---- entrada inesperada: não bloqueia
    ("JSON vazio", {}, None),
    ("texto que não é JSON", "isto não é json", None),
    ("lista no lugar de objeto", [1, 2], None),
    ("command não é texto", {"tool_name": "Bash", "tool_input": {"command": 5}}, None),
]


def main():
    falhas = 0
    for nome, entrada, esperado in CASOS:
        obtido = rodar(entrada)
        ok = obtido == esperado
        falhas += not ok
        print(("ok    " if ok else "FALHA ") + f"{nome}: esperado {esperado}, veio {obtido}")
    print()
    print(f"{len(CASOS) - falhas} de {len(CASOS)} casos certos.")
    if falhas:
        sys.exit(1)
    print("Tudo certo")


if __name__ == "__main__":
    main()
