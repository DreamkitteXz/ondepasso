// Relatório 01 — "Você já sabe o que vai colocar na 2ª opção do Sisu?". Anúncio do relatório pago.
// 1080 × 1920, 30 fps, ~34,5 s. Telas reais do relatório (capturadas com o servidor SIMULADO, notas de exemplo).
// Narração: ElevenLabs, voz "Eduardo - Streamer & Brasileiro", take A (ver docs/relatorio01/narration.txt).
// Regras do texto: nada de promessa de aprovação nem urgência; o preço aparece escrito, e o aviso fica no fim.
import React from "react";
import { AbsoluteFill, Composition, Img, Sequence, staticFile, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";
import narracao from "./narracao.json";
import { InicioCena, janela, mix, mola, prog, useT } from "../lib/anim";
import { COR, EASE, SANS, SERIF } from "../lib/tema";
import { Fundo } from "../components/Fundo";
import { Lockup } from "../components/BrandLogo";
import { Mixagem } from "../components/AudioMix";

loadFont({ family: "Faustina", url: staticFile("fonts/faustina-600.woff2"), weight: "600" });
loadFont({ family: "Geist", url: staticFile("fonts/geist-variable.woff2"), weight: "100 900" });

export const FPS = 30;
export const INICIO = 0.15;
export const DURACAO = 34.5;
type Marco = keyof typeof narracao.marcos;
const M = Object.fromEntries(Object.entries(narracao.marcos).map(([k, v]) => [k, v + INICIO])) as Record<Marco, number>;
const F = Object.fromEntries(Object.entries(narracao.fins).map(([k, v]) => [k, v + INICIO])) as Record<Marco, number>;
const PAL = (narracao.palavras as [string, number, number][]).map(([w, a, b]) => ({ w, a: a + INICIO, b: b + INICIO }));
const FALA: [number, number][] = (() => {
  const t: [number, number][] = [];
  for (const p of PAL) { if (t.length && p.a - t[t.length - 1][1] < 0.45) t[t.length - 1][1] = p.b; else t.push([p.a, p.b]); }
  return t;
})();

const CENAS = {
  gancho: { de: 0, ate: M.escolher + 0.1 },
  problema: { de: M.escolher - 0.25, ate: M.porIsso + 0.35 },
  revela: { de: M.porIsso - 0.3, ate: M.voceDiz + 0.25 },
  prefs: { de: M.voceDiz - 0.25, ate: M.monta + 0.2 },
  porque: { de: M.monta - 0.2, ate: M.depois + 0.25 },
  finais: { de: M.depois - 0.25, ate: M.simular + 0.1 },
  cta: { de: M.simular - 0.3, ate: DURACAO },
} as const;
type Cena = keyof typeof CENAS;
/** Opacidade de entrada/saída de uma cena (cruzamento de 0,3 s). */
const vis = (t: number, c: Cena) => janela(t, CENAS[c].de, CENAS[c].ate, 0.35, 0.3);

const SFX: { arq: string; t: number; vol: number }[] = [
  { arq: "pop", t: M.sisu, vol: 0.25 },
  { arq: "whoosh-curto", t: M.escolher - 0.2, vol: 0.28 },
  { arq: "pop-grave", t: M.arriscado + 0.1, vol: 0.3 },
  { arq: "confirma", t: M.faria + 0.1, vol: 0.22 },
  { arq: "whoosh", t: M.porIsso - 0.3, vol: 0.32 },
  { arq: "assinatura", t: M.ondePasso, vol: 0.42 },
  { arq: "whoosh-curto", t: M.voceDiz - 0.2, vol: 0.25 },
  { arq: "toque", t: M.cursar, vol: 0.35 },
  { arq: "toque", t: M.onde + 0.2, vol: 0.35 },
  { arq: "whoosh-curto", t: M.monta - 0.2, vol: 0.25 },
  { arq: "pop", t: M.margem, vol: 0.25 },
  { arq: "subida", t: M.acontece, vol: 0.25 },
  { arq: "whoosh-curto", t: M.depois - 0.2, vol: 0.25 },
  { arq: "salvar", t: M.pdf, vol: 0.45 },
  { arq: "whoosh", t: M.simular - 0.3, vol: 0.3 },
  { arq: "assinatura", t: M.gratis + 0.2, vol: 0.35 },
];

// ---------------------------------------------------------------- peças
const Titulo: React.FC<{ t: number; de: number; children: React.ReactNode; top?: number; size?: number }> = ({ t, de, children, top = 200, size = 64 }) => {
  const p = prog(t, de, de + 0.55);
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top, opacity: p, translate: `0 ${(1 - p) * 26}px`, fontFamily: SERIF, fontWeight: 600, fontSize: size, lineHeight: 1.05, letterSpacing: -1, color: COR.fg1 }}>
      {children}
    </div>
  );
};
const Verde: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: COR.verde }}>{children}</span>;

/** Celular com a tela real, rolando de `y` (px da imagem) ao longo das paradas. */
const Celular: React.FC<{ t: number; src: string; imgW: number; paradas: [number, number][]; top?: number; entrada: number }> = ({ t, src, imgW, paradas, top = 430, entrada }) => {
  const { fps } = useVideoConfig();
  const W = 880, H = 1020, borda = 22;
  const escala = (W - borda * 2) / imgW;
  let y = paradas[0][1];
  for (let i = 1; i < paradas.length; i++) y = mix(y, paradas[i][1], prog(t, paradas[i][0] - 0.7, paradas[i][0], EASE.camera));
  const m = mola(t, entrada, fps);
  return (
    <div style={{ position: "absolute", left: (1080 - W) / 2, top, width: W, height: H, borderRadius: 64, background: "#050505", padding: borda,
      boxShadow: `0 0 0 2px ${COR.linha2}, 0 40px 120px rgba(0,0,0,.6), 0 0 120px rgba(61,214,140,.08)`, opacity: m, translate: `0 ${(1 - m) * 90}px` }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 44, overflow: "hidden", position: "relative", background: COR.bg }}>
        <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: -y * escala, width: W - borda * 2 }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${COR.bg} 0, transparent 40px, transparent calc(100% - 70px), ${COR.bg} 100%)` }} />
      </div>
    </div>
  );
};

/** Destaque: anel verde que pulsa em volta de uma região do celular. */
const Destaque: React.FC<{ t: number; de: number; ate: number; x: number; y: number; w: number; h: number; cor?: string }> = ({ t, de, ate, x, y, w, h, cor = COR.verde }) => {
  const o = janela(t, de, ate, 0.3, 0.3);
  if (o <= 0) return null;
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 22, border: `4px solid ${cor}`, boxShadow: `0 0 40px ${cor}66`, opacity: o, scale: String(mix(1.06, 1, prog(t, de, de + 0.4))) }} />;
};

const Legenda: React.FC<{ t: number }> = ({ t }) => {
  const bloco = (narracao.blocos as number[][]).find(([i, j]) => t >= PAL[i].a - 0.12 && t < (PAL[j] ? PAL[j].a - 0.12 : PAL[j - 1].b + 0.6));
  if (!bloco) return null;
  const [i, j] = bloco;
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top: 1500, display: "flex", justifyContent: "center" }}>
      <div style={{ padding: "16px 26px", borderRadius: 22, background: "rgba(10,10,9,.82)", boxShadow: `0 0 0 1px ${COR.linha1}`, fontFamily: SANS, fontWeight: 600, fontSize: 46, lineHeight: 1.2, textAlign: "center", color: COR.fg3 }}>
        {PAL.slice(i, j).map((p, k) => (
          <span key={k} style={{ color: t >= p.a ? COR.fg1 : COR.fg4 }}>{p.w.replace(/\.\.\.$/, "")}{k < j - i - 1 ? " " : ""}</span>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- cenas
const Gancho: React.FC = () => {
  const t = useT(); const o = vis(t, "gancho");
  const palavras = PAL.slice(0, 12);
  const slot = (n: string, texto: string, de: number, ativo: boolean) => {
    const p = prog(t, de, de + 0.45);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 28, padding: "34px 40px", borderRadius: 32, background: COR.panel2, opacity: p, translate: `0 ${(1 - p) * 30}px`,
        boxShadow: `inset 0 0 0 ${ativo ? 3 : 1}px ${ativo ? COR.ambar : COR.linha2}` }}>
        <span style={{ fontFamily: SERIF, fontSize: 64, fontWeight: 600, color: ativo ? COR.ambar : COR.fg3 }}>{n}</span>
        <span style={{ fontFamily: SANS, fontSize: 44, color: ativo ? COR.fg1 : COR.fg3 }}>{texto}</span>
        {ativo && <span style={{ width: 4, height: 52, background: COR.ambar, opacity: Math.floor(t * 2.2) % 2 ? 1 : 0.15 }} />}
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", left: 80, top: 260, fontFamily: SANS, fontSize: 30, letterSpacing: 4, color: COR.verde, opacity: prog(t, 0, 0.3) }}>● SISU 2027</div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 330, fontFamily: SERIF, fontWeight: 600, fontSize: 104, lineHeight: 1.02, letterSpacing: -2 }}>
        {palavras.map((p, k) => {
          const a = prog(t, p.a - 0.12, p.a + 0.2);
          const destaque = k >= 8 && k <= 9;
          return <span key={k} style={{ opacity: a, color: destaque ? COR.ambar : COR.fg1, display: "inline-block", translate: `0 ${(1 - a) * 20}px`, marginRight: 22 }}>{k === 8 ? "2ª" : p.w}</span>;
        })}
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 930, display: "grid", gap: 26 }}>
        {slot("1ª", "o curso que você mais quer", M.sisu - 0.6, false)}
        {slot("2ª", "", M.sisu - 0.3, true)}
      </div>
    </AbsoluteFill>
  );
};

const Problema: React.FC = () => {
  const t = useT(); const o = vis(t, "problema");
  const risco = prog(t, M.arriscado, M.arriscado + 0.5, EASE.traco);
  const l2 = prog(t, M.segunda2 - 0.3, M.segunda2 + 0.3);
  const ok = prog(t, M.faria, M.faria + 0.4);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", left: 80, right: 80, top: 330, display: "grid", gap: 70 }}>
        <div style={{ opacity: prog(t, M.escolher - 0.1, M.escolher + 0.4) }}>
          <div style={{ fontFamily: SANS, fontSize: 32, letterSpacing: 3, color: COR.vermelho, marginBottom: 18 }}>ARRISCADO</div>
          <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 86, lineHeight: 1.1, color: risco > 0.5 ? COR.fg3 : COR.fg1 }}>
            {/* Risco por linha: o fundo em gradiente se repete em cada linha quebrada. */}
            <span style={{ backgroundImage: `linear-gradient(${COR.vermelho}, ${COR.vermelho})`, backgroundSize: `${risco * 100}% 8px`, backgroundPosition: "0 60%", backgroundRepeat: "no-repeat", WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone" }}>
              Escolher só pelo corte mais alto
            </span>
          </div>
        </div>
        <div style={{ opacity: l2, translate: `0 ${(1 - l2) * 30}px`, padding: "44px 48px", borderRadius: 36, background: COR.panel2, boxShadow: `inset 0 0 0 ${ok > 0 ? 3 : 1}px ${ok > 0 ? COR.verde : COR.linha2}` }}>
          <div style={{ fontFamily: SANS, fontSize: 32, letterSpacing: 3, color: COR.verde, marginBottom: 18 }}>2ª OPÇÃO</div>
          <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 80, lineHeight: 1.05 }}>Um curso que você <Verde>faria mesmo</Verde>.</div>
          <div style={{ marginTop: 26, fontFamily: SANS, fontSize: 36, color: COR.fg2, opacity: ok }}>✓ Não só o que “cabe” na sua nota</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Revela: React.FC = () => {
  const t = useT(); const { fps } = useVideoConfig(); const o = vis(t, "revela");
  const m = mola(t, M.porIsso + 0.2, fps);
  const nome = prog(t, M.ondePasso - 0.2, M.ondePasso + 0.5);
  const chip = prog(t, M.ondePasso + 0.4, M.ondePasso + 0.8);
  return (
    <AbsoluteFill style={{ opacity: o, alignItems: "center", justifyContent: "center" }}>
      <div style={{ scale: String(mix(0.9, 1, m)), opacity: m, marginTop: -200 }}><Lockup largura={760} traco={prog(t, M.porIsso, M.porIsso + 0.9, EASE.traco)} nome={nome} /></div>
      <div style={{ marginTop: 60, opacity: chip, translate: `0 ${(1 - chip) * 20}px`, padding: "18px 34px", borderRadius: 999, boxShadow: `inset 0 0 0 2px ${COR.verde}`, fontFamily: SANS, fontSize: 40, fontWeight: 600, color: COR.verde }}>
        Relatório · plano de escolha para o Sisu
      </div>
    </AbsoluteFill>
  );
};

const Prefs: React.FC = () => {
  const t = useT(); const o = vis(t, "prefs");
  // preferencias.jpg (991 px): notas no topo; cursos marcados ~1420; estados ~2120.
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Titulo t={t} de={M.voceDiz + 0.15}>Você diz <Verde>o que quer cursar</Verde> e <Verde>onde pode estudar</Verde></Titulo>
      <Celular t={t} src="images/relatorio01/preferencias.jpg" imgW={991} entrada={M.voceDiz - 0.1} paradas={[[0, 700], [M.cursar + 0.2, 1240], [M.onde + 0.4, 1930]]} />
      <Destaque t={t} de={M.cursar + 0.25} ate={M.onde + 0.1} x={160} y={915} w={510} h={84} />
      <Destaque t={t} de={M.onde + 0.5} ate={CENAS.prefs.ate} x={500} y={636} w={360} h={80} />
    </AbsoluteFill>
  );
};

const Porque: React.FC = () => {
  const t = useT(); const o = vis(t, "porque");
  // porque.jpg (991 px): recomendação no topo; motivos ~830; margens ~1500; simulação ~1820.
  const titulo = t < M.margem ? <>Sua <Verde>1ª e 2ª opção</Verde>, cada uma com o porquê</> : t < M.acontece ? <>A <Verde>margem</Verde> sobre o corte</> : <>E se o corte <span style={{ color: COR.ambar }}>subir</span>?</>;
  const troca = Math.min(prog(t, M.margem - 0.25, M.margem + 0.1), 1) + prog(t, M.acontece - 0.25, M.acontece + 0.1);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div key={Math.round(troca)} style={{ position: "absolute", inset: 0 }}><Titulo t={t} de={[M.monta + 0.2, M.margem - 0.2, M.acontece - 0.2][Math.round(troca)]}>{titulo}</Titulo></div>
      <Celular t={t} src="images/relatorio01/porque.jpg" imgW={991} entrada={M.monta - 0.1} paradas={[[0, 0], [M.explicando + 0.3, 700], [M.margem + 0.3, 1440], [M.acontece + 0.3, 1780]]} />
      <Destaque t={t} de={M.primeira} ate={M.explicando + 0.2} x={130} y={430 + 22 + 60} w={820} h={150} />
      <Destaque t={t} de={M.margem + 0.35} ate={M.acontece - 0.1} x={130} y={585} w={820} h={160} />
      <Destaque t={t} de={M.acontece + 0.35} ate={CENAS.porque.ate} x={130} y={560} w={820} h={230} cor={COR.ambar} />
    </AbsoluteFill>
  );
};

const Finais: React.FC = () => {
  const t = useT(); const { fps } = useVideoConfig(); const o = vis(t, "finais");
  const tab = mola(t, M.depois, fps);
  const pdf = mola(t, M.salva - 0.1, fps, { damping: 16 });
  const zoom = mix(1, 1.08, prog(t, M.finalistas, M.salva, EASE.camera));
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Titulo t={t} de={M.depois + 0.25}>{t < M.salva - 0.1 ? <>Finalistas <Verde>lado a lado</Verde></> : <>E o plano em <Verde>PDF</Verde></>}</Titulo>
      <div style={{ position: "absolute", left: 60, top: 440, width: 960, height: 760, borderRadius: 36, overflow: "hidden", background: COR.panel, boxShadow: `0 0 0 2px ${COR.linha2}, 0 40px 120px rgba(0,0,0,.6)`,
        opacity: tab * (1 - 0.55 * pdf), translate: `0 ${(1 - tab) * 80}px`, scale: String(1 - 0.06 * pdf) }}>
        <Img src={staticFile("images/relatorio01/finalistas.jpg")} style={{ width: 960 * 1.25, translate: `${-30 - prog(t, M.finalistas, M.salva) * 140}px ${-20}px`, scale: String(zoom), transformOrigin: "0 0" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(transparent 70%, ${COR.panel})` }} />
      </div>
      <div style={{ position: "absolute", left: 230, top: 520, width: 620, borderRadius: 10, overflow: "hidden", background: "#fff",
        boxShadow: "0 50px 140px rgba(0,0,0,.7)", opacity: pdf, rotate: `${mix(8, -3, pdf)}deg`, translate: `${(1 - pdf) * 300}px ${(1 - pdf) * 400}px` }}>
        <Img src={staticFile("images/relatorio01/pdf.jpg")} style={{ width: "100%", display: "block" }} />
      </div>
    </AbsoluteFill>
  );
};

const Cta: React.FC = () => {
  const t = useT(); const { fps } = useVideoConfig(); const o = vis(t, "cta");
  const a = mola(t, M.simular - 0.1, fps), b = prog(t, M.estimada, M.estimada + 0.4), c = mola(t, M.previa - 0.1, fps), d = prog(t, F.gratis + 0.3, F.gratis + 0.9);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", left: 80, top: 230, opacity: a }}><Lockup largura={420} /></div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 420, fontFamily: SERIF, fontWeight: 600, fontSize: 96, lineHeight: 1.02, letterSpacing: -2, opacity: a, translate: `0 ${(1 - a) * 30}px` }}>
        Simule agora com a <Verde>nota estimada</Verde>
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 700, fontFamily: SANS, fontSize: 40, color: COR.fg2, opacity: b }}>Pelo gabarito, antes do resultado oficial.</div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 820, display: "grid", gap: 22 }}>
        <div style={{ opacity: c, translate: `0 ${(1 - c) * 30}px`, padding: "30px 38px", borderRadius: 30, background: COR.verdeTinta, boxShadow: `inset 0 0 0 2px ${COR.verde}`, fontFamily: SANS, fontSize: 48, fontWeight: 700, color: COR.verde }}>Prévia grátis</div>
        <div style={{ opacity: d, translate: `0 ${(1 - d) * 30}px`, padding: "30px 38px", borderRadius: 30, background: COR.panel2, boxShadow: `inset 0 0 0 1px ${COR.linha2}`, fontFamily: SANS, fontSize: 40, color: COR.fg1 }}>
          Plano completo: <b>R$ 15,90</b> · pagamento único
        </div>
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 1180, fontFamily: SANS, fontWeight: 700, fontSize: 58, color: COR.fg1, opacity: d }}>ondepasso.com.br<span style={{ color: COR.verde }}>/relatorio</span></div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 1290, fontFamily: SANS, fontSize: 28, lineHeight: 1.4, color: COR.fg3, opacity: d }}>
        Compara a sua média com os cortes do Sisu de 2024 a 2026. Não é previsão de aprovação.
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- composição
const CENA: Record<Cena, React.FC> = { gancho: Gancho, problema: Problema, revela: Revela, prefs: Prefs, porque: Porque, finais: Finais, cta: Cta };
export type Relatorio01Props = { narracao: boolean; trilha: boolean; legendas: boolean };

const luz = (t: number) => 0.05 + 0.08 * Math.max(janela(t, M.porIsso - 0.3, M.voceDiz + 0.3, 0.6, 0.6), prog(t, M.simular - 0.3, M.simular + 0.8));

export const Relatorio01: React.FC<Relatorio01Props> = ({ narracao: comVoz, trilha, legendas }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ fontFamily: SANS, color: COR.fg1 }}>
      <Fundo forca={luz} />
      {(Object.keys(CENAS) as Cena[]).map((k) => {
        const { de, ate } = CENAS[k]; const C = CENA[k];
        return (
          <Sequence key={k} name={k} from={Math.round(de * fps)} durationInFrames={Math.round((ate - de) * fps)}>
            <InicioCena.Provider value={Math.round(de * fps) / fps}><C /></InicioCena.Provider>
          </Sequence>
        );
      })}
      {legendas && <Sequence name="legendas"><InicioCena.Provider value={0}><LegendaT /></InicioCena.Provider></Sequence>}
      <Mixagem narracao={comVoz} trilha={trilha} arqNarracao="audio/relatorio01/narracao.mp3" arqTrilha="audio/relatorio01/trilha.wav"
        inicioNarracao={INICIO} duracao={DURACAO} fala={FALA} sfx={SFX} vol={{ narracao: 1, trilha: 0.5, trilhaSobVoz: 0.18, sfx: 1 }} />
    </AbsoluteFill>
  );
};
const LegendaT: React.FC = () => { const t = useT(); return <Legenda t={t} />; };

export const OndePassoRelatorio01: React.FC = () => (
  <Composition id="OndePassoRelatorio01" component={Relatorio01} durationInFrames={Math.round(DURACAO * FPS)} fps={FPS} width={1080} height={1920}
    defaultProps={{ narracao: true, trilha: true, legendas: true }} />
);
