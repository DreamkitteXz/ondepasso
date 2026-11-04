// Revelação da marca: o visto se desenha no centro, a estação surge, o símbolo vai para o lugar
// na logo horizontal enquanto o nome aparece. Usado na cena 2 (marca) e na 7 (encerramento).
import React from "react";
import { COR } from "../lib/tema";
import { mix, mola, prog } from "../lib/anim";
import { useLayout } from "../lib/layout";
import { LOCKUP_RAZAO, Lockup, SIM, SimboloLocal } from "./BrandLogo";
import { EASE } from "../lib/tema";

/** Escala do símbolo sozinho no centro (px por unidade da logo) e posição. */
export function palcoSimbolo(W: number, H: number, vertical: boolean) {
  const S = (vertical ? 470 : 420) / SIM.altura;
  return { S, cx: W / 2, cy: H / 2 - (vertical ? 60 : 30) };
}
/** Local do símbolo → tela, no palco central. */
export function noPalco(p: { x: number; y: number }, W: number, H: number, vertical: boolean) {
  const { S, cx, cy } = palcoSimbolo(W, H, vertical);
  return { x: cx + S * (p.x - SIM.centro.x), y: cy + S * (p.y - SIM.centro.y) };
}

type Props = {
  t: number;
  traco: [number, number]; // desenho do visto (início, fim)
  anelEm: number; // estação surge
  lockupEm: number; // símbolo vai para a logo e o nome aparece
  largura: number; // largura final do lockup (px)
  centroY: number; // centro vertical do lockup na tela
  brilho?: number;
};

export const LogoReveal: React.FC<Props> = ({ t, traco, anelEm, lockupEm, largura, centroY, brilho = 0 }) => {
  const { W, H, vertical } = useLayout();
  const fps = 30;
  const pt = prog(t, traco[0], traco[1], EASE.traco);
  const anel = mola(t, anelEm, fps, { damping: 11, stiffness: 170 });
  const k = prog(t, lockupEm, lockupEm + 0.75, EASE.camera);
  const nome = prog(t, lockupEm + 0.42, lockupEm + 1.0, EASE.entra);

  // Palco (símbolo sozinho, grande) → posição do símbolo dentro do lockup.
  const { S, cx, cy } = palcoSimbolo(W, H, vertical);
  const alt = largura / LOCKUP_RAZAO;
  const s = largura / 733.1; // px por unidade do lockup
  const Ox = W / 2 - largura / 2, Oy = centroY - alt / 2;
  const tx = mix(cx - S * SIM.centro.x, Ox + s * 33.79, k);
  const ty = mix(cy - S * SIM.centro.y, Oy + s * 97.32, k);
  const sc = mix(S, s * 0.5148, k);

  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g transform={`translate(${tx} ${ty}) scale(${sc})`}>
          <SimboloLocal traco={pt} anel={anel} brilho={brilho * (1 - 0.5 * k)} />
        </g>
      </svg>
      <div style={{ position: "absolute", left: Ox, top: Oy }}>
        <Lockup largura={largura} traco={0} anel={0} nome={nome} corNome={COR.fg1} />
      </div>
    </>
  );
};
