# Gera conheca/index.html a partir de ferramentas/paginas/conheca-molde.html e das listas abaixo.
# Uso, na raiz: python3 ferramentas/paginas/conheca.py ferramentas/paginas/conheca-molde.html conheca/index.html
# As fotos das telas (img/n-*.jpg) saem de: node ferramentas/paginas/capturar-telas.cjs
import html, sys
e = html.escape

# Recursos principais: (rótulo, título, frase, imagem, descrição da imagem)
RECURSOS = [
 ("Recebimentos", "Saiba o que cada hospital ainda te deve", "Cada plantão vira um valor a receber, com a data. Se atrasou, o botão Cobrar monta a mensagem para o financeiro no WhatsApp.", "img/n-recebimentos.jpg", "Recebimentos do mês separados por hospital (dados de exemplo)"),
 ("Contas", "Recebe, paga e vê quanto sobra", "O mês em três passos: o que entra, o que sai e quanto fica livre para guardar. Importe a fatura do cartão e o app separa cada compra.", "img/n-contas.jpg", "Tela Contas com o mês em três passos (dados de exemplo)"),
 ("Impostos", "Quanto separar, sem fazer conta", "O app calcula o imposto do mês, avisa o vencimento das guias e lembra das notas para emitir. No fim do ano, ajuda no imposto de renda.", "img/n-impostos.jpg", "Tela de impostos com o valor do mês e as guias (dados de exemplo)"),
]

# "E mais": (ícone, título, frase)
ICONES = {
 "cal": '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
 "sol": '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
 "balanca": '<path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0L5 8zM19 8l-2.5 6a3 3 0 0 0 5 0L19 8z"/>',
 "alvo": '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
 "grafico": '<path d="M4 19V5M4 19h16M8 15l3.5-4 3 2.5L20 8"/>',
 "nuvem": '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6 3.8 3.8 0 0 1-.6 7.4H7z"/>',
}
MAIS = [
 ("cal", "Calendário do mês", "Plantões, recebimentos e contas em cada dia."),
 ("sol", "Férias sem susto", "Veja quanto deixa de receber antes de sair."),
 ("balanca", "Vale a pena esse plantão?", "Quanto entra e quanto dá por hora."),
 ("alvo", "Metas em plantões", "Quantos plantões pagam a sua meta."),
 ("grafico", "Investimentos", "Carteira com cotação automática (no modo Completo)."),
 ("nuvem", "Celular e computador", "Os mesmos dados nos dois, com cópia na nuvem."),
]

FAQ = [
 ("Substitui o meu contador?", "Não. O Sallos organiza seus números e estima os impostos para você não ter surpresa. Ele também gera um relatório para mandar ao contador."),
 ("Preciso baixar na loja de aplicativos?", "Não. Abra sallos.com.br no navegador e coloque na tela inicial. Ele funciona como um aplicativo, inclusive sem internet."),
 ("Preciso entender de contabilidade?", "Não. Você lança o que recebe e o que paga, e o app mostra quanto separar para o imposto, em reais."),
 ("Meus dados ficam seguros?", "Ficam no seu aparelho e, se você quiser, numa conta só sua na nuvem. Ninguém mais vê. Dá para excluir tudo quando quiser."),
 ("O Sallos indica investimentos?", "Não. Ele organiza o que você já tem e mostra os números. As decisões são suas."),
]

def svg(nome):
    return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONES[nome]}</svg>'

rec = "\n".join(f'''      <div class="rec">
        <div class="rec-txt"><small>{e(k)}</small><h3>{e(h)}</h3><p>{e(p)}</p></div>
        <div class="rec-cel"><div class="cel"><img src="{img}" alt="{e(alt)}" loading="lazy" width="390" height="844" /></div></div>
      </div>''' for (k, h, p, img, alt) in RECURSOS)
mais = "\n".join(f'        <div>{svg(i)}<b>{e(t)}</b><span>{e(d)}</span></div>' for (i, t, d) in MAIS)
faq = "\n".join(f'        <details><summary>{e(q)}</summary><p>{e(r)}</p></details>' for (q, r) in FAQ)

tpl = open(sys.argv[1], encoding="utf-8").read()
tpl = tpl.replace("<!--RECURSOS-->", rec).replace("<!--MAIS-->", mais).replace("<!--FAQ-->", faq)
open(sys.argv[2], "w", encoding="utf-8").write(tpl)
print(len(RECURSOS), "recursos,", len(MAIS), "extras,", len(FAQ), "perguntas")
