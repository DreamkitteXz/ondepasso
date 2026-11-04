#!/usr/bin/env python3
"""Gera src/data/narracao.json (marcos de sincronia) e docs/narration_segments.json.

Entrada: scripts/palavras-take-a.tsv — palavra, início e fim (s) de cada palavra da narração,
copiados da transcrição com tempos por palavra do ElevenLabs (Scribe) do arquivo public/audio/narracao.mp3.

Se você trocar a narração: gere a transcrição com tempos por palavra (ElevenLabs Speech to Text,
ou outra ferramenta), salve no mesmo formato TSV e rode `python3 scripts/alinhar_narracao.py`.
Os marcos são encontrados pelas FRASES abaixo, então o texto precisa continuar o mesmo
(ou atualize as frases aqui e em docs/narration.txt).
"""
import json, pathlib, re, subprocess

RAIZ = pathlib.Path(__file__).resolve().parent.parent
TSV = RAIZ / "scripts" / "palavras-take-a.tsv"
AUDIO = RAIZ / "public" / "audio" / "narracao.mp3"

palavras = []
for linha in TSV.read_text(encoding="utf-8").splitlines():
    if not linha.strip():
        continue
    w, a, b = linha.split("\t")
    palavras.append({"w": w, "a": float(a), "b": float(b)})

norm = lambda s: re.sub(r"[^\wà-ú0-9]", "", s.lower())
seq = [norm(p["w"]) for p in palavras]


def achar(frase, depois=0.0):
    """Índice da primeira palavra da frase (após o tempo `depois`)."""
    alvo = [norm(x) for x in frase.split()]
    for i in range(len(seq) - len(alvo) + 1):
        if seq[i : i + len(alvo)] == alvo and palavras[i]["a"] >= depois:
            return i, i + len(alvo) - 1
    raise SystemExit(f"Frase não encontrada na narração: {frase!r}")


# Marcos usados pelas cenas (nome -> frase). O início da primeira palavra é o marco.
MARCOS = {
    "nota": "sua nota do Enem",
    "n720": "720",
    "eAgora": "E agora",
    "ateOnde": "Até onde ela te leva",
    "praResponder": "Pra responder isso",
    "ondePasso": "Onde Passo",
    "digita": "Você digita a sua nota",
    "cincoNotas": "cinco notas por área",
    "semCadastro": "Sem cadastro",
    "naoSai": "não sai do seu aparelho",
    "escolhe": "escolhe o curso",
    "direito": "Direito por exemplo",
    "n120": "120 opções",
    "cadaPonto": "Cada ponto do mapa",
    "verde": "Verde",
    "amarelo": "Amarelo",
    "vermelho": "Vermelho",
    "toca": "Toca numa opção",
    "cota": "corte de cada cota",
    "mudou": "como ele mudou",
    "naoEPromessa": "Não é promessa de vaga",
    "clareza": "clareza",
    "proximoPasso": "próximo passo",
    "ondePassoFinal": "Onde Passo",
    "descubra": "Descubra onde a sua nota passa",
}

marcos, fins = {}, {}
for nome, frase in MARCOS.items():
    depois = marcos.get("ondePasso", 0) + 1 if nome == "ondePassoFinal" else 0.0
    i, j = achar(frase, depois)
    marcos[nome] = palavras[i]["a"]
    fins[nome] = palavras[j]["b"]

# Segmentos por cena (início da 1ª frase da cena até o fim da última).
CENAS = [
    ("1-hook", "Saiu a sua nota do Enem", "Até onde ela te leva"),
    ("2-marca", "Pra responder isso", "existe o Onde Passo"),
    ("3-notas", "Você digita a sua nota", "não sai do seu aparelho"),
    ("4-curso", "Depois escolhe o curso", "120 opções pelo Brasil"),
    ("5-resultados", "Cada ponto do mapa", "mudou nos últimos anos"),
    ("6-clareza", "Não é promessa de vaga", "seu próximo passo"),
    ("7-encerramento", "Onde Passo Descubra", "onde a sua nota passa"),
]
segmentos = []
ultimo = 0.0
for nome, ini, fim in CENAS:
    i, _ = achar(ini, ultimo)
    _, j = achar(fim, palavras[i]["a"])
    texto = " ".join(p["w"] for p in palavras[i : j + 1])
    segmentos.append({"cena": nome, "inicio": palavras[i]["a"], "fim": palavras[j]["b"], "texto": texto})
    ultimo = palavras[j]["b"]

duracao = palavras[-1]["b"]
if AUDIO.exists():
    duracao = float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(AUDIO)]).decode())

saida = {"duracao": round(duracao, 3), "marcos": marcos, "fins": fins, "segmentos": segmentos,
         "palavras": [[p["w"], p["a"], p["b"]] for p in palavras]}
(RAIZ / "src" / "data" / "narracao.json").write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding="utf-8")
(RAIZ / "docs" / "narration_segments.json").write_text(json.dumps(
    {"arquivo": "public/audio/narracao.mp3", "duracao_s": round(duracao, 3),
     "observacao": "Tempos em segundos dentro do arquivo de narração. No vídeo, some NARRACAO_INICIO (src/timeline.ts).",
     "segmentos": segmentos}, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"ok: {len(palavras)} palavras, {len(segmentos)} segmentos, duração {duracao:.2f}s")
for s in segmentos:
    print(f"  {s['cena']:16} {s['inicio']:6.2f}–{s['fim']:6.2f}  {s['texto']}")
