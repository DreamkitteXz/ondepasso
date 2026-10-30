"""Leitura e normalização das planilhas oficiais do Sisu (sisu.mec.gov.br › Relatórios).

Cada ano tem dois arquivos em dados/brutos/:
  sisu{ANO}_inscricoes_notas_corte.xlsx  -> corte, vagas e inscritos por oferta × modalidade
  sisu{ANO}_vagas_ofertadas.xlsx         -> pesos, notas mínimas, turno, grau por oferta × modalidade
A aba 0 é o dicionário; a aba 1 são os dados. Os nomes de coluna variam um pouco entre anos.
"""
from pathlib import Path
import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
BRUTOS = RAIZ / "dados" / "brutos"
CACHE = RAIZ / "dados" / "cache"

# nome canônico <- nomes vistos nas planilhas
RENOMEAR = {
    "QT_VAGAS_CONCORRENCIA": "QT_VAGAS",      # 2026
    "QT_VAGAS_OFERTADAS": "QT_VAGAS",         # 2024/2025
    "DS_REGIAO_CAMPUS": "DS_REGIAO",
    "TIPO_CONCORRENCIA": "MODALIDADE",        # inscrições
    "TP_COTA": "MODALIDADE",                  # vagas
}
TEXTO = ["SG_IES", "NO_IES", "DS_CATEGORIA_ADM", "DS_ORGANIZACAO_ACADEMICA", "NO_CAMPUS", "NO_MUNICIPIO_CAMPUS",
         "SG_UF_CAMPUS", "DS_REGIAO", "NO_CURSO", "DS_GRAU", "DS_TURNO", "MODALIDADE", "DS_MOD_CONCORRENCIA",
         "TP_MOD_CONCORRENCIA", "DS_PERIODICIDADE"]
NUMEROS = ["QT_VAGAS", "NU_NOTACORTE", "QT_INSCRICAO", "NU_PERCENTUAL_BONUS", "NU_MEDIA_MINIMA_ENEM", "QT_SEMESTRE",
           "PESO_REDACAO", "NOTA_MINIMA_REDACAO", "PESO_LINGUAGENS", "NOTA_MINIMA_LINGUAGENS", "PESO_MATEMATICA",
           "NOTA_MINIMA_MATEMATICA", "PESO_CIENCIAS_HUMANAS", "NOTA_MINIMA_CIENCIAS_HUMANAS",
           "PESO_CIENCIAS_NATUREZA", "NOTA_MINIMA_CIENCIAS_NATUREZA"]


def _ler_xlsx(caminho: Path) -> pd.DataFrame:
    """Lê a aba de dados como texto, com cache em CSV (a leitura do xlsx é a parte lenta)."""
    CACHE.mkdir(parents=True, exist_ok=True)
    cache = CACHE / (caminho.stem + ".csv.gz")
    if cache.exists() and cache.stat().st_mtime >= caminho.stat().st_mtime:
        return pd.read_csv(cache, dtype=str, keep_default_na=False)
    df = pd.read_excel(caminho, sheet_name=1, dtype=str, engine="calamine").fillna("")
    df.to_csv(cache, index=False, compression="gzip")
    return df


def _normalizar(df: pd.DataFrame, ano: int) -> pd.DataFrame:
    df = df.rename(columns={c: RENOMEAR.get(c.strip(), c.strip()) for c in df.columns})
    for c in TEXTO:
        if c in df:
            df[c] = df[c].astype(str).str.strip()
    for c in NUMEROS:
        if c in df:
            df[c] = pd.to_numeric(df[c].astype(str).str.replace(",", ".").str.strip(), errors="coerce")
    df["CO_IES_CURSO"] = df["CO_IES_CURSO"].astype(str).str.strip().str.replace(r"\.0$", "", regex=True)
    df["CO_IES"] = df["CO_IES"].astype(str).str.strip().str.replace(r"\.0$", "", regex=True)
    df["ANO"] = ano  # a coluna EDICAO não é confiável (em 2026 vem "302")
    return df


def anos_disponiveis() -> list[int]:
    anos = []
    for p in BRUTOS.glob("sisu*_inscricoes_notas_corte.xlsx"):
        ano = int(p.name[4:8])
        if (BRUTOS / f"sisu{ano}_vagas_ofertadas.xlsx").exists():
            anos.append(ano)
    return sorted(anos)


def carregar_ano(ano: int) -> pd.DataFrame:
    """Uma linha por oferta (CO_IES_CURSO) × modalidade, com corte, vagas, inscritos e pesos."""
    insc = _normalizar(_ler_xlsx(BRUTOS / f"sisu{ano}_inscricoes_notas_corte.xlsx"), ano)
    vag = _normalizar(_ler_xlsx(BRUTOS / f"sisu{ano}_vagas_ofertadas.xlsx"), ano)
    extra = ["CO_IES_CURSO", "MODALIDADE", "DS_PERIODICIDADE", "QT_SEMESTRE", "NU_MEDIA_MINIMA_ENEM"] + \
            [c for c in vag.columns if c.startswith(("PESO_", "NOTA_MINIMA_"))]
    vag = vag[[c for c in extra if c in vag]].drop_duplicates(["CO_IES_CURSO", "MODALIDADE"])
    df = insc.merge(vag, on=["CO_IES_CURSO", "MODALIDADE"], how="left", indicator=True)
    df.attrs["sem_par_em_vagas"] = int((df["_merge"] == "left_only").sum())
    df = df.drop(columns="_merge")
    # corte 0 ou vazio = modalidade sem candidatos suficientes -> sem corte (nunca zero)
    df.loc[~(df["NU_NOTACORTE"] > 0), "NU_NOTACORTE"] = pd.NA
    df["AMPLA"] = df["MODALIDADE"].eq("AC")
    return df
