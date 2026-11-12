"use client";
// Relatório para o Sisu (/relatorio/). Tudo é calculado neste navegador com lib/relatorio.ts.
// Sem acesso: prévia (o resumo e a primeira linha de cada parte). Com código: o relatório inteiro.
import { useEffect, useMemo, useState } from "react";
import { lerNota, nota as fmt, diferenca, nomeModalidade } from "@/lib/formato";
import { salvarNotasAreas, salvarMod, useAreas, useMod, type Areas } from "@/lib/nota";
import { analisar, contarFaixas, estrategia, valemMais, daFaixa, extremos, FAIXAS, NOME_FAIXA, EXPLICA_FAIXA, TEXTO_ALERTA, NOME_AREAS, type BaseCalc, type DadosRelatorio, type Faixa, type Opcao } from "@/lib/relatorio";
import { useAcesso, reconferir, esquecerAcesso, RELATORIO_ATIVO } from "@/lib/acesso";
import { useRegistrarQuando } from "@/lib/analytics";
import { CompraRelatorio } from "@/components/CompraRelatorio";

const CAMPOS: { k: keyof Areas; rotulo: string; i: number }[] = [
  { k: "red", rotulo: "Redação", i: 0 }, { k: "mat", rotulo: "Matemática", i: 2 }, { k: "cn", rotulo: "Natureza", i: 4 }, { k: "ch", rotulo: "Humanas", i: 3 }, { k: "lin", rotulo: "Linguagens", i: 1 },
];
const TURNOS = ["Integral", "Matutino", "Vespertino", "Noturno", "EaD", "Semipresencial"];
const CHAVE_FILTRO = "ondepasso.relatorio-filtro";
type FiltroGuardado = { ufs: string[]; grupos: number[]; turnos: string[] };
const FILTRO_VAZIO: FiltroGuardado = { ufs: [], grupos: [], turnos: [] };
const POR_PAGINA = 12, MAX_COMPARAR = 4;
const data = (iso: string) => iso.split("-").reverse().join("/");
const sinal = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + diferenca(Math.abs(v));
const chave = (o: Opcao) => `${o.slug}/${o.rota}`;

export function Relatorio({ ano }: { ano: number }) {
  const areas = useAreas();
  const mod = useMod();
  const acesso = useAcesso();
  const liberado = RELATORIO_ATIVO && acesso != null;
  const [calc, setCalc] = useState<BaseCalc | null>(null);
  const [rel, setRel] = useState<DadosRelatorio | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [filtro, setFiltro] = useState<FiltroGuardado>(FILTRO_VAZIO);
  const [faixa, setFaixa] = useState<Faixa>("segura");
  const [limite, setLimite] = useState(POR_PAGINA);
  const [comparar, setComparar] = useState<string[]>([]);

  useEffect(() => {
    const abortar = new AbortController(); setFalhou(false);
    const baixar = (u: string) => fetch(u, { signal: abortar.signal }).then((r) => { if (!r.ok) throw new Error(u); return r.json(); });
    Promise.all([baixar("/calc.json"), baixar("/relatorio.json")]).then(([c, r]) => { setCalc(c); setRel(r); }).catch((e) => { if (e.name !== "AbortError") setFalhou(true); });
    return () => abortar.abort();
  }, [tentativa]);
  useEffect(() => { try { const f = JSON.parse(localStorage.getItem(CHAVE_FILTRO) ?? "null"); if (f && Array.isArray(f.ufs) && Array.isArray(f.grupos) && Array.isArray(f.turnos)) setFiltro(f); } catch { /* fica sem filtro */ } }, []);
  useEffect(() => { if (acesso) void reconferir(acesso); }, [acesso]);
  const mudarFiltro = (f: FiltroGuardado) => { setFiltro(f); setLimite(POR_PAGINA); try { localStorage.setItem(CHAVE_FILTRO, JSON.stringify(f)); } catch { /* só nesta visita */ } };
  const alternar = <T,>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  const notas = CAMPOS.map((c) => ({ ...c, texto: areas[c.k] ?? "", v: lerNota(areas[c.k] ?? "") }));
  const n = [0, 0, 0, 0, 0];
  for (const c of notas) if (c.v != null) n[c.i] = c.v;
  const completo = notas.every((c) => c.v != null);
  const mudarNota = (k: keyof Areas, v: string) => { salvarNotasAreas({ ...areas, [k]: v }); setLimite(POR_PAGINA); };

  const ops = useMemo(() => (calc && rel && completo ? analisar(calc, rel, n, mod, filtro) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calc, rel, completo, mod, filtro, ...n]);
  const conta = useMemo(() => contarFaixas(ops), [ops]);
  const est = useMemo(() => estrategia(ops), [ops]);
  const pesos = useMemo(() => valemMais(ops), [ops]);
  const lista = useMemo(() => daFaixa(ops, faixa), [ops, faixa]);
  const escolhidas = useMemo(() => comparar.map((k) => ops.find((o) => chave(o) === k)).filter((o): o is Opcao => !!o), [comparar, ops]);
  const ufs = useMemo(() => (calc ? [...new Set(calc.linhas.map((l) => l[4]))].sort() : []), [calc]);
  const temQualidade = ops.some((o) => o.q);
  const simples = n.reduce((a, b) => a + b, 0) / 5;
  const ex = extremos(n);
  const pronto = completo && calc != null && rel != null;
  useRegistrarQuando(pronto, `relatorio|${liberado ? "completo" : "previa"}`, "en_resultados_visualizados", { pagina: "relatorio", tipo_nota: "areas", resultado: liberado ? "completo" : "previa" });

  const marcar = (o: Opcao) => setComparar((c) => (c.includes(chave(o)) ? c.filter((k) => k !== chave(o)) : c.length >= MAX_COMPARAR ? c : [...c, chave(o)]));
  const linha = (o: Opcao, destaque?: "ganho") => (
    <li key={chave(o)} className={`rl-linha f-${o.faixa}`}>
      <a className="rl-curso" href={`/curso/${o.slug}/${o.rota}/`}>
        <strong>{o.curso}</strong>
        <span className="meta">{o.ies} · {o.cidade}/{o.uf} · {o.turno}</span>
      </a>
      <span className="rl-num"><b>{fmt(o.media)}</b><small>sua média{o.ganho > 0.005 || o.ganho < -0.005 ? ` (${sinal(o.ganho)} com os pesos)` : ""}</small></span>
      <span className="rl-num"><b>{fmt(o.corte)}</b><small>corte {ano}</small></span>
      <span className={`rl-num rl-folga ${o.folga >= 0 ? "pos" : "neg"}`}><b>{destaque === "ganho" ? sinal(o.ganho) : sinal(o.folga)}</b><small>{destaque === "ganho" ? "ganho com os pesos" : o.folga >= 0 ? "de folga" : "faltam"}</small></span>
      <span className="rl-detalhe">
        <span className={`selo-faixa ${o.faixa}`}>{NOME_FAIXA[o.faixa]}</span>
        {o.hist.length > 1 && <span className="rl-hist">{o.hist.map((h) => `${h.ano}: ${fmt(h.corte)}`).join(" → ")}</span>}
        {o.porVaga != null && <span>{o.inscritos!.toLocaleString("pt-BR")} inscritos para {o.vagas} {o.vagas === 1 ? "vaga" : "vagas"} ({o.porVaga.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} por vaga)</span>}
        {o.q && (o.q.enade != null || o.q.cpc != null || o.q.igc != null) && <span>Inep{o.q.ano ? ` ${o.q.ano}` : ""}: {[o.q.enade != null && `Enade ${o.q.enade}`, o.q.cpc != null && `CPC ${o.q.cpc}`, o.q.igc != null && `IGC ${o.q.igc}`].filter(Boolean).join(" · ")}</span>}
        {o.minimo && <span className="t-abaixo">Não atinge a {o.minimo}</span>}
        {o.alertas.map((a) => <span key={a} className="rl-alerta">{TEXTO_ALERTA[a]}</span>)}
      </span>
      {liberado && (
        <label className="rl-marca"><input type="checkbox" checked={comparar.includes(chave(o))} disabled={!comparar.includes(chave(o)) && comparar.length >= MAX_COMPARAR} onChange={() => marcar(o)} />Comparar</label>
      )}
    </li>
  );
  /** Na prévia, cada parte mostra só a primeira linha e diz quantas ficaram de fora. */
  const parte = ({ itens, vazio, destaque, max }: { itens: Opcao[]; vazio: string; destaque?: "ganho"; max?: number }) => {
    if (itens.length === 0) return <p className="rl-vazio">{vazio}</p>;
    const visiveis = liberado ? itens.slice(0, max ?? itens.length) : itens.slice(0, 1);
    return (
      <ul className="rl-lista">
        {visiveis.map((o) => linha(o, destaque))}
        {!liberado && itens.length > 1 && <li className="rl-cadeado"><Cadeado />Mais {Math.min(itens.length, max ?? itens.length) - 1} {Math.min(itens.length, max ?? itens.length) - 1 === 1 ? "opção" : "opções"} no relatório completo</li>}
      </ul>
    );
  };

  return (
    <div className="relatorio">
      <section className="calc-painel rl-notas" aria-labelledby="t-rl-notas">
        <div className="calc-painel-topo">
          <h2 id="t-rl-notas">Suas notas</h2>
          <span className={`calc-progresso${completo ? " ok" : ""}`}>{completo ? `Média simples ${fmt(simples)}` : `${notas.filter((c) => c.v != null).length} de 5`}</span>
        </div>
        <div className="calc-notas rl-campos">
          {notas.map((c) => {
            const invalida = c.texto.trim() !== "" && c.v == null;
            return (
              <label key={c.k} className={`calc-nota${invalida ? " invalida" : ""}`}>
                <span>{c.rotulo}</span>
                <input inputMode="decimal" autoComplete="off" placeholder="0 a 1000" value={c.texto} aria-invalid={invalida} onChange={(e) => mudarNota(c.k, e.target.value)} />
                <i className="calc-nota-barra" aria-hidden="true" style={{ ["--p" as string]: c.v != null ? (c.v / 1000).toFixed(3) : "0" }} />
              </label>
            );
          })}
        </div>
        <div className="rl-filtros">
          <label className="rl-select">Modalidade
            <select value={mod} onChange={(e) => { salvarMod(e.target.value); setLimite(POR_PAGINA); }}>
              {(calc?.mods.some((m) => m.cod === mod) ? calc.mods : [...(calc?.mods ?? []), { cod: mod, nome: nomeModalidade(mod) }]).map((m) => <option key={m.cod} value={m.cod}>{m.nome}</option>)}
            </select>
          </label>
          <fieldset><legend>Áreas de interesse <small>(nenhuma marcada = todas)</small></legend>
            <div className="rl-chips">{(calc?.grupos ?? []).map((g, i) => <button key={g} type="button" className={`chip${filtro.grupos.includes(i) ? " ativo" : ""}`} aria-pressed={filtro.grupos.includes(i)} onClick={() => mudarFiltro({ ...filtro, grupos: alternar(filtro.grupos, i) })}>{g}</button>)}</div>
          </fieldset>
          <fieldset><legend>Onde você aceita estudar <small>(nenhum marcado = todo o Brasil)</small></legend>
            <div className="rl-chips rl-ufs">{ufs.map((u) => <button key={u} type="button" className={`chip${filtro.ufs.includes(u) ? " ativo" : ""}`} aria-pressed={filtro.ufs.includes(u)} onClick={() => mudarFiltro({ ...filtro, ufs: alternar(filtro.ufs, u) })}>{u}</button>)}</div>
          </fieldset>
          <fieldset><legend>Turno <small>(nenhum marcado = qualquer)</small></legend>
            <div className="rl-chips">{TURNOS.map((t) => <button key={t} type="button" className={`chip${filtro.turnos.includes(t) ? " ativo" : ""}`} aria-pressed={filtro.turnos.includes(t)} onClick={() => mudarFiltro({ ...filtro, turnos: alternar(filtro.turnos, t) })}>{t}</button>)}</div>
          </fieldset>
        </div>
      </section>

      {!completo ? (
        <p className="rl-aviso">Preencha as cinco notas (0 a 1000) para montar o relatório. A prévia é grátis e usa as suas notas.</p>
      ) : falhou ? (
        <div className="rl-aviso" role="alert"><strong>Não foi possível carregar os cortes.</strong> Suas notas continuam preenchidas. <button className="botao" onClick={() => setTentativa((t) => t + 1)}>Tentar de novo</button></div>
      ) : !pronto ? (
        <p className="rl-aviso">Montando o relatório…</p>
      ) : ops.length === 0 ? (
        <div className="rl-aviso"><strong>Nenhuma opção com corte nesta seleção.</strong> Tire algum filtro de área, estado ou turno, ou troque a modalidade. <button className="botao" onClick={() => mudarFiltro(FILTRO_VAZIO)}>Limpar filtros</button></div>
      ) : (
        <>
          <section className="rl-bloco" aria-labelledby="t-rl-resumo">
            <p className="rl-num-secao">01</p>
            <h2 id="t-rl-resumo">Onde você está</h2>
            <p className="rl-sub">{ops.length.toLocaleString("pt-BR")} opções com corte em {ano} nesta seleção, comparadas com a sua média em cada uma. Sua área mais forte é {NOME_AREAS[ex.forte]} ({fmt(n[ex.forte])}); a mais fraca, {NOME_AREAS[ex.fraca]} ({fmt(n[ex.fraca])}).</p>
            <ul className="rl-placar">
              {FAIXAS.filter((f) => f !== "fora").map((f) => <li key={f} className={f}><strong>{conta[f].toLocaleString("pt-BR")}</strong><span>{NOME_FAIXA[f]}</span><small>{EXPLICA_FAIXA[f]}</small></li>)}
            </ul>
            <p className="miudo">{conta.fora.toLocaleString("pt-BR")} opções ficam fora do alcance (mais de 25 pontos abaixo do corte ou sem uma nota mínima). As faixas comparam a sua nota com os cortes de {rel!.anosAntes.length ? `${rel!.anosAntes[0]} a ${ano}` : ano}; não são previsão de aprovação.</p>
          </section>

          {!liberado && (
            <section className="rl-bloco rl-venda" aria-labelledby="t-rl-venda">
              <h2 id="t-rl-venda">Isto é a prévia. O relatório completo mostra tudo.</h2>
              <ul className="rl-vantagens">
                <li>A sugestão de 1ª e 2ª opção para a sua nota</li>
                <li>Todas as {(ops.length - conta.fora).toLocaleString("pt-BR")} opções ao seu alcance, com o histórico do corte e a concorrência de cada uma</li>
                <li>Os cursos em que os pesos mais ajudam as suas notas</li>
                <li>Comparação lado a lado de até {MAX_COMPARAR} finalistas</li>
                <li>Refaça quantas vezes quiser, mudando nota, cota, estados e áreas</li>
              </ul>
              <CompraRelatorio origem="relatorio" />
            </section>
          )}

          <section className="rl-bloco" aria-labelledby="t-rl-est">
            <p className="rl-num-secao">02</p>
            <h2 id="t-rl-est">1ª e 2ª opção</h2>
            <p className="rl-sub">No Sisu você escolhe duas opções, e a primeira tem prioridade. Um jeito comum de usar isso: na 1ª, a opção mais disputada que ainda está ao seu alcance; na 2ª, uma em que você passa com folga. As listas abaixo vêm do corte mais alto para o mais baixo. O curso que você quer fazer continua sendo decisão sua.</p>
            <div className="rl-duas">
              <div><h3>Para a 1ª opção <small>acima do corte, no limite ou aposta</small></h3>{parte({ itens: est.primeira, vazio: "Nenhuma opção perto do corte nesta seleção." })}</div>
              <div><h3>Para a 2ª opção <small>com folga</small></h3>{parte({ itens: est.segunda, vazio: "Nenhuma opção com folga nesta seleção. Vale abrir mais estados, áreas ou turnos." })}</div>
            </div>
          </section>

          <section className="rl-bloco" aria-labelledby="t-rl-pesos">
            <p className="rl-num-secao">03</p>
            <h2 id="t-rl-pesos">Onde suas notas valem mais</h2>
            <p className="rl-sub">Cada curso dá um peso a cada área. Aqui estão as opções ao seu alcance em que a média com os pesos fica mais acima da sua média simples ({fmt(simples)}).</p>
            {parte({ itens: pesos, destaque: "ganho", vazio: "Nesta seleção, nenhum curso ao seu alcance tem pesos que aumentam a sua média." })}
          </section>

          <section className="rl-bloco" aria-labelledby="t-rl-todas">
            <p className="rl-num-secao">04</p>
            <h2 id="t-rl-todas">Todas as opções, por faixa</h2>
            <div className="rl-abas" role="tablist" aria-label="Faixas">
              {FAIXAS.map((f) => <button key={f} role="tab" aria-selected={faixa === f} className={`chip${faixa === f ? " ativo" : ""}`} onClick={() => { setFaixa(f); setLimite(POR_PAGINA); }}>{NOME_FAIXA[f]} · {conta[f].toLocaleString("pt-BR")}</button>)}
            </div>
            <p className="rl-sub">{EXPLICA_FAIXA[faixa]}</p>
            {parte({ itens: lista, max: limite, vazio: "Nenhuma opção nesta faixa." })}
            {liberado && lista.length > limite && <button className="ver-mais" onClick={() => setLimite((x) => x + 24)}>Ver mais {Math.min(24, lista.length - limite)} (faltam {lista.length - limite})</button>}
          </section>

          {liberado && (
            <section className="rl-bloco" aria-labelledby="t-rl-cmp">
              <p className="rl-num-secao">05</p>
              <h2 id="t-rl-cmp">Lado a lado</h2>
              {escolhidas.length < 2 ? (
                <p className="rl-sub">Marque "Comparar" em duas a {MAX_COMPARAR} opções das listas acima para vê-las lado a lado.{escolhidas.length === 1 ? " Falta mais uma." : ""}</p>
              ) : (
                <div className="rl-rolagem" data-rolagem-propria>
                  <table className="rl-tabela">
                    <thead><tr><th />{escolhidas.map((o) => <th key={chave(o)}><a href={`/curso/${o.slug}/${o.rota}/`}>{o.curso}</a><small>{o.ies} · {o.cidade}/{o.uf}</small></th>)}</tr></thead>
                    <tbody>
                      <tr><th>Situação</th>{escolhidas.map((o) => <td key={chave(o)}><span className={`selo-faixa ${o.faixa}`}>{NOME_FAIXA[o.faixa]}</span></td>)}</tr>
                      <tr><th>Sua média</th>{escolhidas.map((o) => <td key={chave(o)}><b>{fmt(o.media)}</b></td>)}</tr>
                      <tr><th>Corte {ano}</th>{escolhidas.map((o) => <td key={chave(o)}>{fmt(o.corte)}</td>)}</tr>
                      <tr><th>Folga</th>{escolhidas.map((o) => <td key={chave(o)} className={o.folga >= 0 ? "pos" : "neg"}>{sinal(o.folga)}</td>)}</tr>
                      <tr><th>Corte no último ano</th>{escolhidas.map((o) => <td key={chave(o)}>{o.variacao == null ? "sem histórico" : o.variacao > 0 ? `subiu ${diferenca(o.variacao)}` : o.variacao < 0 ? `caiu ${diferenca(-o.variacao)}` : "igual"}</td>)}</tr>
                      <tr><th>Maior variação entre anos</th>{escolhidas.map((o) => <td key={chave(o)}>{o.oscilacao == null ? "—" : diferenca(o.oscilacao)}</td>)}</tr>
                      <tr><th>Inscritos por vaga</th>{escolhidas.map((o) => <td key={chave(o)}>{o.porVaga == null ? "—" : `${o.porVaga.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} (${o.vagas} ${o.vagas === 1 ? "vaga" : "vagas"})`}</td>)}</tr>
                      <tr><th>Turno e grau</th>{escolhidas.map((o) => <td key={chave(o)}>{o.turno} · {o.grau}</td>)}</tr>
                      <tr><th>Bônus regional</th>{escolhidas.map((o) => <td key={chave(o)}>{o.bonus > 0 ? `${o.bonus.toLocaleString("pt-BR")}%` : "não"}</td>)}</tr>
                      {temQualidade && <tr><th>Qualidade (Inep)</th>{escolhidas.map((o) => <td key={chave(o)}>{o.q ? [o.q.enade != null && `Enade ${o.q.enade}`, o.q.cpc != null && `CPC ${o.q.cpc}`, o.q.igc != null && `IGC ${o.q.igc}`].filter(Boolean).join(" · ") || "—" : "—"}</td>)}</tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {liberado && acesso && (
            <footer className="rl-rodape">
              <button className="botao botao-contorno rl-imprimir" onClick={() => window.print()}>Imprimir ou salvar em PDF</button>
              <p className="miudo">Seu código: <b className="rl-codigo">{acesso.codigo}</b> · vale até {data(acesso.validade)} · para abrir em outro aparelho (até 3), digite o código lá. <button className="link-mudo" onClick={() => { if (confirm("Tirar o acesso deste navegador? O código continua valendo.")) esquecerAcesso(); }}>Sair deste aparelho</button></p>
              <p className="miudo">Análise feita com os cortes da chamada regular do Sisu de {rel!.anosAntes.length ? `${rel!.anosAntes[0]} a ${ano}` : ano}. Não garante aprovação: os cortes de 2027 só existem depois das inscrições. Confira tudo no portal oficial do Sisu. <a href="/relatorio/termos/">Termos e reembolso</a></p>
            </footer>
          )}
        </>
      )}
    </div>
  );
}

function Cadeado() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>;
}
