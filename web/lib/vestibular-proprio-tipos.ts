// Tipos e regras puras das universidades com vestibular próprio (USP/Fuvest e Unicamp/Comvest).
// Fica separado de vestibular-proprio.ts (que lê arquivos no build) para poder ser usado no navegador e nos testes.
import type { Status } from "./formato";

// Mesmo formato de Campus e Foto de lib/universidades.ts (repetido aqui para este arquivo não depender do build).
type Campus = { nome: string; cidade: string; uf: string; n: number; x: number | null; y: number | null };
type Foto = { src: string; titulo: string; autor: string; licenca: string; licencaUrl: string | null; pagina: string };

export type CursoProprio = {
  id: string; nome: string; campus: string; cidade: string; periodo: string; area: string;
  unidade?: string; duracao?: string; habilidades?: boolean;
  /** Vagas no vestibular próprio, por modalidade (Fuvest: AC/EP/PPI) ou só o total (Unicamp). */
  vagas: Record<string, number>; vagasTotais: number;
  /** Vagas somando todas as formas de ingresso, quando a universidade publica (Unicamp). */
  vagasTodas?: number;
  carreira?: number; carreiraNome?: string;
  /** Corte por modalidade, em acertos na 1ª fase. Na Fuvest é o corte da carreira inteira. */
  cortes: Record<string, number | null>;
  corteAnterior: number | null;
  inscritosCarreira?: number; vagasCarreira?: number;
};

export type Proprio = {
  sigla: string; slug: string; nome: string; tipo: string; site: string; geradoEm: string;
  vestibular: { id: string; nome: string; edicao: number; site: string; taxa: string };
  prova: { questoes: number; minimo: number | null; unidade: string; fase: string; nota: string };
  modalidades: { cod: string; nome: string }[];
  ingresso: { nome: string; vagas: number; detalhe: string; texto: string; link: string | null }[];
  cotas: string[];
  calendario: { data: string; fim?: string; evento: string }[];
  unidades?: Record<string, string>;
  cursos: CursoProprio[]; campi: Campus[]; fotos: Foto[]; ufs: string[]; cidades: string[];
  nCarreiras: number | null;
  provas: string;
  fontes: { titulo: string; url: string }[];
  conferencia: string;
};

/** Em acertos, "por pouco" é até 3 abaixo do corte (na média do Enem são 10 pontos). */
export const POR_POUCO_ACERTOS = 3;

export function statusAcertos(corte: number, acertos: number, minimo: number | null): Status {
  if (minimo != null && acertos < minimo) return "minimo";
  if (acertos === corte) return "igual";
  return acertos > corte ? "supera" : corte - acertos <= POR_POUCO_ACERTOS ? "pouco" : "abaixo";
}

/** "34" → 34, dentro de 0..max; qualquer outra coisa → null. */
export function lerAcertos(s: string, max: number): number | null {
  const t = s.trim();
  if (!/^\d{1,3}$/.test(t)) return null;
  const n = Number(t);
  return n <= max ? n : null;
}

/** Concorrência da carreira (Fuvest), em candidatos por vaga. */
export const concorrencia = (c: CursoProprio) => (c.inscritosCarreira && c.vagasCarreira ? c.inscritosCarreira / c.vagasCarreira : null);

/** Situação de uma data do calendário em relação a hoje (datas no formato AAAA-MM-DD). */
export function situacaoData(d: { data: string; fim?: string }, hoje: string): "passou" | "agora" | "proxima" {
  const fim = d.fim ?? d.data;
  if (fim < hoje) return "passou";
  if (d.data <= hoje) return "agora";
  return "proxima";
}
