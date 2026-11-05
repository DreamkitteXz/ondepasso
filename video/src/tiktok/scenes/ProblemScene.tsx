// Cena 2 — O problema (~5 → 8,5 s): em volta da nota, cortes reais de vários cursos com "?", trocando de lugar.
// No fim, os cartões viram pontos e voam para o caminho do símbolo (a revelação continua daí).
import React from "react";
import { AbsoluteFill } from "remotion";
import dados from "../../data/dados.json";
import { M } from "../timeline";
import { COR, EASE, SANS, nota } from "../../lib/tema";
import { mix, mola, prog, useT } from "../../lib/anim";
import { useLayout } from "../../lib/layout";
import { pontoNoCaminho } from "../../components/BrandLogo";
import { noPalco } from "../../components/LogoReveal";
import { NUM_Y } from "./HookScene";

// 6 cortes reais (Sisu 2026, ampla): os 2 com mais inscritos de Medicina, Direito e Psicologia.
const CARTOES = [0, 1, 3, 4, 6, 7].map((i) => dados.amostra[i]);
// Posições (centro do cartão): três rodadas de embaralhamento, fileira de cima e de baixo.
const POS = [
  [[250, 330], [830, 360], [240, 1090], [840, 1070], [540, 500], [540, 1150]],
  [[830, 360], [540, 500], [540, 1150], [240, 1090], [250, 330], [840, 1070]],
  [[540, 500], [250, 330], [840, 1070], [540, 1150], [830, 360], [240, 1090]],
];
// (cada cartão troca de lugar só dentro da própria fileira, para nunca passar por cima da nota)

export const ProblemScene: React.FC = () => {
  const t = useT();
  const { W, H, vertical } = useLayout();
  const fps = 30;
  const trocas = [M.sabe + 1.1, M.chance - 0.05];
  const colapso = prog(t, M.noOndePasso - 0.4, M.noOndePasso + 0.15, EASE.camera);
  const someNum = prog(t, M.noOndePasso - 0.45, M.noOndePasso - 0.05, EASE.sai);
  const encolhe = prog(t, M.sabe - 0.1, M.sabe + 0.5, EASE.camera);

  return (
    <AbsoluteFill>
      {/* A nota continua no centro, menor */}
      <div style={{ position: "absolute", left: 0, right: 0, top: NUM_Y, transform: "translateY(-50%)", textAlign: "center", fontFamily: SANS, opacity: 1 - someNum, scale: String(mix(1, 0.62, encolhe)), zIndex: 20, textShadow: "0 6px 30px rgba(0,0,0,.85)" }}>
        <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: ".16em", color: COR.fg3 }}>SUA NOTA DO ENEM</div>
        <div style={{ fontWeight: 600, fontSize: 250, letterSpacing: "-.045em", lineHeight: 1.05 }}>{nota(dados.nota)}</div>
        <div style={{ fontSize: 96, fontWeight: 800, color: COR.ambar, marginTop: 0, opacity: prog(t, M.chance - 0.2, M.chance + 0.2) }}>Dá pra passar onde?</div>
      </div>

      {CARTOES.map((c, i) => {
        const entra = mola(t, M.sabe + 0.05 + i * 0.1, fps, { damping: 14, stiffness: 170 });
        if (entra <= 0.001) return null;
        // Posição atual: interpola entre as rodadas de embaralhamento.
        const k1 = mola(t, trocas[0], fps, { damping: 16, stiffness: 120 }), k2 = mola(t, trocas[1], fps, { damping: 16, stiffness: 120 });
        const p = (r: number) => POS[r][i];
        let x = mix(p(0)[0], p(1)[0], k1), y = mix(p(0)[1], p(1)[1], k1);
        x = mix(x, p(2)[0], k2); y = mix(y, p(2)[1], k2);
        const d = noPalco(pontoNoCaminho(i / (CARTOES.length - 1)), W, H, vertical);
        x = mix(x, d.x, colapso); y = mix(y, d.y, colapso);
        const esc = mix(entra, 0, colapso);
        const balanca = Math.sin(t * 2.4 + i) * 4 * (1 - colapso);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, zIndex: 10 }}>
            <div style={{
              position: "absolute", transform: "translate(-50%, -50%)", scale: String(Math.max(0, esc)), rotate: `${balanca}deg`,
              width: 330, background: COR.panel3, border: `1px solid ${COR.linha2}`, borderRadius: 18, padding: "18px 22px", fontFamily: SANS,
              boxShadow: "0 24px 60px rgba(0,0,0,.55)", whiteSpace: "nowrap",
            }}>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{c.curso}</div>
              <div style={{ fontSize: 20, color: COR.fg3, marginTop: 2 }}>{c.ies} · {c.cidade}/{c.uf}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
                <span style={{ fontSize: 17, color: COR.fg4, letterSpacing: ".06em" }}>CORTE</span>
                <span style={{ fontSize: 34, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{nota(c.corte)}</span>
              </div>
              {/* selo de dúvida */}
              <div style={{
                position: "absolute", right: -18, top: -18, width: 52, height: 52, borderRadius: 26, background: COR.ambar, color: COR.bg,
                fontWeight: 800, fontSize: 34, display: "flex", alignItems: "center", justifyContent: "center",
                scale: String(mola(t, M.sabe + 0.35 + i * 0.1, fps, { damping: 9, stiffness: 260 })),
              }}>?</div>
            </div>
            <div style={{ position: "absolute", left: -13, top: -13, width: 26, height: 26, borderRadius: "50%", background: COR.verde, opacity: prog(colapso, 0.55, 1) * (1 - prog(t, M.noOndePasso + 0.3, M.noOndePasso + 0.6)) }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
