// Cena 4 — Escolha do curso: busca e atalhos de curso do site; Direito é escolhido e mostra as 120 opções.
import React from "react";
import { AbsoluteFill } from "remotion";
import dados from "../data/dados.json";
import { M } from "../timeline";
import { COR, EASE, SERIF } from "../lib/tema";
import { mola, prog, useT } from "../lib/anim";
import { useLayout } from "../lib/layout";
import { AnimatedText } from "../components/AnimatedText";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { Chip, Escala } from "../components/ui";
import { CursorAnimation } from "../components/CursorAnimation";

// Atalhos da home do site, na mesma ordem; larguras em px do site (13 px, peso 500).
const CHIPS: { nome: string; w: number; x: number; y: number }[] = [
  { nome: "Medicina", w: 84, x: 0, y: 0 },
  { nome: "Direito", w: 74, x: 92, y: 0 },
  { nome: "Psicologia", w: 96, x: 174, y: 0 },
  { nome: "Enfermagem", w: 108, x: 278, y: 0 },
  { nome: "Engenharia Civil", w: 138, x: 0, y: 43 },
  { nome: "Mais cursos", w: 100, x: 146, y: 43 },
];
const LARG = 420;

export const CourseScene: React.FC = () => {
  const t = useT();
  const { W, H, v } = useLayout();
  const fps = 30;
  const Z = v(2.05, 2.0);
  const X0 = v(W - 120 - LARG * Z, (W - LARG * Z) / 2);
  const Y0 = v(H / 2 - 50 * Z, 760);
  const tela = (x: number, y: number) => ({ x: X0 + x * Z, y: Y0 + y * Z });
  const sai = prog(t, M.cadaPonto - 0.75, M.cadaPonto - 0.15, EASE.sai);
  const toque = M.direito + 0.1;
  const ativo = prog(t, toque, toque + 0.15);
  const titulo = prog(t, M.n120 - 0.15, M.n120 + 0.35);

  return (
    <AbsoluteFill style={{ opacity: 1 - sai }}>
      {/* Fundo: nomes reais de cursos subindo devagar (há 602 no site). */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: 0.045 * prog(t, M.escolhe - 0.4, M.escolhe + 0.8), maskImage: "linear-gradient(transparent, #000 25%, #000 75%, transparent)" }}>
        {[0, 1, 2, 3].map((c) => (
          <div key={c} style={{ position: "absolute", left: v(80 + c * 470, 40 + c * 270), top: -((t * (22 + c * 6)) % 600) - 200 - c * 90, fontFamily: SERIF, fontSize: v(46, 38), lineHeight: 1.5, color: COR.fg1, whiteSpace: "nowrap" }}>
            {dados.nomesCursos.slice(c * 15, c * 15 + 15).concat(dados.nomesCursos.slice(c * 15, c * 15 + 15)).map((n, i) => <div key={i}>{n}</div>)}
          </div>
        ))}
      </div>

      <div style={{ position: "absolute", left: v(120, 80), right: v(W - 120 - 700, 80), top: v(H / 2 - 120, 300) }}>
        <AnimatedText texto="Escolha o curso." t={t} inicio={M.escolhe - 0.05} passo={0.08} style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(104, 96), lineHeight: 1.05 }} />
        <AnimatedText texto={`${dados.nCursos} cursos, de todas as universidades do Sisu.`} t={t} inicio={M.escolhe + 0.35} passo={0.04} style={{ fontSize: 38, color: COR.fg3, marginTop: 22, fontWeight: 500 }} />
      </div>

      <div style={{ position: "absolute", left: X0, top: Y0 }}>
        <Escala zoom={Z}>
          <div style={{ width: LARG, position: "relative", height: 210 }}>
            {/* Busca (web: BuscaCursos) */}
            <div style={{
              position: "absolute", left: 0, top: -64, width: LARG, height: 52, display: "flex", alignItems: "center", gap: 10, padding: "0 14px",
              background: COR.panel2, border: `1px solid ${COR.linha2}`, borderRadius: 12, opacity: mola(t, M.escolhe - 0.45, fps), translate: `0px ${(1 - mola(t, M.escolhe - 0.45, fps)) * 20}px`,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COR.fg3} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <span style={{ fontSize: 16, color: COR.fg4 }}>Busque um curso, ex.: Medicina</span>
            </div>
            {CHIPS.map((c, i) => {
              const k = mola(t, M.escolhe + 0.05 + i * 0.07, fps, { damping: 15, stiffness: 160 });
              const sel = c.nome === "Direito";
              return (
                <div key={c.nome} style={{ position: "absolute", left: c.x, top: c.y + 4, opacity: Math.min(1, k), translate: `0px ${(1 - k) * 18}px`, scale: String(sel ? 1 + 0.08 * Math.sin(Math.PI * ativo) : 1) }}>
                  <Chip texto={c.nome} ativo={sel ? ativo : 0} style={{ width: c.w, justifyContent: "center" }} />
                </div>
              );
            })}
            {/* Título do mapa (web: .titulo-mapa) */}
            <div style={{ position: "absolute", left: 0, top: 112, opacity: titulo, translate: `0px ${(1 - titulo) * 12}px` }}>
              <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 26, lineHeight: 1.2, whiteSpace: "nowrap" }}>
                Direito: <AnimatedCounter valor={dados.curso.comCorte} t={t} de={M.n120 - 0.1} ate={M.n120 + 0.55} decimais={false} /> opções no Brasil
              </div>
              <div style={{ fontSize: 12, color: COR.fg3, marginTop: 4 }}>cortes do Sisu {dados.ano} · ampla concorrência</div>
            </div>
          </div>
        </Escala>
      </div>

      <CursorAnimation t={t} passos={[{ t: M.escolhe + 0.6, ...tela(260, 150) }, { t: toque, ...tela(92 + 37, 4 + 16), clique: true }]} aparece={M.escolhe + 0.6} some={toque + 0.5} />
    </AbsoluteFill>
  );
};
