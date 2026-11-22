# Motor de composição do vídeo Sallos (1920x1080, 30 fps)
import json, math, os
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

V = os.path.dirname(os.path.abspath(__file__)); CAP = os.path.join(V, 'cap')
B = os.path.dirname(os.path.dirname(V))  # pasta do repositório
T = json.load(open(os.path.join(V, 'pontos.json')))
W, H, FPS = 1920, 1080, 30
FD = os.environ.get('SALLOS_FONTES', '/usr/share/fonts/opentype/inter/')  # pasta com a fonte Inter (.otf)
def font(name, size): return ImageFont.truetype(FD + name, size)
F_T = lambda s: font('InterDisplay-SemiBold.otf', s)
F_R = lambda s: font('Inter-Regular.otf', s)
F_M = lambda s: font('Inter-Medium.otf', s)
F_S = lambda s: font('Inter-SemiBold.otf', s) if os.path.exists(FD + 'Inter-SemiBold.otf') else F_M(s)

INK = (9, 22, 18); BG1 = (11, 26, 21); BG2 = (16, 40, 32); VERDE = (34, 197, 94); TXT = (238, 244, 241); DIM = (156, 178, 168)

# ---------- utilidades ----------
def ease(x):
    x = max(0.0, min(1.0, x)); return x * x * x * (x * (x * 6 - 15) + 10)
def kf(lst, t):
    """lista de (t, valores...) -> valores interpolados com easing"""
    if t <= lst[0][0]: return lst[0][1:]
    for a, b in zip(lst, lst[1:]):
        if a[0] <= t <= b[0]:
            k = ease((t - a[0]) / max(1e-6, b[0] - a[0]))
            return tuple(x + (y - x) * k for x, y in zip(a[1:], b[1:]))
    return lst[-1][1:]
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))

@lru_cache(maxsize=None)
def img(name):
    p = os.path.join(CAP, name)
    im = Image.open(p)
    return im.convert('RGBA') if name.endswith('.png') else im.convert('RGB')

@lru_cache(maxsize=1)
def fundo():
    bg = Image.new('RGB', (W, H), BG1)
    g = Image.new('L', (W, H), 0); d = ImageDraw.Draw(g)
    d.ellipse((900, -300, 2300, 1100), fill=120); d.ellipse((-500, 600, 700, 1500), fill=55)
    g = g.filter(ImageFilter.GaussianBlur(220))
    bg = Image.composite(Image.new('RGB', (W, H), BG2), bg, g)
    # granulação leve para não "bandear"
    import random; random.seed(3)
    n = Image.effect_noise((W, H), 6).convert('RGB')
    return ImageChops.add(bg, n, scale=1.0, offset=-128).convert('RGB') if False else bg

# ---------- câmera ----------
class Cam:
    def __init__(s, cx=960, cy=540, z=1.0): s.cx, s.cy, s.z = cx, cy, z
    def p(s, x, y): return ((x - s.cx) * s.z + 960, (y - s.cy) * s.z + 540)
    def r(s, x, y, w, h):
        a = s.p(x, y); return (a[0], a[1], w * s.z, h * s.z)

def place(canvas, src, rect, mask_radius=0, sq_top=False):
    """cola src (inteira) no retângulo de tela rect=(x,y,w,h), recortando o que fica fora"""
    x, y, w, h = rect
    if w < 1 or h < 1: return
    vx0, vy0 = max(0, x), max(0, y); vx1, vy1 = min(W, x + w), min(H, y + h)
    if vx1 <= vx0 or vy1 <= vy0: return
    sx = src.width / w; sy = src.height / h
    box = ((vx0 - x) * sx, (vy0 - y) * sy, (vx1 - x) * sx, (vy1 - y) * sy)
    ow, oh = int(round(vx1)) - int(round(vx0)), int(round(vy1)) - int(round(vy0))
    if ow < 1 or oh < 1: return
    part = src.resize((ow, oh), Image.LANCZOS if sx > 1.05 else Image.BICUBIC, box=box)
    m = None
    if mask_radius > 0:
        full = Image.new('L', (int(w) + 2, int(h) + 2), 0); dd = ImageDraw.Draw(full)
        dd.rounded_rectangle((0, 0, int(w), int(h)), radius=int(mask_radius), fill=255)
        if sq_top: dd.rectangle((0, 0, int(w), int(h) // 2), fill=255)
        ox, oy = int(round(vx0 - x)), int(round(vy0 - y))
        m = full.crop((ox, oy, ox + ow, oy + oh))
    if part.mode == 'RGBA':
        a = part.split()[3]
        m = a if m is None else ImageChops.multiply(a, m)
        part = part.convert('RGB')
    canvas.paste(part, (int(round(vx0)), int(round(vy0))), m)

@lru_cache(maxsize=8)
def sombra(w, h, r, blur, alpha):
    pad = blur * 3
    im = Image.new('L', (w + 2 * pad, h + 2 * pad), 0)
    ImageDraw.Draw(im).rounded_rectangle((pad, pad + blur // 2, pad + w, pad + h + blur // 2), radius=r, fill=alpha)
    im = im.filter(ImageFilter.GaussianBlur(blur))
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.putalpha(im); return out, pad

# ---------- telas (estado -> imagem na resolução da captura) ----------
def tela_desk(st, t):
    if st[0] == 'vp': return img(st[1] + '.jpg')
    n = st[1]; y = kf(st[2], t)[0] if len(st) > 2 else 0
    full = img(n + '-full.jpg'); D = 2
    y = int(clamp(y, 0, (full.height / D) - 900) * D)
    out = full.crop((0, y, 2880, y + 1800)).copy()
    top = img(n + '-top.png'); side = img(n + '-side.png')
    out.paste(top.convert('RGB'), (int(T['dtop'][0] * D), 0)); out.paste(side.convert('RGB'), (0, 0))
    return out

def tela_cel(st, t):
    D = 3
    if st[0] == 'vp': base = img(st[1] + '.jpg')
    else:
        n = st[1]; y = kf(st[2], t)[0] if len(st) > 2 else 0
        full = img(n + '-full.jpg'); vp = img(n + '-vp.jpg')
        y = int(clamp(y, 0, full.height / D - 844) * D)
        base = full.crop((0, y, 1170, y + 2532)).copy()
        top = img(n + '-top.png'); base.paste(top.convert('RGB'), (0, 0))
        for k, rr in (('mdock', 26),):
            x0, y0, w0, h0 = [int(v * D) for v in T[k]]
            m = Image.new('L', (w0, h0), 0); ImageDraw.Draw(m).rounded_rectangle((1, 1, w0 - 2, h0 - 2), radius=int(rr * D), fill=255)
            base.paste(vp.crop((x0, y0, x0 + w0, y0 + h0)), (x0, y0), m)
    # barra de status do aparelho
    out = Image.new('RGB', (1170, 2532 + 132), base.getpixel((600, 6)))
    out.paste(base, (0, 132))
    d = ImageDraw.Draw(out); cor = (17, 24, 22) if sum(base.getpixel((600, 6))) > 380 else (240, 240, 240)
    d.text((150, 66), '9:41', font=F_S(46), fill=cor, anchor='mm')
    bx = 1000; d.rounded_rectangle((bx, 48, bx + 72, 84), radius=10, outline=cor, width=4); d.rounded_rectangle((bx + 7, 55, bx + 58, 77), radius=5, fill=cor); d.rectangle((bx + 76, 58, bx + 81, 74), fill=cor)
    for i in range(4): d.rounded_rectangle((870 + i * 22, 82 - 10 - i * 9, 884 + i * 22, 84), radius=3, fill=cor)
    return out

def mistura(fn, estados, t):
    """estados: [(t0, st)], troca com fusão de 0.28s"""
    cur = 0
    for i, (t0, st) in enumerate(estados):
        if t >= t0: cur = i
    im = fn(estados[cur][1], t)
    if cur > 0:
        k = (t - estados[cur][0]) / 0.28
        if k < 1: im = Image.blend(fn(estados[cur - 1][1], t), im, ease(k))
    return im

# ---------- molduras ----------
DESK = (520, 96, 1340, 44 + 1340 * 900 / 1440)   # janela do navegador (mundo)
CEL = dict(cx=1290, cy=540, h=900)               # celular (mundo)

def desenha_janela(cv, cam, conteudo, rect=DESK):
    x, y, w, h = cam.r(*rect); z = cam.z
    sh, pad = sombra(int(rect[2]), int(rect[3]), 16, 34, 150)
    place(cv, sh, (x - pad * z, y - pad * z, sh.width * z, sh.height * z))
    d = ImageDraw.Draw(cv)
    d.rounded_rectangle((x, y, x + w, y + h), radius=int(16 * z), fill=(232, 236, 234))
    ch = 44 * z
    for i, c in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
        cx = x + (24 + i * 22) * z; d.ellipse((cx - 6.5 * z, y + ch / 2 - 6.5 * z, cx + 6.5 * z, y + ch / 2 + 6.5 * z), fill=c)
    uw = 360 * z; ux = x + w / 2 - uw / 2
    d.rounded_rectangle((ux, y + 9 * z, ux + uw, y + ch - 9 * z), radius=int(8 * z), fill=(255, 255, 255))
    if z < 2.6: d.text((x + w / 2, y + ch / 2), 'sallos.com.br', font=F_M(max(8, int(15 * z))), fill=(90, 104, 98), anchor='mm')
    place(cv, conteudo, (x, y + ch, w, h - ch), mask_radius=16 * z, sq_top=True)
    return (x, y + ch, w, h - ch)  # área do app na tela

def cel_rect(c=CEL):
    sh_ = c['h']; sw = sh_ * 1170 / (2532 + 132); bz = 13
    return (c['cx'] - sw / 2 - bz, c['cy'] - sh_ / 2 - bz, sw + 2 * bz, sh_ + 2 * bz), bz

def desenha_cel(cv, cam, conteudo, c=CEL):
    (wx, wy, ww, wh), bz = cel_rect(c)
    x, y, w, h = cam.r(wx, wy, ww, wh); z = cam.z
    sh, pad = sombra(int(ww), int(wh), 64, 40, 170)
    place(cv, sh, (x - pad * z, y - pad * z, sh.width * z, sh.height * z))
    d = ImageDraw.Draw(cv)
    d.rounded_rectangle((x - 2 * z, y - 2 * z, x + w + 2 * z, y + h + 2 * z), radius=int(66 * z), fill=(58, 66, 63))
    d.rounded_rectangle((x, y, x + w, y + h), radius=int(64 * z), fill=(8, 10, 10))
    sx, sy, sw, sh2 = x + bz * z, y + bz * z, w - 2 * bz * z, h - 2 * bz * z
    place(cv, conteudo, (sx, sy, sw, sh2), mask_radius=52 * z)
    iw, ih = 112 * z, 32 * z
    d.rounded_rectangle((x + w / 2 - iw / 2, sy + 12 * z, x + w / 2 + iw / 2, sy + 12 * z + ih), radius=int(ih / 2), fill=(0, 0, 0))
    # área do app (sem barra de status): 44 css px de status em 884
    k = sh2 / (2532 + 132)
    return (sx, sy + 132 * k, sw, 2532 * k)

# ---------- texto ----------
def quebra(txt, f, larg):
    linhas = []
    for par in txt.split('\n'):
        l = ''
        for w_ in par.split(' '):
            tt = (l + ' ' + w_).strip()
            if f.getlength(tt) <= larg: l = tt
            else: linhas.append(l); l = w_
        linhas.append(l)
    return linhas

@lru_cache(maxsize=64)
def bloco(titulo, corpo, larg, ts=58, bs=27):
    ft, fb = F_T(ts), F_R(bs)
    lt = quebra(titulo, ft, larg); lb = quebra(corpo, fb, larg) if corpo else []
    hT = len(lt) * int(ts * 1.12); hB = len(lb) * int(bs * 1.5)
    a = Image.new('RGBA', (larg + 10, hT + 30), (0, 0, 0, 0)); d = ImageDraw.Draw(a)
    for i, l in enumerate(lt): d.text((0, i * int(ts * 1.12)), l, font=ft, fill=TXT)
    b = Image.new('RGBA', (larg + 10, max(1, hB + 20)), (0, 0, 0, 0)); d = ImageDraw.Draw(b)
    for i, l in enumerate(lb): d.text((0, i * int(bs * 1.5)), l, font=fb, fill=DIM)
    return a, b

def cola_alpha(cv, im, xy, alpha):
    if alpha <= 0.01: return
    if alpha < 0.999:
        im = im.copy(); im.putalpha(im.split()[3].point(lambda v: int(v * alpha)))
    cv.paste(im.convert('RGB'), (int(xy[0]), int(xy[1])), im.split()[3])

def texto_lateral(cv, t, titulo, corpo, x, larg, alpha=1.0, yc=540, saida=None):
    a, b = bloco(titulo, corpo, larg)
    total = a.height + 26 + b.height + 40
    y0 = yc - total / 2
    for i, (im, dy, t0) in enumerate([(None, 0, 0.25), (a, 40, 0.35), (b, 40 + a.height + 18, 0.6)]):
        k = ease((t - t0) / 0.7); al = k * alpha
        if saida is not None: al *= 1 - ease((t - saida) / 0.45)
        off = (1 - k) * 26
        if im is None:
            if al > 0.01:
                d = ImageDraw.Draw(cv); c = tuple(int(BG1[j] + (VERDE[j] - BG1[j]) * al) for j in range(3))
                d.rounded_rectangle((x, y0 + off, x + 46, y0 + off + 5), radius=2, fill=c)
        else: cola_alpha(cv, im, (x, y0 + dy + off), al)

def legenda(cv, t, t0, t1, txt, esq=None):
    k = ease((t - t0) / 0.4) * (1 - ease((t - t1 + 0.4) / 0.4))
    if k <= 0.01: return
    f = F_M(30 if esq is None else 27); tw = f.getlength(txt); pw, ph = tw + 64, 72 if esq is None else 64
    x = 960 - pw / 2 if esq is None else esq[0]; y = (H - 70 - ph if esq is None else esq[1]) + (1 - k) * 18
    lay = Image.new('RGBA', (int(pw) + 2, ph + 2), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    d.rounded_rectangle((0, 0, pw, ph), radius=ph // 2, fill=(10, 24, 19, 235))
    d.ellipse((24, ph / 2 - 6, 36, ph / 2 + 6), fill=VERDE + (255,))
    d.text((48, ph / 2), txt, font=f, fill=TXT + (255,), anchor='lm')
    cola_alpha(cv, lay, (x, y), k)

# ---------- cursor e toque ----------
@lru_cache(maxsize=1)
def seta():
    s = 4; pts = [(0, 0), (0, 17), (4.2, 13.2), (7, 19.5), (9.6, 18.4), (6.9, 12.3), (12.3, 12.3)]
    im = Image.new('RGBA', (16 * s * 3, 24 * s * 3), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    P = [(x * s * 3 + 6, y * s * 3 + 6) for x, y in pts]
    sh = Image.new('L', im.size, 0); ImageDraw.Draw(sh).polygon([(x + 6, y + 10) for x, y in P], fill=110); sh = sh.filter(ImageFilter.GaussianBlur(10))
    im.putalpha(sh); d = ImageDraw.Draw(im); d.polygon(P, fill=(255, 255, 255, 255)); d.line(P + [P[0]], fill=(20, 20, 20, 255), width=8, joint='curve')
    return im.resize((im.width // 3, im.height // 3), Image.LANCZOS)

def cursor(cv, xy, z, clique_k=None):
    x, y = xy
    if clique_k is not None and 0 <= clique_k <= 1:
        r = 10 + 34 * ease(clique_k); a = int(150 * (1 - clique_k))
        lay = Image.new('RGBA', (120, 120), (0, 0, 0, 0)); ImageDraw.Draw(lay).ellipse((60 - r, 60 - r, 60 + r, 60 + r), outline=(34, 197, 94, a), width=5)
        cv.paste(lay.convert('RGB'), (int(x - 60), int(y - 60)), lay.split()[3])
    s = seta(); sc = 0.5 * (z ** 0.35)
    if clique_k is not None and 0 <= clique_k < 0.35: sc *= 0.88
    s2 = s.resize((int(s.width * sc), int(s.height * sc)), Image.LANCZOS)
    cv.paste(s2.convert('RGB'), (int(x - 3 * sc), int(y - 3 * sc)), s2.split()[3])

def toque(cv, xy, k, z=1):
    """k de -0.35 (aparece) a 1 (some)"""
    x, y = xy
    if k < -0.35 or k > 1: return
    if k < 0: a = ease((k + 0.35) / 0.35); r = 30
    else: a = 1 - ease(k); r = 30 + 26 * ease(k)
    r *= z ** 0.5
    lay = Image.new('RGBA', (200, 200), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    d.ellipse((100 - r, 100 - r, 100 + r, 100 + r), fill=(255, 255, 255, int(120 * a)), outline=(20, 30, 26, int(150 * a)), width=3)
    if k >= 0: d.ellipse((100 - 14, 100 - 14, 100 + 14, 100 + 14), fill=(20, 30, 26, int(90 * a)))
    cv.paste(lay.convert('RGB'), (int(x - 100), int(y - 100)), lay.split()[3])
