"use client";
// Índice do leitor: páginas, questões (só quando o mapeamento pelo texto oficial fecha a sequência inteira) e marcadores.
import { useState } from "react";
import type { IndiceQuestoes } from "@/lib/leitor/pdf";
import type { Area } from "@/lib/provas-tipos";
import { AREA_QUESTOES, AREA_ROTULO } from "@/lib/provas-tipos";

type Props = {
  total: number; pagina: number; irPara: (n: number) => void;
  areas: Area[]; indice: IndiceQuestoes | null; mapeando: number | null;
  marcadores: number[]; alternarMarcador: (n: number) => void;
  revisar: number[]; alternarRevisar: (q: number) => void;
};

export function ExamNavigation(p: Props) {
  const [aba, setAba] = useState<"paginas" | "questoes" | "marcados">("questoes");
  const marcada = p.marcadores.includes(p.pagina);
  return (
    <div className="leitor-indice">
      <div className="abas" role="tablist" aria-label="Índice">
        {([["questoes", "Questões"], ["paginas", "Páginas"], ["marcados", "Marcados"]] as const).map(([k, r]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} className={aba === k ? "ativo" : ""} onClick={() => setAba(k)}>{r}</button>
        ))}
      </div>

      {aba === "paginas" && (
        <div role="tabpanel">
          <button type="button" className={`botao botao-contorno botao-pequeno marcar${marcada ? " ativo" : ""}`} aria-pressed={marcada} onClick={() => p.alternarMarcador(p.pagina)}>
            {marcada ? "Página marcada ✓" : `Marcar página ${p.pagina}`}
          </button>
          <ol className="grade-paginas">
            {Array.from({ length: p.total }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <button type="button" className={`${n === p.pagina ? "atual" : ""}${p.marcadores.includes(n) ? " marcada" : ""}`} aria-current={n === p.pagina ? "page" : undefined} onClick={() => p.irPara(n)} aria-label={`Página ${n}${p.marcadores.includes(n) ? " (marcada)" : ""}`}>{n}</button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {aba === "questoes" && (
        <div role="tabpanel">
          {p.indice?.completo ? (
            <>
              <p className="miudo">Toque numa questão para ir até a página dela. A estrela marca para revisar (fica só neste aparelho).</p>
              {p.areas.map((a) => {
                const [de, ate] = AREA_QUESTOES[a];
                return (
                  <section key={a} className="indice-area">
                    <h4>{AREA_ROTULO[a]} <span className="miudo">questões {de}–{ate}</span></h4>
                    <ol className="grade-questoes">
                      {Array.from({ length: ate - de + 1 }, (_, i) => de + i).map((q) => {
                        const pg = p.indice!.pagina[q];
                        const rev = p.revisar.includes(q);
                        return (
                          <li key={q} className={rev ? "revisar" : ""}>
                            <button type="button" onClick={() => p.irPara(pg)} aria-label={`Questão ${q}, página ${pg}`} className={pg === p.pagina ? "atual" : ""}>{q}</button>
                            <button type="button" className="estrela" aria-pressed={rev} aria-label={rev ? `Desmarcar questão ${q}` : `Marcar questão ${q} para revisar`} onClick={() => p.alternarRevisar(q)}>★</button>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                );
              })}
            </>
          ) : p.indice ? (
            <p className="indice-aviso">Não deu para mapear todas as questões deste caderno com segurança ({p.indice.encontradas} de {p.indice.esperadas}). Use a aba Páginas.</p>
          ) : (
            <p className="indice-aviso" role="status">Mapeando as questões pelo texto da prova… {p.mapeando != null ? `${p.mapeando} de ${p.total} páginas` : ""}</p>
          )}
        </div>
      )}

      {aba === "marcados" && (
        <div role="tabpanel">
          {p.marcadores.length === 0 && p.revisar.length === 0 ? (
            <p className="indice-aviso">Nada marcado ainda. Marque páginas na aba Páginas e questões com a estrela.</p>
          ) : (
            <>
              {p.marcadores.length > 0 && <><h4>Páginas</h4><ul className="lista-marcados">{[...p.marcadores].sort((a, b) => a - b).map((n) => <li key={n}><button type="button" onClick={() => p.irPara(n)}>Página {n}</button><button type="button" className="botao-icone" aria-label={`Remover marcador da página ${n}`} onClick={() => p.alternarMarcador(n)}>×</button></li>)}</ul></>}
              {p.revisar.length > 0 && <><h4>Para revisar</h4><ul className="lista-marcados">{[...p.revisar].sort((a, b) => a - b).map((q) => <li key={q}><button type="button" disabled={!p.indice?.completo} onClick={() => p.indice?.completo && p.irPara(p.indice.pagina[q])}>Questão {q}</button><button type="button" className="botao-icone" aria-label={`Desmarcar questão ${q}`} onClick={() => p.alternarRevisar(q)}>×</button></li>)}</ul></>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
