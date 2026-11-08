// Biblioteca de provas do Enem: tipos e funções puras (podem ir para o navegador).
// Os dados vêm de pipeline/provas_inep.py → dados/saida/site/provas.json (só links oficiais conferidos).

export type Arquivo = { url: string; bytes: number; formato: "pdf" | "txt" };
export type Versao = Arquivo & { tipo: "ampliada" | "superampliada" | "ledor" | "atendimento" | "nvda" | "dosvox" | "outra"; rotulo: string };
export type Area = "linguagens" | "humanas" | "natureza" | "matematica";
export type Modalidade = "regular" | "digital" | "belem" | "reaplicacao";

export type Prova = {
  id: string;
  ano: number;
  dia: 1 | 2;
  caderno: number;
  cor: string;
  corRotulo: string;
  corHex: string;
  modalidade: Modalidade;
  modalidadeRotulo: string;
  variante: "libras" | "braile-ledor" | null;
  idioma: "ingles" | "espanhol" | null;
  areas: Area[];
  questoes: number;
  redacao: boolean;
  prova: Arquivo;
  gabarito: Arquivo | null;
  versoes: Versao[];
  indisponiveis: { tipo: string; url: string }[];
  fonte: string;
};

export type Extra = Arquivo & { ano: number; tipo: "tema-redacao"; rotulo: string };
export type Acervo = { verificadoEm: string; fonte: string; anos: number[]; provas: Prova[]; extras: Extra[] };

export const AREA_ROTULO: Record<Area, string> = {
  linguagens: "Linguagens", humanas: "Ciências Humanas", natureza: "Ciências da Natureza", matematica: "Matemática",
};
/** Faixa oficial de numeração das questões de cada área (Enem desde 2017). */
export const AREA_QUESTOES: Record<Area, [number, number]> = {
  linguagens: [1, 45], humanas: [46, 90], natureza: [91, 135], matematica: [136, 180],
};
export const MODALIDADE_CURTA: Record<Modalidade, string> = {
  regular: "Regular", digital: "Digital", belem: "Belém (PA)", reaplicacao: "Reaplicação",
};
export const IDIOMA_ROTULO = { ingles: "Inglês", espanhol: "Espanhol" } as const;
export const VARIANTE_ROTULO = { libras: "Libras", "braile-ledor": "Braile e ledor" } as const;

export const diaRotulo = (d: 1 | 2) => (d === 1 ? "1º dia" : "2º dia");

/** "Enem 2025 · 1º dia · Caderno 1 Azul" (+ variante/idioma). */
export function tituloProva(p: Prova, comAno = true): string {
  const partes = [comAno ? `Enem ${p.ano}` : null, diaRotulo(p.dia), `Caderno ${p.caderno} ${p.corRotulo}`];
  if (p.variante) partes.push(VARIANTE_ROTULO[p.variante]);
  if (p.idioma) partes.push(IDIOMA_ROTULO[p.idioma]);
  return partes.filter(Boolean).join(" · ");
}

export function descricaoProva(p: Prova): string {
  const areas = p.areas.map((a) => AREA_ROTULO[a]).join(" e ");
  return `Prova oficial do Enem ${p.ano}, ${diaRotulo(p.dia)} (${areas}${p.redacao ? " e Redação" : ""}), caderno ${p.caderno} ${p.corRotulo.toLowerCase()}, ${p.modalidadeRotulo.toLowerCase()}. ${p.questoes} questões${p.redacao ? " + redação" : ""}${p.gabarito ? ", com gabarito oficial" : ""}. Leitura online e PDF do Inep.`;
}

export const megas = (b: number) => `${(b / 1048576).toLocaleString("pt-BR", { maximumFractionDigits: b < 10485760 ? 1 : 0 })} MB`;

/** Texto usado pela busca da biblioteca (minúsculo, sem acento). */
export function textoBusca(p: Prova): string {
  return semAcento([
    "enem", p.ano, diaRotulo(p.dia), p.dia === 1 ? "primeiro dia" : "segundo dia", `caderno ${p.caderno}`, p.corRotulo, p.modalidadeRotulo,
    MODALIDADE_CURTA[p.modalidade], p.modalidade === "reaplicacao" ? "ppl" : "", p.variante ? VARIANTE_ROTULO[p.variante] : "",
    p.idioma ? IDIOMA_ROTULO[p.idioma] : "", ...p.areas.map((a) => AREA_ROTULO[a]), p.redacao ? "redacao" : "",
    p.gabarito ? "gabarito" : "", p.versoes.map((v) => v.rotulo).join(" "),
  ].join(" "));
}
export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---------------------------------------------------------------- filtros

export type Filtros = {
  ano: number | null;
  dia: 1 | 2 | null;
  area: Area | null;
  cor: string | null;
  modalidade: Modalidade | null;
  acessivel: boolean;
  busca: string;
};
export const FILTROS_VAZIOS: Filtros = { ano: null, dia: null, area: null, cor: null, modalidade: null, acessivel: false, busca: "" };

export function filtrar(lista: Prova[], f: Filtros): Prova[] {
  const termos = semAcento(f.busca).split(/\s+/).filter(Boolean);
  return lista.filter((p) =>
    (f.ano == null || p.ano === f.ano) &&
    (f.dia == null || p.dia === f.dia) &&
    (f.area == null || p.areas.includes(f.area)) &&
    (f.cor == null || p.cor === f.cor) &&
    (f.modalidade == null || p.modalidade === f.modalidade) &&
    (!f.acessivel || p.versoes.length > 0 || p.variante != null) &&
    (termos.length === 0 || termos.every((t) => textoBusca(p).includes(t))));
}

/** Filtros ↔ query string (?ano=2025&dia=1…), para a URL ser compartilhável. */
export function filtrosDaUrl(q: URLSearchParams): Filtros {
  const n = (k: string) => { const v = Number(q.get(k)); return Number.isInteger(v) && v > 0 ? v : null; };
  const dia = n("dia");
  const area = q.get("area");
  const mod = q.get("modalidade");
  return {
    ano: n("ano"),
    dia: dia === 1 || dia === 2 ? dia : null,
    area: area && area in AREA_ROTULO ? (area as Area) : null,
    cor: q.get("cor")?.slice(0, 20) || null,
    modalidade: mod && mod in MODALIDADE_CURTA ? (mod as Modalidade) : null,
    acessivel: q.get("acessivel") === "1",
    busca: (q.get("q") ?? "").slice(0, 80),
  };
}
export function filtrosParaUrl(f: Filtros): string {
  const q = new URLSearchParams();
  if (f.ano) q.set("ano", String(f.ano));
  if (f.dia) q.set("dia", String(f.dia));
  if (f.area) q.set("area", f.area);
  if (f.cor) q.set("cor", f.cor);
  if (f.modalidade) q.set("modalidade", f.modalidade);
  if (f.acessivel) q.set("acessivel", "1");
  if (f.busca.trim()) q.set("q", f.busca.trim());
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ---------------------------------------------------------------- próxima etapa: índice de questões (ainda não publicado)

/**
 * Formato previsto para o índice validado de questões. Nada na interface usa disciplina antes de existir um índice
 * revisado (não dá para deduzir a disciplina de uma página inteira). Fica aqui para a etapa seguinte.
 */
export type QuestaoIndexada = {
  provaId: string;
  numero: number;
  area: Area;
  disciplina?: "portugues" | "literatura" | "ingles" | "espanhol" | "artes" | "educacao-fisica" | "historia" | "geografia" | "filosofia" | "sociologia" | "biologia" | "fisica" | "quimica" | "matematica";
  pagina: number;
  /** Quem revisou e quando: sem revisão, a questão não entra nos filtros por disciplina. */
  revisado?: { por: string; em: string };
};

/** Área de uma questão pela numeração oficial. */
export function areaDaQuestao(n: number): Area | null {
  for (const [a, [de, ate]] of Object.entries(AREA_QUESTOES) as [Area, [number, number]][]) if (n >= de && n <= ate) return a;
  return null;
}

// ---------------------------------------------------------------- biblioteca: uma prova por dia, cores dentro

/**
 * As cores de um mesmo dia trazem as mesmas questões em outra ordem. Na biblioteca, cada dia de cada aplicação é uma
 * "prova", e a pessoa escolhe a cor do caderno dentro dela (o gabarito é o da cor escolhida).
 */
export type Grupo = {
  chave: string;
  ano: number;
  modalidade: Modalidade;
  modalidadeRotulo: string;
  dia: 1 | 2;
  areas: Area[];
  questoes: number;
  redacao: boolean;
  /** Cadernos comuns (cores), em ordem de número. */
  cores: Prova[];
  /** Cadernos de atendimento especializado (Libras, braile e ledor). */
  especiais: Prova[];
  idiomas: ("ingles" | "espanhol")[];
};

export function agrupar(lista: Prova[]): Grupo[] {
  const g = new Map<string, Grupo>();
  for (const p of lista) {
    const chave = `${p.ano}-${p.modalidade}-${p.dia}`;
    let x = g.get(chave);
    if (!x) {
      x = { chave, ano: p.ano, modalidade: p.modalidade, modalidadeRotulo: p.modalidadeRotulo, dia: p.dia, areas: p.areas, questoes: p.questoes, redacao: p.redacao, cores: [], especiais: [], idiomas: [] };
      g.set(chave, x);
    }
    (p.variante ? x.especiais : x.cores).push(p);
    if (p.idioma && !x.idiomas.includes(p.idioma)) x.idiomas.push(p.idioma);
  }
  for (const x of g.values()) { x.cores.sort((a, b) => a.caderno - b.caderno); x.especiais.sort((a, b) => a.caderno - b.caderno); }
  return [...g.values()];
}

/** Filtros da biblioteca aplicados às provas (grupos). Busca e cor valem se algum caderno do grupo combina. */
export function filtrarGrupos(grupos: Grupo[], f: Filtros): Grupo[] {
  return grupos.filter((g) => {
    if (f.ano != null && g.ano !== f.ano) return false;
    const dia = f.dia ?? (f.area ? (AREA_QUESTOES[f.area][0] <= 90 ? 1 : 2) : null);
    if (dia != null && g.dia !== dia) return false;
    if (f.modalidade != null && g.modalidade !== f.modalidade) return false;
    const todos = [...g.cores, ...g.especiais];
    if (f.acessivel && !todos.some((p) => p.versoes.length > 0 || p.variante)) return false;
    if (f.cor && !todos.some((p) => p.cor === f.cor)) return false;
    if (f.busca.trim()) return filtrar(todos, { ...FILTROS_VAZIOS, busca: f.busca }).length > 0;
    return true;
  });
}

/** Caderno sugerido ao abrir a prova: o que bate com a busca/cor; senão, o primeiro (menor número). */
export function cadernoInicial(g: Grupo, f: Filtros): Prova {
  const todos = [...g.cores, ...g.especiais];
  if (f.cor) { const c = todos.find((p) => p.cor === f.cor); if (c) return c; }
  if (f.busca.trim()) { const c = filtrar(todos, { ...FILTROS_VAZIOS, busca: f.busca }); if (c.length && c.length < todos.length) return c[0]; }
  return g.cores[0] ?? todos[0];
}
