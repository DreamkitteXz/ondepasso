// Funções puras, usadas tanto no build quanto no navegador.
import type { Oferta } from "./dados";

export const nota = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function corteAmpla(o: Pick<Oferta, "cortes">, ano: number | string) {
  return o.cortes[String(ano)]?.AC?.corte ?? null;
}

/** Diferença do corte da ampla entre o ano e o anterior (null se faltar algum). */
export function variacao(o: Pick<Oferta, "cortes">, ano: number) {
  const a = corteAmpla(o, ano), b = corteAmpla(o, ano - 1);
  return a != null && b != null ? +(a - b).toFixed(2) : null;
}

const CURTO: Record<string, string> = {
  AC: "Ampla concorrência",
  LI_EP: "Escola pública",
  LB_EP: "Escola pública + baixa renda",
  LI_PPI: "Escola pública + pretos, pardos e indígenas",
  LB_PPI: "Escola pública + baixa renda + PPI",
  LI_PP: "Escola pública + pretos e pardos",
  LB_PP: "Escola pública + baixa renda + pretos e pardos",
  LI_I: "Escola pública + indígenas",
  LB_I: "Escola pública + baixa renda + indígenas",
  LI_Q: "Escola pública + quilombolas",
  LB_Q: "Escola pública + baixa renda + quilombolas",
  LI_PCD: "Escola pública + pessoas com deficiência",
  LB_PCD: "Escola pública + baixa renda + PcD",
};

/** Nome curto da modalidade; cai na descrição oficial (cortada) para cotas próprias da instituição. */
export function nomeModalidade(codigo: string, descricao?: string) {
  if (CURTO[codigo]) return CURTO[codigo];
  if (/^B\d*$/.test(codigo)) return "Bônus regional (disputa com a ampla)";
  const d = (descricao ?? codigo).replace(/\s+/g, " ").trim();
  return d.length > 70 ? d.slice(0, 68) + "…" : d;
}

export const PESOS: [keyof Oferta["pesos"], string][] = [
  ["red", "Redação"], ["lin", "Linguagens"], ["mat", "Matemática"], ["ch", "Ciências Humanas"], ["cn", "Ciências da Natureza"],
];

export type Status = "supera" | "igual" | "pouco" | "abaixo" | "minimo";
/** Por pouco = até 10 pontos abaixo do corte. Vocabulário fixo: Supera o corte / Por pouco / Abaixo do corte. */
export const POR_POUCO = 10;
export function statusNota(corte: number, minha: number): Status {
  // Tolerância apenas para ruído de ponto flutuante, sem arredondar a média.
  if (Math.abs(minha - corte) < 1e-9) return "igual";
  return minha > corte ? "supera" : corte - minha <= POR_POUCO ? "pouco" : "abaixo";
}
export const ROTULO: Record<Status, string> = { supera: "Supera o corte", igual: "Iguala o corte", pouco: "Por pouco", abaixo: "Abaixo do corte", minimo: "Abaixo do corte" };
export const contagemVazia = (): Record<Status, number> => ({ supera: 0, igual: 0, pouco: 0, abaixo: 0, minimo: 0 });

/** "765,4" ou "765.40" → 765.4; null se não for uma média válida do Enem. */
export function lerNota(s: string): number | null {
  const texto = s.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(texto)) return null;
  const v = Number(texto.replace(",", "."));
  return Number.isFinite(v) && v >= 0 && v <= 1000 ? v : null;
}

/** Não exibe uma diferença não nula como se fosse empate. */
export const diferenca = (v: number) => Math.abs(v) < 1e-9 ? nota(0) : Math.abs(v) < 0.005
  ? v.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 6 })
  : nota(v);
