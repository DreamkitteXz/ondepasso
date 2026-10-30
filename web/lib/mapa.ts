// Pontos do mapa da home. Roda só no build: projeta lat/lon com a mesma Mercator do desenho (lib/geo-br.json).
import geo from "./geo-br.json";
import { curso } from "./dados";
import { nomeModalidade } from "./formato";
import { slugOferta } from "./rotas";

export type Geo = typeof geo;
export const GEO: Geo = geo;

/** Modalidades que dá para trocar no mapa (as da Lei de Cotas, com nome curto). */
const MODS = ["AC", "LI_EP", "LB_EP", "LI_PPI", "LB_PPI", "LI_PP", "LB_PP", "LI_I", "LB_I", "LI_Q", "LB_Q", "LI_PCD", "LB_PCD"];

/**
 * Um campus no mapa. r = rota da oferta, x/y já projetados, t = turno, n = inscritos na ampla,
 * m = corte por modalidade no último ano (só as que existem nessa oferta).
 */
export type Ponto = { r: string; i: string; c: string; u: string; x: number; y: number; t: string; n: number; m: Record<string, number>; b?: 1 };
export type DadosMapa = { slug: string; curso: string; ano: number; mods: { cod: string; nome: string }[]; pontos: Ponto[] };

const RAD = Math.PI / 180;
export function projetar(lon: number, lat: number) {
  return [geo.k * lon * RAD + geo.tx, -geo.k * Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) + geo.ty];
}

export function dadosMapa(slug: string): DadosMapa {
  const c = curso(slug);
  const ano = Math.max(...c.anos);
  const pontos: Ponto[] = [];
  const usadas = new Map<string, number>();
  for (const o of c.ofertas) {
    const doAno = o.cortes[String(ano)] ?? {};
    if (o.lat == null || o.lon == null || doAno.AC?.corte == null) continue;
    const m: Record<string, number> = {};
    for (const cod of MODS) { const v = doAno[cod]?.corte; if (v != null) { m[cod] = v; usadas.set(cod, (usadas.get(cod) ?? 0) + 1); } }
    const [x, y] = projetar(o.lon, o.lat);
    pontos.push({ r: slugOferta(o), i: o.ies, c: o.municipio, u: o.uf, x: +x.toFixed(1), y: +y.toFixed(1), t: o.turno, n: doAno.AC?.inscritos ?? 0, m, ...((o.bonus_regional_pct ?? 0) > 0 ? { b: 1 as const } : {}) });
  }
  // Abaixo do corte por baixo, quem supera por cima: desenhar do maior corte para o menor.
  pontos.sort((a, b) => b.m.AC - a.m.AC);
  const mods = MODS.filter((cod) => (usadas.get(cod) ?? 0) > 0).map((cod) => ({ cod, nome: nomeModalidade(cod) }));
  return { slug, curso: c.curso, ano, mods, pontos };
}

/** "Mais disputados": a opção com mais inscritos na ampla de cada curso pedido. */
export function maisDisputados(slugs: string[]) {
  return slugs.map((s) => {
    const d = dadosMapa(s);
    const p = [...d.pontos].sort((a, b) => b.n - a.n)[0];
    return { curso: d.curso, slug: s, ...p };
  });
}
