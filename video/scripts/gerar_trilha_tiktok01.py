#!/usr/bin/env python3
"""TikTok 01: trilha leve e tecnológica (~29 s) + efeito "salvar", sintetizados do zero (material próprio).

Usa os instrumentos de scripts/gerar_trilha.py e os marcos de src/tiktok/narracao.json.
Saída: public/audio/tiktok01/trilha.wav e public/audio/sfx/salvar.wav
"""
import json, sys, pathlib
import numpy as np
from scipy.io import wavfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import gerar_trilha as G  # instrumentos (pad, pluck, sino, kick, hat, sub, ruido_varrido, reverb, Pista…)

RAIZ = G.RAIZ; SR = G.SR
INICIO = 0.15; DURACAO = 29.0  # iguais a src/tiktok/timeline.ts
m = {k: v + INICIO for k, v in json.loads((RAIZ / "src/tiktok/narracao.json").read_text())["marcos"].items()}

BPM = 112; BEAT = 60 / BPM; COMP = 4 * BEAT
P = G.Pista(DURACAO); pad = G.Pista(DURACAO); dedo = G.Pista(DURACAO); ritmo = G.Pista(DURACAO)
# Progressão em Ré maior, mais leve que a do institucional: D – Bm – G – A.
AC = [("D2", ["D3", "A3", "D4", "F#4"], ["A4", "D5", "F#5", "A5"]),
      ("B1", ["B2", "F#3", "D4", "F#4"], ["F#4", "B4", "D5", "F#5"]),
      ("G1", ["G2", "D3", "B3", "D4"], ["G4", "B4", "D5", "B4"]),
      ("A1", ["A2", "E3", "C#4", "E4"], ["A4", "C#5", "E5", "C#5"])]

# Gancho e problema: pulso e arpejo desde o 1º quadro (energia imediata), sem bumbo.
quebra = m["noOndePasso"] - 0.1
t = 0.0; i = 0
while t < DURACAO - 2.5:
    raiz, notas, arp = AC[i % 4]
    d = min(COMP, DURACAO - 2.5 - t)
    pad.add(t, G.pad(notas, d + 1.0, a=0.05 if i == 0 else 0.4, r=0.9, brilho=4.5), 0.6)
    for b in range(4):
        tb = t + b * BEAT
        if tb >= DURACAO - 2.5: break
        na_quebra = quebra - 0.5 < tb < m["coloca"] - 0.1
        for s in range(2):
            ts = tb + s * BEAT / 2
            if not na_quebra: dedo.add(ts, G.pluck(arp[(b * 2 + s) % 4], 0.6), 0.17, pan=(0.3 if s else -0.3))
        if na_quebra: continue
        ritmo.add(tb + BEAT / 2, G.hat(0.04, 0.8), 1.0, pan=0.2)
        if tb > m["coloca"] - 0.2 and b in (0, 2): P.add(tb, G.kick(0.8), 0.75)
        if tb > m["coloca"] - 0.2 and b in (1, 3): ritmo.add(tb, G.hat(0.09, 1.2), 0.8, pan=-0.15)
    P.add(t, np.stack([G.sub(raiz, d)] * 2) * 0.45)
    t += COMP; i += 1

# Revelação: subida + batida + sinos no "Onde Passo".
sub_ = G.ruido_varrido(1.0, 400, 7000, 1.6) * np.linspace(0, 1, int(1.0 * SR)) ** 2
P.add(quebra - 1.0, sub_ * 0.2)
P.add(m["noOndePasso"] + 0.3, G.kick(1.2), 0.9)
for k, n in enumerate(["D5", "A5", "F#6"]):
    dedo.add(m["noOndePasso"] + 0.3 + 0.07 * k, G.sino(n, 2.2), 0.12)
# Final: acorde aberto e sino no "salva"; cauda até o fim.
fim = DURACAO - 2.6
pad.add(fim, G.pad(["D3", "A3", "E4", "F#4", "C#5"], 2.8, a=0.05, r=2.2, brilho=6), 0.8)
for k, n in enumerate(["D5", "F#5", "A5"]):
    dedo.add(m["salva"] + 0.08 * k, G.sino(n, 2.0), 0.08)

mix = G.reverb(pad.x, 0.3) + G.reverb(dedo.x, 0.25) + ritmo.x * 0.55 + P.x
mix = mix[:, : int(DURACAO * SR)] * G.env(int(DURACAO * SR), 0.005, 1.8)
mix /= np.max(np.abs(mix)) / 0.89
(RAIZ / "public/audio/tiktok01").mkdir(parents=True, exist_ok=True)
wavfile.write(RAIZ / "public/audio/tiktok01/trilha.wav", SR, (mix.T * 32767).astype(np.int16))

# Efeito "salvar": clique curto + duas notas subindo (o marcador se preenche).
n = int(1.2 * SR); x = np.zeros(n)
clique = G.toque(); x[: len(clique)] += clique * 0.8
for k, (nota, at) in enumerate([("A5", 0.06), ("D6", 0.16)]):
    s = G.sino(nota, 1.0) * (0.5 - 0.1 * k); i0 = int(at * SR); x[i0:i0 + len(s)] += s[: n - i0]
G.salvar("salvar", G.reverb(np.stack([x, x]), 0.25), 0.6)
print("ok: tiktok01/trilha.wav e sfx/salvar.wav")
