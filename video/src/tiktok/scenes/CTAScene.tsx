// Cena 6 — CTA (~21,5 → 29 s): composição limpa com a logo, "SALVA PRA DEPOIS" com um marcador que se preenche,
// e o endereço do site. Tudo no meio da tela, longe da descrição e dos botões do TikTok.
import React from "react";
import { AbsoluteFill } from "remotion";
import { DURACAO, F, M } from "../timeline";
import { COR, SANS, SERIF } from "../../lib/tema";
import { mola, prog, useT } from "../../lib/anim";
import { Lockup, LOCKUP_RAZAO } from "../../components/BrandLogo";

const Marcador: React.FC<{ cheio: number; tam: number }> = ({ cheio, tam }) => (
  <svg width={tam} height={tam * 1.25} viewBox="0 0 40 50">
    <defs><clipPath id="enche"><rect x="0" y={50 - 50 * cheio} width="40" height="50" /></clipPath></defs>
    <path d="M6 4h28a2 2 0 0 1 2 2v40l-16-11L4 46V6a2 2 0 0 1 2-2z" fill="none" stroke={COR.verde} strokeWidth="4" strokeLinejoin="round" />
    <path d="M6 4h28a2 2 0 0 1 2 2v40l-16-11L4 46V6a2 2 0 0 1 2-2z" fill={COR.verde} clipPath="url(#enche)" />
  </svg>
);

export const CTAScene: React.FC = () => {
  const t = useT();
  const fps = 30;
  const logo = mola(t, M.vaiFazer - 0.35, fps, { damping: 18, stiffness: 120 });
  const pergunta = mola(t, M.vaiFazer, fps, { damping: 15, stiffness: 170 });
  const salva = mola(t, M.salva, fps, { damping: 10, stiffness: 190 });
  const cheio = prog(t, M.salva + 0.1, M.salva + 0.55);
  const url = mola(t, M.conhecer, fps, { damping: 16, stiffness: 150 });
  const extra = prog(t, F.sair, F.sair + 0.4);
  const respira = 1 + 0.008 * Math.sin((t - M.salva) * 2.2) * prog(t, M.salva + 1, M.salva + 2);
  const fim = 1 - prog(t, DURACAO - 0.25, DURACAO);
  const L = 640;
  return (
    <AbsoluteFill style={{ opacity: fim }}>
      <div style={{ position: "absolute", left: 540 - L / 2, top: 300, opacity: Math.min(1, logo), translate: `0px ${(1 - logo) * -40}px`, scale: String(0.9 + 0.1 * Math.min(1, logo)) }}>
        <Lockup largura={L} />
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 300 + L / LOCKUP_RAZAO + 70, textAlign: "center", fontFamily: SERIF, fontWeight: 600, fontSize: 84, opacity: Math.min(1, pergunta), translate: `0px ${(1 - pergunta) * 30}px` }}>
        Vai fazer o Enem?
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 690, display: "flex", justifyContent: "center", alignItems: "center", gap: 30, scale: String(Math.max(0, salva) * respira), opacity: Math.min(1, salva * 1.5) }}>
        <div style={{ translate: `0px ${-(1 - cheio) * 0 + Math.sin(Math.PI * cheio) * -16}px` }}><Marcador cheio={cheio} tam={86} /></div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 104, lineHeight: 0.95, letterSpacing: "-.02em" }}>
          SALVA<br /><span style={{ color: COR.verde }}>PRA DEPOIS</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 960, textAlign: "center", fontFamily: SANS, opacity: Math.min(1, url), translate: `0px ${(1 - url) * 24}px` }}>
        <div style={{ fontWeight: 700, fontSize: 70, color: COR.fg1, letterSpacing: "-.01em" }}>ondepasso.com.br</div>
        <div style={{ fontSize: 34, color: COR.fg3, marginTop: 14, opacity: extra }}>grátis · sem cadastro · dados públicos do MEC</div>
      </div>
    </AbsoluteFill>
  );
};
