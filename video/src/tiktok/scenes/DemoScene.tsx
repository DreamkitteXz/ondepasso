// Cena 4 — Demonstração (~9,3 → 13 s): o cartão "Digite sua nota" do site (a nota é digitada em "coloca a sua nota"),
// os atalhos de curso (Direito é tocado em "escolhe o curso") e a saída para o mapa em "explora as opções".
import React from "react";
import { AbsoluteFill } from "remotion";
import { M } from "../timeline";
import { COR, EASE } from "../../lib/tema";
import { janela, mola, prog, useT } from "../../lib/anim";
import { AnimatedCursor } from "../../components/AnimatedCursor";
import { Botao, Campo, Chip, Escala } from "../../components/ui";

const Z = 2.1, LARG = 440;
const X0 = (1080 - LARG * Z) / 2, Y0 = 400;
const tela = (x: number, y: number) => ({ x: X0 + x * Z, y: Y0 + y * Z });
// Atalhos da home do site, na mesma ordem (larguras em px do site).
const CHIPS = [
  { nome: "Medicina", w: 84, x: 0, y: 0 }, { nome: "Direito", w: 74, x: 92, y: 0 }, { nome: "Psicologia", w: 96, x: 174, y: 0 },
  { nome: "Enfermagem", w: 108, x: 278, y: 0 }, { nome: "Engenharia Civil", w: 138, x: 0, y: 43 }, { nome: "Mais cursos", w: 100, x: 146, y: 43 },
];
const CHIPS_Y = 222; // em px do site, abaixo do cartão

export const DemoScene: React.FC = () => {
  const t = useT();
  const fps = 30;
  const entra = mola(t, M.coloca - 0.15, fps, { damping: 18, stiffness: 130 });
  const sai = prog(t, M.explora - 0.1, M.explora + 0.45, EASE.sai);
  const toqueCampo = M.coloca + 0.15;
  const digitado = "720".slice(0, Math.max(0, Math.min(3, Math.floor((t - (M.coloca + 0.35)) / 0.13) + 1)));
  const toqueChip = M.escolhe + 0.45;
  const ativo = prog(t, toqueChip, toqueChip + 0.15);

  return (
    <AbsoluteFill style={{ opacity: 1 - sai, translate: `0px ${-sai * 160}px`, scale: String(1 - 0.06 * sai) }}>
      {/* Cartão de nota: sobe por máscara */}
      <div style={{ position: "absolute", left: X0, top: Y0, clipPath: `inset(${(1 - Math.min(1, entra)) * 100}% 0 0 0 round 24px)`, translate: `0px ${(1 - entra) * 120}px` }}>
        <Escala zoom={Z}>
          <div style={{ width: LARG, background: COR.panel, border: `1px solid ${COR.linha1}`, borderRadius: 12, padding: 18, display: "grid", gap: 12, boxShadow: "0 30px 90px rgba(0,0,0,.55)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: "22px", whiteSpace: "nowrap" }}>Digite sua nota e compare com os cortes de 2026</div>
            <div style={{ display: "flex", gap: 8, height: 44 }}>
              <Campo valor={digitado} placeholder="Sua média do Enem" foco={t > toqueCampo && t < M.escolhe} t={t} />
              <Botao texto="Comparar nota" pressionado={janela(t, M.escolhe - 0.05, M.escolhe + 0.2, 0.05, 0.12)} style={{ width: 128 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COR.fg3 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: COR.verde }} />Sua nota não sai do seu navegador
            </div>
          </div>
        </Escala>
      </div>

      {/* Atalhos de curso */}
      <div style={{ position: "absolute", left: X0, top: Y0 + CHIPS_Y * Z }}>
        <Escala zoom={Z}>
          <div style={{ position: "relative", width: LARG, height: 80 }}>
            {CHIPS.map((c, i) => {
              const k = mola(t, M.escolhe - 0.15 + i * 0.06, fps, { damping: 15, stiffness: 170 });
              const sel = c.nome === "Direito";
              return (
                <div key={c.nome} style={{ position: "absolute", left: c.x, top: c.y, opacity: Math.min(1, k), translate: `0px ${(1 - k) * 18}px`, scale: String(sel ? 1 + 0.1 * Math.sin(Math.PI * ativo) : 1) }}>
                  <Chip texto={c.nome} ativo={sel ? ativo : 0} style={{ width: c.w, justifyContent: "center" }} />
                </div>
              );
            })}
          </div>
        </Escala>
      </div>

      <AnimatedCursor t={t} aparece={M.coloca - 0.1} some={toqueChip + 0.4} tamanho={62}
        passos={[
          { t: M.coloca - 0.1, ...tela(300, 140) },
          { t: toqueCampo, ...tela(130, 62), clique: true },
          { t: M.escolhe - 0.05, ...tela(358, 62), clique: true },
          { t: toqueChip, ...tela(92 + 37, CHIPS_Y + 16), clique: true },
        ]} />
    </AbsoluteFill>
  );
};
