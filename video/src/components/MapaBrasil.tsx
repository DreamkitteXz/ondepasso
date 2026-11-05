// Mapa do Brasil com os pontos reais (mesmo geo-br.json e mesma projeção do site).
// Câmera: aproxima de um estado e inclina a "maquete" como a home do site (INCLINACAO = 28°).
import React from "react";
import dados from "../data/dados.json";
import { COR, type Status } from "../lib/tema";
import { Marca } from "./ui";

export type PontoMapa = (typeof dados.pontos)[number];
type Caixa = [number, number, number, number];

const BRASIL: Caixa = [0, 0, dados.geo.w, dados.geo.h];

/** Caixa de um estado com folga, no mesmo formato (largura/altura) do mapa. */
export function caixaUf(uf: string, razao: number, folga = 0.12): Caixa {
  const b = dados.geo.ufs.find((u) => u.uf === uf)!.box as Caixa;
  let w = b[2] * (1 + folga * 2), h = b[3] * (1 + folga * 2);
  if (w / h > razao) h = w / razao; else w = h * razao;
  return [b[0] + b[2] / 2 - w / 2, b[1] + b[3] / 2 - h / 2, w, h];
}

type Props = {
  largura: number;
  altura: number;
  /** 0 = Brasil inteiro, 1 = estado `uf` aproximado e inclinado. */
  zoom: number;
  uf?: string;
  /** Aparição (0→1) de cada ponto. */
  aparece: (p: PontoMapa, i: number) => number;
  /** Cor do status (0 = neutro, 1 = cor da situação). */
  colore: (p: PontoMapa, i: number) => number;
  /** Ponto escolhido e quanto o pino já subiu (0→1). */
  escolhido?: { r: string; pino: number };
  /** Desenho dos contornos (0→1). */
  contorno?: number;
  inclinacao?: number;
  /** Folga em volta do estado aproximado (fração do tamanho dele). */
  folga?: number;
  /** Diâmetro do ponto na tela (px). */
  tamPonto?: number;
};

export const MapaBrasil: React.FC<Props> = ({ largura, altura, zoom, uf, aparece, colore, escolhido, contorno = 1, inclinacao = 28, folga = 0.12, tamPonto = 11 }) => {
  const alvo = uf ? caixaUf(uf, largura / altura, folga) : BRASIL;
  const base: Caixa = (() => {
    const razao = largura / altura; let [x, y, w, h] = BRASIL;
    if (w / h > razao) { const nh = w / razao; y -= (nh - h) / 2; h = nh; } else { const nw = h * razao; x -= (nw - w) / 2; w = nw; }
    return [x, y, w, h];
  })();
  const vb = base.map((v, i) => v + (alvo[i] - v) * zoom) as Caixa;
  const u = vb[2] / largura; // unidades do mapa por px
  const tam = tamPonto * u;
  const grossura = 9 * u * zoom;
  const ufAtual = uf ? dados.geo.ufs.find((g) => g.uf === uf) : null;
  return (
    <div style={{ width: largura, height: altura, perspective: 2200, perspectiveOrigin: "50% 20%" }}>
      <svg
        width={largura}
        height={altura}
        viewBox={vb.join(" ")}
        style={{ overflow: "visible", transform: `rotateX(${inclinacao * zoom}deg)`, transformOrigin: "50% 60%" }}
      >
        <defs>
          <filter id="sombra-placa" x="-30%" y="-30%" width="160%" height="180%"><feGaussianBlur stdDeviation={8 * u} /></filter>
        </defs>
        <g>
          {dados.geo.ufs.map((g) => {
            const atual = g.uf === uf;
            const fora = uf && !atual ? zoom : 0;
            return (
              <path
                key={g.uf}
                d={g.d}
                fill={COR.uf}
                stroke={COR.ufLinha}
                strokeWidth={1.1 * u}
                pathLength={1}
                strokeDasharray={contorno < 1 ? `${contorno} 1` : undefined}
                fillOpacity={(0.25 + 0.75 * contorno) * (1 - 0.75 * fora)}
                strokeOpacity={1 - 0.6 * fora}
              />
            );
          })}
        </g>
        {ufAtual && zoom > 0.01 && (
          <g>
            <path d={ufAtual.d} fill="#000" opacity={0.55 * zoom} filter="url(#sombra-placa)" transform={`translate(0 ${grossura * 1.6})`} />
            {Array.from({ length: 8 }, (_, k) => (
              <path key={k} d={ufAtual.d} fill="#141311" stroke="#141311" strokeWidth={0.6 * u} transform={`translate(0 ${grossura * (1 - k / 8)})`} opacity={zoom} />
            ))}
            <path d={ufAtual.d} fill="#25231F" stroke={COR.linha2} strokeWidth={1.2 * u} opacity={zoom} />
          </g>
        )}
        <g>
          {dados.pontos.map((p, i) => {
            const a = aparece(p, i);
            if (a <= 0.001) return null;
            const c = colore(p, i);
            const sel = escolhido?.r === p.r;
            const foraUf = uf && p.u !== uf ? zoom : 0;
            const op = a * (1 - 0.85 * foraUf);
            return (
              <g key={p.r} transform={`translate(${p.x} ${p.y})`} opacity={op}>
                <g style={{ scale: String(0.4 + 0.6 * a) }}>
                  {c < 1 && <g opacity={1 - c}><Marca s={null} tam={tam * 0.8} /></g>}
                  {c > 0 && !(sel && (escolhido?.pino ?? 0) > 0.02) && (
                    <g opacity={c} style={{ scale: String(0.6 + 0.4 * c + Math.sin(Math.PI * c) * 0.45) }}>
                      <Marca s={p.s as Status} tam={tam} />
                    </g>
                  )}
                </g>
              </g>
            );
          })}
        </g>
        {escolhido && escolhido.pino > 0.02 && (() => {
          const p = dados.pontos.find((x) => x.r === escolhido.r)!;
          const H = 34 * u * escolhido.pino;
          const k = escolhido.pino;
          return (
            <g transform={`translate(${p.x} ${p.y})`}>
              <ellipse rx={16 * u * k} ry={16 * u * k * 0.88} fill="none" stroke={COR.verde} strokeWidth={1.4 * u} opacity={1 - k} />
              <ellipse rx={6 * u} ry={6 * u * 0.88} fill="#000" opacity={0.5} />
              <line x1={0} y1={0} x2={0} y2={-H} stroke={COR.fg2} strokeWidth={2 * u} strokeLinecap="round" />
              <g transform={`translate(0 ${-H})`}><Marca s={p.s as Status} tam={18 * u} /></g>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

/** Posição na tela (px, relativa ao canto do mapa) de um ponto, sem inclinação. Serve para o cursor. */
export function posicaoNaTela(p: { x: number; y: number }, largura: number, altura: number, zoom: number, uf?: string, folga = 0.12) {
  const alvo = uf ? caixaUf(uf, largura / altura, folga) : BRASIL;
  const razao = largura / altura; let [x, y, w, h] = BRASIL;
  if (w / h > razao) { const nh = w / razao; y -= (nh - h) / 2; h = nh; } else { const nw = h * razao; x -= (nw - w) / 2; w = nw; }
  const base = [x, y, w, h];
  const vb = base.map((v, i) => v + (alvo[i] - v) * zoom);
  const sx = ((p.x - vb[0]) / vb[2]) * largura, sy = ((p.y - vb[1]) / vb[3]) * altura;
  // Mesma inclinação (rotateX) e perspectiva do componente.
  const th = ((inclinacao * zoom) * Math.PI) / 180, d = 2200;
  const oy = altura * 0.6, dy = sy - oy;
  const y3 = oy + dy * Math.cos(th), z3 = dy * Math.sin(th);
  const px = largura / 2, py = altura * 0.2, k = d / (d - z3);
  return { x: px + (sx - px) * k, y: py + (y3 - py) * k };
}
const inclinacao = 28;
