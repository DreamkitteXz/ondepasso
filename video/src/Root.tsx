import React from "react";
import { Folder } from "remotion";
import { OndePassoVideo } from "./compositions/OndePassoVideo";
import { OndePassoVertical } from "./compositions/OndePassoVertical";
import { OndePassoTikTok01 } from "./tiktok/OndePassoTikTok01";

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="onde-passo">
      <OndePassoVideo />
      <OndePassoVertical />
    </Folder>
    <Folder name="tiktok">
      <OndePassoTikTok01 />
    </Folder>
  </>
);
