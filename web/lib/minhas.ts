// Como a nota do aluno vira "a média dele" em cada opção.
// Com as 5 notas por área, cada opção calcula a média ponderada com os próprios pesos (e confere as notas mínimas).
// Só com a média única, ela vale igual em toda opção, e as opções com pesos ganham um aviso.
import { nota as fmt, statusNota, type Status } from "./formato";

/** Pesos e mínimos de uma opção, na ordem red, lin, mat, ch, cn. Ausentes = pesos iguais / sem mínimo. */
export type Pesos = { p?: number[]; mi?: number[]; mm?: number };
/** n = as 5 notas por área (se completas); media = média simples delas, ou a média única digitada. */
export type Minhas = { n: number[] | null; media: number };

export const AREAS = ["red", "lin", "mat", "ch", "cn"] as const;
export const NOME_AREA = ["Redação", "Linguagens", "Matemática", "Humanas", "Natureza"];

/** Pesos/mínimos compactos para o JSON: só o que difere do padrão. */
export function pesosCompactos(o: { pesos: Record<string, number | null>; minimas: Record<string, number | null>; media_minima: number | null }): Pesos {
  const p = AREAS.map((a) => o.pesos[a] ?? 1);
  const mi = AREAS.map((a) => { const v = o.minimas[a]; return v != null && v > 0 ? v : 0; });
  const mm = o.media_minima != null && o.media_minima > 0 ? o.media_minima : 0;
  return { ...(new Set(p).size > 1 ? { p } : {}), ...(mi.some(Boolean) ? { mi } : {}), ...(mm ? { mm } : {}) };
}

export const temPesos = (o?: Pesos) => !!o?.p;

/** A média do aluno nesta opção. */
export function suaMedia(m: Minhas, o?: Pesos): { v: number; ponderada: boolean; minimo: string | null } {
  if (!m.n) return { v: m.media, ponderada: false, minimo: null };
  const n = m.n;
  let v = m.media, ponderada = false;
  if (o?.p) {
    const soma = o.p.reduce((a, b) => a + b, 0);
    if (soma > 0) { v = o.p.reduce((a, p, i) => a + p * n[i], 0) / soma; ponderada = true; }
  }
  const falta = o?.mi ? o.mi.findIndex((x, i) => x > 0 && n[i] < x) : -1;
  const minimo = falta >= 0 ? `nota mínima em ${NOME_AREA[falta]}: ${fmt(o!.mi![falta])}` : o?.mm && v < o.mm ? `média mínima: ${fmt(o.mm)}` : null;
  return { v, ponderada, minimo };
}

/** Status contra o corte; não atingir uma nota mínima tira da disputa, tem uma situação própria. */
export function statusPara(m: Minhas, o: Pesos | undefined, corte: number): Status {
  const r = suaMedia(m, o);
  return r.minimo ? "minimo" : statusNota(corte, r.v);
}
