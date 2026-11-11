"use client";
// Índice de universidades: mapa do Brasil como filtro (mais verde = mais instituições), busca, tipo
// e um cartão por instituição com a faixa dos cortes. Mais opções no Sisu primeiro.
import { useMemo, useState } from "react";
import type { ResumoUni } from "@/lib/universidades";

const POR_PAGINA = 30;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const TIPOS: [string, string][] = [["", "Federais e estaduais"], ["Pública federal", "Só federais"], ["Pública estadual", "Só estaduais"], ["Pública municipal", "Só municipais"]];
const TIPO_CURTO: Record<string, string> = { "Pública federal": "Federal", "Pública estadual": "Estadual", "Pública municipal": "Municipal" };
type GeoUnis = { w: number; h: number; ufs: { uf: string; nome: string; d: string }[] };

export function ListaUniversidades({ unis, estados, geo }: { unis: ResumoUni[]; estados: { uf: string; nome: string }[]; geo: GeoUnis }) {
  const [busca, setBusca] = useState("");
  const [uf, setUf] = useState("");
  const [tipo, setTipo] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);
  const [sobre, setSobre] = useState<string | null>(null);
  const porUf = useMemo(() => { const c: Record<string, number> = {}; for (const u of unis) for (const e of u.ufs) c[e] = (c[e] ?? 0) + 1; return c; }, [unis]);
  const maxUf = useMemo(() => Math.max(1, ...Object.values(porUf)), [porUf]);
  // Escala comum da faixa de cortes: todos os cartões usam o mesmo trilho, para dar para comparar de relance.
  const escala = useMemo(() => {
    const mins = unis.map((u) => u.min).filter((v): v is number => v != null); const maxs = unis.map((u) => u.max).filter((v): v is number => v != null);
    return mins.length ? [Math.floor(Math.min(...mins) / 50) * 50, Math.ceil(Math.max(...maxs) / 50) * 50] as const : null;
  }, [unis]);
  const vis = useMemo(() => {
    const q = norm(busca.trim());
    return unis
      .filter((u) => (!uf || u.ufs.includes(uf)) && (!tipo || u.tipo === tipo) && (!q || norm(u.sigla).includes(q) || norm(u.nome).includes(q)))
      .sort((a, b) => (uf ? (b.porUf[uf] ?? 0) - (a.porUf[uf] ?? 0) : b.ofertas - a.ofertas) || a.sigla.localeCompare(b.sigla, "pt-BR"));
  }, [unis, busca, uf, tipo]);
  const nomeUf = estados.find((e) => e.uf === uf)?.nome;
  const trocarUf = (v: string) => { setUf(v); setLimite(POR_PAGINA); };
  const foco = sobre ?? (uf || null);
  const nomeFoco = foco ? estados.find((e) => e.uf === foco)?.nome : null;
  const nFoco = foco ? porUf[foco] ?? 0 : unis.length;

  return (
    <div className="unis2">
      <aside className="unis2-lado so-desktop">
        <section className="cartao um-cartao" aria-label="Filtrar por estado">
          <div className="um-topo">
            <div>
              <p className="rotulo">Filtrar por estado</p>
              <h2>{nomeFoco ?? "Brasil"}</h2>
            </div>
            <p className="um-n"><strong>{nFoco}</strong><span>{nFoco === 1 ? "instituição" : "instituições"}</span></p>
          </div>
          {/* O mapa é um atalho visual; os botões abaixo fazem o mesmo pelo teclado e por leitor de tela. */}
          <svg className="um-mapa" viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true" onMouseLeave={() => setSobre(null)}>
            {geo.ufs.map((g) => {
              const n = porUf[g.uf] ?? 0;
              return <path key={g.uf} d={g.d} className={`uf-c${g.uf === uf ? " ativo" : ""}${uf && g.uf !== uf ? " fora" : ""}${n ? "" : " vazio"}`} style={{ ["--q" as string]: (n / maxUf).toFixed(3) }}
                onMouseEnter={() => setSobre(n ? g.uf : null)} onClick={() => n && trocarUf(g.uf === uf ? "" : g.uf)} />;
            })}
          </svg>
          <div className="um-legenda" aria-hidden="true"><span>menos</span><i /><span>mais instituições</span></div>
          <div className="unis-ufs">
            {estados.filter((e) => porUf[e.uf]).map((e) => (
              <button key={e.uf} className={e.uf === uf ? "ativo" : undefined} aria-pressed={e.uf === uf} title={e.nome} onClick={() => trocarUf(e.uf === uf ? "" : e.uf)} onFocus={() => setSobre(e.uf)} onBlur={() => setSobre(null)}>
                <strong>{e.uf}</strong><span>{porUf[e.uf]}</span>
              </button>
            ))}
          </div>
          <p className="miudo">Uma instituição com campi em mais de um estado aparece em cada um deles.</p>
        </section>
      </aside>
      <div className="unis2-principal">
        <div className="unis-controles">
          <label className="busca unis-busca">
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M10.08 17.42a7.33 7.33 0 1 0 0-14.67 7.33 7.33 0 0 0 0 14.67Z" /><path d="m19.25 19.25-3.94-3.94" /></svg>
            <input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setLimite(POR_PAGINA); }} placeholder="Busque uma universidade, ex.: UFMG" aria-label="Buscar universidade" />
          </label>
          <div className="unis-filtros">
            <label className={`chip chip-select${uf ? " ativo" : ""}`}>{nomeUf ?? "Todos os estados"}
              <select value={uf} onChange={(e) => trocarUf(e.target.value)} aria-label="Estado">
                <option value="">Todos os estados</option>
                {estados.filter((e) => porUf[e.uf]).map((e) => <option key={e.uf} value={e.uf}>{e.nome}</option>)}
              </select>
            </label>
            <label className={`chip chip-select${tipo ? " ativo" : ""}`}>{TIPOS.find((t) => t[0] === tipo)![1]}
              <select value={tipo} onChange={(e) => { setTipo(e.target.value); setLimite(POR_PAGINA); }} aria-label="Tipo de instituição">
                {TIPOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="unis2-cabeca" aria-live="polite">
          <h2>{nomeUf ?? "Todos os estados"}</h2>
          <span className="miudo">{vis.length === 1 ? "1 instituição" : `${vis.length} instituições`} · com mais cursos primeiro</span>
        </div>
        {vis.length === 0 && <p className="unis-vazio">Nenhuma instituição encontrada. Tente pela sigla, como UFMG.</p>}
        <div className="unis-cartoes">
          {vis.slice(0, limite).map((u) => {
            const a = escala && u.min != null ? ((u.min - escala[0]) / (escala[1] - escala[0])) * 100 : 0;
            const b = escala && u.max != null ? ((u.max - escala[0]) / (escala[1] - escala[0])) * 100 : 0;
            return (
              <a key={u.slug} className="uni-c" href={`/universidades/${u.slug}/`}>
                <span className="uc2-topo">
                  <span className="uc2-tipo">{TIPO_CURTO[u.tipo] ?? u.tipo}</span>
                  <span className="uc2-ufs">{u.ufs.length > 3 ? `${u.ufs.length} estados` : u.ufs.join(" · ")}</span>
                </span>
                <strong className="uc2-sigla">{u.sigla}</strong>
                <span className="uc2-nome">{u.nome}</span>
                <span className="uc2-fatos">
                  <span><b>{u.ofertas}</b> {u.ofertas === 1 ? "opção" : "opções"}</span>
                  <span><b>{u.cidades}</b> {u.cidades === 1 ? "cidade" : "cidades"}</span>
                </span>
                {u.min != null && u.max != null
                  ? <span className="uc2-faixa">
                      <span className="uc2-trilho" aria-hidden="true" style={{ ["--a" as string]: `${a.toFixed(1)}%`, ["--b" as string]: `${Math.max(b, a + 1.5).toFixed(1)}%` }} />
                      <span className="uc2-nums"><b>{Math.floor(u.min)}</b><em>cortes da ampla</em><b>{Math.ceil(u.max)}</b></span>
                    </span>
                  : <span className="uc2-faixa uc2-sem">Sem corte na ampla nesta edição</span>}
                <span className="uc2-seta" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10 10 4M5 4h5v5" /></svg></span>
              </a>
            );
          })}
        </div>
        {vis.length > limite && <button className="botao botao-contorno unis-mais" onClick={() => setLimite((n) => n + 60)}>Ver mais {Math.min(60, vis.length - limite)} de {vis.length - limite}</button>}
      </div>
    </div>
  );
}
