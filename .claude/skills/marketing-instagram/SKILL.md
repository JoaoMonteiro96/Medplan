---
name: marketing-instagram
description: Monta campanha de Instagram do Sallos com calendário, Reels, Stories e legendas, como rascunho (diretor-marketing).
argument-hint: "<objetivo da campanha>"
---
# /marketing-instagram

**Pedido:** $ARGUMENTS

- **Quando usar:** Lançar o perfil, divulgar função nova ou a assinatura.
- **Agente responsável:** diretor-marketing
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. Acione o `diretor-marketing`.
2. Se precisar de telas, use `telas.cjs` com dados fictícios.
3. Mostre o rascunho ao João. Postar só com o ok dele.

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Rascunho em `docs/marketing/` com calendário e métricas a acompanhar.

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
