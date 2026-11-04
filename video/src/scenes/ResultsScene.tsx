// Cena 5 — Resultados: o mapa real de Direito ganha cor no ritmo da voz (verde, amarelo, vermelho),
// a câmera inclina e aproxima da Paraíba, o pino sobe na UFPB Santa Rita e a página da opção se abre.
import React from "react";
import { AbsoluteFill } from "remotion";
import dados from "../data/dados.json";
import { M } from "../timeline";
import { COR, EASE, SERIF, nota } from "../lib/tema";
import { mix, mola, prog, useT } from "../lib/anim";
import { useLayout } from "../lib/layout";
import { MapaBrasil, posicaoNaTela, type PontoMapa } from "../components/MapaBrasil";
import { Escala, ItemLegenda, Pilula } from "../components/ui";
import { CartaoCampus, CartaoCorte, Historico, TabelaCotas } from "../components/ResultCard";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { CursorAnimation } from "../components/CursorAnimation";

const ALVO = dados.oferta.r;
const QUANDO: Record<string, number> = { supera: M.verde, igual: M.amarelo, pouco: M.amarelo, abaixo: M.vermelho };
// Ordem de aparição: onda de norte a sul; de cor: onda de oeste a leste.
const ordemY = new Map([...dados.pontos].sort((a, b) => a.y - b.y).map((p, i) => [p.r, i / dados.pontos.length]));
const ordemX = new Map([...dados.pontos].sort((a, b) => a.x - b.x).map((p, i) => [p.r, i / dados.pontos.length]));

export const ResultsScene: React.FC = () => {
  const t = useT();
  const { W, H, vertical, v } = useLayout();
  const fps = 30;

  // Mapa
  const MW = v(1000, 1000), MH = v(930, 900);
  const MX = v(W - 120 - MW + 40, (W - MW) / 2), MY = v(110, 640);
  const contorno = prog(t, M.cadaPonto - 0.8, M.cadaPonto + 0.4, EASE.traco);
  const zoom = prog(t, M.toca - 0.1, M.toca + 0.85, EASE.camera);
  const toque = M.toca + 0.7;
  const pino = prog(t, toque, toque + 0.45, EASE.entra);
  // Abertura da página da opção (cota): o mapa encolhe e vai para o lado.
  const pagina = prog(t, M.cota - 0.15, M.cota + 0.6, EASE.camera);
  const saida = prog(t, M.naoEPromessa - 0.45, M.naoEPromessa + 0.1, EASE.sai);

  const aparece = (p: PontoMapa) => prog(t, M.cadaPonto + 0.05 + (ordemY.get(p.r) ?? 0) * 1.1, M.cadaPonto + 0.4 + (ordemY.get(p.r) ?? 0) * 1.1);
  const colore = (p: PontoMapa) => { const a = QUANDO[p.s] + 0.05 + (ordemX.get(p.r) ?? 0) * 0.7; return prog(t, a, a + 0.3); };

  const alvo = dados.pontos.find((p) => p.r === ALVO)!;
  const folga = v(0.12, 0.32);
  const posAlvo = posicaoNaTela(alvo, MW, MH, 1, "PB", folga);
  const baseX = v((W - MW) / 2, MX); // onde o mapa está quando o toque acontece

  // Texto lateral
  const col = 1 - prog(t, M.toca - 0.2, M.toca + 0.3, EASE.sai);
  const verde = prog(t, M.verde, M.verde + 0.45), amarelo = prog(t, M.amarelo, M.amarelo + 0.45), vermelho = prog(t, M.vermelho, M.vermelho + 0.45);
  const aviso = prog(t, M.verde + 2.0, M.verde + 2.5);

  // Câmera do mapa: ao aproximar, o estado vem para o centro; na "página", vai para o canto (horizontal) ou para o alto (vertical).
  const cx = mix(MX, (W - MW) / 2, zoom * (vertical ? 0 : 1));
  const mapaEsc = mix(1, v(0.78, 0.62), pagina);
  const mapaX = mix(cx, v(60, (W - MW * 0.62) / 2), pagina);
  const mapaY = mix(MY, v(-110, 10), pagina);
  const campus = prog(t, toque + 0.1, toque + 0.55) * (1 - prog(t, M.cota - 0.1, M.cota + 0.3, EASE.sai));

  return (
    <AbsoluteFill style={{ opacity: 1 - saida, filter: `blur(${saida * 14}px)` }}>
      {/* Coluna de leitura (web: resumo do mapa) */}
      <div style={{ position: "absolute", left: v(120, 80), top: v(270, 250), width: v(640, 920), opacity: col * prog(t, M.cadaPonto - 0.4, M.cadaPonto + 0.2) }}>
        <Escala zoom={v(1.9, 1.75)}>
          <Pilula valor={dados.nota} />
        </Escala>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(66, 64), lineHeight: 1.1, marginTop: 30, opacity: verde, translate: `0px ${(1 - verde) * 16}px` }}>
          <span style={{ color: COR.verde }}><AnimatedCounter valor={dados.conta.supera} t={t} de={M.verde} ate={M.verde + 0.9} decimais={false} /></span> de {dados.curso.comCorte} opções acima do corte de {dados.ano}
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 26, fontSize: v(32, 32), fontWeight: 500 }}>
          <span style={{ color: COR.ambar, opacity: amarelo }}>{dados.conta.pouco} por pouco</span>
          <span style={{ color: COR.fg4, opacity: vermelho }}>·</span>
          <span style={{ color: COR.vermelho, opacity: vermelho }}>{dados.conta.abaixo} abaixo do corte</span>
        </div>
        <div style={{ fontSize: v(26, 28), color: COR.fg3, marginTop: 22, opacity: aviso }}>Comparação histórica · não garante aprovação.</div>
      </div>

      {/* Mapa */}
      <div style={{ position: "absolute", left: mapaX, top: mapaY, width: MW, height: MH, transformOrigin: "0 0", scale: String(mapaEsc) }}>
        <MapaBrasil
          largura={MW}
          altura={MH}
          zoom={zoom}
          uf="PB"
          folga={folga}
          contorno={contorno}
          aparece={aparece}
          colore={colore}
          escolhido={{ r: ALVO, pino }}
        />
        {/* Legenda (web: .legenda) */}
        <div style={{ position: "absolute", left: v(80, 40), bottom: v(-10, -60), opacity: col * prog(t, M.cadaPonto, M.cadaPonto + 0.5) }}>
          <Escala zoom={2}>
            <div style={{ display: "flex", gap: 14, fontSize: 11.5 }}>
              <ItemLegenda s="supera" texto="Supera o corte" ativo={verde} />
              <ItemLegenda s="pouco" texto="Por pouco (até 10 pts)" ativo={amarelo} />
              <ItemLegenda s="abaixo" texto="Abaixo do corte" ativo={vermelho} />
            </div>
          </Escala>
        </div>
        {/* Nome do estado ao aproximar */}
        <div style={{ position: "absolute", left: 40, top: v(40, 10), fontFamily: SERIF, fontWeight: 600, fontSize: 64, opacity: zoom * (1 - pagina) }}>
          {dados.estado.nome}
          <div style={{ fontFamily: "inherit", fontSize: 28, fontWeight: 500, marginTop: 10, display: "flex", gap: 14 }}>
            <span style={{ color: COR.verde }}>{dados.estado.conta.supera} superam o corte</span>
            <span style={{ color: COR.ambar }}>{dados.estado.conta.pouco} por pouco</span>
            <span style={{ color: COR.vermelho }}>{dados.estado.conta.abaixo} abaixo</span>
          </div>
        </div>
      </div>

      {/* Cartão do campus (web: CartaoPonto) */}
      {campus > 0.001 && (
        <div style={{ position: "absolute", left: v(W - 120 - 380 * 1.6, 90), top: v(H - 110 - 250 * 1.6, 1330), opacity: campus, translate: `${(1 - campus) * -40}px 0px` }}>
          <Escala zoom={v(1.6, 2.35)}>
            <CartaoCampus numeros={prog(t, toque + 0.25, toque + 0.95)} />
          </Escala>
        </div>
      )}

      {/* Página da opção: nota de corte, cortes por cota e histórico */}
      {pagina > 0.001 && (() => {
        const zc = v(1.53, 1.62);
        const c1 = mola(t, M.cota - 0.05, fps, { damping: 20, stiffness: 110 });
        const c2 = mola(t, M.cota + 0.2, fps, { damping: 20, stiffness: 110 });
        const c3 = mola(t, M.mudou - 0.15, fps, { damping: 20, stiffness: 110 });
        const entra = (k: number, dx: number, dy: number): React.CSSProperties => ({ opacity: Math.min(1, k), translate: `${(1 - k) * dx}px ${(1 - k) * dy}px` });
        return (
          <>
            <div style={{ position: "absolute", left: v(W - 120 - 560 * zc, 80), top: v(130, 520), ...entra(c1, 120, 0) }}>
              <Escala zoom={zc}>
                <CartaoCorte numero={<AnimatedCounter valor={dados.oferta.corte} inicial={dados.oferta.corte - 40} t={t} de={M.cota - 0.05} ate={M.cota + 0.8} />} />
              </Escala>
            </div>
            <div style={{ position: "absolute", left: v(W - 120 - 560 * zc, 80), top: v(130 + 190 * zc, 520 + 190 * zc), ...entra(c2, 120, 0) }}>
              <Escala zoom={zc}>
                <TabelaCotas linhas={prog(t, M.cota + 0.25, M.cota + 1.4)} max={v(5, 5)} />
              </Escala>
            </div>
            <div style={{ position: "absolute", left: 120, top: 640, ...entra(c3, 0, 80), display: vertical ? "none" : undefined }}>
              <Escala zoom={zc}>
                <Historico barras={prog(t, M.mudou, M.mudou + 1.1)} largura={470} />
              </Escala>
            </div>
            {vertical && (
              <div style={{ position: "absolute", left: 80, top: 520 + 190 * zc + 300 * zc, ...entra(c3, 0, 80) }}>
                <Escala zoom={zc}>
                  <Historico barras={prog(t, M.mudou, M.mudou + 1.1)} largura={560} />
                </Escala>
              </div>
            )}
          </>
        );
      })()}

      <CursorAnimation
        t={t}
        passos={[
          { t: M.toca + 0.25, x: baseX + posAlvo.x - 160, y: MY + posAlvo.y + 160 },
          { t: toque, x: baseX + posAlvo.x, y: MY + posAlvo.y, clique: true },
        ]}
        aparece={M.toca + 0.25}
        some={toque + 0.4}
      />
      {/* Rótulo do campus escolhido, preso ao pino */}
      <div style={{ position: "absolute", left: baseX + posAlvo.x - 24, top: MY + posAlvo.y - 112, transform: "translateX(-100%)", fontSize: 32, fontWeight: 600, color: COR.fg1, opacity: pino * (1 - prog(t, M.cota - 0.35, M.cota - 0.05)), textShadow: "0 2px 12px rgba(0,0,0,.8)", whiteSpace: "nowrap" }}>
        UFPB · Santa Rita <span style={{ color: COR.verde, fontWeight: 600 }}>+{nota(dados.oferta.diferenca)}</span>
      </div>
    </AbsoluteFill>
  );
};
