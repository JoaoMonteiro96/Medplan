# Preço médio das ações do Exterior "mudando sozinho"

Data: 28/11/2026. Só leitura do `app.jsx`; nada foi rodado nem alterado (**não verificado na tela**, conclusões vêm do código).

## Resumo para o João
- O preço médio **em dólar** (US$) não depende do câmbio no código atual. Se a tela mostrar o PM em US$, ele só muda quando você lança compra, venda ou ajuste.
- O que muda todo dia sozinho é tudo o que aparece **em reais**: o custo ("aplicado"/"Investido"), o total da carteira, o ganho em R$. O app pega o que você pagou em dólar e converte pelo dólar **de hoje**, não pelo dólar do dia da compra. Se alguém dividir o custo em R$ pela quantidade, vê um "preço médio em R$" que anda com o dólar.
- Além disso, há dois pontos que bagunçam as contas de Exterior (abaixo).

## Causa provável (fato, com linhas)
1. `app.jsx:442-443`: para Exterior, `fx = dolarHoje(cotacoes)` e `cost: g.cost * fx`, `value: value * fx`, `profit: (value - g.cost) * fx`. O custo em dólar fica em `costUsd` (`:443`), mas o custo em R$ usa sempre o dólar atual. `dolarHoje` (`:404`) usa o dólar digitado, ou o automático (AwesomeAPI, atualizado uma vez por dia, `:3573-3582`), ou 5,30 se nada existir.
2. Onde o PM aparece (todos em US$ para Exterior): tabela `:11636` (`p.avgUsd`), subtítulo `:11634`, cartão antigo `:11645`, cartão aberto `:11658` (`p.avg`, que para Exterior já é em US$ porque `...base` não é sobrescrito, `:439`/`:443`), tela de lançar `:11339-11340` e Importar `:12426-12427`. Ajuste de PM usa `costUsd` (`:3204`, `:12426`), correto.
3. Onde aparece em R$ e anda com o dólar: `fmtBRL(p.cost)` em "Investido" (`:11663`), `totalCost`/`totalValue` (`:445-446`), ganho em R$, gráfico de patrimônio (`__hist.v`, `:3609-3610`, grava o valor já convertido de cada dia).

## Exemplo numérico
Você comprou 3,14316 ações por US$ 1.000,00 no total. PM = 1.000 / 3,14316 = **US$ 318,16** (fixo).
- Dólar a R$ 5,00: custo mostrado R$ 5.000,00 (R$ 1.590,80 por ação).
- Dólar a R$ 5,40: custo mostrado R$ 5.400,00 (R$ 1.718,07 por ação).
Sem você fazer nada, o "custo" subiu R$ 400. Se a ação não mudou de preço, o ganho em R$ também sobe/desce só pelo câmbio (a % de ganho não muda, pois os dois lados são multiplicados pelo mesmo dólar).

## Outros achados
- **Médio:** `totalBought` e `totalSold` (`:447-448`) somam os valores em US$ crus (`g.bought`, `g.sold`) sem converter, enquanto `totalValue` é em R$. Quem tem Exterior vê "aportes" e ganho do gráfico/comparação com índices distorcidos (US$ 1.000 contam como R$ 1.000). Idem `totalInvestedAllTime` e `posicaoInicialTotal` (`:3569-3571`) somam `amount` cru.
- **Médio:** `computePortfolio` decide "é dólar" só pela categoria Exterior (`:440`), não pelo campo `moeda` do lançamento (`:3199`, `:11294`). Lançamentos de Exterior feitos antes de 20/11/2026 (quando o dólar entrou, commit 6487cc4) e digitados em R$ seriam somados como se fossem dólar: o PM ficaria inflado. Não foi possível ver dados reais; **hipótese**, conferir se alguém tem Exterior antigo.
- **Baixo:** o Importar de nota (Apex) grava como valor o líquido (com taxas) e não preço x quantidade (`:12054`). O PM fica um pouco acima do preço de tela e do PM da corretora; não muda sozinho, mas pode parecer diferente.
- **Baixo:** no cartão aberto o PM é mostrado arredondado a centavos (`:11658`). Com frações (3,14316) o PM real tem mais casas; salvar sem querer o valor arredondado cria um ajuste minúsculo (`:3204`, `Math.round(...*100)/100`).
- Cotação automática: Exterior é `kind: "free"` (`:198`), então não entra na central de cotações (`tickersBolsa`, `:3227`). `__USDauto` só afeta a conversão para R$, nunca o custo em US$. Sem sobrescrita do custo. A cotação do papel é digitada à mão (em US$).
- Venda (`:424-428`) e ajuste (`:415-416`) trabalham em US$ para Exterior e estão coerentes; o ajuste de hoje usa `costUsd` (`:3204`).

## Correção recomendada
1. Mostrar o PM só em US$ (já é assim) e rotular o custo em R$ como "equivale hoje a R$ X" ou, melhor, guardar em cada lançamento Exterior o dólar do dia (`fx`) e calcular o custo em R$ como soma de (valor em US$ x dólar da data). O valor atual segue pelo dólar de hoje; o custo fica fixo. Assim o ganho em R$ inclui a variação do dólar de forma honesta.
2. Converter `totalBought`/`totalSold`/aportes de Exterior pelo dólar da data (ou de hoje, no mínimo) em `computePortfolio` e nas somas de `:3569-3571`.
3. Tratar lançamentos de Exterior sem `moeda: "USD"` (antigos): perguntar uma vez ou marcar como R$ e converter.
4. Mostrar o PM com 4 casas quando a quantidade for fracionada, ou não arredondar no campo de edição.
Não mexer em chaves `mediplan-*`.

Não verificado: comportamento na tela, dados reais, testes automáticos (`calculos.cjs` não foi rodado).
