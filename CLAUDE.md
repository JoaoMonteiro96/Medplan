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
- `service-worker.js`: deixa o app funcionar como aplicativo e sem internet.
- `manifest.json`, `sallos-*.png`: ícones e dados de instalação.
- `conheca/`: página de apresentação (sallos.com.br/conheca), com imagens e o vídeo de demonstração.
- `schema.sql`: tabelas, regras de acesso, pasta de notas e tarefas automáticas do Supabase.
- `supabase/functions/cotacoes/index.ts`: cópia da função da central de cotações (a que roda está no Supabase).
- `CNAME`: domínio sallos.com.br (GitHub Pages).

## Montar e publicar

1. Na primeira vez: `npm install`.
2. Depois de editar o `app.jsx`: `npm run build`. Isso gera o `app.js` e troca a versão no `index.html` e no `service-worker.js`, para os celulares baixarem a versão nova.
3. Teste (veja abaixo) e mande as imagens para o João.
4. Com o ok dele: commit e push no `main`. O GitHub Pages publica em sallos.com.br em 1 ou 2 minutos.
5. Confira que o site no ar tem a versão nova (o `app.js?v=` no index.html).

O aviso de `history12` duplicado na montagem é antigo e não atrapalha.

## Testes que sempre fazer

- Larguras: **344 px** (Galaxy Z Fold fechado), 360, 390, **412** (celular do João), 430, 600, 690 (Fold aberto) e 1440 (computador).
- Nada pode sair da tela na horizontal. Números grandes não podem ficar cortados.
- Temas claro e escuro.
- Use dados fictícios: hospitais como "Hospital Central", "UPA Norte", "Hospital São Lucas". Nunca dados reais do João.
- Para simular o app com dados, grave em `localStorage` a chave `mediplan-data-v2` e `mediplan-cloud-skip` = `1`.

## Dados e nomes que não podem mudar

- As chaves do `localStorage` começam com `mediplan-` (ex.: `mediplan-data-v2`, `mediplan-tema`). **Não renomeie.**
- Notas fiscais: banco `mediplan-anexos` no aparelho (IndexedDB) e pasta privada `notas` no Supabase.
- `cotacoes.__hist`: um registro por dia do valor da carteira (gráfico de patrimônio).
- `cotacoes.__USD` e `__USDauto`: cotação do dólar.
- `contab.catAprendida`: categoria que a pessoa escolheu para cada loja da fatura do cartão.

## Supabase (projeto "mediplan-sp")

- Tabela `records`: os dados de cada usuário (só o dono lê e grava).
- Central de cotações: tabelas `cotacoes` (preço por ativo, só leitura para quem está logado) e `cotacoes_pedidos` (quais ativos cada pessoa tem).
- Função `cotacoes` (Verify JWT desligado). Busca os preços na brapi com o segredo `BRAPI_TOKEN`, guardado no Supabase.
- Tarefas automáticas (pg_cron): `sallos-cotacoes` (11h, 13h e 15h de Brasília, dias úteis) e `sallos-cotacoes-fechamento` (18h30).
- Pasta privada `notas`: cada pessoa só vê os próprios arquivos (a regra usa a pasta com o id do usuário). O SQL está no `schema.sql`. Confira se foi rodado no projeto.

## Visual (padrão atual)

- Fontes: **Manrope** para títulos e valores (números com largura igual) e **Inter** para textos.
- Cor de destaque: verde escuro (`#0B3D2E` a `#0E5640`) no cartão principal de cada tela, com números em branco. O resto fica claro e limpo.
- Centavos menores nos valores grandes (`comCentavos`).
- Gráficos interativos: arrastar o dedo mostra os valores (`useArrasto`), com linhas de referência (`GradeEixo`).
- Ao marcar como recebido ou pago, aparece um aviso com "Desfazer" (`avisar`, `comAviso`).
- **Sem textos explicativos no rodapé das seções.** O João não gosta. Dicas só dentro de formulários, quando ajudam a preencher.
- Ícones de linha (nada de emoji).
