// Composição principal: 1920 × 1080 (16:9), 30 fps.
import React from "react";
import { Composition } from "remotion";
import { DURACAO, FPS } from "../timeline";
import { Filme } from "./Filme";

export const OndePassoVideo: React.FC = () => (
  <Composition
    id="OndePasso16x9"
    component={Filme}
    durationInFrames={Math.round(DURACAO * FPS)}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={{ narracao: true, trilha: true }}
  />
);
