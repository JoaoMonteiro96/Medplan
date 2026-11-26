---
name: revisar-privacidade
description: Revisa mapa de dados, consentimento, exclusão, exportação e segurança do Sallos (privacidade-lgpd).
argument-hint: "[tema]"
disable-model-invocation: true
---
# /revisar-privacidade

**Pedido:** $ARGUMENTS

- **Quando usar:** Antes de coletar dado novo, criar cobrança, integrar serviço externo ou mudar a Política.
- **Agente responsável:** privacidade-lgpd
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. Acione o `privacidade-lgpd`.
2. Resuma ao João o que precisa mudar e o que depende de advogado.

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Checklist atualizado em `docs/privacidade/`.

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
