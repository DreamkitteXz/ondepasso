// Mapa "por questão" de um caderno do Enem, a partir das posições do texto do PDF oficial.
// Função pura (sem DOM nem PDF.js): recebe as linhas de texto de cada página e devolve, para cada questão, as regiões
// do PDF onde ela está (página + retângulo). O leitor desenha só esses recortes do PDF oficial, no navegador; nada é
// copiado, hospedado ou reescrito.
//
// Regras (conferidas nos cadernos regulares de 2021 a 2025, 1º e 2º dia):
// - Cabeçalho de questão: linha que começa com "QUESTÃO 01" (o PDF às vezes quebra em "Q|UEST|ã|O|01").
// - Página de uma coluna ou de duas: decidido pelo próprio texto (cabeçalho na metade direita, ou texto alinhado
//   na coluna direita sem nenhuma linha atravessando o vão). Cada página é inteira de um tipo.
// - Ordem de leitura: coluna esquerda e depois direita, página por página. Uma questão vai do seu cabeçalho até o
//   próximo cabeçalho ou marcador; se a coluna acaba antes, continua no topo da coluna seguinte.
// - Marcadores que encerram a questão anterior: título de área ("CIÊNCIAS HUMANAS E SUAS TECNOLOGIAS"), "Questões de
//   46 a 90", "PROPOSTA DE REDAÇÃO", "INSTRUÇÕES PARA A REDAÇÃO".
// - "Texto para as questões 06 a 10": texto de apoio comum, mostrado antes de cada questão da faixa.
// - Faixas de cabeçalho e rodapé da página (código de barras, "ENEM2025ENEM2025…", número da página) ficam de fora.
// Só é "completo" quando acha exatamente as questões esperadas do caderno; senão o modo por questão não é oferecido.

export type Segmento = { x: number; y: number; w: number; h: number; t: string };
/** Coordenadas em pontos do PDF na escala 1, origem no canto superior esquerdo (y cresce para baixo). */
export type PaginaTexto = { n: number; largura: number; altura: number; segs: Segmento[] };
export type Regiao = { pagina: number; x: number; y: number; w: number; h: number };
export type IdiomaQuestao = "ingles" | "espanhol" | null;
export type QuestaoMapa = { numero: number; idioma: IdiomaQuestao; regioes: Regiao[]; apoio: Regiao[]; apoioRotulo: string | null };
export type MapaQuestoes = { questoes: QuestaoMapa[]; completo: boolean; esperadas: number; encontradas: number; problemas: string[] };

type ItemTexto = { s: string; x: number; y: number; w: number; h: number };

/** Junta os pedaços de texto em segmentos: mesma linha (topo a até 2 pt) e encostados (vão de até 6 pt). */
export function segmentar(itens: ItemTexto[]): Segmento[] {
  const its = itens.filter((i) => i.s && i.s.trim() && i.w > 0).sort((a, b) => a.y + a.h - (b.y + b.h) || a.x - b.x);
  const linhas: ItemTexto[][] = [];
  for (const i of its) {
    const base = i.y + i.h;
    const l = linhas.find((l) => Math.abs(l[0].y + l[0].h - base) <= 2);
    if (l) l.push(i); else linhas.push([i]);
  }
  const segs: Segmento[] = [];
  for (const l of linhas) {
    l.sort((a, b) => a.x - b.x);
    let atual: Segmento | null = null;
    for (const i of l) {
      const vao = atual ? i.x - (atual.x + atual.w) : Infinity;
      if (atual && vao <= 6) {
        atual.t += (vao > 1 ? " " : "") + i.s;
        const fim = Math.max(atual.x + atual.w, i.x + i.w);
        const topo = Math.min(atual.y, i.y);
        atual.h = Math.max(atual.y + atual.h, i.y + i.h) - topo; atual.y = topo; atual.w = fim - atual.x;
      } else {
        atual = { x: i.x, y: i.y, w: i.w, h: i.h, t: i.s };
        segs.push(atual);
      }
    }
  }
  return segs;
}

const RE_CABECALHO = /^QUEST[ÃA]O(\d{2,3})(?!\d)/i;
export function numeroCabecalho(t: string): number | null {
  const m = t.replace(/\s+/g, "").normalize("NFC").match(RE_CABECALHO);
  return m ? Number(m[1]) : null;
}
const ehFaixa = (t: string) => /^(ENEM\s*20\d\d){2,}/i.test(t.replace(/\s+/g, "")) || /^\*[0-9A-Z]+\*$/.test(t.trim());
const RE_APOIO = /^textos?\s+(para|referentes?\s+[àa]s?|de\s+apoio\s+para)\s+(as\s+)?quest/i;
function marcadorSecao(t: string): boolean {
  const s = t.trim().normalize("NFC");
  if (/^quest[õo]es\s+de\s+\d+\s+a\s+\d+/i.test(s)) return true;
  if (/^proposta\s+de\s+reda/i.test(s) || /^instru[çc][õo]es\s+para\s+a\s+reda/i.test(s)) return true;
  return s === s.toUpperCase() && /TECNOLOGIAS$/.test(s) && !/\|/.test(s) && s.length < 80;
}
function faixaApoio(t: string): [number, number] | null {
  const m = t.match(/quest[õo]es\s+(?:de\s+)?(\d{1,3})\s+(?:a|e)\s+(\d{1,3})/i);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

type Evento = { tipo: "questao"; y: number; numero: number } | { tipo: "apoio"; y: number; rotulo: string; faixa: [number, number] | null } | { tipo: "secao"; y: number; texto: string };
type Fatia = { pagina: number; x0: number; x1: number; topo: number; base: number; conteudo: Segmento[]; eventos: Evento[] };

/** Texto de faixa normalizado (sem números nem espaços), para achar o que se repete em todas as páginas. */
const normFaixa = (t: string) => t.replace(/[\d\s]+/g, "").toLowerCase();
const naBorda = (s: Segmento, p: PaginaTexto) => s.y < p.altura * 0.05 || s.y > p.altura * 0.95;
/**
 * Bandas de cabeçalho/rodapé: o conteúdo fica entre a última faixa de cima e a primeira de baixo. Faixa = marca
 * d'água "ENEM2025ENEM2025…", código de barras, ou, na borda da página (5% de cima ou de baixo), número de página ou
 * linha que se repete no caderno ("MT - 2° dia | Caderno 5 - AMARELO").
 */
function area(p: PaginaTexto, repetidos: Set<string>): { topo: number; base: number; faixa: (s: Segmento) => boolean } {
  const meio = p.altura / 2;
  // Cabeçalho de questão nunca é faixa (nos cadernos digitais, "Questão 92 - Ciências da Natureza…" se repete no alto).
  const faixa = (s: Segmento) => ehFaixa(s.t) || (naBorda(s, p) && numeroCabecalho(s.t) == null && (/^\d{1,3}$/.test(s.t.trim()) || repetidos.has(normFaixa(s.t))));
  const faixas = p.segs.filter(faixa);
  const cima = faixas.filter((s) => s.y < meio), baixo = faixas.filter((s) => s.y >= meio);
  // Sem a marca d'água (cadernos digitais), não há faixa: o cabeçalho da questão pode estar colado no alto da página.
  const topo = cima.length ? Math.max(...cima.map((s) => s.y + s.h)) + 2 : 0;
  const base = baixo.length ? Math.min(...baixo.map((s) => s.y)) - 1 : p.altura * 0.97;
  return { topo, base, faixa };
}

export function mapearQuestoes(paginas: PaginaTexto[], dia: 1 | 2, idiomaCaderno: IdiomaQuestao = null): MapaQuestoes {
  const [de, ate] = dia === 1 ? [1, 90] : [91, 180];
  const problemas: string[] = [];

  // Colunas: x do cabeçalho da coluna direita, por paridade de página (as margens alternam entre páginas pares e ímpares).
  const contagem = new Map<string, number>();
  for (const p of paginas) for (const k of new Set(p.segs.filter((s) => naBorda(s, p)).map((s) => normFaixa(s.t)).filter((k) => k.length >= 3))) contagem.set(k, (contagem.get(k) ?? 0) + 1);
  const repetidos = new Set([...contagem].filter(([, n]) => n >= Math.max(3, paginas.length * 0.3)).map(([k]) => k));
  const info = paginas.map((p) => {
    const a = area(p, repetidos);
    const conteudo = p.segs.filter((s) => !a.faixa(s) && s.y + s.h > a.topo && s.y < a.base);
    const cabs = conteudo.map((s) => ({ s, q: numeroCabecalho(s.t) })).filter((c) => c.q != null && c.q >= de && c.q <= ate);
    return { p, ...a, conteudo, cabs };
  });
  const direitas: Record<number, number[]> = { 0: [], 1: [] };
  for (const i of info) for (const c of i.cabs) if (c.s.x > i.p.largura * 0.4) direitas[i.p.n % 2].push(c.s.x);
  const mediana = (v: number[]) => (v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] : null);
  const colDir = { 0: mediana(direitas[0]) ?? mediana(direitas[1]), 1: mediana(direitas[1]) ?? mediana(direitas[0]) } as Record<number, number | null>;

  // Depois da última página com questão vem a contracapa: nada ali pertence a uma questão.
  const ultimaComQuestao = Math.max(0, ...info.filter((i) => i.cabs.length).map((i) => i.p.n));
  const fatias: Fatia[] = [];
  for (const i of info) {
    if (!i.conteudo.length || i.p.n > ultimaComQuestao) continue;
    const esq = Math.min(...i.conteudo.map((s) => s.x)) - 3;
    const dir = Math.max(...i.conteudo.map((s) => s.x + s.w)) + 3;
    const cabDir = i.cabs.filter((c) => c.s.x > i.p.largura * 0.4).map((c) => c.s.x);
    let corte: number | null = cabDir.length ? Math.min(...cabDir) : null;
    if (corte == null) {
      const rx = colDir[i.p.n % 2];
      if (rx != null) {
        const alinhados = i.conteudo.filter((s) => Math.abs(s.x - rx) <= 3).length;
        const atravessam = i.conteudo.filter((s) => s.x < rx - 20 && s.x + s.w > rx + 4).length;
        if (alinhados >= 2 && atravessam === 0) corte = rx;
      }
    }
    const cols = corte != null ? [[esq, corte - 4], [corte - 4, dir]] : [[esq, dir]];
    for (const [x0, x1] of cols) {
      const conteudo = i.conteudo.filter((s) => s.x >= x0 - 1 && s.x < x1);
      const eventos: Evento[] = [];
      for (const s of conteudo) {
        const q = numeroCabecalho(s.t);
        if (q != null && q >= de && q <= ate) { eventos.push({ tipo: "questao", y: s.y, numero: q }); continue; }
        if (RE_APOIO.test(s.t.trim())) { eventos.push({ tipo: "apoio", y: s.y, rotulo: s.t.trim().replace(/\.$/, ""), faixa: faixaApoio(s.t) }); continue; }
        if (marcadorSecao(s.t)) eventos.push({ tipo: "secao", y: s.y, texto: s.t.trim() });
      }
      eventos.sort((a, b) => a.y - b.y);
      // Marcadores encostados (título de área logo acima de "Questões de 46 a 90") viram um só.
      fatias.push({ pagina: i.p.n, x0, x1, topo: i.topo, base: i.base, conteudo, eventos });
    }
  }

  type Aberto = { tipo: "questao"; numero: number; idioma: IdiomaQuestao; regioes: Regiao[] } | { tipo: "apoio"; rotulo: string; faixa: [number, number] | null; regioes: Regiao[] };
  const questoes: QuestaoMapa[] = [];
  const apoios: { rotulo: string; faixa: [number, number] | null; regioes: Regiao[] }[] = [];
  let aberto = null as Aberto | null; // `as`: muda dentro de fechar(), e o TS não acompanharia
  let idiomaSecao: IdiomaQuestao = null;
  const vistos = new Map<number, number>();
  const fechar = () => {
    if (!aberto) return;
    if (aberto.tipo === "questao") questoes.push({ numero: aberto.numero, idioma: aberto.idioma, regioes: aberto.regioes, apoio: [], apoioRotulo: null });
    else apoios.push({ rotulo: aberto.rotulo, faixa: aberto.faixa, regioes: aberto.regioes });
    aberto = null;
  };
  const temConteudo = (f: Fatia, a: number, b: number) => f.conteudo.some((s) => s.y + s.h > a + 1 && s.y < b - 1);
  const regiao = (f: Fatia, a: number, b: number): Regiao => ({ pagina: f.pagina, x: f.x0, y: a, w: f.x1 - f.x0, h: Math.max(0, b - a) });

  for (const f of fatias) {
    const primeiro = f.eventos[0]?.y ?? f.base;
    // Continuação da questão (ou texto de apoio) que vinha da coluna anterior.
    if (aberto) {
      if (temConteudo(f, f.topo, primeiro)) {
        const ab: Aberto = aberto;
        ab.regioes.push(regiao(f, f.topo, Math.min(primeiro - 3, f.base)));
        if (ab.regioes.length > 4) problemas.push(`${ab.tipo === "questao" ? `questão ${ab.numero}` : ab.rotulo}: mais de 4 trechos`);
      } else if (!f.eventos.length) fechar(); // coluna vazia: acabou
    }
    f.eventos.forEach((e, k) => {
      const fim = (f.eventos[k + 1]?.y ?? f.base + 3) - 3;
      fechar();
      if (e.tipo === "secao") {
        if (/ingl[êe]s/i.test(e.texto)) idiomaSecao = "ingles";
        else if (/espanhol/i.test(e.texto)) idiomaSecao = "espanhol";
        else if (!/^quest[õo]es\s+de\s+0?1\s+a/i.test(e.texto)) idiomaSecao = null;
        return;
      }
      const ini = e.y - 3;
      if (e.tipo === "apoio") { aberto = { tipo: "apoio", rotulo: e.rotulo, faixa: e.faixa, regioes: [regiao(f, ini, fim)] }; return; }
      const vez = (vistos.get(e.numero) ?? 0) + 1;
      vistos.set(e.numero, vez);
      let idioma: IdiomaQuestao = null;
      if (dia === 1 && e.numero <= 5) idioma = idiomaCaderno ?? idiomaSecao ?? (vez === 1 ? "ingles" : "espanhol");
      aberto = { tipo: "questao", numero: e.numero, idioma, regioes: [regiao(f, ini, fim)] };
    });
  }
  fechar();

  // Texto de apoio vai para as questões da faixa (só quando a faixa é explícita).
  for (const a of apoios) {
    if (!a.faixa) { problemas.push(`texto de apoio sem faixa de questões: ${a.rotulo}`); continue; }
    for (const q of questoes) if (q.numero >= a.faixa[0] && q.numero <= a.faixa[1]) { q.apoio = a.regioes; q.apoioRotulo = a.rotulo; }
  }

  // Conferência: cada questão uma vez (1 a 5 do 1º dia: uma por idioma, ou só a do idioma do caderno).
  for (let q = de; q <= ate; q++) {
    const qs = questoes.filter((x) => x.numero === q);
    const esperado = dia === 1 && q <= 5 && !idiomaCaderno ? 2 : 1;
    if (qs.length !== esperado) problemas.push(`questão ${q}: ${qs.length} ocorrência(s), esperadas ${esperado}`);
    if (esperado === 2 && new Set(qs.map((x) => x.idioma)).size !== 2) problemas.push(`questão ${q}: idiomas não distinguidos`);
    if (qs.some((x) => !x.regioes.length || x.regioes.some((r) => r.h < 8))) problemas.push(`questão ${q}: região vazia`);
  }
  const encontradas = new Set(questoes.map((q) => q.numero)).size;
  questoes.sort((a, b) => a.numero - b.numero || (a.idioma === "espanhol" ? 1 : 0) - (b.idioma === "espanhol" ? 1 : 0));
  return { questoes, completo: problemas.length === 0, esperadas: ate - de + 1, encontradas, problemas };
}
