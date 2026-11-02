"""Fotos e site oficial das universidades, a partir do Wikidata e do Wikimedia Commons.

Rode no seu computador (precisa de internet):

  python pipeline/fotos.py              1) busca as candidatas e abre a revisão no navegador
                                        2) aprove as fotos e o site e clique em "Salvar" (grava dados/universidades.json)
  python pipeline/fotos.py --preparar   3) baixa só as fotos aprovadas e gera web/public/fotos/<sigla>-<n>.webp

Depois: git add dados/universidades.json web/public/fotos && git commit && git push.
Rodar de novo é seguro: a revisão já abre com o que você aprovou antes, e --preparar só baixa o que falta.
Só entram fotos com licença livre (Creative Commons ou domínio público); o site mostra autor e licença de cada uma.
"""
import argparse, html, json, re, sys, time, unicodedata, urllib.parse, urllib.request, webbrowser
from datetime import date
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
SITE = RAIZ / "dados" / "saida" / "site"
APROVADAS = RAIZ / "dados" / "universidades.json"
CANDIDATAS = RAIZ / "dados" / "fotos-candidatas.json"
FOTOS = RAIZ / "web" / "public" / "fotos"
UA = "ondepasso/1.0 (https://ondepasso.com.br; fotos de universidades com licença livre)"
FORA = re.compile(r"logo|bras[aã]o|emblema|selo|seal|coat|mapa|map\b|locator|\.svg$|\.gif$|\.tiff?$|assinatura|signature", re.I)
LIVRE = re.compile(r"^(cc|public domain|pd|domínio público)", re.I)


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def api(base: str, **params) -> dict:
    url = base + "?" + urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for tentativa in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:  # rede instável ou limite de requisições: espera e tenta de novo
            if tentativa == 3: raise
            time.sleep(2 * (tentativa + 1))
    return {}


wikidata = lambda **p: api("https://www.wikidata.org/w/api.php", **p)
commons = lambda **p: api("https://commons.wikimedia.org/w/api.php", **p)


def instituicoes() -> dict:
    """sigla -> {nome, cidades} a partir dos JSON do site."""
    out = {}
    for item in json.loads((SITE / "cursos.json").read_text(encoding="utf-8"))["cursos"]:
        for o in json.loads((SITE / "curso" / f"{item['slug']}.json").read_text(encoding="utf-8"))["ofertas"]:
            i = out.setdefault(o["ies"], {"nome": o["ies_nome"], "cidades": set()})
            i["cidades"].add(o["municipio"])
    return {k: {"nome": v["nome"], "cidades": sorted(v["cidades"])} for k, v in sorted(out.items())}


def achar_entidade(sigla: str, nome: str):
    """Procura a instituição no Wikidata pelo nome (e, se falhar, pela sigla). Devolve a entidade com claims."""
    norm = lambda s: slug(s).replace("-", "")
    for termo in (nome, sigla):
        achados = wikidata(action="wbsearchentities", search=termo, language="pt", uselang="pt", type="item", limit=5).get("search", [])
        if not achados: continue
        ids = [a["id"] for a in achados]
        ents = wikidata(action="wbgetentities", ids="|".join(ids), props="claims|labels|descriptions", languages="pt|en").get("entities", {})
        # prefere o rótulo igual ao nome; senão, o primeiro que tenha foto, site ou categoria do Commons
        def nota(e):
            rot = (e.get("labels", {}).get("pt") or e.get("labels", {}).get("en") or {}).get("value", "")
            c = e.get("claims", {})
            return (norm(rot) == norm(nome)) * 10 + ("P18" in c) * 2 + ("P856" in c) + ("P373" in c)
        melhor = max((ents[i] for i in ids if i in ents), key=nota, default=None)
        if melhor and nota(melhor) > 0: return melhor
    return None


def valor(e, prop):
    for c in e.get("claims", {}).get(prop, []):
        v = c.get("mainsnak", {}).get("datavalue", {}).get("value")
        if v: return v
    return None


def info_arquivos(titulos):
    """Autor, licença e miniaturas (600 px para a revisão, 1600 px para o site) de cada arquivo do Commons."""
    out = []
    for i in range(0, len(titulos), 20):
        lote = "|".join(titulos[i:i + 20])
        pag = commons(action="query", titles=lote, prop="imageinfo", iiprop="url|extmetadata|size", iiurlwidth=1600).get("query", {}).get("pages", {})
        for p in pag.values():
            ii = (p.get("imageinfo") or [None])[0]
            if not ii or ii.get("width", 0) < 800: continue
            meta = ii.get("extmetadata", {})
            lic = re.sub(r"<[^>]+>", "", meta.get("LicenseShortName", {}).get("value", "")).strip()
            if not LIVRE.match(lic): continue
            autor = html.unescape(re.sub(r"<[^>]+>", "", meta.get("Artist", {}).get("value", ""))).strip() or "autor desconhecido"
            titulo = re.sub(r"\.(jpe?g|png|webp)$", "", p["title"].split(":", 1)[1], flags=re.I).replace("_", " ")
            out.append({"arquivo_commons": p["title"], "titulo": titulo[:80], "autor": autor[:80], "licenca": lic,
                        "licenca_url": meta.get("LicenseUrl", {}).get("value"), "pagina": ii.get("descriptionurl"),
                        "url": ii.get("thumburl") or ii.get("url"), "miniatura": (ii.get("thumburl") or ii.get("url")).replace("/1600px-", "/600px-")})
    return out


def buscar():
    insts = instituicoes()
    cand = json.loads(CANDIDATAS.read_text(encoding="utf-8")) if CANDIDATAS.exists() else {}
    for n, (sigla, i) in enumerate(insts.items(), 1):
        if sigla in cand: continue  # já buscada antes (apague dados/fotos-candidatas.json para buscar tudo de novo)
        print(f"[{n}/{len(insts)}] {sigla} · {i['nome']}", flush=True)
        try:
            e = achar_entidade(sigla, i["nome"])
            arquivos = []
            if e:
                p18 = valor(e, "P18")
                if p18: arquivos.append("File:" + p18)
                cat = valor(e, "P373")
                if cat:
                    membros = commons(action="query", list="categorymembers", cmtitle="Category:" + cat, cmtype="file", cmlimit=30).get("query", {}).get("categorymembers", [])
                    arquivos += [m["title"] for m in membros if m["title"] not in arquivos]
            arquivos = [a for a in arquivos if not FORA.search(a)][:12]
            rot = e and (e.get("labels", {}).get("pt") or e.get("labels", {}).get("en") or {}).get("value")
            cand[sigla] = {"nome": i["nome"], "cidades": i["cidades"], "wikidata": e and e["id"], "rotulo": rot,
                           "descricao": e and (e.get("descriptions", {}).get("pt") or {}).get("value"),
                           "site": e and valor(e, "P856"), "fotos": info_arquivos(arquivos) if arquivos else []}
        except Exception as ex:
            print(f"   falhou ({ex}); rode de novo para tentar só as que faltam", flush=True)
            continue
        CANDIDATAS.write_text(json.dumps(cand, ensure_ascii=False, indent=1), encoding="utf-8")
        time.sleep(0.3)
    return cand


PAGINA = """<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Revisão das fotos · onde passo</title>
<meta name="viewport" content="width=device-width, initial-scale=1"><style>
body{margin:0;font:14px/1.45 system-ui,sans-serif;background:#0f0e0d;color:#fafaf9}
header{position:sticky;top:0;z-index:2;display:flex;gap:16px;align-items:center;padding:12px 20px;background:#151412;border-bottom:1px solid #333}
header p{margin:0;color:#a6a39c;flex:1}button{font:inherit;cursor:pointer}
.salvar{background:#fafaf9;color:#0f0e0d;border:0;border-radius:10px;padding:10px 18px;font-weight:600}
main{max-width:1200px;margin:0 auto;padding:20px;display:grid;gap:16px}
.uni{background:#151412;border:1px solid #2a2826;border-radius:14px;padding:16px;display:grid;gap:10px}
.uni h2{margin:0;font-size:18px}.uni h2 small{font-weight:400;color:#a6a39c}
.meta{color:#a6a39c;font-size:13px}.meta a{color:#d6d4cf}
.site{display:flex;gap:8px;align-items:center}.site input[type=url]{flex:1;background:#0f0e0d;color:#fafaf9;border:1px solid #444;border-radius:8px;padding:8px}
.fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.foto{position:relative;border:2px solid transparent;border-radius:10px;overflow:hidden;background:#1b1a17;padding:0;color:inherit;text-align:left}
.foto img{display:block;width:100%;aspect-ratio:3/2;object-fit:cover}
.foto span{display:block;padding:6px 8px;font-size:12px;color:#a6a39c}
.foto[data-ordem]{border-color:#3dd68c}.foto[data-ordem]::after{content:attr(data-ordem);position:absolute;top:8px;left:8px;width:28px;height:28px;border-radius:50%;background:#3dd68c;color:#0f0e0d;font-weight:700;display:grid;place-items:center}
.titulo{width:100%;box-sizing:border-box;background:#0f0e0d;color:#fafaf9;border:1px solid #444;border-radius:6px;padding:6px;font:inherit;font-size:12px;margin-top:4px}
.vazio{color:#85827c}.ok{color:#3dd68c}
</style></head><body>
<header><strong>Revisão das fotos</strong><p>Clique nas fotos na ordem em que devem aparecer (até 3). Clique de novo para tirar. Ajuste o título se precisar. O site só entra se estiver marcado.</p>
<span id="status" class="meta"></span><button class="salvar" id="salvar">Salvar</button></header><main id="lista"></main>
<script>
const CAND = __CAND__, APROV = __APROV__;
const estado = {};
for (const [s, c] of Object.entries(CAND)) {
  const a = APROV[s] || {};
  estado[s] = { site: a.site !== undefined ? a.site : c.site, usarSite: a.site !== undefined ? !!a.site : !!c.site,
    fotos: (a.fotos || []).map(f => f.arquivo_commons).filter(t => c.fotos.some(x => x.arquivo_commons === t)),
    titulos: Object.fromEntries((a.fotos || []).map(f => [f.arquivo_commons, f.titulo])) };
}
const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
function render() {
  document.getElementById("lista").innerHTML = Object.entries(CAND).map(([s, c]) => {
    const e = estado[s];
    const fotos = c.fotos.length ? c.fotos.map(f => {
      const i = e.fotos.indexOf(f.arquivo_commons);
      return `<div><button class="foto" data-s="${esc(s)}" data-f="${esc(f.arquivo_commons)}" ${i >= 0 ? `data-ordem="${i + 1}"` : ""}><img loading="lazy" src="${esc(f.miniatura)}" alt=""><span>${esc(f.autor)} · ${esc(f.licenca)}</span></button>
        ${i >= 0 ? `<input class="titulo" data-s="${esc(s)}" data-f="${esc(f.arquivo_commons)}" value="${esc(e.titulos[f.arquivo_commons] ?? f.titulo)}" aria-label="Título da foto">` : ""}</div>`;
    }).join("") : `<p class="vazio">Nenhuma foto com licença livre encontrada. A página sai só com texto.</p>`;
    return `<section class="uni"><h2>${esc(s)} <small>${esc(c.nome)}</small></h2>
      <div class="meta">${c.wikidata ? `Wikidata: <a href="https://www.wikidata.org/wiki/${esc(c.wikidata)}" target="_blank">${esc(c.rotulo)}</a> · ${esc(c.descricao || "")}` : "Não encontrada no Wikidata"} · ${esc(c.cidades.join(", "))}</div>
      <label class="site"><input type="checkbox" data-s="${esc(s)}" class="usar" ${e.usarSite ? "checked" : ""}> Site oficial <input type="url" data-s="${esc(s)}" class="url" value="${esc(e.site || "")}" placeholder="sem site"></label>
      <div class="fotos">${fotos}</div></section>`;
  }).join("");
}
document.addEventListener("click", ev => {
  const b = ev.target.closest(".foto"); if (!b) return;
  const e = estado[b.dataset.s], f = b.dataset.f, i = e.fotos.indexOf(f);
  if (i >= 0) e.fotos.splice(i, 1); else if (e.fotos.length < 3) e.fotos.push(f);
  render();
});
document.addEventListener("input", ev => {
  const t = ev.target, e = estado[t.dataset.s]; if (!e) return;
  if (t.classList.contains("titulo")) e.titulos[t.dataset.f] = t.value;
  if (t.classList.contains("url")) e.site = t.value.trim();
  if (t.classList.contains("usar")) e.usarSite = t.checked;
});
document.getElementById("salvar").onclick = async () => {
  const out = {};
  for (const [s, c] of Object.entries(CAND)) {
    const e = estado[s];
    out[s] = { wikidata: c.wikidata, site: e.usarSite && e.site ? e.site : null,
      fotos: e.fotos.map((t, i) => { const f = c.fotos.find(x => x.arquivo_commons === t); return { ...f, titulo: (e.titulos[t] ?? f.titulo).trim() || f.titulo, arquivo: (APROV[s]?.fotos || []).find(x => x.arquivo_commons === t)?.arquivo || null }; }) };
  }
  const r = await fetch("/salvar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(out) });
  document.getElementById("status").textContent = r.ok ? "Salvo em dados/universidades.json" : "Erro ao salvar";
  document.getElementById("status").className = r.ok ? "ok" : "meta";
};
render();
</script></body></html>"""


def aprovadas() -> dict:
    return json.loads(APROVADAS.read_text(encoding="utf-8")).get("universidades", {}) if APROVADAS.exists() else {}


def salvar_aprovadas(unis: dict):
    APROVADAS.write_text(json.dumps({"gerado": f"{date.today():%Y-%m-%d}", "fonte": "Wikidata e Wikimedia Commons (revisado à mão)",
                                     "universidades": unis}, ensure_ascii=False, indent=1), encoding="utf-8")


def revisar(cand: dict, porta: int = 8765):
    pagina = PAGINA.replace("__CAND__", json.dumps(cand, ensure_ascii=False)).replace("__APROV__", json.dumps(aprovadas(), ensure_ascii=False)).encode("utf-8")

    class H(BaseHTTPRequestHandler):
        def log_message(self, *a): pass
        def do_GET(self):
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.end_headers(); self.wfile.write(pagina)
        def do_POST(self):
            if self.path != "/salvar": self.send_response(404); self.end_headers(); return
            dados = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            salvar_aprovadas(dados)
            n = sum(len(u["fotos"]) for u in dados.values())
            print(f"Salvo: {n} fotos aprovadas em {sum(1 for u in dados.values() if u['fotos'])} universidades. "
                  f"Pode salvar de novo quantas vezes quiser; feche com Ctrl+C e rode --preparar.", flush=True)
            self.send_response(200); self.end_headers()

    srv = HTTPServer(("127.0.0.1", porta), H)
    url = f"http://127.0.0.1:{porta}/"
    print(f"\nRevisão aberta em {url} (se não abrir sozinha, cole no navegador). Ctrl+C para sair.", flush=True)
    webbrowser.open(url)
    try: srv.serve_forever()
    except KeyboardInterrupt: print("\nRevisão fechada.")


def preparar(refazer=False):
    try:
        from PIL import Image
    except ImportError:
        sys.exit("Falta o Pillow: pip install -r requirements.txt")
    unis = aprovadas()
    if not unis: sys.exit("Nada aprovado ainda: rode primeiro python pipeline/fotos.py e clique em Salvar.")
    FOTOS.mkdir(parents=True, exist_ok=True)
    usados = set()
    for sigla, u in unis.items():
        for n, f in enumerate(u.get("fotos", []), 1):
            nome = f"fotos/{slug(sigla)}-{n}.webp"
            destino = FOTOS / Path(nome).name
            usados.add(destino.name)
            if destino.exists() and f.get("arquivo") == nome and f.get("origem") == f["url"] and not refazer:
                continue
            print(f"{sigla} · {f['titulo']}", flush=True)
            req = urllib.request.Request(f["url"], headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r, open(destino, "wb") as out:
                out.write(r.read())
            im = Image.open(destino).convert("RGB")
            # recorte central em 3:2 e 1200 × 800 (por isso os créditos dizem "imagens recortadas")
            w, h = im.size; alvo = 3 / 2
            if w / h > alvo: nw = int(h * alvo); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
            else: nh = int(w / alvo); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
            im.resize((1200, 800), Image.LANCZOS).save(destino, "WEBP", quality=78, method=6)
            f["arquivo"], f["origem"] = nome, f["url"]
            time.sleep(0.3)
    for velho in FOTOS.glob("*.webp"):  # fotos que deixaram de ser aprovadas
        if velho.name not in usados: velho.unlink(); print(f"removida: {velho.name}")
    salvar_aprovadas(unis)
    total = sum(len(u.get("fotos", [])) for u in unis.values())
    tam = sum(p.stat().st_size for p in FOTOS.glob("*.webp")) / 1e6
    print(f"\nPronto: {total} fotos em web/public/fotos ({tam:.1f} MB). Agora: git add dados/universidades.json web/public/fotos && git commit && git push")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--preparar", action="store_true", help="baixa as fotos aprovadas e gera os WebP do site")
    ap.add_argument("--refazer", action="store_true", help="com --preparar: gera de novo mesmo as que já existem")
    ap.add_argument("--so-revisar", action="store_true", help="abre a revisão sem buscar candidatas novas")
    a = ap.parse_args()
    if a.preparar: preparar(a.refazer)
    else: revisar(json.loads(CANDIDATAS.read_text(encoding="utf-8")) if a.so_revisar else buscar())
