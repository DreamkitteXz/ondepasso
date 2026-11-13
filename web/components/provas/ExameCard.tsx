"use client";
// Uma prova de outro vestibular (Fuvest, Unicamp) na biblioteca: vestibular + edição + fase + dia.
// As versões do caderno ficam dentro do cartão, e o gabarito mostrado é sempre o da versão escolhida.
// Estes arquivos não abrem no leitor do site (o servidor oficial não libera): os botões levam ao site oficial.
import { useEffect, useState } from "react";
import type { Documento, Exame, VersaoExame } from "@/lib/provas-tipos";
import { DISPONIBILIDADE_ROTULO, VESTIBULAR_ROTULO, gabaritoDaVersao, hostDe as host, resumoExame, rotuloExame } from "@/lib/provas-tipos";
import { registrar } from "@/lib/analytics";

export const Fora = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4 10 14M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>;
export function LinkOficial({ d, exame, className, children }: { d: Documento; exame: string; className?: string; children: React.ReactNode }) {
  return (
    <a className={className} href={d.url} target="_blank" rel="noopener" title={`Abre em ${host(d.url)}`}
      onClick={() => registrar("enem_pdf_baixado", { prova: exame, arquivo: d.tipo === "prova" ? "prova" : d.tipo === "gabarito" ? "gabarito" : "complementar", origem: "oficial" })}>
      {children}<Fora /><span className="sr-only"> (abre em {host(d.url)}, em outra aba)</span>
    </a>
  );
}

type Props = { e: Exame; inicial: VersaoExame; salvas: string[]; aoSalvar: (id: string) => void };

export function ExameCard({ e, inicial, salvas, aoSalvar }: Props) {
  const [sel, setSel] = useState<VersaoExame>(inicial);
  useEffect(() => setSel(inicial), [inicial]);
  const salva = salvas.includes(e.id);
  const nome = `${VESTIBULAR_ROTULO[e.vestibular]} ${e.edicao}, ${rotuloExame(e).toLowerCase()}`;
  const gabarito = gabaritoDaVersao(e, sel.codigo);
  const outros = e.complementares.filter((c) => c.tipo !== "gabarito");
  const varias = e.versoes.length > 1;

  return (
    <article className="prova compacto exame" aria-labelledby={`t-${e.id}`}>
      <div className="prova-corpo">
        <header>
          <div className="prova-titulo">
            <h3 id={`t-${e.id}`}><a href={`/provas/${e.id}/`}>{rotuloExame(e)}</a></h3>
            <span className="prova-icones">
              <button type="button" className={`botao-icone${salva ? " ativo" : ""}`} aria-pressed={salva} onClick={() => aoSalvar(e.id)}
                aria-label={salva ? `Tirar ${nome} das salvas` : `Salvar ${nome} para estudar depois`} title={salva ? "Salva" : "Salvar para depois"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={salva ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
              </button>
            </span>
          </div>
          <p>{resumoExame(e)}</p>
        </header>

        {varias && (
          <fieldset className="seletor-cor">
            <legend>Versão do seu caderno</legend>
            <div className="amostras">
              {e.versoes.map((v) => (
                <label key={v.codigo} className={`amostra versao${v.codigo === sel.codigo ? " marcada" : ""}`}>
                  <input type="radio" name={`versao-${e.id}`} checked={v.codigo === sel.codigo} onChange={() => setSel(v)} />
                  {v.codigo}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {e.versoes.length > 0 && (
          <div className="prova-acoes">
            <LinkOficial d={sel.prova} exame={e.id} className="botao">Abrir {varias ? `a prova ${sel.codigo}` : "a prova"} no site oficial</LinkOficial>
            {gabarito && <LinkOficial d={gabarito} exame={e.id} className="botao botao-contorno">{gabarito.retificado ? "Gabarito retificado" : "Gabarito"}</LinkOficial>}
          </div>
        )}

        {(outros.length > 0 || e.lacunas.length > 0) && (
          <ul className="exame-docs">
            {outros.map((c) => <li key={c.url + c.rotulo}><LinkOficial d={c} exame={e.id}>{c.rotulo}</LinkOficial></li>)}
            {e.lacunas.map((l) => <li key={l.tipo} className="exame-falta" title={l.nota}>{l.tipo === "respostas-esperadas" ? "Respostas esperadas" : l.tipo === "gabarito" ? "Gabarito" : "Prova"}: {DISPONIBILIDADE_ROTULO[l.estado]}</li>)}
          </ul>
        )}
        {gabarito?.versoes === "todas" && varias && <p className="miudo exame-nota">O gabarito oficial traz todas as versões: confira a coluna da prova {sel.codigo}.</p>}
      </div>
    </article>
  );
}
