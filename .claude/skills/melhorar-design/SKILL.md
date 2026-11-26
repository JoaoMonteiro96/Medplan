---
name: melhorar-design
description: Audita e melhora a interface do Sallos no celular e no computador, mantendo a lógica (frontend).
argument-hint: "<tela ou problema>"
disable-model-invocation: true
---
# /melhorar-design

**Pedido:** $ARGUMENTS

- **Quando usar:** Uma tela confusa, apertada no celular ou fora do padrão visual.
- **Agente responsável:** frontend
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. Acione o `frontend` para diagnosticar e montar 2 ou 3 opções em imagem.
2. Mostre as imagens ao João (celular e computador) e espere a escolha.
3. Com o ok, o `frontend` aplica no `app.jsx`, roda `npm run build` e os testes de larguras.

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Opção escolhida aplicada, "Tudo certo" nas larguras e fotos aprovadas.

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
