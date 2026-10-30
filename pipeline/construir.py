"""Gera os dados do site a partir das planilhas do Sisu.

Uso:  python pipeline/construir.py
Saída em dados/saida/:
  ondepasso.sqlite        banco completo (tabelas oferta, corte), pronto para outros processos seletivos
  site/cursos.json        índice da busca: um item por curso
  site/curso/<slug>.json  todas as ofertas de um curso, com cortes por ano e modalidade, pesos e coordenadas
  site/modalidades.json   código -> descrição das modalidades
  relatorio.md            checagens de qualidade (leia depois de cada execução)
"""
import json, re, shutil, sqlite3, sys, tempfile, unicodedata
from datetime import date
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sisu, municipios

SAIDA = sisu.RAIZ / "dados" / "saida"
MINUSCULAS = {"de", "da", "do", "das", "dos", "e", "em", "para", "a", "o", "com"}
SIGLAS = {"TI", "TV", "ABI", "EAD", "II", "III"}


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def titulo(s: str) -> str:
    palavras = re.split(r"(\s+|-|/|\()", s.lower())
    out = []
    for i, p in enumerate(palavras):
        if p.upper() in SIGLAS: out.append(p.upper())
        elif p in MINUSCULAS and i > 0: out.append(p)
        else: out.append(p[:1].upper() + p[1:])
    return "".join(out)


def num(v, casas=2):
    return None if pd.isna(v) else round(float(v), casas)


def main():
    anos = sisu.anos_disponiveis()
    if not anos:
        sys.exit("Nenhum par de planilhas em dados/brutos/ (sisuANO_inscricoes_notas_corte.xlsx + sisuANO_vagas_ofertadas.xlsx).")
    rel = [f"# Relatório do pipeline — {date.today():%d/%m/%Y}", "", f"Anos: {', '.join(map(str, anos))}", ""]
    frames = []
    for ano in anos:
        df = sisu.carregar_ano(ano)
        frames.append(df)
        sem = df.attrs.get("sem_par_em_vagas", 0)
        rel += [f"## {ano}",
                f"- {len(df):,} linhas · {df.CO_IES_CURSO.nunique():,} ofertas · {df.CO_IES.nunique()} instituições",
                f"- linhas sem par na planilha de vagas (sem pesos): {sem}",
                f"- modalidades sem corte (sem inscritos): {df.NU_NOTACORTE.isna().mean():.0%}",
                f"- ofertas com corte na ampla: {df[df.AMPLA & df.NU_NOTACORTE.notna()].CO_IES_CURSO.nunique():,}", ""]
    tudo = pd.concat(frames, ignore_index=True)

    # ---- municípios -> IBGE
    ref = municipios.tabela()
    mun = tudo[["NO_MUNICIPIO_CAMPUS", "SG_UF_CAMPUS"]].drop_duplicates().reset_index(drop=True)
    casado = municipios.casar(mun.NO_MUNICIPIO_CAMPUS, mun.SG_UF_CAMPUS, ref)
    mun = pd.concat([mun, casado], axis=1)
    falta = mun[mun.codigo_ibge.isna()]
    rel += ["## Municípios", f"- {len(mun) - len(falta)} de {len(mun)} casados com o IBGE"]
    rel += [f"- SEM PAR: {r.NO_MUNICIPIO_CAMPUS} ({r.SG_UF_CAMPUS}) — adicionar em municipios.APELIDOS" for r in falta.itertuples()]
    rel.append("")
    tudo = tudo.merge(mun, on=["NO_MUNICIPIO_CAMPUS", "SG_UF_CAMPUS"], how="left")

    # ---- tabela de ofertas: dados descritivos do ano mais recente de cada oferta
    rec = tudo.sort_values("ANO").groupby("CO_IES_CURSO").tail(1)
    nomes_mudaram = tudo.groupby("CO_IES_CURSO").NO_CURSO.nunique()
    rel += ["## Consistência entre anos",
            f"- ofertas cujo nome de curso muda entre anos: {(nomes_mudaram > 1).sum()} (usa-se o nome mais recente)", ""]
    oferta = pd.DataFrame({
        "processo": "sisu", "id": rec.CO_IES_CURSO, "curso": rec.NO_CURSO.map(titulo), "curso_slug": rec.NO_CURSO.map(slug),
        "ies_id": rec.CO_IES, "ies": rec.SG_IES, "ies_nome": rec.NO_IES.map(titulo), "categoria": rec.DS_CATEGORIA_ADM,
        "campus": rec.NO_CAMPUS.map(titulo), "municipio": rec.nome.fillna(rec.NO_MUNICIPIO_CAMPUS), "uf": rec.SG_UF_CAMPUS,
        "regiao": rec.DS_REGIAO, "ibge": rec.codigo_ibge, "lat": pd.to_numeric(rec.latitude), "lon": pd.to_numeric(rec.longitude),
        "grau": rec.DS_GRAU, "turno": rec.DS_TURNO, "periodicidade": rec.get("DS_PERIODICIDADE"), "semestres": rec.get("QT_SEMESTRE"),
        "media_minima": rec.get("NU_MEDIA_MINIMA_ENEM"),
        **{f"peso_{a}": rec.get(f"PESO_{A}") for a, A in [("red", "REDACAO"), ("lin", "LINGUAGENS"), ("mat", "MATEMATICA"), ("ch", "CIENCIAS_HUMANAS"), ("cn", "CIENCIAS_NATUREZA")]},
        **{f"min_{a}": rec.get(f"NOTA_MINIMA_{A}") for a, A in [("red", "REDACAO"), ("lin", "LINGUAGENS"), ("mat", "MATEMATICA"), ("ch", "CIENCIAS_HUMANAS"), ("cn", "CIENCIAS_NATUREZA")]},
        "ano_mais_recente": rec.ANO,
    })
    corte = pd.DataFrame({"processo": "sisu", "ano": tudo.ANO, "oferta_id": tudo.CO_IES_CURSO, "modalidade": tudo.MODALIDADE,
                          "ampla": tudo.AMPLA.astype(int), "vagas": tudo.QT_VAGAS, "inscritos": tudo.QT_INSCRICAO,
                          "corte": tudo.NU_NOTACORTE, "bonus_pct": tudo.NU_PERCENTUAL_BONUS})
    modalidades = tudo.drop_duplicates("MODALIDADE").set_index("MODALIDADE").DS_MOD_CONCORRENCIA.to_dict()

    # ---- checagens de valores
    alto = tudo[tudo.NU_NOTACORTE > 900].sort_values("NU_NOTACORTE", ascending=False)
    rel += ["## Cortes acima de 900 (conferir)", f"- {len(alto)} linhas"]
    for r in alto.head(12).itertuples():
        rel.append(f"  - {r.ANO} · {titulo(r.NO_CURSO)} · {r.SG_IES} ({r.NO_MUNICIPIO_CAMPUS}/{r.SG_UF_CAMPUS}) · {r.MODALIDADE} · corte {r.NU_NOTACORTE:.2f} · bônus {r.NU_PERCENTUAL_BONUS}% · inscritos {r.QT_INSCRICAO:.0f}")
    rel.append("")

    # ---- SQLite
    SAIDA.mkdir(parents=True, exist_ok=True)
    db = SAIDA / "ondepasso.sqlite"
    # monta o banco numa pasta local e copia no fim (SQLite não gosta de pastas de rede/sincronizadas)
    tmp = Path(tempfile.mkdtemp()) / "ondepasso.sqlite"
    with sqlite3.connect(tmp) as con:
        oferta.to_sql("oferta", con, index=False)
        corte.to_sql("corte", con, index=False)
        pd.Series(modalidades, name="descricao").rename_axis("modalidade").reset_index().to_sql("modalidade", con, index=False)
        con.execute("CREATE INDEX ix_oferta_curso ON oferta(curso_slug)")
        con.execute("CREATE INDEX ix_corte_oferta ON corte(oferta_id, ano)")
    shutil.copyfile(tmp, db)

    # ---- JSON do site
    site = SAIDA / "site"; (site / "curso").mkdir(parents=True, exist_ok=True)
    for f in (site / "curso").glob("*.json"):  # limpa cursos que deixaram de existir
        try: f.unlink()
        except PermissionError: pass
    cortes_por_oferta = {}
    for r in corte.itertuples():
        if pd.isna(r.corte) and (pd.isna(r.vagas) or r.vagas == 0): continue
        cortes_por_oferta.setdefault(r.oferta_id, {}).setdefault(str(r.ano), {})[r.modalidade] = \
            {"corte": num(r.corte), "vagas": None if pd.isna(r.vagas) else int(r.vagas), "inscritos": None if pd.isna(r.inscritos) else int(r.inscritos)}
    # bônus regional (argumento de inclusão): a nota de quem tem bônus entra multiplicada, inclusive no corte da ampla
    bonus = tudo[tudo.ANO == max(anos)].groupby("CO_IES_CURSO").NU_PERCENTUAL_BONUS.max().fillna(0).to_dict()
    indice = []
    ultimo = max(anos)
    for cslug, grupo in oferta.groupby("curso_slug"):
        itens = []
        for o in grupo.itertuples():
            itens.append({
                "id": o.id, "ies": o.ies, "ies_nome": o.ies_nome, "categoria": o.categoria, "campus": o.campus,
                "municipio": o.municipio, "uf": o.uf, "ibge": o.ibge, "lat": num(o.lat, 4), "lon": num(o.lon, 4),
                "grau": o.grau, "turno": o.turno, "media_minima": num(o.media_minima), "bonus_regional_pct": num(bonus.get(o.id, 0), 1),
                "pesos": {k: num(getattr(o, f"peso_{k}")) for k in ("red", "lin", "mat", "ch", "cn")},
                "minimas": {k: num(getattr(o, f"min_{k}")) for k in ("red", "lin", "mat", "ch", "cn")},
                "cortes": cortes_por_oferta.get(o.id, {}),
            })
        amplas = [i["cortes"].get(str(ultimo), {}).get("AC", {}).get("corte") for i in itens]
        amplas = [a for a in amplas if a]
        nome = grupo.curso.mode().iat[0]
        (site / "curso" / f"{cslug}.json").write_text(json.dumps({"curso": nome, "slug": cslug, "anos": anos, "ofertas": itens}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        indice.append({"curso": nome, "slug": cslug, "ofertas": len(itens), "ufs": int(grupo.uf.nunique()),
                       "ampla_min": min(amplas) if amplas else None, "ampla_max": max(amplas) if amplas else None})
    indice.sort(key=lambda x: -x["ofertas"])
    (site / "cursos.json").write_text(json.dumps({"atualizado": f"{date.today():%Y-%m-%d}", "fonte": "Sisu/MEC — sisu.mec.gov.br › Relatórios", "anos": anos, "cursos": indice}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (site / "modalidades.json").write_text(json.dumps(modalidades, ensure_ascii=False, indent=0), encoding="utf-8")

    tam = sum(f.stat().st_size for f in (site / "curso").glob("*.json"))
    rel += ["## Saída", f"- {len(oferta):,} ofertas · {len(corte):,} linhas de corte · {len(indice)} cursos distintos",
            f"- JSON do site: {len(indice)} arquivos de curso, {tam/1e6:.1f} MB no total; maior: {max(indice, key=lambda x: x['ofertas'])['curso']}",
            f"- SQLite: {db.stat().st_size/1e6:.1f} MB", ""]
    (SAIDA / "relatorio.md").write_text("\n".join(rel), encoding="utf-8")
    print("\n".join(rel))


if __name__ == "__main__":
    main()
