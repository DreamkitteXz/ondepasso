// Motor do relatório pago (/relatorio/). Tudo aqui é conta pura, feita no navegador do aluno: as notas não saem do aparelho.
// Entrada: as linhas de /calc.json (pesos e cortes do último ano) e as de /relatorio.json (histórico, vagas, inscritos),
// alinhadas pelo índice. Saída: cada opção com a média do aluno, a folga, a faixa de risco e os alertas.
// Nada aqui prevê aprovação: as faixas comparam a nota com os cortes das edições passadas.
import { suaMedia } from "./minhas";

/** Mesma forma de LinhaCalc (lib/calc.ts), repetida aqui para o motor não depender de código do build. */
export type LinhaBase = [number, string, string, string, string, number[], number[], number, Record<string, number>];
export type BaseCalc = { ano: number; cursos: { curso: string; slug: string; g: number }[]; grupos: string[]; mods: { cod: string; nome: string }[]; linhas: LinhaBase[] };
/** Qualidade (Inep), quando o pipeline tiver os dados: conceito Enade, CPC e IGC da instituição, de 1 a 5. */
export type Qualidade = { enade?: number; cpc?: number; igc?: number; ano?: number };
/** [turno, grau, categoria, bônus regional %, cortes dos anos anteriores por modalidade (ordem de `anosAntes`), [vagas, inscritos] do último ano por modalidade, qualidade] */
export type LinhaRel = [string, string, string, number, Record<string, (number | null)[]>, Record<string, [number, number]>, Qualidade?];
export type DadosRelatorio = { ano: number; anosAntes: number[]; linhas: LinhaRel[] };

export type Faixa = "segura" | "provavel" | "limite" | "ousada" | "fora";
export const NOME_FAIXA: Record<Faixa, string> = { segura: "Com folga", provavel: "Acima do corte", limite: "No limite", ousada: "Aposta", fora: "Fora do alcance" };
export const EXPLICA_FAIXA: Record<Faixa, string> = {
  segura: "Sua média passa do corte por mais do que ele costuma variar de um ano para o outro.",
  provavel: "Sua média passa do corte, mas a folga é menor que a variação que esse corte já teve.",
  limite: "Sua média fica até 10 pontos abaixo do corte.",
  ousada: "Sua média fica de 10 a 25 pontos abaixo do corte.",
  fora: "Mais de 25 pontos abaixo do corte, ou sem atingir uma nota mínima.",
};
export type Alerta = "subindo" | "bonus" | "concorrida" | "sem-historico" | "poucas-vagas";
export const TEXTO_ALERTA: Record<Alerta, string> = {
  subindo: "O corte subiu no último ano mais do que a sua folga.",
  bonus: "Tem bônus regional: quem é da região soma pontos e disputa junto, o que puxa o corte para cima.",
  concorrida: "Mais de 30 inscritos por vaga na última edição.",
  "sem-historico": "Só há corte de uma edição: não dá para ver a tendência.",
  "poucas-vagas": "Até 2 vagas nesta modalidade: o corte muda muito de um ano para o outro.",
};

export type Opcao = {
  i: number; curso: string; slug: string; rota: string; ies: string; cidade: string; uf: string; g: number;
  turno: string; grau: string; categoria: string;
  /** Média do aluno com os pesos da opção, média simples e a diferença entre as duas. */
  media: number; simples: number; ganho: number;
  corte: number; folga: number; minimo: string | null;
  /** Cortes por ano (do mais antigo ao mais recente), só os anos com corte. */
  hist: { ano: number; corte: number }[];
  /** Último corte menos o anterior; null se só há um. */
  variacao: number | null;
  /** Maior variação entre dois anos seguidos; null se só há um corte. */
  oscilacao: number | null;
  vagas: number | null; inscritos: number | null; porVaga: number | null; bonus: number;
  faixa: Faixa; alertas: Alerta[]; q?: Qualidade;
};
export type Filtro = { ufs: string[]; grupos: number[]; turnos: string[] };

export const POR_POUCO = 10, APOSTA = 25, OSCILACAO_PADRAO = 10, CONCORRIDA = 30;

export function faixaDe(folga: number, oscilacao: number | null, minimo: string | null): Faixa {
  if (minimo) return "fora";
  if (folga >= Math.max(POR_POUCO, oscilacao ?? OSCILACAO_PADRAO)) return "segura";
  if (folga >= 0) return "provavel";
  if (folga >= -POR_POUCO) return "limite";
  if (folga >= -APOSTA) return "ousada";
  return "fora";
}

/** Todas as opções com corte na modalidade, dentro do filtro, já classificadas. Filtro vazio = sem restrição. */
export function analisar(calc: BaseCalc, rel: DadosRelatorio, n: number[], mod: string, filtro: Filtro): Opcao[] {
  const simples = n.reduce((a, b) => a + b, 0) / 5;
  const minha = { n, media: simples };
  const out: Opcao[] = [];
  calc.linhas.forEach(([ci, rota, ies, cidade, uf, pesos, minimas, mediaMin, cortes], i) => {
    const corte = cortes[mod];
    if (corte == null) return;
    const c = calc.cursos[ci];
    const r = rel.linhas[i];
    if (!c || !r) return;
    const [turno, grau, categoria, bonus, antes, conc, q] = r;
    if (filtro.ufs.length && !filtro.ufs.includes(uf)) return;
    if (filtro.grupos.length && !filtro.grupos.includes(c.g)) return;
    if (filtro.turnos.length && !filtro.turnos.includes(turno)) return;
    const { v: media, minimo } = suaMedia(minha, { p: pesos, mi: minimas, mm: mediaMin });
    const hist: Opcao["hist"] = [];
    (antes[mod] ?? []).forEach((v, k) => { if (v != null) hist.push({ ano: rel.anosAntes[k], corte: v }); });
    hist.push({ ano: rel.ano, corte });
    const difs = hist.slice(1).map((h, k) => h.corte - hist[k].corte);
    const variacao = difs.length ? difs[difs.length - 1] : null;
    const oscilacao = difs.length ? Math.max(...difs.map(Math.abs)) : null;
    const [vagas, inscritos] = conc[mod] ?? [0, 0];
    const porVaga = vagas > 0 && inscritos > 0 ? inscritos / vagas : null;
    const folga = media - corte;
    const faixa = faixaDe(folga, oscilacao, minimo);
    const alertas: Alerta[] = [];
    if (variacao != null && variacao > 0 && folga >= 0 && folga < variacao) alertas.push("subindo");
    if (bonus > 0) alertas.push("bonus");
    if (porVaga != null && porVaga > CONCORRIDA) alertas.push("concorrida");
    if (vagas > 0 && vagas <= 2) alertas.push("poucas-vagas");
    if (hist.length === 1) alertas.push("sem-historico");
    out.push({ i, curso: c.curso, slug: c.slug, rota, ies, cidade, uf, g: c.g, turno, grau, categoria, media, simples, ganho: media - simples, corte, folga, minimo,
      hist, variacao, oscilacao, vagas: vagas || null, inscritos: inscritos || null, porVaga, bonus, faixa, alertas, ...(q ? { q } : {}) });
  });
  return out;
}

export const FAIXAS: Faixa[] = ["segura", "provavel", "limite", "ousada", "fora"];
export function contarFaixas(ops: Opcao[]): Record<Faixa, number> {
  const c: Record<Faixa, number> = { segura: 0, provavel: 0, limite: 0, ousada: 0, fora: 0 };
  for (const o of ops) c[o.faixa]++;
  return c;
}

const porCorte = (a: Opcao, b: Opcao) => b.corte - a.corte || a.curso.localeCompare(b.curso);
/**
 * O Sisu deixa escolher duas opções, e a primeira tem prioridade. A sugestão é a leitura mais comum dessa regra:
 * na 1ª, a opção mais disputada que ainda está ao alcance; na 2ª, a mais disputada entre as que têm folga.
 * A lista vem ordenada pelo corte (o mais alto primeiro); quem decide o que quer cursar é o aluno.
 */
export function estrategia(ops: Opcao[], quantas = 5): { primeira: Opcao[]; segunda: Opcao[] } {
  const primeira = ops.filter((o) => o.faixa === "provavel" || o.faixa === "limite" || o.faixa === "ousada").sort(porCorte).slice(0, quantas);
  const segunda = ops.filter((o) => o.faixa === "segura").sort(porCorte).slice(0, quantas);
  return { primeira, segunda };
}

/** Opções ao alcance em que os pesos mais ajudam o aluno (média ponderada acima da média simples). */
export function valemMais(ops: Opcao[], quantas = 10): Opcao[] {
  return ops.filter((o) => o.faixa !== "fora" && o.ganho > 0.005).sort((a, b) => b.ganho - a.ganho || porCorte(a, b)).slice(0, quantas);
}

/** Dentro de uma faixa: as de corte mais alto primeiro (as mais disputadas que o aluno alcança). */
export function daFaixa(ops: Opcao[], f: Faixa): Opcao[] {
  return ops.filter((o) => o.faixa === f).sort(f === "fora" ? (a, b) => b.folga - a.folga : porCorte);
}

export const NOME_AREAS = ["Redação", "Linguagens", "Matemática", "Humanas", "Natureza"];
/** Área mais forte e mais fraca do aluno (índices na ordem red, lin, mat, ch, cn). */
export function extremos(n: number[]): { forte: number; fraca: number } {
  let forte = 0, fraca = 0;
  n.forEach((v, i) => { if (v > n[forte]) forte = i; if (v < n[fraca]) fraca = i; });
  return { forte, fraca };
}
