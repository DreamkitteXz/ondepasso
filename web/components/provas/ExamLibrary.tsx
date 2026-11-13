"use client";
// Biblioteca de provas: uma prova por dia de cada aplicação (as cores ficam dentro do cartão), organizada por ano.
// O HTML estático já traz todas as provas (bom para o Google); os filtros só escondem no navegador e ficam na URL.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Exame, Filtros, Grupo, InfoVestibular, Prova } from "@/lib/provas-tipos";
import { FILTROS_VAZIOS, MODALIDADE_CURTA, VESTIBULAR_ROTULO, agrupar, cadernoInicial, filtrarExames, filtrarGrupos, filtrosDaUrl, filtrosParaUrl, tituloExame, tituloProva, versaoInicial } from "@/lib/provas-tipos";
import { alternarFavorita, leiturasRecentes, lerFavoritas } from "@/lib/leitor/preferencias";
import { registrar, registrarUmaVez } from "@/lib/analytics";
import { ExamCard } from "./ExamCard";
import { ExameCard } from "./ExameCard";
import { ExamFilters } from "./ExamFilters";

const assinarFav = (cb: () => void) => { window.addEventListener("ondepasso:favoritas", cb); window.addEventListener("storage", cb); return () => { window.removeEventListener("ondepasso:favoritas", cb); window.removeEventListener("storage", cb); }; };
let favCache = ""; let favLista: string[] = [];
const lerFavSnapshot = () => { const l = lerFavoritas(); const k = l.join(","); if (k !== favCache) { favCache = k; favLista = l; } return favLista; };
const SEM: string[] = [];

function SuasProvas({ provas, exames, salvas }: { provas: Prova[]; exames: Exame[]; salvas: string[] }) {
  const [recente, setRecente] = useState<{ p: Prova; pagina: number } | null>(null);
  useEffect(() => {
    const r = leiturasRecentes().map((x) => ({ p: provas.find((p) => p.id === x.id), pagina: x.pagina })).find((x) => x.p);
    if (r?.p) setRecente({ p: r.p, pagina: r.pagina });
  }, [provas]);
  const lista = salvas.map((id) => provas.find((p) => p.id === id)).filter((p): p is Prova => !!p && p.id !== recente?.p.id);
  const listaExames = salvas.map((id) => exames.find((e) => e.id === id)).filter((e): e is Exame => !!e);
  if (!recente && lista.length === 0 && listaExames.length === 0) return null;
  return (
    <section className="suas-provas" aria-label="Suas provas">
      {recente && (
        <a className="continuar" href={`/provas/${recente.p.id}/#ler`} style={{ ["--cor-caderno" as string]: recente.p.corHex }}>
          <span className="continuar-marca" aria-hidden="true" />
          <span><strong>Continuar lendo</strong><span>{tituloProva(recente.p)}, página {recente.pagina}</span></span>
        </a>
      )}
      {lista.length + listaExames.length > 0 && (
        <div className="salvas">
          <span>Salvas</span>
          <ul>
            {lista.map((p) => (
              <li key={p.id}>
                <a href={`/provas/${p.id}/`}><span className="bolinha" style={{ background: p.corHex }} aria-hidden="true" />{tituloProva(p)}</a>
                <button type="button" aria-label={`Tirar ${tituloProva(p)} das salvas`} onClick={() => alternarFavorita(p.id)}>×</button>
              </li>
            ))}
            {listaExames.map((e) => (
              <li key={e.id}>
                <a href={`/provas/${e.id}/`}>{tituloExame(e)}</a>
                <button type="button" aria-label={`Tirar ${tituloExame(e)} das salvas`} onClick={() => alternarFavorita(e.id)}>×</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function ExamLibrary({ provas, exames = [], vestibulares = [] }: { provas: Prova[]; exames?: Exame[]; vestibulares?: InfoVestibular[] }) {
  const [f, setF] = useState<Filtros>(FILTROS_VAZIOS);
  const [pronto, setPronto] = useState(false);
  const salvas = useSyncExternalStore(assinarFav, lerFavSnapshot, () => SEM);
  const buscaRegistrada = useRef(false);

  useEffect(() => {
    setF(filtrosDaUrl(new URLSearchParams(location.search)));
    setPronto(true);
    registrarUmaVez("biblioteca", "enem_biblioteca_visualizada", {});
  }, []);
  useEffect(() => {
    if (!pronto) return;
    const t = setTimeout(() => history.replaceState(null, "", location.pathname + filtrosParaUrl(f)), 250);
    return () => clearTimeout(t);
  }, [f, pronto]);

  const mudar = (p: Partial<Filtros>, filtro: string) => {
    setF((v) => ({ ...v, ...p }));
    if (filtro === "busca") {
      if (!buscaRegistrada.current) { buscaRegistrada.current = true; registrar("enem_filtro_aplicado", { filtro: "busca" }); }
      return;
    }
    const valor = Object.values(p)[0];
    registrar("enem_filtro_aplicado", { filtro, valor: valor == null || valor === false ? "todos" : `${filtro}_${String(valor)}`.toLowerCase() });
  };
  const limpar = () => { setF(FILTROS_VAZIOS); registrar("enem_filtro_aplicado", { filtro: "limpar" }); };

  const todos = useMemo(() => agrupar(provas), [provas]);
  const grupos = useMemo(() => filtrarGrupos(todos, f), [todos, f]);
  const examesVisiveis = useMemo(() => filtrarExames(exames, f), [exames, f]);
  const anosEnem = useMemo(() => [...new Set(provas.map((p) => p.ano))], [provas]);
  // Edições que existem no vestibular escolhido (sem escolha, todas).
  const anos = useMemo(() => [...new Set([
    ...(f.vestibular == null || f.vestibular === "enem" ? provas.map((p) => p.ano) : []),
    ...exames.filter((e) => f.vestibular == null || e.vestibular === f.vestibular).map((e) => e.edicao),
  ])].sort((a, b) => b - a), [provas, exames, f.vestibular]);
  // Outros vestibulares: uma seção por vestibular e edição, na ordem do catálogo (edição mais recente primeiro).
  const porEdicao = useMemo(() => {
    const m = new Map<string, Exame[]>();
    for (const e of examesVisiveis) { const k = `${e.vestibular}-${e.edicao}`; if (!m.has(k)) m.set(k, []); m.get(k)!.push(e); }
    return [...m.values()];
  }, [examesVisiveis]);
  const total = todos.length + exames.length, visiveis = grupos.length + examesVisiveis.length;
  const porAno = useMemo(() => {
    const m = new Map<number, { principais: Grupo[]; outras: Grupo[] }>();
    for (const g of grupos) {
      if (!m.has(g.ano)) m.set(g.ano, { principais: [], outras: [] });
      (g.modalidade === "regular" ? m.get(g.ano)!.principais : m.get(g.ano)!.outras).push(g);
    }
    return [...m.entries()];
  }, [grupos]);
  const filtrando = visiveis !== total;

  return (
    <div className="biblioteca" data-pronto={pronto ? "1" : undefined}>
      <SuasProvas provas={provas} exames={exames} salvas={salvas} />
      <ExamFilters f={f} anos={anos} anosEnem={anosEnem} vestibulares={vestibulares} mudar={mudar} />
      <p className="biblioteca-contagem" role="status" aria-live="polite">
        {filtrando ? <>{visiveis} de {total} provas <button type="button" className="link-botao" onClick={limpar}>Limpar filtros</button></> : exames.length ? `${total} provas: ${todos.length} do Enem${vestibulares.filter((v) => v.exames > 0).map((v) => ` e ${v.exames} da ${v.nome}`).join("")}` : `${todos.length} provas, ${provas.length} cadernos`}
      </p>

      {visiveis === 0 ? (
        <div className="biblioteca-vazia">
          <p><strong>Nenhuma prova com esses filtros.</strong></p>
          <p>{f.vestibular && f.vestibular !== "enem"
            ? `O catálogo da ${VESTIBULAR_ROTULO[f.vestibular]} vai de ${Math.min(...exames.filter((e) => e.vestibular === f.vestibular).map((e) => e.edicao))} a ${Math.max(...exames.filter((e) => e.vestibular === f.vestibular).map((e) => e.edicao))}. Tente outra edição ou limpe os filtros.`
            : f.fase != null ? "O Enem não tem fases, e os filtros de cor, área e aplicação valem só para ele. Tire um dos filtros ou limpe todos."
            : "A aplicação digital só existiu em 2021 e 2022, e a de Belém só em 2025. Tente outro ano ou limpe os filtros."}</p>
          <button type="button" className="botao botao-contorno" onClick={limpar}>Limpar filtros</button>
        </div>
      ) : (
        porAno.map(([ano, { principais, outras }]) => (
          <section key={ano} className="ano" aria-labelledby={`ano-${ano}`}>
            <h2 id={`ano-${ano}`} className="ano-numero"><span className="ano-rotulo">Enem </span><span>{ano}</span></h2>
            <div className="ano-provas">
              {principais.length > 0 && (
                <div className="principais">
                  {principais.map((g) => <ExamCard key={g.chave} g={g} inicial={cadernoInicial(g, f)} salvas={salvas} aoSalvar={alternarFavorita} />)}
                </div>
              )}
              {outras.length > 0 && (() => {
                const abrir = principais.length === 0 || (f.modalidade != null && f.modalidade !== "regular") || f.busca.trim() !== "" || f.acessivel;
                const nomes = [...new Set(outras.map((g) => MODALIDADE_CURTA[g.modalidade]))];
                return (
                  <details className="outras" key={`${ano}-${abrir}`} open={abrir || undefined}>
                    <summary>
                      <span>{principais.length ? "Outras aplicações" : "Aplicações"} de {ano}</span>
                      <span className="outras-resumo">{nomes.join(" e ")} · {outras.length} {outras.length === 1 ? "prova" : "provas"}</span>
                    </summary>
                    <div className="outras-grade">
                      {outras.map((g) => <ExamCard key={g.chave} g={g} compacto inicial={cadernoInicial(g, f)} salvas={salvas} aoSalvar={alternarFavorita} />)}
                    </div>
                  </details>
                );
              })()}
            </div>
          </section>
        ))
      )}
      {visiveis > 0 && porEdicao.map((lista) => {
        const { vestibular, edicao } = lista[0];
        return (
          <section key={`${vestibular}-${edicao}`} className="ano ano-vestibular" aria-labelledby={`ed-${vestibular}-${edicao}`}>
            <h2 id={`ed-${vestibular}-${edicao}`} className="ano-numero"><span className="ano-rotulo">{VESTIBULAR_ROTULO[vestibular]} </span><span>{edicao}</span></h2>
            <div className="ano-provas">
              <div className="principais exames">
                {lista.map((e) => <ExameCard key={e.id} e={e} inicial={versaoInicial(e, f)} salvas={salvas} aoSalvar={alternarFavorita} />)}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
