"use client";
// Banco de questões do Enem (/provas/questoes/): todas as questões do acervo numa lista só, com filtros por ano,
// aplicação, área e língua estrangeira, e pelo que a pessoa marcou neste navegador (para revisar, resposta vista).
// Cada questão abre no leitor, no modo por questão (recorte do PDF oficial, resposta escondida).
// A lista usa o caderno de referência de cada aplicação/dia (ver questoesDoGrupo): as outras cores têm as mesmas
// questões em outra ordem, sem vínculo oficial entre elas.
// Disciplina e assunto dependem de classificação revisada e ainda não entram como filtro.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AREA_QUESTOES, AREA_ROTULO, FILTROS_QUESTOES_VAZIOS, MODALIDADE_CURTA, cadernosReferencia, chaveQuestao, diaRotulo, filtrarQuestoes,
  filtrosQuestoesDaUrl, filtrosQuestoesParaUrl, questoesDoGrupo, type Area, type FiltrosQuestoes, type Grupo, type MarcasCaderno, type Modalidade, type QuestaoItem,
} from "@/lib/provas-tipos";
import { estudosSalvos } from "@/lib/leitor/preferencias";

const AREAS: Area[] = ["linguagens", "humanas", "natureza", "matematica"];
const MODALIDADES: { id: Modalidade; rotulo: string }[] = [
  { id: "regular", rotulo: "Regular" }, { id: "reaplicacao", rotulo: "Reaplicação e PPL" }, { id: "digital", rotulo: "Digital" }, { id: "belem", rotulo: "Belém" },
];
const SITUACOES = [
  { id: "todas", rotulo: "Todas" }, { id: "revisar", rotulo: "Para revisar" }, { id: "vistas", rotulo: "Resposta vista" }, { id: "nao-vistas", rotulo: "Ainda não vistas" },
] as const;
const POR_VEZ = 6;

export function QuestionBank({ grupos, anos }: { grupos: Grupo[]; anos: number[] }) {
  const [f, setF] = useState<FiltrosQuestoes>(FILTROS_QUESTOES_VAZIOS);
  const [marcas, setMarcas] = useState<Map<string, MarcasCaderno>>(new Map());
  const [mostrar, setMostrar] = useState(POR_VEZ);
  const [pronto, setPronto] = useState(false);

  const todas = useMemo(() => grupos.flatMap(questoesDoGrupo), [grupos]);
  const porGrupo = useMemo(() => new Map(grupos.map((g) => [g.chave, g])), [grupos]);

  const lerMarcas = useCallback(() => {
    const m = new Map<string, MarcasCaderno>();
    for (const [id, e] of estudosSalvos()) m.set(id, { revisar: e.revisar, vistas: e.vistas ?? [] });
    setMarcas(m);
  }, []);
  useEffect(() => {
    setF(filtrosQuestoesDaUrl(new URLSearchParams(location.search)));
    lerMarcas();
    setPronto(true);
    // Voltando do leitor (outra aba ou botão voltar), as marcas podem ter mudado.
    const ao = () => { if (document.visibilityState === "visible") lerMarcas(); };
    window.addEventListener("pageshow", lerMarcas);
    document.addEventListener("visibilitychange", ao);
    return () => { window.removeEventListener("pageshow", lerMarcas); document.removeEventListener("visibilitychange", ao); };
  }, [lerMarcas]);

  const mudar = (p: Partial<FiltrosQuestoes>) => {
    const n = { ...f, ...p };
    setF(n); setMostrar(POR_VEZ);
    history.replaceState(null, "", location.pathname + filtrosQuestoesParaUrl(n));
  };

  const filtradas = useMemo(() => filtrarQuestoes(todas, f, marcas), [todas, f, marcas]);
  const blocos = useMemo(() => {
    const m = new Map<string, QuestaoItem[]>();
    for (const q of filtradas) { const l = m.get(q.grupo); if (l) l.push(q); else m.set(q.grupo, [q]); }
    return [...m].map(([chave, qs]) => ({ g: porGrupo.get(chave)!, qs }))
      .sort((a, b) => b.g.ano - a.g.ano || ordemMod(a.g.modalidade) - ordemMod(b.g.modalidade) || a.g.dia - b.g.dia);
  }, [filtradas, porGrupo]);
  // Contam só o que a lista mostra (cadernos de referência), com os outros filtros aplicados.
  const semSituacao = useMemo(() => ({ ...f, situacao: "todas" as const }), [f]);
  const totalRevisar = useMemo(() => filtrarQuestoes(todas, { ...semSituacao, situacao: "revisar" }, marcas).length, [todas, semSituacao, marcas]);
  const totalVistas = useMemo(() => filtrarQuestoes(todas, { ...semSituacao, situacao: "vistas" }, marcas).length, [todas, semSituacao, marcas]);
  const filtrando = filtrosQuestoesParaUrl(f) !== "";

  return (
    <div className="banco" data-pronto={pronto ? "1" : undefined}>
      <div className="controles banco-controles" role="search" aria-label="Filtrar questões">
        <div className="controle-anos" role="group" aria-label="Ano">
          <button type="button" aria-pressed={f.ano == null} onClick={() => mudar({ ano: null })}>Todos os anos</button>
          {anos.map((a) => <button key={a} type="button" aria-pressed={f.ano === a} onClick={() => mudar({ ano: f.ano === a ? null : a })}>{a}</button>)}
        </div>
        <div className="controle-dias banco-areas" role="group" aria-label="Área">
          <button type="button" aria-pressed={f.area == null} onClick={() => mudar({ area: null })}>Todas as áreas</button>
          {AREAS.map((a) => (
            <button key={a} type="button" aria-pressed={f.area === a} onClick={() => mudar({ area: f.area === a ? null : a })} title={`Questões ${AREA_QUESTOES[a][0]} a ${AREA_QUESTOES[a][1]}`}>
              <span className={`banco-ponto area-${a}`} aria-hidden="true" />{AREA_ROTULO[a]}
            </button>
          ))}
        </div>
        <div className="controle-dias" role="group" aria-label="Situação">
          {SITUACOES.map((s) => (
            <button key={s.id} type="button" aria-pressed={f.situacao === s.id} onClick={() => mudar({ situacao: s.id })}>
              {s.rotulo}{s.id === "revisar" && totalRevisar ? <small> {totalRevisar}</small> : s.id === "vistas" && totalVistas ? <small> {totalVistas}</small> : null}
            </button>
          ))}
        </div>
        <div className="controle-extra">
          <label className="controle-select">
            <span>Aplicação</span>
            <select value={f.modalidade ?? ""} onChange={(e) => mudar({ modalidade: (e.target.value || null) as Modalidade | null })}>
              <option value="">Todas</option>
              {MODALIDADES.map((m) => <option key={m.id} value={m.id}>{m.rotulo}</option>)}
            </select>
          </label>
          <label className="controle-select">
            <span>Língua estrangeira</span>
            <select value={f.idioma} onChange={(e) => mudar({ idioma: e.target.value as "ingles" | "espanhol" })}>
              <option value="ingles">Inglês</option>
              <option value="espanhol">Espanhol</option>
            </select>
          </label>
          <label className="controle-select">
            <span>Número</span>
            <input type="number" inputMode="numeric" min={1} max={180} placeholder="1–180" value={f.numero ?? ""}
              onChange={(e) => { const v = Number(e.target.value); mudar({ numero: Number.isInteger(v) && v >= 1 && v <= 180 ? v : null }); }} />
          </label>
          <label className="controle-select" title="Depende de classificar e revisar cada questão">
            <span>Disciplina e assunto</span>
            <select disabled><option>Em preparação</option></select>
          </label>
        </div>
      </div>

      <p className="biblioteca-contagem" role="status" aria-live="polite">
        {filtradas.length.toLocaleString("pt-BR")} {filtradas.length === 1 ? "questão" : "questões"} em {blocos.length} {blocos.length === 1 ? "prova" : "provas"}
        {filtrando && <> <button type="button" className="link-botao" onClick={() => mudar(FILTROS_QUESTOES_VAZIOS)}>Limpar filtros</button></>}
      </p>

      {pronto && blocos.length === 0 && (
        <div className="biblioteca-vazia">
          <p>{f.situacao === "revisar" ? "Você ainda não marcou nenhuma questão para revisar neste navegador. No modo por questão, use “Marcar para revisar”."
            : f.situacao === "vistas" ? "Nenhuma resposta vista ainda neste navegador." : "Nenhuma questão com esses filtros."}</p>
          <button type="button" className="botao botao-contorno" onClick={() => mudar(FILTROS_QUESTOES_VAZIOS)}>Limpar filtros</button>
        </div>
      )}

      {blocos.slice(0, mostrar).map(({ g, qs }) => {
        const ref = cadernosReferencia(g)!;
        return (
          <section key={g.chave} className="banco-prova" aria-labelledby={`bp-${g.chave}`}>
            <header>
              <h2 id={`bp-${g.chave}`}>Enem {g.ano} · {diaRotulo(g.dia)}{g.modalidade !== "regular" ? <small> · {MODALIDADE_CURTA[g.modalidade]}</small> : null}</h2>
              <p className="miudo">Caderno {ref.geral.caderno} {ref.geral.corRotulo}{ref.espanhol && ref.espanhol.id !== ref.geral.id ? " (um por idioma)" : ""} · {qs.length} {qs.length === 1 ? "questão" : "questões"} · <a href={`/provas/${ref.geral.id}/`}>página da prova</a></p>
            </header>
            <ol className="banco-grade">
              {qs.map((q) => {
                const m = marcas.get(q.provaId);
                const k = chaveQuestao(q.numero, q.idioma);
                const revisar = !!m?.revisar.includes(q.numero), vista = !!m?.vistas.includes(k);
                const nome = `Questão ${q.numero}${q.idioma ? ` (${q.idioma === "ingles" ? "inglês" : "espanhol"})` : ""}, ${AREA_ROTULO[q.area]}${revisar ? ", marcada para revisar" : ""}${vista ? ", resposta vista" : ""}`;
                return (
                  <li key={q.chave}>
                    <a className={`banco-q area-${q.area}${vista ? " vista" : ""}${revisar ? " revisar" : ""}`} href={`/provas/${q.provaId}/#questao-${k}`} aria-label={nome} title={nome}>
                      {String(q.numero).padStart(2, "0")}
                      {revisar && <span className="banco-marca" aria-hidden="true">★</span>}
                    </a>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      {blocos.length > mostrar && (
        <div className="banco-mais"><button type="button" className="botao botao-contorno" onClick={() => setMostrar((n) => n + POR_VEZ)}>Mostrar mais provas ({blocos.length - mostrar})</button></div>
      )}
    </div>
  );
}

const ordemMod = (m: Modalidade) => ["regular", "digital", "belem", "reaplicacao"].indexOf(m);
