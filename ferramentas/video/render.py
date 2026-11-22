import sys, os, subprocess
from functools import lru_cache
from PIL import Image, ImageDraw
from motor import *
from cenas import CENAS, c as centro

@lru_cache(maxsize=1)
def logo():
    return Image.open(os.path.join(B, 'sallos-512.png')).convert('RGBA')

def marca(cv, cx, cy, s, alpha, t_logo=1.0):
    """ícone + 'Sallos' centralizados"""
    f = F_T(int(120 * s)); partes = [('Sa', TXT), ('ll', VERDE), ('os', TXT)]
    tw = sum(f.getlength(p) for p, _ in partes); L = int(132 * s); gap = 34 * s
    x0 = cx - (L + gap + tw) / 2
    k = ease(t_logo); Ls = max(1, int(L * (0.82 + 0.18 * k)))
    lg = logo().resize((Ls, Ls), Image.LANCZOS)
    cola_alpha(cv, lg, (x0 + (L - Ls) / 2, cy - Ls / 2), alpha * k)
    lay = Image.new('RGBA', (int(tw) + 20, int(170 * s)), (0, 0, 0, 0)); d = ImageDraw.Draw(lay); x = 0
    for p, cor in partes: d.text((x, lay.height / 2), p, font=f, fill=cor + (255,), anchor='lm'); x += f.getlength(p)
    cola_alpha(cv, lay, (x0 + L + gap, cy - lay.height / 2), alpha)

def centro_txt(cv, txt, f, cor, y, alpha, dy=0):
    lay = Image.new('RGBA', (int(f.getlength(txt)) + 20, int(f.size * 1.6)), (0, 0, 0, 0))
    ImageDraw.Draw(lay).text((10, lay.height / 2), txt, font=f, fill=cor + (255,), anchor='lm')
    cola_alpha(cv, lay, (960 - lay.width / 2, y - lay.height / 2 + dy), alpha)

def quadro(cn, t):
    cv = fundo().copy(); tipo = cn['tipo']
    if tipo == 'titulo':
        a = ease((t - 0.3) / 0.9)
        marca(cv, 960, 470, 1.0, a, (t - 0.3) / 1.1)
        k = ease((t - 1.5) / 0.8); centro_txt(cv, 'As finanças do médico, organizadas.', F_R(40), DIM, 630, k, (1 - k) * 16)
        k = ease((t - 2.3) / 0.8); centro_txt(cv, 'Plantões, contas, impostos e investimentos num lugar só.', F_R(28), (110, 136, 125), 690, k, (1 - k) * 16)
        return cv
    if tipo == 'fim':
        a = ease((t - 0.2) / 0.8); marca(cv, 960, 330, 0.72, a, (t - 0.2) / 1.0)
        k = ease((t - 0.9) / 0.8); centro_txt(cv, 'Convite para testar por 1 mês', F_T(68), TXT, 500, k, (1 - k) * 18)
        k = ease((t - 1.5) / 0.8); centro_txt(cv, 'Lance seus plantões e contas no dia a dia e me conte o que achou.', F_R(32), DIM, 590, k, (1 - k) * 18)
        k = ease((t - 2.3) / 0.8)
        if k > 0.01:
            f = F_S(36); txt = 'sallos.com.br'; pw = f.getlength(txt) + 90; ph = 84
            lay = Image.new('RGBA', (int(pw) + 2, ph + 2), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
            d.rounded_rectangle((0, 0, pw, ph), radius=ph // 2, fill=VERDE + (255,))
            d.text((pw / 2, ph / 2), txt, font=f, fill=(6, 30, 18, 255), anchor='mm')
            cola_alpha(cv, lay, (960 - pw / 2, 700 + (1 - k) * 18), k)
        k = ease((t - 3.0) / 0.8); centro_txt(cv, 'Abra no navegador do celular e toque em "Adicionar à tela inicial".', F_R(26), (110, 136, 125), 830, k)
        return cv
    z = 1.0; cx, cy = 960, 540
    if cn.get('cam'): cx, cy, z = kf(cn['cam'], t)
    cam = Cam(cx, cy, z)
    if tipo == 'duo':
        r = (110, 150, 1240, 44 + 1240 * 900 / 1440)
        desenha_janela(cv, cam, img('d-inicio-vp.jpg'), r)
        desenha_cel(cv, cam, tela_cel(('vp', 'm-inicio-vp'), t), dict(cx=1480, cy=560, h=820))
    elif tipo == 'desk':
        app = desenha_janela(cv, cam, mistura(tela_desk, cn['est'], t))
        ax, ay, aw, ah = app; s = aw / 1440
        if cn.get('cur'):
            x, y = kf(cn['cur'], t); ck = None
            for tc in cn.get('cliques', []):
                if tc - 0.1 <= t <= tc + 0.7: ck = (t - tc) / 0.6
            cursor(cv, (ax + x * s, ay + y * s), z, ck)
    else:
        app = desenha_cel(cv, cam, mistura(tela_cel, cn['est'], t))
        ax, ay, aw, ah = app; s = aw / 390
        for tc, x, y in cn.get('toques', []):
            toque(cv, (ax + x * s, ay + y * s), (t - tc) / 0.45 if t >= tc else (t - tc) / 0.45 * 1.0, z)
        for t0, t1, x0, y0, x1, y1 in cn.get('arrastos', []):
            if t0 - 0.25 <= t <= t1 + 0.3:
                k = ease((t - t0) / (t1 - t0)); x = x0 + (x1 - x0) * k; y = y0 + (y1 - y0) * k
                kk = -0.35 + 0.35 * clamp((t - t0 + 0.25) / 0.25) if t < t1 else (t - t1) / 0.3
                toque(cv, (ax + x * s, ay + y * s), min(kk, 1.0) if t >= t1 else min(-0.0001, kk), z)
    if cn.get('texto'):
        al = 1 - clamp((z - 1.0) / 0.2)
        if tipo == 'desk': texto_lateral(cv, t, *cn['texto'], x=92, larg=370, alpha=al)
        else: texto_lateral(cv, t, *cn['texto'], x=190, larg=640, alpha=al)
    for t0, t1, txt in cn.get('leg', []): legenda(cv, t, t0, t1, txt, (172, 820) if tipo == 'cel' else None)
    return cv

def renderiza(i, saida):
    cn = CENAS[i]; n = int(round(cn['dur'] * FPS)); X = 15
    ant = quadro(CENAS[i - 1], CENAS[i - 1]['dur'] - 1 / FPS) if i > 0 else Image.new('RGB', (W, H), INK)
    tmp = saida + '.tmp.mp4'
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-threads', '1', tmp], stdin=subprocess.PIPE)
    for f in range(n):
        t = f / FPS; im = quadro(cn, t)
        if f < X: im = Image.blend(ant, im, ease((f + 1) / (X + 1)))
        if i == len(CENAS) - 1 and t > cn['dur'] - 1.2: im = Image.blend(im, Image.new('RGB', (W, H), INK), ease((t - cn['dur'] + 1.2) / 1.2))
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()
    if p.returncode == 0: os.replace(tmp, saida)
    return p.returncode

if __name__ == '__main__':
    if sys.argv[1] == 'quadro':
        i, t = int(sys.argv[2]), float(sys.argv[3]); quadro(CENAS[i], t).save(sys.argv[4], quality=90)
    else:
        for i in map(int, sys.argv[2:]):
            os.makedirs(os.path.join(V, 'parts'), exist_ok=True)
            print(i, CENAS[i]['nome'], renderiza(i, os.path.join(V, 'parts', f'{i:02d}.mp4')), flush=True)
