// Cena 7 — Encerramento: a logo se desenha de novo, a frase de assinatura e o endereço do site.
import React from "react";
import { AbsoluteFill } from "remotion";
import { M, DURACAO } from "../timeline";
import { COR, SANS, SERIF } from "../lib/tema";
import { prog, useT } from "../lib/anim";
import { useLayout } from "../lib/layout";
import { LogoReveal } from "../components/LogoReveal";
import { LOCKUP_RAZAO } from "../components/BrandLogo";
import { AnimatedText } from "../components/AnimatedText";

export const OutroScene: React.FC = () => {
  const t = useT();
  const { H, v } = useLayout();
  const largura = v(980, 820);
  const centroY = H / 2 - v(120, 200);
  const base = centroY + largura / LOCKUP_RAZAO / 2;
  const url = prog(t, M.descubra + 1.25, M.descubra + 1.75);
  const nota = prog(t, M.descubra + 1.9, M.descubra + 2.4);
  // Respira bem de leve enquanto o CTA fica na tela.
  const respira = 1 + 0.006 * Math.sin((t - M.descubra) * 1.6) * prog(t, M.descubra + 1, M.descubra + 2);
  const fimSuave = 1 - prog(t, DURACAO - 0.5, DURACAO);
  return (
    <AbsoluteFill style={{ opacity: fimSuave, scale: String(respira) }}>
      <LogoReveal t={t} traco={[M.ondePassoFinal - 0.15, M.ondePassoFinal + 0.45]} anelEm={M.ondePassoFinal + 0.4} lockupEm={M.ondePassoFinal + 0.55} largura={largura} centroY={centroY} brilho={0.6} />
      <div style={{ position: "absolute", left: 80, right: 80, top: base + v(70, 80), textAlign: "center" }}>
        <AnimatedText texto="Descubra onde a sua nota passa." t={t} inicio={M.descubra - 0.05} passo={0.07}
          style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(72, 74), lineHeight: 1.1, color: COR.fg1 }} />
        <div style={{ marginTop: v(54, 70), display: "flex", flexDirection: v("row", "column") as "row" | "column", gap: v(26, 26), justifyContent: "center", alignItems: "center", opacity: url, translate: `0px ${(1 - url) * 16}px` }}>
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: v(58, 60), color: COR.verde, letterSpacing: "-.01em" }}>ondepasso.com.br</span>
          <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: v(30, 34), color: COR.fg2, border: `2px solid ${COR.linha2}`, borderRadius: 999, padding: "10px 24px" }}>Grátis e sem cadastro</span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: v(24, 26), color: COR.fg4, marginTop: v(40, 60), opacity: nota }}>
          Dados públicos do MEC · não é um site oficial do Sisu
        </div>
      </div>
    </AbsoluteFill>
  );
};
