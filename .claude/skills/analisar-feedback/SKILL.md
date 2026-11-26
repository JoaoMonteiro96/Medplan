---
name: analisar-feedback
description: Classifica feedback e rascunha respostas (suporte-cliente).
argument-hint: "<feedback colado ou resumo>"
disable-model-invocation: true
---
# /analisar-feedback

**Pedido:** $ARGUMENTS

- **Quando usar:** Chegou mensagem, avaliação ou reclamação de usuário.
- **Agente responsável:** suporte-cliente
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. Tire nome, e-mail e valores do texto antes de passar adiante.
2. Acione o `suporte-cliente`.
3. Bugs vão para `/corrigir-bug`; pedidos vão para o BACKLOG.

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Feedback classificado e resposta rascunhada para o João enviar.

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
