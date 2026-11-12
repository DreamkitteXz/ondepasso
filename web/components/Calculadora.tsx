"use client";
// Calculadora (Figma 05 / W5): notas por área → média ponderada de cada opção, com os pesos dela, contra o corte.
import { useEffect, useMemo, useState } from "react";
import type { DadosCalc } from "@/lib/calc";
import { lerNota, nota as fmt, diferenca, ROTULO, nomeModalidade, contagemVazia, type Status } from "@/lib/formato";
import { salvarNotasAreas, salvarMod, useAreas, useMod, type Areas } from "@/lib/nota";
import { registrar, registrarUmaVez, useRegistrarQuando } from "@/lib/analytics";

import { compararOpcoes, statusPara, suaMedia } from "@/lib/minhas";
import { CoberturaComparacao } from "@/components/ResumoComparacao";
import { CartaoRelatorio } from "@/components/CartaoRelatorio";

// Ordem dos campos como no Figma; a ordem dos pesos no /calc.json é red, lin, mat, ch, cn.
const CAMPOS: { k: keyof Areas; rotulo: string; i: number; ph: string }[] = [
  { k: "red", rotulo: "Redação", i: 0, ph: "880" },
  { k: "mat", rotulo: "Matemática", i: 2, ph: "742,5" },
  { k: "cn", rotulo: "Natureza", i: 4, ph: "690,1" },
  { k: "ch", rotulo: "Humanas", i: 3, ph: "701,3" },
  { k: "lin", rotulo: "Linguagens", i: 1, ph: "655,0" },
];

const POR_PAGINA = 20;

type Resultado = { rota: string; curso: string; slug: string; ies: string; cidade: string; uf: string; media: number; corte: number; dif: number; s: Status; minimo: string | null };

export function Calculadora({ ano }: { ano: number }) {
  const areas = useAreas();
  const mod = useMod();
  const [dados, setDados] = useState<DadosCalc | null>(null);
  const [erroDados, setErroDados] = useState(false);
  const [grupo, setGrupo] = useState(-1);
  const [uf, setUf] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [ordem, setOrdem] = useState("proximas");
  const [limite, setLimite] = useState(POR_PAGINA);
  const [consultas, setConsultas] = useState(0); // só para o analytics: consultas feitas nesta página
  const [digitou, setDigitou] = useState(false); // só para o analytics: a pessoa mexeu nas notas nesta página

  useEffect(() => {
    const abortar = new AbortController();
    setErroDados(false);
    fetch("/calc.json", { signal: abortar.signal }).then((r) => { if (!r.ok) throw new Error("Dados indisponíveis"); return r.json(); }).then(setDados).catch((e) => { if (e.name !== "AbortError") { setErroDados(true); registrar("en_erro_consulta", { tipo_erro: "falha_carregar_calculadora", formulario: "calculadora" }); } });
    return () => abortar.abort();
  }, [tentativa]);

  const notas = CAMPOS.map((c) => ({ ...c, v: lerNota(areas[c.k] ?? ""), texto: areas[c.k] ?? "" }));
  const n = [0, 0, 0, 0, 0];
  for (const c of notas) if (c.v != null) n[c.i] = c.v;
  const completo = notas.every((c) => c.v != null);
  const preenchidas = notas.filter((c) => c.v != null).length;

  const ufs = useMemo(() => (dados ? [...new Set(dados.linhas.map((l) => l[4]))].sort() : []), [dados]);
  const modAtual = dados?.mods.find((m) => m.cod === mod) ?? { cod: mod, nome: nomeModalidade(mod) };

  const resultados = useMemo<Resultado[]>(() => {
    if (!dados || !completo) return [];
    const out: Resultado[] = [];
    for (const [ci, rota, ies, cidade, u, pesos, minimas, mediaMin, cortes] of dados.linhas) {
      const c = dados.cursos[ci];
      if (grupo >= 0 && c.g !== grupo) continue;
      if (uf && u !== uf) continue;
      const corte = cortes[modAtual.cod];
      if (corte == null) continue;
      const minha = { n, media: n.reduce((a, b) => a + b, 0) / 5 };
      const peso = { p: pesos, mi: minimas, mm: mediaMin };
      const calculada = suaMedia(minha, peso);
      const media = calculada.v;
      const minimo = calculada.minimo;
      const dif = media - corte;
      out.push({ rota, curso: c.curso, slug: c.slug, ies, cidade, uf: u, media, corte, dif, s: statusPara(minha, peso, corte), minimo });
    }
    return out.sort((a, b) => compararOpcoes(a, b, ordem));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, completo, grupo, uf, modAtual.cod, ordem, ...n]);

  const conta = contagemVazia();
  for (const r of resultados) conta[r.s]++;

  const totalFiltrado = dados?.linhas.filter((l) => (grupo < 0 || dados.cursos[l[0]].g === grupo) && (!uf || l[4] === uf)).length ?? 0;
  const invalidas = notas.filter((c) => c.texto.trim() !== "" && c.v == null);
  const limparFiltros = () => { setGrupo(-1); setUf(""); setLimite(POR_PAGINA); };

  const mudar = (k: keyof Areas, v: string) => {
    const novas = { ...areas, [k]: v };
    // Analytics (nunca a nota): começou a preencher, completou as cinco (= pediu o resultado) ou digitou algo inválido.
    registrarUmaVez("consulta_iniciada", "en_consulta_iniciada", { formulario: "calculadora" });
    setDigitou(true);
    if (v.trim() !== "" && lerNota(v) == null) registrarUmaVez("erro_validacao", "en_erro_consulta", { tipo_erro: "nota_invalida", formulario: "calculadora" });
    salvarNotasAreas(novas); setLimite(POR_PAGINA);
  };
  // Consulta realizada: as cinco notas válidas e paradas por 1,5 s depois de a pessoa digitar (a calculadora não tem
  // botão; assim "1", "15", "150" de uma mesma digitação não contam como três consultas). Notas que já estavam
  // salvas ao abrir a página não contam como consulta nova.
  useEffect(() => {
    if (!completo || !digitou) return;
    const t = setTimeout(() => { registrar("en_consulta_realizada", { formulario: "calculadora" }); setConsultas((c) => c + 1); }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completo, digitou, ...n]);
  // Resultados exibidos: a lista comparada com os cortes (com as cinco notas e os dados carregados).
  useRegistrarQuando(completo && dados != null && !erroDados && (consultas > 0 || !digitou), `resultados|calculadora|${consultas}`, "en_resultados_visualizados",
    { pagina: "calculadora", tipo_nota: "areas", origem_nota: consultas ? "digitada" : "salva", resultado: resultados.length ? "com_opcoes" : "sem_opcoes" });
  const filtro = (rotulo: string, valor: string, aria: string, opcoes: [string, string][], aoMudar: (v: string) => void, ativo: boolean) => (
    <label className={`chip chip-select${ativo ? " ativo" : ""}`}>
      {rotulo}
      <select value={valor} onChange={(e) => { aoMudar(e.target.value); setLimite(POR_PAGINA); }} aria-label={aria}>
        {opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );

  return (
    <div className="calc-grade">
      <div className="calc-entrada">
        <div className="calc-painel">
        <div className="calc-painel-topo">
          <h2>Suas notas</h2>
          <span className={`calc-progresso${completo ? " ok" : ""}`} aria-label={`${preenchidas} de 5 notas preenchidas`}>
            <span className="cp-pontos" aria-hidden="true">{notas.map((c) => <i key={c.k} className={c.v != null ? "on" : undefined} />)}</span>
            {preenchidas} de 5
          </span>
        </div>
        <div className="calc-notas">
          {notas.map((c) => {
            const invalida = c.texto.trim() !== "" && c.v == null;
            return (
              <label key={c.k} className={`calc-nota${invalida ? " invalida" : ""}`}>
                <span>{c.rotulo}</span>
                <input inputMode="decimal" autoComplete="off" placeholder="0 a 1000" value={c.texto} aria-invalid={invalida} aria-describedby={invalida ? "calc-erro" : "calc-ajuda"}
                  onChange={(e) => mudar(c.k, e.target.value)} />
                <i className="calc-nota-barra" aria-hidden="true" style={{ ["--p" as string]: c.v != null ? (c.v / 1000).toFixed(3) : "0" }} />
              </label>
            );
          })}
        </div>
        {invalidas.length > 0 && <p className="erro" id="calc-erro" role="alert">Confira {invalidas.map((c) => c.rotulo).join(", ")}: digite uma nota de 0 a 1000, como 712,40.</p>}
        <p className="miudo calc-ajuda" id="calc-ajuda">Use as notas do seu boletim do Enem (Página do Participante do Inep).</p>
        </div>
        {completo && <div className="calc-filtros-bloco"><p className="calc-filtros-rotulo">Filtrar e ordenar</p><div className="calc-filtros" role="group" aria-label="Filtros">
          {filtro(grupo >= 0 && dados ? dados.grupos[grupo] : "Todas as áreas", String(grupo), "Área do curso",
            [["-1", "Todas as áreas"], ...(dados?.grupos.map((g, i) => [String(i), g] as [string, string]) ?? [])], (v) => setGrupo(Number(v)), grupo >= 0)}
          {filtro(uf || "Todos os estados", uf, "Estado", [["", "Todos os estados"], ...ufs.map((u) => [u, u] as [string, string])], setUf, uf !== "")}
          {filtro(modAtual.cod === "AC" ? "Ampla concorrência" : modAtual.nome, modAtual.cod, "Modalidade",
            (dados?.mods.some((m) => m.cod === mod) ? dados.mods : [...(dados?.mods ?? []), modAtual]).map((m) => [m.cod, m.nome] as [string, string]), salvarMod, modAtual.cod !== "AC")}
          {filtro(ordem === "folga" ? "Maior folga" : ordem === "corte" ? "Menor corte" : "Mais próximas do corte", ordem, "Ordenar resultados",
            [["proximas", "Mais próximas do corte"], ["folga", "Maior folga"], ["corte", "Menor corte"]], setOrdem, ordem !== "proximas")}
        </div></div>}
      </div>

      <section className="cartao calc-resultado" aria-labelledby="t-calc" aria-live="polite">
        <div className="calc-topo">
          <h2 id="t-calc">Comparação com os cortes</h2>
          <p className="miudo">Comparação com os cortes de {ano}; não garante aprovação.</p>
          {completo && dados && resultados.length > 0 && <p className="miudo">Até 10 pontos abaixo é uma faixa de diferença, não uma previsão de aprovação.</p>}
          {completo && dados && resultados.length > 0 && (
            <div className="calc-placar">
              <ul className="cpl-numeros">
                <li className="supera"><strong>{conta.supera.toLocaleString("pt-BR")}</strong><span>acima do corte</span></li>
                {conta.igual > 0 && <li className="igual"><strong>{conta.igual.toLocaleString("pt-BR")}</strong><span>no mesmo corte</span></li>}
                <li className="pouco"><strong>{conta.pouco.toLocaleString("pt-BR")}</strong><span>por pouco</span></li>
                <li className="abaixo"><strong>{(conta.abaixo + conta.minimo).toLocaleString("pt-BR")}</strong><span>abaixo</span></li>
              </ul>
              <div className="cpl-barra" aria-hidden="true">
                {([["supera", conta.supera], ["igual", conta.igual], ["pouco", conta.pouco], ["abaixo", conta.abaixo + conta.minimo]] as const).map(([k, v]) => v > 0 && <i key={k} className={k} style={{ flexGrow: v }} />)}
              </div>
            </div>
          )}
          {completo && dados && <CoberturaComparacao total={totalFiltrado} comparaveis={resultados.length} />}
          {completo && dados && resultados.length > 0 && conta.supera === 0 && <p className="orientacao-comparacao"><strong>Nenhuma opção acima do corte nesta busca.</strong> Confira os pesos e explore outros cursos, estados ou turnos.</p>}
          {completo && conta.igual > 0 && <p className="orientacao-comparacao">Igualar o corte histórico não garante uma vaga. Confira os critérios de desempate no edital.</p>}
        </div>
        {!completo ? (
          <div className="calc-vazio calc-espera">
            <ol className="calc-passos">
              <li className={preenchidas > 0 ? "feito" : undefined}><b>01</b><span><strong>Digite as cinco notas</strong>Valores de 0 a 1000, como no boletim.</span></li>
              <li><b>02</b><span><strong>Cada curso aplica os pesos dele</strong>Sua média muda de uma opção para outra.</span></li>
              <li><b>03</b><span><strong>Compare com o corte</strong>Acima, por pouco ou abaixo, opção por opção.</span></li>
            </ol>
            <p>Os resultados aparecem quando todas as áreas estiverem válidas.</p>
          </div>
        ) : erroDados ? (
          <div className="calc-vazio" role="alert"><strong>Não foi possível carregar os cortes.</strong><p>Suas notas permanecem preenchidas. Confira a conexão e tente novamente.</p><button className="botao" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button></div>
        ) : !dados ? (
          <p className="calc-vazio">Carregando os cortes…</p>
        ) : resultados.length === 0 ? (
          <div className="calc-vazio"><strong>Sem corte para esta seleção.</strong><p>Não há opções comparáveis com estes filtros e modalidade. Um corte ausente não significa nota zero nem impossibilidade de aprovação.</p><button className="botao" onClick={limparFiltros}>Limpar filtros de área e estado</button></div>
        ) : (
          <>
            <div className="calc-cabeca so-desktop">
              <span>Curso</span><span className="n">Sua média ponderada</span><span className="n">Corte {ano}</span><span className="n">Diferença (pontos)</span><span className="n">Situação</span>
            </div>
            {resultados.slice(0, limite).map((r) => (
              <a key={r.slug + r.rota} className={`calc-linha s-${r.s}`} href={`/curso/${r.slug}/${r.rota}/`}>
                <span className="calc-curso">
                  <strong>{r.curso}</strong>
                  <span className="meta">{r.ies} · {r.cidade}/{r.uf}<span className="so-mobile"> · Corte {ano} {fmt(r.corte)}</span></span>
                  {r.minimo && <span className="meta t-abaixo">{r.minimo}</span>}
                </span>
                <span className="calc-media">{fmt(r.media)}</span>
                <span className="calc-corte so-desktop">{fmt(r.corte)}</span>
                <span className={`calc-dif ${r.dif > 0 ? "pos" : r.dif < 0 ? "neg" : "zero"}`}>{r.dif > 0 ? "+" : r.dif < 0 ? "−" : ""}{diferenca(Math.abs(r.dif))}<span className="so-mobile"> pts</span></span>
                <span className="calc-status"><span className={`selo-tinta ${r.s}`}>{ROTULO[r.s]}</span></span>
              </a>
            ))}
            {resultados.length > limite && (
              <button className="ver-mais" onClick={() => setLimite((x) => x + 40)}>Ver mais {Math.min(40, resultados.length - limite)} (faltam {resultados.length - limite})</button>
            )}
            <CartaoRelatorio origem="calculadora" />
          </>
        )}
      </section>
    </div>
  );
}
