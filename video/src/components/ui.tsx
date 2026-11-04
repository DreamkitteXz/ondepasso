// Versões para vídeo dos componentes do site (mesmos tokens, medidas e textos de web/app/globals.css).
// Medidas em px do site; o tamanho na tela vem do `zoom` do contêiner (<Escala>).
import React from "react";
import { COR, COR_STATUS, ROTULO, SANS, SERIF, nota, type Status } from "../lib/tema";

export const Escala: React.FC<{ zoom: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ zoom, style, children }) => (
  <div style={{ zoom, fontFamily: SANS, color: COR.fg1, ...style }}>{children}</div>
);

export const Cartao: React.FC<{ style?: React.CSSProperties; children: React.ReactNode; destaque?: number }> = ({ style, children, destaque = 0 }) => (
  <div
    style={{
      background: COR.panel,
      border: `1px solid ${COR.linha1}`,
      borderRadius: 14,
      padding: 16,
      boxShadow: `0 30px 80px rgba(0,0,0,.45), 0 0 0 ${destaque * 2}px rgba(61,214,140,${0.5 * destaque})`,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Rotulo: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".06em", textTransform: "uppercase", color: COR.fg3, ...style }}>{children}</div>
);

export const Chip: React.FC<{ texto: string; ativo?: number; style?: React.CSSProperties }> = ({ texto, ativo = 0, style }) => (
  <div
    style={{
      display: "inline-flex", alignItems: "center", padding: "7px 12px", borderRadius: 999, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
      border: `1px solid ${ativo > 0.5 ? COR.fg1 : COR.linha2}`,
      background: `rgba(250,250,249,${ativo})`,
      color: ativo > 0.5 ? COR.bg : COR.fg3,
      ...style,
    }}
  >
    {texto}
  </div>
);

export const Botao: React.FC<{ texto: string; pressionado?: number; style?: React.CSSProperties }> = ({ texto, pressionado = 0, style }) => (
  <div
    style={{
      display: "inline-flex", justifyContent: "center", alignItems: "center", height: 44, padding: "0 18px", borderRadius: 10,
      background: COR.fg1, color: COR.bg, fontWeight: 600, fontSize: 14, whiteSpace: "nowrap",
      scale: String(1 - pressionado * 0.05), ...style,
    }}
  >
    {texto}
  </div>
);

/** Campo de texto com cursor piscando. */
export const Campo: React.FC<{ valor: string; placeholder: string; foco?: boolean; t: number; style?: React.CSSProperties }> = ({ valor, placeholder, foco, t, style }) => (
  <div
    style={{
      flex: 1, height: 44, padding: "0 12px", display: "flex", alignItems: "center", background: COR.bg, borderRadius: 10,
      border: `1px solid ${foco ? COR.fg3 : COR.linha2}`, fontSize: 16, fontVariantNumeric: "tabular-nums", minWidth: 0, ...style,
    }}
  >
    <span style={{ color: valor ? COR.fg1 : COR.fg4 }}>{valor || (foco ? "" : placeholder)}</span>
    {foco && <span style={{ width: 1.5, height: 20, background: COR.fg1, marginLeft: 1, opacity: Math.floor(t * 2.2) % 2 ? 0 : 1 }} />}
  </div>
);

/** "Sua média 720,00 editar" */
export const Pilula: React.FC<{ valor: number; style?: React.CSSProperties }> = ({ valor, style }) => (
  <div
    style={{
      display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: COR.panel2,
      border: `1px solid ${COR.linha2}`, fontSize: 12, color: COR.fg3, whiteSpace: "nowrap", ...style,
    }}
  >
    Sua média <b style={{ color: COR.fg1, fontWeight: 600, fontSize: 13 }}>{nota(valor)}</b> editar
  </div>
);

export const SeloStatus: React.FC<{ s: Status; style?: React.CSSProperties }> = ({ s, style }) => (
  <span style={{ flex: "none", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: `1px solid ${COR_STATUS[s]}`, color: COR_STATUS[s], whiteSpace: "nowrap", ...style }}>
    {ROTULO[s]}
  </span>
);

/** Ponto do mapa, como o componente "Ponto do mapa" do Figma: supera (cheio), por pouco (anel), abaixo (cheio com ×). */
export const Marca: React.FC<{ s: Status | null; tam: number; cor?: string }> = ({ s, tam }) => {
  const r = tam / 2;
  if (s === "pouco") { const sw = tam * 0.21; return <circle r={r - sw / 2} fill="none" stroke={COR.ambar} strokeWidth={sw} />; }
  if (s === "abaixo") {
    const a = tam * 0.18;
    return <><circle r={r} fill={COR.vermelho} /><path d={`M${-a} ${-a}L${a} ${a}M${a} ${-a}L${-a} ${a}`} stroke={COR.bg} strokeWidth={tam * 0.14} strokeLinecap="round" /></>;
  }
  return <circle r={r} fill={s === "supera" ? COR.verde : COR.fg2} />;
};

export const ItemLegenda: React.FC<{ s: Status; texto: string; ativo?: number }> = ({ s, texto, ativo = 1 }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: 0.35 + 0.65 * ativo, color: ativo > 0.5 ? COR.fg2 : COR.fg3 }}>
    <svg width={11} height={11} viewBox="-6 -6 12 12"><Marca s={s} tam={10} /></svg>
    {texto}
  </span>
);

export const Titulo: React.FC<{ children: React.ReactNode; tamanho?: number; style?: React.CSSProperties }> = ({ children, tamanho = 22, style }) => (
  <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: tamanho, lineHeight: 1.2, ...style }}>{children}</div>
);
