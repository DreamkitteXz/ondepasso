"use client";
// Relatório para o Sisu (/relatorio/). Tudo é calculado neste navegador com lib/relatorio.ts e lib/plano.ts.
// Fluxo: preferências → diagnóstico → finalistas → plano de ação.
// Sem acesso: prévia (o diagnóstico, uma recomendação explicada e a primeira linha de cada lista). Com código: tudo.
// Notas e preferências ficam só no localStorage deste navegador: nada vai para URL, analytics ou servidor.
import { useEffect, useMemo, useState } from "react";
import { lerNota, nota as fmt, diferenca, nomeModalidade } from "@/lib/formato";
import { salvarNotasAreas, salvarMod, useAreas, useMod, type Areas } from "@/lib/nota";
import { analisar, contarFaixas, valemMais, extremos, FAIXAS, NOME_FAIXA, EXPLICA_FAIXA, NOME_AREAS, type BaseCalc, type DadosRelatorio, type Faixa, type Opcao } from "@/lib/relatorio";
import {
  aplicarPreferencias, avisosEscolhas, cenarios, checklist, chaveOpcao, exploracao, filtroDoMotor, lerPreferencias, margens, motivos, pendencias,
  paraPrimeira, porPreferencia, recomendar, recorte, regraFaixa, CRITERIO_ORDEM, PREFS_VAZIAS, REGRA_SISU, ROTULO_AVALIACAO, ROTULO_VINCULO, PORTAL_SISU,
  type Avaliacao, type Considerada, type Escolhas, type Mobilidade, type Preferencias,
} from "@/lib/plano";
import { useAcesso, reconferir, esquecerAcesso, RELATORIO_ATIVO } from "@/lib/acesso";
import { useRegistrarQuando } from "@/lib/analytics";
import { CompraRelatorio } from "@/components/CompraRelatorio";
import { ImpressaoRelatorio } from "@/components/ImpressaoRelatorio";

const CAMPOS: { k: keyof Areas; rotulo: string; i: number }[] = [
  { k: "red", rotulo: "Redação", i: 0 }, { k: "mat", rotulo: "Matemática", i: 2 }, { k: "cn", rotulo: "Natureza", i: 4 }, { k: "ch", rotulo: "Humanas", i: 3 }, { k: "lin", rotulo: "Linguagens", i: 1 },
];
const TURNOS = ["Integral", "Matutino", "Vespertino", "Noturno", "EaD", "Semipresencial"];
const CHAVE_FILTRO_ANTIGO = "ondepasso.relatorio-filtro";
const CHAVE_PREFS = "ondepasso.relatorio-prefs", CHAVE_FINAIS = "ondepasso.relatorio-finalistas", CHAVE_CHECK = "ondepasso.relatorio-checklist";
const POR_PAGINA = 12, MAX_FINALISTAS = 4;
const AVALIACOES: Avaliacao[] = ["quero", "consideraria", "nao"];
const data = (iso: string) => iso.split("-").reverse().join("/");
const sinal = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + diferenca(Math.abs(v));
const ler = <T,>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) ?? "null") as T | null; } catch { return null; } };
const gravar = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento: vale só nesta visita */ } };
const alternar = <T,>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

export function Relatorio({ ano }: { ano: number }) {
  const areas = useAreas();
  const mod = useMod();
  const acesso = useAcesso();
  const liberado = RELATORIO_ATIVO && acesso != null;
  const [calc, setCalc] = useState<BaseCalc | null>(null);
  const [rel, setRel] = useState<DadosRelatorio | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [prefs, setPrefs] = useState<Preferencias>(PREFS_VAZIAS);
  const [faixa, setFaixa] = useState<Faixa>("segura");
  const [limite, setLimite] = useState(POR_PAGINA);
  const [finalistas, setFinalistas] = useState<string[]>([]);
  const [escolhas, setEscolhas] = useState<Escolhas>({ primeira: null, segunda: null });
  const [feitos, setFeitos] = useState<Record<string, boolean>>({});
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const abortar = new AbortController(); setFalhou(false);
    const baixar = (u: string) => fetch(u, { signal: abortar.signal }).then((r) => { if (!r.ok) throw new Error(u); return r.json(); });
    Promise.all([baixar("/calc.json"), baixar("/relatorio.json")]).then(([c, r]) => { setCalc(c); setRel(r); }).catch((e) => { if (e.name !== "AbortError") setFalhou(true); });
    return () => abortar.abort();
  }, [tentativa]);
  useEffect(() => {
    setPrefs(lerPreferencias(ler(CHAVE_PREFS), ler(CHAVE_FILTRO_ANTIGO)));
    const f = ler<{ chaves?: unknown; escolhas?: Escolhas }>(CHAVE_FINAIS);
    if (f && Array.isArray(f.chaves)) setFinalistas(f.chaves.filter((k): k is string => typeof k === "string").slice(0, MAX_FINALISTAS));
    if (f?.escolhas) setEscolhas({ primeira: typeof f.escolhas.primeira === "string" ? f.escolhas.primeira : null, segunda: typeof f.escolhas.segunda === "string" ? f.escolhas.segunda : null });
    const c = ler<Record<string, boolean>>(CHAVE_CHECK); if (c && typeof c === "object") setFeitos(c);
  }, []);
  useEffect(() => { if (acesso) void reconferir(acesso); }, [acesso]);
  const mudarPrefs = (p: Partial<Preferencias>) => { setPrefs((a) => { const novo = { ...a, ...p }; gravar(CHAVE_PREFS, novo); return novo; }); setLimite(POR_PAGINA); };
  const avaliar = (o: Opcao, v: Avaliacao) => { const k = chaveOpcao(o); const av = { ...prefs.avaliacoes }; if (av[k] === v) delete av[k]; else av[k] = v; mudarPrefs({ avaliacoes: av }); };
  const salvarFinais = (chaves: string[], e: Escolhas) => { setFinalistas(chaves); setEscolhas(e); gravar(CHAVE_FINAIS, { chaves, escolhas: e }); };
  const marcarFinalista = (o: Opcao) => {
    const k = chaveOpcao(o);
    if (finalistas.includes(k)) salvarFinais(finalistas.filter((x) => x !== k), { primeira: escolhas.primeira === k ? null : escolhas.primeira, segunda: escolhas.segunda === k ? null : escolhas.segunda });
    else if (finalistas.length < MAX_FINALISTAS) salvarFinais([...finalistas, k], escolhas);
  };
  const escolher = (k: string, qual: "primeira" | "segunda") => {
    const outra = qual === "primeira" ? "segunda" : "primeira";
    const e: Escolhas = { ...escolhas, [qual]: escolhas[qual] === k ? null : k };
    if (e[outra] === k) e[outra] = null; // a mesma opção não pode ser 1ª e 2ª
    salvarFinais(finalistas, e);
  };
  const marcarFeito = (id: string) => { const f = { ...feitos, [id]: !feitos[id] }; setFeitos(f); gravar(CHAVE_CHECK, f); };

  const notas = CAMPOS.map((c) => ({ ...c, texto: areas[c.k] ?? "", v: lerNota(areas[c.k] ?? "") }));
  const n = [0, 0, 0, 0, 0];
  for (const c of notas) if (c.v != null) n[c.i] = c.v;
  const completo = notas.every((c) => c.v != null);
  const mudarNota = (k: keyof Areas, v: string) => { salvarNotasAreas({ ...areas, [k]: v }); setLimite(POR_PAGINA); };

  const cursosMapa = useMemo(() => new Map((calc?.cursos ?? []).map((c) => [c.slug, c])), [calc]);
  const porNome = useMemo(() => new Map((calc?.cursos ?? []).map((c) => [c.curso.toLocaleLowerCase("pt-BR"), c.slug])), [calc]);
  const filtro = useMemo(() => filtroDoMotor(prefs), [prefs]);
  const ops = useMemo(() => (calc && rel && completo ? analisar(calc, rel, n, mod, filtro) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calc, rel, completo, mod, filtro, ...n]);
  const ap = useMemo(() => aplicarPreferencias(ops, prefs, cursosMapa), [ops, prefs, cursosMapa]);
  const cs = ap.consideradas;
  const conta = useMemo(() => contarFaixas(cs), [cs]);
  const rec = useMemo(() => recomendar(cs), [cs]);
  const pesos = useMemo(() => valemMais(cs) as Considerada[], [cs]);
  const lista = useMemo(() => cs.filter((c) => c.faixa === faixa).sort(porPreferencia), [cs, faixa]);
  const finais = useMemo(() => finalistas.map((k) => cs.find((c) => chaveOpcao(c) === k)).filter((c): c is Considerada => !!c), [finalistas, cs]);
  const ufs = useMemo(() => (calc ? [...new Set(calc.linhas.map((l) => l[4]))].sort() : []), [calc]);
  const cidadeUf = prefs.cidade?.split("|")[1] ?? "";
  const cidades = useMemo(() => (calc && cidadeUf ? [...new Set(calc.linhas.filter((l) => l[4] === cidadeUf).map((l) => l[3]))].sort((a, b) => a.localeCompare(b, "pt-BR")) : []), [calc, cidadeUf]);
  const temQualidade = cs.some((o) => o.q);
  const simples = n.reduce((a, b) => a + b, 0) / 5;
  const ex = extremos(n);
  const pronto = completo && calc != null && rel != null;
  const explorar = exploracao(prefs);
  const nomeMod = calc?.mods.find((m) => m.cod === mod)?.nome ?? nomeModalidade(mod);
  const anosBase = rel ? (rel.anosAntes.length ? `${rel.anosAntes[0]} a ${ano}` : String(ano)) : String(ano);
  const ctx = { prefs, grupos: calc?.grupos ?? [] };
  // Recomendação grátis da prévia: a primeira sugestão de 2ª opção (aceita e acima do corte); sem ela, a opção acima do
  // corte que viria primeiro na 1ª; só então a primeira de 1ª. Assim a amostra não é uma aposta sem contexto.
  const gratis = useMemo(() => rec.segunda[0] ?? cs.filter((c) => c.faixa === "segura" || c.faixa === "provavel").sort(paraPrimeira)[0] ?? rec.primeira[0] ?? null, [rec, cs]);
  useRegistrarQuando(pronto, `relatorio|${liberado ? "completo" : "previa"}`, "en_resultados_visualizados", { pagina: "relatorio", tipo_nota: "areas", resultado: liberado ? "completo" : "previa" });

  const adicionarCurso = (texto: string) => {
    const slug = porNome.get(texto.trim().toLocaleLowerCase("pt-BR"));
    if (!slug) return false;
    if (!prefs.cursos.includes(slug)) mudarPrefs({ cursos: [...prefs.cursos, slug] });
    setBusca("");
    return true;
  };

  const porque = (c: Considerada, aberto = false) => {
    const m = margens(c);
    const pend = pendencias(c, ano);
    return (
      <details className="rl-porque" open={aberto}>
        <summary>Por que esta opção apareceu</summary>
        <ul className="rl-motivos">{motivos(c, ctx).map((t) => <li key={t}>{t}</li>)}</ul>
        {!c.minimo && (
          <div className="rl-margens">
            <table className="rl-mini">
              <caption>Margens sobre o corte · {m.anos.length} {m.anos.length === 1 ? "edição" : "edições"} com dados ({m.anos.join(", ")})</caption>
              <tbody>
                <tr><th scope="row">Corte mais recente ({m.recente.ano})</th><td>{fmt(m.recente.corte)}</td><td className={m.recente.margem >= 0 ? "pos" : "neg"}>{sinal(m.recente.margem)}</td></tr>
                <tr><th scope="row">Maior corte das edições ({m.maior.ano})</th><td>{fmt(m.maior.corte)}</td><td className={m.maior.margem >= 0 ? "pos" : "neg"}>{sinal(m.maior.margem)}</td></tr>
              </tbody>
            </table>
            <table className="rl-mini">
              <caption>Simulação: e se o corte de {m.recente.ano} subir?</caption>
              <tbody>
                {cenarios(c).map((s) => (
                  <tr key={s.aumento}><th scope="row">+{s.aumento} pontos ({fmt(s.corte)})</th><td className={s.supera ? "pos" : "neg"}>{sinal(s.margem)}</td><td>{s.supera ? "ainda supera" : "fica abaixo"}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="miudo">Simulações, não previsões. O corte de 2027 só existe depois das inscrições.</p>
          </div>
        )}
        <p className="rl-regra">{regraFaixa(c)}</p>
        {pend.length > 0 && <><p className="rl-conferir-t">Para conferir</p><ul className="rl-conferir">{pend.map((t) => <li key={t}>{t}</li>)}</ul></>}
      </details>
    );
  };

  const linha = (c: Considerada, o: { destaque?: "ganho"; aberto?: boolean; rotulo?: string } = {}) => (
    <li key={chaveOpcao(c)} className={`rl-linha f-${c.faixa}`}>
      {o.rotulo && <p className="rl-gratis">{o.rotulo}</p>}
      <a className="rl-curso" href={`/curso/${c.slug}/${c.rota}/`}>
        <strong>{c.curso}</strong>
        <span className="meta">{c.ies}{c.campus ? ` · ${c.campus}` : ""} · {c.cidade}/{c.uf} · {c.turno}</span>
      </a>
      <span className="rl-num"><b>{fmt(c.media)}</b><small>sua média{Math.abs(c.ganho) >= 0.005 ? ` (${sinal(c.ganho)} com os pesos)` : ""}</small></span>
      <span className="rl-num"><b>{fmt(c.corte)}</b><small>corte {ano}</small></span>
      <span className={`rl-num rl-folga ${c.folga >= 0 ? "pos" : "neg"}`}><b>{o.destaque === "ganho" ? sinal(c.ganho) : sinal(c.folga)}</b><small>{o.destaque === "ganho" ? "ganho com os pesos" : c.folga >= 0 ? "de margem" : "faltam"}</small></span>
      <span className="rl-detalhe">
        <span className={`selo-faixa ${c.faixa}`}>{c.minimo ? "Nota mínima" : NOME_FAIXA[c.faixa]}</span>
        <span className={`selo-vinculo v-${c.vinculo}`}>{ROTULO_VINCULO[c.vinculo]}</span>
        {c.hist.length > 1 && <span className="rl-hist">{c.hist.map((h) => `${h.ano}: ${fmt(h.corte)}`).join(" → ")}</span>}
        {c.porVaga != null && <span>{c.inscritos!.toLocaleString("pt-BR")} inscritos para {c.vagas} {c.vagas === 1 ? "vaga" : "vagas"}</span>}
        {c.q && (c.q.enade != null || c.q.cpc != null || c.q.igc != null) && <span>Inep{c.q.ano ? ` ${c.q.ano}` : ""}: {[c.q.enade != null && `Enade ${c.q.enade}`, c.q.cpc != null && `CPC ${c.q.cpc}`, c.q.igc != null && `IGC ${c.q.igc}`].filter(Boolean).join(" · ")}</span>}
      </span>
      <div className="rl-acoes">
        <div className="rl-avaliar" role="group" aria-label={`Sua avaliação de ${c.curso}, ${c.ies}`}>
          {AVALIACOES.map((a) => <button key={a} type="button" className={`chip chip-p${prefs.avaliacoes[chaveOpcao(c)] === a ? " ativo" : ""} a-${a}`} aria-pressed={prefs.avaliacoes[chaveOpcao(c)] === a} onClick={() => avaliar(c, a)}>{ROTULO_AVALIACAO[a]}</button>)}
        </div>
        {liberado && (
          <label className="rl-marca"><input type="checkbox" checked={finalistas.includes(chaveOpcao(c))} disabled={!finalistas.includes(chaveOpcao(c)) && finalistas.length >= MAX_FINALISTAS} onChange={() => marcarFinalista(c)} />Finalista</label>
        )}
      </div>
      {porque(c, o.aberto)}
    </li>
  );
  /** Na prévia, cada lista mostra só a primeira linha (lib/plano.ts → recorte) e diz quantas ficaram de fora. */
  const parte = ({ itens, vazio, destaque, max }: { itens: Considerada[]; vazio: string; destaque?: "ganho"; max?: number }) => {
    if (itens.length === 0) return <p className="rl-vazio">{vazio}</p>;
    const { visiveis, escondidas } = recorte(itens, liberado, max);
    return (
      <ul className="rl-lista">
        {visiveis.map((c) => linha(c, { destaque }))}
        {escondidas > 0 && <li className="rl-cadeado"><Cadeado />Mais {escondidas} {escondidas === 1 ? "opção" : "opções"}, cada uma com o porquê, no relatório completo</li>}
      </ul>
    );
  };

  return (
    <div className="relatorio">
      <section className="calc-painel rl-notas" aria-labelledby="t-rl-notas">
        <p className="rl-num-secao">01 · Preferências</p>
        <div className="calc-painel-topo">
          <h2 id="t-rl-notas">Suas notas e o que você quer</h2>
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

          <fieldset><legend>Cursos que você quer <small>(sem nenhum, o relatório vira exploração)</small></legend>
            <form className="rl-busca" onSubmit={(e) => { e.preventDefault(); adicionarCurso(busca); }}>
              <input list="rl-cursos" value={busca} placeholder="Digite um curso, ex.: Enfermagem" aria-label="Adicionar curso" autoComplete="off"
                onChange={(e) => {
                  setBusca(e.target.value);
                  // Escolher uma sugestão da lista adiciona na hora; digitar letra por letra não (senão "Física" entraria antes de "Física Médica").
                  const tipo = (e.nativeEvent as InputEvent).inputType;
                  if (!tipo || tipo === "insertReplacementText") adicionarCurso(e.target.value);
                }} />
              <datalist id="rl-cursos">{(calc?.cursos ?? []).map((c) => <option key={c.slug} value={c.curso} />)}</datalist>
              <button type="submit" className="botao botao-contorno">Adicionar</button>
            </form>
            {busca.trim() !== "" && !porNome.has(busca.trim().toLocaleLowerCase("pt-BR")) && <p className="miudo">Escolha um nome da lista de sugestões.</p>}
            {prefs.cursos.length > 0 && (
              <div className="rl-chips">
                {prefs.cursos.map((s) => <button key={s} type="button" className="chip ativo" onClick={() => mudarPrefs({ cursos: prefs.cursos.filter((x) => x !== s) })} aria-label={`Tirar ${cursosMapa.get(s)?.curso ?? s}`}>{cursosMapa.get(s)?.curso ?? s} ×</button>)}
              </div>
            )}
            <label className="rl-check"><input type="checkbox" checked={prefs.relacionados} disabled={explorar} onChange={(e) => mudarPrefs({ relacionados: e.target.checked })} />Aceito cursos relacionados (da mesma área dos que marquei)</label>
          </fieldset>

          <fieldset><legend>Onde você pode estudar</legend>
            <div className="rl-chips" role="radiogroup" aria-label="Onde você pode estudar">
              {([["brasil", "Em qualquer lugar"], ["estados", "Só em alguns estados"], ["cidade", "Só na minha cidade"]] as [Mobilidade, string][]).map(([v, t]) => (
                <button key={v} type="button" role="radio" aria-checked={prefs.mobilidade === v} className={`chip${prefs.mobilidade === v ? " ativo" : ""}`} onClick={() => mudarPrefs({ mobilidade: v })}>{t}</button>
              ))}
            </div>
            {prefs.mobilidade === "estados" && <div className="rl-chips rl-ufs">{ufs.map((u) => <button key={u} type="button" className={`chip${prefs.ufs.includes(u) ? " ativo" : ""}`} aria-pressed={prefs.ufs.includes(u)} onClick={() => mudarPrefs({ ufs: alternar(prefs.ufs, u) })}>{u}</button>)}</div>}
            {prefs.mobilidade === "estados" && prefs.ufs.length === 0 && <p className="miudo">Marque os estados. Sem nenhum marcado, vale o Brasil todo.</p>}
            {prefs.mobilidade === "cidade" && (
              <div className="rl-cidade">
                <label className="rl-select">Estado
                  <select value={cidadeUf} onChange={(e) => mudarPrefs({ cidade: e.target.value ? `|${e.target.value}` : null })}>
                    <option value="">Escolha</option>{ufs.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
                <label className="rl-select">Cidade
                  <select value={prefs.cidade?.split("|")[0] ?? ""} disabled={!cidadeUf} onChange={(e) => mudarPrefs({ cidade: `${e.target.value}|${cidadeUf}` })}>
                    <option value="">Escolha</option>{cidades.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
            )}
          </fieldset>

          <fieldset><legend>Turno</legend>
            <label className="rl-check"><input type="checkbox" checked={prefs.noite} onChange={(e) => mudarPrefs({ noite: e.target.checked })} />Preciso estudar à noite (só cursos noturnos)</label>
          </fieldset>

          <details className="rl-mais">
            <summary>Mais filtros{prefs.turnos.length + (explorar ? prefs.grupos.length : 0) ? ` (${prefs.turnos.length + (explorar ? prefs.grupos.length : 0)})` : ""}</summary>
            {!prefs.noite && (
              <fieldset><legend>Turnos que você aceita <small>(nenhum marcado = qualquer)</small></legend>
                <div className="rl-chips">{TURNOS.map((t) => <button key={t} type="button" className={`chip${prefs.turnos.includes(t) ? " ativo" : ""}`} aria-pressed={prefs.turnos.includes(t)} onClick={() => mudarPrefs({ turnos: alternar(prefs.turnos, t) })}>{t}</button>)}</div>
              </fieldset>
            )}
            <fieldset><legend>Áreas para explorar <small>{explorar ? "(nenhuma marcada = todas)" : "(valem só sem cursos marcados)"}</small></legend>
              <div className="rl-chips">{(calc?.grupos ?? []).map((g, i) => <button key={g} type="button" disabled={!explorar} className={`chip${prefs.grupos.includes(i) ? " ativo" : ""}`} aria-pressed={prefs.grupos.includes(i)} onClick={() => mudarPrefs({ grupos: alternar(prefs.grupos, i) })}>{g}</button>)}</div>
            </fieldset>
          </details>

          {ap.naoFaria.length > 0 && (
            <details className="rl-mais">
              <summary>{ap.naoFaria.length} {ap.naoFaria.length === 1 ? "opção marcada" : "opções marcadas"} como “Não faria” (fora do relatório)</summary>
              <ul className="rl-ocultas">{ap.naoFaria.map((o) => <li key={chaveOpcao(o)}>{o.curso} · {o.ies} · {o.cidade}/{o.uf} <button type="button" className="link-mudo" onClick={() => avaliar(o, "nao")}>Desfazer</button></li>)}</ul>
            </details>
          )}
        </div>
      </section>

      {!completo ? (
        <p className="rl-aviso">Preencha as cinco notas (0 a 1000) para montar o relatório. A prévia é grátis e usa as suas notas.</p>
      ) : falhou ? (
        <div className="rl-aviso" role="alert"><strong>Não foi possível carregar os cortes.</strong> Suas notas continuam preenchidas. <button className="botao" onClick={() => setTentativa((t) => t + 1)}>Tentar de novo</button></div>
      ) : !pronto ? (
        <p className="rl-aviso">Montando o relatório…</p>
      ) : ops.length === 0 ? (
        <div className="rl-aviso"><strong>Nenhuma opção com corte nesta seleção.</strong> Amplie o lugar ou o turno, ou troque a modalidade. <button className="botao" onClick={() => mudarPrefs({ mobilidade: "brasil", noite: false, turnos: [], grupos: [] })}>Tirar as restrições de lugar e turno</button></div>
      ) : cs.length === 0 ? (
        <div className="rl-aviso">
          <strong>Nenhuma opção com as suas preferências.</strong>{" "}
          {[ap.foraDoCurso && `${ap.foraDoCurso.toLocaleString("pt-BR")} ficaram de fora por serem de outros cursos`, ap.foraDaCidade && `${ap.foraDaCidade.toLocaleString("pt-BR")} por serem de outra cidade`, ap.naoFaria.length && `${ap.naoFaria.length} por “Não faria”`].filter(Boolean).join("; ")}.
          {!explorar && !prefs.relacionados && <button className="botao" onClick={() => mudarPrefs({ relacionados: true })}>Aceitar cursos relacionados</button>}
          {prefs.mobilidade !== "brasil" && <button className="botao botao-contorno" onClick={() => mudarPrefs({ mobilidade: "brasil" })}>Ver em qualquer lugar</button>}
        </div>
      ) : (
        <>
          <section className="rl-bloco" aria-labelledby="t-rl-resumo">
            <p className="rl-num-secao">02 · Diagnóstico</p>
            <h2 id="t-rl-resumo">Onde você está</h2>
            {explorar && <p className="rl-exploracao" role="note"><strong>Modo exploração.</strong> Você ainda não marcou os cursos que quer, então a lista mostra tudo o que cabe no lugar e no turno escolhidos, sem saber se você faria cada curso. A sugestão de 2ª opção só usa opções que você marcar como “Quero muito” ou “Consideraria”.</p>}
            <p className="rl-sub">{cs.length.toLocaleString("pt-BR")} {cs.length === 1 ? "opção" : "opções"} com corte em {ano} dentro das suas preferências, na modalidade {nomeMod}. Sua área mais forte é {NOME_AREAS[ex.forte]} ({fmt(n[ex.forte])}); a mais fraca, {NOME_AREAS[ex.fraca]} ({fmt(n[ex.fraca])}).</p>
            <ul className="rl-placar">
              {FAIXAS.filter((f) => f !== "fora").map((f) => <li key={f} className={f}><strong>{conta[f].toLocaleString("pt-BR")}</strong><span>{NOME_FAIXA[f]}</span><small>{EXPLICA_FAIXA[f]}</small></li>)}
            </ul>
            <p className="miudo">{conta.fora.toLocaleString("pt-BR")} {conta.fora === 1 ? "fica" : "ficam"} fora do alcance (mais de 25 pontos abaixo do corte, ou sem uma nota mínima). As faixas comparam a sua média com os cortes de {anosBase}; não são previsão de aprovação. Cada opção mostra, em “Por que esta opção apareceu”, a conta da faixa com os números dela.</p>
          </section>

          <section className="rl-bloco" aria-labelledby="t-rl-est">
            <p className="rl-num-secao">02 · Diagnóstico</p>
            <h2 id="t-rl-est">1ª e 2ª opção</h2>
            <p className="rl-sub">{REGRA_SISU}</p>
            <p className="rl-sub rl-criterio">{CRITERIO_ORDEM}</p>
            {!liberado && gratis && (
              <div className="rl-amostra-gratis">
                <ul className="rl-lista">{linha(gratis, { aberto: true, rotulo: `Recomendação grátis${rec.segunda[0] === gratis ? " para a 2ª opção" : ""}, com a explicação completa` })}</ul>
              </div>
            )}
            <div className="rl-duas">
              <div><h3>Para a 1ª opção <small>as que você mais quer, entre as ao seu alcance (inclui “No limite” e “Aposta”), a mais perto do corte primeiro</small></h3>{parte({ itens: rec.primeira, vazio: "Nenhuma opção ao seu alcance com estas preferências. Amplie o lugar, aceite cursos relacionados ou troque a modalidade." })}</div>
              <div><h3>Para a 2ª opção <small>só as que você aceitaria cursar e em que sua média supera o corte de {ano}, a de maior margem primeiro</small></h3>{parte({ itens: rec.segunda, vazio: explorar ? "Marque como “Quero muito” ou “Consideraria” as opções que você faria. Só elas entram aqui." : "Nenhuma opção que você aceita tem a média acima do corte. Vale aceitar relacionados ou ampliar o lugar." })}</div>
            </div>
          </section>

          {!liberado && (
            <section className="rl-bloco rl-venda" aria-labelledby="t-rl-venda">
              <h2 id="t-rl-venda">{gratis ? "Esta foi uma recomendação, com o porquê. O relatório completo monta o seu plano." : "O relatório completo monta o seu plano."}</h2>
              <ul className="rl-vantagens">
                <li>A 1ª e a 2ª opção ordenadas pelo que você quer, cada uma com o porquê, as margens e os cenários de +5, +10 e +20 pontos</li>
                <li>Todas as opções das suas preferências, por faixa, com o histórico do corte e a concorrência</li>
                <li>Os cursos em que os pesos mais ajudam as suas notas</li>
                <li>Até {MAX_FINALISTAS} finalistas lado a lado, com a sua escolha de 1ª e 2ª e o que conferir em cada uma</li>
                <li>Um plano de ação com checklist e links oficiais, e uma versão para salvar em PDF ou imprimir</li>
                <li>Refaça quantas vezes quiser, mudando nota, cota e preferências</li>
              </ul>
              <p className="miudo">Análise com os cortes de {anosBase}. Não é previsão de aprovação.</p>
              <CompraRelatorio origem="relatorio" />
            </section>
          )}

          <section className="rl-bloco" aria-labelledby="t-rl-pesos">
            <p className="rl-num-secao">02 · Diagnóstico</p>
            <h2 id="t-rl-pesos">Onde suas notas valem mais</h2>
            <p className="rl-sub">Cada curso dá um peso a cada área. Aqui estão as opções ao seu alcance em que a média com os pesos fica mais acima da sua média simples ({fmt(simples)}), da maior diferença para a menor.</p>
            {parte({ itens: pesos, destaque: "ganho", vazio: "Nestas preferências, nenhum curso ao seu alcance tem pesos que aumentam a sua média." })}
          </section>

          <section className="rl-bloco" aria-labelledby="t-rl-todas">
            <p className="rl-num-secao">02 · Diagnóstico</p>
            <h2 id="t-rl-todas">Todas as opções, por faixa</h2>
            <div className="rl-abas" role="tablist" aria-label="Faixas">
              {FAIXAS.map((f) => <button key={f} role="tab" aria-selected={faixa === f} className={`chip${faixa === f ? " ativo" : ""}`} onClick={() => { setFaixa(f); setLimite(POR_PAGINA); }}>{NOME_FAIXA[f]} · {conta[f].toLocaleString("pt-BR")}</button>)}
            </div>
            <p className="rl-sub">{EXPLICA_FAIXA[faixa]} Ordem: sua preferência, depois a maior margem.</p>
            {parte({ itens: lista, max: limite, vazio: "Nenhuma opção nesta faixa." })}
            {liberado && lista.length > limite && <button className="ver-mais" onClick={() => setLimite((x) => x + 24)}>Ver mais {Math.min(24, lista.length - limite)} (faltam {lista.length - limite})</button>}
          </section>

          <section className="rl-bloco" aria-labelledby="t-rl-cmp">
            <p className="rl-num-secao">03 · Finalistas</p>
            <h2 id="t-rl-cmp">Lado a lado</h2>
            {!liberado ? (
              <div className="rl-amostra">
                <p className="rl-sub">No relatório completo, cada opção ganha a marca “Finalista”. Até {MAX_FINALISTAS} ficam lado a lado com modalidade, média, cortes, margens, cenários, sua preferência, os motivos e o que conferir, e você marca qual seria a sua 1ª e a sua 2ª.</p>
                {gratis && (
                  <div className="rl-rolagem" data-rolagem-propria>
                    <table className="rl-tabela">
                      <caption className="rl-legenda">Amostra com a recomendação grátis acima</caption>
                      <thead><tr><th scope="col" /><th scope="col">{gratis.curso}<small>{gratis.ies} · {gratis.cidade}/{gratis.uf}</small></th><th scope="col" className="rl-trancada"><Cadeado /> Finalista 2</th></tr></thead>
                      <tbody>
                        <tr><th scope="row">Situação</th><td><span className={`selo-faixa ${gratis.faixa}`}>{NOME_FAIXA[gratis.faixa]}</span></td><td className="rl-trancada" /></tr>
                        <tr><th scope="row">Sua média</th><td><b>{fmt(gratis.media)}</b></td><td className="rl-trancada" /></tr>
                        <tr><th scope="row">Margem sobre {ano}</th><td className={gratis.folga >= 0 ? "pos" : "neg"}>{sinal(gratis.folga)}</td><td className="rl-trancada" /></tr>
                        <tr><th scope="row">Se o corte subir 10</th><td>{cenarios(gratis)[1].supera ? "ainda supera" : "fica abaixo"}</td><td className="rl-trancada" /></tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : finais.length === 0 ? (
              <p className="rl-sub">Marque “Finalista” em até {MAX_FINALISTAS} opções das listas acima para vê-las lado a lado e escolher a sua 1ª e a sua 2ª.{finalistas.length > 0 ? ` ${finalistas.length === 1 ? "A finalista que você marcou não está" : "As finalistas que você marcou não estão"} nas preferências e na modalidade de agora.` : ""}</p>
            ) : (
              <>
                {finalistas.length > finais.length && <p className="miudo">{finalistas.length - finais.length} {finalistas.length - finais.length === 1 ? "finalista saiu" : "finalistas saíram"} desta seleção (mudou a modalidade ou as preferências). Volte a elas para ver de novo.</p>}
                <div className="rl-rolagem" data-rolagem-propria>
                  <table className="rl-tabela rl-finais">
                    <thead><tr><th scope="col" />{finais.map((c) => <th scope="col" key={chaveOpcao(c)}><a href={`/curso/${c.slug}/${c.rota}/`}>{c.curso}</a><small>{c.ies}{c.campus ? ` · ${c.campus}` : ""} · {c.cidade}/{c.uf} · {c.turno}</small></th>)}</tr></thead>
                    <tbody>
                      <tr><th scope="row">Sua escolha <small>(não é a inscrição)</small></th>{finais.map((c) => { const k = chaveOpcao(c); return (
                        <td key={k}><div className="rl-escolha" role="group" aria-label={`Escolha para ${c.curso}, ${c.ies}`}>
                          <button type="button" className={`chip${escolhas.primeira === k ? " ativo" : ""}`} aria-pressed={escolhas.primeira === k} onClick={() => escolher(k, "primeira")}>1ª opção</button>
                          <button type="button" className={`chip${escolhas.segunda === k ? " ativo" : ""}`} aria-pressed={escolhas.segunda === k} onClick={() => escolher(k, "segunda")}>2ª opção</button>
                        </div></td>); })}</tr>
                      <tr><th scope="row">Sua preferência</th>{finais.map((c) => <td key={chaveOpcao(c)}>{ROTULO_VINCULO[c.vinculo]}{c.relacionadoA ? ` (a ${c.relacionadoA})` : ""}</td>)}</tr>
                      <tr><th scope="row">Modalidade</th>{finais.map((c) => <td key={chaveOpcao(c)}>{nomeMod}</td>)}</tr>
                      <tr><th scope="row">Situação</th>{finais.map((c) => <td key={chaveOpcao(c)}><span className={`selo-faixa ${c.faixa}`}>{c.minimo ? "Nota mínima" : NOME_FAIXA[c.faixa]}</span></td>)}</tr>
                      <tr><th scope="row">Sua média (pesos)</th>{finais.map((c) => <td key={chaveOpcao(c)}><b>{fmt(c.media)}</b>{Math.abs(c.ganho) >= 0.005 && <small> {sinal(c.ganho)} sobre a simples</small>}</td>)}</tr>
                      <tr><th scope="row">Cortes</th>{finais.map((c) => <td key={chaveOpcao(c)}>{c.hist.map((h) => `${h.ano}: ${fmt(h.corte)}`).join(" · ")}</td>)}</tr>
                      <tr><th scope="row">Margem sobre {ano}</th>{finais.map((c) => <td key={chaveOpcao(c)} className={c.folga >= 0 ? "pos" : "neg"}>{sinal(c.folga)}</td>)}</tr>
                      <tr><th scope="row">Margem sobre o maior corte</th>{finais.map((c) => { const m = margens(c); return <td key={chaveOpcao(c)} className={m.maior.margem >= 0 ? "pos" : "neg"}>{sinal(m.maior.margem)} <small>({m.maior.ano})</small></td>; })}</tr>
                      <tr><th scope="row">Supera o corte em</th>{finais.map((c) => { const m = margens(c); return <td key={chaveOpcao(c)}>{m.supera.length} de {m.anos.length} {m.anos.length === 1 ? "edição" : "edições"}</td>; })}</tr>
                      <tr><th scope="row">Corte +5 / +10 / +20</th>{finais.map((c) => <td key={chaveOpcao(c)}>{c.minimo ? "—" : cenarios(c).map((s) => (s.supera ? "supera" : "abaixo")).join(" / ")}</td>)}</tr>
                      <tr><th scope="row">Inscritos por vaga</th>{finais.map((c) => <td key={chaveOpcao(c)}>{c.porVaga == null ? "sem dado" : `${c.porVaga.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} (${c.vagas} ${c.vagas === 1 ? "vaga" : "vagas"})`}</td>)}</tr>
                      <tr><th scope="row">Bônus regional</th>{finais.map((c) => <td key={chaveOpcao(c)}>{c.bonus > 0 ? `${c.bonus.toLocaleString("pt-BR")}%` : "não"}</td>)}</tr>
                      {temQualidade && <tr><th scope="row">Qualidade (Inep)</th>{finais.map((c) => <td key={chaveOpcao(c)}>{c.q ? [c.q.enade != null && `Enade ${c.q.enade}`, c.q.cpc != null && `CPC ${c.q.cpc}`, c.q.igc != null && `IGC ${c.q.igc}`].filter(Boolean).join(" · ") || "sem dado" : "sem dado"}</td>)}</tr>}
                      <tr><th scope="row">Por que apareceu</th>{finais.map((c) => <td key={chaveOpcao(c)}><ul className="rl-celula">{motivos(c, ctx).map((t) => <li key={t}>{t}</li>)}</ul></td>)}</tr>
                      <tr><th scope="row">Para conferir</th>{finais.map((c) => { const p = pendencias(c, ano); return <td key={chaveOpcao(c)}>{p.length ? <ul className="rl-celula">{p.map((t) => <li key={t}>{t}</li>)}</ul> : "Nada apontado pelos dados; confira o edital."}</td>; })}</tr>
                    </tbody>
                  </table>
                </div>
                {avisosEscolhas(escolhas, finais).map((t) => <p key={t} className="rl-alerta">{t}</p>)}
                <p className="miudo">Marcar 1ª e 2ª aqui é só o seu plano: a inscrição é feita no <a href={PORTAL_SISU} target="_blank" rel="noopener noreferrer">Portal Único do Sisu</a>, dentro do prazo do edital.</p>
              </>
            )}
          </section>

          {liberado && acesso && (
            <section className="rl-bloco" aria-labelledby="t-rl-plano">
              <p className="rl-num-secao">04 · Plano de ação</p>
              <h2 id="t-rl-plano">O que fazer agora</h2>
              <p className="rl-sub">“Exigência” é regra geral conhecida; “Sugestão” é um passo que ajuda. Nada aqui tem data: o calendário sai no edital do Sisu.</p>
              <ul className="rl-checklist">
                {checklist(mod, nomeMod).map((i) => (
                  <li key={i.id}>
                    <label><input type="checkbox" checked={!!feitos[i.id]} onChange={() => marcarFeito(i.id)} /><span><strong>{i.texto}</strong> <em className={`rl-tipo ${i.tipo}`}>{i.tipo === "exigencia" ? "Exigência" : "Sugestão"}</em></span></label>
                    <p>{i.detalhe}{i.link && <> <a href={i.link.href} {...(i.link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{i.link.rotulo}{i.link.href.startsWith("http") ? " ↗" : ""}</a></>}</p>
                  </li>
                ))}
              </ul>
              <footer className="rl-rodape">
                <button className="botao botao-contorno rl-imprimir" onClick={() => window.print()}>Salvar em PDF ou imprimir o plano</button>
                <p className="miudo">O PDF é montado aqui no navegador (no diálogo de impressão, escolha “Salvar como PDF”). Leva as notas, as preferências, {finais.length ? "as finalistas e a sua escolha" : "as recomendações"}, os motivos, as margens, os cenários e este checklist.</p>
                <p className="miudo">Seu código: <b className="rl-codigo">{acesso.codigo}</b> · vale até {data(acesso.validade)} · para abrir em outro aparelho (até 3), digite o código lá. <button className="link-mudo" onClick={() => { if (confirm("Tirar o acesso deste navegador? O código continua valendo.")) esquecerAcesso(); }}>Sair deste aparelho</button></p>
                <p className="miudo">Análise feita com os cortes da chamada regular do Sisu de {anosBase}. Não garante aprovação: os cortes de 2027 só existem depois das inscrições. Confira tudo no portal oficial do Sisu. <a href="/relatorio/termos/">Termos e reembolso</a></p>
              </footer>
            </section>
          )}

          {liberado && (
            <ImpressaoRelatorio ano={ano} anosBase={anosBase} notas={notas.map((c) => ({ rotulo: c.rotulo, v: c.v ?? 0 }))} simples={simples} nomeMod={nomeMod} prefs={prefs}
              nomesCursos={prefs.cursos.map((s) => cursosMapa.get(s)?.curso ?? s)} grupos={calc?.grupos ?? []}
              itens={finais.length ? finais : [...new Map([...rec.primeira.slice(0, 2), ...rec.segunda.slice(0, 2)].map((c) => [chaveOpcao(c), c])).values()]}
              saoFinalistas={finais.length > 0} escolhas={escolhas} checklist={checklist(mod, nomeMod)} feitos={feitos} />
          )}
        </>
      )}
    </div>
  );
}

export function Cadeado() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>;
}
