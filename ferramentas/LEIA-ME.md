# Ferramentas do Sallos

Scripts para montar, testar e gravar o vídeo do app. Todos usam só **dados fictícios** (`dados/teste.json`: Hospital Central, UPA Norte, Hospital São Lucas...). Nunca coloque dados reais do João aqui.

Antes de usar: `npm install` (uma vez). Os testes precisam do Playwright com o Chromium. Se o `require('playwright')` falhar, rode com `NODE_PATH=$(npm root -g)` na frente.

## Montar o app

`npm run build` compila o `app.jsx` em `app.js` e troca a versão no `index.html` e no `service-worker.js`.

## Testar (sempre, antes de mandar imagens ao João)

| Comando | O que faz |
|---|---|
| `node ferramentas/testes/larguras.cjs` | Abre o app em 344, 360, 390, 412, 430, 600, 690 e 1440 px, nos temas claro e escuro, como pessoa nova (guia), modo Simples e modo Completo. Confere se algo sai da tela e se dá erro. Tem que terminar com "Tudo certo". |
| `node ferramentas/testes/nuvem.cjs` | Testa a nuvem com um Supabase de mentira: envio, download só do que mudou, mudança feita sem internet e excluir conta. Tem que terminar com "Tudo certo". |
| `python3 ferramentas/paginas/gerar.py .` | Gera de novo as páginas de Privacidade e Termos. Para pôr o contato: `CONTATO="..." RESP="..." python3 ferramentas/paginas/gerar.py .` |
| `node ferramentas/testes/telas.cjs simples` | Tira as fotos das telas principais (Hoje, calendário, recebimentos, contas, férias, menu Mais) em `ferramentas/saida/`. Troque `simples` por `completo` ou `novo` (guia de abertura). |

As datas dos dados de teste andam junto com o dia de hoje (`comum.cjs`), então sempre há plantão hoje, coisa para receber e conta vencendo.

## Vídeo de demonstração (sallos.com.br/conheca)

Precisa de Python com Pillow e numpy, ffmpeg e a fonte Inter (`SALLOS_FONTES=/pasta/da/inter/`).

1. `npm run build`
2. `node ferramentas/video/captura.cjs` e depois `node ferramentas/video/captura-faturamento.cjs` (tiram as fotos das telas em `video/cap/`)
3. Conferir quadros antes de gerar tudo: `cd ferramentas/video && python3 render.py quadro 6 7.0 teste.jpg` (cena 6, segundo 7)
4. Gerar as cenas (uns 25 minutos): `mkdir -p parts && seq 0 15 | xargs -P 6 -I{} python3 render.py partes {}`
5. `bash montar.sh` junta tudo com a trilha (original, feita no `musica.py`)
6. `cp site.mp4 ../../conheca/sallos-demonstracao.mp4`

O roteiro das cenas (textos, legendas, toques) fica em `cenas.py`. Hoje são 16 cenas, cerca de 3 minutos e 25 segundos. Se mudar o número de cenas, ajuste o `seq 0 15`.

## Fotos da página de apresentação

As fotos de celular da página (`conheca/img/cel-*.jpg`) têm 780 × 1688 (tela de 390 × 844 em dobro). Dá para tirar da pasta `video/cap/` (as `m-*.jpg`, redimensionadas) ou com o `telas.cjs` numa largura de 390.

## Relatório de uso em PDF (a cada 72 horas)

`python3 ferramentas/relatorio/relatorio.py` busca os totais na função `resumo_uso` do Supabase (só números somados, com a chave pública do app) e gera `ferramentas/saida/relatorio-uso-AAAA-MM-DD.pdf`. Com `--exemplo`, usa números inventados para conferir o visual. Precisa do Python com `reportlab`; as fontes ficam em `ferramentas/relatorio/fontes/`.

Uma tarefa agendada do Claude roda isso a cada 3 dias, no ambiente "medplan" (o único que libera o endereço do Supabase), e manda o PDF para o João.
