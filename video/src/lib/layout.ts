import { useVideoConfig } from "remotion";

/** Formato atual. As cenas reorganizam os elementos (não só recortam) quando o vídeo é vertical. */
export function useLayout() {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  return {
    W: width,
    H: height,
    vertical,
    /** Escolhe um valor por formato: v(horizontal, vertical). */
    v: <T,>(h: T, vert: T) => (vertical ? vert : h),
    /** Margem segura: ≥ 80 px nas laterais e ≥ 100 px em cima/embaixo (mais no vertical, por causa da interface das redes). */
    seguro: vertical ? { x: 80, topo: 200, base: 320 } : { x: 120, topo: 100, base: 100 },
  };
}
