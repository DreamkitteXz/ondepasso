#!/usr/bin/env python3
"""TikTok 01: gera src/tiktok/narracao.json (palavras, marcos e blocos de legenda) e docs/tiktok01/narration_segments.json.

Entrada: scripts/palavras-tiktok01.tsv (palavra ⇥ início ⇥ fim, em s), da transcrição com tempos por palavra
do ElevenLabs para public/audio/tiktok01/narracao.mp3. Se regravar a narração, atualize o TSV e rode de novo.
"""
import json, pathlib, re, subprocess

RAIZ = pathlib.Path(__file__).resolve().parent.parent
TSV = RAIZ / "scripts" / "palavras-tiktok01.tsv"
AUDIO = RAIZ / "public" / "audio" / "tiktok01" / "narracao.mp3"

P = []
for linha in TSV.read_text(encoding="utf-8").splitlines():
    if linha.strip():
        w, a, b = linha.split("\t"); P.append({"w": w, "a": float(a), "b": float(b)})
norm = lambda s: re.sub(r"[^\wà-ú0-9]", "", s.lower())
seq = [norm(p["w"]) for p in P]

def achar(frase, depois=0.0):
    alvo = [norm(x) for x in frase.split()]
    for i in range(len(seq) - len(alvo) + 1):
        if seq[i:i + len(alvo)] == alvo and P[i]["a"] >= depois:
            return i, i + len(alvo) - 1
    raise SystemExit(f"Frase não encontrada: {frase!r}")

MARCOS = {
    "criei": "Eu criei um site", "nota": "sua nota do Enem", "levar": "pode te levar",
    "sabe": "Sabe aquela dúvida", "chance": "tem chance de passar",
    "noOndePasso": "No Onde Passo", "coloca": "você coloca a sua nota", "escolhe": "escolhe o curso",
    "explora": "e explora as opções", "mapa": "no mapa",
    "verde": "Verde", "supera": "supera o corte", "amarelo": "Amarelo", "perto": "tá perto",
    "vermelho": "Vermelho", "falta": "ainda falta um pouco",
    "vaiFazer": "Vai fazer o Enem", "salva": "Salva esse vídeo", "conhecer": "conhecer o Onde Passo", "sair": "quando a sua nota sair",
}
marcos, fins = {}, {}
for k, f in MARCOS.items():
    i, j = achar(f); marcos[k] = P[i]["a"]; fins[k] = P[j]["b"]

# Blocos de legenda (curtos, quebrados onde a fala respira). Cada bloco é uma sequência de palavras da narração.
BLOCOS = ["Eu criei um site", "que mostra onde", "a sua nota do Enem", "pode te levar.", "Sabe aquela dúvida", "de onde você tem",
          "chance de passar?", "No Onde Passo,", "você coloca a sua nota,", "escolhe o curso que quer...", "e explora as opções",
          "no mapa.", "Verde:", "sua nota supera", "o corte do último Sisu.", "Amarelo: tá perto.", "Vermelho:",
          "ainda falta um pouco.", "Vai fazer o Enem?", "Salva esse vídeo", "pra conhecer o Onde Passo", "quando a sua nota sair."]
blocos, depois = [], 0.0
for f in BLOCOS:
    i, j = achar(f, depois); blocos.append(list(range(i, j + 1))); depois = P[j]["b"]
assert sum(len(b) for b in blocos) == len(P), "os blocos precisam cobrir todas as palavras"

CENAS = [("1-gancho", "Eu criei", "pode te levar"), ("2-problema", "Sabe aquela", "chance de passar"),
         ("3-revelacao", "No Onde Passo", "No Onde Passo"), ("4-demonstracao", "você coloca", "no mapa"),
         ("5-resultados", "Verde", "ainda falta um pouco"), ("6-cta", "Vai fazer", "nota sair")]
seg = []
for nome, a, b in CENAS:
    i, _ = achar(a); _, j = achar(b, P[i]["a"])
    seg.append({"cena": nome, "inicio": P[i]["a"], "fim": P[j]["b"], "texto": " ".join(p["w"] for p in P[i:j + 1])})

dur = P[-1]["b"]
if AUDIO.exists():
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(AUDIO)]).decode())
saida = {"duracao": round(dur, 3), "marcos": marcos, "fins": fins, "palavras": [[p["w"], p["a"], p["b"]] for p in P], "blocos": blocos}
(RAIZ / "src/tiktok/narracao.json").write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding="utf-8")
(RAIZ / "docs/tiktok01/narration_segments.json").write_text(json.dumps(
    {"arquivo": "public/audio/tiktok01/narracao.mp3", "duracao_s": round(dur, 3),
     "observacao": "Tempos dentro do arquivo de narração; no vídeo some NARRACAO_INICIO (src/tiktok/timeline.ts).",
     "segmentos": seg}, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"ok: {len(P)} palavras, {len(blocos)} blocos de legenda, {dur:.2f}s")
for b in blocos: print("  ", " ".join(P[i]["w"] for i in b))
