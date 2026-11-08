#!/usr/bin/env python3
"""Acervo de provas do Enem (biblioteca /provas do site).

Entrada (coletada da página oficial do Inep e conferida arquivo por arquivo):
  dados/inep/provas-links-<data>.json        links da página "Provas e Gabaritos" do Inep, por ano, seção e caderno
  dados/inep/provas-verificacao-<data>.json  HEAD de cada arquivo em download.inep.gov.br: [status, bytes, tipo, last-modified]
Saída:
  dados/saida/site/provas.json               um item por caderno, com prova, gabarito e versões acessíveis

Regras:
- Só entram arquivos que responderam 200 com o tipo certo (PDF ou TXT). Um 404 vira "indisponível", nunca "disponível".
- O gabarito é o link que o próprio Inep pôs no MESMO bloco do caderno (ano + aplicação + dia + caderno). Nada é
  associado só pela cor.
- Áreas por dia seguem o formato do Enem desde 2017 (1º dia: Linguagens, Ciências Humanas e Redação; 2º dia:
  Ciências da Natureza e Matemática). 90 questões objetivas por dia (45 por área), como diz a página do Inep.

Uso: python3 pipeline/provas_inep.py [data]   (padrão: o arquivo mais recente em dados/inep/)
"""
import json, pathlib, re, sys, unicodedata

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PASTA = RAIZ / "dados" / "inep"
FONTE = "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos"
ANOS = [2025, 2024, 2023, 2022, 2021]

data = sys.argv[1] if len(sys.argv) > 1 else sorted(p.stem.split("links-")[1] for p in PASTA.glob("provas-links-*.json"))[-1]
links = json.loads((PASTA / f"provas-links-{data}.json").read_text(encoding="utf-8"))
verif = json.loads((PASTA / f"provas-verificacao-{data}.json").read_text(encoding="utf-8"))

def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def arquivo(url: str) -> dict | None:
    url = url.replace("http://", "https://")
    nome = url.rsplit("/", 1)[1]
    v = verif.get(nome)
    if not v or v[0] != 200 or not (str(v[2]).startswith("application/pdf") or str(v[2]).startswith("text/plain")):
        return None
    return {"url": url, "bytes": v[1], "formato": "pdf" if nome.lower().endswith(".pdf") else "txt"}

CORES = {"azul": "#2F6FD0", "amarelo": "#E2B53B", "branco": "#ECEAE4", "verde": "#3BA55C", "rosa": "#E07AA8",
         "cinza": "#8C8F94", "laranja": "#E8833A", "roxo": "#8A5CC7"}
AREAS_DIA = {1: ["linguagens", "humanas"], 2: ["natureza", "matematica"]}

def modalidade(secao: str) -> tuple[str, str]:
    s = secao.lower()
    if "belém" in s or "belem" in s:
        return "belem", "Aplicação em Belém, Ananindeua e Marituba"
    if "digital" in s:
        return "digital", "Aplicação digital"
    if "reaplica" in s:
        return "reaplicacao", secao.replace("Reaplicação/PPL/Segunda Oportunidade", "Reaplicação, PPL e Segunda Oportunidade").replace("Reaplicação/PPL", "Reaplicação e PPL")
    return "regular", "Aplicação regular"

CAB = re.compile(r"^(\d)º Dia – Caderno (\d+) – (.+?) – (.+)$")

def tipo_versao(texto: str, nome: str) -> str | None:
    t = texto.lower()
    if "nvda" in t: return "nvda"
    if "dosvox" in t: return "dosvox"
    if "superampliada" in t or "superampliada" in nome.lower(): return "superampliada"
    if "ampliada" in t or "_ampliada" in nome.lower(): return "ampliada"
    if "ledor" in t and "prova (ledor)" in t: return "ledor"
    if "atendimento especializado" in t: return "atendimento"
    return None

provas: dict[str, dict] = {}
extras: list[dict] = []
problemas: list[str] = []
for ano in ANOS:
    for it in links[str(ano)]:
        nome_arq = it["url"].rsplit("/", 1)[1]
        if it["texto"].startswith("Tema da Redação"):
            a = arquivo(it["url"])
            if a:
                extras.append({"ano": ano, "tipo": "tema-redacao", "rotulo": "Tema da redação" + (" (2ª aplicação)" if "_2_aplicacao" in nome_arq else ""), **a})
            continue
        m = CAB.match(it["caderno"].strip())
        if not m:
            problemas.append(f"{ano}: cabeçalho não reconhecido: {it['caderno']!r} ({it['texto']})")
            continue
        dia, cad, desc, _ = int(m.group(1)), int(m.group(2)), m.group(3), m.group(4)
        mod_id, mod_rot = modalidade(it["secao"])
        # "Azul", "Verde (Libras)", "Laranja (Braile e ledor)", "Branco (Ampliada)", "Azul – Inglês", "Verde (Libras – Ampliada)"
        cor = desc.split(" ")[0].split("–")[0].strip()
        resto = it["caderno"]  # o cabeçalho inteiro: "1º Dia – Caderno 2 – Amarelo – Inglês – Aplicação digital"
        idioma = "ingles" if "Inglês" in resto else "espanhol" if "Espanhol" in resto else None
        variante = "libras" if "Libras" in resto else "braile-ledor" if re.search(r"braile", resto, re.I) else None
        ampliacao = "superampliada" if "Superampliada" in resto else "ampliada" if "Ampliada" in resto else None
        chave = f"{ano}|{mod_id}|{dia}|{cad}|{idioma or ''}"
        p = provas.setdefault(chave, {
            "ano": ano, "dia": dia, "caderno": cad, "cor": cor.lower(), "corRotulo": cor, "corHex": CORES.get(cor.lower(), "#999"),
            "modalidade": mod_id, "modalidadeRotulo": mod_rot, "variante": variante, "idioma": idioma,
            "areas": AREAS_DIA[dia], "questoes": 90, "redacao": dia == 1,
            "prova": None, "gabarito": None, "versoes": [], "indisponiveis": [], "fonte": FONTE,
        })
        a = arquivo(it["url"])
        texto = it["texto"]
        if texto == "Gabarito":
            if a:
                if p["gabarito"] and p["gabarito"]["url"] != a["url"]:
                    problemas.append(f"{chave}: dois gabaritos diferentes ({p['gabarito']['url']} e {a['url']})")
                p["gabarito"] = p["gabarito"] or a
            else:
                p["indisponiveis"].append({"tipo": "gabarito", "url": it["url"].replace("http://", "https://")})
            continue
        tv = ampliacao or tipo_versao(texto, nome_arq)
        if tv is None and texto == "Prova":
            if a: p["prova"] = a
            else: p["indisponiveis"].append({"tipo": "prova", "url": it["url"]})
            continue
        if a:
            if tv == "nvda" or tv == "dosvox":
                parte = re.search(r"_(LC_CH|CN_MT|LC|CH|CN|MT)_", nome_arq)
                rot = {"LC": "Linguagens", "CH": "Humanas", "CN": "Natureza", "MT": "Matemática", "LC_CH": "", "CN_MT": ""}.get(parte.group(1) if parte else "", "")
                p["versoes"].append({"tipo": tv, "rotulo": ("Leitor de tela (NVDA)" if tv == "nvda" else "Texto para DOSVOX") + (f" · {rot}" if rot else ""), **a})
            else:
                p["versoes"].append({"tipo": tv or "outra", "rotulo": {"ampliada": "Ampliada", "superampliada": "Superampliada", "ledor": "Ledor",
                                     "atendimento": "Atendimento especializado"}.get(tv or "", texto), **a})
        else:
            p["indisponiveis"].append({"tipo": tv or "prova", "url": it["url"]})

saida = []
for p in provas.values():
    # Cadernos de atendimento (9 e 11) não têm "Prova" simples a partir de 2024: a versão de atendimento especializado é a principal.
    if p["prova"] is None:
        principal = next((v for v in p["versoes"] if v["tipo"] == "atendimento" and v["formato"] == "pdf"), None)
        if principal:
            p["prova"] = {k: principal[k] for k in ("url", "bytes", "formato")}
            p["versoes"].remove(principal)
    if p["prova"] is None:
        problemas.append(f"{p['ano']} {p['modalidade']} D{p['dia']} CD{p['caderno']}: sem prova disponível — fica fora da biblioteca")
        continue
    partes = ["enem", str(p["ano"])]
    if p["modalidade"] != "regular": partes.append(p["modalidade"])
    partes += [("primeiro" if p["dia"] == 1 else "segundo") + "-dia", f"caderno-{p['caderno']}", p["cor"]]
    if p["variante"]: partes.append(p["variante"])
    if p["idioma"]: partes.append(p["idioma"])
    p["id"] = slug("-".join(partes))
    ordem_v = ["ampliada", "superampliada", "ledor", "atendimento", "nvda", "dosvox", "outra"]
    p["versoes"].sort(key=lambda v: (ordem_v.index(v["tipo"]), v["rotulo"]))
    saida.append(p)

ORD_MOD = ["regular", "digital", "belem", "reaplicacao"]
saida.sort(key=lambda p: (-p["ano"], ORD_MOD.index(p["modalidade"]), p["dia"], p["caderno"], p["idioma"] or ""))
ids = [p["id"] for p in saida]
assert len(ids) == len(set(ids)), "ids repetidos"
out = {"verificadoEm": data, "fonte": FONTE, "anos": ANOS, "provas": saida, "extras": extras}
destino = RAIZ / "dados" / "saida" / "site" / "provas.json"
destino.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
sem_gab = [p["id"] for p in saida if not p["gabarito"]]
print(f"ok: {len(saida)} cadernos, {sum(len(p['versoes']) for p in saida)} versões acessíveis, {len(extras)} extras → {destino.relative_to(RAIZ)}")
print(f"   sem gabarito disponível: {sem_gab}")
for x in problemas: print("   !", x)
