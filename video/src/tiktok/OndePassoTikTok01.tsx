// TikTok 01 — "Criei um site para quem vai fazer o Enem". 1080 × 1920, 30 fps, ~29 s.
// Composição independente do vídeo institucional; reaproveita os componentes de src/components.
import React from "react";
import { AbsoluteFill, Composition, Sequence, staticFile, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";
import { CENAS, DURACAO, FALA, FPS, M, NARRACAO_INICIO, SFX, type NomeCena } from "./timeline";
import { InicioCena, prog, useT } from "../lib/anim";
import { EASE } from "../lib/tema";
import { Fundo } from "../components/Fundo";
import { Lockup } from "../components/BrandLogo";
import { Mixagem } from "../components/AudioMix";
import { AnimatedCaption } from "./components/AnimatedCaption";
import { HookScene } from "./scenes/HookScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { BrandRevealScene, CABECALHO } from "./scenes/BrandRevealScene";
import { DemoScene } from "./scenes/DemoScene";
import { ResultsScene } from "./scenes/ResultsScene";
import { CTAScene } from "./scenes/CTAScene";

loadFont({ family: "Faustina", url: staticFile("fonts/faustina-600.woff2"), weight: "600" });
loadFont({ family: "Geist", url: staticFile("fonts/geist-variable.woff2"), weight: "100 900" });

export type TikTokProps = { narracao: boolean; trilha: boolean; legendas: boolean };

const CENA: Record<NomeCena, { nome: string; C: React.FC }> = {
  gancho: { nome: "1 · Gancho", C: HookScene },
  problema: { nome: "2 · Problema", C: ProblemScene },
  revelacao: { nome: "3 · Revelação", C: BrandRevealScene },
  demo: { nome: "4 · Demonstração", C: DemoScene },
  resultados: { nome: "5 · Resultados", C: ResultsScene },
  cta: { nome: "6 · CTA", C: CTAScene },
};

const Cabecalho: React.FC = () => {
  const t = useT();
  const vis = prog(t, M.coloca + 0.35, M.coloca + 0.42) * (1 - prog(t, M.vaiFazer - 0.6, M.vaiFazer - 0.3, EASE.sai));
  if (vis <= 0) return null;
  return <div style={{ position: "absolute", left: CABECALHO.x, top: CABECALHO.y, opacity: vis, zIndex: 40 }}><Lockup largura={CABECALHO.largura} /></div>;
};

/** Luz verde do fundo: mais forte na revelação da marca e no CTA. */
const luz = (t: number) => 0.06 + 0.08 * Math.max(prog(t, M.noOndePasso - 0.3, M.noOndePasso + 0.4) * (1 - prog(t, M.coloca, M.coloca + 0.6)), prog(t, M.vaiFazer - 0.4, M.salva + 0.5));

export const TikTok01: React.FC<TikTokProps> = ({ narracao, trilha, legendas }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ fontFamily: "Geist, sans-serif", color: "#FAFAF9" }}>
      <Fundo forca={luz} />
      {(Object.keys(CENAS) as NomeCena[]).map((k) => {
        const { de, ate } = CENAS[k];
        const { nome, C } = CENA[k];
        return (
          <Sequence key={k} name={nome} from={Math.round(de * fps)} durationInFrames={Math.round((ate - de) * fps)}>
            <InicioCena.Provider value={Math.round(de * fps) / fps}><C /></InicioCena.Provider>
          </Sequence>
        );
      })}
      <Cabecalho />
      {legendas && <AnimatedCaption />}
      <Mixagem narracao={narracao} trilha={trilha} arqNarracao="audio/tiktok01/narracao.mp3" arqTrilha="audio/tiktok01/trilha.wav"
        inicioNarracao={NARRACAO_INICIO} duracao={DURACAO} fala={FALA} sfx={SFX}
        vol={{ narracao: 1, trilha: 0.5, trilhaSobVoz: 0.2, sfx: 1 }} />
    </AbsoluteFill>
  );
};

export const OndePassoTikTok01: React.FC = () => (
  <Composition id="OndePassoTikTok01" component={TikTok01} durationInFrames={Math.round(DURACAO * FPS)} fps={FPS} width={1080} height={1920}
    defaultProps={{ narracao: true, trilha: true, legendas: true }} />
);
