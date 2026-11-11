"use client";
// Movimento do site: abertura da página (GSAP), rolagem suave (Lenis, único motor), revelação ao rolar
// (IntersectionObserver + CSS) e botão magnético. Só transform e opacity.
// Com "reduzir movimento" ou sem JavaScript nada disso roda: a classe .mov nem entra no <html> (ver SCRIPT_MOV)
// e a página já aparece no estado final.
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const REVELAR = ".inicio-lista > *, .lc-linha, .curso-lado > *, footer .wrap, .estado-lado > *, .uni-c, .ano, .provas-sobre-grade > div, .provas-fonte, .av-grade > div, .av-linha li, .prova-grade > *, .calc-linha";
const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Movimento() {
  const caminho = usePathname();

  // Rolagem suave: Lenis é o único motor, ligado ao relógio do GSAP e ao ScrollTrigger. Só com mouse/trackpad.
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("mov") || !matchMedia("(pointer: fine)").matches) return;
    let desfazer = () => {};
    let vivo = true;
    (async () => {
      const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("lenis")]);
      if (!vivo) return;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ lerp: 0.12, smoothWheel: true, prevent: (el) => !!el.closest("select, dialog, [data-rolagem-propria]") });
      lenis.on("scroll", ScrollTrigger.update);
      const tique = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(tique);
      gsap.ticker.lagSmoothing(0);
      // Único efeito preso à rolagem: o brilho de fundo desce mais devagar que a página.
      const brilho = gsap.to(".fundo-brilho", { yPercent: 18, ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: true } });
      const medir = () => ScrollTrigger.refresh();
      document.fonts?.ready.then(medir);
      desfazer = () => { gsap.ticker.remove(tique); brilho.scrollTrigger?.kill(); brilho.kill(); lenis.destroy(); };
    })();
    return () => { vivo = false; desfazer(); };
  }, []);

  // Abertura e revelações: refeitas a cada página.
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("mov")) return;
    const limpar: (() => void)[] = [];
    let vivo = true;

    // Pontos do mapa: nascem em onda a partir do canto de onde vem a luz (o atraso vai numa variável CSS).
    const atrasar = (raiz: ParentNode) => raiz.querySelectorAll<SVGGElement>(".mapa .pt").forEach((g) => {
      const m = /translate\(([-\d.]+)[ ,]+([-\d.]+)/.exec(g.getAttribute("transform") ?? "");
      if (m) g.style.setProperty("--d", `${Math.round(Math.hypot(600 - +m[1], +m[2]) * 1.4)}ms`);
    });
    atrasar(document);

    // Revelação ao rolar: a classe .visto dispara a transição do CSS. Linhas que entram depois (filtro, "ver mais") também.
    const io = new IntersectionObserver((es) => es.forEach((e, n) => {
      if (!e.isIntersecting) return;
      const el = e.target as HTMLElement;
      el.style.setProperty("--ordem", String(Math.min(n, 10)));
      el.classList.add("visto"); io.unobserve(el);
    }), { rootMargin: "0px 0px -6% 0px" });
    const observar = (raiz: ParentNode) => raiz.querySelectorAll<HTMLElement>(REVELAR).forEach((el) => { if (!el.classList.contains("visto")) io.observe(el); });
    observar(document);
    const mo = new MutationObserver(() => { observar(document); atrasar(document); });
    const principal = document.querySelector("main");
    if (principal) mo.observe(principal, { childList: true, subtree: true });
    limpar.push(() => { io.disconnect(); mo.disconnect(); });

    (async () => {
      const { gsap } = await import("gsap");
      if (!vivo) return;
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 0.9 }, onComplete: () => html.classList.add("mov-fim") });
        const tem = (s: string) => document.querySelector(s) != null;
        const primeira = !html.classList.contains("mov-pronto");
        html.classList.add("mov-pronto");
        if (primeira) tl.from(".topbar .wrap", { yPercent: -140, opacity: 0, duration: 1, clearProps: "all" }, 0);
        if (tem(".manchete-mov")) {
          tl.from(".mov-topo .rotulo", { y: 14, opacity: 0, duration: 0.7, clearProps: "all" }, 0.1)
            .from(".manchete-mov .mp-i", { yPercent: 115, duration: 1.1, stagger: 0.07, clearProps: "all" }, 0.18);
        }
        if (tem(".inicio")) {
          tl.from(".inicio-topo > :not(.rotulo):not(.manchete-mov)", { y: 22, opacity: 0, stagger: 0.08, clearProps: "all" }, 0.55)
            .from(".como-funciona li", { x: -14, opacity: 0, stagger: 0.07, duration: 0.7, clearProps: "all" }, 0.7)
            .from(".inicio-controles > *", { y: 22, opacity: 0, stagger: 0.08, clearProps: "all" }, 0.8)
            .from(".inicio-mapa", { y: 36, opacity: 0, scale: 0.975, duration: 1.3, transformOrigin: "50% 60%", clearProps: "all" }, 0.3);
        }
        if (tem(".pagina-curso")) {
          tl.from(".pagina-curso .voltar", { opacity: 0, duration: 0.6, clearProps: "all" }, 0)
            .from(".curso-fatos > *", { y: 22, opacity: 0, stagger: 0.08, clearProps: "all" }, 0.5)
            .from(".curso-acoes > *", { y: 14, opacity: 0, stagger: 0.06, clearProps: "all" }, 0.7)
            .from(".curso-nota, .curso-principal > .filtros, .tabela-curso", { y: 28, opacity: 0, stagger: 0.1, clearProps: "all" }, 0.75);
        }
        if (tem(".pagina-calc")) {
          tl.from(".calc-sub > *", { y: 18, opacity: 0, stagger: 0.08, clearProps: "all" }, 0.5)
            .from(".calc-painel, .calc-filtros-bloco", { y: 30, opacity: 0, stagger: 0.1, clearProps: "all" }, 0.65)
            .from(".calc-resultado", { y: 36, opacity: 0, duration: 1.1, clearProps: "all" }, 0.75)
            .from(".calc-nota", { y: 14, opacity: 0, stagger: 0.05, duration: 0.7, clearProps: "all" }, 0.85);
        }
        if (tem(".pagina-aovivo")) tl.from(".av-cabecalho .sub, .av-acoes > *", { y: 20, opacity: 0, stagger: 0.08, clearProps: "all" }, 0.7);
        if (tem(".pagina-prova")) {
          tl.from(".prova-cabecalho .capa-caderno", { y: 30, opacity: 0, rotate: -6, duration: 1.1, clearProps: "all" }, 0.3)
            .from(".prova-cabecalho .sub, .prova-fatos > li, .prova-cabecalho .prova-acoes > *", { y: 18, opacity: 0, stagger: 0.06, clearProps: "all" }, 0.55)
            .from(".leitor-convite", { y: 30, opacity: 0, clearProps: "all" }, 0.9);
        }
        if (tem(".pagina-oferta")) {
          tl.from(".oferta-cabecalho .sub, .pagina-oferta .voltar", { y: 14, opacity: 0, clearProps: "all" }, 0.45)
            .from(".curso-fatos > *", { y: 22, opacity: 0, stagger: 0.08, clearProps: "all" }, 0.55)
            .from(".oferta-principal > *, .oferta-lado > *", { y: 28, opacity: 0, stagger: 0.07, clearProps: "all" }, 0.75)
            .from(".hc-barra i", { scaleY: 0, transformOrigin: "50% 100%", stagger: 0.06, duration: 1, clearProps: "transform" }, 1.0)
            .from(".figura", { yPercent: 30, opacity: 0, duration: 1, clearProps: "all" }, 0.8);
        }
        if (tem(".pagina-provas")) {
          tl.from(".provas-topo > p:not(.rotulo)", { y: 18, opacity: 0, clearProps: "all" }, 0.5)
            .from(".curso-fatos > *", { y: 22, opacity: 0, stagger: 0.08, clearProps: "all" }, 0.55)
            .from(".suas-provas, .controles, .biblioteca-contagem", { y: 24, opacity: 0, stagger: 0.08, clearProps: "all" }, 0.8);
        }
        if (tem(".pagina-unis")) {
          tl.from(".unis-cabecalho .sub", { y: 18, opacity: 0, clearProps: "all" }, 0.5)
            .from(".curso-fatos > *", { y: 22, opacity: 0, stagger: 0.08, clearProps: "all" }, 0.55)
            .from(".unis2-lado, .unis-controles, .unis2-cabeca", { y: 28, opacity: 0, stagger: 0.1, clearProps: "all" }, 0.75)
            .from(".um-mapa .uf-c", { opacity: 0, scale: 0.9, transformOrigin: "50% 50%", stagger: { each: 0.02, from: "random" }, duration: 0.7, clearProps: "opacity,transform,scale" }, 0.9);
        }
        // Números do cabeçalho contam até o valor final (que já está no HTML).
        document.querySelectorAll<HTMLElement>("[data-conta]").forEach((el) => {
          const fim = Number(el.dataset.conta); if (!Number.isFinite(fim)) return;
          const dec = el.dataset.dec === "2"; const o = { v: fim * (dec ? 0.93 : 0) };
          const texto = el.textContent;
          tl.to(o, { v: fim, duration: 1.4, ease: "power3.out", onUpdate: () => { el.textContent = dec ? fmt(o.v) : Math.round(o.v).toLocaleString("pt-BR"); }, onComplete: () => { el.textContent = texto; } }, 0.55);
        });
      });
      limpar.push(() => ctx.revert());

      // Botão magnético: o botão principal segue de leve o ponteiro (só mouse).
      if (matchMedia("(pointer: fine)").matches) {
        const mover = (e: PointerEvent) => {
          const b = (e.target as Element).closest?.<HTMLElement>(".botao-ima"); if (!b) return;
          const r = b.getBoundingClientRect();
          gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.22, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.5, ease: "power3.out", overwrite: true });
        };
        const sair = (e: PointerEvent) => {
          const b = (e.target as Element).closest?.<HTMLElement>(".botao-ima");
          if (b && !b.contains(e.relatedTarget as Node)) gsap.to(b, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.45)", overwrite: true });
        };
        const soltar = () => gsap.set(".botao-ima", { x: 0, y: 0 });
        document.addEventListener("pointermove", mover, { passive: true });
        document.addEventListener("pointerout", sair, { passive: true });
        window.addEventListener("blur", soltar);
        limpar.push(() => { document.removeEventListener("pointermove", mover); document.removeEventListener("pointerout", sair); window.removeEventListener("blur", soltar); });
      }
    })();
    return () => { vivo = false; limpar.forEach((f) => f()); };
  }, [caminho]);

  return null;
}
