// Páginas de universidade (Figma 06a/06b · W6a/W6b). Roda só no build: junta as ofertas de todos os cursos por instituição.
// Fotos e site oficial vêm de dados/universidades.json (gerado por pipeline/fotos.py e revisado à mão); sem ele, a página sai só com texto.
import fs from "node:fs";
import path from "node:path";
import { indice, curso } from "./dados";
import { corteAmpla, variacao } from "./formato";
import { cortesPorMod, nomesMods, projetar, GEO } from "./mapa";
import { pesosCompactos, type Pesos } from "./minhas";
import { slugOferta } from "./rotas";

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const slugIes = slug;

export type Foto = { src: string; titulo: string; autor: string; licenca: string; licencaUrl: string | null; pagina: string };
type Extra = { site?: string | null; fotos?: { arquivo: string; titulo: string; autor: string; licenca: string; licenca_url?: string | null; pagina: string }[] };

export type CursoUni = {
  r: string; curso: string; slug: string; campus: string; c: string; u: string; t: string; grau: string;
  m: Record<string, number>; delta: number | null; b?: 1;
} & Pesos;
export type Campus = { nome: string; cidade: string; uf: string; n: number; x: number | null; y: number | null };
export type Universidade = {
  slug: string; sigla: string; nome: string; tipo: string; ufs: string[]; cidades: string[];
  campi: Campus[]; cursos: CursoUni[]; comCorte: number; min: number | null; max: number | null;
  site: string | null; fotos: Foto[];
};
export type ResumoUni = Pick<Universidade, "slug" | "sigla" | "nome" | "tipo" | "ufs" | "comCorte" | "min" | "max"> & { cidades: number; ofertas: number; porUf: Record<string, number> };

const TIPO: Record<string, string> = { "Pública Federal": "Pública federal", "Pública Estadual": "Pública estadual", "Pública Municipal": "Pública municipal" };
const RAIZ = path.join(process.cwd(), "..");

function extras(): Record<string, Extra> {
  try { return JSON.parse(fs.readFileSync(path.join(RAIZ, "dados", "universidades.json"), "utf-8")).universidades ?? {}; } catch { return {}; }
}

let cache: { ano: number; lista: Universidade[] } | null = null;
export function universidades() {
  if (cache) return cache;
  const idx = indice();
  const ano = Math.max(...idx.anos);
  const por = new Map<string, Universidade & { _campi: Map<string, Campus> }>();
  for (const it of idx.cursos) {
    const c = curso(it.slug);
    for (const o of c.ofertas) {
      let u = por.get(o.ies);
      if (!u) {
        u = { slug: slug(o.ies), sigla: o.ies, nome: o.ies_nome, tipo: TIPO[o.categoria] ?? o.categoria, ufs: [], cidades: [], campi: [], cursos: [], comCorte: 0, min: null, max: null, site: null, fotos: [], _campi: new Map() };
        por.set(o.ies, u);
      }
      const chave = `${o.campus}|${o.municipio}|${o.uf}`;
      const cp = u._campi.get(chave) ?? { nome: o.campus, cidade: o.municipio, uf: o.uf, n: 0, x: null, y: null };
      cp.n++;
      if (cp.x == null && o.lat != null && o.lon != null) { const [x, y] = projetar(o.lon, o.lat); cp.x = +x.toFixed(1); cp.y = +y.toFixed(1); }
      u._campi.set(chave, cp);
      const a = corteAmpla(o, ano);
      if (a != null) { u.comCorte++; u.min = u.min == null ? a : Math.min(u.min, a); u.max = u.max == null ? a : Math.max(u.max, a); }
      u.cursos.push({
        r: slugOferta(o), curso: c.curso, slug: c.slug, campus: o.campus, c: o.municipio, u: o.uf, t: o.turno, grau: o.grau,
        m: cortesPorMod(o.cortes, ano), delta: variacao(o, ano), ...((o.bonus_regional_pct ?? 0) > 0 ? { b: 1 as const } : {}), ...pesosCompactos(o),
      });
    }
  }
  const ext = extras();
  const lista = [...por.values()].map(({ _campi, ...u }) => {
    const campi = [..._campi.values()].sort((a, b) => b.n - a.n);
    const cidades = [...new Set(campi.map((c) => `${c.cidade}/${c.uf}`))];
    const e = ext[u.sigla] ?? {};
    // Só entra foto cujo arquivo foi preparado (pipeline/fotos.py --preparar) e está em web/public/fotos.
    const fotos = (e.fotos ?? []).filter((f) => f.arquivo && fs.existsSync(path.join(process.cwd(), "public", f.arquivo)))
      .slice(0, 3).map((f) => ({ src: "/" + f.arquivo, titulo: f.titulo, autor: f.autor, licenca: f.licenca, licencaUrl: f.licenca_url ?? null, pagina: f.pagina }));
    return { ...u, campi, cidades, ufs: [...new Set(campi.map((c) => c.uf))].sort(), site: e.site ?? null, fotos };
  }).sort((a, b) => a.sigla.localeCompare(b.sigla, "pt-BR"));
  cache = { ano, lista };
  return cache;
}

export const universidade = (s: string) => universidades().lista.find((u) => u.slug === s)!;

export function resumoUniversidades(): ResumoUni[] {
  return universidades().lista.map((u) => {
    const porUf: Record<string, number> = {};
    for (const c of u.cursos) porUf[c.u] = (porUf[c.u] ?? 0) + 1;
    return { slug: u.slug, sigla: u.sigla, nome: u.nome, tipo: u.tipo, ufs: u.ufs, comCorte: u.comCorte, min: u.min, max: u.max, cidades: u.cidades.length, ofertas: u.cursos.length, porUf };
  });
}

/** Contorno do estado (ou do Brasil, se a instituição tiver campi em mais de um estado) para o mapa "Onde fica". */
export function contorno(u: Universidade) {
  if (u.ufs.length === 1) { const e = GEO.ufs.find((g) => g.uf === u.ufs[0]); if (e) return { ufs: [{ uf: e.uf, d: e.d }], box: e.box as [number, number, number, number] }; }
  return { ufs: GEO.ufs.map((g) => ({ uf: g.uf, d: g.d })), box: [0, 0, GEO.w, GEO.h] as [number, number, number, number] };
}

export const modsDe = (u: Universidade) => nomesMods(new Set(u.cursos.flatMap((c) => Object.keys(c.m))));
