// Logo oficial "Rota até a vaga": um visto que vira caminho e termina numa estação (a vaga).
// O símbolo é desenhado como traço para poder ser animado (mesma geometria de web/public/logo-escuro.svg).
import React from "react";
import { COR } from "../lib/tema";
import { LOCKUP_VB, NOME_D, NOME_TRANSFORM } from "../lib/logo-dados";

// Geometria local do símbolo (unidades do canvas da logo).
export const SIM = {
  E: { x: -46.67, y: -46.67 }, // ponta do braço curto
  V: { x: 0, y: 0 }, // vértice do visto
  C: { x: 75, y: -129.9 }, // centro da estação (anel)
  traco: 38,
  anelR: 39.5,
  anelTraco: 35,
  centro: { x: 33, y: -84 }, // centro óptico do símbolo
  altura: 206,
};
const L1 = Math.hypot(SIM.E.x - SIM.V.x, SIM.E.y - SIM.V.y);
const L2 = Math.hypot(SIM.C.x - SIM.V.x, SIM.C.y - SIM.V.y) - SIM.anelR; // até a borda interna do anel
export const COMPRIMENTO = L1 + L2;

/** Ponto ao longo do caminho do símbolo (0 = ponta curta, 1 = chegada no anel), em coordenadas locais. */
export function pontoNoCaminho(p: number) {
  const d = p * COMPRIMENTO;
  if (d <= L1) {
    const k = d / L1;
    return { x: SIM.E.x + (SIM.V.x - SIM.E.x) * k, y: SIM.E.y + (SIM.V.y - SIM.E.y) * k };
  }
  const k = (d - L1) / (L2 + SIM.anelR);
  return { x: SIM.V.x + (SIM.C.x - SIM.V.x) * k, y: SIM.V.y + (SIM.C.y - SIM.V.y) * k };
}

/** Símbolo em coordenadas locais. `traco` 0→1 desenha o visto; `anel` 0→1 faz a estação surgir. */
export const SimboloLocal: React.FC<{ traco: number; anel: number; cor?: string; brilho?: number }> = ({ traco, anel, cor = COR.verde, brilho = 0 }) => (
  <g>
    {brilho > 0 && (
      <g opacity={brilho} style={{ filter: "blur(18px)" }}>
        <polyline points={`${SIM.E.x},${SIM.E.y} 0,0 ${SIM.C.x},${SIM.C.y}`} fill="none" stroke={cor} strokeWidth={SIM.traco} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${traco * (COMPRIMENTO + 2)} 1000`} opacity={traco > 0.001 ? 1 : 0} />
        <circle cx={SIM.C.x} cy={SIM.C.y} r={SIM.anelR} fill="none" stroke={cor} strokeWidth={SIM.anelTraco} opacity={Math.min(1, anel)} />
      </g>
    )}
    <polyline
      points={`${SIM.E.x},${SIM.E.y} 0,0 ${SIM.C.x},${SIM.C.y}`}
      fill="none"
      stroke={cor}
      strokeWidth={SIM.traco}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={`${traco * (COMPRIMENTO + 2)} 1000`}
      opacity={traco > 0.001 ? 1 : 0}
    />
    <circle
      cx={SIM.C.x}
      cy={SIM.C.y}
      r={SIM.anelR}
      fill="none"
      stroke={cor}
      strokeWidth={SIM.anelTraco * Math.min(1, 0.4 + anel * 0.6)}
      opacity={anel > 0.001 ? 1 : 0}
      style={{ scale: String(anel), transformOrigin: `${SIM.C.x}px ${SIM.C.y}px`, transformBox: "view-box" }}
    />
  </g>
);

/** Logo horizontal (lockup) completa, com o nome revelado da esquerda para a direita por `nome` 0→1. */
export const Lockup: React.FC<{ largura: number; traco?: number; anel?: number; nome?: number; corNome?: string; corSimbolo?: string }> = ({
  largura, traco = 1, anel = 1, nome = 1, corNome = COR.fg1, corSimbolo = COR.verde,
}) => {
  const [x, y, w, h] = LOCKUP_VB;
  const id = React.useId().replace(/:/g, "");
  return (
    <svg width={largura} height={(largura * h) / w} viewBox={`${x} ${y} ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <clipPath id={`n${id}`}>
          <rect x={150} y={y - 20} width={(w - 130) * nome} height={h + 40} />
        </clipPath>
      </defs>
      <g transform="translate(49.79 165.82) scale(0.5148)">
        <SimboloLocal traco={traco} anel={anel} cor={corSimbolo} />
      </g>
      <g clipPath={`url(#n${id})`}>
        <path fill={corNome} transform={NOME_TRANSFORM} d={NOME_D} style={{ translate: `${(1 - nome) * -14}px 0px` }} />
      </g>
    </svg>
  );
};

/** Proporção largura/altura do lockup. */
export const LOCKUP_RAZAO = LOCKUP_VB[2] / LOCKUP_VB[3];
/** Posição do símbolo dentro do lockup: local → unidades do lockup (relativas a x/y do viewBox). */
export const simboloNoLockup = (p: { x: number; y: number }) => ({ x: 49.79 - LOCKUP_VB[0] + 0.5148 * p.x, y: 165.82 - LOCKUP_VB[1] + 0.5148 * p.y });
