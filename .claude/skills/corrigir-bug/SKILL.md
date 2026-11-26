---
name: corrigir-bug
description: Reproduz o bug, acha a causa, faz a correção mínima, testa e relata.
argument-hint: "<o que está errado>"
disable-model-invocation: true
---
# /corrigir-bug

**Pedido:** $ARGUMENTS

- **Quando usar:** Algo no app não funciona como deveria.
- **Agente responsável:** área do bug + testador (+ auditor se tocar dados)
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. Reproduza com os dados fictícios (Playwright ou teste em `ferramentas/testes/`).
2. Ache a causa raiz em `app.jsx` (arquivo:linha). Se tocar dados da pessoa ou cálculo de dinheiro, peça aprovação antes de corrigir.
3. Faça a correção mínima, `npm run build`, e crie um teste que falharia antes da correção.
4. Rode `larguras.cjs`, `nuvem.cjs` e o teste novo. Mande fotos se mudou algo visível.
5. Se tocou dados ou nuvem, acione o `auditor` para revisar.

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Bug não se reproduz mais, teste novo passando e testes antigos com "Tudo certo".

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
