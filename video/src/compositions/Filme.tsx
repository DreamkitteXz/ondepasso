// O filme inteiro: fundo, cabeçalho com a logo, as sete cenas na linha do tempo e o áudio.
// É o mesmo para 16:9 e 9:16 — cada cena reorganiza os elementos conforme o formato (src/lib/layout.ts).
import React from "react";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";
import { CENAS, M, type NomeCena } from "../timeline";
import { InicioCena, prog, useT } from "../lib/anim";
import { EASE } from "../lib/tema";
import { useLayout } from "../lib/layout";
import { Fundo } from "../components/Fundo";
import { Lockup } from "../components/BrandLogo";
import { AudioMix } from "../components/AudioMix";
import { IntroScene } from "../scenes/IntroScene";
import { BrandRevealScene, posCabecalho } from "../scenes/BrandRevealScene";
import { InputScene } from "../scenes/InputScene";
import { CourseScene } from "../scenes/CourseScene";
import { ResultsScene } from "../scenes/ResultsScene";
import { ClarityScene } from "../scenes/ClarityScene";
import { OutroScene } from "../scenes/OutroScene";

loadFont({ family: "Faustina", url: staticFile("fonts/faustina-600.woff2"), weight: "600" });
loadFont({ family: "Geist", url: staticFile("fonts/geist-variable.woff2"), weight: "100 900" });

export type FilmeProps = { narracao: boolean; trilha: boolean };

const CENA: Record<NomeCena, { nome: string; C: React.FC }> = {
  hook: { nome: "1 · Hook", C: IntroScene },
  marca: { nome: "2 · Revelação da marca", C: BrandRevealScene },
  notas: { nome: "3 · Entrada das notas", C: InputScene },
  curso: { nome: "4 · Escolha do curso", C: CourseScene },
  resultados: { nome: "5 · Resultados", C: ResultsScene },
  clareza: { nome: "6 · Clareza", C: ClarityScene },
  fim: { nome: "7 · Encerramento", C: OutroScene },
};

/** Logo pequena no canto durante a demonstração do produto. */
const Cabecalho: React.FC = () => {
  const t = useT();
  const { vertical } = useLayout();
  const c = posCabecalho(vertical);
  const vis = prog(t, M.digita - 0.36, M.digita - 0.3) * (1 - prog(t, M.ondePassoFinal - 0.6, M.ondePassoFinal - 0.2, EASE.sai));
  if (vis <= 0) return null;
  return <div style={{ position: "absolute", left: c.x, top: c.y, opacity: vis, zIndex: 40 }}><Lockup largura={c.largura} /></div>;
};

export const Filme: React.FC<FilmeProps> = ({ narracao, trilha }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ fontFamily: "Geist, sans-serif", color: "#FAFAF9" }}>
      <Fundo />
      {(Object.keys(CENAS) as NomeCena[]).map((k) => {
        const { de, ate } = CENAS[k];
        const { nome, C } = CENA[k];
        return (
          <Sequence key={k} name={nome} from={Math.round(de * fps)} durationInFrames={Math.round((ate - de) * fps)}>
            <InicioCena.Provider value={Math.round(de * fps) / fps}>
              <C />
            </InicioCena.Provider>
          </Sequence>
        );
      })}
      <Cabecalho />
      <AudioMix narracao={narracao} trilha={trilha} />
    </AbsoluteFill>
  );
};
