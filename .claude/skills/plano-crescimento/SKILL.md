---
name: plano-crescimento
description: Diagnóstico do funil do Sallos e experimentos priorizados (crescimento).
argument-hint: "[foco]"
---
# /plano-crescimento

**Pedido:** $ARGUMENTS

- **Quando usar:** Planejar ativação, retenção ou indicação.
- **Agente responsável:** crescimento
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. Acione o `crescimento` (ele usa o relatório de uso como evidência).
2. Mostre ao João os 3 experimentos mais promissores.

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Lista priorizada em `docs/crescimento/`.

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
