// Cena 1 — Hook: a nota do Enem chega; em volta dela, cortes reais de vários cursos giram (a dúvida).
// No fim, os cartões viram pontos e voam para o caminho do símbolo (continua na cena 2).
import React from "react";
import { AbsoluteFill } from "remotion";
import dados from "../data/dados.json";
import { M } from "../timeline";
import { COR, EASE, SANS, SERIF, nota } from "../lib/tema";
import { mix, mola, prog, useT } from "../lib/anim";
import { useLayout } from "../lib/layout";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { AnimatedText } from "../components/AnimatedText";
import { pontoNoCaminho } from "../components/BrandLogo";
import { noPalco } from "../components/LogoReveal";

const CARTOES = dados.amostra; // 15 cortes reais (Sisu 2026, ampla)

export const IntroScene: React.FC = () => {
  const t = useT();
  const { W, H, vertical, v } = useLayout();
  const fps = 30;
  const colapso = prog(t, M.praResponder - 0.35, M.praResponder + 0.3, EASE.camera);
  const someNumero = prog(t, M.praResponder - 0.45, M.praResponder + 0.05, EASE.sai);

  // Número: aparece no primeiro quadro, conta e assenta quando a voz diz "720".
  const assenta = M.n720 + 0.2;
  const pulso = mola(t, assenta, fps, { damping: 9, stiffness: 220 });
  const sobe = prog(t, M.eAgora - 0.1, M.eAgora + 0.7, EASE.camera);
  const escalaNum = mix(1, v(0.62, 0.66), sobe) * (1 + 0.04 * Math.sin(Math.PI * Math.min(pulso, 1)));
  const yNum = H / 2 + mix(0, v(-30, -40), sobe) + someNumero * -60;

  // Órbita dos cartões: aceleram conforme a dúvida cresce.
  const rx = v(780, 380), ry = v(330, 640);
  const vel = 0.18 + 0.55 * prog(t, M.ateOnde, M.praResponder, EASE.entra);
  const giro = t * vel;

  return (
    <AbsoluteFill>
      {/* Cartões em órbita (atrás e na frente do número, conforme a profundidade). */}
      {CARTOES.map((c, i) => {
        const entra = mola(t, M.eAgora - 0.15 + i * 0.13, fps, { damping: 16, stiffness: 140 });
        if (entra <= 0.001) return null;
        const ang = (i / CARTOES.length) * Math.PI * 2 + giro + 0.4;
        const z = Math.sin(ang); // -1 longe, 1 perto
        const ox = W / 2 + Math.cos(ang) * rx;
        const oy = H / 2 + 20 + z * ry;
        // Destino no colapso: um ponto do caminho do símbolo (centro da tela, como na cena 2).
        const d = noPalco(pontoNoCaminho(i / (CARTOES.length - 1)), W, H, vertical);
        const x = mix(ox, d.x, colapso), y = mix(oy, d.y, colapso);
        const prof = (z + 1) / 2;
        const esc = mix((0.72 + 0.36 * prof) * entra, 0.0, colapso);
        const pontoTam = 26;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, zIndex: Math.round(prof * 10), opacity: Math.min(1, entra) * mix(0.45 + 0.55 * prof, 1, colapso) }}>
            {/* cartão */}
            <div
              style={{
                position: "absolute", transform: "translate(-50%, -50%)", scale: String(Math.max(esc, 0)), rotate: `${Math.sin(i * 1.7) * 7 * (1 - colapso)}deg`,
                filter: `blur(${(1 - prof) * 2.2}px)`, background: COR.panel3, border: `1px solid ${COR.linha2}`, borderRadius: 16, padding: "16px 20px",
                width: 300, fontFamily: SANS, boxShadow: "0 20px 60px rgba(0,0,0,.5)", whiteSpace: "nowrap",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 600, color: COR.fg1 }}>{c.curso} · {c.ies}</div>
              <div style={{ fontSize: 17, color: COR.fg3, marginTop: 2 }}>{c.cidade}/{c.uf}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 12 }}>
                <span style={{ fontSize: 15, color: COR.fg4, letterSpacing: ".06em" }}>CORTE</span>
                <span style={{ fontSize: 30, fontWeight: 600, color: COR.fg1, fontVariantNumeric: "tabular-nums" }}>{nota(c.corte)}</span>
              </div>
            </div>
            {/* ponto em que o cartão se transforma */}
            <div style={{ position: "absolute", left: -pontoTam / 2, top: -pontoTam / 2, width: pontoTam, height: pontoTam, borderRadius: "50%", background: COR.verde, opacity: prog(colapso, 0.55, 1) * (1 - prog(t, M.praResponder + 0.35, M.praResponder + 0.75)) }} />
          </div>
        );
      })}

      {/* A nota */}
      <div style={{ position: "absolute", left: 0, right: 0, top: yNum, transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 6, opacity: 1 - someNumero, scale: String(escalaNum) }}>
        <div style={{ fontFamily: SANS, fontSize: v(30, 32), fontWeight: 500, letterSpacing: ".16em", color: COR.fg3, opacity: prog(t, 0, 0.35) }}>SUA NOTA DO ENEM</div>
        <AnimatedCounter
          valor={dados.nota}
          t={t}
          de={0}
          ate={assenta}
          style={{ fontFamily: SANS, fontWeight: 600, fontSize: v(300, 230), letterSpacing: "-.045em", lineHeight: 1.05, color: COR.fg1, textShadow: `0 0 ${60 * prog(t, assenta - 0.1, assenta + 0.3) * (1 - sobe)}px rgba(61,214,140,.45)` }}
        />
        <div style={{ fontFamily: SANS, fontSize: v(24, 26), color: COR.fg4, opacity: prog(t, assenta, assenta + 0.4) * (1 - sobe) }}>nota de exemplo</div>
      </div>

      {/* A pergunta */}
      <div style={{ position: "absolute", left: 0, right: 0, top: v(130, 230), textAlign: "center", zIndex: 12 }}>
        <AnimatedText
          texto="Até onde ela te leva?"
          t={t}
          inicio={M.ateOnde - 0.05}
          passo={0.09}
          saida={M.praResponder - 0.35}
          style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(92, 84), color: COR.fg1, textShadow: "0 6px 30px rgba(0,0,0,.8)" }}
        />
      </div>
    </AbsoluteFill>
  );
};
