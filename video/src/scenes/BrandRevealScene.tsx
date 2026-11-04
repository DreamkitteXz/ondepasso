// Cena 2 — Revelação: os pontos viram caminho, o caminho chega na estação. "Onde Passo".
import React from "react";
import { AbsoluteFill } from "remotion";
import { M } from "../timeline";
import { COR, EASE, SANS } from "../lib/tema";
import { mix, prog, useT } from "../lib/anim";
import { useLayout } from "../lib/layout";
import { LogoReveal } from "../components/LogoReveal";
import { LOCKUP_RAZAO, Lockup } from "../components/BrandLogo";

/** Onde a logo pequena fica nas cenas do produto (canto superior esquerdo). */
export function posCabecalho(vertical: boolean) {
  return vertical ? { x: 80, y: 120, largura: 250 } : { x: 120, y: 64, largura: 230 };
}

export const BrandRevealScene: React.FC = () => {
  const t = useT();
  const { W, H, vertical, v } = useLayout();
  const largura = v(1000, 820);
  const centroY = H / 2 - v(40, 60);
  const lockupEm = M.ondePasso + 0.2;
  // Saída: a logo encolhe e vai para o canto, onde fica durante a demonstração.
  const voa = prog(t, M.digita - 0.95, M.digita - 0.35, EASE.camera);
  const cab = posCabecalho(vertical);
  const tagline = prog(t, lockupEm + 0.75, lockupEm + 1.1) * (1 - prog(t, M.digita - 1.1, M.digita - 0.85, EASE.sai));

  return (
    <AbsoluteFill>
      {voa <= 0 ? (
        <LogoReveal t={t} traco={[M.praResponder + 0.1, M.ondePasso - 0.25]} anelEm={M.ondePasso - 0.2} lockupEm={lockupEm} largura={largura} centroY={centroY} brilho={0.55} />
      ) : (
        <div
          style={{
            position: "absolute",
            left: mix(W / 2 - largura / 2, cab.x, voa),
            top: mix(centroY - largura / LOCKUP_RAZAO / 2, cab.y, voa),
          }}
        >
          <Lockup largura={mix(largura, cab.largura, voa)} />
        </div>
      )}
      <div
        style={{
          position: "absolute", left: 0, right: 0, top: centroY + largura / LOCKUP_RAZAO / 2 + v(56, 64), textAlign: "center",
          fontFamily: SANS, fontSize: v(40, 40), fontWeight: 500, color: COR.fg2, opacity: tagline, translate: `0px ${(1 - tagline) * 12}px`,
          padding: "0 80px", lineHeight: 1.3,
        }}
      >
        As notas de corte do Sisu, no mapa.
      </div>
    </AbsoluteFill>
  );
};
