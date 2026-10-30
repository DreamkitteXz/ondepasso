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
