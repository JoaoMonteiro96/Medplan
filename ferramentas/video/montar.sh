#!/bin/bash
# junta as cenas, gera a trilha com os cliques e faz a versão para o site
set -e
V=$(cd "$(dirname "$0")" && pwd); cd "$V"
python3 - <<'PY'
import json
from cenas import CENAS
t = 0; cl = []
for cn in CENAS:
    for tc in cn.get('cliques', []): cl.append([round(t + tc, 2), 'd'])
    for tq in cn.get('toques', []): cl.append([round(t + tq[0], 2), 'm'])
    t += cn['dur']
json.dump(cl, open('cliques.json', 'w')); open('duracao.txt', 'w').write(str(t)); print('duração', t, 'cliques', len(cl))
PY
DUR=$(cat duracao.txt)
python3 musica.py "$DUR" "$(cat cliques.json)" musica.wav
ls parts/*.mp4 | sort | sed "s#^#file '#; s#\$#'#" > lista.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i lista.txt -c copy video.mp4
ffmpeg -y -loglevel error -i video.mp4 -i musica.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart Sallos-demonstracao.tmp.mp4 && mv Sallos-demonstracao.tmp.mp4 Sallos-demonstracao.mp4
ffmpeg -y -loglevel error -i Sallos-demonstracao.mp4 -vf scale=1280:720 -c:v libx264 -preset veryfast -crf 27 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart site.tmp.mp4 && mv site.tmp.mp4 site.mp4
ls -la Sallos-demonstracao.mp4 site.mp4 | awk '{print $5, $9}'
echo "Para o site: cp site.mp4 ../../conheca/sallos-demonstracao.mp4"
