#!/usr/bin/env python3
"""Trilha e efeitos sonoros do vídeo, sintetizados do zero (material próprio, sem amostras de terceiros).

Gera em public/audio/:
  trilha.wav            trilha instrumental (≈ duração do vídeo), seguindo os atos do roteiro
  sfx/*.wav             efeitos: whoosh, toque, digitação, pop, tique, contador, confirmação, assinatura do logo, subida

Os momentos da trilha vêm de src/data/narracao.json (marcos da narração) + NARRACAO_INICIO,
então a música acompanha a locução mesmo se a narração for regravada.
Uso: python3 scripts/gerar_trilha.py
"""
import json, pathlib
import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve, butter, sosfilt

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SR = 48000
NARRACAO_INICIO = 0.5  # igual a src/timeline.ts
DURACAO = 58.0         # igual a src/timeline.ts
rng = np.random.default_rng(7)


def marcos():
    """Marcos da narração do vídeo institucional (s do vídeo)."""
    return {k: v + NARRACAO_INICIO for k, v in json.loads((RAIZ / "src/data/narracao.json").read_text())["marcos"].items()}

def hz(nota):
    """'D3' -> frequência."""
    nomes = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    n, o = nota[:-1], int(nota[-1])
    return 440.0 * 2 ** ((nomes[n] + (o - 4) * 12) / 12)

def env(n, a, r, sus=1.0):
    e = np.ones(n) * sus
    ka, kr = int(a * SR), int(r * SR)
    if ka: e[:ka] = np.linspace(0, sus, ka) ** 1.6
    if kr: e[-kr:] *= np.linspace(1, 0, kr) ** 1.4
    return e

def lp(x, fc, ordem=2):
    return sosfilt(butter(ordem, fc, "low", fs=SR, output="sos"), x)

def hp(x, fc, ordem=2):
    return sosfilt(butter(ordem, fc, "high", fs=SR, output="sos"), x)

def bp(x, f1, f2):
    return sosfilt(butter(2, [f1, f2], "band", fs=SR, output="sos"), x)

def ir(dur=2.4, decai=3.2):
    n = int(dur * SR); t = np.arange(n) / SR
    base = rng.standard_normal((2, n)) * np.exp(-decai * t)
    return np.stack([lp(base[0], 6000), lp(base[1], 6000)]) * 0.05

IR = ir()

def reverb(st, mix):
    out = np.stack([fftconvolve(st[0], IR[0])[: st.shape[1]], fftconvolve(st[1], IR[1])[: st.shape[1]]])
    return st * (1 - mix) + out * mix * 3

class Pista:
    def __init__(self, dur):
        self.x = np.zeros((2, int(dur * SR) + SR))
    def add(self, t, sinal, gan=1.0, pan=0.0):
        i = int(t * SR)
        if sinal.ndim == 1:
            sinal = np.stack([sinal * (1 - max(pan, 0)), sinal * (1 + min(pan, 0))])
        f = min(self.x.shape[1], i + sinal.shape[1])
        self.x[:, i:f] += sinal[:, : f - i] * gan

def pad(notas, dur, a=1.4, r=1.8, brilho=5.0):
    n = int(dur * SR); t = np.arange(n) / SR; L = np.zeros(n); R = np.zeros(n)
    for nota in notas:
        f = hz(nota)
        for k in range(1, 9):
            amp = np.exp(-k / brilho) / k
            for det, lado in ((-0.11, 0), (0.0, 2), (0.12, 1)):
                fase = rng.uniform(0, 2 * np.pi)
                s = amp * np.sin(2 * np.pi * f * k * (1 + det / 100 * k) * t + fase)
                if lado in (0, 2): L += s
                if lado in (1, 2): R += s
    e = env(n, a, r) * (1 + 0.06 * np.sin(2 * np.pi * 0.17 * t))
    return np.stack([L, R]) * e / (len(notas) * 4)

def pluck(nota, dur=0.9, brilho=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(nota)
    s = np.sin(2 * np.pi * f * t) + 0.35 * brilho * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 9) + 0.12 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 14)
    return s * np.exp(-t * 5.5) * env(n, 0.003, 0.05)

def sino(nota, dur=2.5):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(nota)
    parciais = [(1, 1, 1.6), (2.0, 0.45, 2.4), (2.76, 0.25, 3.5), (5.4, 0.12, 6), (8.9, 0.05, 9)]
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in parciais)
    return s * env(n, 0.002, 0.2)

def kick(gan=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 46 + 70 * np.exp(-t * 28)
    fase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(fase) * np.exp(-t * 7.5) * gan

def hat(dur=0.06, gan=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-t * 70) * 0.35 * gan

def sub(nota, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * hz(nota) * t) * env(n, 0.04, 0.25) * 0.55

def ruido_varrido(dur, f0, f1, curva=2.0):
    """Ruído passando por um passa-banda que sobe de f0 a f1 (subidas e whooshes)."""
    n = int(dur * SR); x = rng.standard_normal(n); out = np.zeros(n); bloco = 1024
    for i in range(0, n, bloco):
        p = (i / n) ** curva; fc = f0 * (f1 / f0) ** p
        out[i:i + bloco] = bp(x[max(0, i - 2048):i + bloco], fc * 0.7, min(fc * 1.4, SR / 2 - 100))[-len(out[i:i + bloco]):]
    return out

# ---------------------------------------------------------------- trilha
def trilha():
    m = marcos()
    BPM = 100; BEAT = 60 / BPM; COMPASSO = 4 * BEAT
    P = Pista(DURACAO)
    bus_pad = Pista(DURACAO); bus_pluck = Pista(DURACAO); bus_ritmo = Pista(DURACAO)

    # Ato 1 — incerteza (0 → marca): acorde suspenso grave, pulso de tique e subida até a revelação.
    hook_fim = m["ondePasso"]
    bus_pad.add(0.0, pad(["B2", "F#3", "C#4", "E4"], hook_fim + 0.4, a=0.25, r=0.6, brilho=3.5), 0.9)
    t = 0.0
    while t < m["praResponder"] - 0.2:
        bus_ritmo.add(t, hat(0.04, 0.7), 1.0, pan=0.25)
        bus_ritmo.add(t + BEAT / 2, hat(0.03, 0.4), 1.0, pan=-0.25)
        t += BEAT
    for i, tt in enumerate(np.arange(m["eAgora"], m["praResponder"], BEAT / 2)):
        bus_pluck.add(tt, pluck(["B4", "F#5", "C#5", "E5"][i % 4], 0.5, 0.6), 0.18 + 0.03 * i, pan=0.3 * np.sin(i))
    sub_ = ruido_varrido(hook_fim - m["praResponder"] + 0.3, 300, 6000, 1.6) * np.linspace(0, 1, int((hook_fim - m["praResponder"] + 0.3) * SR)) ** 2
    P.add(m["praResponder"] - 0.3, sub_ * 0.22)

    # Ato 2 — descoberta (marca → fim da explicação): progressão D – A – Bm – G com batida leve.
    grupo_ini = hook_fim
    grupo_fim = m["naoEPromessa"] - 0.25
    acordes = [("D3", ["D3", "A3", "D4", "F#4"], ["D5", "F#5", "A5", "E5"]),
               ("A2", ["A2", "E3", "C#4", "E4"], ["C#5", "E5", "A5", "E5"]),
               ("B2", ["B2", "F#3", "D4", "F#4"], ["D5", "F#5", "B5", "F#5"]),
               ("G2", ["G2", "D3", "B3", "D4"], ["B4", "D5", "G5", "D5"])]
    P.add(hook_fim, kick(1.3), 0.9)
    t = grupo_ini; i = 0
    while t < grupo_fim:
        raiz, notas, arp = acordes[i % 4]
        d = min(COMPASSO, grupo_fim - t + 0.01)
        bus_pad.add(t, pad(notas, d + 1.2, a=0.6 if i else 0.05, r=1.2, brilho=4.5), 0.75)
        P.add(t, np.stack([sub(raiz, d)] * 2) * 0.55)
        for b in range(4):
            tb = t + b * BEAT
            if tb >= grupo_fim: break
            if b in (0, 2) and t > m["digita"] - 0.3: P.add(tb, kick(0.85), 0.8)
            if t > m["escolhe"] - 0.3: bus_ritmo.add(tb + BEAT / 2, hat(0.05, 0.9), 1.0, pan=0.2)
            for s in range(2):
                ts = tb + s * BEAT / 2
                if ts < grupo_fim and t > m["digita"] - 0.3:
                    bus_pluck.add(ts, pluck(arp[(b * 2 + s) % 4], 0.8), 0.20, pan=(-0.35 if s else 0.35))
        t += COMPASSO; i += 1

    # Ato 3 — clareza: tira a batida, fica pad aberto + notas de sino.
    cl_ini = grupo_fim
    bus_pad.add(cl_ini, pad(["G2", "D3", "A3", "B3", "F#4"], m["ondePassoFinal"] - cl_ini + 0.6, a=0.5, r=0.9, brilho=6), 0.8)
    for k, (tt, nota) in enumerate([(m["clareza"], "A5"), (m["proximoPasso"], "F#5"), (m["proximoPasso"] + 0.45, "D6")]):
        bus_pluck.add(tt, sino(nota, 2.5), 0.10)

    # Ato 4 — assinatura do logo + resolução em Dmaj9 até o fim.
    fim_ini = m["ondePassoFinal"]
    bus_pad.add(fim_ini, pad(["D3", "A3", "E4", "F#4", "C#5"], DURACAO - fim_ini + 0.5, a=0.08, r=4.0, brilho=6), 0.9)
    P.add(fim_ini, np.stack([sub("D2", 3.5)] * 2) * 0.7)
    P.add(fim_ini, kick(1.2), 0.8)
    for k, nota in enumerate(["D5", "F#5", "A5", "C#6"]):
        bus_pluck.add(fim_ini + 0.09 * k, sino(nota, 3.5), 0.13)

    mix = reverb(bus_pad.x, 0.35) * 0.95 + reverb(bus_pluck.x, 0.3) + bus_ritmo.x * 0.6 + P.x
    mix = mix[:, : int(DURACAO * SR)]
    mix *= env(mix.shape[1], 0.02, 3.0)  # saída em fade nos 3 s finais
    mix /= np.max(np.abs(mix)) / 0.89      # pico em ≈ -1 dBFS
    (RAIZ / "public/audio/sfx").mkdir(parents=True, exist_ok=True)
    wavfile.write(RAIZ / "public/audio/trilha.wav", SR, (mix.T * 32767).astype(np.int16))

# ---------------------------------------------------------------- efeitos
def salvar(nome, x, pico=0.8):
    x = np.atleast_2d(x)
    if x.shape[0] == 1: x = np.vstack([x, x])
    x = x / (np.max(np.abs(x)) + 1e-9) * pico
    wavfile.write(RAIZ / f"public/audio/sfx/{nome}.wav", SR, (x.T * 32767).astype(np.int16))

def whoosh(dur=0.7, f0=400, f1=5000):
    n = int(dur * SR); s = ruido_varrido(dur, f0, f1, 1.0)
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    return reverb(np.stack([s * e * np.linspace(1, 0.4, n), s * e * np.linspace(0.4, 1, n)]), 0.25)

def toque():
    n = int(0.09 * SR); t = np.arange(n) / SR
    clique = np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 90) * 0.5 + np.sin(2 * np.pi * 180 * t) * np.exp(-t * 45)
    return clique

def tecla():
    n = int(0.05 * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 2500) * np.exp(-t * 120) * 0.6 + np.sin(2 * np.pi * 420 * t) * np.exp(-t * 80) * 0.4

def pop(f=880):
    n = int(0.16 * SR); t = np.arange(n) / SR
    fq = f * (1 + 0.6 * np.exp(-t * 40))
    return np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.exp(-t * 26)

def tique():
    n = int(0.03 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 200)

def contador(dur):
    """Tiques que aceleram e depois freiam (números rolando até assentar)."""
    x = np.zeros(int(dur * SR) + SR); tt = 0.0; k = 0
    while tt < dur:
        p = tt / dur; passo = 0.025 + 0.11 * p ** 3
        tq = tique() * (0.5 + 0.5 * (1 - p)); i = int(tt * SR); x[i:i + len(tq)] += tq
        tt += passo; k += 1
    return x[: int(dur * SR) + int(0.1 * SR)]

def confirma():
    a = sino("A5", 1.2) * 0.6; b = sino("E6", 1.4) * 0.5
    x = np.zeros(int(1.6 * SR)); x[: len(a)] += a; i = int(0.11 * SR); x[i:i + len(b)] += b[: len(x) - i]
    return reverb(np.stack([x, x]), 0.3)

def assinatura():
    x = np.zeros((2, int(3.8 * SR)))
    for k, nota in enumerate(["D5", "A5", "F#6"]):
        s = sino(nota, 3.4) * (0.55 - 0.1 * k); i = int(k * 0.07 * SR)
        x[:, i:i + len(s)] += np.stack([s * (1 - 0.2 * k), s * (0.8 + 0.2 * k)])[:, : x.shape[1] - i]
    return reverb(x, 0.4)

def efeitos():
    m = marcos()
    salvar("whoosh", whoosh())
    salvar("whoosh-curto", whoosh(0.4, 800, 7000), 0.6)
    salvar("toque", toque(), 0.7)
    salvar("tecla", tecla(), 0.5)
    salvar("pop", pop(), 0.5)
    salvar("pop-grave", pop(520), 0.5)
    salvar("contador", contador(m["n720"] + 1.0 - 0.1), 0.45)
    salvar("confirma", confirma(), 0.6)
    salvar("assinatura", assinatura(), 0.75)
    salvar("subida", ruido_varrido(1.4, 200, 8000, 2.2) * np.linspace(0, 1, int(1.4 * SR)) ** 2, 0.5)
    print("ok: trilha.wav e", len(list((RAIZ / "public/audio/sfx").glob("*.wav"))), "efeitos")


if __name__ == "__main__":
    trilha()
    efeitos()
