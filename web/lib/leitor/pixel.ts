// Nitidez com qualquer zoom do navegador. Com zoom de 110%, 125%, 90%..., 1 px de CSS não é um número inteiro de
// pixels da tela: uma página de 489 px vira 611,25 px físicos e começa em x = 181,25. Aí o navegador reamostra o
// canvas e o texto borra. Aqui o tamanho e a posição das páginas são escolhidos em pixels físicos inteiros.
import { useLayoutEffect, useSyncExternalStore, type RefObject } from "react";

export const densidade = () => (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);

/** Largura e altura (em px de CSS) que correspondem a um número inteiro de pixels físicos, sem passar de `largura`. */
export function medidaNitida(largura: number, proporcao: number) {
  const d = densidade();
  const px = Math.max(1, Math.floor(largura * d + 1e-6));
  return { largura: px / d, altura: Math.round(px * proporcao) / d };
}

/** Densidade atual, atualizada quando muda (zoom do navegador, janela levada para outro monitor). */
export function useDensidade() {
  return useSyncExternalStore(
    (avisar) => {
      let mq: MediaQueryList | null = null;
      const ouvir = () => { mq?.removeEventListener("change", trocou); mq = matchMedia(`(resolution: ${densidade()}dppx)`); mq.addEventListener("change", trocou); };
      const trocou = () => { ouvir(); avisar(); };
      ouvir();
      window.addEventListener("resize", avisar);
      return () => { mq?.removeEventListener("change", trocou); window.removeEventListener("resize", avisar); };
    },
    densidade,
    () => 1,
  );
}

/**
 * Desloca o elemento (position: relative) uma fração de px para que o conteúdo comece exatamente num pixel da tela.
 * `alvo` escolhe o que medir (o page-flip posiciona as folhas com deslocamentos próprios, como left: 0.1px).
 */
export function useAlinharAoPixel(ref: RefObject<HTMLElement | null>, deps: unknown[], alvo?: (el: HTMLElement) => HTMLElement | null) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const alinhar = () => {
      el.style.left = "0px"; el.style.top = "0px";
      const r = (alvo?.(el) ?? el).getBoundingClientRect();
      const d = densidade();
      const dx = (Math.round(r.left * d) - r.left * d) / d;
      const dy = (Math.round(r.top * d) - r.top * d) / d;
      if (Math.abs(dx) > 0.001) el.style.left = `${dx}px`;
      if (Math.abs(dy) > 0.001) el.style.top = `${dy}px`;
    };
    alinhar();
    const t = [setTimeout(alinhar, 60), setTimeout(alinhar, 400)]; // depois que o conteúdo (folhas do livro) se posicionou
    const ro = new ResizeObserver(alinhar);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener("resize", alinhar);
    return () => { t.forEach(clearTimeout); ro.disconnect(); window.removeEventListener("resize", alinhar); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
