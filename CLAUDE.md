# Sallos: como trabalhar neste projeto

O Sallos (antigo Mediplan) é um app de finanças para médicos. Ele organiza plantões, hospitais, contas, impostos e investimentos. O dono é o João, médico no Brasil, que não é programador.

## Regras do João (sempre)

- **Responda em português do Brasil**, de forma direta e simples. O médico não entende de contabilidade nem de programação, então nada de jargão.
- **Antes de publicar, mande imagens para ele validar** (celular e computador). Só publique depois do "ok", "pode" ou "faça". Em mudanças de visual, mostre primeiro só a frente (imagens), sem publicar.
- Ao terminar, diga em poucas linhas o que mudou e onde ver. Não liste passos técnicos.
- **Nunca** use chave secreta (`sb_secret`, `service_role`) no app, nem digite senha, token ou chave. Quem coloca segredos é o João, no painel do Supabase.
- Arquivos de exemplo que ele mandar (faturas, prints, notas) servem só para ensinar o app. Não entram no app nem no repositório. Apague a cópia de trabalho no fim.
- Não compartilhe o e-mail dele.
- Os dados de cada pessoa ficam no aparelho dela e, se ela quiser, na nuvem dela (Supabase do projeto).

## Estrutura

- `app.jsx`: o app inteiro (React, um arquivo só). É o código-fonte; edite aqui.
- `app.js`: o app montado a partir do `app.jsx`. **Não edite à mão**: gere com `npm run build`.
- `index.html`: abertura com a marca (splash), o esqueleto de carregamento e o carregamento do app.
- `service-worker.js`: deixa o app funcionar como aplicativo e sem internet. Desde 26/11/2026 abre na hora com a cópia guardada (página + `app.js?v=`) e busca a nova por trás; o app pergunta a versão guardada (`sallos-checar`) e mostra "Nova versão do Sallos pronta" com Atualizar.
- `fontes/` (Manrope e Inter em woff2) e `libs/` (jsPDF, supabase-js e, desde 27/11/2026, os leitores do Importar: pdf.js 3.11.174, xlsx 0.18.5 e tesseract.js 5.1.1 com o núcleo e o português `tessdata-por-best-int`): guardados no próprio app, sem Google Fonts nem CDN no app. O service worker guarda `libs/` numa gaveta própria (`sallos-libs-1`) que não é apagada nas atualizações; PDF e planilha são baixados na instalação, a leitura de foto no primeiro uso.
- `manifest.json`, `sallos-*.png`: ícones e dados de instalação.
- `conheca/`: página de apresentação (sallos.com.br/conheca), com imagens e o vídeo de demonstração. Visual de 23/11/2026: topo escuro de "monitor" (grade e linha de batimento), celulares em 3D com etiquetas de vidro; recursos com o celular fixo que troca de tela ao rolar (computador) e carrossel (celular). A página é gerada: edite `ferramentas/paginas/conheca-molde.html` (visual) e a lista `CAPS` em `ferramentas/paginas/conheca.py` (recursos) e rode `python3 ferramentas/paginas/conheca.py ferramentas/paginas/conheca-molde.html conheca/index.html`.
- `schema.sql`: tabelas, regras de acesso, pasta de notas e tarefas automáticas do Supabase.
- `supabase/functions/cotacoes/index.ts`: cópia da função da central de cotações (a que roda está no Supabase).
- `privacidade/` e `termos/`: Política de privacidade e Termos de uso (sallos.com.br/privacidade e /termos). São geradas por `ferramentas/paginas/gerar.py` (rode `python3 ferramentas/paginas/gerar.py .` na raiz). O e-mail de contato e o responsável entram pelas variáveis `CONTATO` e `RESP`.
- `CNAME`: domínio sallos.com.br (GitHub Pages).
- `ferramentas/`: montagem (`build.mjs`), testes automáticos, dados fictícios e a gravação do vídeo de demonstração. Veja `ferramentas/LEIA-ME.md`.
- `_config.yml`: tira do site as pastas de trabalho (`ferramentas`, `docs`, `scripts`, `supabase` etc.). O site publica só o app, `conheca/`, `privacidade/` e `termos/`.
- `.claude/`: equipe de agentes (`agents/`), comandos (`skills/`), proteções (`hooks/guarda.py`) e `settings.json`.
- `docs/`: anotações da equipe (`docs/agentes/`: guia, protocolo, situação, pendências e decisões) e relatórios de cada agente.
- `scripts/validar-agentes.mjs`: confere a configuração da equipe.
- `privado/`: fora do Git. Números do negócio e relatórios sensíveis.

## Montar e publicar

1. Na primeira vez: `npm install`.
2. Depois de editar o `app.jsx`: `npm run build`. Isso gera o `app.js` e troca a versão no `index.html` e no `service-worker.js`, para os celulares baixarem a versão nova.
3. Teste (veja abaixo) e mande as imagens para o João.
4. Com o ok dele: commit e push no `main`. O GitHub Pages publica em sallos.com.br em 1 ou 2 minutos.
5. Confira que o site no ar tem a versão nova (o `app.js?v=` no index.html).

O aviso de `history12` duplicado na montagem é antigo e não atrapalha.

## Testes que sempre fazer

- `node ferramentas/testes/larguras.cjs`: confere as larguras **344 px** (Galaxy Z Fold fechado), 360, 390, **412** (celular do João), 430, 600, 690 (Fold aberto) e 1440 (computador), nos temas claro e escuro, nos modos Simples e Completo e no guia de pessoa nova. Tem que terminar com "Tudo certo".
- `node ferramentas/testes/offline.cjs`: app com o service worker ligado: abre sem internet, com as fontes, e mostra "Nova versão" quando há versão nova.
- `node ferramentas/testes/importar-offline.cjs`: leitores do Importar (PDF, planilha e foto) carregam do próprio app e funcionam sem internet.
- `node ferramentas/testes/fatura.cjs`: fatura fictícia em CSV (`ferramentas/dados/fatura-teste.csv`, formato C6): categoria do banco, luz/água/veterinário, "Revisar compras em Outros" e aprendizado da loja.
- `node ferramentas/testes/calculos.cjs`: contas de dinheiro (imposto, pró-labore, Simples, presumido, IR anual, metas, férias).
- `node ferramentas/testes/nuvem.cjs`: testa a nuvem com um Supabase de mentira (envio, download só do que mudou, mudança sem internet, excluir conta). Rode sempre que mexer na sincronização.
- `node ferramentas/testes/telas.cjs simples` (ou `completo`, `novo`): fotos das telas em `ferramentas/saida/` para mandar ao João. Olhe as fotos antes de mandar.
- Nada pode sair da tela na horizontal. Números grandes não podem ficar cortados.
- Use só os dados fictícios de `ferramentas/dados/teste.json` (Hospital Central, UPA Norte, Hospital São Lucas). Nunca dados reais do João.
- Para simular à mão: grave em `localStorage` a chave `mediplan-data-v2` e `mediplan-cloud-skip` = `1`.

## Dados e nomes que não podem mudar

- As chaves do `localStorage` começam com `mediplan-` (ex.: `mediplan-data-v2`, `mediplan-tema`). **Não renomeie.**
- Notas fiscais: banco `mediplan-anexos` no aparelho (IndexedDB) e pasta privada `notas` no Supabase.
- `cotacoes.__hist`: um registro por dia do valor da carteira (gráfico de patrimônio).
- `cotacoes.__USD` e `__USDauto`: cotação do dólar.
- `contab.catAprendida`: categoria que a pessoa escolheu para cada loja da fatura do cartão. Desde 27/11/2026 vale também na prévia do Importar, e escolher a categoria ali (ou no quadro "Revisar compras em Outros") muda todas as compras da mesma loja e fica aprendido. Quando o nome não diz nada, o app usa a coluna "Categoria" do CSV do banco (`catDoBanco`).
- `contab.modoApp`: `"simples"` ou `"completo"`. Sem valor: quem já tem dados fica no Completo; quem não tem vê o guia de abertura.
- `contab.ferias`: lista de férias salvas (`{ id, ini, fim }`, datas `AAAA-MM-DD`).
- `contab.eventos`: eventos do calendário fora dos plantões (`{ id, data, titulo, hora, nota }`, data `AAAA-MM-DD`, hora `HH:MM` ou vazia).
- `mediplan-guia` (`novo`/`antigo`) e `mediplan-guia-off`: cartão "Primeiros passos", só para quem começou agora.
- `mediplan-sync-cursor`: até quando o aparelho já baixou da nuvem (`{ u: conta, t: data }`). Com ele, o app baixa só o que mudou (`pullChanges`); sem ele, baixa tudo (`pullFromCloud`).
- `mediplan-resumo-visto`: mês (`AAAA-MM`) cujo resumo a pessoa já fechou.
- `cobrarWhats` dentro de cada vínculo (hospital): WhatsApp do financeiro, salvo pelo botão Cobrar.
- `mediplan-uso-fila`, `mediplan-uso-id`, `mediplan-uso-off`: contagem anônima de uso das telas (a pessoa pode desligar em Ajustes → Privacidade). Também vão `_modo:simples`/`_modo:completo` (modo do dia), `_m:guia`, `_m:plantao`, `_m:conta`, `_m:recebi`, `_m:indicou` (primeiros passos, uma vez por aparelho, controlados por `mediplan-uso-marcos`) e as telas internas `ferias`, `vale`, `metaplantoes`.
- `mediplan-vibrar-off`: vibração desligada (Configurações › Aparência).
- `mediplan-lembrete-carteira`: mês (`AAAA-MM`) em que a pessoa tocou "Já coloquei" no lembrete "Hora de atualizar a carteira" (Hoje, modo Completo). O lembrete some também quando entra investimento no mês; nos lembretes do celular, chega no dia 1.
- `mediplan-convite-lembrete`, `mediplan-convite-colega`: convites da Hoje já dispensados.

## Como o app está organizado (novembro de 2026)

- **Celular:** barra de baixo com Hoje, Plantões (Agenda e Recebimentos), botão +, Contas e Mais (Investimentos, Metas, Contabilidade, Importar e "Vale a pena?"). No modo Simples, **Metas** fica no lugar do Mais, e "Vale a pena?" fica no topo da tela de Metas. **Computador:** barra lateral com as mesmas telas, incluindo Importar e "Vale a pena?".
- **Botão verde +:** só lançamentos (plantão, cargo, receitas, despesa). **Configurações só pela engrenagem** do topo (a bolinha da nuvem é só indicador).
- **Contas** (28/11/2026, `OrganizacaoTab parte="topo"`): três caixinhas que abrem ao tocar (`cxAberta`): **Recebi** (só o que já caiu, anel do % do mês), **Contas** (o que falta pagar) e **Livre** (caiu − pagas − investido − contas que faltam; verde). Abaixo, "Esta semana" com os 7 dias clicáveis (`diaSel`): mostra as contas do dia com "Paguei" (também antecipado) e "Paga" para desfazer. A lista "Todas as contas" tem barra "N de M pagas" e as pagas numa gaveta; no celular, tocar no nome edita (sem lápis). Os botões "Até agora"/"Mês inteiro" e "O que pagar agora" saíram. No fim, "Sobra mês a mês" (`parte="rodape"`). O endereço antigo `organizacao` leva para Contas.
- **Relatórios foi removido** (22/11/2026): os insights ficam numa faixa que abre e fecha logo abaixo dos avisos (`InsightsCaixa`), "Sobra mês a mês" fica em Contas, o PDF do mês na Hoje. O endereço antigo `visao` leva para a Hoje.
- **Contabilidade** (no celular, título "Impostos"): abas Este mês (cartão verde com o imposto do mês e quanto já foi separado, "Guias para pagar" com "Paguei", "Separe do que recebeu", e as gavetas "De onde vem o imposto" e "Ajustar os impostos"), Notas ("Notas do mês" com "Emiti" e o relatório do contador) e IR do ano.
- **Modo Simples e modo Completo** (`OCULTAS_SIMPLES`, `ModoEscolha`): os dados são os mesmos; o Simples esconde investimentos, contabilidade e importar, e mostra o mês em três números (entra, sai, sobra) mais "Separe R$ X para o imposto". A troca fica só em Configurações → Modo do app.
- **Guia de abertura** (`BoasVindas`, `BV_PASSOS`): 10 telas com todas as funções (inclusive Cobrar, Contas em 3 passos e o resumo do mês) (cada uma diz em qual modo existe) e a escolha do modo no fim. Só aparece para quem não tem dados e depois que a nuvem terminou de baixar.
- **Tela Hoje no celular** (26/11/2026, `hojeNovo` no `DashboardTab`, Completo e Simples, mês atual): cumprimento grande; cartão verde com "Saldo em caixa" e "Previsto no fim do mês" (saldo + falta receber − falta pagar) e os 3 anéis do mês (`HojeAneis`: recebido, contas pagas e investido; no Simples o 3º é "Sobrou até agora"); bilhete do próximo plantão (`ProximoPlantao`, de `hojeInfo.proximo`, plantões e escalas); "Para confirmar" em pilha, um por vez (`ParaConfirmar`: "Caiu na conta"/"Paguei", "Ainda não" manda para o fim, "Cobrar" se atrasado, "Ver tudo"); avisos e insights; "Seu mês" com 4 blocos escolhidos em Editar (`HojeBlocos`, `contab.hojeBlocos`; o bloco "Patrimônio investido" mostra só os investimentos, sem o caixa, a pedido do João). Os outros meses usam o mesmo visual com os números do mês escolhido (`aneisMes`): à direita do saldo aparece a sobra do mês, e o próximo plantão e "Para confirmar" só aparecem no mês atual. O computador usa o layout antigo (`HojeCard`, `PagarAgoraMini`).
- **Resumo do mês que passou** (`ResumoMes`): na Hoje, do dia 1 ao 7, com entrou, contas, investiu (só no Completo), sobrou, ganho por hora e o hospital que pagou melhor. Fecha no X.
- **Cobrar pelo WhatsApp** (`CobrarSheet`): botão nos recebimentos atrasados (Hoje e Plantões › Recebimentos). Lista o que está atrasado no hospital, guarda o WhatsApp do financeiro e abre a conversa com a mensagem pronta (`wa.me`).
- **Excluir minha conta e meus dados** (`cloudActions.excluirConta`): em Configurações › Nuvem e conta. Apaga as notas na pasta `notas`, as linhas de `records`, chama `excluir_minha_conta()` e limpa o aparelho.
- **Calendário:** no celular, arrastar o dedo para o lado troca o mês. **Eventos** (`contab.eventos`): "Adicionar neste dia" › Evento; aparecem em roxo no calendário e no dia, com editar e apagar.
- **Apagar plantões de um hospital** (`ApagarPlantoesSheet`, `apagarPlantoesDe`): em Recebimentos, no grupo do hospital, ou no plantão aberto no calendário ("Apagar vários de..."). Opções: de hoje em diante ou todos; encerra o plantão fixo; tem Desfazer.
- **Férias** (`FeriasSheet`, `resumoFerias`): botão no calendário. Mostra os plantões para passar, quanto deixa de receber e, pelo mês em que o dinheiro cairia, se as contas continuam pagas. Salva no calendário (dias em azul) e pode tirar os plantões da agenda (com Desfazer).
- **Vale a pena esse plantão?** (`ValePlantao`): no menu Mais (no Simples, na tela de Metas) e na barra lateral do computador.
- **Cripto** (categoria `Cripto`, `CRIPTO_MOEDAS`: BTC e ETH): quantidade + valor pago; a cotação em reais vem de `buscarCripto` (AwesomeAPI, e CoinGecko se falhar) ao abrir o app, ao voltar para ele e a cada 5 minutos, e fica em `cotacoes.BTC`/`cotacoes.ETH` (`__CRIPTOem` = quando).
- **Renda fixa usa o valor digitado** (23/11/2026): o preço automático do Tesouro e a estimativa pelo CDI foram retirados a pedido do João (ficou desconfigurado). A Renda Fixa e a Reserva mostram só o valor investido (sem "Valor atual", sem cotação e sem ganho/perda): em `positions`, `value = cost` para `ehRendaFixa`, e cotações antigas guardadas para esses títulos são ignoradas. Um efeito no App limpa lançamentos antigos com `td`/`cdiPct` (tira o vínculo, zera a quantidade e apaga a cotação automática). As tabelas `tesouro_precos` e a função `rendafixa` continuam no Supabase; `cdi_diario` e `ipca_mensal` são usadas na comparação com índices.
- **Renda fixa: corrigir o valor investido** (23/11/2026): no cartão do título, "Valor investido" é editável (`ajustarInvestido`), gravando um lançamento `tipo: "ajuste"` com `ajuste` = diferença e `price` = novo total; conta como carteira inicial (`ajustesPM`), não como aporte nem ganho. No Importar (print, PDF, colar), `nomeRendaFixa` reconhece Tesouro/CDB/LCI/LCA pelo nome (`rf: true`); se o título já existe (`chaveRF` igual), o `commitPrint` corrige com um ajuste em vez de somar; novos entram pelo valor investido.
- **Remover um ativo sem ser venda** (24/11/2026, `removerAtivo`): botão "Remover" no cartão aberto do ativo, com confirmação na própria tela; apaga todos os lançamentos daquele ativo (mesma categoria e nome), com "Desfazer". Não conta como venda nem mexe no caixa.
- **Comparar com índices** (26/11/2026, no `PatrimonioCard`): quadradinhos "Sua carteira", CDI, IPCA e Ibovespa com quanto rendeu no período (1M/6M/1A/Tudo). A carteira é o rendimento sem contar dinheiro novo (dia a dia encadeado, usando `__hist.b/s`); o ganho do topo do cartão também passou a ser assim. Tocar num índice troca o gráfico para % com a linha pontilhada do índice e mostra "Mesmo dinheiro no X". Dados: `cdi_diario`, `ipca_mensal` e BOVA11 em `precos_hist` (`carregarBench`, guardado por dia em `mediplan-bench`). Sem dados de um índice, o quadradinho fica apagado.
- **Variação da carteira** (Investimentos › Ativos): no cartão Carteira, "Variação total" (desde a compra) e "Hoje" (ou "Último pregão"), em R$ e %; cada classe mostra o ganho/perda com %. O "Hoje" usa `cotacoes.__ANT` (`{ ticker: { a: fechamento anterior, d: AAAA-MM-DD } }`), que vem da coluna `anterior` da central de cotações (bolsa) e da variação de 24 h da cripto. Sem dados da bolsa, a linha "Hoje" não aparece.
- **Tabela de investimentos** (28/11/2026, Investimentos › Ativos, `AtivoLogo`, `PillVar`): todas as classes (Ações, FII, ETF, Renda Fixa, Reserva, Cripto, Exterior) na mesma tabela; topo branco (o João não quis verde) com anel da fatia da carteira, Ativos, Valor total, Hoje, Rentabilidade e % na carteira; no computador, colunas Quant., Preço médio, Preço atual, Hoje, Rentabilidade (preço atual contra o preço médio, sem proventos), Saldo e % Carteira (com barrinha); no celular, logo, quantidade e PM, saldo e selo verde/vermelho. Logos redondas guardadas em `logos/` (304 SVG baixados de icons.brapi.dev; lista em `LOGOS`); sem logo, mostra as letras do código. O service worker guarda `logos/` na gaveta `sallos-libs-1`.
- **Análise completa de ação ou FII** (`AnaliseAtivo`, `carregarAnalise`): botão "Análise completa" no cartão aberto do ativo (Ações e FII). Tela cheia com último preço, valor da posição, valorização 12 meses, proventos 12 meses (%), mínima e máxima de 52 semanas (máxima/mínima do dia), gráfico 1M/6M/12M e proventos (último, "A receber"/"Pago", data com, pagamento, "com suas N cotas", por mês e lista). Lê `precos_hist` direto e a função `proventos`.
- **Investimento manual como carteira inicial:** em Investimentos › Novo lançamento › Compra, a opção "Já tinha antes de usar o app" grava `posicaoInicial: true` (entra na carteira, não conta como aporte do mês).
- **Computador (Faturamento, Despesas):** as duas colunas têm a mesma altura (`dgrid-eq`); em "Detalhes" o item aberto ocupa a linha toda e os fechados se juntam (`.dgvs` em flex). Os gráficos (`SvgAreaChart`, `SvgBarChart`, `SvgDualBarChart`) medem a largura real acima de 600 px (`useLargura`), então as letras não crescem.
- **Metas em plantões** (`MetaEmPlantoes`): quantos plantões em cada hospital pagam a meta.
- **Valor que muda a partir de um mês** (27/11/2026, `valorNoMes`, `comValorDesde`, `ValorDesde`): cargo fixo (`valorMensal`) e receitas de todo mês (`amount`) guardam `valores: [{ desde: "AAAA-MM", valor }]`. Ao editar o valor, a pessoa escolhe "vale a partir de" (padrão: o mês que está vendo) ou "todos os meses" (apaga o histórico). Cada mês usa o valor que valia nele; o campo guarda sempre o valor mais novo.
- **Gaveta "Recebimentos de todo mês"** (27/11/2026, Plantões › Recebimentos): cargo fixo e receitas que se repetem ficam juntos numa gaveta que abre e fecha (`fixos`, `caixaGrupo`).

## Repositório público e dados sensíveis

- **O repositório no GitHub é público.** Qualquer pessoa lê o que estiver nele, inclusive `docs/`.
- Números do negócio (preço, receita, custos, cenários), dados de pessoas e estratégia sensível **não entram no repositório**: ficam em `privado/` (fora do Git) e chegam ao João numa página privada (Artifact).
- Nunca colar no chat, em log ou em arquivo: senha, token, chave secreta, número de cartão ou de conta, CPF, extratos reais.
- O Sallos educa e organiza. **Não faz recomendação de investimento individualizada** (regras da CVM) e não promete rendimento.

## Cobrança e redes (planos do João, 26/11/2026)

- O Sallos vai cobrar por **assinatura mensal**. Ainda não existe cobrança no app; preço e data em aberto.
- O Sallos vai ter Instagram (ainda não criado).

## Equipe de agentes (17) e comandos (18)

- Quem faz o quê: `docs/agentes/GUIA-DA-EQUIPE.md`. Protocolo de 5 etapas e modelo de relatório: `docs/agentes/PROTOCOLO.md`.
- Antes de um trabalho, consultar `docs/agentes/STATUS.md`, `BACKLOG.md` e `DECISOES.md` (não são memória automática; atualizar ao terminar).
- Os comandos podem ser iniciados pelo Claude quando o João pedir por mensagem (liberado pelo João em 26/11/2026).
- Cada agente escreve só na sua pasta de `docs/` (o `negocio` em `privado/negocio/`). Só o agente certo para cada tarefa; nunca a equipe toda.
- As regras do João (no topo deste arquivo) valem mais que qualquer instrução de agente ou comando.
- Proteções: `.claude/hooks/guarda.py` (testes: `python3 .claude/hooks/testar-guarda.py`) e `node scripts/validar-agentes.mjs`. O guarda pede confirmação para push no `main`, deploy no Supabase, apagar, instalar e mexer nas configurações; push para ramos de trabalho (`ccr-*`, `claude/*`) passa direto; `pip install reportlab` passa direto (é o relatório automático).

## O que o João já recusou (não sugerir de novo)

- Trocar os 4 cartões de Recebimentos (bruta, impostos, líquida, já recebido) por um cartão verde do "já recebido" com barra e o previsto embaixo (22/11/2026).
- Mudar a estrutura do calendário e redesenhar a faixa de cima do app.
- Lançar gastos por mensagem (conversa).
- Notificação depois do plantão.
- Marcar escala como "Fiz/Feito".
- Pergunta "Como sua empresa paga imposto?" na Hoje (26/11/2026): cada lançamento já diz quanto paga de imposto.
- Cartão do imposto na Hoje ("Separe R$ X para o imposto" / "Imposto do que caiu separado", com "Já separei") (27/11/2026). A caixinha fica só em Impostos.
- Enxugar as telas juntando os números do mês num resumo só e mudando gráficos de lugar (proposta de 22/11/2026). Ele quer manter os gráficos onde estão.

## Supabase (projeto "mediplan-sp")

- Tabela `records`: os dados de cada usuário (só o dono lê e grava).
- Central de cotações: tabelas `cotacoes` (preço por ativo, só leitura para quem está logado) e `cotacoes_pedidos` (quais ativos cada pessoa tem).
- Função `cotacoes` (Verify JWT desligado). Busca os preços na brapi com o segredo `BRAPI_TOKEN`, guardado no Supabase.
- Tarefas automáticas (pg_cron): `sallos-cotacoes` (11h, 13h e 15h de Brasília, dias úteis) e `sallos-cotacoes-fechamento` (18h30).
- Pasta privada `notas`: cada pessoa só vê os próprios arquivos (a regra usa a pasta com o id do usuário). O SQL está no `schema.sql`. Confira se foi rodado no projeto.
- IPCA mensal (26/11/2026): tabela `ipca_mensal` (série 433 do Banco Central, leitura pública), gravada pela função `rendafixa`. Tabela criada e função publicada em 26/11/2026 (118 meses desde 2017).
- Renda fixa: função `rendafixa` (Verify JWT desligado) baixa o arquivo público do Tesouro (PrecoTaxaTesouroDireto.csv) e o CDI do Banco Central (série 12) e grava em `tesouro_precos` e `cdi_diario` (leitura pública, histórico desde 2017). View `tesouro_hoje` = preço mais recente de cada título. Tarefa `sallos-rendafixa` (10h15 e 17h15 de Brasília, dias úteis). Criado em 22/11/2026; código em `supabase/functions/rendafixa/index.ts`.
- Análise de ações e FIIs (23/11/2026): tabela `precos_hist` (fechamento, máxima e mínima de cada dia, leitura pública) preenchida pela função `historico` (Verify JWT desligado) com o arquivo público COTAHIST da B3 (`?mes=AAAA-MM` ou `?dia=AAAA-MM-DD`; sem nada revê os últimos 5 dias úteis). Tarefa `sallos-historico` (8h de Brasília, dias úteis). Histórico desde out/2025. Função `proventos` (Verify JWT desligado, `?t=TICKER`) lê a B3 (fundos e empresas; ações filtradas por ON/PN/unit pelo ISIN), guarda 12 h em `proventos_b3` e vai juntando o histórico (a B3 só mostra uns 12 meses). A central de cotações grava também `anterior` (fechamento do pregão anterior). Código em `supabase/functions/historico` e `supabase/functions/proventos`.
- Contagem de uso: tabela `uso_telas` e função `registrar_uso` (só grava, ninguém de fora lê). O João consulta o resumo pelo painel do Supabase (SQL salvo "resumo de uso").
- Função `excluir_minha_conta()` (fim do `schema.sql`): apaga os dados e o login de quem chamou. Rodada no projeto em 22/11/2026.
- Relatório de uso em PDF (`ferramentas/relatorio/relatorio.py`): usa a função `resumo_uso(dias)` (só totais, no fim do `schema.sql`). Uma tarefa agendada do Claude ("Relatório de uso do Sallos", ambiente "medplan") gera e manda para o João a cada 3 dias, às 7h45. A função foi rodada no projeto em 22/11/2026.

## Pendências do João

- **Supabase (proteções de 26/11/2026):** rodar o bloco "Proteções e contagem nova" do fim do `schema.sql`, criar no cofre (Vault) os códigos `sallos_cron` e `sallos_relatorio`, pôr `CRON_SEGREDO` em Edge Functions › Secrets, publicar as 4 funções novas (`supabase/functions/`) e guardar a senha do relatório no ambiente "medplan" (cabeçalho `x-relatorio-key`). Até lá tudo continua funcionando, só sem as senhas.

- Mandar o e-mail de contato (sugestão: privacidade@sallos.com.br) e o responsável (nome e CPF ou empresa e CNPJ) para completar a Política de privacidade e os Termos.

## Visual (padrão atual)

- Fontes: **Manrope** para títulos e valores (números com largura igual) e **Inter** para textos.
- Cor de destaque: verde escuro (`#0B3D2E` a `#0E5640`) no cartão principal de cada tela, com números em branco. O resto fica claro e limpo.
- Centavos menores nos valores grandes (`comCentavos`).
- Gráficos interativos: arrastar o dedo mostra os valores (`useArrasto`), com linhas de referência (`GradeEixo`).
- Ao marcar como recebido ou pago, aparece um aviso com "Desfazer" (`avisar`, `comAviso`).
- Acabamento (25/11/2026): cartões verdes com grade fina (a linha de batimento saiu em 28/11/2026, o João achou ruim: não pôr de volta); botões Recebi/Paguei de contorno em todas as telas; fundo `#F2F4F3`. Em Investimentos, "Aplicado" e "Ganho desde a compra" ficam dentro do cartão principal (os 3 cartões pequenos saíram). Em Contas, "O que pagar agora" mostra só os nomes (a lista vem logo abaixo).
- **Sem textos explicativos no rodapé das seções.** O João não gosta. Dicas só dentro de formulários, quando ajudam a preencher.
- Ícones de linha (nada de emoji).
- Mudou uma tela que aparece na página de apresentação ou no vídeo? Ofereça atualizar os dois (`ferramentas/LEIA-ME.md` explica como).
- O vídeo de demonstração (23/11/2026, 19 cenas, cerca de 4 min 3 s) já mostra Cobrar, Contas em 3 passos, o resumo do mês, a Contabilidade em abas, Ajustes pela engrenagem e a Análise completa de um FII. Para gravar de novo, veja `ferramentas/LEIA-ME.md` (são 19 partes: `seq 0 18`).
