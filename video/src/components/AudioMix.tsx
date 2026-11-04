// Mixagem: narração (ElevenLabs), trilha (abaixa sozinha quando há voz) e efeitos.
import React from "react";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { DURACAO, FALA, NARRACAO_INICIO, SFX } from "../timeline";

const VOL = { narracao: 1.0, trilha: 0.55, trilhaSobVoz: 0.17, sfx: 1.0 };

/** Volume da trilha num instante: abaixa sob a voz, com rampas de 0,25 s. */
function volumeTrilha(s: number, comVoz: boolean) {
  if (!comVoz) return VOL.trilha;
  let duck = 0;
  for (const [a, b] of FALA) {
    const ent = Math.min(1, Math.max(0, (s - (a - 0.25)) / 0.25));
    const sai = Math.min(1, Math.max(0, ((b + 0.3) - s) / 0.3));
    duck = Math.max(duck, Math.min(ent, sai));
  }
  return VOL.trilha + (VOL.trilhaSobVoz - VOL.trilha) * duck;
}

export const AudioMix: React.FC<{ narracao: boolean; trilha: boolean }> = ({ narracao, trilha }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {trilha && <Audio src={staticFile("audio/trilha.wav")} volume={(f) => volumeTrilha(f / fps, narracao)} />}
      {narracao && (
        <Sequence name="Narração" from={Math.round(NARRACAO_INICIO * fps)} durationInFrames={Math.round((DURACAO - NARRACAO_INICIO) * fps)} layout="none">
          <Audio src={staticFile("audio/narracao.mp3")} volume={VOL.narracao} />
        </Sequence>
      )}
      {SFX.map((s, i) => (
        <Sequence key={i} name={`sfx ${s.arq}`} from={Math.max(0, Math.round(s.t * fps))} durationInFrames={Math.round(4 * fps)} layout="none">
          <Audio src={staticFile(`audio/sfx/${s.arq}.wav`)} volume={s.vol * VOL.sfx} />
        </Sequence>
      ))}
    </>
  );
};
