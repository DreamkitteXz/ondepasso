"""Junta, nos JSON já gerados em dados/saida/site, os cursos que são o mesmo com nomes diferentes (pipeline/cursos.py).

Uso:  python pipeline/unificar_site.py
Serve para aplicar a junção sem as planilhas brutas; o construir.py já aplica a mesma regra quando roda do zero.
Também escreve web/public/_redirects com os endereços antigos -> novos.
"""
import json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cursos import canonico, redirecionamentos, regras_de

RAIZ = Path(__file__).resolve().parents[1]
SITE = RAIZ / "dados" / "saida" / "site"
REDIR = RAIZ / "web" / "public" / "_redirects"


def slug(s: str) -> str:
    import re, unicodedata
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def escrever_redirects(nomes):
    # Soma com as regras que já existiam (rodar de novo, já juntado, não pode apagar os endereços antigos).
    antigas = REDIR.read_text(encoding="utf-8").splitlines() if REDIR.exists() else []
    todas = {l for x in antigas if x.startswith("/curso/") and "*" in x for l in regras_de(x)} | set(redirecionamentos(nomes, slug))
    fixas, com_asterisco = sorted(l for l in todas if "*" not in l), sorted(l for l in todas if "*" in l)
    if len(com_asterisco) > 100:
        sys.exit(f"{len(com_asterisco)} redirecionamentos com *: o limite do Cloudflare é 100.")
    REDIR.write_text("# Gerado por pipeline/cursos.py: cursos com nomes diferentes que foram juntados.\n" + "\n".join(fixas + com_asterisco) + "\n", encoding="utf-8")
    return len(com_asterisco)


def main():
    idx = json.loads((SITE / "cursos.json").read_text(encoding="utf-8"))
    grupos: dict[str, list[dict]] = {}
    nomes = []
    for item in idx["cursos"]:
        nomes.append(item["curso"])
        grupos.setdefault(canonico(item["curso"]), []).append(item)
    ultimo = str(max(idx["anos"]))
    novo_indice, juntados = [], 0
    for canon, itens in grupos.items():
        cslug = slug(canon)
        ofertas = []
        for it in itens:
            c = json.loads((SITE / "curso" / f"{it['slug']}.json").read_text(encoding="utf-8"))
            ofertas += c["ofertas"]
            anos = c["anos"]
            if it["slug"] != cslug:
                (SITE / "curso" / f"{it['slug']}.json").unlink()
        if len(itens) > 1 or itens[0]["slug"] != cslug:
            juntados += len(itens) - 1
            (SITE / "curso" / f"{cslug}.json").write_text(json.dumps({"curso": canon, "slug": cslug, "anos": anos, "ofertas": ofertas}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        amplas = [a for o in ofertas if (a := o["cortes"].get(ultimo, {}).get("AC", {}).get("corte"))]
        novo_indice.append({"curso": canon, "slug": cslug, "ofertas": len(ofertas), "ufs": len({o["uf"] for o in ofertas}),
                            "ampla_min": min(amplas) if amplas else None, "ampla_max": max(amplas) if amplas else None})
    novo_indice.sort(key=lambda x: -x["ofertas"])
    idx["cursos"] = novo_indice
    (SITE / "cursos.json").write_text(json.dumps(idx, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    n = escrever_redirects(nomes)
    print(f"{len(nomes)} cursos -> {len(novo_indice)} ({juntados} juntados) · {n} redirecionamentos em {REDIR.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
