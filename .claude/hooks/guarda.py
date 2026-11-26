#!/usr/bin/env python3
"""Guarda do Sallos: segunda barreira antes de cada ação do Claude Code.

Recebe no stdin o JSON do Claude Code (tool_name, tool_input) e responde:
- deny: apagar a raiz ou a pasta pessoal; ler, copiar ou editar arquivos de segredo.
- ask:  publicar (push no main, push forçado, deploy), apagar coisas do projeto,
        desfazer trabalho no Git, instalar programa novo, mexer nas configurações
        do Claude e no domínio do site.
Entrada inesperada: não bloqueia (sai sem nada).
"""
import json, os, re, shlex, subprocess, sys

PROD = {"main", "master"}
TRABALHO = re.compile(r"^(ccr-|claude/|release/)")
LIBERADO_PIP = {"reportlab"}  # o relatório de uso automático instala isso sozinho, sem ninguém para confirmar


EXT_ARQ = (".json", ".txt", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf", ".key", ".env", ".js", ".ts", ".py", ".sh")


def segredo(caminho, no_terminal=False):
    """Arquivo de segredo pelo nome (não pelo conteúdo).
    No terminal, "secret" só conta se a palavra parece mesmo um arquivo (com pasta ou extensão de arquivo),
    para não confundir nomes do banco como vault.decrypted_secrets."""
    b = os.path.basename(caminho.rstrip("/")).lower()
    if not b:
        return False
    if b == ".env" or (b.startswith(".env.") and b not in {".env.example", ".env.exemplo", ".env.sample"}):
        return True
    if b.endswith((".pem", ".p12", ".pfx", ".keystore", ".jks")):
        return True
    if b.startswith("id_rsa") or b.startswith("id_ed25519") or b.startswith("id_ecdsa"):
        return True
    if "secret" not in b:
        return False
    if not no_terminal:
        return True
    return "/" in caminho or b.endswith(EXT_ARQ) or "." not in b


def parece_caminho(tok):
    # caminho de arquivo: só letras, números e . _ - ~ / $ (texto com parênteses, vírgulas etc. não é caminho)
    return bool(re.fullmatch(r"[\w.\-~/$]+", tok)) and ("/" in tok or "." in tok)


def pedacos(cmd):
    """Separa comandos encadeados (&&, ||, ;, |, quebra de linha)."""
    return [p.strip() for p in re.split(r"&&|\|\||;|\||\n", cmd) if p.strip()]


def palavras(seg):
    try:
        return shlex.split(seg, posix=True)
    except ValueError:
        return seg.split()


def ramo_atual(cwd):
    try:
        r = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=cwd or None,
                           capture_output=True, text=True, timeout=5)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""


def avaliar_bash(cmd, cwd):
    # 1) segredos: qualquer palavra que pareça caminho de arquivo de segredo
    for seg in pedacos(cmd):
        for t in palavras(seg):
            t2 = t.split("=", 1)[-1] if t.startswith("-") else t
            if not re.search(r"\s", t2) and parece_caminho(t2) and segredo(t2, no_terminal=True):
                return "deny", f"Arquivo de segredo ({t2}). Segredos ficam com o João, no painel do Supabase."
    for seg in pedacos(cmd):
        w = palavras(seg)
        while w and re.match(r"^[A-Z_][A-Z0-9_]*=", w[0]):  # VAR=valor comando
            w = w[1:]
        if w and w[0] == "sudo":
            w = w[1:]
        if not w:
            continue
        prog, args = os.path.basename(w[0]), w[1:]

        # 2) rm recursivo
        if prog == "rm":
            flags = "".join(a.lstrip("-") for a in args if a.startswith("-") and not a.startswith("--")) + \
                    " ".join(a for a in args if a.startswith("--"))
            alvos = [a for a in args if not a.startswith("-")]
            recursivo = "r" in flags or "R" in flags or "recursive" in flags
            for a in alvos:
                limpo = a.rstrip("/")
                if limpo in {"", "/", "~", "$HOME", "${HOME}", "/*", "~/*", "$HOME/*", "/root", "/home"} or \
                   a in {"/", "~/", "/*"} or re.fullmatch(r"/home/[^/]+", limpo):
                    return "deny", f"Apagar a raiz ou a pasta pessoal ({a}) não é permitido."
            if recursivo:
                fora = [a for a in alvos if not (a.startswith("/tmp/") or "scratchpad" in a)]
                if fora:
                    return "ask", f"Apagar pastas do projeto ({' '.join(fora)}). Confirma?"

        # 3) git
        if prog == "git" and args:
            sub, resto = args[0], args[1:]
            if sub == "push":
                forcado = any(a in {"-f", "--force", "--force-with-lease"} or a.startswith("--force") for a in resto)
                pos = [a for a in resto if not a.startswith("-")]
                destinos = []
                for ref in pos[1:]:
                    if ref.startswith("+"):
                        forcado = True
                    ref = ref.lstrip("+")
                    destinos.append(ref.split(":")[-1].replace("refs/heads/", ""))
                if not destinos:
                    destinos = [ramo_atual(cwd)]
                if any(d in PROD for d in destinos):
                    return "ask", "PUBLICAÇÃO: push no main coloca a versão no ar em sallos.com.br. O João deu o ok depois de ver as imagens?"
                if forcado:
                    return "ask", "Push forçado reescreve o histórico do servidor. Confirma?"
                if all(d and TRABALHO.match(d) for d in destinos):
                    continue
                return "ask", f"Enviar para o GitHub ({', '.join(d or '?' for d in destinos)}). Confirma?"
            if sub in {"merge", "rebase"} and (ramo_atual(cwd) in PROD or re.search(r"\b(checkout|switch)\s+(main|master)\b", cmd)):
                return "ask", f"git {sub} no ramo principal (main). Confirma?"
            if sub == "reset" and "--hard" in resto:
                return "ask", "git reset --hard apaga mudanças não salvas. Confirma?"
            if sub == "clean" and any(a.startswith("-") and "f" in a for a in resto):
                return "ask", "git clean apaga arquivos não salvos no Git. Confirma?"
            if sub == "restore" and "." in resto:
                return "ask", "git restore . desfaz todas as mudanças. Confirma?"
            if sub == "checkout" and "--" in resto and "." in resto:
                return "ask", "git checkout -- . desfaz todas as mudanças. Confirma?"
            if sub == "branch" and ("-D" in resto or ("--delete" in resto and "--force" in resto)):
                return "ask", "Apagar um ramo à força. Confirma?"
            if sub == "stash" and resto[:1] and resto[0] in {"drop", "clear"}:
                return "ask", "Apagar mudanças guardadas (stash). Confirma?"

        # 4) publicação por outras vias
        if prog == "supabase" and ("deploy" in args or ("db" in args and "push" in args)):
            return "ask", "Publicar no Supabase muda o que está no ar para todos. Confirma?"
        if prog in {"vercel", "netlify", "firebase", "gh-pages"} or (prog == "npx" and args[:1] and args[0] in {"vercel", "netlify", "firebase", "gh-pages"}):
            return "ask", "Comando de publicação. Confirma?"

        # 5) instalar programa novo
        if prog in {"npm", "pnpm", "yarn"} and args:
            sub = args[0]
            pacotes = [a for a in args[1:] if not a.startswith("-")]
            if sub in {"add"} or (sub in {"install", "i", "in"} and pacotes):
                return "ask", f"Instalar pacote novo ({' '.join(pacotes) or '?'}). Confirma?"
        pip = None
        if prog in {"pip", "pip3"} and args[:1] == ["install"]:
            pip = args[1:]
        elif prog.startswith("python") and args[:3] == ["-m", "pip", "install"]:
            pip = args[3:]
        if pip is not None:
            pacotes = [a for a in pip if not a.startswith("-")]
            if not pacotes or not set(p.lower() for p in pacotes) <= LIBERADO_PIP:
                return "ask", f"Instalar pacote Python ({' '.join(pacotes) or '?'}). Confirma?"

    # 6) configurações do Claude e domínio mexidos pelo terminal
    if re.search(r"\.claude/settings(\.local)?\.json|(^|[\s/])CNAME\b", cmd) and \
       re.search(r"(>|sed\s+-i|\btee\b|\bmv\b|\bcp\b|\brm\b|perl\s+-pi)", cmd):
        return "ask", "Mudar as configurações do Claude ou o domínio do site. Confirma?"
    return None, None


def avaliar_arquivo(tool, caminho):
    if not caminho:
        return None, None
    if segredo(caminho):
        return "deny", f"Arquivo de segredo ({os.path.basename(caminho)}). Segredos ficam com o João, no painel do Supabase."
    if tool == "Read":
        return None, None
    b = os.path.basename(caminho)
    if re.search(r"(^|/)\.claude/settings(\.local)?\.json$", caminho):
        return "ask", "Mudar as permissões e proteções do Claude neste projeto. Confirma?"
    if b in {"CNAME", "_config.yml"} and os.path.dirname(os.path.abspath(caminho)) == os.environ.get("CLAUDE_PROJECT_DIR", os.path.dirname(os.path.abspath(caminho))):
        return "ask", "Mudar o domínio ou a configuração de publicação do site. Confirma?"
    return None, None


def decidir(dados):
    tool = dados.get("tool_name")
    ent = dados.get("tool_input") or {}
    if not isinstance(tool, str) or not isinstance(ent, dict):
        return None, None
    if tool == "Bash":
        cmd = ent.get("command")
        return avaliar_bash(cmd, dados.get("cwd")) if isinstance(cmd, str) else (None, None)
    if tool in {"Read", "Edit", "Write", "MultiEdit", "NotebookEdit"}:
        c = ent.get("file_path") or ent.get("notebook_path")
        return avaliar_arquivo(tool, c) if isinstance(c, str) else (None, None)
    return None, None


def main():
    try:
        dados = json.loads(sys.stdin.read() or "{}")
        if not isinstance(dados, dict):
            return
        decisao, motivo = decidir(dados)
    except Exception:
        return
    if decisao:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
                                                 "permissionDecision": decisao,
                                                 "permissionDecisionReason": "Guarda do Sallos: " + motivo}},
                         ensure_ascii=False))


if __name__ == "__main__":
    main()
