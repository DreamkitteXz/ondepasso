// Universidades fora do Sisu, com vestibular próprio (USP pela Fuvest e Unicamp pela Comvest).
// Roda só no build. Os dados vêm de dados/vestibulares/universidades/<slug>.json, montados à mão a partir
// dos documentos oficiais (guia de carreiras, manual do ingresso e tabelas de notas de corte), com as fontes no próprio arquivo.
import fs from "node:fs";
import path from "node:path";
import { projetar } from "./mapa";
import type { Campus, Foto, ResumoUni } from "./universidades";
import type { CursoProprio, Proprio } from "./vestibular-proprio-tipos";

export type { CursoProprio, Proprio } from "./vestibular-proprio-tipos";

const RAIZ = path.join(process.cwd(), "..");
const PASTA = path.join(RAIZ, "dados", "vestibulares", "universidades");

type Bruto = Omit<Proprio, "campi" | "cursos" | "fotos" | "ufs" | "cidades"> & {
  campi: { nome: string; cidade: string; uf: string; n: number; lat: number; lon: number }[];
  carreiras?: { cod: number; nome: string; area: string; vagas: number; inscritos: number; corte: Record<string, number | null> }[];
  cursos: (Omit<CursoProprio, "vagasTotais" | "corte" | "corteAnterior" | "cortes" | "carreiraNome" | "inscritos"> & {
    vagas: Record<string, number> | number; vagasTotal?: number; corte?: number | null; corteAnterior?: number | null; carreira?: number;
  })[];
};

/** Fotos aprovadas em dados/universidades.json (pipeline/fotos.py), as mesmas regras das outras universidades. */
function fotosDe(sigla: string): Foto[] {
  try {
    const e = JSON.parse(fs.readFileSync(path.join(RAIZ, "dados", "universidades.json"), "utf-8")).universidades?.[sigla];
    return (e?.fotos ?? []).filter((f: { arquivo?: string }) => f.arquivo && fs.existsSync(path.join(process.cwd(), "public", f.arquivo)))
      .slice(0, 3).map((f: { arquivo: string; titulo: string; autor: string; licenca: string; licenca_url?: string | null; pagina: string }) =>
        ({ src: "/" + f.arquivo, titulo: f.titulo, autor: f.autor, licenca: f.licenca, licencaUrl: f.licenca_url ?? null, pagina: f.pagina }));
  } catch { return []; }
}

function montar(b: Bruto): Proprio {
  const carreiras = new Map((b.carreiras ?? []).map((c) => [c.cod, c]));
  const cursos: CursoProprio[] = b.cursos.map((c) => {
    const k = c.carreira != null ? carreiras.get(c.carreira) : undefined;
    const vagas = typeof c.vagas === "number" ? { total: c.vagas } : c.vagas;
    const total = typeof c.vagas === "number" ? c.vagas : Object.values(c.vagas).reduce((t, n) => t + n, 0);
    return {
      id: c.id, nome: c.nome, campus: c.campus, cidade: c.cidade, periodo: c.periodo, area: c.area,
      unidade: c.unidade, duracao: c.duracao, habilidades: c.habilidades,
      vagas, vagasTotais: total, vagasTodas: c.vagasTotal,
      carreira: c.carreira, carreiraNome: k?.nome,
      // Fuvest: o corte é da carreira, por modalidade. Unicamp: um corte por curso (não cotistas sem PAAIS).
      cortes: k ? k.corte : c.corte != null ? { NC0: c.corte } : {},
      corteAnterior: c.corteAnterior ?? null,
      inscritosCarreira: k?.inscritos, vagasCarreira: k?.vagas,
    };
  });
  const campi: Campus[] = b.campi.map((c) => { const [x, y] = projetar(c.lon, c.lat); return { nome: c.nome, cidade: c.cidade, uf: c.uf, n: c.n, x: +x.toFixed(1), y: +y.toFixed(1) }; });
  const { carreiras: _c, ...resto } = b;
  void _c;
  return {
    ...resto, cursos, campi, fotos: fotosDe(b.sigla),
    ufs: [...new Set(campi.map((c) => c.uf))].sort(), cidades: [...new Set(campi.map((c) => `${c.cidade}/${c.uf}`))],
    nCarreiras: carreiras.size || null,
  };
}

let cache: Proprio[] | null = null;
export function proprias(): Proprio[] {
  if (cache) return cache;
  const arqs = fs.existsSync(PASTA) ? fs.readdirSync(PASTA).filter((f) => f.endsWith(".json")).sort() : [];
  cache = arqs.map((f) => montar(JSON.parse(fs.readFileSync(path.join(PASTA, f), "utf-8")) as Bruto))
    .sort((a, b) => b.ingresso[0].vagas - a.ingresso[0].vagas);
  return cache;
}

export const propria = (slug: string) => proprias().find((u) => u.slug === slug) ?? null;

/** Faixa de cortes de uma universidade de vestibular próprio, na escala da prova dela (acertos). */
export function faixaCortes(u: Proprio, mod: string) {
  const v = u.cursos.map((c) => c.cortes[mod]).filter((n): n is number => n != null);
  return v.length ? { min: Math.min(...v), max: Math.max(...v) } : null;
}

/** Cartão da lista de universidades. min/max ficam nulos: a escala (acertos) não é a do Sisu. */
export function resumoProprias(): ResumoUni[] {
  return proprias().map((u) => {
    const porUf: Record<string, number> = {};
    for (const c of u.campi) porUf[c.uf] = (porUf[c.uf] ?? 0) + c.n;
    const mod = u.modalidades[0].cod;
    const f = faixaCortes(u, mod);
    return {
      slug: u.slug, sigla: u.sigla, nome: u.nome, tipo: u.tipo, ufs: u.ufs, comCorte: u.cursos.filter((c) => c.cortes[mod] != null).length,
      min: null, max: null, cidades: u.cidades.length, ofertas: u.cursos.length, porUf,
      proprio: { vestibular: u.vestibular.nome.replace(/ \(.*\)$/, ""), edicao: u.vestibular.edicao, questoes: u.prova.questoes, min: f?.min ?? null, max: f?.max ?? null, vagas: u.cursos.reduce((t, c) => t + c.vagasTotais, 0) },
    };
  });
}
