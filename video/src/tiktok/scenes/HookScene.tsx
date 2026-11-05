// Cena 1 — Gancho (0 → ~5 s): a nota já está na tela no 1º quadro, rolando; título cinético "CRIEI UM SITE PARA O ENEM";
// o cursor toca na nota e três caminhos saem dela até pontos de mapa (verde, âmbar, vermelho).
import React from "react";
import { AbsoluteFill } from "remotion";
import dados from "../../data/dados.json";
import { M } from "../timeline";
import { COR, EASE, SANS } from "../../lib/tema";
import { mola, prog, useT } from "../../lib/anim";
import { AnimatedCounter } from "../../components/AnimatedCounter";
import { AnimatedCursor } from "../../components/AnimatedCursor";
import { Marca } from "../../components/ui";

export const NUM_Y = 760; // centro vertical da nota

const Palavra: React.FC<{ txt: string; em: number; t: number; cor?: string }> = ({ txt, em, t, cor = COR.fg1 }) => {
  const k = mola(t, em, 30, { damping: 13, stiffness: 210 });
  return <span style={{ display: "inline-block", color: cor, opacity: Math.min(1, k * 1.5), scale: String(0.6 + 0.4 * k), translate: `0px ${(1 - k) * 40}px` }}>{txt}</span>;
};

export const HookScene: React.FC = () => {
  const t = useT();
  const sai = prog(t, M.sabe - 0.25, M.sabe + 0.15, EASE.sai);
  const toque = M.nota + 0.15;
  const brilho = prog(t, toque, toque + 0.25) * (1 - prog(t, M.levar + 0.4, M.levar + 0.9));
  // Caminhos que saem da nota até três pontos (as três situações do mapa).
  const destinos: { x: number; y: number; s: "supera" | "pouco" | "abaixo" }[] = [
    { x: 210, y: 1090, s: "supera" }, { x: 540, y: 1150, s: "pouco" }, { x: 870, y: 1080, s: "abaixo" },
  ];
  const caminho = prog(t, M.levar - 0.25, M.levar + 0.35, EASE.traco);

  return (
    <AbsoluteFill style={{ opacity: 1 - sai }}>
      {/* Título cinético */}
      <div style={{ position: "absolute", left: 70, right: 70, top: 250, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 104, lineHeight: 1.0, letterSpacing: "-.02em" }}>
        <div><Palavra txt="CRIEI" em={-0.12} t={t} /> <Palavra txt="UM" em={M.criei + 0.2} t={t} /> <Palavra txt="SITE" em={M.criei + 0.4} t={t} /></div>
        <div style={{ marginTop: 6 }}><Palavra txt="PARA O" em={M.criei + 0.9} t={t} /> <Palavra txt="ENEM" em={M.criei + 1.1} t={t} cor={COR.verde} /></div>
      </div>

      {/* A nota: já rolando no primeiro quadro */}
      <div style={{ position: "absolute", left: 0, right: 0, top: NUM_Y, transform: "translateY(-50%)", textAlign: "center", fontFamily: SANS }}>
        <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: ".16em", color: COR.fg3 }}>SUA NOTA DO ENEM</div>
        <AnimatedCounter valor={dados.nota} inicial={512} t={t} de={0} ate={M.nota + 0.35}
          style={{ fontWeight: 600, fontSize: 250, letterSpacing: "-.045em", lineHeight: 1.05, color: COR.fg1, textShadow: `0 0 ${70 * brilho}px rgba(61,214,140,.6)` }} />
        <div style={{ fontSize: 26, color: COR.fg4, opacity: prog(t, M.nota + 0.3, M.nota + 0.6) }}>nota de exemplo</div>
      </div>

      {/* Caminhos até o mapa */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {destinos.map((d, i) => {
          const k = Math.max(0, Math.min(1, caminho * 1.3 - i * 0.15));
          const x0 = 540, y0 = NUM_Y + 185;
          const cx = (x0 + d.x) / 2, cy = y0 + 40;
          return (
            <g key={i} opacity={k > 0 ? 1 : 0}>
              <path d={`M${x0} ${y0} Q${cx} ${cy} ${d.x} ${d.y}`} fill="none" stroke={COR.fg4} strokeWidth={4} strokeDasharray="2 14" strokeLinecap="round" pathLength={1}
                style={{ strokeDasharray: `${k} 1` }} />
              <g transform={`translate(${d.x} ${d.y})`} opacity={prog(k, 0.85, 1)}><g style={{ scale: String(prog(k, 0.85, 1)) }}><Marca s={d.s} tam={44} /></g></g>
            </g>
          );
        })}
      </svg>

      <AnimatedCursor t={t} aparece={M.nota - 0.7} some={toque + 0.35} tamanho={60}
        passos={[{ t: M.nota - 0.7, x: 860, y: 1080 }, { t: toque, x: 640, y: NUM_Y + 20, clique: true }]} />
    </AbsoluteFill>
  );
};
