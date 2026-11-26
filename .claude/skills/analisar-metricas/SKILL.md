---
name: analisar-metricas
description: Plano de métricas do Sallos com privacidade (analista-dados).
argument-hint: "[pergunta]"
---
# /analisar-metricas

**Pedido:** $ARGUMENTS

- **Quando usar:** Querer saber algo sobre o uso do app.
- **Agente responsável:** analista-dados
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. Acione o `analista-dados`.
2. Se precisar de números reais, rode `python3 ferramentas/relatorio/relatorio.py` (só totais).

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Definições e limitações em `docs/dados/`.

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
