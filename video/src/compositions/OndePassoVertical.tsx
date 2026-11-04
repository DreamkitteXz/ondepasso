// Composição secundária: 1080 × 1920 (9:16). Mesmas cenas, reorganizadas para o vertical (não é um recorte).
import React from "react";
import { Composition } from "remotion";
import { DURACAO, FPS } from "../timeline";
import { Filme } from "./Filme";

export const OndePassoVertical: React.FC = () => (
  <Composition
    id="OndePasso9x16"
    component={Filme}
    durationInFrames={Math.round(DURACAO * FPS)}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{ narracao: true, trilha: true }}
  />
);
