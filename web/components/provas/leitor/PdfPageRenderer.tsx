"use client";
// Uma página do PDF em canvas, renderizada só quando pedida (visível), com esqueleto enquanto carrega e o texto
// da página para leitores de tela (o canvas sozinho não é acessível).
import { useEffect, useRef, useState } from "react";
import type { RenderizadorPdf } from "@/lib/leitor/pdf";
import { medidaNitida, useAlinharAoPixel } from "@/lib/leitor/pixel";

type Props = { r: RenderizadorPdf; n: number; largura: number; ativa?: boolean; prioridade?: number; comTexto?: boolean; rotulo?: string };

export function PdfPageRenderer({ r, n, largura, ativa = true, prioridade = 1, comTexto = false, rotulo }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const figura = useRef<HTMLElement>(null);
  useAlinharAoPixel(figura, [largura]);
  const [estado, setEstado] = useState<"espera" | "pronta" | "erro">("espera");
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el || !ativa) return;
    let vivo = true;
    setEstado("espera");
    r.renderizar(n, largura, prioridade).then((c) => {
      if (!vivo) return;
      el.replaceChildren(c);
      setEstado("pronta");
    }).catch((e) => { if (vivo && !/cancel|destru/i.test(String(e?.message))) setEstado("erro"); });
    return () => { vivo = false; el.replaceChildren(); };
  }, [r, n, largura, ativa, prioridade]);

  useEffect(() => {
    if (!comTexto || !ativa) return;
    let vivo = true;
    r.texto(n).then((t) => { if (vivo) setTexto(t); }).catch(() => {});
    return () => { vivo = false; };
  }, [r, n, comTexto, ativa]);

  return (
    <figure ref={figura} className={`pagina-pdf estado-${estado}`} style={{ width: largura, height: medidaNitida(largura, r.proporcao).altura }} aria-label={rotulo ?? `Página ${n} de ${r.total}`}>
      <div ref={caixa} className="pagina-pdf-canvas" aria-hidden="true" />
      {estado !== "pronta" && (
        <div className="pagina-pdf-espera" aria-hidden="true">
          {estado === "erro" ? <span>Não foi possível desenhar a página {n}.</span> : <><i /><i /><i className="curta" /><i /><b>{n}</b></>}
        </div>
      )}
      {comTexto && texto != null && <figcaption className="sr-only">{texto || "Página sem texto (imagem)."}</figcaption>}
    </figure>
  );
}

/** Modo leitura: páginas empilhadas com rolagem; só as visíveis (e as vizinhas) são desenhadas. */
export function LeituraContinua({ r, largura, pagina, aoMudar, irParaRef }: { r: RenderizadorPdf; largura: number; pagina: number; aoMudar: (n: number) => void; irParaRef: React.MutableRefObject<((n: number) => void) | null> }) {
  const lista = useRef<HTMLDivElement>(null);
  const [visiveis, setVisiveis] = useState<Set<number>>(() => new Set([pagina]));
  const atualRef = useRef(pagina);

  useEffect(() => {
    const raiz = lista.current?.parentElement;
    if (!lista.current || !raiz) return;
    const fracoes = new Map<number, number>();
    const io = new IntersectionObserver((ents) => {
      for (const e of ents) fracoes.set(Number((e.target as HTMLElement).dataset.n), e.isIntersecting ? e.intersectionRatio : 0);
      const vis = [...fracoes].filter(([, f]) => f > 0).map(([n]) => n);
      setVisiveis(new Set(vis.flatMap((n) => [n - 1, n, n + 1])));
      const melhor = [...fracoes].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
      if (melhor && melhor[1] > 0 && melhor[0] !== atualRef.current) { atualRef.current = melhor[0]; aoMudar(melhor[0]); }
    }, { root: raiz, rootMargin: "50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });
    lista.current.querySelectorAll<HTMLElement>("[data-n]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [r, largura, aoMudar]);

  // Ir para página: rola até ela (sem animação se a pessoa prefere menos movimento).
  useEffect(() => {
    irParaRef.current = (n: number) => {
      const el = lista.current?.querySelector<HTMLElement>(`[data-n="${n}"]`);
      atualRef.current = n;
      el?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };
    return () => { irParaRef.current = null; };
  }, [irParaRef]);

  // Ao entrar no modo leitura, começa na página em que a pessoa estava.
  useEffect(() => {
    const el = lista.current?.querySelector<HTMLElement>(`[data-n="${atualRef.current}"]`);
    el?.scrollIntoView({ block: "start" });
  }, [largura]);

  return (
    <div ref={lista} className="leitura-lista">
      {Array.from({ length: r.total }, (_, i) => i + 1).map((n) => (
        <div key={n} data-n={n} className="leitura-item">
          <PdfPageRenderer r={r} n={n} largura={largura} ativa={visiveis.has(n)} prioridade={n === pagina ? 10 : 3} comTexto />
        </div>
      ))}
    </div>
  );
}

/** Livro sem animação (preferência ou "reduzir movimento"): mostra a dupla atual e troca na hora. */
export function EspelhoEstatico({ r, larguraPagina, retrato, pagina }: { r: RenderizadorPdf; larguraPagina: number; retrato: boolean; pagina: number }) {
  const paginas = retrato || pagina === 1 ? [pagina] : pagina % 2 === 0 ? [pagina, pagina + 1] : [pagina - 1, pagina];
  const vis = paginas.filter((n) => n >= 1 && n <= r.total);
  // Pré-renderiza as vizinhas para a troca parecer instantânea.
  useEffect(() => {
    for (const n of [vis[0] - 2, vis[0] - 1, vis[vis.length - 1] + 1, vis[vis.length - 1] + 2]) if (n >= 1 && n <= r.total) r.renderizar(n, larguraPagina, 2).catch(() => {});
  }, [r, larguraPagina, vis.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`espelho${vis.length === 2 ? " duplo" : ""}`}>
      {vis.map((n, i) => (
        <div key={n} className={`espelho-folha ${vis.length === 2 ? (i === 0 ? "folha-esq" : "folha-dir") : ""}`}>
          <PdfPageRenderer r={r} n={n} largura={larguraPagina} prioridade={10} comTexto />
        </div>
      ))}
    </div>
  );
}
