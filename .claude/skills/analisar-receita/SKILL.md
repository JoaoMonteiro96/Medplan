---
name: analisar-receita
description: Viabilidade, preço da assinatura, custos e cenários do Sallos (negocio). Resultado fica fora do repositório.
argument-hint: "[pergunta: preço, custos, cenários]"
---
# /analisar-receita

**Pedido:** $ARGUMENTS

- **Quando usar:** Definir o preço da assinatura, prever custos ou avaliar se vale a pena algo pago.
- **Agente responsável:** negocio
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. Acione o `negocio`. Ele escreve só em `privado/negocio/` (fora do Git).
2. Entregue ao João numa página privada (Artifact), nunca no repositório.

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Cenários com premissas e fontes, entregues em página privada.

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
