"""Casa município do Sisu (nome + UF) com o código IBGE e coordenadas."""
import re, unicodedata
from pathlib import Path
import pandas as pd

REF = Path(__file__).resolve().parent.parent / "dados" / "referencia" / "municipios_ibge.csv"
UF = {"11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO", "21": "MA", "22": "PI",
      "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA", "31": "MG", "32": "ES",
      "33": "RJ", "35": "SP", "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF"}
# grafias do Sisu que diferem do IBGE: (nome no Sisu, UF) -> nome no IBGE
APELIDOS = {("ITAPAGE", "CE"): "ITAPAJE"}


def chave(nome: str) -> str:
    s = unicodedata.normalize("NFKD", str(nome)).encode("ascii", "ignore").decode().upper()
    return re.sub(r"[^A-Z]", "", s)


def tabela() -> pd.DataFrame:
    ibge = pd.read_csv(REF, dtype=str)
    ibge["uf"] = ibge["codigo_uf"].map(UF)
    ibge["k"] = ibge["nome"].map(chave) + "|" + ibge["uf"]
    return ibge.set_index("k")[["codigo_ibge", "nome", "uf", "latitude", "longitude"]]


def casar(nomes: pd.Series, ufs: pd.Series, ref: pd.DataFrame) -> pd.DataFrame:
    ks = []
    for n, u in zip(nomes, ufs):
        k = chave(n)
        k = APELIDOS.get((k, u), k)
        ks.append(f"{k}|{u}")
    return ref.reindex(ks).reset_index(drop=True)
