// Biblioteca de provas: tipos e funções puras (podem ir para o navegador).
// Enem: pipeline/provas_inep.py → dados/saida/site/provas.json (um item por caderno; tipo Prova).
// Outros vestibulares: pipeline/provas_vestibulares.py → dados/saida/site/vestibulares.json (tipo Exame, mais abaixo).

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
export type Acervo = { verificadoEm: string; fonte: string; anos: number[]; provas: Prova[]; extras: Extra[]; exames: Exame[]; vestibulares: InfoVestibular[] };

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
  /** null = todos os vestibulares. */
  vestibular: Vestibular | null;
  /** Edição (no Enem, o ano da prova; na Fuvest e na Unicamp, o ano de ingresso). */
  ano: number | null;
  /** Fase, para os vestibulares que têm fases. O Enem não tem: com fase escolhida, ele sai da lista. */
  fase: 1 | 2 | null;
  dia: 1 | 2 | null;
  area: Area | null;
  cor: string | null;
  modalidade: Modalidade | null;
  acessivel: boolean;
  busca: string;
};
export const FILTROS_VAZIOS: Filtros = { vestibular: null, fase: null, ano: null, dia: null, area: null, cor: null, modalidade: null, acessivel: false, busca: "" };

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
  const vest = q.get("vestibular");
  const fase = n("fase");
  return {
    vestibular: vest && vest in VESTIBULAR_ROTULO ? (vest as Vestibular) : null,
    fase: fase === 1 || fase === 2 ? fase : null,
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
  if (f.vestibular) q.set("vestibular", f.vestibular);
  if (f.ano) q.set("ano", String(f.ano));
  if (f.fase) q.set("fase", String(f.fase));
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
  if ((f.vestibular != null && f.vestibular !== "enem") || f.fase != null) return [];
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

// ---------------------------------------------------------------- banco de questões do Enem (/provas/questoes/)

/**
 * Uma questão do Enem na lista geral. As cores de um mesmo dia trazem as mesmas questões em outra ordem, e não há
 * vínculo oficial entre elas: para não repetir (nem ligar pelo número, o que estaria errado), a lista usa o caderno de
 * referência de cada aplicação/dia, o de menor número entre as cores (nos digitais, um por idioma).
 */
export type QuestaoItem = {
  chave: string; provaId: string; grupo: string; ano: number; modalidade: Modalidade; dia: 1 | 2;
  numero: number; idioma: "ingles" | "espanhol" | null; area: Area;
};
/** "12" ou "3-espanhol": identifica a questão dentro de um caderno (mesmo formato do leitor). */
export const chaveQuestao = (numero: number, idioma: "ingles" | "espanhol" | null) => `${numero}${idioma ? `-${idioma}` : ""}`;
export function lerChaveQuestao(k: string): { numero: number; idioma: "ingles" | "espanhol" | null } | null {
  const m = k.match(/^(\d{1,3})(?:-(ingles|espanhol))?$/);
  if (!m) return null;
  const numero = Number(m[1]);
  if (numero < 1 || numero > 180) return null;
  return { numero, idioma: (m[2] as "ingles" | "espanhol" | undefined) ?? null };
}

/** Caderno(s) de referência de uma aplicação/dia: o de menor número entre as cores (no digital, o de cada idioma). */
export function cadernosReferencia(g: Grupo): { geral: Prova; espanhol: Prova | null } | null {
  const geral = g.cores.find((p) => p.idioma !== "espanhol") ?? g.cores[0];
  if (!geral) return null;
  return { geral, espanhol: g.cores.find((p) => p.idioma === "espanhol") ?? null };
}

export function questoesDoGrupo(g: Grupo): QuestaoItem[] {
  const ref = cadernosReferencia(g);
  if (!ref) return [];
  const [de, ate] = g.dia === 1 ? [1, 90] : [91, 180];
  const base = { grupo: g.chave, ano: g.ano, modalidade: g.modalidade, dia: g.dia };
  const item = (p: Prova, numero: number, idioma: "ingles" | "espanhol" | null): QuestaoItem =>
    ({ ...base, chave: `${p.id}#${chaveQuestao(numero, idioma)}`, provaId: p.id, numero, idioma, area: areaDaQuestao(numero)! });
  const out: QuestaoItem[] = [];
  for (let n = de; n <= ate; n++) {
    if (g.dia === 1 && n <= 5) {
      // Língua estrangeira: no impresso, as duas estão no mesmo caderno; no digital, cada uma no seu.
      const esp = ref.espanhol ?? (ref.geral.idioma ? null : ref.geral);
      if (ref.geral.idioma !== "espanhol") out.push(item(ref.geral, n, "ingles"));
      if (esp) out.push(item(esp, n, "espanhol"));
    } else out.push(item(ref.geral, n, null));
  }
  return out;
}

export type SituacaoQuestao = "todas" | "revisar" | "vistas" | "nao-vistas";
export type FiltrosQuestoes = {
  ano: number | null; modalidade: Modalidade | null; area: Area | null;
  /** Língua estrangeira das questões 1 a 5 do 1º dia: as da outra língua saem da lista. */
  idioma: "ingles" | "espanhol";
  situacao: SituacaoQuestao;
  numero: number | null;
};
export const FILTROS_QUESTOES_VAZIOS: FiltrosQuestoes = { ano: null, modalidade: "regular", area: null, idioma: "ingles", situacao: "todas", numero: null };
/** O que a pessoa marcou em cada caderno (vem do armazenamento do leitor). */
export type MarcasCaderno = { revisar: number[]; vistas: string[] };

export function filtrarQuestoes(lista: QuestaoItem[], f: FiltrosQuestoes, marcas: Map<string, MarcasCaderno>): QuestaoItem[] {
  return lista.filter((q) => {
    if (f.ano != null && q.ano !== f.ano) return false;
    if (f.modalidade != null && q.modalidade !== f.modalidade) return false;
    if (f.area != null && q.area !== f.area) return false;
    if (q.idioma && q.idioma !== f.idioma) return false;
    if (f.numero != null && q.numero !== f.numero) return false;
    const m = marcas.get(q.provaId);
    const vista = !!m?.vistas.includes(chaveQuestao(q.numero, q.idioma));
    if (f.situacao === "revisar" && !m?.revisar.includes(q.numero)) return false;
    if (f.situacao === "vistas" && !vista) return false;
    if (f.situacao === "nao-vistas" && vista) return false;
    return true;
  });
}

const SITUACOES: SituacaoQuestao[] = ["todas", "revisar", "vistas", "nao-vistas"];
export function filtrosQuestoesDaUrl(q: URLSearchParams): FiltrosQuestoes {
  const n = (k: string) => { const v = Number(q.get(k)); return Number.isInteger(v) && v > 0 ? v : null; };
  const mod = q.get("modalidade"), area = q.get("area"), sit = q.get("situacao") as SituacaoQuestao | null, num = n("questao");
  return {
    ano: n("ano"),
    modalidade: mod === "todas" ? null : mod && mod in MODALIDADE_CURTA ? (mod as Modalidade) : "regular",
    area: area && area in AREA_ROTULO ? (area as Area) : null,
    idioma: q.get("idioma") === "espanhol" ? "espanhol" : "ingles",
    situacao: sit && SITUACOES.includes(sit) ? sit : "todas",
    numero: num != null && num <= 180 ? num : null,
  };
}
export function filtrosQuestoesParaUrl(f: FiltrosQuestoes): string {
  const q = new URLSearchParams();
  if (f.ano) q.set("ano", String(f.ano));
  if (f.modalidade !== "regular") q.set("modalidade", f.modalidade ?? "todas");
  if (f.area) q.set("area", f.area);
  if (f.idioma !== "ingles") q.set("idioma", f.idioma);
  if (f.situacao !== "todas") q.set("situacao", f.situacao);
  if (f.numero) q.set("questao", String(f.numero));
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ---------------------------------------------------------------- outros vestibulares (Fuvest, Unicamp)

export type Vestibular = "enem" | "fuvest" | "unicamp";
export const VESTIBULAR_ROTULO: Record<Vestibular, string> = { enem: "Enem", fuvest: "Fuvest", unicamp: "Unicamp" };

/**
 * Como o site pode oferecer um documento. "leitor": abre no leitor do site (o servidor oficial libera a leitura por
 * outros sites e a licença permite; hoje, só o Inep). "oficial": o site só leva ao arquivo no servidor oficial.
 */
export type Acesso = "leitor" | "oficial";
/** Por que um material não está aqui. Cada estado tem um texto próprio; nunca são misturados. */
export type Disponibilidade = "nao-publicado" | "nao-encontrado" | "indisponivel" | "nao-aplicavel";
export const DISPONIBILIDADE_ROTULO: Record<Disponibilidade, string> = {
  "nao-publicado": "não publicado pela banca",
  "nao-encontrado": "não encontrado no acervo oficial",
  indisponivel: "fora do ar no site oficial",
  "nao-aplicavel": "não se aplica a esta prova",
};
export type TipoDocumento = "prova" | "gabarito" | "respostas-esperadas" | "redacao-abordagem" | "criterios" | "outro";
export type Procedencia = { pagina: string; secao: string; texto: string; coletadoEm: string; conferencia: "listado" | "head"; /** Como a identidade do arquivo foi confirmada (metadados, capa, cabeçalho do gabarito); ausente = só existência e tamanho. */ identidade?: string };
export type Documento = {
  tipo: TipoDocumento; rotulo: string; url: string; formato: "pdf"; bytes: number | null; acesso: Acesso; procedencia: Procedencia;
  /** Gabarito: "todas" quando um só documento traz as respostas de todas as versões. */
  versoes?: "todas" | string[];
  retificado?: boolean; retificadoEm?: string;
  disciplina?: string;
  /** "fase": o documento cobre a fase inteira, não só este dia. */
  escopo?: "fase";
};
export type VersaoExame = { codigo: string; rotulo: string; prova: Documento };
export type Lacuna = { tipo: TipoDocumento; estado: Disponibilidade; nota: string };

/** Uma prova de um vestibular: vestibular + edição + fase + dia. As versões do caderno ficam dentro dela. */
export type Exame = {
  id: string;
  vestibular: Exclude<Vestibular, "enem">;
  /** Ano de ingresso (Fuvest 2026 foi aplicada em 2025). */
  edicao: number;
  fase: 1 | 2 | null;
  dia: number | null;
  /** AAAA-MM-DD, só quando um documento oficial informa. */
  dataAplicacao: string | null;
  dataAplicacaoFonte?: string;
  nomeProva: string | null;
  tipoQuestoes: "objetiva" | "discursiva" | "mista" | null;
  /** true só quando a fonte oficial mostra que há redação neste dia; null = não verificado. */
  redacao: boolean | null;
  disciplinas: string[];
  /** Cadernos. Sem versões diferentes, há um só, com código "unica". */
  versoes: VersaoExame[];
  complementares: Documento[];
  lacunas: Lacuna[];
  fonte: string;
};
export type InfoVestibular = {
  id: Exclude<Vestibular, "enem">; nome: string; instituicao: string; acervo: string;
  estado: "catalogado" | "pendente"; pendencia?: string; coletadoEm?: string; acesso?: Acesso; motivoAcesso?: string; edicoes?: number[]; exames: number;
};

export const faseRotulo = (f: 1 | 2) => `${f}ª fase`;
export const diaExameRotulo = (d: number) => `${d}º dia`;
/** "1ª fase" ou "2ª fase · 1º dia". */
export function rotuloExame(e: Exame): string {
  return [e.fase ? faseRotulo(e.fase) : null, e.dia ? diaExameRotulo(e.dia) : null].filter(Boolean).join(" · ") || "Prova";
}
/** "Fuvest 2026 · 1ª fase". */
export const tituloExame = (e: Exame, comEdicao = true) => [comEdicao ? `${VESTIBULAR_ROTULO[e.vestibular]} ${e.edicao}` : null, rotuloExame(e)].filter(Boolean).join(" · ");
export const dataBr = (iso: string) => iso.split("-").reverse().join("/");

export const hostDe = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "site oficial"; } };
const TIPO_QUESTOES = { objetiva: "Questões objetivas", discursiva: "Questões discursivas", mista: "Questões objetivas e discursivas" } as const;

/** O que a prova é, só com o que a fonte oficial confirma. */
export function resumoExame(e: Exame): string {
  const partes = [e.nomeProva, e.tipoQuestoes ? TIPO_QUESTOES[e.tipoQuestoes] : null, e.redacao ? "Redação" : null].filter(Boolean) as string[];
  if (e.nomeProva && e.tipoQuestoes) partes.splice(0, 2, `${e.nomeProva} (${TIPO_QUESTOES[e.tipoQuestoes].toLowerCase()})`);
  return `${partes.join(" e ")}.${e.dataAplicacao ? ` Aplicada em ${dataBr(e.dataAplicacao)}.` : ""}`;
}


export function descricaoExame(e: Exame): string {
  const v = e.versoes.length > 1 ? `${e.versoes.length} ${porArea(e) ? "provas de área" : "versões do caderno"} (${e.versoes.map((x) => x.codigo).join(", ")})` : "caderno de prova";
  const comp = e.complementares.map((c) => c.rotulo.toLowerCase());
  return `${tituloExame(e)}: ${v}${comp.length ? `, ${[...new Set(comp)].slice(0, 3).join(", ")}` : ""}. Links para os arquivos oficiais.`;
}
/** Unicamp, 2ª fase, 2º dia: os "cadernos" são provas de áreas diferentes (Exatas, Biológicas, Humanas), não versões da mesma prova. */
export const porArea = (e: Exame) => e.vestibular === "unicamp" && e.fase === 2 && e.dia === 2;
export const documentosDoTipo = (e: Exame, tipo: TipoDocumento) => e.complementares.filter((c) => c.tipo === tipo);
/** O gabarito que vale para uma versão: o específico dela, se houver; senão, o que cobre todas. Nunca o de outra versão. */
export function gabaritoDaVersao(e: Exame, codigo: string): Documento | null {
  const gs = documentosDoTipo(e, "gabarito");
  return gs.find((g) => Array.isArray(g.versoes) && g.versoes.includes(codigo)) ?? gs.find((g) => g.versoes === "todas" || g.versoes == null) ?? null;
}

export function textoBuscaExame(e: Exame): string {
  return semAcento([
    VESTIBULAR_ROTULO[e.vestibular], e.edicao, rotuloExame(e), e.fase === 1 ? "primeira fase" : e.fase === 2 ? "segunda fase" : "",
    e.dia === 1 ? "primeiro dia" : e.dia === 2 ? "segundo dia" : "", e.nomeProva ?? "", e.tipoQuestoes ?? "", e.redacao ? "redacao" : "",
    ...e.disciplinas, ...e.versoes.map((v) => `prova ${v.codigo} versao ${v.codigo}`), ...e.complementares.map((c) => c.rotulo),
  ].join(" "));
}

/**
 * Filtros da biblioteca aplicados aos exames. Os filtros que só existem no Enem (cor do caderno, área, aplicação
 * diferente da regular, versões acessíveis) tiram os exames da lista em vez de serem ignorados.
 */
export function filtrarExames(lista: Exame[], f: Filtros): Exame[] {
  if (f.vestibular === "enem" || f.cor || f.area || f.acessivel || (f.modalidade != null && f.modalidade !== "regular")) return [];
  const termos = semAcento(f.busca).split(/\s+/).filter(Boolean);
  return lista.filter((e) =>
    (f.vestibular == null || e.vestibular === f.vestibular) &&
    (f.ano == null || e.edicao === f.ano) &&
    (f.fase == null || e.fase === f.fase) &&
    (f.dia == null || e.dia === f.dia) &&
    (termos.length === 0 || termos.every((t) => textoBuscaExame(e).includes(t))));
}

/** Versão sugerida ao abrir o cartão: a que a busca cita ("prova K"); senão, a primeira. */
export function versaoInicial(e: Exame, f: Filtros): VersaoExame {
  const termos = semAcento(f.busca).split(/\s+/).filter(Boolean);
  return e.versoes.find((v) => termos.includes(v.codigo.toLowerCase())) ?? e.versoes[0];
}
