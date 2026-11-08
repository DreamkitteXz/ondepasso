"use client";
// Barra do leitor: título, página atual, navegação, zoom, modo, índice, gabarito, download, original e tela cheia.
import { useEffect, useState } from "react";
import type { ModoLeitor } from "@/lib/leitor/preferencias";

const I = {
  ant: <path d="m15 18-6-6 6-6" />, prox: <path d="m9 18 6-6-6-6" />,
  menos: <path d="M5 12h14" />, mais: <path d="M12 5v14M5 12h14" />,
  indice: <><path d="M4 6h16M4 12h16M4 18h10" /></>,
  gabarito: <><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></>,
  baixar: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></>,
  original: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  ajustes: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  cheia: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  sair: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  livro: <><path d="M12 6C10.5 4.8 8 4.4 4 4.4v14c4 0 6.5.4 8 1.6 1.5-1.2 4-1.6 8-1.6v-14c-4 0-6.5.4-8 1.6Z" /><path d="M12 6v14" /></>,
  rolagem: <><rect x="6" y="3" width="12" height="8" rx="1" /><rect x="6" y="13" width="12" height="8" rx="1" /></>,
};
function Icone({ d }: { d: React.ReactNode }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
}

type Props = {
  titulo: string; subtitulo: string; pagina: number; paginaFim: number; total: number;
  irPara: (n: number) => void; anterior: () => void; proxima: () => void;
  zoom: number; mudarZoom: (z: number) => void; /** Zoom em que a dupla ocupa toda a largura (null se já ocupa). */ zoomLargura: number | null;
  modo: ModoLeitor; mudarModo: (m: ModoLeitor) => void;
  painel: string | null; alternarPainel: (p: "indice" | "gabarito" | "ajustes") => void;
  urlPdf: string; aoBaixar: () => void; telaCheia: boolean; alternarTelaCheia: () => void; temGabarito: boolean;
};

export function ReaderToolbar(p: Props) {
  const [campo, setCampo] = useState(String(p.pagina));
  useEffect(() => setCampo(String(p.pagina)), [p.pagina]);
  const enviar = () => {
    const n = Number(campo);
    if (Number.isInteger(n) && n >= 1 && n <= p.total) p.irPara(n); else setCampo(String(p.pagina));
  };
  return (
    <div className="leitor-barra" role="toolbar" aria-label="Controles do leitor">
      <div className="leitor-barra-titulo">
        <strong>{p.titulo}</strong>
        <span>{p.subtitulo}</span>
      </div>
      <div className="leitor-barra-nav">
        <button type="button" className="botao-icone" onClick={p.anterior} disabled={p.pagina <= 1} aria-label="Página anterior" title="Página anterior (←)"><Icone d={I.ant} /></button>
        <label className="leitor-pagina">
          <span className="sr-only">Ir para a página</span>
          <input inputMode="numeric" value={campo} onChange={(e) => setCampo(e.target.value.replace(/\D/g, "").slice(0, 3))}
            onKeyDown={(e) => { if (e.key === "Enter") enviar(); }} onBlur={enviar} aria-describedby="leitor-total" />
          <span id="leitor-total" aria-hidden="true">{p.paginaFim > p.pagina ? `e ${p.paginaFim} ` : ""}de {p.total}</span>
        </label>
        <button type="button" className="botao-icone" onClick={p.proxima} disabled={p.paginaFim >= p.total} aria-label="Próxima página" title="Próxima página (→)"><Icone d={I.prox} /></button>
      </div>
      <div className="leitor-barra-acoes">
        <div className="leitor-zoom" role="group" aria-label="Zoom">
          <button type="button" className="botao-icone" onClick={() => p.mudarZoom(p.zoom - 0.25)} disabled={p.zoom <= 1} aria-label="Diminuir zoom"><Icone d={I.menos} /></button>
          {p.zoomLargura ? (
            <button type="button" className="leitor-zoom-valor" onClick={() => p.mudarZoom(Math.abs(p.zoom - p.zoomLargura!) < 0.02 ? 1 : p.zoomLargura!)}
              title={Math.abs(p.zoom - p.zoomLargura) < 0.02 ? "Ver a página inteira" : "Ajustar à largura"}
              aria-label={`Zoom ${Math.round(p.zoom * 100)}%. ${Math.abs(p.zoom - p.zoomLargura) < 0.02 ? "Ver a página inteira" : "Ajustar à largura"}`}>{Math.round(p.zoom * 100)}%</button>
          ) : <span>{Math.round(p.zoom * 100)}%</span>}
          <button type="button" className="botao-icone" onClick={() => p.mudarZoom(p.zoom + 0.25)} disabled={p.zoom >= 3} aria-label="Aumentar zoom"><Icone d={I.mais} /></button>
        </div>
        <div className="leitor-modo" role="radiogroup" aria-label="Modo de leitura">
          <button type="button" role="radio" aria-checked={p.modo === "livro"} className={p.modo === "livro" ? "ativo" : ""} onClick={() => p.mudarModo("livro")} title="Modo livro"><Icone d={I.livro} /><span>Livro</span></button>
          <button type="button" role="radio" aria-checked={p.modo === "leitura"} className={p.modo === "leitura" ? "ativo" : ""} onClick={() => p.mudarModo("leitura")} title="Modo leitura (rolagem)"><Icone d={I.rolagem} /><span>Leitura</span></button>
        </div>
        <button type="button" className={`botao-icone${p.painel === "indice" ? " ativo" : ""}`} onClick={() => p.alternarPainel("indice")} aria-pressed={p.painel === "indice"} aria-label="Índice e marcadores" title="Índice"><Icone d={I.indice} /></button>
        <button type="button" className={`botao-icone${p.painel === "gabarito" ? " ativo" : ""}`} onClick={() => p.alternarPainel("gabarito")} aria-pressed={p.painel === "gabarito"} aria-label="Gabarito" title={p.temGabarito ? "Gabarito oficial" : "Gabarito indisponível"}><Icone d={I.gabarito} /></button>
        <a className="botao-icone" href={p.urlPdf} target="_blank" rel="noopener" download onClick={p.aoBaixar} aria-label="Baixar PDF" title="Baixar PDF"><Icone d={I.baixar} /></a>
        <a className="botao-icone so-desktop" href={p.urlPdf} target="_blank" rel="noopener" aria-label="Abrir documento original no site do Inep" title="Abrir original (Inep)"><Icone d={I.original} /></a>
        <button type="button" className={`botao-icone${p.painel === "ajustes" ? " ativo" : ""}`} onClick={() => p.alternarPainel("ajustes")} aria-pressed={p.painel === "ajustes"} aria-label="Configurações do leitor" title="Configurações"><Icone d={I.ajustes} /></button>
        <button type="button" className="botao-icone" onClick={p.alternarTelaCheia} aria-pressed={p.telaCheia} aria-label={p.telaCheia ? "Sair da tela cheia" : "Tela cheia"} title={p.telaCheia ? "Sair da tela cheia (Esc)" : "Tela cheia"}><Icone d={p.telaCheia ? I.sair : I.cheia} /></button>
      </div>
    </div>
  );
}
