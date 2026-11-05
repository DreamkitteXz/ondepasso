#!/usr/bin/env python3
"""Junta os quadros de previews/<formato>/ numa folha de contato (previews/folha-<formato>-N.jpg)."""
import sys, pathlib
from PIL import Image, ImageDraw
raiz = pathlib.Path(__file__).resolve().parent.parent / "previews"
for f in (sys.argv[1:] or ["16x9", "9x16"]):
    fs = sorted((raiz / f).glob("t*.jpg"))
    if not fs: continue
    im0 = Image.open(fs[0]); w, h = im0.size
    cols = 4 if w > h else 6; esc = (480 / w) if w > h else (240 / w)
    tw, th = int(w * esc), int(h * esc); por = cols * (3 if w > h else 2)
    for n in range(0, len(fs), por):
        lote = fs[n:n + por]; linhas = (len(lote) + cols - 1) // cols
        W = Image.new("RGB", (cols * tw, linhas * (th + 22)), "white"); d = ImageDraw.Draw(W)
        for i, p in enumerate(lote):
            x, y = (i % cols) * tw, (i // cols) * (th + 22)
            W.paste(Image.open(p).resize((tw, th)), (x, y + 22)); d.text((x + 6, y + 4), p.stem[1:] + "s", fill="black")
        W.save(raiz / f"folha-{f}-{n // por + 1}.jpg", quality=88)
        print(raiz / f"folha-{f}-{n // por + 1}.jpg")
