---
name: preparar-publicacao
description: Prepara a publicação do site ou, no futuro, nas lojas, sem publicar (gestor-release).
argument-hint: "[site | lojas]"
disable-model-invocation: true
---
# /preparar-publicacao

**Pedido:** $ARGUMENTS

- **Quando usar:** Planejar a entrada na App Store ou no Google Play, ou revisar o processo do site.
- **Agente responsável:** gestor-release
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. Acione o `gestor-release`.
2. Entregue o checklist e o que falta ao João.

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Checklist em `docs/publicacao/`.

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
