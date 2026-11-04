// Cena 3 — Entrada das notas: o cartão "Digite sua nota" do site, a nota sendo digitada,
// a opção das cinco notas por área e a garantia de privacidade (a nota fica no aparelho).
import React from "react";
import { AbsoluteFill } from "remotion";
import { M } from "../timeline";
import { COR, EASE, SERIF } from "../lib/tema";
import { janela, mix, mola, prog, useT } from "../lib/anim";
import { useLayout } from "../lib/layout";
import { AnimatedText } from "../components/AnimatedText";
import { Botao, Campo, Escala } from "../components/ui";
import { CursorAnimation } from "../components/CursorAnimation";

// Notas por área de exemplo (ilustrativas) — a média simples delas é 720,00, a mesma do exemplo.
const AREAS: [string, string][] = [["Redação", "760"], ["Matemática", "690"], ["Natureza", "700"], ["Humanas", "730"], ["Linguagens", "720"]];
const LARG = 440; // largura do cartão em px do site

export const InputScene: React.FC = () => {
  const t = useT();
  const { W, H, v } = useLayout();
  const fps = 30;
  const Z = v(1.95, 1.9);
  // Cartão principal: posição na tela (canto superior esquerdo) e medidas em px do site.
  const X0 = v(W - 120 - LARG * Z, (W - LARG * Z) / 2);
  const Y0 = v(H / 2 - 105 * Z, 860);
  const tela = (x: number, y: number) => ({ x: X0 + x * Z, y: Y0 + y * Z });

  const entra = mola(t, M.digita - 0.4, fps, { damping: 20, stiffness: 100 });
  const sai = prog(t, M.escolhe - 0.55, M.escolhe - 0.1, EASE.sai);
  const digitado = "720".slice(0, Math.max(0, Math.min(3, Math.floor((t - (M.digita + 0.45)) / 0.16) + 1)));
  const focoCampo = t > M.digita + 0.1 && t < M.escolhe - 0.9;
  const areas = mola(t, M.cincoNotas - 0.05, fps, { damping: 18, stiffness: 120 }) * (1 - prog(t, M.semCadastro - 0.15, M.semCadastro + 0.3, EASE.sai));
  const privado = prog(t, M.naoSai - 0.1, M.naoSai + 0.35);
  const clique = M.escolhe - 0.85;

  const cursor = [
    { t: M.digita - 0.2, ...tela(250, 150) },
    { t: M.digita + 0.05, ...tela(150, 74), clique: true },
    { t: M.cincoNotas - 0.15, ...tela(105, 166), clique: true },
    { t: M.semCadastro + 0.4, ...tela(300, 135) },
    { t: clique, ...tela(358, 74), clique: true },
  ];

  const linhas: { texto: string; de: number; ate: number; sub?: string }[] = [
    { texto: "Sua nota.", de: M.digita, ate: M.cincoNotas - 0.15 },
    { texto: "Ou as cinco, por área.", de: M.cincoNotas, ate: M.semCadastro - 0.15, sub: "Cada curso usa os próprios pesos." },
    { texto: "Sem cadastro.", de: M.semCadastro, ate: M.escolhe - 0.4, sub: "A nota fica só no seu aparelho." },
  ];

  return (
    <AbsoluteFill>
      {/* Texto de apoio (poucas palavras, grande) */}
      {linhas.map((l) => (
        <div key={l.texto} style={{ position: "absolute", left: v(120, 80), right: v(W - 120 - 760, 80), top: v(H / 2 - 110, 300) }}>
          <AnimatedText texto={l.texto} t={t} inicio={l.de} saida={l.ate} passo={0.08}
            style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(104, 96), lineHeight: 1.05, color: COR.fg1 }} />
          {l.sub && (
            <AnimatedText texto={l.sub} t={t} inicio={l.de + 0.35} saida={l.ate} passo={0.04}
              style={{ fontSize: v(38, 38), color: COR.fg3, marginTop: 22, fontWeight: 500 }} />
          )}
        </div>
      ))}

      {/* Cartão "Digite sua nota" (web: EntradaNota) */}
      <div style={{ position: "absolute", left: X0, top: Y0, perspective: 2400, opacity: Math.min(1, entra) * (1 - sai) }}>
        <div style={{ transformOrigin: "50% 50%", transform: `translate3d(${(1 - entra) * 260 + sai * 0}px, ${(1 - entra) * 80 - sai * 120}px, 0) rotateY(${(1 - entra) * -26}deg) rotateX(${(1 - entra) * 8}deg)` }}>
          <Escala zoom={Z}>
            <div style={{ width: LARG, background: COR.panel, border: `1px solid ${COR.linha1}`, borderRadius: 12, padding: 18, display: "grid", gap: 12, boxShadow: "0 30px 90px rgba(0,0,0,.55)" }}>
              <div style={{ fontSize: 15, fontWeight: 600, lineHeight: "22px", height: 22, whiteSpace: "nowrap" }}>Digite sua nota e compare com os cortes de 2026</div>
              <div style={{ display: "flex", gap: 8, height: 44 }}>
                <Campo valor={digitado} placeholder="Sua média do Enem" foco={focoCampo} t={t} />
                <Botao texto="Comparar nota" pressionado={janela(t, clique - 0.05, clique + 0.2, 0.05, 0.12)} style={{ width: 128 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, height: 14, fontSize: 11, color: mix(0, 1, privado) > 0.5 ? COR.fg1 : COR.fg3 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: COR.verde, boxShadow: `0 0 ${10 * privado}px ${4 * privado}px rgba(61,214,140,.6)` }} />
                <span style={{ background: `rgba(61,214,140,${0.16 * privado})`, borderRadius: 4, padding: "1px 4px", margin: "-1px -4px" }}>Sua nota não sai do seu navegador</span>
              </div>
              <div style={{ fontSize: 11.5, lineHeight: "16px", color: COR.fg3, height: 16, whiteSpace: "nowrap" }}>A média simples é uma estimativa. Os pesos podem mudar o resultado.</div>
              <div style={{ fontSize: 12, lineHeight: "16px", color: COR.fg2, textDecoration: "underline", textUnderlineOffset: 3, height: 16 }}>Usar as cinco notas do Enem</div>
            </div>
          </Escala>
        </div>
      </div>

      {/* Cartão das cinco notas por área (sobreposto) */}
      {areas > 0.001 && (
        <div style={{ position: "absolute", left: X0 + v(-60, 0) * Z, top: Y0 + v(120, 130) * Z, opacity: Math.min(1, areas), translate: `0px ${(1 - areas) * 80}px`, scale: String(0.94 + 0.06 * areas) }}>
          <Escala zoom={Z}>
            <div style={{ width: LARG, background: COR.panel2, border: `1px solid ${COR.linha2}`, borderRadius: 12, padding: 18, display: "grid", gap: 12, boxShadow: "0 40px 100px rgba(0,0,0,.65)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Digite suas notas do Enem por área</span>
                <span style={{ fontSize: 10.5, color: COR.fg4 }}>notas de exemplo</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                {AREAS.map(([rot, val], i) => {
                  const k = prog(t, M.cincoNotas + 0.35 + i * 0.22, M.cincoNotas + 0.5 + i * 0.22);
                  return (
                    <div key={rot} style={{ background: COR.bg, border: `1px solid ${k > 0 && k < 1 ? COR.fg3 : COR.linha2}`, borderRadius: 10, padding: "8px 9px", display: "grid", gap: 4 }}>
                      <span style={{ fontSize: 10.5, color: COR.fg3 }}>{rot}</span>
                      <span style={{ fontSize: 16, fontVariantNumeric: "tabular-nums", color: k > 0 ? COR.fg1 : COR.fg4, opacity: 0.3 + 0.7 * k }}>{k > 0 ? val : "0,0"}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11.5, lineHeight: 1.45, color: COR.fg3 }}>Cada curso dá um peso a cada área. Com as cinco notas, calculamos a sua média em cada opção.</div>
            </div>
          </Escala>
        </div>
      )}

      <CursorAnimation t={t} passos={cursor} aparece={M.digita - 0.2} some={clique + 0.35} />
    </AbsoluteFill>
  );
};
