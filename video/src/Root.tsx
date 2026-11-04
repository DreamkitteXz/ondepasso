import React from "react";
import { Folder } from "remotion";
import { OndePassoVideo } from "./compositions/OndePassoVideo";
import { OndePassoVertical } from "./compositions/OndePassoVertical";

export const RemotionRoot: React.FC = () => (
  <Folder name="onde-passo">
    <OndePassoVideo />
    <OndePassoVertical />
  </Folder>
);
