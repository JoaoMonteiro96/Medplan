#!/usr/bin/env python3
"""Relatório de uso do Sallos em PDF (só totais, sem dados de ninguém).

Uso:
  python3 ferramentas/relatorio/relatorio.py            # busca os números no Supabase (função resumo_uso)
  python3 ferramentas/relatorio/relatorio.py --exemplo  # usa números inventados, para ver o visual
  --dias 3   período do relatório (padrão: 3 dias = 72 horas)
  --saida arquivo.pdf

Usa só a chave pública do app (a mesma do app.jsx). Nenhuma chave secreta.
"""
import argparse, datetime as dt, json, os, random, re, ssl, sys, urllib.request

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))

TELAS = {
    "inicio": "Hoje", "calendario": "Agenda", "faturamento": "Recebimentos", "despesas": "Contas",
    "organizacao": "Organizar (antiga)", "investimentos": "Investimentos", "metas": "Metas", "visao": "Relatórios (antiga)",
    "contabilidade": "Contabilidade", "importar": "Importar", "backup": "Configurações",
    "ferias": "Férias", "vale": "Vale a pena?", "metaplantoes": "Metas em plantões",
}
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]

VERDE, VERDE2 = HexColor("#0B3D2E"), HexColor("#0E5640")
VERDE_CLARO, VERDE_FUNDO = HexColor("#B9D8CB"), HexColor("#EEF5F1")
TINTA, CINZA, LINHA = HexColor("#14201B"), HexColor("#5F6B66"), HexColor("#E3E8E5")
BRANCO, BRANCO_70 = HexColor("#FFFFFF"), HexColor("#C9DDD4")
SOBE, DESCE = HexColor("#0E7A4F"), HexColor("#B4442E")


def fontes():
    f = os.path.join(AQUI, "fontes")
    for nome, arq in [("Titulo", "Manrope_800ExtraBold.ttf"), ("Numero", "Manrope_700Bold.ttf"),
                      ("Texto", "Inter_400Regular.ttf"), ("Forte", "Inter_600SemiBold.ttf")]:
        pdfmetrics.registerFont(TTFont(nome, os.path.join(f, arq)))


def nuvem():
    src = open(os.path.join(RAIZ, "app.jsx"), encoding="utf-8").read()
    m = re.search(r'CLOUD_DEFAULT = \{ url: "([^"]+)", key: "([^"]+)"', src)
    if not m or not m.group(2).startswith("sb_publishable_"):
        sys.exit("Não achei a chave pública no app.jsx")
    return m.group(1), m.group(2)


def buscar(dias):
    url, chave = nuvem()
    cab = {"apikey": chave, "Authorization": "Bearer " + chave, "Content-Type": "application/json"}
    # a senha do relatório (x-relatorio-key) normalmente é posta pelo próprio ambiente do Claude; aqui só se vier por variável
    if os.environ.get("RELATORIO_KEY"):
        cab["x-relatorio-key"] = os.environ["RELATORIO_KEY"]
    req = urllib.request.Request(url + "/rest/v1/rpc/resumo_uso", data=json.dumps({"dias": dias}).encode(), headers=cab)
    ca = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
    ctx = ssl.create_default_context(cafile=ca) if ca and os.path.exists(ca) else ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
        return json.load(r)


def exemplo(dias):
    rnd = random.Random(7)
    hoje = dt.date.today()
    por_dia = []
    for i in range(13, -1, -1):
        d = hoje - dt.timedelta(days=i)
        a = rnd.randint(9, 16) + (14 - i) // 3 - (3 if d.weekday() >= 5 else 0)
        por_dia.append({"dia": d.isoformat(), "aparelhos": a, "aberturas": a * rnd.randint(5, 9)})
    base = [("inicio", 21, 160), ("calendario", 18, 96), ("faturamento", 15, 71), ("despesas", 12, 54),
            ("organizacao", 6, 19), ("metas", 4, 9), ("backup", 3, 4), ("investimentos", 2, 7)]
    tela = [{"tela": t, "aparelhos": a, "aberturas": v} for t, a, v in base]
    tela30 = [{"tela": t, "aparelhos": a * 2 + 3, "aberturas": v * 9} for t, a, v in base] + [{"tela": "visao", "aparelhos": 3, "aberturas": 5}]
    return {"de": (hoje - dt.timedelta(days=dias - 1)).isoformat(), "ate": hoje.isoformat(), "dias": dias,
            "aparelhos": 23, "aparelhos_antes": 19, "aberturas": 420, "aberturas_antes": 446, "novos": 4,
            "aparelhos_30": 41, "aparelhos_total": 58, "por_dia": por_dia, "por_tela": tela, "por_tela_30": tela30,
            "volta": {"d1_base": 31, "d1": 17, "d7_base": 24, "d7": 11, "d30_base": 12, "d30": 5},
            "passos": {"novos": 14, "guia": 11, "plantao": 9, "conta": 6, "recebi": 4},
            "modos": {"simples": 15, "completo": 8}}


def data_br(s):
    d = dt.date.fromisoformat(s)
    return d.day, MESES[d.month - 1], d.year


def periodo(r):
    d1, m1, a1 = data_br(r["de"]); d2, m2, a2 = data_br(r["ate"])
    if r["de"] == r["ate"]:
        return f"{d2} de {m2} de {a2}"
    if m1 == m2 and a1 == a2:
        return f"{d1} a {d2} de {m2} de {a2}"
    return f"{d1} de {m1} a {d2} de {m2} de {a2}" if a1 == a2 else f"{d1} de {m1} de {a1} a {d2} de {m2} de {a2}"


def num(n):
    return f"{int(n):,}".replace(",", ".")


def variacao(agora, antes):
    if not antes:
        return ("primeiro período medido", CINZA) if agora else ("igual", CINZA)
    p = round((agora - antes) * 100 / antes)
    if p == 0:
        return "igual ao período anterior", CINZA
    return (f"{'+' if p > 0 else '−'}{abs(p)}% que o período anterior", SOBE if p > 0 else DESCE)


def montar(r, saida):
    fontes()
    W, H = A4
    M = 40
    c = canvas.Canvas(saida, pagesize=A4)
    c.setTitle("Sallos: relatório de uso")
    c.setAuthor("Sallos")
    c.setFillColor(BRANCO); c.rect(0, 0, W, H, fill=1, stroke=0)

    # ---- faixa verde do topo ----
    topo = 196
    c.setFillColor(VERDE); c.rect(0, H - topo, W, topo, fill=1, stroke=0)
    c.setFillColor(BRANCO_70); c.setFont("Forte", 9.5)
    c.drawString(M, H - 42, "SALLOS  ·  RELATÓRIO DE USO")
    c.setFillColor(BRANCO); c.setFont("Titulo", 24)
    rotulo = "Últimas 72 horas" if r["dias"] == 3 else f"Últimos {r['dias']} dias"
    c.drawString(M, H - 74, rotulo)
    c.setFillColor(BRANCO_70); c.setFont("Texto", 11)
    c.drawString(M, H - 93, periodo(r))

    # número principal
    c.setFillColor(BRANCO); c.setFont("Numero", 46)
    c.drawString(M, H - 156, num(r["aparelhos"]))
    w = pdfmetrics.stringWidth(num(r["aparelhos"]), "Numero", 46)
    c.setFont("Forte", 12); c.drawString(M + w + 10, H - 140, "pessoas usaram o app")
    txt, _ = variacao(r["aparelhos"], r["aparelhos_antes"])
    c.setFillColor(BRANCO_70); c.setFont("Texto", 10)
    c.drawString(M + w + 10, H - 156, txt if not r["aparelhos_antes"] else f"{txt} (antes: {num(r['aparelhos_antes'])})")

    # ---- três cartões ----
    y = H - topo - 22
    cw, ch, gap = (W - 2 * M - 2 * 12) / 3, 78, 12
    cartoes = [
        ("Telas abertas", num(r["aberturas"]), variacao(r["aberturas"], r["aberturas_antes"])),
        ("Pessoas novas", num(r["novos"]), ("abriram o app pela 1ª vez", CINZA)),
        ("Nos últimos 30 dias", num(r["aparelhos_30"]), (f"{num(r['aparelhos_total'])} desde o começo", CINZA)),
    ]
    for i, (tit, val, (sub, cor)) in enumerate(cartoes):
        x = M + i * (cw + gap)
        c.setFillColor(VERDE_FUNDO); c.roundRect(x, y - ch, cw, ch, 10, fill=1, stroke=0)
        c.setFillColor(CINZA); c.setFont("Forte", 9); c.drawString(x + 14, y - 22, tit)
        c.setFillColor(TINTA); c.setFont("Numero", 22); c.drawString(x + 14, y - 49, val)
        c.setFillColor(cor); c.setFont("Texto", 8.5); c.drawString(x + 14, y - 66, sub)
    y -= ch + 34

    # ---- gráfico: pessoas por dia (14 dias) ----
    c.setFillColor(TINTA); c.setFont("Titulo", 13); c.drawString(M, y, "Pessoas por dia")
    c.setFillColor(CINZA); c.setFont("Texto", 9); c.drawRightString(W - M, y, "últimos 14 dias  ·  em verde escuro, o período do relatório")
    y -= 16
    gh = 120
    hoje = dt.date.fromisoformat(r["ate"])
    dias14 = [hoje - dt.timedelta(days=i) for i in range(13, -1, -1)]
    mapa = {p["dia"]: p for p in r["por_dia"]}
    vals = [int(mapa.get(d.isoformat(), {}).get("aparelhos", 0)) for d in dias14]
    mx = max(vals + [1])
    topo_eixo = max(5, ((mx + 4) // 5) * 5)
    base_y = y - gh
    c.setStrokeColor(LINHA); c.setLineWidth(0.6)
    for k in range(0, 3):
        yy = base_y + gh * k / 2
        c.line(M + 22, yy, W - M, yy)
        c.setFillColor(CINZA); c.setFont("Texto", 7.5); c.drawRightString(M + 16, yy - 2.5, num(topo_eixo * k / 2))
    bw_total = (W - 2 * M - 22) / 14
    de = dt.date.fromisoformat(r["de"])
    for i, (d, v) in enumerate(zip(dias14, vals)):
        x = M + 22 + i * bw_total + bw_total * 0.18
        bw = bw_total * 0.64
        h = gh * v / topo_eixo
        c.setFillColor(VERDE2 if d >= de else VERDE_CLARO)
        if h > 0:
            c.roundRect(x, base_y, bw, h, 3, fill=1, stroke=0)
        c.setFillColor(TINTA); c.setFont("Numero", 8); c.drawCentredString(x + bw / 2, base_y + h + 4, str(v))
        c.setFillColor(CINZA); c.setFont("Texto", 7.5)
        c.drawCentredString(x + bw / 2, base_y - 11, str(d.day))
        c.drawCentredString(x + bw / 2, base_y - 20, SEMANA[d.weekday()])
    y = base_y - 50

    # ---- telas ----
    def tabela(y, titulo, linhas, sub):
        c.setFillColor(TINTA); c.setFont("Titulo", 13); c.drawString(M, y, titulo)
        c.setFillColor(CINZA); c.setFont("Texto", 9); c.drawRightString(W - M, y, sub)
        y -= 20
        cx_pes, cx_abr, bar_x = W - M - 150, W - M, M + 120
        c.setFont("Forte", 8); c.setFillColor(CINZA)
        c.drawString(M, y, "TELA"); c.drawRightString(cx_pes, y, "PESSOAS"); c.drawRightString(cx_abr, y, "ABERTURAS")
        y -= 8
        mxp = max([l["aparelhos"] for l in linhas] + [1])
        passo = max(17, min(25, (y - 58) / max(1, len(linhas))))  # cabe tudo antes do rodapé
        for l in linhas:
            c.setStrokeColor(LINHA); c.line(M, y, W - M, y)
            y -= passo - 8
            c.setFillColor(TINTA); c.setFont("Forte", 10); c.drawString(M, y, TELAS.get(l["tela"], l["tela"]))
            bmax = cx_pes - 50 - bar_x
            c.setFillColor(VERDE_FUNDO); c.roundRect(bar_x, y - 1, bmax, 8, 4, fill=1, stroke=0)
            c.setFillColor(VERDE2); c.roundRect(bar_x, y - 1, max(8, bmax * l["aparelhos"] / mxp), 8, 4, fill=1, stroke=0)
            c.setFillColor(TINTA); c.setFont("Numero", 10)
            c.drawRightString(cx_pes, y, num(l["aparelhos"])); c.drawRightString(cx_abr, y, num(l["aberturas"]))
            y -= 8
        return y

    linhas = r["por_tela"][:11]
    if linhas:
        y = tabela(y, "Telas mais abertas", linhas, "no período do relatório")
    else:
        c.setFillColor(CINZA); c.setFont("Texto", 10); c.drawString(M, y, "Ninguém abriu o app no período.")
        y -= 20

    usadas = {l["tela"] for l in r["por_tela"]}
    paradas = [n for k, n in TELAS.items() if k not in usadas and "antiga" not in n]
    if paradas and y > 70:
        y -= 18
        c.setFillColor(TINTA); c.setFont("Forte", 10); c.drawString(M, y, "Telas que ninguém abriu no período")
        y -= 15
        c.setFillColor(CINZA); c.setFont("Texto", 10); c.drawString(M, y, ", ".join(paradas))

    agora = dt.datetime.now(dt.timezone(dt.timedelta(hours=-3)))
    def rodape():
        c.setFillColor(CINZA); c.setFont("Texto", 7.5)
        c.drawString(M, 26, f"Gerado em {agora.day} de {MESES[agora.month - 1]} de {agora.year}, {agora:%H:%M} (Brasília)")
        c.drawRightString(W - M, 26, "Contagem anônima: um código aleatório por aparelho")
    rodape()
    if r.get("volta") or r.get("passos"):
        c.showPage()
        pagina_volta(c, r, W, H, M)
        rodape()
    c.showPage(); c.save()


def pct(a, b):
    return f"{round(a * 100 / b)}%" if b else "—"


def pagina_volta(c, r, W, H, M):
    """2ª página: quem volta, primeiros passos e modo usado."""
    c.setFillColor(BRANCO); c.rect(0, 0, W, H, fill=1, stroke=0)
    y = H - 56
    c.setFillColor(TINTA); c.setFont("Titulo", 20); c.drawString(M, y, "Quem volta e como começa")
    y -= 18
    c.setFillColor(CINZA); c.setFont("Texto", 10)
    c.drawString(M, y, "Números mínimos: quem desligou a contagem em Ajustes não aparece. Celular e computador contam como 2.")
    y -= 30

    # ---- três cartões de volta ----
    v = r.get("volta") or {}
    cw, ch, gap = (W - 2 * M - 2 * 12) / 3, 92, 12
    cards = [("Voltou no dia seguinte", v.get("d1", 0), v.get("d1_base", 0)),
             ("Voltou na 2ª semana", v.get("d7", 0), v.get("d7_base", 0)),
             ("Voltou depois de 1 mês", v.get("d30", 0), v.get("d30_base", 0))]
    for i, (tit, a, b) in enumerate(cards):
        x = M + i * (cw + gap)
        c.setFillColor(VERDE_FUNDO); c.roundRect(x, y - ch, cw, ch, 10, fill=1, stroke=0)
        c.setFillColor(CINZA); c.setFont("Forte", 9); c.drawString(x + 14, y - 22, tit)
        c.setFillColor(TINTA); c.setFont("Numero", 26); c.drawString(x + 14, y - 54, pct(a, b))
        c.setFillColor(CINZA); c.setFont("Texto", 8.5)
        c.drawString(x + 14, y - 74, f"{num(a)} de {num(b)} que começaram" if b else "ainda sem gente suficiente")
    y -= ch + 40

    # ---- primeiros passos ----
    p = r.get("passos") or {}
    novos = p.get("novos", 0)
    c.setFillColor(TINTA); c.setFont("Titulo", 13); c.drawString(M, y, "Primeiros passos")
    c.setFillColor(CINZA); c.setFont("Texto", 9); c.drawRightString(W - M, y, "de quem começou nos últimos 30 dias")
    y -= 22
    etapas = [("Começaram a usar", novos), ("Terminaram o guia de abertura", p.get("guia", 0)),
              ("Lançaram o 1º plantão", p.get("plantao", 0)), ("Colocaram a 1ª conta", p.get("conta", 0)),
              ("Marcaram o 1º \"Caiu na conta\"", p.get("recebi", 0))]
    bar_x, bar_w = M + 190, W - 2 * M - 190 - 90
    for nome, val in etapas:
        c.setFillColor(TINTA); c.setFont("Forte", 10); c.drawString(M, y, nome)
        c.setFillColor(VERDE_FUNDO); c.roundRect(bar_x, y - 1, bar_w, 9, 4, fill=1, stroke=0)
        if novos and val:
            c.setFillColor(VERDE2); c.roundRect(bar_x, y - 1, max(9, bar_w * min(1, val / novos)), 9, 4, fill=1, stroke=0)
        c.setFillColor(TINTA); c.setFont("Numero", 10)
        c.drawRightString(W - M - 40, y, num(val)); c.setFillColor(CINZA); c.setFont("Texto", 9); c.drawRightString(W - M, y, pct(val, novos))
        y -= 24
    y -= 20

    # ---- modo ----
    m = r.get("modos") or {}
    s_, co = m.get("simples", 0), m.get("completo", 0)
    c.setFillColor(TINTA); c.setFont("Titulo", 13); c.drawString(M, y, "Modo usado")
    c.setFillColor(CINZA); c.setFont("Texto", 9); c.drawRightString(W - M, y, "no período do relatório")
    y -= 26
    tot = s_ + co
    largura = W - 2 * M
    if tot:
        ws = largura * s_ / tot
        c.setFillColor(VERDE2); c.roundRect(M, y - 4, max(ws, 1), 16, 6, fill=1, stroke=0)
        c.setFillColor(VERDE_CLARO); c.roundRect(M + ws, y - 4, max(largura - ws, 1), 16, 6, fill=1, stroke=0)
        y -= 22
        c.setFillColor(TINTA); c.setFont("Forte", 10)
        c.drawString(M, y, f"Simples: {num(s_)} ({pct(s_, tot)})"); c.drawRightString(W - M, y, f"Completo: {num(co)} ({pct(co, tot)})")
    else:
        c.setFillColor(CINZA); c.setFont("Texto", 10); c.drawString(M, y, "Ainda sem dados do modo (começa a contar com a versão nova do app).")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--exemplo", action="store_true")
    ap.add_argument("--dias", type=int, default=3)
    ap.add_argument("--saida")
    ap.add_argument("--dados", help="arquivo JSON com a resposta de resumo_uso (quando não dá para buscar direto)")
    a = ap.parse_args()
    r = exemplo(a.dias) if a.exemplo else json.load(open(a.dados, encoding="utf-8")) if a.dados else buscar(a.dias)
    saida = a.saida or os.path.join(RAIZ, "ferramentas", "saida", f"relatorio-uso-{r['ate']}{'-exemplo' if a.exemplo else ''}.pdf")
    os.makedirs(os.path.dirname(os.path.abspath(saida)), exist_ok=True)
    montar(r, saida)
    print(saida)


if __name__ == "__main__":
    main()
