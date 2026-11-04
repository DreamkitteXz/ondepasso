import { createContext, useContext } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig, type EasingFunction } from "remotion";
import { EASE } from "./tema";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Início (s) da Sequence onde o componente está, para trabalhar com o tempo ABSOLUTO do vídeo. */
export const InicioCena = createContext(0);

/** Tempo absoluto do vídeo em segundos (mesma escala de src/timeline.ts). */
export function useT() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ini = useContext(InicioCena);
  return frame / fps + ini;
}

/** 0→1 entre os instantes a e b (s), com curva. */
export const prog = (t: number, a: number, b: number, ease: EasingFunction = EASE.entra) =>
  interpolate(t, [a, b], [0, 1], { ...clamp, easing: ease });

/** Interpola valores numéricos. */
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

/** Mola (spring) disparada no instante `a` (s). */
export function mola(t: number, a: number, fps: number, cfg: { damping?: number; stiffness?: number; mass?: number } = {}) {
  return spring({ frame: Math.max(0, (t - a) * fps), fps, config: { damping: 18, stiffness: 120, mass: 0.9, ...cfg } });
}

/** Entrada + saída numa janela: sobe em [a, a+ent] e desce em [b-sai, b]. */
export const janela = (t: number, a: number, b: number, ent = 0.5, sai = 0.4) =>
  Math.min(prog(t, a, a + ent), 1 - prog(t, b - sai, b, EASE.sai));
