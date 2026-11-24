# Gera conheca/index.html a partir de ferramentas/paginas/conheca-molde.html e da lista CAPS (os recursos).
# Uso, na raiz: python3 ferramentas/paginas/conheca.py ferramentas/paginas/conheca-molde.html conheca/index.html
import json, html
CAPS = [
 ("O seu dia", [
  ("hoje","Seu dia em uma tela","Ao abrir, o app mostra o que pede atenção hoje: o plantão do dia e o de amanhã, o dinheiro que deve cair e as contas que vencem.",["Um toque em \"Recebi\" ou \"Paguei\"","Quais contas dá para pagar com o que já caiu","No começo do mês, um resumo de como foi o anterior"],"img/cel-hoje.jpg","Tela Hoje com o plantão do dia, o que cai e as contas que vencem"),
  ("modos","Do seu jeito: Simples ou Completo","Na primeira vez, um guia rápido mostra o app todo. No fim, você escolhe como quer usar. Dá para trocar quando quiser, sem perder nada.",["Simples: plantões, recebimentos, contas e quanto separar para o imposto","Completo: tudo isso, mais investimentos, guias, notas e imposto de renda","Os mesmos dados nos dois modos"],"img/cel-modos.jpg","Escolha entre o modo Simples e o modo Completo"),
  ("plantoes","Seus plantões e quanto falta cair","Lance o plantão em segundos. Se for fixo, escolha os dias uma vez e o app lança os próximos sozinho.",["Faturamento separado por hospital","O que já devia ter caído aparece no topo, com o botão Cobrar","Bruto, imposto e líquido de cada plantão"],"img/cel-faturamento.jpg","Recebimentos do mês com o botão Recebi"),
  ("cobrar","Atrasou? Cobre pelo WhatsApp","Quando um pagamento passa da data, aparece o botão Cobrar. O app junta os plantões atrasados daquele hospital e monta a mensagem com as datas e o total.",["Salve o WhatsApp do financeiro uma vez","A mensagem vai pronta e dá para editar antes","Quem envia é você, pelo seu WhatsApp"],"img/cel-cobrar.jpg","Mensagem de cobrança pronta para o financeiro do hospital"),
  ("calendario","O mês inteiro no calendário","Cada dia mostra os plantões, os recebimentos e as contas. Toque num dia para ver tudo e marcar o que já aconteceu.",["Horas e dias trabalhados no mês","Barra verde quando entrou mais, vermelha quando saiu mais","Dias de férias em azul e seus eventos em roxo"],"img/cel-calendario.jpg","Calendário do mês com os plantões marcados"),
  ("ferias","Férias sem susto","No calendário, toque em Férias e escolha o período. Antes de sair, você já sabe o que muda no seu mês.",["Quais plantões você precisa passar","Quanto deixa de receber","Se as contas do mês continuam pagas"],"img/cel-ferias.jpg","Resumo das férias com os plantões para passar e como ficam as contas"),
 ]),
 ("Decidir melhor", [
  ("vale","Vale a pena esse plantão?","Ofereceram um plantão? Digite o valor e as horas. O app mostra quanto entra na sua conta, quanto dá por hora e se está acima da sua média.",["Imposto já descontado","Comparação com o lugar que paga melhor","Quantos plantões como esse pagam a sua meta"],"img/cel-vale.jpg","Conta de um plantão oferecido: quanto entra e quanto dá por hora"),
  ("metas","Metas contadas em plantões","Reserva, carro, viagem. Diga quanto quer juntar e o app mostra quantos plantões em cada hospital pagam a meta, e quantos por mês até o prazo.",["Projeção de quando você chega lá","O que você guarda e o que rende","Teto de gastos com aviso"],"img/cel-metas.jpg","Meta com a projeção e a conta em plantões por hospital"),
 ]),
 ("Contas e impostos", [
  ("contas","Recebe, paga e sobra","A tela Contas mostra o mês em 3 passos: o que você recebe, o que paga e quanto sobra para investir. Importe a fatura do cartão e o app separa cada compra por categoria.",["O que pagar agora com o que já caiu","Gastos de saúde e escola separados para o imposto de renda","Nota fiscal guardada junto com o gasto"],"img/cel-despesas.jpg","O mês em 3 passos: você recebe, paga as contas e vê quanto sobra para investir"),
  ("impostos","Impostos sem susto","O app calcula as guias, avisa o vencimento e mostra quanto separar de cada recebimento. Também lembra das notas para emitir e estima o seu imposto de renda.",["Simples Nacional e carnê-leão","Caixinha do imposto","Estimativa da restituição"],"img/cel-impostos.jpg","Tela de impostos com guias e estimativa do imposto de renda"),
 ]),
 ("Patrimônio", [
  ("investimentos","Investimentos com cotação automática","Ações, fundos imobiliários, Tesouro Direto, CDB, exterior e bitcoin. Os preços se atualizam sozinhos e você vê a evolução do patrimônio como numa corretora.",["Tesouro pelo preço do dia e CDB pelo CDI","Quanto a carteira ganhou no total e hoje","Importa nota de corretagem, print ou planilha"],"img/cel-investimentos.jpg","Gráfico de patrimônio investido"),
  ("analise","Análise de cada ação e fundo","Toque no ativo e veja o preço do último ano e os proventos, com dados da própria B3.",["Gráfico de 1, 6 e 12 meses, com a mínima e a máxima do ano","Último provento, com data com e dia do pagamento","Quanto você recebe com as suas cotas"],"img/cel-analise.jpg","Análise de um fundo imobiliário com preço, faixa do ano e gráfico de 12 meses"),
 ]),
]
e = html.escape
caps_html = []; telas_html = []; n = 0
for grupo, itens in CAPS:
    caps_html.append(f'        <h3 class="grupo">{e(grupo)}</h3>')
    for (k, h, p, li, img, alt) in itens:
        lis = "".join(f"<li>{e(x)}</li>" for x in li)
        on = ' on' if n == 0 else ''
        oncls = ' class="on"' if n == 0 else ''
        lz = 'eager' if n < 2 else 'lazy'
        caps_html.append(f'''        <article class="cap{on}" data-tela="{k}">
          <div class="cap-cel"><div class="cel"><img src="{img}" alt="{e(alt)}" loading="lazy" width="390" height="844" /></div></div>
          <div class="cap-txt"><h4>{e(h)}</h4><p>{e(p)}</p><ul>{lis}</ul></div>
        </article>''')
        telas_html.append(f'          <img src="{img}" alt="" data-tela="{k}"{oncls} loading="{lz}" width="390" height="844" />')
        n += 1
import sys
tpl = open(sys.argv[1]).read()
tpl = tpl.replace("<!--CAPS-->", "\n".join(caps_html)).replace("<!--TELAS-->", "\n".join(telas_html)).replace("<!--NCAPS-->", str(n))
open(sys.argv[2], "w").write(tpl)
print(n, "capítulos")
