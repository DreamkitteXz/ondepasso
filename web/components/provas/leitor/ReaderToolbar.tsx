"use client";
// Controles do leitor, em duas peças: uma faixa fina no topo (fechar, título, gabarito, índice e o resto)
// e uma ilha flutuante embaixo com o que se usa o tempo todo (página, zoom e modo).
import { useEffect, useState } from "react";
import type { ModoLeitor } from "@/lib/leitor/preferencias";

const I = {
  ant: <path d="m15 18-6-6 6-6" />, prox: <path d="m9 18 6-6-6-6" />,
  menos: <path d="M5 12h14" />, mais: <path d="M12 5v14M5 12h14" />,
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  indice: <><path d="M4 6h16M4 12h16M4 18h10" /></>,
  gabarito: <><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></>,
  baixar: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></>,
  ajustes: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
  cheia: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  sair: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  livro: <><path d="M12 6C10.5 4.8 8 4.4 4 4.4v14c4 0 6.5.4 8 1.6 1.5-1.2 4-1.6 8-1.6v-14c-4 0-6.5.4-8 1.6Z" /><path d="M12 6v14" /></>,
  rolagem: <><rect x="6" y="3" width="12" height="8" rx="1" /><rect x="6" y="13" width="12" height="8" rx="1" /></>,
  questao: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17h.01" /></>,
};
function Icone({ d }: { d: React.ReactNode }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
}

type Props = {
  titulo: string; subtitulo: string; pagina: number; paginaFim: number; total: number;
  irPara: (n: number) => void; anterior: () => void; proxima: () => void;
  zoom: number; mudarZoom: (z: number) => void; /** Zoom em que a dupla ocupa toda a largura (null se já ocupa). */ zoomLargura: number | null;
  modo: ModoLeitor; mudarModo: (m: ModoLeitor) => void;
  painel: string | null; alternarPainel: (p: "indice" | "gabarito" | "ajustes") => void;
  urlPdf: string; aoBaixar: () => void; telaCheia: boolean; alternarTelaCheia: () => void; temGabarito: boolean; aoFechar?: () => void;
};

export function ReaderToolbar(p: Props) {
  const [campo, setCampo] = useState(String(p.pagina));
  useEffect(() => setCampo(String(p.pagina)), [p.pagina]);
  const enviar = () => {
    const n = Number(campo);
    if (Number.isInteger(n) && n >= 1 && n <= p.total) p.irPara(n); else setCampo(String(p.pagina));
  };
  const naLargura = p.zoomLargura != null && Math.abs(p.zoom - p.zoomLargura) < 0.02;
  return (
    <>
      <div className="leitor-topo" role="toolbar" aria-label="Leitor">
        {p.aoFechar && (
          <button type="button" className="lt-fechar" onClick={p.aoFechar} title="Fechar o leitor (Esc)"><Icone d={I.fechar} /><span>Fechar</span></button>
        )}
        <div className="lt-titulo"><strong>{p.titulo}</strong><span>{p.subtitulo}</span></div>
        <div className="lt-acoes">
          <button type="button" className={`lt-botao${p.painel === "gabarito" ? " ativo" : ""}`} onClick={() => p.alternarPainel("gabarito")} aria-pressed={p.painel === "gabarito"} title={p.temGabarito ? "Gabarito oficial" : "Gabarito indisponível"}><Icone d={I.gabarito} /><span>Gabarito</span></button>
          <button type="button" className={`lt-botao${p.painel === "indice" ? " ativo" : ""}`} onClick={() => p.alternarPainel("indice")} aria-pressed={p.painel === "indice"} title="Ir a uma questão, página ou marcador"><Icone d={I.indice} /><span>Questões</span></button>
          <a className="botao-icone" href={p.urlPdf} target="_blank" rel="noopener" download onClick={p.aoBaixar} aria-label="Baixar o PDF oficial" title="Baixar o PDF oficial"><Icone d={I.baixar} /></a>
          <button type="button" className={`botao-icone${p.painel === "ajustes" ? " ativo" : ""}`} onClick={() => p.alternarPainel("ajustes")} aria-pressed={p.painel === "ajustes"} aria-label="Ajustes do leitor" title="Ajustes"><Icone d={I.ajustes} /></button>
          <button type="button" className="botao-icone so-desktop" onClick={p.alternarTelaCheia} aria-pressed={p.telaCheia} aria-label={p.telaCheia ? "Sair da tela cheia" : "Tela cheia"} title={p.telaCheia ? "Sair da tela cheia (Esc)" : "Tela cheia"}><Icone d={p.telaCheia ? I.sair : I.cheia} /></button>
        </div>
      </div>

      <div className="leitor-ilha" role="toolbar" aria-label="Página, zoom e modo">
        <div className="li-grupo">
          <button type="button" className="botao-icone" onClick={p.anterior} disabled={p.pagina <= 1} aria-label="Página anterior" title="Página anterior (←)"><Icone d={I.ant} /></button>
          <label className="leitor-pagina">
            <span className="sr-only">Ir para a página</span>
            <input inputMode="numeric" value={campo} onChange={(e) => setCampo(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onKeyDown={(e) => { if (e.key === "Enter") enviar(); }} onBlur={enviar} aria-describedby="leitor-total" />
            <span id="leitor-total" aria-hidden="true">{p.paginaFim > p.pagina ? `e ${p.paginaFim} ` : ""}de {p.total}</span>
          </label>
          <button type="button" className="botao-icone" onClick={p.proxima} disabled={p.paginaFim >= p.total} aria-label="Próxima página" title="Próxima página (→)"><Icone d={I.prox} /></button>
        </div>
        <i className="li-div" aria-hidden="true" />
        <div className="li-grupo leitor-zoom" role="group" aria-label="Zoom">
          <button type="button" className="botao-icone" onClick={() => p.mudarZoom(p.zoom - 0.25)} disabled={p.zoom <= 1} aria-label="Diminuir zoom" title="Diminuir (−)"><Icone d={I.menos} /></button>
          {p.zoomLargura ? (
            <button type="button" className="leitor-zoom-valor" onClick={() => p.mudarZoom(naLargura ? 1 : p.zoomLargura!)}
              title={naLargura ? "Ver a página inteira" : "Ajustar à largura"}
              aria-label={`Zoom ${Math.round(p.zoom * 100)}%. ${naLargura ? "Ver a página inteira" : "Ajustar à largura"}`}>{Math.round(p.zoom * 100)}%</button>
          ) : <span>{Math.round(p.zoom * 100)}%</span>}
          <button type="button" className="botao-icone" onClick={() => p.mudarZoom(p.zoom + 0.25)} disabled={p.zoom >= 3} aria-label="Aumentar zoom" title="Aumentar (+)"><Icone d={I.mais} /></button>
        </div>
        <i className="li-div leitor-zoom" aria-hidden="true" />
        <div className="leitor-modo" role="radiogroup" aria-label="Modo de leitura">
          <button type="button" role="radio" aria-checked={p.modo === "livro"} className={p.modo === "livro" ? "ativo" : ""} onClick={() => p.mudarModo("livro")} aria-label="Caderno" title="Folhear como um caderno"><Icone d={I.livro} /><span>Caderno</span></button>
          <button type="button" role="radio" aria-checked={p.modo === "leitura"} className={p.modo === "leitura" ? "ativo" : ""} onClick={() => p.mudarModo("leitura")} aria-label="Rolagem" title="Ler rolando a página"><Icone d={I.rolagem} /><span>Rolagem</span></button>
          <button type="button" role="radio" aria-checked={p.modo === "questao"} className={p.modo === "questao" ? "ativo" : ""} onClick={() => p.mudarModo("questao")} aria-label="Por questão" title="Uma questão por vez, com a resposta escondida"><Icone d={I.questao} /><span>Por questão</span></button>
        </div>
      </div>
    </>
  );
}
