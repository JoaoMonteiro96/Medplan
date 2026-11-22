# Trilha original sintetizada aqui (sem direitos de terceiros). Ré maior, 96 bpm, piano elétrico + pad + batida leve.
import numpy as np, wave, sys, json
SR = 44100
DUR = float(sys.argv[1]); cliques = json.loads(sys.argv[2]); out = sys.argv[3]
N = int(SR * DUR); mix = np.zeros((N, 2)); rng = np.random.default_rng(7)
bpm = 96; beat = 60 / bpm; bar = 4 * beat
f = lambda m: 440 * 2 ** ((m - 69) / 12)
# Dmaj9 - Bm9 - Gmaj9 - A6sus
prog = [(38, [62, 66, 69, 73, 76]), (35, [59, 62, 66, 69, 73]), (31, [59, 62, 66, 67, 71]), (33, [57, 62, 64, 66, 69])]

def add(sig, t0, pan=0.0, g=1.0):
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0: return
    j = min(N, i + len(sig)); s = sig[:j - i] * g
    mix[i:j, 0] += s * (1 - pan) * 0.5 * 2 ** 0.5 / 1.4142; mix[i:j, 1] += s * (1 + pan) * 0.5

def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); z = 0.0
    # filtro de um polo vetorizado por blocos (suficiente para sons curtos)
    from scipy.signal import lfilter
    return lfilter([1 - a], [1, -a], x)

def epiano(m, dur, vel=1.0):
    n = int(dur * SR); x = np.arange(n) / SR; fr = f(m)
    mod = 1.6 * np.exp(-x * 5) * np.sin(2 * np.pi * fr * 2 * x)
    s = np.sin(2 * np.pi * fr * x + mod) * np.exp(-x * 1.4) + 0.18 * np.sin(2 * np.pi * fr * 3 * x) * np.exp(-x * 4)
    s *= 1 + 0.12 * np.sin(2 * np.pi * 4.5 * x)
    a = int(0.004 * SR); s[:a] *= np.linspace(0, 1, a); r = int(0.15 * SR); s[-r:] *= np.linspace(1, 0, r)
    return s * vel

def pad(notas, dur):
    n = int(dur * SR); x = np.arange(n) / SR; s = np.zeros(n)
    for m in notas:
        for dt in (-0.06, 0.06):
            fr = f(m - 12) * 2 ** (dt / 12)
            s += np.sin(2 * np.pi * fr * x + rng.random() * 6) + 0.3 * np.sin(4 * np.pi * fr * x) + 0.12 * np.sin(6 * np.pi * fr * x)
    e = np.minimum(1, x / 1.2) * np.minimum(1, (dur - x) / 1.0)
    return lp(s * e, 1800)

def kick():
    n = int(0.4 * SR); x = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(46 + 90 * np.exp(-x * 32)) / SR
    return np.sin(ph) * np.exp(-x * 7) + 0.15 * rng.standard_normal(n) * np.exp(-x * 120)
def snare():
    n = int(0.3 * SR); x = np.arange(n) / SR
    nz = lp(rng.standard_normal(n), 5000) - lp(rng.standard_normal(n), 900) * 0.5
    return (nz * np.exp(-x * 16) + 0.3 * np.sin(2 * np.pi * 190 * x) * np.exp(-x * 25))
def hat():
    n = int(0.07 * SR); x = np.arange(n) / SR; nz = rng.standard_normal(n); nz = nz - lp(nz, 7000)
    return nz * np.exp(-x * 70)
K, S, Hh = kick(), snare(), hat()

t = 0.0; k = 0
INI, FIM = 15.0, DUR - 12.0   # batida entra depois da abertura e sai antes do fim
duck = np.ones(N)
while t < DUR:
    root, notas = prog[k % 4]; L = 2 * bar
    add(pad(notas, L + 0.8), t, 0, 0.022)
    # piano elétrico: acordes sincopados
    for pos, vel in [(0, 1.0), (1.5, 0.7), (4, 0.85), (5.5, 0.6), (6.5, 0.55)]:
        st = t + pos * beat
        for i, m in enumerate(notas[:4]): add(epiano(m, 1.6, vel), st + i * 0.008, (i - 1.5) * 0.25, 0.05)
    # baixo
    for pos in (0, 2.5, 4, 6.5):
        n = int(beat * 1.4 * SR); x = np.arange(n) / SR
        b = np.sin(2 * np.pi * f(root) * x) + 0.25 * np.sin(4 * np.pi * f(root) * x)
        b *= np.minimum(1, x / 0.01) * np.exp(-x * 1.8); add(b, t + pos * beat, 0, 0.16 if INI <= t < FIM + 4 else 0.08)
    # arpejo suave
    if t >= 30 and t < FIM:
        arp = [notas[1] + 12, notas[2] + 12, notas[3] + 12, notas[4] + 12]
        for e in range(16):
            m = arp[(e * 3) % 4]; add(epiano(m, 0.7, 0.5), t + e * beat / 2, 0.5 if e % 2 else -0.5, 0.022)
    if INI <= t < FIM:
        for bt in range(8):
            st = t + bt * beat
            if bt % 2 == 0:
                add(K, st, 0, 0.33); i = int(st * SR); d = np.arange(min(int(0.25 * SR), N - i)) / SR
                if len(d): duck[i:i + len(d)] = np.minimum(duck[i:i + len(d)], 1 - 0.35 * np.exp(-d * 12))
            else: add(S, st, 0.05, 0.06)
            add(Hh, st + beat / 2, 0.3, 0.035); add(Hh, st, -0.3, 0.018)
    t += L; k += 1

# reverberação por convolução
ir_n = int(2.4 * SR); xi = np.arange(ir_n) / SR
wet = np.zeros_like(mix)
from scipy.signal import fftconvolve
for ch in range(2):
    ir = rng.standard_normal(ir_n) * np.exp(-xi * 2.6); ir = lp(ir, 4500); ir /= np.sqrt(np.sum(ir ** 2))
    wet[:, ch] = fftconvolve(mix[:, ch], ir)[:N]
mix = mix * 0.82 + wet * 0.22
mix *= duck[:, None] ** 0.6
# cliques de interface
for tc, tipo in cliques:
    n = int(0.05 * SR); x = np.arange(n) / SR
    s = (np.sin(2 * np.pi * (2200 if tipo == 'm' else 1500) * x) * np.exp(-x * 140) + 0.4 * rng.standard_normal(n) * np.exp(-x * 400))
    add(s, tc, 0.1, 0.06)
# masterização leve
t_ = np.arange(N) / SR
mix *= (np.minimum(1, t_ / 1.5) * np.minimum(1, (DUR - t_) / 4.0))[:, None]
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.3) / np.tanh(1.3) * 0.82
w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((mix * 32767).astype(np.int16).tobytes()); w.close(); print('ok', DUR)
