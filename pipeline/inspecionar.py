"""Inspeciona os arquivos brutos do Sisu em dados/brutos/ e diz se temos o que o Onde Passo precisa.

Uso:  python pipeline/inspecionar.py            (lê todos os .csv/.xlsx/.zip de dados/brutos)
Saída: colunas de cada arquivo, quais campos obrigatórios foram encontrados e, se der,
       uma prévia da nota de corte calculada (menor nota entre os aprovados por curso × campus × modalidade).
"""
import io, re, sys, zipfile, unicodedata
from pathlib import Path
import pandas as pd

BRUTOS = Path(__file__).resolve().parent.parent / "dados" / "brutos"

# o que o produto precisa -> padrões aceitos no nome da coluna (sem acento, minúsculo)
NECESSARIOS = {
    "curso":       [r"^no_curso$", r"nome.*curso", r"^curso$"],
    "ies":         [r"sg_ies", r"sigla.*ies", r"no_ies", r"nome.*ies", r"^ies$"],
    "campus":      [r"campus", r"^no_campus"],
    "municipio":   [r"municipio.*campus", r"no_municipio", r"^municipio"],
    "cod_municipio": [r"co_municipio", r"cod.*municipio", r"ibge"],
    "uf":          [r"sg_uf", r"^uf", r"uf.*campus"],
    "turno":       [r"turno"],
    "grau":        [r"grau"],
    "modalidade":  [r"modalidade", r"mod_concorrencia", r"tipo.*concorrencia"],
    "nota":        [r"nu_nota_candidato", r"nota.*candidato", r"^nota", r"nota_final", r"media"],
    "nota_corte":  [r"nota.*corte", r"nu_nota_corte"],
    "pesos":       [r"peso"],
    "vagas":       [r"vagas", r"qt_vagas"],
    "aprovado":    [r"aprovado", r"situacao", r"st_aprovado"],
}

def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", "_", s.strip().lower())

def ler(fonte, nome):
    raw = fonte.read() if hasattr(fonte, "read") else Path(fonte).read_bytes()
    if nome.lower().endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(raw), nrows=200000)
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            txt = raw[:20000].decode(enc); break
        except UnicodeDecodeError:
            continue
    sep = max(["|", ";", ",", "\t"], key=txt.splitlines()[0].count)
    return pd.read_csv(io.BytesIO(raw), sep=sep, encoding=enc, dtype=str, on_bad_lines="skip", low_memory=False)

def arquivos():
    for p in sorted(BRUTOS.glob("*")):
        if p.suffix.lower() == ".zip":
            with zipfile.ZipFile(p) as z:
                for n in z.namelist():
                    if n.lower().endswith((".csv", ".xlsx", ".xls", ".txt")):
                        yield f"{p.name}/{n}", (lambda z=z, n=n: z.open(n)), n
        elif p.suffix.lower() in (".csv", ".xlsx", ".xls", ".txt"):
            yield p.name, (lambda p=p: open(p, "rb")), p.name

def achar(cols):
    out = {}
    for campo, pads in NECESSARIOS.items():
        out[campo] = [c for c in cols if any(re.search(pd_, norm(c)) for pd_ in pads)]
    return out

def main():
    achados = list(arquivos())
    if not achados:
        print(f"Nenhum arquivo em {BRUTOS}. Coloque lá os CSV/XLSX/ZIP da chamada regular do Sisu.")
        return
    for rotulo, abrir, nome in achados:
        print("=" * 80); print(rotulo)
        with abrir() as f:
            df = ler(f, nome)
        print(f"{len(df):,} linhas · {len(df.columns)} colunas")
        print("colunas:", ", ".join(df.columns))
        m = achar(df.columns)
        for campo, cols in m.items():
            print(f"  {'OK ' if cols else '-- '} {campo:14s} {', '.join(cols) if cols else '(não encontrado)'}")
        falta = [c for c in ("curso", "ies", "modalidade") if not m[c]] + ([] if (m["nota"] or m["nota_corte"]) else ["nota"])
        if falta:
            print("  >> faltam campos essenciais:", falta); continue
        if not m["cod_municipio"]:
            print("  >> ATENÇÃO: sem código IBGE do município. O mapa vai precisar casar pelo nome do município + UF.")
        # prévia da nota de corte
        chave = [m[k][0] for k in ("ies", "campus", "curso", "turno", "modalidade") if m[k]]
        if m["nota_corte"]:
            col = m["nota_corte"][0]; s = df[chave + [col]].copy()
            s[col] = pd.to_numeric(s[col].str.replace(",", "."), errors="coerce"); prev = s.groupby(chave)[col].min()
        else:
            col = m["nota"][0]; base = df
            if m["aprovado"]:
                ap = df[m["aprovado"][0]].astype(str).str.strip().str.upper()
                sel = ap.str.startswith(("S", "A", "1", "SELEC"))
                if sel.any(): base = df[sel]
            s = base[chave + [col]].copy()
            s[col] = pd.to_numeric(s[col].str.replace(",", "."), errors="coerce")
            prev = s.groupby(chave)[col].min()  # menor nota entre os selecionados = corte
        prev = prev.dropna().sort_values(ascending=False)
        print(f"  prévia: {len(prev):,} ofertas (curso × campus × modalidade). 5 maiores cortes:")
        print(prev.head(5).to_string())

if __name__ == "__main__":
    main()
