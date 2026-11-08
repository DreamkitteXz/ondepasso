"use client";
// Adaptador entre o StPageFlip (page-flip, MIT) e o PDF.js: as folhas são elementos criados aqui (fora do React,
// porque o page-flip move os nós do DOM) e cada folha recebe o canvas da página só quando está perto da vista.
// O page-flip cuida da dobra: a folha acompanha o arrasto, curva, projeta sombra e assenta com movimento natural.
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { PageFlip } from "page-flip/dist/js/page-flip.module.js";
import type { RenderizadorPdf } from "@/lib/leitor/pdf";
import { somDePapel } from "@/lib/leitor/preferencias";

export type ApiLivro = { proxima: () => void; anterior: () => void; irPara: (pagina: number) => void };

type Props = {
  r: RenderizadorPdf;
  larguraPagina: number;
  alturaPagina: number;
  retrato: boolean;
  /** Página atual (1 = capa). */
  pagina: number;
  aoMudar: (pagina: number) => void;
  som: boolean;
};

/** Páginas visíveis no índice do page-flip (0-based) para a orientação atual. */
function visiveis(i: number, total: number, retrato: boolean): number[] {
  if (retrato || i === 0) return [i];
  const esq = i % 2 === 1 ? i : i - 1; // com capa, as duplas são (1,2), (3,4)…
  return [esq, esq + 1].filter((x) => x >= 0 && x < total);
}

export const FlipBookViewer = forwardRef<ApiLivro, Props>(function FlipBookViewer({ r, larguraPagina, alturaPagina, retrato, pagina, aoMudar, som }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const pf = useRef<PageFlip | null>(null);
  const folhas = useRef<HTMLElement[]>([]);
  const aoMudarRef = useRef(aoMudar);
  const somRef = useRef(som);
  const paginaRef = useRef(pagina);
  aoMudarRef.current = aoMudar;
  somRef.current = som;

  useImperativeHandle(ref, () => ({
    proxima: () => pf.current?.flipNext("top"),
    anterior: () => pf.current?.flipPrev("top"),
    irPara: (n: number) => pf.current?.turnToPage(Math.max(0, Math.min(r.total - 1, n - 1))),
  }), [r]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const total = r.total;
    const livro = document.createElement("div");
    livro.className = "livro";
    livro.style.width = `${retrato ? larguraPagina : larguraPagina * 2}px`;
    el.appendChild(livro);

    folhas.current = Array.from({ length: total }, (_, i) => {
      const f = document.createElement("div");
      f.className = `folha ${retrato ? "" : i === 0 ? "folha-dir" : i % 2 === 1 ? "folha-esq" : "folha-dir"}`;
      f.dataset.density = "soft";
      f.setAttribute("aria-hidden", "true");
      f.innerHTML = `<div class="folha-papel"><div class="folha-espera"><span class="esq-texto"></span><span class="esq-texto curto"></span><span class="esq-texto"></span><b>${i + 1}</b></div></div><div class="folha-luz"></div>`;
      return f;
    });

    const inst = new PageFlip(livro, {
      width: larguraPagina, height: alturaPagina, size: "fixed", autoSize: true,
      showCover: true, usePortrait: true, drawShadow: true, maxShadowOpacity: 0.5, flippingTime: 750,
      mobileScrollSupport: false, swipeDistance: 24, showPageCorners: true, useMouseEvents: true,
      startPage: Math.max(0, Math.min(total - 1, paginaRef.current - 1)),
    });
    inst.loadFromHTML(folhas.current);
    pf.current = inst;

    // Só as folhas perto da vista recebem canvas; as distantes voltam ao "papel em branco" e liberam memória.
    const preencher = (i: number) => {
      const ori = inst.getOrientation?.() ?? (retrato ? "portrait" : "landscape");
      const vis = visiveis(i, total, ori === "portrait");
      const perto = new Set<number>();
      for (let k = vis[0] - 2; k <= vis[vis.length - 1] + 3; k++) if (k >= 0 && k < total) perto.add(k);
      r.descartarFora(new Set([...perto].map((k) => k + 1)));
      folhas.current.forEach((f, k) => {
        const papel = f.firstElementChild as HTMLElement;
        if (!perto.has(k)) {
          const c = papel.querySelector("canvas");
          if (c) { c.remove(); papel.classList.remove("pronta"); }
          return;
        }
        if (papel.querySelector("canvas")) return;
        const prio = vis.includes(k) ? 10 : 5 - Math.abs(k - vis[0]);
        r.renderizar(k + 1, larguraPagina, prio).then((canvas) => {
          if (pf.current !== inst || papel.querySelector("canvas")) return;
          papel.appendChild(canvas);
          papel.classList.add("pronta");
        }).catch(() => {});
      });
    };

    inst.on("flip", (e) => {
      paginaRef.current = e.data + 1;
      preencher(e.data);
      aoMudarRef.current(e.data + 1);
      if (somRef.current) somDePapel();
    });
    inst.on("changeOrientation", () => preencher(inst.getCurrentPageIndex()));
    preencher(inst.getCurrentPageIndex());

    return () => {
      pf.current = null;
      try { inst.destroy(); } catch {}
      for (const f of folhas.current) f.querySelector("canvas")?.remove();
      folhas.current = [];
      el.replaceChildren();
    };
  }, [r, larguraPagina, alturaPagina, retrato]);

  // Página mudou por fora (índice, "ir para", modo leitura → livro): vira sem animação.
  useEffect(() => {
    paginaRef.current = pagina;
    const inst = pf.current;
    if (!inst) return;
    const atual = inst.getCurrentPageIndex();
    const ori = inst.getOrientation?.() ?? "landscape";
    if (!visiveis(atual, r.total, ori === "portrait").includes(pagina - 1)) inst.turnToPage(pagina - 1);
  }, [pagina, r]);

  return <div ref={host} className="livro-host" style={{ width: retrato ? larguraPagina : larguraPagina * 2, height: alturaPagina }} />;
});
