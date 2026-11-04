// Cena 6 — Clareza: tudo se organiza. Três opções reais da Paraíba, uma de cada situação, alinhadas,
// e a mensagem central. Sem promessa de vaga.
import React from "react";
import { AbsoluteFill } from "remotion";
import dados from "../data/dados.json";
import { M } from "../timeline";
import { COR, EASE, SERIF, type Status } from "../lib/tema";
import { mix, mola, prog, useT } from "../lib/anim";
import { useLayout } from "../lib/layout";
import { AnimatedText } from "../components/AnimatedText";
import { Escala } from "../components/ui";
import { LinhaOpcao } from "../components/ResultCard";

// Uma opção de cada situação (dados reais de Direito na Paraíba, nota de exemplo 720,00).
const TRES = (["supera", "pouco", "abaixo"] as Status[]).map((s) => {
  const lista = dados.doEstado.filter((p) => p.s === s);
  return s === "supera" ? lista.find((p) => p.r === dados.oferta.r)! : lista[0];
});

export const ClarityScene: React.FC = () => {
  const t = useT();
  const { W, H, vertical, v } = useLayout();
  const fps = 30;
  const sai = prog(t, M.ondePassoFinal - 0.55, M.ondePassoFinal - 0.05, EASE.sai);
  const Z = v(1.5, 1.95);
  const LARG = v(360, 430);
  const promessa = prog(t, M.naoEPromessa - 0.05, M.naoEPromessa + 0.4);
  const apaga = prog(t, M.clareza - 0.2, M.clareza + 0.4);

  return (
    <AbsoluteFill style={{ opacity: 1 - sai, translate: `0px ${-sai * 30}px` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: v(150, 330), textAlign: "center", fontSize: v(44, 46), fontWeight: 500, color: apaga > 0.5 ? COR.fg4 : COR.fg2, opacity: promessa, translate: `0px ${(1 - promessa) * 14}px` }}>
        Não é promessa de vaga.
      </div>

      {TRES.map((p, i) => {
        // Chegam espalhados e girados; assentam numa linha (horizontal) ou coluna (vertical).
        const k = mola(t, M.naoEPromessa + 0.1 + i * 0.12, fps, { damping: 19, stiffness: 75 });
        const largPx = LARG * Z;
        const fx = v(W / 2 + (i - 1) * (largPx + 30) - largPx / 2, (W - largPx) / 2);
        const fy = v(H / 2 - 140, 560 + i * 230);
        const ox = fx + [-260, 40, 300][i] * (vertical ? 0.6 : 1), oy = fy + [220, -260, 180][i];
        const destaque = prog(t, M.proximoPasso - 0.2 + i * 0.1, M.proximoPasso + 0.2 + i * 0.1);
        return (
          <div key={p.r} style={{
            position: "absolute", left: mix(ox, fx, k), top: mix(oy, fy, k), rotate: `${(1 - k) * [-9, 7, -5][i]}deg`,
            opacity: Math.min(1, k * 1.4), filter: `blur(${(1 - Math.min(1, k)) * 10}px)`,
          }}>
            <Escala zoom={Z}>
              <LinhaOpcao titulo={`Direito · ${p.i}`} meta={p.c} corte={p.corte} s={p.s as Status} largura={LARG} destaque={destaque} />
            </Escala>
          </div>
        );
      })}

      <div style={{ position: "absolute", left: v(160, 80), right: v(160, 80), top: v(H / 2 + 100, 1290), textAlign: "center" }}>
        <AnimatedText texto="Clareza para escolher o seu *próximo passo*." t={t} inicio={M.clareza - 0.1} passo={0.07}
          style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(96, 88), lineHeight: 1.08, color: COR.fg1 }} />
        <div style={{ fontSize: v(24, 28), color: COR.fg4, marginTop: 30, opacity: prog(t, M.proximoPasso + 0.3, M.proximoPasso + 0.8) }}>
          Direito na Paraíba · cortes do Sisu {dados.ano} (ampla) · nota de exemplo {dados.nota},00
        </div>
      </div>
    </AbsoluteFill>
  );
};
