"use client";
// Card de story 1080 × 1920 (Figma S1/S2), desenhado no navegador com <canvas>: nada sai do aparelho
// até a pessoa escolher compartilhar ou baixar. A nota só entra se ela marcar "incluir minha nota".
import { useEffect, useRef, useState } from "react";
import { nota as fmt, diferenca, ROTULO, type Status } from "@/lib/formato";

export type DadosStory = {
  curso: string; ies: string; cidade: string; turno: string; grau: string; ano: number;
  rotulo: string; corte: number | null; delta: number | null; hist: { ano: number; v: number | null }[];
  url: string;
  minha: { media: number; ponderada: boolean; status: Status; dif: number } | null;
};

const W = 1080, H = 1920, X = 96, LARG = W - 2 * X;
const COR = { bg: "#0F0E0D", panel: "#151412", p2: "#1B1A17", p3: "#22201D", linha: "rgba(250,250,249,.08)", fg1: "#FAFAF9", fg2: "#D6D4CF", fg3: "#A6A39C", fg4: "#85827C", verde: "#3DD68C", ambar: "#E8B04B", verm: "#F14242" };
const TINTA: Record<Status, string> = { supera: "rgba(61,214,140,.14)", igual: "rgba(232,176,75,.12)", minimo: "rgba(241,66,66,.14)", pouco: "rgba(0,0,0,0)", abaixo: "rgba(241,66,66,.14)" };
const COR_ST: Record<Status, string> = { supera: COR.verde, igual: COR.ambar, minimo: COR.verm, pouco: COR.ambar, abaixo: COR.verm };

function familias() {
  const css = getComputedStyle(document.documentElement);
  const sans = css.getPropertyValue("--font-geist-sans").trim() || "system-ui, sans-serif";
  const serif = css.getPropertyValue("--font-faustina").trim() || "Georgia, serif";
  return { sans, serif };
}

function caixa(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

/** Quebra o texto em até `max` linhas, diminuindo a fonte se precisar. Devolve as linhas e o tamanho usado. */
function caber(ctx: CanvasRenderingContext2D, texto: string, fonte: (t: number) => string, tam: number, min: number, max: number) {
  for (let t = tam; t >= min; t -= 4) {
    ctx.font = fonte(t);
    const linhas: string[] = []; let atual = "";
    for (const p of texto.split(" ")) {
      const tenta = atual ? `${atual} ${p}` : p;
      if (ctx.measureText(tenta).width <= LARG) atual = tenta; else { if (atual) linhas.push(atual); atual = p; }
    }
    if (atual) linhas.push(atual);
    if (linhas.length <= max && linhas.every((l) => ctx.measureText(l).width <= LARG)) return { linhas, t };
  }
  ctx.font = fonte(min); return { linhas: [texto], t: min };
}

export async function desenharStory(d: DadosStory): Promise<Blob> {
  const { sans, serif } = familias();
  const f = (peso: number, t: number, fam = sans) => `${peso} ${t}px ${fam}`;
  // Se uma fonte não carregar (rede), desenha com a reserva em vez de falhar.
  await Promise.allSettled([document.fonts.load(f(600, 128, serif)), document.fonts.load(f(600, 250)), document.fonts.load(f(400, 30)), document.fonts.load(f(500, 44))]);
  const logo = await new Promise<HTMLImageElement | null>((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = "/logo-escuro.svg"; });

  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = COR.bg; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  // topo: logo e curso (a partir de 250 px, fora da faixa coberta pelo Instagram/TikTok)
  let y = 250;
  if (logo) { const lh = 66; ctx.drawImage(logo, X, y, lh * (logo.naturalWidth / logo.naturalHeight || 5.9), lh); }
  y += 66 + 64;
  ctx.font = f(500, 30); ctx.fillStyle = COR.fg3;
  ctx.letterSpacing = "2px"; ctx.fillText(d.rotulo.toUpperCase(), X, y); ctx.letterSpacing = "0px";
  y += 30;
  const tit = caber(ctx, d.curso, (t) => f(600, t, serif), 128, 72, 2);
  ctx.fillStyle = COR.fg1;
  for (const l of tit.linhas) { y += tit.t * 1.05; ctx.font = f(600, tit.t, serif); ctx.fillText(l, X, y); }
  y += 64; ctx.font = f(500, 44); ctx.fillStyle = COR.fg2; ctx.fillText(`${d.ies} · ${d.cidade}`, X, y, LARG);
  y += 52; ctx.font = f(400, 34); ctx.fillStyle = COR.fg3; ctx.fillText(`${d.turno} · ${d.grau}`, X, y, LARG);

  // corte
  y += 290; ctx.font = f(600, 250); ctx.fillStyle = COR.fg1; ctx.letterSpacing = "-6px";
  ctx.fillText(d.corte == null ? "sem corte" : fmt(d.corte), X - 8, y, LARG + 16); ctx.letterSpacing = "0px";
  y += 40;
  let x = X;
  if (d.delta != null && d.delta !== 0) {
    const txt = `${d.delta > 0 ? "▲" : "▼"} ${fmt(Math.abs(d.delta))} vs. ${d.ano - 1}`;
    ctx.font = f(500, 34); const w = ctx.measureText(txt).width + 40;
    const cor = d.delta > 0 ? COR.verm : COR.verde;
    caixa(ctx, x, y, w, 58, 14, d.delta > 0 ? "rgba(241,66,66,.14)" : "rgba(61,214,140,.14)");
    ctx.fillStyle = cor; ctx.fillText(txt, x + 20, y + 41); x += w + 24;
  }
  ctx.font = f(400, 30); ctx.fillStyle = COR.fg4; ctx.fillText("chamada regular · MEC", x, y + 40);
  y += 58 + 40;

  if (d.minha) {
    // S2: a nota do aluno nesta opção
    const m = d.minha, alt = 150;
    caixa(ctx, X, y, LARG, alt, 28, COR.p2);
    ctx.font = f(400, 38); ctx.fillStyle = COR.fg2; ctx.fillText(`${m.ponderada ? "Minha média aqui" : "Minha média"} ${fmt(m.media)}`, X + 36, y + 64);
    ctx.font = f(400, 30); ctx.fillStyle = COR.fg4;
    ctx.fillText(m.dif < 0 ? `faltam ${diferenca(-m.dif)} pontos` : m.dif === 0 ? "exatamente no corte" : `${diferenca(m.dif)} pontos acima`, X + 36, y + 110);
    const st = ROTULO[m.status]; ctx.font = f(600, 34); const sw = ctx.measureText(st).width + 44;
    const sx = X + LARG - 36 - sw, sy = y + (alt - 62) / 2;
    caixa(ctx, sx, sy, sw, 62, 14, TINTA[m.status], m.status === "pouco" ? COR.ambar : undefined);
    ctx.fillStyle = COR_ST[m.status]; ctx.fillText(st, sx + 22, sy + 43);
  } else {
    // S1: histórico da ampla
    const vs = d.hist.map((h) => h.v).filter((v): v is number => v != null);
    const piso = vs.length ? Math.floor(Math.min(...vs) / 50) * 50 - 50 : 0, teto = vs.length ? Math.max(...vs) : 1000;
    const alt = 100 + d.hist.length * 62;
    caixa(ctx, X, y, LARG, alt, 28, COR.panel, COR.linha);
    ctx.font = f(600, 36); ctx.fillStyle = COR.fg1; ctx.fillText("Últimas edições · ampla", X + 36, y + 70);
    let yy = y + 128;
    for (const h of d.hist) {
      const atual = h.ano === d.ano;
      ctx.font = f(400, 30); ctx.fillStyle = atual ? COR.fg1 : COR.fg3; ctx.fillText(String(h.ano), X + 36, yy);
      const tx = X + 140, tw = LARG - 140 - 36 - 160;
      caixa(ctx, tx, yy - 22, tw, 18, 9, COR.p3);
      if (h.v != null) caixa(ctx, tx, yy - 22, Math.max(18, tw * Math.max(0.04, (h.v - piso) / (teto - piso))), 18, 9, atual ? COR.fg1 : COR.fg4);
      ctx.font = f(atual ? 600 : 400, 32); ctx.fillStyle = atual ? COR.fg1 : COR.fg3; ctx.textAlign = "right";
      ctx.fillText(h.v == null ? "—" : fmt(h.v), X + LARG - 36, yy); ctx.textAlign = "left";
      yy += 62;
    }
  }

  // rodapé (acima dos 340 px de baixo)
  ctx.font = f(600, 42); ctx.fillStyle = COR.fg1; ctx.fillText("Veja a sua em ondepasso.com.br", X, H - 340 - 56, LARG);
  ctx.font = f(400, 28); ctx.fillStyle = COR.fg4; ctx.fillText("Grátis e sem cadastro · dados públicos do MEC · não é um site oficial", X, H - 340, LARG);

  return new Promise((ok, erro) => cv.toBlob((b) => (b ? ok(b) : erro(new Error("canvas"))), "image/png"));
}

/** Painel do Compartilhar na página da opção: prévia do card, nota opcional, compartilhar/baixar e copiar link. */
export function PainelStory({ dados, nomeArquivo, temNota, onFechar }: { dados: (comNota: boolean) => DadosStory; nomeArquivo: string; temNota: boolean; onFechar: () => void }) {
  const [comNota, setComNota] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [msg, setMsg] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    let vivo = true, u: string | null = null;
    desenharStory(dados(comNota)).then((b) => { if (!vivo) return; u = URL.createObjectURL(b); setBlob(b); setUrl(u); }).catch((e) => { console.error("card de story:", e); setMsg("Não deu para gerar a imagem neste navegador."); });
    return () => { vivo = false; if (u) URL.revokeObjectURL(u); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comNota]);
  const arquivo = blob ? new File([blob], nomeArquivo, { type: "image/png" }) : null;
  const podeArquivo = !!arquivo && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [arquivo] });
  async function compartilhar() {
    if (!arquivo) return;
    try { await navigator.share({ files: [arquivo], title: dados(false).curso, text: dados(false).url }); } catch { /* cancelado */ }
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(dados(false).url); setMsg("Link copiado"); } catch { setMsg(dados(false).url); }
  }
  return (
    <div className="painel-story" ref={ref} tabIndex={-1} role="region" aria-label="Compartilhar" onKeyDown={(e) => e.key === "Escape" && onFechar()}>
      <div className="ps-topo"><strong>Compartilhar</strong><button className="link-mudo" onClick={onFechar}>fechar</button></div>
      <div className="ps-previa">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="Prévia do card para stories" width={1080} height={1920} /> : <span className="miudo">Gerando a imagem…</span>}
      </div>
      {temNota && (
        <label className="ps-nota"><input type="checkbox" checked={comNota} onChange={(e) => setComNota(e.target.checked)} /> Incluir minha nota no card</label>
      )}
      <div className="ps-acoes">
        {podeArquivo
          ? <button className="botao" onClick={compartilhar} disabled={!blob}>Compartilhar imagem</button>
          : <a className="botao" href={url ?? undefined} download={nomeArquivo} aria-disabled={!url}>Baixar imagem</a>}
        <button className="botao botao-contorno" onClick={copiar}>Copiar link</button>
      </div>
      {msg && <p className="miudo" aria-live="polite">{msg}</p>}
      <p className="miudo">A imagem é feita no seu aparelho. Sua nota só aparece se você marcar a opção acima.</p>
    </div>
  );
}
