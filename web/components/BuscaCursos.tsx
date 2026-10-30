"use client";
import { useMemo, useState } from "react";
import { nota } from "@/lib/formato";

type Item = { curso: string; slug: string; ofertas: number; ampla_min: number | null; ampla_max: number | null };
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca instantânea no índice de cursos (roda só no navegador, sem servidor). */
/** Na home, `aoEscolher` faz o resultado mostrar o curso no mapa em vez de abrir a página do curso. */
export function BuscaCursos({ cursos, atalhos, ano, aoEscolher }: { cursos: Item[]; atalhos: Item[]; ano: number; aoEscolher?: (c: Item) => void }) {
  const [q, setQ] = useState("");
  const achados = useMemo(() => {
    const t = sem(q.trim());
    if (t.length < 2) return [];
    const palavras = t.split(/\s+/);
    return cursos.filter((c) => palavras.every((p) => sem(c.curso).includes(p))).slice(0, 12);
  }, [q, cursos]);

  return (
    <>
      <label className="busca">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <input id="busca" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busque um curso, ex.: Medicina" aria-label="Buscar curso" autoComplete="off" />
      </label>
      {q.trim().length >= 2 ? (
        <div className="cartao lista" style={{ marginTop: 12 }}>
          {achados.length === 0 && <div className="vazio">Nenhum curso com “{q}”. Tente outra palavra.</div>}
          {achados.map((c) => <LinhaCurso key={c.slug} c={c} ano={ano} aoEscolher={aoEscolher && (() => { setQ(""); aoEscolher(c); })} />)}
        </div>
      ) : atalhos.length > 0 && (
        <div className="chips">
          {atalhos.map((c) => <a key={c.slug} className="chip" href={`/curso/${c.slug}/`}>{c.curso}</a>)}
        </div>
      )}
    </>
  );
}

export function LinhaCurso({ c, ano, aoEscolher }: { c: Item; ano: number; aoEscolher?: () => void }) {
  const dentro = (
    <>
      <div className="info">
        <div className="nome">{c.curso}</div>
        <div className="meta">{c.ofertas} {c.ofertas === 1 ? "opção" : "opções"} no Sisu {ano}{aoEscolher ? " · ver no mapa" : ""}</div>
      </div>
      <div className="valor">
        <strong>{nota(c.ampla_min)}</strong>
        <span className="miudo">menor corte, ampla</span>
      </div>
    </>
  );
  return aoEscolher
    ? <button className="linha" onClick={aoEscolher}>{dentro}</button>
    : <a className="linha" href={`/curso/${c.slug}/`}>{dentro}</a>;
}
