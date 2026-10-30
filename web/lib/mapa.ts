// Pontos do mapa da home. Roda só no build: projeta lat/lon com a mesma Mercator do desenho (lib/geo-br.json).
import geo from "./geo-br.json";
import { curso } from "./dados";
import { corteAmpla } from "./formato";
import { slugOferta } from "./rotas";

export type Geo = typeof geo;
export const GEO: Geo = geo;

/** Um campus no mapa: r = rota da oferta, x/y já projetados, k = corte da ampla no ano. */
export type Ponto = { r: string; i: string; c: string; u: string; x: number; y: number; k: number; b?: 1 };
export type DadosMapa = { slug: string; curso: string; ano: number; pontos: Ponto[] };

const RAD = Math.PI / 180;
export function projetar(lon: number, lat: number) {
  return [geo.k * lon * RAD + geo.tx, -geo.k * Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) + geo.ty];
}

export function dadosMapa(slug: string): DadosMapa {
  const c = curso(slug);
  const ano = Math.max(...c.anos);
  const pontos: Ponto[] = [];
  for (const o of c.ofertas) {
    const k = corteAmpla(o, ano);
    if (k == null || o.lat == null || o.lon == null) continue;
    const [x, y] = projetar(o.lon, o.lat);
    pontos.push({ r: slugOferta(o), i: o.ies, c: o.municipio, u: o.uf, x: +x.toFixed(1), y: +y.toFixed(1), k, ...((o.bonus_regional_pct ?? 0) > 0 ? { b: 1 as const } : {}) });
  }
  // Abaixo do corte por baixo, quem supera por cima: desenhar do maior corte para o menor.
  pontos.sort((a, b) => b.k - a.k);
  return { slug, curso: c.curso, ano, pontos };
}
