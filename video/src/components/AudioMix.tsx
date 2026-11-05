// Mixagem: narração (ElevenLabs), trilha (abaixa sozinha quando há voz) e efeitos.
// `Mixagem` é genérica (usada pelo vídeo institucional e pelos TikToks); `AudioMix` é a do institucional.
import React from "react";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { DURACAO, FALA, NARRACAO_INICIO, SFX } from "../timeline";

export type Volumes = { narracao: number; trilha: number; trilhaSobVoz: number; sfx: number };
const VOL: Volumes = { narracao: 1.0, trilha: 0.55, trilhaSobVoz: 0.17, sfx: 1.0 };

/** Volume da trilha num instante: abaixa sob a voz, com rampas de 0,25 s. */
function volumeTrilha(s: number, comVoz: boolean, fala: [number, number][], vol: Volumes) {
  if (!comVoz) return vol.trilha;
  let duck = 0;
  for (const [a, b] of fala) {
    const ent = Math.min(1, Math.max(0, (s - (a - 0.25)) / 0.25));
    const sai = Math.min(1, Math.max(0, ((b + 0.3) - s) / 0.3));
    duck = Math.max(duck, Math.min(ent, sai));
  }
  return vol.trilha + (vol.trilhaSobVoz - vol.trilha) * duck;
}

type MixProps = {
  narracao: boolean;
  trilha: boolean;
  arqNarracao: string;
  arqTrilha: string;
  inicioNarracao: number;
  duracao: number;
  fala: [number, number][];
  sfx: { arq: string; t: number; vol: number }[];
  vol?: Volumes;
};

export const Mixagem: React.FC<MixProps> = ({ narracao, trilha, arqNarracao, arqTrilha, inicioNarracao, duracao, fala, sfx, vol = VOL }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {trilha && <Audio src={staticFile(arqTrilha)} volume={(f) => volumeTrilha(f / fps, narracao, fala, vol)} />}
      {narracao && (
        <Sequence name="Narração" from={Math.round(inicioNarracao * fps)} durationInFrames={Math.round((duracao - inicioNarracao) * fps)} layout="none">
          <Audio src={staticFile(arqNarracao)} volume={vol.narracao} />
        </Sequence>
      )}
      {sfx.map((s, i) => (
        <Sequence key={i} name={`sfx ${s.arq}`} from={Math.max(0, Math.round(s.t * fps))} durationInFrames={Math.round(4 * fps)} layout="none">
          <Audio src={staticFile(`audio/sfx/${s.arq}.wav`)} volume={s.vol * vol.sfx} />
        </Sequence>
      ))}
    </>
  );
};

export const AudioMix: React.FC<{ narracao: boolean; trilha: boolean }> = ({ narracao, trilha }) => (
  <Mixagem narracao={narracao} trilha={trilha} arqNarracao="audio/narracao.mp3" arqTrilha="audio/trilha.wav"
    inicioNarracao={NARRACAO_INICIO} duracao={DURACAO} fala={FALA} sfx={SFX} />
);
