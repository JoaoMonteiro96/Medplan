# Protocolo de trabalho da equipe

As regras do João no `CLAUDE.md` valem mais que este protocolo.

## Cinco etapas

| Etapa | Quem | O que sai |
|---|---|---|
| 1. Diagnóstico | agente da área | problema, contexto, arquivos e evidências |
| 2. Planejamento | orquestrador | especialistas, ordem, dependências, riscos, escopo (arquivos permitidos) e critério de conclusão |
| 3. Execução | agentes autorizados | mudanças ou documentos, só dentro do escopo |
| 4. Validação | testador (+ auditor se tocar dados, segurança ou publicação) | testes rodados de verdade, com a saída |
| 5. Aprovação | João | "pode fazer" para app, dados, cálculos, cobrança e Supabase; "ok", "pode" ou "faça" depois de ver as imagens para publicar |

## Regras

- Um arquivo é editado por um agente de cada vez. O app é um arquivo só (`app.jsx`): nunca duas tarefas nele ao mesmo tempo.
- Só o agente certo para cada tarefa. Não acionar a equipe toda.
- Atualizar o relatório que já existe em vez de criar outro.
- No máximo 2 rodadas de revisão.
- Concluído = critério verificável atendido. O que não foi verificado aparece como **não verificado**, com o motivo.
- Nunca commit, push, publicação, gasto ou postagem sem autorização.
- O repositório é **público**. Números do negócio, dados pessoais e estratégia sensível ficam em `privado/` (fora do Git) e chegam ao João por página privada.
- Mudança visual: mostrar 2 ou 3 opções em imagem (celular e computador) antes de aplicar.
- Antes de criar nome novo (classe, id, chave `mediplan-*`), buscar se já existe.

## Modelo de relatório

```
# <Título> · AAAA-MM-DD
1. Tarefa
2. Agente responsável (apoio)
3. Objetivo
4. Evidências (arquivo:linha, saída de comando, link com data)
5. Diagnóstico (fato x hipótese)
6. Alterações (realizadas | propostas: antes → depois)
7. Testes (comando · resultado real)
8. Riscos
9. Pendências
10. Aprovação necessária
```

Para o João, junto do relatório: poucas linhas, em português simples, dizendo o que mudou ou o que foi achado e onde ver. Sem lista técnica.

## Custo

- haiku para triagem simples (suporte-cliente), sonnet para a maioria, opus só para planejamento amplo (orquestrador).
- Ler só os trechos relevantes do `app.jsx` (ele tem mais de 10 mil linhas): usar Grep antes de Read.
- Reaproveitar diagnósticos que já estão em `docs/`.
- Pesquisas independentes podem correr em paralelo, desde que só leiam.
