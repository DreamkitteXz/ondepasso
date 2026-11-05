// Cena 3 — Revelação (~8 → 9,5 s): os pontos viram o caminho, a estação surge em "Onde Passo",
// e a logo sobe para o topo, abrindo espaço para a interface.
import React from "react";
import { AbsoluteFill } from "remotion";
import { M } from "../timeline";
import { EASE } from "../../lib/tema";
import { mix, prog, useT } from "../../lib/anim";
import { LogoReveal } from "../../components/LogoReveal";
import { LOCKUP_RAZAO, Lockup } from "../../components/BrandLogo";

/** Logo pequena no topo durante a demonstração (fora da faixa de abas do TikTok, no canto esquerdo). */
export const CABECALHO = { x: 80, y: 130, largura: 270 };
const LARGURA = 820, CENTRO_Y = 760;

export const BrandRevealScene: React.FC = () => {
  const t = useT();
  const lockupEm = M.noOndePasso + 0.33;
  const voa = prog(t, M.coloca - 0.05, M.coloca + 0.4, EASE.camera);
  return (
    <AbsoluteFill>
      {voa <= 0 ? (
        <LogoReveal t={t} traco={[M.noOndePasso - 0.2, M.noOndePasso + 0.22]} anelEm={M.noOndePasso + 0.22} lockupEm={lockupEm} largura={LARGURA} centroY={CENTRO_Y} brilho={0.6} movimento={0.45} nomeJanela={[0.38, 0.72]} />
      ) : (
        <div style={{ position: "absolute", left: mix(540 - LARGURA / 2, CABECALHO.x, voa), top: mix(CENTRO_Y - LARGURA / LOCKUP_RAZAO / 2, CABECALHO.y, voa) }}>
          <Lockup largura={mix(LARGURA, CABECALHO.largura, voa)} />
        </div>
      )}
    </AbsoluteFill>
  );
};
