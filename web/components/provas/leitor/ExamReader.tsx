"use client";
// Leitor premium de provas do Enem: modo livro (virada de página realista) e modo leitura (rolagem), zoom (botões e
// gesto de pinça), tela cheia, índice de páginas e questões, marcadores, gabarito, download e atalhos de teclado.
// O PDF vem direto do servidor oficial do Inep; as páginas são desenhadas sob demanda e liberadas ao sair de vista.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Area, Arquivo } from "@/lib/provas-tipos";
import { megas } from "@/lib/provas-tipos";
import { RenderizadorPdf, abrirPdf, classificarErro, indexarQuestoes, type ErroLeitor, type IndiceQuestoes, type Progresso } from "@/lib/leitor/pdf";
import { lerEstudo, lerPreferencias, prefereMenosMovimento, salvarEstudo, salvarPreferencias, type Estudo, type ModoLeitor } from "@/lib/leitor/preferencias";
import { registrar, registrarUmaVez } from "@/lib/analytics";
import { FlipBookViewer, type ApiLivro } from "./FlipBookViewer";
import { EspelhoEstatico, LeituraContinua } from "./PdfPageRenderer";
import { ReaderToolbar } from "./ReaderToolbar";
import { ReaderSettings } from "./ReaderSettings";
import { ExamNavigation } from "./ExamNavigation";
import { AnswerKeyViewer } from "./AnswerKeyViewer";

export type ProvaLeitor = {
  id: string; titulo: string; subtitulo: string; identificacao: string; dia: 1 | 2; idioma: "ingles" | "espanhol" | null; areas: Area[];
  prova: Arquivo; gabarito: Arquivo | null;
};

type Doc = "prova" | "gabarito";
/** Campo onde a pessoa digita (ou escolhe com as setas): o leitor não rouba essas teclas. */
const digitando = (el: EventTarget | null, tecla: string) => {
  const e = el as HTMLElement | null;
  if (!e) return false;
  if (e.isContentEditable || e.tagName === "TEXTAREA" || e.tagName === "SELECT") return true;
  if (e.tagName !== "INPUT") return false;
  const tipo = (e as HTMLInputElement).type;
  if (tipo === "checkbox" || tipo === "button") return false;
  if (tipo === "radio") return tecla !== "Escape";
  return true;
};

export default function ExamReader({ prova }: { prova: ProvaLeitor }) {
  const raiz = useRef<HTMLDivElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const mesa = useRef<HTMLDivElement>(null); // área rolável do livro (quando ampliado)
  const livro = useRef<ApiLivro>(null);
  const irParaLeitura = useRef<((n: number) => void) | null>(null);

  const [doc, setDoc] = useState<Doc>("prova");
  const [r, setR] = useState<RenderizadorPdf | null>(null);
  const [erro, setErro] = useState<ErroLeitor | null>(null);
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [lento, setLento] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const [modo, setModo] = useState<ModoLeitor>("livro");
  const [animacoes, setAnimacoes] = useState(true);
  const [som, setSom] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [painel, setPainel] = useState<"indice" | "gabarito" | "ajustes" | null>(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const [pseudoCheia, setPseudoCheia] = useState(false);
  const [medidas, setMedidas] = useState({ w: 900, h: 700 });
  const [estudo, setEstudo] = useState<Estudo>({ marcadores: [], revisar: [], ultimaPagina: null });
  const [indice, setIndice] = useState<IndiceQuestoes | null>(null);
  const [mapeando, setMapeando] = useState<number | null>(null);
  const [visivel, setVisivel] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Preferências e estudo salvos (só neste navegador).
  useEffect(() => {
    const p = lerPreferencias();
    const reduzir = prefereMenosMovimento();
    setAnimacoes(p.animacoes ?? !reduzir);
    setSom(p.som);
    setModo(p.modo ?? "livro");
    const e = lerEstudo(prova.id);
    setEstudo(e);
    if (e.ultimaPagina && e.ultimaPagina > 1) { setPagina(e.ultimaPagina); setAviso(`Você parou na página ${e.ultimaPagina}.`); }
  }, [prova.id]);
  useEffect(() => { salvarPreferencias({ modo, animacoes, som }); }, [modo, animacoes, som]);
  // O aviso "você parou na página" some sozinho depois de um tempo.
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 12000); return () => clearTimeout(t); }, [aviso]);
  const atualizarEstudo = useCallback((f: (e: Estudo) => Estudo) => setEstudo((e) => { const n = f(e); salvarEstudo(prova.id, n); return n; }), [prova.id]);

  // Abre o documento atual (prova ou gabarito) e libera tudo ao trocar/sair.
  useEffect(() => {
    const arq = doc === "prova" ? prova.prova : prova.gabarito;
    if (!arq) return;
    let vivo = true;
    let rend: RenderizadorPdf | null = null;
    let cancelar = () => {};
    setR(null); setErro(null); setProgresso(null); setLento(false);
    const relogio = setTimeout(() => vivo && setLento(true), 12000);
    (async () => {
      try {
        const t = await abrirPdf(arq.url, (p) => vivo && setProgresso(p));
        cancelar = t.cancelar;
        const pdf = await t.promessa;
        if (!vivo) { void pdf.loadingTask.destroy(); return; }
        rend = await new RenderizadorPdf(pdf, 12, 2).iniciar();
        if (!vivo) { rend.destruir(); return; }
        setR(rend);
        if (doc === "prova") registrarUmaVez(`aberta-${prova.id}`, "enem_prova_aberta", { prova: prova.id, modo });
      } catch (e) {
        const c = classificarErro(e);
        if (vivo && c.tipo !== "cancelado") setErro(c);
      } finally { clearTimeout(relogio); }
    })();
    return () => { vivo = false; clearTimeout(relogio); cancelar(); rend?.destruir(); };
    // `modo` só entra no evento; não deve reabrir o PDF.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, prova, tentativa]);

  // Índice de questões pelo texto oficial, em segundo plano, depois que a 1ª página apareceu.
  useEffect(() => {
    if (!r || doc !== "prova") return;
    let vivo = true;
    setIndice(null); setMapeando(0);
    const iniciar = () => indexarQuestoes(r, prova.dia, (n) => vivo && setMapeando(n)).then((i) => { if (vivo) { setIndice(i); setMapeando(null); } }).catch(() => vivo && setMapeando(null));
    const id = "requestIdleCallback" in window ? requestIdleCallback(iniciar, { timeout: 4000 }) : (setTimeout(iniciar, 1500) as unknown as number);
    return () => { vivo = false; if ("cancelIdleCallback" in window) cancelIdleCallback(id); else clearTimeout(id); };
  }, [r, doc, prova.dia]);

  // Tamanho do palco → tamanho das páginas.
  useEffect(() => {
    const el = palco.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setMedidas({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = r?.total ?? 0;
  const prop = r?.proporcao ?? 1.375;
  const retrato = medidas.w < 760;
  const docAtual = doc === "gabarito" ? "leitura" : modo;
  // 100% = a dupla inteira cabe no palco. O zoom amplia o próprio livro (continua sendo o livro, com rolagem).
  const layout = useMemo(() => {
    const W = Math.max(280, medidas.w - 24);
    const H = Math.max(360, medidas.h - 24);
    const base = Math.max(200, Math.floor(retrato ? Math.min(W, H / prop) : Math.min(W / 2, H / prop)));
    const pw = Math.floor(base * zoom);
    const leituraBase = Math.min(W, 920);
    // "Ajustar à largura": a dupla (ou a página, no modo leitura) ocupa toda a largura do palco.
    const largura = docAtual === "leitura" ? W / leituraBase : W / (base * (retrato ? 1 : 2));
    return { larguraPagina: pw, alturaPagina: Math.round(pw * prop), larguraLeitura: Math.floor(leituraBase * zoom), zoomLargura: Math.min(3, Math.floor(largura * 100) / 100) };
  }, [medidas, prop, retrato, zoom, docAtual]);
  const ampliado = docAtual === "livro" && zoom > 1;
  const mudarZoom = useCallback((z: number) => setZoom(Math.max(1, Math.min(3, Math.round(z * 100) / 100))), []);

  // Dupla visível no modo livro (para o rótulo "4–5 de 32" e para o passo de navegação).
  const dupla = useMemo(() => {
    if (docAtual !== "livro" || retrato || pagina === 1) return [pagina, pagina];
    const esq = pagina % 2 === 0 ? pagina : pagina - 1;
    return [esq, Math.min(total, esq + 1)];
  }, [docAtual, retrato, pagina, total]);

  const mudarPagina = useCallback((n: number) => {
    setPagina(n);
    if (doc === "prova") {
      atualizarEstudo((e) => ({ ...e, ultimaPagina: n }));
      if (n > 1) registrarUmaVez(`virou-${prova.id}`, "enem_pagina_virada", { prova: prova.id, marco: "primeira" });
      if (total && n >= total / 2) registrarUmaVez(`metade-${prova.id}`, "enem_pagina_virada", { prova: prova.id, marco: "metade" });
      if (total && n >= total - 1) registrarUmaVez(`fim-${prova.id}`, "enem_pagina_virada", { prova: prova.id, marco: "fim" });
    }
  }, [doc, prova.id, total, atualizarEstudo]);

  const irPara = useCallback((n: number) => {
    if (!total) return;
    const alvo = Math.max(1, Math.min(total, n));
    setAviso(null);
    if (docAtual === "leitura") irParaLeitura.current?.(alvo);
    else if (animacoes) livro.current?.irPara(alvo);
    mudarPagina(alvo);
    if (painel === "indice" && medidas.w < 760) setPainel(null);
  }, [total, docAtual, animacoes, mudarPagina, painel, medidas.w]);

  const passo = (dir: 1 | -1) => {
    if (!total) return;
    setAviso(null);
    if (docAtual === "livro" && animacoes) { if (dir > 0) livro.current?.proxima(); else livro.current?.anterior(); return; }
    if (docAtual === "livro" && !retrato) {
      const alvo = dir > 0 ? (pagina === 1 ? 2 : dupla[0] + 2) : (dupla[0] <= 2 ? 1 : dupla[0] - 2);
      irPara(alvo);
      return;
    }
    irPara(pagina + dir);
  };

  // Teclado: ← → mudam de página; Esc fecha painel / sai da tela cheia. Nunca enquanto se digita num campo.
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (digitando(e.target, e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (!visivel && !telaCheia && !pseudoCheia) return;
      if (e.key === "ArrowRight") { e.preventDefault(); passo(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); passo(-1); }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomar(zoom + 0.25); }
      else if (e.key === "-") { e.preventDefault(); zoomar(zoom - 0.25); }
      else if (e.key === "0") { e.preventDefault(); zoomar(1); }
      else if (e.key === "Escape") {
        if (painel) setPainel(null);
        else if (pseudoCheia) setPseudoCheia(false);
        else if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); // o navegador costuma tratar o Esc antes; isto é a garantia
      }
    };
    document.addEventListener("keydown", f);
    return () => document.removeEventListener("keydown", f);
  });

  // O leitor só responde ao teclado quando está (quase todo) na tela.
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisivel(e.intersectionRatio > 0.35), { threshold: [0, 0.35, 0.7] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Tela cheia nativa; no iPhone (sem API), um modo imersivo que ocupa a janela.
  useEffect(() => {
    const f = () => setTelaCheia(document.fullscreenElement === raiz.current);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  const alternarTelaCheia = () => {
    const el = raiz.current;
    if (!el) return;
    if (document.fullscreenElement) { void document.exitFullscreen(); return; }
    if (pseudoCheia) { setPseudoCheia(false); return; }
    if (el.requestFullscreen) el.requestFullscreen().catch(() => setPseudoCheia(true));
    else setPseudoCheia(true);
  };
  useEffect(() => {
    if (!pseudoCheia) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, [pseudoCheia]);

  // Pinça (dois dedos) para zoom, em qualquer modo.
  useEffect(() => {
    const el = palco.current;
    if (!el) return;
    let ini: { d: number; z: number } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const comeca = (e: TouchEvent) => { if (e.touches.length === 2) { ini = { d: dist(e.touches), z: zoomRef.current }; e.stopPropagation(); } };
    const move = (e: TouchEvent) => {
      if (!ini || e.touches.length !== 2) return;
      e.preventDefault(); e.stopPropagation();
      const z = Math.max(1, Math.min(3, ini.z * dist(e.touches) / ini.d));
      el.style.setProperty("--pinca", String(z / zoomRef.current));
    };
    const fim = (e: TouchEvent) => {
      if (!ini || e.touches.length >= 2) return;
      const escala = Number(el.style.getPropertyValue("--pinca") || 1);
      el.style.removeProperty("--pinca");
      const z = Math.round(Math.max(1, Math.min(3, zoomRef.current * escala)) * 4) / 4;
      ini = null;
      lembrarCentro();
      setZoom(z);
    };
    el.addEventListener("touchstart", comeca, { capture: true, passive: true });
    el.addEventListener("touchmove", move, { capture: true, passive: false });
    el.addEventListener("touchend", fim, { capture: true });
    el.addEventListener("touchcancel", fim, { capture: true });
    return () => {
      el.removeEventListener("touchstart", comeca, { capture: true });
      el.removeEventListener("touchmove", move, { capture: true });
      el.removeEventListener("touchend", fim, { capture: true });
      el.removeEventListener("touchcancel", fim, { capture: true });
    };
  }, []);
  // Zoom no livro: mantém no centro o mesmo ponto da página que estava no centro antes.
  const centro = useRef({ x: 0.5, y: 0 });
  const zoomAnterior = useRef(zoom);
  useLayoutEffect(() => {
    const el = mesa.current;
    if (!el || zoomAnterior.current === zoom) return;
    zoomAnterior.current = zoom;
    el.scrollLeft = centro.current.x * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = centro.current.y * el.scrollHeight - (centro.current.y > 0 ? el.clientHeight / 2 : 0);
  }, [zoom, layout.larguraPagina]);
  const lembrarCentro = () => {
    const el = mesa.current;
    if (!el || el.scrollHeight <= el.clientHeight) { centro.current = { x: 0.5, y: 0 }; return; }
    centro.current = { x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth, y: el.scrollTop <= 0 ? 0 : (el.scrollTop + el.clientHeight / 2) / el.scrollHeight };
  };
  // Virou a página ampliada: a nova dupla começa do alto.
  useEffect(() => { if (mesa.current && ampliado) mesa.current.scrollTop = 0; }, [dupla[0]]); // eslint-disable-line react-hooks/exhaustive-deps
  // Ampliado, arrastar com o mouse move a página (no toque, a rolagem nativa já faz isso).
  useEffect(() => {
    const el = mesa.current;
    if (!el || !ampliado) return;
    let ini: { x: number; y: number; l: number; t: number } | null = null;
    const desce = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      ini = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop };
      el.setPointerCapture(e.pointerId);
      el.classList.add("arrastando");
    };
    const move = (e: PointerEvent) => { if (ini) { el.scrollLeft = ini.l - (e.clientX - ini.x); el.scrollTop = ini.t - (e.clientY - ini.y); } };
    const sobe = (e: PointerEvent) => { if (ini) { ini = null; el.releasePointerCapture(e.pointerId); el.classList.remove("arrastando"); } };
    el.addEventListener("pointerdown", desce);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", sobe);
    el.addEventListener("pointercancel", sobe);
    return () => { el.removeEventListener("pointerdown", desce); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", sobe); el.removeEventListener("pointercancel", sobe); };
  }, [ampliado, r]);
  const zoomar = (z: number) => { lembrarCentro(); mudarZoom(z); };

  const mudarModo = (m: ModoLeitor) => {
    if (m === modo) return;
    setModo(m);
    registrar("enem_modo_leitura_alterado", { prova: prova.id, modo: m });
  };
  const alternarPainel = (p: "indice" | "gabarito" | "ajustes") => setPainel((a) => (a === p ? null : p));

  // Texto das páginas visíveis no modo livro, para leitores de tela.
  const [textoVisivel, setTextoVisivel] = useState("");
  useEffect(() => {
    if (!r || docAtual !== "livro") return;
    let vivo = true;
    Promise.all([...new Set(dupla)].map((n) => r.texto(n).then((t) => `Página ${n}. ${t}`))).then((ts) => vivo && setTextoVisivel(ts.join("\n\n"))).catch(() => {});
    return () => { vivo = false; };
  }, [r, docAtual, dupla]);

  const carregandoPct = progresso && progresso.total ? Math.min(100, Math.round((progresso.carregado / progresso.total) * 100)) : null;
  const arquivo = doc === "prova" ? prova.prova : prova.gabarito!;

  return (
    <div ref={raiz} className={`leitor${telaCheia || pseudoCheia ? " tela-cheia" : ""}${pseudoCheia ? " imersivo" : ""}`} data-modo={docAtual} aria-label={`Leitor: ${prova.titulo}`} role="region">
      <ReaderToolbar
        titulo={doc === "prova" ? prova.titulo : `Gabarito · ${prova.titulo}`} subtitulo={prova.subtitulo}
        pagina={dupla[0]} paginaFim={dupla[1]} total={total || 1}
        irPara={irPara} anterior={() => passo(-1)} proxima={() => passo(1)}
        zoom={zoom} mudarZoom={zoomar} zoomLargura={layout.zoomLargura > 1.04 ? layout.zoomLargura : null}
        modo={docAtual} mudarModo={mudarModo} painel={painel} alternarPainel={alternarPainel}
        urlPdf={arquivo.url} aoBaixar={() => registrar("enem_pdf_baixado", { prova: prova.id, arquivo: doc, origem: "leitor" })}
        telaCheia={telaCheia || pseudoCheia} alternarTelaCheia={alternarTelaCheia} temGabarito={!!prova.gabarito}
      />

      {doc === "gabarito" && (
        <div className="leitor-faixa">
          <span>Você está vendo o <strong>gabarito oficial</strong>.</span>
          <button type="button" className="botao botao-pequeno" onClick={() => { setDoc("prova"); setPagina(estudo.ultimaPagina ?? 1); }}>Voltar à prova</button>
        </div>
      )}
      {aviso && doc === "prova" && r && (
        <div className="leitor-faixa leve" role="status">
          <span>{aviso}</span>
          <button type="button" className="link-botao" onClick={() => { setAviso(null); irPara(1); }}>Começar do início</button>
          <button type="button" className="botao-icone" aria-label="Fechar aviso" onClick={() => setAviso(null)}>×</button>
        </div>
      )}

      <div className="leitor-corpo">
        <div ref={palco} className="leitor-palco" tabIndex={-1}>
          {erro ? (
            <div className="leitor-erro" role="alert">
              <h3>Não foi possível abrir {doc === "prova" ? "a prova" : "o gabarito"} aqui</h3>
              <p>{erro.tipo === "rede" ? "A conexão falhou ou o servidor do Inep não respondeu." : erro.tipo === "formato" ? "O arquivo não pôde ser lido pelo leitor." : "Aconteceu um erro inesperado."} O documento oficial continua disponível:</p>
              <div className="leitor-erro-acoes">
                <button type="button" className="botao" onClick={() => setTentativa((n) => n + 1)}>Tentar de novo</button>
                <a className="botao botao-contorno" href={arquivo.url} target="_blank" rel="noopener">Abrir PDF oficial</a>
              </div>
            </div>
          ) : !r ? (
            <div className="leitor-carregando" role="status" aria-live="polite">
              <div className={`livro-esqueleto${retrato ? " retrato" : ""}`} aria-hidden="true">
                <div className="esq-pagina"><i /><i /><i className="curta" /><i /><i /></div>
                {!retrato && <div className="esq-pagina"><i /><i className="curta" /><i /><i /><i /></div>}
              </div>
              <div className="barra-progresso" aria-hidden="true"><span style={{ width: `${carregandoPct ?? 8}%` }} className={carregandoPct == null ? "indeterminada" : ""} /></div>
              <p>Baixando {doc === "prova" ? "a prova" : "o gabarito"} do site do Inep{progresso?.total ? ` · ${megas(progresso.carregado)} de ${megas(progresso.total)}` : ` · ${megas(arquivo.bytes)}`}</p>
              {lento && <p className="miudo">A conexão está lenta. Se preferir, <a href={arquivo.url} target="_blank" rel="noopener">abra o PDF oficial</a> direto.</p>}
            </div>
          ) : docAtual === "leitura" ? (
            <div className="leitura-rolagem">
              <LeituraContinua r={r} largura={layout.larguraLeitura} pagina={pagina} aoMudar={mudarPagina} irParaRef={irParaLeitura} />
            </div>
          ) : (
            <div ref={mesa} className={`palco-livro${ampliado ? " ampliado" : ""}`}>
              {animacoes ? (
                <FlipBookViewer ref={livro} r={r} larguraPagina={layout.larguraPagina} alturaPagina={layout.alturaPagina} retrato={retrato} pagina={pagina} aoMudar={mudarPagina} som={som} arrastar={!ampliado} />
              ) : (
                <EspelhoEstatico r={r} larguraPagina={layout.larguraPagina} retrato={retrato} pagina={pagina} />
              )}
              {animacoes && <section className="sr-only" aria-live="off" aria-label="Texto das páginas abertas">{textoVisivel}</section>}
            </div>
          )}
          {r && docAtual === "livro" && !ampliado && (
            <>
              <button type="button" className="seta-lateral esq" onClick={() => passo(-1)} disabled={dupla[0] <= 1} aria-label="Página anterior">‹</button>
              <button type="button" className="seta-lateral dir" onClick={() => passo(1)} disabled={dupla[1] >= total} aria-label="Próxima página">›</button>
            </>
          )}
        </div>

        {painel && (
          <aside className="leitor-painel" aria-label={painel === "indice" ? "Índice" : painel === "gabarito" ? "Gabarito" : "Configurações"}>
            <button type="button" className="botao-icone fechar-painel" aria-label="Fechar painel" onClick={() => setPainel(null)}>×</button>
            {painel === "indice" && (
              <ExamNavigation total={total} pagina={pagina} irPara={irPara} areas={prova.areas} indice={indice} mapeando={mapeando}
                marcadores={estudo.marcadores} alternarMarcador={(n) => atualizarEstudo((e) => ({ ...e, marcadores: e.marcadores.includes(n) ? e.marcadores.filter((x) => x !== n) : [...e.marcadores, n] }))}
                revisar={estudo.revisar} alternarRevisar={(q) => atualizarEstudo((e) => ({ ...e, revisar: e.revisar.includes(q) ? e.revisar.filter((x) => x !== q) : [...e.revisar, q] }))} />
            )}
            {painel === "gabarito" && (
              <AnswerKeyViewer provaId={prova.id} identificacao={prova.identificacao} dia={prova.dia} idioma={prova.idioma} gabarito={prova.gabarito} compacto
                aoAbrirNoLeitor={doc === "prova" && prova.gabarito ? () => { setDoc("gabarito"); setPagina(1); setPainel(null); } : undefined} />
            )}
            {painel === "ajustes" && (
              <ReaderSettings animacoes={animacoes} som={som} modo={modo} zoom={zoom} mudarZoom={zoomar} mudar={(p) => {
                if (p.animacoes !== undefined) setAnimacoes(p.animacoes);
                if (p.som !== undefined) setSom(p.som);
                if (p.modo) mudarModo(p.modo);
              }} />
            )}
          </aside>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{r ? `Página ${dupla[0]}${dupla[1] > dupla[0] ? ` e ${dupla[1]}` : ""} de ${total}` : ""}</p>
    </div>
  );
}
