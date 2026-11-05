// Legenda animada estilo TikTok: um bloco curto por vez, a palavra falada acende.
// Fica na faixa central-baixa (y ≈ 1240–1420), longe da descrição e dos botões laterais.
import React from "react";
import { COR, SANS } from "../../lib/tema";
import { prog, useT } from "../../lib/anim";
import { BLOCOS, PALAVRAS } from "../timeline";

/** Palavras que recebem cor própria quando faladas. */
const COR_PALAVRA: Record<string, string> = { "verde:": COR.verde, "amarelo:": COR.ambar, "vermelho:": COR.vermelho, "salva": COR.verde };

export const AnimatedCaption: React.FC<{ top?: number; some?: number }> = ({ top = 1250, some = Infinity }) => {
  const t = useT();
  // Bloco atual: do início da 1ª palavra até o início do próximo bloco (ou 0,5 s depois da última palavra).
  const idx = BLOCOS.findIndex((b, i) => {
    const ini = PALAVRAS[b[0]].a - 0.08;
    const fim = i + 1 < BLOCOS.length ? PALAVRAS[BLOCOS[i + 1][0]].a - 0.08 : PALAVRAS[b[b.length - 1]].b + 0.6;
    return t >= ini && t < Math.min(fim, PALAVRAS[b[b.length - 1]].b + 0.9);
  });
  if (idx < 0 || t > some) return null;
  const bloco = BLOCOS[idx];
  const ini = PALAVRAS[bloco[0]].a - 0.08;
  const entra = prog(t, ini, ini + 0.16);
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top, display: "flex", justifyContent: "center", zIndex: 60, pointerEvents: "none" }}>
      <div style={{ textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 70, lineHeight: 1.12, letterSpacing: "-.01em", scale: String(0.9 + 0.1 * entra), opacity: entra }}>
        {bloco.map((i, k) => {
          const p = PALAVRAS[i];
          const falada = t >= p.a - 0.04;
          const ativa = t >= p.a - 0.04 && t < p.b + 0.05;
          const cor = COR_PALAVRA[p.w.toLowerCase()] ?? (ativa ? COR.verde : COR.fg1);
          return (
            <React.Fragment key={i}>
              <span style={{
                display: "inline-block", color: cor, opacity: falada ? 1 : 0.45,
                textShadow: "0 4px 0 rgba(0,0,0,.55), 0 0 24px rgba(0,0,0,.65)", WebkitTextStroke: "2px rgba(15,14,13,.9)", paintOrder: "stroke fill",
                scale: String(ativa ? 1.06 : 1), translate: `0px ${ativa ? -3 : 0}px`,
              }}>{p.w}</span>
              {k < bloco.length - 1 ? " " : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
