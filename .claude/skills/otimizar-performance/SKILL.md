---
name: otimizar-performance
description: Mede o desempenho do Sallos e propõe otimizações (performance).
argument-hint: "[tela ou sintoma]"
disable-model-invocation: true
---
# /otimizar-performance

**Pedido:** $ARGUMENTS

- **Quando usar:** App lento, pesado ou travando no celular.
- **Agente responsável:** performance
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. Acione o `performance` para medir (com números) e propor.
2. Mostre ao João as 3 melhores propostas com ganho esperado.
3. Aplicar exige aprovação e passa pelo `testador`.

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Medição antes e depois registrada em `docs/performance/`.

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
