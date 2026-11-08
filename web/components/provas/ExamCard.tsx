"use client";
// Uma prova (um dia de uma aplicação) na biblioteca. As cores do caderno ficam dentro do cartão: trazem as mesmas
// questões em outra ordem, então a pessoa escolhe a cor da prova dela e o gabarito acompanha a escolha.
import { useEffect, useMemo, useState } from "react";
import type { Grupo, Prova } from "@/lib/provas-tipos";
import { AREA_ROTULO, IDIOMA_ROTULO, VARIANTE_ROTULO, diaRotulo, megas } from "@/lib/provas-tipos";
import { registrar } from "@/lib/analytics";
import { ExamCover } from "./ExamCover";

type Props = { g: Grupo; inicial: Prova; compacto?: boolean; salvas: string[]; aoSalvar: (id: string) => void };

const listaAreas = (g: Grupo) => {
  const a = g.areas.map((x) => AREA_ROTULO[x]);
  if (g.redacao) a.push("Redação");
  return a.length > 2 ? `${a.slice(0, -1).join(", ")} e ${a[a.length - 1]}` : a.join(" e ");
};

export function ExamCard({ g, inicial, compacto = false, salvas, aoSalvar }: Props) {
  const [sel, setSel] = useState<Prova>(inicial);
  useEffect(() => setSel(inicial), [inicial]);

  // Cores únicas (a aplicação digital repete cada cor em inglês e espanhol).
  const cores = useMemo(() => {
    const vistas = new Map<number, Prova>();
    for (const p of g.cores) if (!vistas.has(p.caderno)) vistas.set(p.caderno, p);
    return [...vistas.values()];
  }, [g]);
  const escolher = (p: Prova) => {
    const mesmoIdioma = g.cores.find((q) => q.caderno === p.caderno && q.idioma === sel.idioma);
    setSel(mesmoIdioma ?? p);
  };
  const trocarIdioma = (idioma: "ingles" | "espanhol") => {
    const q = g.cores.find((x) => x.caderno === sel.caderno && x.idioma === idioma);
    if (q) setSel(q);
  };
  const nome = (p: Prova) => (p.variante ? VARIANTE_ROTULO[p.variante] : p.corRotulo);
  const titulo = `${diaRotulo(g.dia)}${g.modalidade !== "regular" ? ` · ${g.modalidadeRotulo}` : ""}`;
  const salva = salvas.includes(sel.id);
  // Leque: o caderno escolhido na frente, outras cores atrás.
  const leque = [sel, ...cores.filter((p) => p.caderno !== sel.caderno)].slice(0, 4);
  const rotuloCaderno = `caderno ${nome(sel).toLowerCase()}${sel.idioma ? ` (${IDIOMA_ROTULO[sel.idioma].toLowerCase()})` : ""}`;

  return (
    <article className={`prova${compacto ? " compacto" : ""}`} style={{ ["--cor-caderno" as string]: sel.corHex }} aria-labelledby={`t-${g.chave}`}>
      {!compacto && (
        <a className="prova-leque" href={`/provas/${sel.id}/#ler`} tabIndex={-1} aria-hidden="true">
          {leque.map((p, i) => (
            <span key={p.caderno} className="leque-folha" style={{ ["--i" as string]: i, zIndex: 10 - i }}><ExamCover p={p} /></span>
          ))}
        </a>
      )}
      <div className="prova-corpo">
        <header>
          <div className="prova-titulo">
            <h3 id={`t-${g.chave}`}><a href={`/provas/${sel.id}/`}>{compacto ? titulo : diaRotulo(g.dia)}</a></h3>
          <span className="prova-icones">
              <a className="botao-icone" href={sel.prova.url} target="_blank" rel="noopener" download
                onClick={() => registrar("enem_pdf_baixado", { prova: sel.id, arquivo: "prova", origem: "biblioteca" })}
                aria-label={`Baixar o PDF do ${rotuloCaderno} (${megas(sel.prova.bytes)})`} title={`Baixar PDF (${megas(sel.prova.bytes)})`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></svg>
              </a>
              <button type="button" className={`botao-icone${salva ? " ativo" : ""}`} aria-pressed={salva} onClick={() => aoSalvar(sel.id)}
                aria-label={salva ? `Tirar o ${rotuloCaderno} das salvas` : `Salvar o ${rotuloCaderno} para estudar depois`} title={salva ? "Salva" : "Salvar para depois"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={salva ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
              </button>
            </span>
          </div>
          <p>{listaAreas(g)}. {g.questoes} questões{g.redacao ? " e a redação" : ""}.</p>
        </header>

        <fieldset className="seletor-cor">
          <legend>Cor do seu caderno</legend>
          <div className="amostras">
            {cores.map((p) => (
              <label key={p.caderno} className={`amostra${p.caderno === sel.caderno ? " marcada" : ""}`}>
                <input type="radio" name={`cor-${g.chave}`} checked={p.caderno === sel.caderno} onChange={() => escolher(p)} />
                <span className="tinta" style={{ background: p.corHex }} aria-hidden="true" />
                {p.corRotulo}
              </label>
            ))}
          </div>
          {g.especiais.length > 0 && (
            <div className="amostras especiais">
              <span>Atendimento especializado</span>
              {g.especiais.map((p) => (
                <label key={p.caderno} className={`amostra especial${p.caderno === sel.caderno ? " marcada" : ""}`}>
                  <input type="radio" name={`cor-${g.chave}`} checked={p.caderno === sel.caderno} onChange={() => setSel(p)} />
                  <span className="tinta" style={{ background: p.corHex }} aria-hidden="true" />
                  {VARIANTE_ROTULO[p.variante!]}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {g.idiomas.length > 1 && !sel.variante && (
          <fieldset className="seletor-idioma">
            <legend>Língua estrangeira</legend>
            <div className="segmentado">
              {g.idiomas.map((i) => (
                <label key={i} className={sel.idioma === i ? "marcada" : ""}>
                  <input type="radio" name={`idioma-${g.chave}`} checked={sel.idioma === i} onChange={() => trocarIdioma(i)} />{IDIOMA_ROTULO[i]}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="prova-acoes">
          <a className="botao" href={`/provas/${sel.id}/#ler`}>Ler o {rotuloCaderno}</a>
          {sel.gabarito ? (
            <a className="botao botao-contorno" href={sel.gabarito.url} target="_blank" rel="noopener"
              onClick={() => registrar("enem_gabarito_aberto", { prova: sel.id, modo: "biblioteca" })}>Gabarito</a>
          ) : (
            <span className="gabarito-falta" title="O link oficial deste gabarito está fora do ar no site do Inep">Gabarito fora do ar no Inep</span>
          )}
        </div>
      </div>
    </article>
  );
}
