// PDF.js no navegador: abre o documento direto do servidor oficial (download.inep.gov.br libera CORS) e renderiza
// páginas sob demanda, com fila de prioridade, cache limitado e limpeza ao trocar de documento.
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist/legacy/build/pdf.mjs";

type Pdfjs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let pdfjsP: Promise<Pdfjs> | null = null;

/** Carrega a biblioteca só quando alguém abre o leitor (não pesa nas outras páginas). */
export function carregarPdfjs(): Promise<Pdfjs> {
  pdfjsP ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((m) => {
    m.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
    return m;
  });
  return pdfjsP;
}

export type Progresso = { carregado: number; total: number };
export type ErroLeitor = { tipo: "rede" | "formato" | "cancelado" | "desconhecido"; mensagem: string };

export function classificarErro(e: unknown): ErroLeitor {
  const nome = (e as { name?: string })?.name ?? "";
  const msg = String((e as { message?: string })?.message ?? e);
  if (/abort|cancel|destroy/i.test(nome + msg)) return { tipo: "cancelado", mensagem: msg };
  if (nome === "InvalidPDFException" || /invalid pdf|corrupt/i.test(msg)) return { tipo: "formato", mensagem: msg };
  if (nome === "ResponseException" || nome === "UnexpectedResponseException" || /fetch|network|load/i.test(msg)) return { tipo: "rede", mensagem: msg };
  return { tipo: "desconhecido", mensagem: msg };
}

/** Abre um PDF. `cancelar()` interrompe o download e libera o worker. */
export async function abrirPdf(url: string, aoProgredir?: (p: Progresso) => void) {
  const pdfjs = await carregarPdfjs();
  const tarefa = pdfjs.getDocument({
    url,
    // Sem pré-busca agressiva: o PDF.js pede só o necessário quando o servidor aceita intervalos.
    disableAutoFetch: true,
    rangeChunkSize: 256 * 1024,
    // Fontes não embutidas no PDF (Arial do Inep, por exemplo) vêm dos dados do próprio PDF.js, não do sistema:
    // as fontes do Windows trocavam a largura das letras ("QUEST ÃO").
    useSystemFonts: false,
    standardFontDataUrl: "/pdfjs/standard_fonts/",
    wasmUrl: "/pdfjs/wasm/",
  });
  if (aoProgredir) tarefa.onProgress = ({ loaded, total }: { loaded: number; total: number }) => aoProgredir({ carregado: loaded, total });
  return { promessa: tarefa.promise, cancelar: () => { void tarefa.destroy(); } };
}

type Pedido = { pagina: number; largura: number; prioridade: number; resolver: (c: HTMLCanvasElement) => void; rejeitar: (e: unknown) => void };

/**
 * Renderiza páginas em canvas.
 * - No máximo `paralelo` renderizações ao mesmo tempo; a fila é reordenada pela prioridade (página atual primeiro).
 * - Cache LRU de `limite` canvases (os demais são zerados para devolver a memória da GPU).
 * - Resolução = largura em CSS × devicePixelRatio, exata (sem reamostragem), para o texto ficar nítido.
 */
export class RenderizadorPdf {
  readonly doc: PDFDocumentProxy;
  readonly total: number;
  private paginas = new Map<number, Promise<PDFPageProxy>>();
  private cache = new Map<string, HTMLCanvasElement>();
  private fila: Pedido[] = [];
  private emAndamento = new Map<string, RenderTask>();
  private aguardando = new Map<string, Promise<HTMLCanvasElement>>();
  private textos = new Map<number, Promise<string>>();
  private destruido = false;
  proporcao = 1.414; // altura / largura da 1ª página (atualizado em iniciar)

  constructor(doc: PDFDocumentProxy, private limite = 10, private paralelo = 2) {
    this.doc = doc;
    this.total = doc.numPages;
  }

  async iniciar() {
    const p = await this.pagina(1);
    const v = p.getViewport({ scale: 1 });
    this.proporcao = v.height / v.width;
    return this;
  }

  pagina(n: number) {
    let p = this.paginas.get(n);
    if (!p) { p = this.doc.getPage(n); this.paginas.set(n, p); }
    return p;
  }

  /** Canvas da página `n` com `largura` px CSS. Reaproveita o cache se já houver um igual. */
  renderizar(n: number, largura: number, prioridade = 0): Promise<HTMLCanvasElement> {
    if (this.destruido) return Promise.reject(new Error("destruido"));
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    // Exatamente a largura na tela × densidade de pixels: se o canvas for maior ou menor que a área, o navegador
    // reamostra e as letras pequenas borram. Teto de ~12 megapixels por página para não estourar a memória no zoom.
    const teto = Math.floor(Math.sqrt(12e6 / this.proporcao));
    // Em telas de densidade baixa (dpr < 2) qualquer desencontro de fração de pixel entre o canvas e a área vira
    // borrão visível. Ali a página é desenhada com o dobro de pixels: o navegador só reduz (2:1), nunca amplia.
    const fator = dpr < 2 ? 2 : 1;
    const lpx = Math.min(teto, Math.round(Math.max(120, largura) * dpr) * fator);
    const chave = `${n}@${lpx}`;
    const pronto = this.cache.get(chave);
    if (pronto) { this.cache.delete(chave); this.cache.set(chave, pronto); return Promise.resolve(pronto); }
    const ja = this.aguardando.get(chave);
    if (ja) { const ped = this.fila.find((f) => f.pagina === n && f.largura === lpx); if (ped) ped.prioridade = Math.max(ped.prioridade, prioridade); return ja; }
    const prom = new Promise<HTMLCanvasElement>((resolver, rejeitar) => this.fila.push({ pagina: n, largura: lpx, prioridade, resolver, rejeitar }));
    this.aguardando.set(chave, prom);
    prom.catch(() => {}).finally(() => this.aguardando.delete(chave));
    this.bombear();
    return prom;
  }

  /** Esquece pedidos que ainda não começaram e não estão em `manter` (o leitor mudou de página). */
  descartarFora(manter: Set<number>) {
    this.fila = this.fila.filter((p) => {
      if (manter.has(p.pagina)) return true;
      p.rejeitar(new Error("cancelado"));
      return false;
    });
  }

  private bombear() {
    while (!this.destruido && this.emAndamento.size < this.paralelo && this.fila.length) {
      this.fila.sort((a, b) => b.prioridade - a.prioridade);
      const ped = this.fila.shift()!;
      void this.executar(ped);
    }
  }

  private async executar(ped: Pedido) {
    const chave = `${ped.pagina}@${ped.largura}`;
    try {
      const pagina = await this.pagina(ped.pagina);
      const base = pagina.getViewport({ scale: 1 });
      const viewport = pagina.getViewport({ scale: ped.largura / base.width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      canvas.className = "pdf-canvas";
      const tarefa = pagina.render({ canvas, viewport, background: "#ffffff" });
      this.emAndamento.set(chave, tarefa);
      await tarefa.promise;
      this.emAndamento.delete(chave);
      if (this.destruido) { canvas.width = 0; canvas.height = 0; throw new Error("destruido"); }
      this.cache.set(chave, canvas);
      this.podar();
      ped.resolver(canvas);
    } catch (e) {
      this.emAndamento.delete(chave);
      ped.rejeitar(e);
    } finally {
      this.bombear();
    }
  }

  private podar() {
    while (this.cache.size > this.limite) {
      const [chave, c] = this.cache.entries().next().value as [string, HTMLCanvasElement];
      this.cache.delete(chave);
      if (!c.isConnected) { c.width = 0; c.height = 0; } // devolve a memória; se estiver na tela, só sai do cache
    }
  }

  /** Texto da página (para leitores de tela e para o índice de questões). */
  texto(n: number): Promise<string> {
    let t = this.textos.get(n);
    if (!t) {
      t = this.pagina(n).then(async (p) => {
        const c = await p.getTextContent();
        let s = "";
        for (const it of c.items as { str?: string; hasEOL?: boolean }[]) { if (typeof it.str === "string") s += it.str + (it.hasEOL ? "\n" : ""); }
        return s.replace(/ENEM20\d\d(ENE[MN]20\d\d)+/g, "").replace(/[ \t]+\n/g, "\n").trim();
      });
      this.textos.set(n, t);
    }
    return t;
  }

  destruir() {
    if (this.destruido) return;
    this.destruido = true;
    for (const p of this.fila) p.rejeitar(new Error("destruido"));
    this.fila = [];
    for (const t of this.emAndamento.values()) t.cancel();
    this.emAndamento.clear();
    for (const c of this.cache.values()) { c.width = 0; c.height = 0; }
    this.cache.clear();
    this.paginas.clear();
    this.textos.clear();
    void this.doc.loadingTask.destroy();
  }
}

// ---------------------------------------------------------------- índice de questões a partir do texto oficial

export type IndiceQuestoes = { pagina: Record<number, number>; completo: boolean; encontradas: number; esperadas: number };

/**
 * Procura "Questão 01"/"QUESTÃO 94" no texto de cada página. Só é considerado completo se achar exatamente a sequência
 * oficial do caderno (1–90 no 1º dia, 91–180 no 2º). Sem isso, a navegação por questão não aparece.
 */
export async function indexarQuestoes(r: RenderizadorPdf, dia: 1 | 2, aoAvancar?: (feitas: number) => void): Promise<IndiceQuestoes> {
  const [de, ate] = dia === 1 ? [1, 90] : [91, 180];
  const pagina: Record<number, number> = {};
  for (let n = 1; n <= r.total; n++) {
    const t = await r.texto(n);
    for (const m of t.matchAll(/quest[ãa]o\s*(\d{2,3})\b/gi)) {
      const q = Number(m[1]);
      if (q >= de && q <= ate && pagina[q] == null) pagina[q] = n; // 1º dia: 01–05 aparecem duas vezes (inglês e espanhol); vale a 1ª
    }
    aoAvancar?.(n);
    if (n % 4 === 0) await new Promise((ok) => setTimeout(ok, 0)); // não trava a interface
  }
  const encontradas = Object.keys(pagina).length;
  return { pagina, completo: encontradas === ate - de + 1, encontradas, esperadas: ate - de + 1 };
}

// ---------------------------------------------------------------- gabarito estruturado a partir do PDF oficial

export type RespostaGabarito = { questao: number; respostas: { rotulo: string | null; valor: string }[] };
export type Gabarito = { respostas: Map<number, RespostaGabarito>; completo: boolean; esperadas: number };

/**
 * Lê a tabela do PDF de gabarito (linhas "1 D B 46 E", "6 E 51 D"…) pelas posições do texto.
 * Conferido em 08/11/2026 com gabaritos de 2021 a 2025 (regular, reaplicação, digital, Belém, cadernos 9 e 10).
 * Só devolve `completo` quando acha todas as questões do dia, com letras A–E (ou "Anulada"); senão a consulta por
 * número não é oferecida e a pessoa abre o PDF.
 */
export async function lerGabarito(doc: PDFDocumentProxy, dia: 1 | 2, idioma: "ingles" | "espanhol" | null = null): Promise<Gabarito> {
  const [de, ate] = dia === 1 ? [1, 90] : [91, 180];
  // Junta os pedaços de texto em linhas por proximidade vertical (tolerância de 3 pt): número e letra da mesma linha
  // às vezes têm linhas de base um pouco diferentes.
  const pecas: { pag: number; y: number; x: number; s: string }[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const p = await doc.getPage(n);
    const c = await p.getTextContent();
    for (const it of c.items as { str?: string; transform?: number[] }[]) {
      const s = (it.str ?? "").trim();
      if (!s || !it.transform) continue;
      for (const parte of s.split(/\s+/)) pecas.push({ pag: n, y: it.transform[5], x: it.transform[4], s: parte });
    }
  }
  pecas.sort((a, b) => a.pag - b.pag || b.y - a.y);
  const linhas: { pag: number; y: number; itens: { x: number; s: string }[] }[] = [];
  for (const pc of pecas) {
    const ult = linhas[linhas.length - 1];
    if (ult && ult.pag === pc.pag && Math.abs(ult.y - pc.y) <= 3) ult.itens.push(pc);
    else linhas.push({ pag: pc.pag, y: pc.y, itens: [pc] });
  }
  const respostas = new Map<number, RespostaGabarito>();
  const valido = (s: string) => /^[A-E]$/.test(s) || /^anulad[ao]$/i.test(s);
  for (const l of linhas) {
    // Alguns PDFs quebram um número em pedaços ("12" + "1" = 121): junta dígitos colados na mesma linha.
    const toks: string[] = [];
    let ultX = -Infinity;
    for (const t of l.itens.sort((a, b) => a.x - b.x)) {
      const ant = toks[toks.length - 1];
      if (ant && /^\d+$/.test(ant) && /^\d+$/.test(t.s) && t.x - ultX < 12 && ant.length + t.s.length <= 3) toks[toks.length - 1] = ant + t.s;
      else toks.push(t.s);
      ultX = t.x;
    }
    for (let i = 0; i < toks.length; i++) {
      const q = Number(toks[i]);
      if (!Number.isInteger(q) || q < de || q > ate || respostas.has(q)) continue;
      const seguintes: string[] = [];
      for (let j = i + 1; j < toks.length && valido(toks[j]); j++) seguintes.push(toks[j]);
      if (!seguintes.length) continue;
      if (dia === 1 && q <= 5 && idioma) {
        // Cadernos da aplicação digital são de um idioma só: uma resposta, com o idioma do caderno.
        respostas.set(q, { questao: q, respostas: [{ rotulo: idioma === "ingles" ? "Inglês" : "Espanhol", valor: seguintes[0] }] });
      } else if (dia === 1 && q <= 5 && seguintes.length >= 2) {
        respostas.set(q, { questao: q, respostas: [{ rotulo: "Inglês", valor: seguintes[0] }, { rotulo: "Espanhol", valor: seguintes[1] }] });
      } else {
        respostas.set(q, { questao: q, respostas: [{ rotulo: null, valor: seguintes[0] }] });
      }
    }
  }
  let completo = true;
  for (let q = de; q <= ate; q++) if (!respostas.has(q)) completo = false;
  if (dia === 1 && !idioma) for (let q = 1; q <= 5; q++) if ((respostas.get(q)?.respostas.length ?? 0) !== 2) completo = false;
  return { respostas, completo, esperadas: ate - de + 1 };
}
