# Situação do projeto

Atualizado em 26/11/2026. Quem mantém: orquestrador (ou a conversa principal), ao fim de cada trabalho.

## No ar

- Site e app em sallos.com.br (GitHub Pages, push no `main`). Página de apresentação em `/conheca`, Política em `/privacidade`, Termos em `/termos`.
- Modos Simples e Completo, guia de abertura, tela Hoje nova no celular, Contas em 3 passos, Impostos, Investimentos (com cotações, cripto, análise de ações e FIIs, comparação com CDI, IPCA e Ibovespa), Férias, Cobrar pelo WhatsApp, excluir conta.
- Supabase "mediplan-sp": dados de cada pessoa, central de cotações, renda fixa, histórico de preços, proventos, contagem anônima de uso.
- Relatório de uso em PDF a cada 3 dias (tarefa agendada "Relatório de uso do Sallos").

## Testes que existem

- `ferramentas/testes/larguras.cjs`: larguras, temas, modos e guia.
- `ferramentas/testes/nuvem.cjs`: sincronização com um Supabase de mentira.
- `ferramentas/testes/telas.cjs`: fotos das telas.
- `ferramentas/testes/calculos.cjs` (novo, 26/11/2026): 27 verificações dos cálculos de dinheiro (imposto da empresa, pró-labore, Simples, presumido, metas em plantões, "Vale a pena", férias). Só lê o `app.jsx`. Na rodada de 26/11, `larguras.cjs`, `nuvem.cjs` e `calculos.cjs` terminaram com "Tudo certo" (rodados pelo testador); `telas.cjs completo` gerou as fotos (rodado pela tipografia).
- **Não existem ainda:** testes de parcelas do cartão, dólar na tela e renda fixa, e teste com o modo offline (service worker) ligado.

## Equipe

- 17 agentes e 18 comandos criados em 26/11/2026.
- Primeira rodada geral de diagnóstico feita em 26/11/2026 (16 relatórios). Lista consolidada e os 10 primeiros itens em `docs/agentes/RODADA-2026-11-26.md`. O relatório de negócio está em `privado/` (fora do Git).

## Ainda não existe

- Cobrança (assinatura mensal planejada).
- Canal de contato e ajuda (as páginas de Privacidade e Termos ainda dizem "será publicado em breve").
- Instagram do Sallos (o João vai criar).
- App nas lojas (App Store, Google Play).
