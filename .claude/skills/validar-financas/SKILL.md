---
name: validar-financas
description: Confere cálculos, tabelas de imposto, textos e alertas financeiros do Sallos (especialista-financas).
argument-hint: "[cálculo ou tela]"
disable-model-invocation: true
---
# /validar-financas

**Pedido:** $ARGUMENTS

- **Quando usar:** Virada de ano (tabelas novas), cálculo novo, texto educativo novo ou dúvida sobre um número.
- **Agente responsável:** especialista-financas
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. Acione o `especialista-financas`.
2. Para cada erro achado, peça ao `testador` um teste com o exemplo numérico.
3. Correção no app só com aprovação do João.

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Cada fórmula conferida com fonte oficial e data.

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
