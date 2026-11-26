---
name: preparar-release
description: Verifica se a versão está pronta para publicar no sallos.com.br, sem publicar.
argument-hint: "[o que entra nesta versão]"
---
# /preparar-release

**Pedido:** $ARGUMENTS

- **Quando usar:** Antes de cada publicação.
- **Agente responsável:** testador + auditor
- **Referências:** `CLAUDE.md`, `docs/agentes/PROTOCOLO.md`, `docs/agentes/STATUS.md`, `docs/agentes/DECISOES.md`

## Etapas
1. `npm install` (se faltar) e `npm run build`.
2. Rode `larguras.cjs`, `nuvem.cjs` e `telas.cjs` nos três modos; olhe as fotos.
3. Confira a versão no `index.html` e no `service-worker.js`.
4. Acione o `auditor` (área publicacao) se a versão mexe em dados ou nuvem.
5. Mande as fotos ao João e pergunte: "Posso publicar?"

## Limitações
- Não publica, não faz commit nem push, não gasta e não posta sem o ok do João.
- Só dados fictícios. Números do negócio só em `privado/`.

## Critérios de conclusão
Todos os testes com "Tudo certo" e a pergunta feita ao João.

## Formato da entrega
Relatório no modelo de `docs/agentes/PROTOCOLO.md`. Para o João: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado, e onde ver.
