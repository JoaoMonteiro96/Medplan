---
name: auditar-app
description: Auditoria de segurança, dados e qualidade do Sallos, sem editar código (auditor).
argument-hint: "[área: seguranca | dados | publicacao | tudo]"
disable-model-invocation: true
---
# /auditar-app

**Pedido:** $ARGUMENTS

- **Quando usar:** Antes de uma publicação grande, depois de mexer na nuvem, ou a cada mês.
- **Agente responsável:** auditor
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. Acione o agente `auditor` com a área pedida.
2. Leia o relatório em `docs/auditoria/` e confira as evidências principais.
3. Resuma ao João só os achados crítico e alto, em linguagem simples.

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Relatório salvo com gravidade e evidência para cada achado.

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
