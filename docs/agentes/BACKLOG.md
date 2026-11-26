# Pendências priorizadas

Ordem: estabilidade (testes, segurança, dados) → publicação → operação comercial → evolução.
Lista completa da primeira rodada (com os itens sem ★): `docs/agentes/RODADA-2026-11-26.md`.

| # | Prioridade | Pendência | Quem | Situação |
|---|---|---|---|---|
| 1 | Alta | Testes automáticos dos cálculos de dinheiro | testador + especialista-financas | em parte: `ferramentas/testes/calculos.cjs` feito (27 verificações, imposto, pró-labore, Simples, presumido, metas, férias). Faltam parcelas, dólar, renda fixa e teste com o modo offline ligado (RODADA A16) |
| 2 | Alta | ★ Proteger as 4 funções públicas do Supabase com um segredo do agendador e limitar as datas aceitas (RODADA A4) | auditor | diagnóstico feito em 26/11; a fazer, depende do item 7 e do João no painel |
| 3 | Alta | ★ Completar a Política de privacidade e os Termos: e-mail de contato e responsável (nome e CPF ou empresa e CNPJ), lista completa de serviços usados, contagem de uso anônima (RODADA A14) | João + privacidade-lgpd | esperando o João (e-mail e responsável) |
| 4 | Média | Plano da assinatura mensal: preço, teste grátis, meio de pagamento, o que fica no plano pago (RODADA C2 a C9; números no relatório privado de negócio) | negocio + especialista-apps + privacidade-lgpd | diagnóstico feito em 26/11; esperando decisões do João |
| 5 | Média | Plano de lançamento do Instagram (rascunho em `docs/marketing/rodada-2026-11-26.md`) | diretor-marketing | rascunho pronto; esperando o João criar o perfil |
| 6 | Baixa | Levar o app às lojas (App Store e Google Play) | gestor-release | futuro (agentes sugerem cobrar pelo site primeiro) |
| 7 | Alta | ★ Conferir no painel do Supabase: `schema.sql` rodado inteiro (excluir conta, pasta `notas`, `resumo_uso`), Verify JWT e região do projeto (RODADA A1) | João | esperando o João |
| 8 | Alta | ★ Excluir conta avisar quando a parte final falhar e apagar todas as notas, não só as primeiras 1000 (RODADA A2) | frontend + testador | a fazer, com "pode fazer" |
| 9 | Alta | ★ Fechar `resumo_uso` e limitar `registrar_uso` para quem é de fora, sem quebrar o relatório em PDF (RODADA A3) | auditor + analista-dados | a fazer; o João escolhe como o relatório busca os números |
| 10 | Alta | ★ Tabela anual do IR com os números de 2026 (confirmar na Receita) (RODADA A5) | especialista-financas + testador | a fazer, com "pode fazer" |
| 11 | Alta | ★ Imposto padrão pelo jeito de receber, em vez de 27,5% para todos; conferir o "Separe R$ X" de quem recebe como sócio (RODADA A6) | especialista-financas + frontend + testador | esperando o João confirmar o regime padrão; imagens antes |
| 12 | Média | ★ Abrir o app com a cópia guardada e atualizar por trás, com aviso "Nova versão" (RODADA B1) | performance + gestor-release | a fazer, com "pode fazer" |
| 13 | Média | ★ Guardar fontes, gerador de PDF e biblioteca da nuvem no próprio app (RODADA B2) | tipografia + performance | a fazer, depois do item 12 |
| 14 | Média | ★ Medir volta (dia 1, 7 e 30), primeiros passos e modo usado, sempre anônimo, no PDF (RODADA C1) | analista-dados | a fazer, depois do item 9 e do ok do João para mudar a coleta |
