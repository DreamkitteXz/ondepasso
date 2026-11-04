// Texto que entra palavra por palavra (sobe, ganha nitidez e opacidade).
// Use *asteriscos* para destacar trechos em verde: "o seu *próximo passo*".
import React from "react";
import { COR, EASE } from "../lib/tema";
import { prog } from "../lib/anim";

type Props = {
  texto: string;
  t: number;
  inicio: number;
  /** Intervalo entre palavras (s). */
  passo?: number;
  duracao?: number;
  saida?: number; // instante em que o texto sai (opcional)
  corDestaque?: string;
  style?: React.CSSProperties;
};

export const AnimatedText: React.FC<Props> = ({ texto, t, inicio, passo = 0.07, duracao = 0.55, saida, corDestaque = COR.verde, style }) => {
  let destaque = false;
  const palavras = texto.split(" ").map((bruta) => {
    const abre = bruta.startsWith("*");
    if (abre) destaque = true;
    const p = { txt: bruta.replace(/\*/g, ""), destaque };
    if (bruta.endsWith("*")) destaque = false;
    return p;
  });
  const fora = saida != null ? prog(t, saida, saida + 0.35, EASE.sai) : 0;
  return (
    <div style={{ ...style, opacity: 1 - fora, translate: `0px ${-fora * 18}px` }}>
      {palavras.map((p, i) => {
        const k = prog(t, inicio + i * passo, inicio + i * passo + duracao);
        return (
          <React.Fragment key={i}>
            <span
              style={{
                display: "inline-block",
                opacity: k,
                translate: `0px ${(1 - k) * 0.42}em`,
                filter: `blur(${(1 - k) * 8}px)`,
                color: p.destaque ? corDestaque : undefined,
              }}
            >
              {p.txt}
            </span>
            {i < palavras.length - 1 ? " " : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};
