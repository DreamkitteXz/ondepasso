// Tokens copiados de web/app/globals.css (tema escuro, o padrão do site).
import { Easing } from "remotion";

export const COR = {
  bg: "#0F0E0D",
  panel: "#151412",
  panel2: "#1B1A17",
  panel3: "#22201D",
  linha1: "rgba(250,250,249,.08)",
  linha2: "rgba(250,250,249,.16)",
  fg1: "#FAFAF9",
  fg2: "#D6D4CF",
  fg3: "#A6A39C",
  fg4: "#85827C",
  verde: "#3DD68C",
  verdeTinta: "rgba(61,214,140,.14)",
  ambar: "#E8B04B",
  ambarTinta: "rgba(232,176,75,.14)",
  vermelho: "#F14242",
  vermelhoTinta: "rgba(241,66,66,.14)",
  uf: "#1E1D1A",
  ufLinha: "rgba(250,250,249,.10)",
} as const;

export const SERIF = "Faustina, Georgia, serif";
export const SANS = "Geist, 'Helvetica Neue', Arial, sans-serif";

// Curvas do vídeo (ver docs/CREATIVE_DIRECTION.md → Princípios de animação).
export const EASE = {
  /** Entrada: rápida no começo, assenta devagar (padrão para tudo que entra). */
  entra: Easing.bezier(0.16, 1, 0.3, 1),
  /** Saída: acelera para fora. */
  sai: Easing.bezier(0.7, 0, 0.84, 0),
  /** Movimento de câmera e transições longas. */
  camera: Easing.bezier(0.65, 0, 0.35, 1),
  /** Traço que se desenha. */
  traco: Easing.bezier(0.45, 0, 0.2, 1),
};

export type Status = "supera" | "igual" | "pouco" | "abaixo";
export const COR_STATUS: Record<Status, string> = { supera: COR.verde, igual: COR.ambar, pouco: COR.ambar, abaixo: COR.vermelho };
export const ROTULO: Record<Status, string> = { supera: "Supera o corte", igual: "Iguala o corte", pouco: "Por pouco", abaixo: "Abaixo do corte" };

/** 720 → "720,00" (formato do site). */
export const nota = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
