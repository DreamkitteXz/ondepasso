#!/usr/bin/env python3
"""Catálogo de provas de outros vestibulares (Fuvest, Unicamp) para a biblioteca /provas.

Entrada (coletada das páginas oficiais, um arquivo por vestibular e data):
  dados/vestibulares/<vestibular>-links-<data>.json   links transcritos das páginas do acervo oficial, com seção e texto
Saída:
  dados/saida/site/vestibulares.json    exames (um por vestibular + edição + fase + dia), com versões e documentos
  dados/vestibulares/cobertura.json     auditoria: o que entrou, o que ficou de fora e por quê, e as lacunas

Regras:
- Só entra o que está no arquivo de links. Nenhum documento, data, resposta ou classificação é deduzido.
- Um link das seções de prova que nenhuma regra reconhece PARA o script (nada é ignorado em silêncio).
- Ficam de fora, com motivo registrado: simulados, provas de competências/habilidades específicas, notas de corte.
- "edicao" é o ano de ingresso (Fuvest 2026 foi aplicada em 2025). A data de aplicação só entra quando um documento
  oficial a informa (campo fatosDeDocumentos do arquivo de links).
- Acesso: "oficial" = o site só leva ao arquivo no servidor oficial ("Abrir no site oficial"). O leitor do site só
  pode abrir PDFs de servidores que liberam leitura por outros sites (CORS) sob licença que permita; isso não foi
  constatado para Fuvest nem Comvest, então nada aqui usa "leitor".
- Conferência: "listado" = o link consta na página oficial na data da coleta; "head" = o arquivo também respondeu 200.

Uso: python3 pipeline/provas_vestibulares.py
"""
import json, pathlib, re, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PASTA = RAIZ / "dados" / "vestibulares"
EDICOES = [2026, 2025, 2024, 2023, 2022]

VESTIBULARES = {
    "fuvest": {"nome": "Fuvest", "instituicao": "USP", "acervo": "https://www.fuvest.br/acervo-vestibular/"},
    "unicamp": {"nome": "Unicamp", "instituicao": "Unicamp (Comvest)", "acervo": "https://www.comvest.unicamp.br/vestibulares-anteriores/"},
}
MOTIVO_OFICIAL = "O servidor oficial não libera a leitura dos PDFs dentro de outros sites."

def mais_recente(v: str) -> pathlib.Path | None:
    arqs = sorted(PASTA.glob(f"{v}-links-*.json"))
    return arqs[-1] if arqs else None

def doc(link: dict, tipo: str, rotulo: str, coleta: dict, **extra) -> dict:
    d = {"tipo": tipo, "rotulo": rotulo, "url": link["url"], "formato": "pdf", "bytes": None, "acesso": "oficial",
         "procedencia": {"pagina": link["pagina"], "secao": link["secao"], "texto": link["texto"], "coletadoEm": coleta["coletadoEm"], "conferencia": "listado"}}
    d.update({k: v for k, v in extra.items() if v is not None})
    return d

# ---------------------------------------------------------------- Fuvest

FORA = [  # (regex na seção ou no texto, motivo)
    (re.compile(r"simulado", re.I), "simulado (não é prova do vestibular)"),
    (re.compile(r"compet[êe]ncias espec[íi]ficas|habilidades", re.I), "prova de competências/habilidades específicas (fora desta entrega)"),
    (re.compile(r"notas de corte", re.I), "não é prova nem gabarito"),
]
DISC = {"matemática": "matematica", "física": "fisica", "química": "quimica", "biologia": "biologia", "história": "historia", "geografia": "geografia"}

def fuvest(coleta: dict, aud: dict) -> list[dict]:
    fatos = {f["url"]: f for f in coleta.get("fatosDeDocumentos", [])}
    exames: dict[str, dict] = {}

    def exame(ed: int, fase: int, dia: int | None, pagina: str) -> dict:
        ident = f"fuvest-{ed}-{fase}a-fase" + (f"-{dia}o-dia" if dia else "")
        if ident not in exames:
            exames[ident] = {"id": ident, "vestibular": "fuvest", "edicao": ed, "fase": fase, "dia": dia, "dataAplicacao": None,
                             "nomeProva": "Prova de Conhecimentos Gerais" if fase == 1 else None,
                             "tipoQuestoes": "objetiva" if fase == 1 else "discursiva", "redacao": None, "disciplinas": [],
                             "versoes": [], "complementares": [], "lacunas": [], "fonte": pagina}
        return exames[ident]

    for l in coleta["links"]:
        ed, secao, texto = l["edicao"], l["secao"], l["texto"]
        if ed not in EDICOES:
            aud["fora"].append({**l, "motivo": "edição fora do recorte 2022–2026"}); continue
        motivo = next((m for r, m in FORA if r.search(secao) or r.search(texto)), None)
        if motivo:
            aud["fora"].append({**l, "motivo": motivo}); continue
        t = texto.lower()
        if "primeira fase" in secao.lower():
            e = exame(ed, 1, None, l["pagina"])
            m = re.search(r"^Prova(?: \d{4})? ([A-Z]\d?)$", texto)
            if m:
                e["versoes"].append({"codigo": m.group(1), "rotulo": f"Prova {m.group(1)}", "prova": doc(l, "prova", f"Prova {m.group(1)}", coleta)})
            elif "gabarito" in t:
                f = fatos.get(l["url"], {})
                retificado = "retificado" in l["url"].lower() or bool(f.get("retificadoEm"))
                m2 = re.search(r"retificado_(\d{4}-\d{2}-\d{2})", l["url"])
                e["complementares"].append(doc(l, "gabarito", "Gabarito oficial" + (" (retificado)" if retificado else ""), coleta,
                    versoes="todas", retificado=retificado or None, retificadoEm=f.get("retificadoEm") or (m2.group(1) if m2 else None)))
                if f.get("dataAplicacao"):
                    e["dataAplicacao"] = f["dataAplicacao"]; e["dataAplicacaoFonte"] = f["fato"]
            else:
                sys.exit(f"Link da 1ª fase sem regra: {l}")
        elif "segunda fase" in secao.lower():
            md = re.search(r"([12])º dia", t)
            if "redação" in t and "abordagem" in t:
                e = exame(ed, 2, int(md.group(1)), l["pagina"]); e["redacao"] = True
                e["complementares"].append(doc(l, "redacao-abordagem", "Redação: abordagem esperada", coleta))
            elif "respostas esperadas" in t or "abordagens esperadas" in t:
                disc = next((v for k, v in DISC.items() if k in t), None)
                rot = texto.split("–")[-1].strip() if disc else None
                if md:      # de um dia específico
                    exame(ed, 2, int(md.group(1)), l["pagina"])["complementares"].append(doc(l, "respostas-esperadas", "Respostas esperadas", coleta))
                elif disc:  # 2026: uma por disciplina, todas do 2º dia (o nome do arquivo traz "dia2")
                    if "dia2" not in l["url"]: sys.exit(f"Resposta por disciplina sem dia no arquivo: {l}")
                    e = exame(ed, 2, 2, l["pagina"]); e["disciplinas"].append(disc)
                    e["complementares"].append(doc(l, "respostas-esperadas", f"Respostas esperadas: {rot}", coleta, disciplina=disc))
                else:       # um documento só para a 2ª fase inteira: vale para os dois dias
                    for dia in (1, 2):
                        exame(ed, 2, dia, l["pagina"])["complementares"].append(doc(l, "respostas-esperadas", f"{texto} (2ª fase inteira)", coleta, escopo="fase"))
            elif md:
                e = exame(ed, 2, int(md.group(1)), l["pagina"])
                e["versoes"].append({"codigo": "unica", "rotulo": "Prova", "prova": doc(l, "prova", "Prova", coleta)})
            else:
                sys.exit(f"Link da 2ª fase sem regra: {l}")
        else:
            sys.exit(f"Seção sem regra: {l}")

    # Lacunas: o que a página oficial não traz. Estado "nao-encontrado" = não consta na página do acervo na coleta.
    for e in exames.values():
        tipos = {c["tipo"] for c in e["complementares"]}
        if not e["versoes"]:
            e["lacunas"].append({"tipo": "prova", "estado": "nao-encontrado", "nota": "A página do acervo não lista o caderno desta prova."})
        if e["fase"] == 1 and "gabarito" not in tipos:
            e["lacunas"].append({"tipo": "gabarito", "estado": "nao-encontrado", "nota": "A página do acervo não lista o gabarito."})
        if e["fase"] == 2 and "respostas-esperadas" not in tipos:
            e["lacunas"].append({"tipo": "respostas-esperadas", "estado": "nao-encontrado", "nota": "A página do acervo desta edição não lista respostas ou abordagens esperadas da 2ª fase."})
    for ed in EDICOES:
        for fase, dia in ((1, None), (2, 1), (2, 2)):
            ident = f"fuvest-{ed}-{fase}a-fase" + (f"-{dia}o-dia" if dia else "")
            if ident not in exames: aud["lacunas"].append({"exame": ident, "estado": "nao-encontrado", "nota": "Nenhum link desta prova na página do acervo."})
    return sorted(exames.values(), key=lambda e: (-e["edicao"], e["fase"], e["dia"] or 0))

# ---------------------------------------------------------------- principal

def main() -> None:
    saida = {"geradoDe": {}, "vestibulares": [], "exames": []}
    auditoria = {"vestibulares": {}}
    for v, meta in VESTIBULARES.items():
        arq = mais_recente(v)
        aud = {"fora": [], "lacunas": []}
        if arq is None:
            pend = json.loads((PASTA / f"{v}-pendencia.json").read_text(encoding="utf-8")) if (PASTA / f"{v}-pendencia.json").exists() else {"motivo": "Catálogo ainda não coletado."}
            saida["vestibulares"].append({"id": v, **meta, "estado": "pendente", "pendencia": pend["motivo"], "exames": 0})
            auditoria["vestibulares"][v] = {"estado": "pendente", **pend}
            continue
        coleta = json.loads(arq.read_text(encoding="utf-8"))
        if v != "fuvest": sys.exit(f"Falta escrever as regras de importação de {v} (arquivo {arq.name}).")
        exames = fuvest(coleta, aud)
        saida["geradoDe"][v] = arq.name
        saida["exames"] += exames
        saida["vestibulares"].append({"id": v, **meta, "estado": "catalogado", "coletadoEm": coleta["coletadoEm"], "acesso": "oficial", "motivoAcesso": MOTIVO_OFICIAL,
                                      "edicoes": sorted({e["edicao"] for e in exames}, reverse=True), "exames": len(exames)})
        usados = sum(len(e["versoes"]) for e in exames) + len({c["url"] for e in exames for c in e["complementares"]})
        auditoria["vestibulares"][v] = {
            "estado": "catalogado", "arquivo": arq.name, "coletadoEm": coleta["coletadoEm"], "metodo": coleta["metodo"], "limites": coleta["limites"],
            "linksColetados": len(coleta["links"]), "linksUsados": usados, "linksFora": len(aud["fora"]),
            "exames": len(exames), "cadernos": sum(len(e["versoes"]) for e in exames),
            "porEdicao": {str(ed): {"exames": [e["id"] for e in exames if e["edicao"] == ed],
                                    "cadernos": sum(len(e["versoes"]) for e in exames if e["edicao"] == ed),
                                    "complementares": len({c["url"] for e in exames if e["edicao"] == ed for c in e["complementares"]})} for ed in EDICOES},
            "lacunas": aud["lacunas"] + [{"exame": e["id"], **l} for e in exames for l in e["lacunas"]],
            "fora": [{"edicao": f["edicao"], "texto": f["texto"], "secao": f["secao"], "url": f["url"], "motivo": f["motivo"]} for f in aud["fora"]],
            "conferenciaPendente": "Conferir cada link (HEAD) e abrir os PDFs para confirmar data de aplicação, número de questões e retificações.",
        }
        if usados + len(aud["fora"]) != len(coleta["links"]): sys.exit(f"{v}: {len(coleta['links'])} links coletados, {usados} usados + {len(aud['fora'])} fora. Algum link sumiu.")
    ids = [e["id"] for e in saida["exames"]]
    if len(ids) != len(set(ids)): sys.exit("ids de exame repetidos")
    (RAIZ / "dados" / "saida" / "site" / "vestibulares.json").write_text(json.dumps(saida, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (PASTA / "cobertura.json").write_text(json.dumps(auditoria, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for v, a in auditoria["vestibulares"].items():
        print(v, {k: a[k] for k in ("estado", "exames", "cadernos", "linksColetados", "linksUsados", "linksFora") if k in a}, "lacunas:", len(a.get("lacunas", [])))

if __name__ == "__main__":
    main()
