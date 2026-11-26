---
name: central-comando
description: Coordena vários agentes num pedido amplo, com as 5 etapas do protocolo (orquestrador).
argument-hint: "<pedido amplo>"
---
# /central-comando

**Pedido:** $ARGUMENTS

- **Quando usar:** Pedido que envolve mais de uma área (ex.: lançar a assinatura, preparar o Instagram).
- **Agente responsável:** orquestrador (planeja) + especialistas escolhidos
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. Acione o agente `orquestrador` com o pedido para ter o plano (agentes, ordem, escopo, critério).
2. Mostre o plano ao João em poucas linhas e espere o "pode fazer".
3. Execute as etapas acionando cada especialista **na ordem**, só os necessários. Duas tarefas que mexem no `app.jsx` nunca ao mesmo tempo.
4. Validação com o `testador` (e o `auditor` se tocar dados, segurança ou publicação).
5. Peça ao `orquestrador` para consolidar e atualizar STATUS, BACKLOG e DECISOES.

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Todas as etapas com critério verificado (ou marcado como não verificado, com motivo) e o João aprovou.

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
