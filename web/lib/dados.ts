// Leitura dos JSON gerados por pipeline/construir.py (em ../dados/saida/site).
// Só roda no build (Server Components); nada disso vai para o navegador.
import fs from "node:fs";
import path from "node:path";

const SITE = path.join(process.cwd(), "..", "dados", "saida", "site");

export type Cortes = Record<string, Record<string, { corte: number | null; vagas: number | null; inscritos: number | null }>>;
export type Areas = { red: number | null; lin: number | null; mat: number | null; ch: number | null; cn: number | null };
export type Oferta = {
  id: string; ies: string; ies_nome: string; categoria: string; campus: string; municipio: string; uf: string;
  ibge: string | null; lat: number | null; lon: number | null; grau: string; turno: string;
  media_minima: number | null; bonus_regional_pct: number | null; pesos: Areas; minimas: Areas; cortes: Cortes;
};
export type Curso = { curso: string; slug: string; anos: number[]; ofertas: Oferta[] };
export type ItemIndice = { curso: string; slug: string; ofertas: number; ufs: number; ampla_min: number | null; ampla_max: number | null };
export type Indice = { atualizado: string; fonte: string; anos: number[]; cursos: ItemIndice[] };

const cache = new Map<string, unknown>();
function ler<T>(arquivo: string): T {
  if (!cache.has(arquivo)) cache.set(arquivo, JSON.parse(fs.readFileSync(path.join(SITE, arquivo), "utf-8")));
  return cache.get(arquivo) as T;
}

export const indice = () => ler<Indice>("cursos.json");
export const curso = (slug: string) => ler<Curso>(path.join("curso", `${slug}.json`));
export const modalidades = () => ler<Record<string, string>>("modalidades.json");
