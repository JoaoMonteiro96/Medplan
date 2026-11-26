# Guia da equipe

17 agentes (`.claude/agents/`) e 18 comandos (`.claude/skills/`). O João chama um comando digitando, por exemplo, `/corrigir-bug o total de março está errado`. Os agentes só entram quando um comando ou o pedido precisa deles.

## Quem faz o quê

| Agente | Modelo | Faz | Escreve em |
|---|---|---|---|
| orquestrador | opus | Planeja pedidos amplos: quem entra, em que ordem, com que critério. Não altera código. | docs/agentes/ |
| auditor | sonnet | Segurança, dados das pessoas, contas de dinheiro e riscos de publicação. Não altera código. | docs/auditoria/ |
| testador | sonnet | Roda e cria testes (telas, nuvem, cálculos). Não altera o app. | docs/testes/, ferramentas/testes/ |
| frontend | sonnet | Telas no celular e no computador. Edita o `app.jsx` só em tarefa aprovada. | docs/frontend/ |
| performance | sonnet | Mede velocidade e peso e propõe melhorias. | docs/performance/ |
| privacidade-lgpd | sonnet | LGPD, consentimento, exclusão e exportação de dados. | docs/privacidade/ |
| especialista-financas | sonnet | Confere impostos do médico, juros, CDI, IPCA, IR e textos. Educação, não recomendação. | docs/financas/ |
| gestor-release | sonnet | Checklist de publicação do site e, no futuro, das lojas. Nunca publica. | docs/publicacao/ |
| diretor-marketing | sonnet | Instagram (a criar), campanhas e roteiros. Só rascunhos. | docs/marketing/ |
| crescimento | sonnet | Ativação, retenção e indicação, com experimentos priorizados. | docs/crescimento/ |
| analista-dados | sonnet | Métricas de uso sem dados pessoais nem financeiros. | docs/dados/ |
| negocio | sonnet | Preço da assinatura, custos, cenários. **Fora do repositório.** | privado/negocio/ |
| suporte-cliente | haiku | Classifica feedback e rascunha respostas. | docs/suporte/ |
| gamificacao | sonnet | Hábitos financeiros saudáveis, sem premiar risco ou dívida. | docs/gamificacao/ |
| designer-movimento | sonnet | Animações e transições. | docs/design/ |
| tipografia | sonnet | Fontes, números e hierarquia de texto. | docs/tipografia/ |
| especialista-apps | sonnet | O que apps de sucesso fazem e o que serve ao Sallos. | docs/radar/ |

## Comandos

| Comando | Agente | Faz |
|---|---|---|
| `/central-comando` | orquestrador + especialistas | Coordena um pedido amplo nas 5 etapas. |
| `/auditar-app` | auditor | Auditoria sem editar. |
| `/corrigir-bug` | área + testador (+ auditor) | Reproduz, corrige o mínimo, testa e relata. |
| `/melhorar-design` | frontend | Opções em imagem, aplica a escolhida. |
| `/otimizar-performance` | performance | Mede e propõe. |
| `/revisar-privacidade` | privacidade-lgpd | Mapa de dados e checklist. |
| `/validar-financas` | especialista-financas | Confere cálculos e textos financeiros. |
| `/preparar-release` | testador + auditor | Confere se a versão pode ir ao ar, sem publicar. |
| `/preparar-publicacao` | gestor-release | Prepara site ou lojas, sem publicar. |
| `/marketing-instagram` | diretor-marketing | Campanha em rascunho. |
| `/plano-crescimento` | crescimento | Funil e experimentos. |
| `/analisar-metricas` | analista-dados | Plano de métricas com privacidade. |
| `/analisar-receita` | negocio | Preço, custos e cenários (entregue em página privada). |
| `/analisar-feedback` | suporte-cliente | Classifica feedback e rascunha resposta. |
| `/gamificacao` | gamificacao | Mecânicas de hábito. |
| `/design-movimento` | designer-movimento | Animações. |
| `/tipografia` | tipografia | Fontes com protótipo. |
| `/radar-apps` | especialista-apps | Referências de outros apps. |

## Proteções

- `.claude/hooks/guarda.py`: antes de cada ação, bloqueia arquivos de senha e `rm -rf` perigoso, e pede confirmação para publicar (push no `main`), apagar, instalar programa novo e mexer nas configurações. Testes: `python3 .claude/hooks/testar-guarda.py`.
- `scripts/validar-agentes.mjs`: confere a configuração da equipe. Roda sozinho depois de cada edição em `.claude/` ou no `CLAUDE.md`.
