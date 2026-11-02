"use client";
// Índice de universidades (Figma 06a / W6a): busca, estado e tipo; mais opções no Sisu primeiro.
import { useMemo, useState } from "react";
import type { ResumoUni } from "@/lib/universidades";
import { nota as fmt } from "@/lib/formato";

const POR_PAGINA = 30;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const TIPOS: [string, string][] = [["", "Federais e estaduais"], ["Pública federal", "Só federais"], ["Pública estadual", "Só estaduais"], ["Pública municipal", "Só municipais"]];

export function ListaUniversidades({ unis, estados }: { unis: ResumoUni[]; estados: { uf: string; nome: string }[] }) {
  const [busca, setBusca] = useState("");
  const [uf, setUf] = useState("");
  const [tipo, setTipo] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);
  const porUf = useMemo(() => { const c: Record<string, number> = {}; for (const u of unis) for (const e of u.ufs) c[e] = (c[e] ?? 0) + 1; return c; }, [unis]);
  const vis = useMemo(() => {
    const q = norm(busca.trim());
    return unis
      .filter((u) => (!uf || u.ufs.includes(uf)) && (!tipo || u.tipo === tipo) && (!q || norm(u.sigla).includes(q) || norm(u.nome).includes(q)))
      .sort((a, b) => (uf ? (b.porUf[uf] ?? 0) - (a.porUf[uf] ?? 0) : b.ofertas - a.ofertas) || a.sigla.localeCompare(b.sigla, "pt-BR"));
  }, [unis, busca, uf, tipo]);
  const nomeUf = estados.find((e) => e.uf === uf)?.nome;
  const trocarUf = (v: string) => { setUf(v); setLimite(POR_PAGINA); };

  return (
    <div className="unis-grade">
      <div className="unis-principal">
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
        <section className="cartao lista unis-lista" aria-live="polite">
          <div className="cabeca"><h2>{nomeUf ?? "Todos os estados"}</h2><span className="miudo">{vis.length === 1 ? "1 instituição" : `${vis.length} instituições`} · mais opções no Sisu primeiro</span></div>
          {vis.length === 0 && <p className="unis-vazio">Nenhuma instituição com esses filtros.</p>}
          {vis.slice(0, limite).map((u) => (
            <a key={u.slug} className="unis-linha" href={`/universidades/${u.slug}/`}>
              <span className="info">
                <strong>{u.sigla}</strong>
                <span className="nome">{u.nome}</span>
                <span className="meta">{u.cidades === 1 ? "1 cidade" : `${u.cidades} cidades`} · {u.ofertas === 1 ? "1 opção" : `${u.ofertas} opções`}{u.min != null ? ` · corte de ${fmt(u.min)} a ${fmt(u.max)}` : ""}</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          ))}
          {vis.length > limite && <button className="ver-mais" onClick={() => setLimite((n) => n + 60)}>Ver mais {Math.min(60, vis.length - limite)} de {vis.length - limite}</button>}
        </section>
      </div>
      <aside className="cartao unis-estados so-desktop">
        <h2>Instituições por estado</h2>
        <p className="miudo">Uma instituição com campi em mais de um estado aparece em cada um deles.</p>
        <div className="unis-ufs">
          {estados.filter((e) => porUf[e.uf]).map((e) => (
            <button key={e.uf} className={e.uf === uf ? "ativo" : undefined} aria-pressed={e.uf === uf} title={e.nome} onClick={() => trocarUf(e.uf === uf ? "" : e.uf)}>
              <strong>{e.uf}</strong><span>{porUf[e.uf]}</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
