// Plano de escolha do relatório pago: preferências do aluno, ordenação explicável, margens, cenários, motivos e
// checklist. Tudo é conta pura sobre as opções de lib/relatorio.ts, feita no navegador: nada aqui sai do aparelho.
// Regras de honestidade (valem para todo texto daqui):
//  - nenhuma porcentagem de aprovação nem nota opaca: a ordem é a preferência do aluno e, depois, a margem;
//  - corte mais alto não quer dizer opção melhor;
//  - ano sem corte é ausência de dado, nunca zero;
//  - não atingir uma nota mínima é diferente de ficar abaixo do corte.
import { nota as fmt, diferenca } from "./formato";
import { NOME_FAIXA, POR_POUCO, OSCILACAO_PADRAO, TEXTO_ALERTA, type Filtro, type Opcao } from "./relatorio";

export type Avaliacao = "quero" | "consideraria" | "nao";
export const ROTULO_AVALIACAO: Record<Avaliacao, string> = { quero: "Quero muito", consideraria: "Consideraria", nao: "Não faria" };
export type Mobilidade = "brasil" | "estados" | "cidade";

export type Preferencias = {
  /** Cursos que o aluno quer (slugs). Vazio = exploração. */
  cursos: string[];
  /** Aceita cursos da mesma área dos que marcou. */
  relacionados: boolean;
  mobilidade: Mobilidade;
  /** Estados aceitos quando mobilidade = "estados". */
  ufs: string[];
  /** "Cidade|UF" quando mobilidade = "cidade". */
  cidade: string | null;
  /** Precisa estudar à noite: só turno Noturno. */
  noite: boolean;
  /** Turnos aceitos quando não precisa da noite (vazio = qualquer). */
  turnos: string[];
  /** Áreas, usadas só na exploração (sem cursos marcados). */
  grupos: number[];
  /** Avaliação de cada opção, pela chave slug/rota. */
  avaliacoes: Record<string, Avaliacao>;
};
export const PREFS_VAZIAS: Preferencias = { cursos: [], relacionados: false, mobilidade: "brasil", ufs: [], cidade: null, noite: false, turnos: [], grupos: [], avaliacoes: {} };

export const chaveOpcao = (o: { slug: string; rota: string }) => `${o.slug}/${o.rota}`;
export const exploracao = (p: Preferencias) => p.cursos.length === 0;

const lista = <T>(v: unknown, ok: (x: unknown) => x is T): T[] => (Array.isArray(v) ? v.filter(ok) : []);
const ehTexto = (x: unknown): x is string => typeof x === "string";
const ehNumero = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0;
/**
 * Lê as preferências guardadas, descartando o que estiver malformado. `antigo` é o filtro da versão anterior do
 * relatório ({ufs, grupos, turnos}), aproveitado na primeira visita depois da mudança.
 */
export function lerPreferencias(v: unknown, antigo?: unknown): Preferencias {
  const o = (v && typeof v === "object" ? v : null) as Record<string, unknown> | null;
  if (!o) {
    const a = (antigo && typeof antigo === "object" ? antigo : {}) as Record<string, unknown>;
    const ufs = lista(a.ufs, ehTexto);
    return { ...PREFS_VAZIAS, ufs, mobilidade: ufs.length ? "estados" : "brasil", grupos: lista(a.grupos, ehNumero), turnos: lista(a.turnos, ehTexto) };
  }
  const mob = o.mobilidade === "estados" || o.mobilidade === "cidade" ? o.mobilidade : "brasil";
  const avaliacoes: Record<string, Avaliacao> = {};
  if (o.avaliacoes && typeof o.avaliacoes === "object")
    for (const [k, x] of Object.entries(o.avaliacoes as Record<string, unknown>)) if (x === "quero" || x === "consideraria" || x === "nao") avaliacoes[k] = x;
  return {
    cursos: lista(o.cursos, ehTexto), relacionados: o.relacionados === true, mobilidade: mob, ufs: lista(o.ufs, ehTexto),
    cidade: typeof o.cidade === "string" && o.cidade.includes("|") ? o.cidade : null, noite: o.noite === true,
    turnos: lista(o.turnos, ehTexto), grupos: lista(o.grupos, ehNumero), avaliacoes,
  };
}

/** Restrições que o motor já aplica (estado, turno e, na exploração, área). Cidade e curso ficam para `aplicarPreferencias`. */
export function filtroDoMotor(p: Preferencias): Filtro {
  const ufs = p.mobilidade === "estados" ? p.ufs : p.mobilidade === "cidade" && p.cidade ? [p.cidade.split("|")[1]] : [];
  return { ufs, grupos: exploracao(p) ? p.grupos : [], turnos: p.noite ? ["Noturno"] : p.turnos };
}

/** Por que a opção entrou, em ordem de prioridade (o número é a posição na ordenação, não uma nota). */
export type Vinculo = "quero" | "desejado" | "consideraria" | "relacionado" | "exploracao";
const NIVEL: Record<Vinculo, number> = { quero: 0, desejado: 1, consideraria: 2, relacionado: 3, exploracao: 4 };
export const ROTULO_VINCULO: Record<Vinculo, string> = { quero: "Quero muito", desejado: "Curso que você marcou", consideraria: "Consideraria", relacionado: "Curso relacionado", exploracao: "Exploração" };
export type Considerada = Opcao & { vinculo: Vinculo; relacionadoA: string | null; avaliacao: Avaliacao | null };
/** O aluno aceitaria cursar: marcou o curso, marcou a opção, ou aceitou relacionados. Exploração não conta. */
export const aceita = (c: Considerada) => c.vinculo !== "exploracao";

export type Aplicadas = { consideradas: Considerada[]; naoFaria: Opcao[]; foraDoCurso: number; foraDaCidade: number };
/**
 * Aplica as preferências sobre as opções que o motor devolveu (já filtradas por estado, turno e modalidade).
 * "Não faria" sai de tudo; fora da cidade sai; com cursos marcados, só entram eles, os relacionados (se aceitos)
 * e as opções que o aluno marcou como "Quero muito" ou "Consideraria".
 */
export function aplicarPreferencias(ops: Opcao[], p: Preferencias, cursos: Map<string, { curso: string; g: number }>): Aplicadas {
  const explorar = exploracao(p);
  // Área de cada curso marcado (vale mesmo quando nenhuma oferta dele sobrou nesta seleção).
  const gruposDesejados = new Map<number, string>();
  if (p.relacionados) for (const slug of p.cursos) { const c = cursos.get(slug); if (c && !gruposDesejados.has(c.g)) gruposDesejados.set(c.g, c.curso); }
  const out: Aplicadas = { consideradas: [], naoFaria: [], foraDoCurso: 0, foraDaCidade: 0 };
  for (const o of ops) {
    const av = p.avaliacoes[chaveOpcao(o)] ?? null;
    if (av === "nao") { out.naoFaria.push(o); continue; }
    if (p.mobilidade === "cidade" && p.cidade && `${o.cidade}|${o.uf}` !== p.cidade) { out.foraDaCidade++; continue; }
    let vinculo: Vinculo; let relacionadoA: string | null = null;
    const desejado = p.cursos.includes(o.slug);
    const relacionado = !explorar && !desejado && p.relacionados && gruposDesejados.has(o.g);
    if (av === "quero") vinculo = "quero";
    else if (av === "consideraria") vinculo = "consideraria";
    else if (explorar) vinculo = "exploracao";
    else if (desejado) vinculo = "desejado";
    else if (relacionado) vinculo = "relacionado";
    else { out.foraDoCurso++; continue; }
    if (relacionado) relacionadoA = gruposDesejados.get(o.g) ?? null;
    out.consideradas.push({ ...o, vinculo, relacionadoA, avaliacao: av });
  }
  return out;
}

/** Ordem do relatório: preferência do aluno; depois quem não esbarra em nota mínima; depois a maior margem. */
export function porPreferencia(a: Considerada, b: Considerada) {
  return NIVEL[a.vinculo] - NIVEL[b.vinculo] || Number(a.minimo != null) - Number(b.minimo != null) || b.folga - a.folga || a.curso.localeCompare(b.curso, "pt-BR");
}
/** Para a 1ª opção: mesma preferência primeiro; dentro dela, a que fica mais perto do corte (acima ou abaixo) vem antes. */
export function paraPrimeira(a: Considerada, b: Considerada) {
  return NIVEL[a.vinculo] - NIVEL[b.vinculo] || Number(a.minimo != null) - Number(b.minimo != null) || Math.abs(a.folga) - Math.abs(b.folga) || b.folga - a.folga || a.curso.localeCompare(b.curso, "pt-BR");
}
export const CRITERIO_ORDEM = "Ordem: primeiro o que você prefere (Quero muito, cursos que você marcou, Consideraria, relacionados). Dentro de cada grupo, na 1ª opção vem antes a que fica mais perto do corte, acima ou abaixo, entre as ao seu alcance (é a ambição que ainda faz sentido); na 2ª e nas outras listas, a de maior margem. O corte mais alto, sozinho, não sobe ninguém. Marque “Quero muito” no que você mais quer para ele ir para o topo.";

/**
 * Sugestão de 1ª e 2ª opção. 1ª: as opções ao alcance que você mais quer (inclui as no limite e as apostas), a mais
 * difícil primeiro dentro da mesma preferência. 2ª: só opções que você aceitaria cursar e em que sua média supera o
 * corte mais recente, a de maior margem primeiro.
 */
export function recomendar(cs: Considerada[], quantas = 5): { primeira: Considerada[]; segunda: Considerada[] } {
  return {
    primeira: cs.filter((c) => c.faixa !== "fora").sort(paraPrimeira).slice(0, quantas),
    segunda: cs.filter((c) => aceita(c) && (c.faixa === "segura" || c.faixa === "provavel")).sort(porPreferencia).slice(0, quantas),
  };
}

export type Margens = {
  recente: { ano: number; corte: number; margem: number };
  /** Maior corte entre as edições com dado (pode ser o próprio recente). */
  maior: { ano: number; corte: number; margem: number };
  /** Edições com corte nesta modalidade e oferta, e em quais delas a média do aluno supera ou iguala o corte. */
  anos: number[]; supera: number[];
};
export function margens(o: Opcao): Margens {
  const ultimo = o.hist[o.hist.length - 1];
  const maior = o.hist.reduce((m, h) => (h.corte > m.corte ? h : m), ultimo);
  return {
    recente: { ano: ultimo.ano, corte: ultimo.corte, margem: o.media - ultimo.corte },
    maior: { ano: maior.ano, corte: maior.corte, margem: o.media - maior.corte },
    anos: o.hist.map((h) => h.ano), supera: o.hist.filter((h) => o.media >= h.corte).map((h) => h.ano),
  };
}

export const AUMENTOS = [5, 10, 20];
export type Cenario = { aumento: number; corte: number; margem: number; supera: boolean };
/** Simulação, não previsão: o corte mais recente somado de 5, 10 e 20 pontos, contra a média do aluno. */
export function cenarios(o: Opcao, aumentos = AUMENTOS): Cenario[] {
  return aumentos.map((a) => { const corte = o.corte + a; const margem = o.media - corte; return { aumento: a, corte, margem, supera: margem >= 0 }; });
}

const anosTexto = (a: number[]) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} e ${a[a.length - 1]}`);
const pts = (v: number) => `${diferenca(Math.abs(v))} ${Math.abs(v) >= 0.995 && Math.abs(v) < 1.005 ? "ponto" : "pontos"}`;
const sinal = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + diferenca(Math.abs(v));

/** O limite da faixa "Com folga" desta opção e por quê. */
export function limiteFolga(o: Opcao) { return Math.max(POR_POUCO, o.oscilacao ?? OSCILACAO_PADRAO); }
/** Como a faixa desta opção foi calculada, com os números dela. */
export function regraFaixa(o: Opcao): string {
  if (o.minimo) return `Fora da disputa por nota mínima: a opção exige ${o.minimo}, e sua nota não chega lá. Isso é diferente de ficar abaixo do corte: a nota mínima elimina antes da classificação, qualquer que seja o corte.`;
  const lim = limiteFolga(o);
  const base = o.oscilacao == null
    ? `Só há o corte de ${o.hist[0].ano}, então vale o mínimo de ${POR_POUCO} pontos`
    : o.oscilacao > POR_POUCO
      ? `a maior variação que este corte já teve de um ano para o seguinte foi de ${pts(o.oscilacao)}, e esse é o limite`
      : `o corte variou no máximo ${pts(o.oscilacao)} de um ano para o seguinte, então vale o mínimo de ${POR_POUCO} pontos`;
  const res = o.folga >= lim ? `Sua margem é de ${pts(o.folga)}: ${NOME_FAIXA[o.faixa]}.`
    : o.folga >= 0 ? `Sua margem é de ${pts(o.folga)}, abaixo desse limite: ${NOME_FAIXA[o.faixa]}.`
    : `Sua média fica ${pts(o.folga)} abaixo do corte: ${NOME_FAIXA[o.faixa]} (até ${POR_POUCO} abaixo é "No limite"; de ${POR_POUCO} a 25, "Aposta").`;
  return `"Com folga" pede que sua média passe o corte de ${o.hist[o.hist.length - 1].ano} por pelo menos ${pts(lim)}: ${base}. ${res}`;
}

export type Contexto = { prefs: Preferencias; grupos: string[] };
/** "Por que esta opção apareceu": frases montadas só com dados desta opção e das escolhas do aluno. */
export function motivos(c: Considerada, ctx: Contexto): string[] {
  const { prefs } = ctx;
  const m = margens(c);
  const out: string[] = [];
  if (c.vinculo === "quero") out.push("Você marcou esta opção como “Quero muito”.");
  else if (c.vinculo === "consideraria") out.push("Você marcou esta opção como “Consideraria”.");
  else if (c.vinculo === "desejado") out.push(`${c.curso} é um dos cursos que você marcou.`);
  else if (c.vinculo === "relacionado") out.push(`Curso relacionado a ${c.relacionadoA} (mesma área: ${ctx.grupos[c.g] ?? "—"}), e você aceitou relacionados.`);
  else out.push("Aparece como exploração: você ainda não marcou os cursos que quer, então nada aqui confirma que você faria este curso.");
  if (prefs.mobilidade === "cidade" && prefs.cidade) out.push(`Fica na cidade que você escolheu (${c.cidade}/${c.uf}).`);
  else if (prefs.mobilidade === "estados" && prefs.ufs.length) out.push(`Fica em ${c.cidade}/${c.uf}, num dos estados que você aceita.`);
  else out.push(`Fica em ${c.cidade}/${c.uf}; você não limitou o lugar.`);
  if (prefs.noite) out.push("Turno noturno, como você precisa.");
  else if (prefs.turnos.length) out.push(`Turno ${c.turno.toLowerCase()}, um dos que você aceita.`);
  if (Math.abs(c.ganho) >= 0.005) out.push(`Com os pesos deste curso, sua média vai de ${fmt(c.simples)} para ${fmt(c.media)} (${sinal(c.ganho)}).`);
  else out.push(`Os pesos deste curso não mudam sua média (${fmt(c.media)}).`);
  if (c.minimo) out.push(`Não disputa: a opção exige ${c.minimo}.`);
  else if (m.recente.margem >= 0) out.push(`Sua média supera o corte de ${m.recente.ano} (${fmt(m.recente.corte)}) por ${pts(m.recente.margem)}.`);
  else out.push(`Sua média fica ${pts(m.recente.margem)} abaixo do corte de ${m.recente.ano} (${fmt(m.recente.corte)}).`);
  if (!c.minimo) {
    if (m.anos.length === 1) out.push(`Só há corte de ${m.anos[0]} nesta modalidade: não dá para comparar com outras edições.`);
    else out.push(`Sua média supera ou iguala o corte em ${m.supera.length} de ${m.anos.length} edições com dados (${anosTexto(m.anos)})${m.supera.length && m.supera.length < m.anos.length ? `: em ${anosTexto(m.supera)}` : ""}.`);
  }
  return out;
}

/** O que o aluno precisa conferir nesta opção (só o que os dados apontam). */
export function pendencias(c: Opcao, anoBase: number): string[] {
  const out: string[] = [];
  if (c.minimo) out.push(`A opção exigiu ${c.minimo} em ${anoBase}. Confira no edital se a regra continua.`);
  for (const a of c.alertas) out.push(TEXTO_ALERTA[a]);
  if (c.vagasAntes.length) out.push(`As vagas nesta modalidade mudaram (${c.vagasAntes.map((v) => `${v.ano}: ${v.vagas}`).join(", ")}; ${anoBase}: ${c.vagas ?? 0}). Com outra quantidade de vagas, os cortes antigos comparam menos com o de hoje.`);
  return out;
}

export type ItemChecklist = { id: string; texto: string; detalhe: string; tipo: "exigencia" | "sugestao"; link?: { href: string; rotulo: string } };
export const PORTAL_SISU = "https://acessounico.mec.gov.br/";
export const LEI_COTAS = "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12711.htm";
/** Checklist do plano. "exigencia" só onde há regra geral conhecida; o resto é sugestão. Sem datas: elas saem no edital. */
export function checklist(mod: string, nomeMod: string): ItemChecklist[] {
  return [
    mod === "AC"
      ? { id: "modalidade", tipo: "sugestao", texto: "Confirmar a modalidade de concorrência", detalhe: "Você está usando a ampla concorrência. Se tem direito a alguma cota, compare os cortes nas duas modalidades antes de se inscrever.", link: { href: "/sobre-dados/", rotulo: "Como os cortes por modalidade são lidos" } }
      : { id: "modalidade", tipo: "exigencia", texto: `Separar os documentos da modalidade ${nomeMod}`, detalhe: "Quem concorre por cota comprova o direito na matrícula, com os documentos e prazos do edital de cada instituição.", link: { href: LEI_COTAS, rotulo: "Lei de Cotas (Lei 12.711/2012)" } },
    { id: "edital", tipo: "sugestao", texto: "Ler o edital e a página oficial de cada finalista", detalhe: "Pesos, notas mínimas, vagas e documentos de 2027 só valem quando publicados pelo MEC e pela instituição. Os números deste relatório são das edições passadas.", link: { href: PORTAL_SISU, rotulo: "Portal Único do Sisu (MEC)" } },
    { id: "mudanca", tipo: "sugestao", texto: "Avaliar mudança, transporte e permanência", detalhe: "Moradia estudantil, restaurante universitário e auxílios variam por instituição e não são garantidos. Procure a pró-reitoria de assuntos estudantis de cada finalista." },
    { id: "calendario", tipo: "sugestao", texto: "Conferir o calendário oficial", detalhe: "As datas de inscrição, resultado, matrícula e lista de espera saem no edital do Sisu.", link: { href: PORTAL_SISU, rotulo: "Portal Único do Sisu (MEC)" } },
    { id: "revisar", tipo: "sugestao", texto: "Revisar as escolhas durante as inscrições", detalhe: "Dá para trocar as opções dentro do prazo oficial. Volte a este plano com as notas de corte parciais que o portal divulgar." },
  ];
}

/** Regra do Sisu usada nos textos (edição 2026; a de 2027 sai no edital). */
export const REGRA_SISU = "No Sisu você indica até duas opções, em ordem de preferência, e a 1ª tem prioridade. Nas regras de 2026, a lista de espera valeu só para a 1ª opção de quem não foi selecionado: quem passa na 2ª fica fora dela. Por isso a 2ª deve ser um curso que você faria. As regras de 2027 saem no edital.";

export type Escolhas = { primeira: string | null; segunda: string | null };
/** Avisos sobre a 1ª e a 2ª que o aluno marcou entre as finalistas (não é inscrição). */
export function avisosEscolhas(e: Escolhas, finalistas: Considerada[]): string[] {
  const out: string[] = [];
  const p = finalistas.find((c) => chaveOpcao(c) === e.primeira), s = finalistas.find((c) => chaveOpcao(c) === e.segunda);
  if (s && !aceita(s)) out.push("Sua 2ª opção está como exploração. Marque “Quero muito” ou “Consideraria” se você faria mesmo esse curso: passando nela, você não disputa a lista de espera da 1ª.");
  if (s && s.minimo) out.push(`Sua 2ª opção exige ${s.minimo}, que sua nota não atinge.`);
  else if (s && s.folga < 0) out.push(`Na sua 2ª opção, sua média fica ${pts(s.folga)} abaixo do corte de ${s.hist[s.hist.length - 1].ano}.`);
  if (p && p.minimo) out.push(`Sua 1ª opção exige ${p.minimo}, que sua nota não atinge.`);
  return out;
}

/** Barreira do acesso pago: sem código, cada lista mostra só a primeira linha. */
export function recorte<T>(itens: T[], liberado: boolean, max?: number): { visiveis: T[]; escondidas: number } {
  const total = Math.min(itens.length, max ?? itens.length);
  const visiveis = liberado ? itens.slice(0, total) : itens.slice(0, 1);
  return { visiveis, escondidas: liberado ? 0 : Math.max(0, total - visiveis.length) };
}
