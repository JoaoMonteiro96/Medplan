# Categorias da fatura do cartão · 2026-11-27

1. **Tarefa:** diagnóstico de por que compras da fatura caem em "Outros".
2. **Agente:** conversa principal (sem mudar o app).
3. **Objetivo:** reconhecer mais compras sozinho e facilitar o que sobra.
4. **Evidências:**
   - Reconhecedor: `catCompra` (`app.jsx`, perto da linha 125), com `REGRAS_COMPRA`, `LOJAS_BR` e `MARCAS_FIXAS` (centenas de redes do Brasil) e o aprendizado por loja `contab.catAprendida` (`chaveLoja`).
   - Teste com 143 nomes no formato das faturas (fictícios): 130 reconhecidos (91%), 13 em "Outros".
   - Caíram em "Outros": nomes de pessoa ou empresa genérica atrás de maquininha (`PAG*JOSEDASILVA`, `MP *LOJADOCELSO`, `J R COMERCIO LTDA`, `COMERCIAL SANTOS ME`, `ALMEIDA E FILHOS`, `M L SERVICOS EIRELI`), contas de casa pagas no cartão (`ENEL`, `SABESP`, `COMGAS`, `LIGHT`), `CASA DO BOLO`, e linhas que não são compra (`PAGAMENTO RECEBIDO`, `ESTORNO`).
   - Erros de categoria: `COELBA` e `EMBASA` vão para Moradia (as categorias Energia e Água existem, mas as regras da fatura não as usam); clínica veterinária vai para Saúde (devia ser Pets).
   - CSV: `parseCSV` não lê a coluna "Categoria" que alguns bancos mandam (C6, Inter e outros; conferir com arquivo do João).
   - Na importação, a prévia usa `guessExpCat` sem o que a pessoa já ensinou (`catAprendida`); o aprendido só vale depois, na tela da fatura.
   - Corrigir hoje: Despesas › fatura › categoria › item › "mudar". Funciona e aprende, mas fica escondido.
5. **Diagnóstico:** o reconhecedor por nome está bom. O que sobra em "Outros" é, quase todo, nome que não diz o tipo da loja (pessoa ou empresa genérica atrás de maquininha). Para esses, só resolve: (a) a categoria que o banco manda, (b) a pessoa ensinar uma vez, (c) uma IA olhar o nome, ou (d) o que outras pessoas já ensinaram.
6. **Propostas (da mais fácil para a mais trabalhosa):**
   - A. Ler a coluna "Categoria" do CSV do banco (R$ 0, baixo).
   - B. Completar regras: luz, água e gás no cartão (Enel, Sabesp, Comgás, Light, Cemig, Copel, Celpe, Coelba, Embasa…), veterinário em Pets, confeitarias e bolos (R$ 0, baixo).
   - C. Depois de importar, "Revisar X compras em Outros": lista com botões de categoria, 1 toque cada, aprendido para sempre; e a prévia já usar o que foi ensinado (R$ 0, baixo a médio).
   - D. Aprender melhor: mesma loja com nomes diferentes; mesmo valor todo mês vira sugestão de Assinatura (R$ 0, médio).
   - E. Dicionário compartilhado e anônimo: o que uma pessoa ensina ajuda as outras, só para nomes ensinados por 3 ou mais pessoas (evita guardar nome de pessoa) (R$ 0 no Supabase grátis, médio; precisa constar na Política).
   - F. IA para o que sobrar: manda só o nome da loja para um modelo pequeno (ex.: Claude Haiku) por uma função no Supabase; custo estimado de centavos por fatura; a chave da IA fica no painel do Supabase, colocada pelo João (médio).
7. **Testes:** `catCompra` rodado com a lista acima (nenhum teste do app alterado).
8. **Riscos:** E e F mandam nomes de loja para fora do aparelho; nunca valores, datas ou dados da pessoa; precisa de aviso na Política.
9. **Pendências:** um CSV de fatura do João com os valores trocados (fictício) para conferir a coluna de categoria de cada banco.
10. **Aprovação necessária:** "pode fazer" do João.
