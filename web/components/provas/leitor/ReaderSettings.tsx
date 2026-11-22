"use client";
// Configurações do leitor (ficam só neste aparelho).
import type { ModoLeitor } from "@/lib/leitor/preferencias";

function Interruptor({ ligado, aoMudar, rotulo, detalhe }: { ligado: boolean; aoMudar: (v: boolean) => void; rotulo: string; detalhe?: string }) {
  return (
    <label className="interruptor">
      <span><strong>{rotulo}</strong>{detalhe && <span className="miudo">{detalhe}</span>}</span>
      <input type="checkbox" role="switch" checked={ligado} onChange={(e) => aoMudar(e.target.checked)} aria-checked={ligado} />
      <i aria-hidden="true" />
    </label>
  );
}

export function ReaderSettings({ animacoes, som, modo, mudar, zoom, mudarZoom }: { animacoes: boolean; som: boolean; modo: ModoLeitor; mudar: (p: { animacoes?: boolean; som?: boolean; modo?: ModoLeitor }) => void; zoom: number; mudarZoom: (z: number) => void }) {
  return (
    <div className="leitor-ajustes">
      <h3>Configurações do leitor</h3>
      <div className="ajuste-zoom" role="group" aria-label="Zoom">
        <strong>Zoom</strong>
        <div>
          <button type="button" className="botao-icone" onClick={() => mudarZoom(zoom - 0.25)} disabled={zoom <= 1} aria-label="Diminuir zoom">−</button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" className="botao-icone" onClick={() => mudarZoom(zoom + 0.25)} disabled={zoom >= 3} aria-label="Aumentar zoom">+</button>
        </div>
      </div>
      <Interruptor ligado={animacoes} aoMudar={(v) => mudar({ animacoes: v })} rotulo="Animação de virar página"
        detalhe={animacoes ? "Arraste a ponta da folha ou use as setas." : "As páginas trocam na hora, sem dobra."} />
      <Interruptor ligado={som} aoMudar={(v) => mudar({ som: v })} rotulo="Som de papel" detalhe="Um som discreto ao virar a página." />
      <fieldset className="ajuste-modo">
        <legend>Modo</legend>
        <label><input type="radio" name="modo-leitor" checked={modo === "livro"} onChange={() => mudar({ modo: "livro" })} /> Livro (duas páginas no computador)</label>
        <label><input type="radio" name="modo-leitor" checked={modo === "leitura"} onChange={() => mudar({ modo: "leitura" })} /> Leitura (rolagem contínua)</label>
        <label><input type="radio" name="modo-leitor" checked={modo === "questao"} onChange={() => mudar({ modo: "questao" })} /> Por questão (uma de cada vez, resposta escondida)</label>
      </fieldset>
      <p className="miudo">Atalhos: ← e → mudam de página; Esc sai da tela cheia. No celular, use dois dedos para dar zoom. Suas escolhas ficam só neste aparelho.</p>
    </div>
  );
}
