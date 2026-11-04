// Cursor estilizado (ponto de toque) que percorre posições-chave e "clica" com uma onda.
import React from "react";
import { interpolate } from "remotion";
import { COR, EASE } from "../lib/tema";
import { prog } from "../lib/anim";

export type Passo = { t: number; x: number; y: number; clique?: boolean };

export const CursorAnimation: React.FC<{ t: number; passos: Passo[]; aparece: number; some: number; tamanho?: number }> = ({ t, passos, aparece, some, tamanho = 46 }) => {
  if (t < aparece - 0.1 || t > some + 0.4 || passos.length === 0) return null;
  // Posição: vai de um passo ao próximo com curva de câmera (chega no ponto um pouco antes do clique).
  let x = passos[0].x, y = passos[0].y;
  for (let i = 1; i < passos.length; i++) {
    const a = passos[i - 1], b = passos[i];
    const k = prog(t, a.t, b.t - 0.12, EASE.camera);
    if (t >= a.t) { x = a.x + (b.x - a.x) * k; y = a.y + (b.y - a.y) * k; }
  }
  const vis = Math.min(prog(t, aparece, aparece + 0.25), 1 - prog(t, some, some + 0.3));
  const cliques = passos.filter((p) => p.clique);
  let aperto = 0, onda = 0, ondaP = 1;
  for (const c of cliques) {
    const d = t - c.t;
    if (d > -0.12 && d < 0.18) aperto = Math.max(aperto, 1 - Math.abs(d - 0.02) / 0.14);
    if (d >= 0 && d < 0.6) { onda = 1; ondaP = d / 0.6; }
  }
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, opacity: vis, pointerEvents: "none", zIndex: 50 }}>
      {onda > 0 && (
        <div
          style={{
            position: "absolute", left: -tamanho, top: -tamanho, width: tamanho * 2, height: tamanho * 2, borderRadius: "50%",
            border: `3px solid ${COR.fg1}`, opacity: interpolate(ondaP, [0, 1], [0.8, 0]), scale: String(interpolate(ondaP, [0, 1], [0.35, 1.25])),
          }}
        />
      )}
      <div
        style={{
          position: "absolute", left: -tamanho / 2, top: -tamanho / 2, width: tamanho, height: tamanho, borderRadius: "50%",
          background: "rgba(250,250,249,.28)", border: `3px solid ${COR.fg1}`, boxShadow: "0 8px 24px rgba(0,0,0,.45)",
          backdropFilter: "blur(2px)", scale: String(1 - aperto * 0.22),
        }}
      />
    </div>
  );
};
