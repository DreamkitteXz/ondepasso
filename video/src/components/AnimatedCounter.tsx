// Número que conta até o valor final (formato do site: 720,00) e assenta exatamente no instante combinado.
import React from "react";
import { Easing, interpolate } from "remotion";
import { nota } from "../lib/tema";

type Props = {
  valor: number;
  t: number;
  de: number; // início da contagem (s)
  ate: number; // quando o número assenta (s)
  inicial?: number;
  decimais?: boolean;
  style?: React.CSSProperties;
};

export const AnimatedCounter: React.FC<Props> = ({ valor, t, de, ate, inicial = 0, decimais = true, style }) => {
  const p = interpolate(t, [de, ate], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1) });
  const v = inicial + (valor - inicial) * p;
  // Enquanto conta, os centavos giram rápido (sensação de "rolando"); ao assentar, ficam exatos.
  const giro = p < 1 ? Math.floor(t * 47) % 100 : null;
  const txt = decimais
    ? giro != null ? `${Math.floor(v).toLocaleString("pt-BR")},${String(giro).padStart(2, "0")}` : nota(valor)
    : Math.round(v).toLocaleString("pt-BR");
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{txt}</span>;
};
