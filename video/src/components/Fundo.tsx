// Fundo: o escuro do site com uma luz verde bem discreta que acompanha o foco de cada cena.
import React from "react";
import { AbsoluteFill } from "remotion";
import { COR } from "../lib/tema";
import { useT, mix, prog } from "../lib/anim";
import { M } from "../timeline";
import { useLayout } from "../lib/layout";

/** `forca(t)` (opcional) define a intensidade da luz verde; sem ela, segue o vídeo institucional. */
export const Fundo: React.FC<{ forca?: (t: number) => number }> = ({ forca: forcaFn }) => {
  const t = useT();
  const { W, H, vertical } = useLayout();
  // A luz passeia devagar; fica mais forte na revelação da marca e no final.
  const forca = forcaFn ? forcaFn(t) : 0.05 + 0.07 * Math.max(prog(t, M.praResponder, M.ondePasso + 0.4) * (1 - prog(t, M.digita - 0.6, M.digita + 0.4)), prog(t, M.ondePassoFinal - 0.5, M.ondePassoFinal + 1));
  const x = mix(W * 0.62, W * 0.42, (Math.sin(t / 7) + 1) / 2);
  const y = mix(H * 0.38, H * 0.6, (Math.cos(t / 9) + 1) / 2);
  const r = vertical ? H * 0.55 : W * 0.55;
  return (
    <AbsoluteFill style={{ background: COR.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(${r}px ${r * 0.8}px at ${x}px ${y}px, rgba(61,214,140,${forca}), transparent 70%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,.55) 100%)` }} />
    </AbsoluteFill>
  );
};
