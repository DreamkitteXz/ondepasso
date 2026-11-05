// Cena 5 — Resultados (~12 → 22 s): o mapa real de Direito (Sisu 2026) aparece e ganha cor no ritmo da voz.
// Em cada cor, um cartão mostra quantas opções estão naquela situação e um exemplo real.
import React from "react";
import { AbsoluteFill } from "remotion";
import dados from "../../data/dados.json";
import { M } from "../timeline";
import { COR, COR_STATUS, EASE, SANS, SERIF, nota, type Status } from "../../lib/tema";
import { mola, prog, useT } from "../../lib/anim";
import { AnimatedCounter } from "../../components/AnimatedCounter";
import { MapaBrasil, type PontoMapa } from "../../components/MapaBrasil";
import { Marca } from "../../components/ui";

const QUANDO: Record<string, number> = { supera: M.verde, igual: M.amarelo, pouco: M.amarelo, abaixo: M.vermelho };
const ordemY = new Map([...dados.pontos].sort((a, b) => a.y - b.y).map((p, i) => [p.r, i / dados.pontos.length]));
const ordemX = new Map([...dados.pontos].sort((a, b) => a.x - b.x).map((p, i) => [p.r, i / dados.pontos.length]));

// Exemplo real de cada situação (Direito na Paraíba, nota de exemplo 720).
const exemplo = (s: Status) => (s === "supera" ? dados.doEstado.find((p) => p.r === dados.oferta.r)! : dados.doEstado.find((p) => p.s === s)!);
const SITUACOES: { s: Status; em: number; total: number; rotulo: string }[] = [
  { s: "supera", em: M.verde, total: dados.conta.supera, rotulo: "superam o corte" },
  { s: "pouco", em: M.amarelo, total: dados.conta.pouco, rotulo: "estão por pouco" },
  { s: "abaixo", em: M.vermelho, total: dados.conta.abaixo, rotulo: "ainda abaixo do corte" },
];

const MW = 1060, MH = 720, MX = 10, MY = 320;

export const ResultsScene: React.FC = () => {
  const t = useT();
  const fps = 30;
  const entra = prog(t, M.explora - 0.05, M.explora + 0.6, EASE.entra);
  const sai = prog(t, M.vaiFazer - 0.4, M.vaiFazer + 0.1, EASE.sai);
  const contorno = prog(t, M.explora, M.explora + 0.8, EASE.traco);
  const aparece = (p: PontoMapa) => { const a = M.explora + 0.4 + (ordemY.get(p.r) ?? 0) * 0.9; return prog(t, a, a + 0.3); };
  const colore = (p: PontoMapa) => { const a = QUANDO[p.s] + 0.05 + (ordemX.get(p.r) ?? 0) * 0.6; return prog(t, a, a + 0.3); };
  const atual = [...SITUACOES].reverse().find((x) => t >= x.em - 0.05);
  // Leve aproximação do mapa enquanto as cores entram (parallax com o título).
  const empurra = prog(t, M.verde - 0.3, M.vaiFazer, EASE.camera);

  return (
    <AbsoluteFill style={{ opacity: 1 - sai, scale: String(1 - 0.05 * sai) }}>
      {/* Título (web: .titulo-mapa) */}
      <div style={{ position: "absolute", left: 80, right: 80, top: 236, textAlign: "center", opacity: entra, translate: `0px ${(1 - entra) * 30 - empurra * 10}px` }}>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 64, lineHeight: 1.1 }}>
          Direito: <AnimatedCounter valor={dados.curso.comCorte} t={t} de={M.explora} ate={M.explora + 0.7} decimais={false} /> opções
        </div>
        <div style={{ fontFamily: SANS, fontSize: 28, color: COR.fg3, marginTop: 8 }}>cortes do Sisu {dados.ano} · nota de exemplo {nota(dados.nota)}</div>
      </div>

      {/* Mapa real */}
      <div style={{ position: "absolute", left: MX, top: MY + 40, opacity: entra, scale: String(0.94 + 0.06 * entra + 0.04 * empurra), translate: `0px ${(1 - entra) * 60}px` }}>
        <MapaBrasil largura={MW} altura={MH} zoom={0} contorno={contorno} aparece={aparece} colore={colore} tamPonto={17} />
      </div>

      {/* Cartão da situação atual */}
      {SITUACOES.map((x) => {
        const k = mola(t, x.em, fps, { damping: 17, stiffness: 150 });
        const fora = atual && atual.s !== x.s ? prog(t, SITUACOES[SITUACOES.indexOf(x) + 1]?.em ?? 99, (SITUACOES[SITUACOES.indexOf(x) + 1]?.em ?? 99) + 0.18, EASE.sai) : 0;
        if (k <= 0.001 || fora >= 1) return null;
        const ex = exemplo(x.s);
        return (
          <div key={x.s} style={{
            position: "absolute", left: 80, right: 80, top: 1000, height: 200, display: "flex", alignItems: "center", gap: 26,
            background: COR.panel, border: `2px solid ${COR_STATUS[x.s]}`, borderRadius: 28, padding: "0 30px", fontFamily: SANS,
            boxShadow: `0 30px 80px rgba(0,0,0,.55), 0 0 60px ${COR_STATUS[x.s]}22`,
            opacity: Math.min(1, k) * (1 - fora), translate: `${-fora * 320}px ${(1 - k) * 80}px`, scale: String(0.92 + 0.08 * Math.min(1, k)),
          }}>
            <svg width={64} height={64} viewBox="-32 -32 64 64" style={{ flex: "none" }}><Marca s={x.s} tam={56} /></svg>
            <div style={{ flex: "none", fontSize: 104, fontWeight: 700, color: COR_STATUS[x.s], letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums", minWidth: 120 }}>
              <AnimatedCounter valor={x.total} t={t} de={x.em} ate={x.em + 0.6} decimais={false} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.1 }}>{x.rotulo}</div>
              <div style={{ fontSize: 25, color: COR.fg3, marginTop: 8, whiteSpace: "nowrap" }}>ex.: {ex.i} · {ex.c}/PB · corte {nota(ex.corte)}</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
