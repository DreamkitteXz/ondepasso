"use client";
import { useMemo, useState } from "react";
import { nota } from "@/lib/formato";

export type LinhaOferta = { rota: string; ies: string; campus: string; municipio: string; uf: string; turno: string; grau: string; corte: number | null; delta: number | null; bonus: boolean };

/** Lista de universidades de um curso, com filtro por UF e ordenação (no navegador). */
export function ListaOfertas({ itens, cursoSlug, ano }: { itens: LinhaOferta[]; cursoSlug: string; ano: number }) {
  const ufs = useMemo(() => [...new Set(itens.map((i) => i.uf))].sort(), [itens]);
  const [uf, setUf] = useState("");
  const [ordem, setOrdem] = useState<"menor" | "maior">("menor");
  const vis = useMemo(() => {
    const f = itens.filter((i) => !uf || i.uf === uf);
    return f.sort((a, b) => {
      if (a.corte == null) return 1; if (b.corte == null) return -1;
      return ordem === "menor" ? a.corte - b.corte : b.corte - a.corte;
    });
  }, [itens, uf, ordem]);
  return (
    <>
      <div className="filtros">
        <select value={uf} onChange={(e) => setUf(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos os estados</option>
          {ufs.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as "menor" | "maior")} aria-label="Ordenar">
          <option value="menor">Corte mais baixo primeiro</option>
          <option value="maior">Corte mais alto primeiro</option>
        </select>
        <span className="miudo">{vis.length} {vis.length === 1 ? "opção" : "opções"}</span>
      </div>
      <div className="cartao lista">
        <div className="cabeca"><span className="miudo">Universidade · cidade</span><span className="miudo">Corte {ano}, ampla</span></div>
        {vis.map((i) => (
          <a key={i.rota} className="linha" href={`/curso/${cursoSlug}/${i.rota}/`}>
            <div className="info">
              <div className="nome">{i.ies} · {i.municipio}/{i.uf}</div>
              <div className="meta">{i.turno} · {i.grau}{i.bonus ? " · bônus regional" : ""}</div>
            </div>
            <div className="valor">
              <strong>{nota(i.corte)}</strong>
              {i.delta != null && i.delta !== 0
                ? <span className={`miudo ${i.delta > 0 ? "sobe" : "desce"}`}>{i.delta > 0 ? "▲" : "▼"} {nota(Math.abs(i.delta))}</span>
                : <span className="miudo">{i.corte == null ? "sem corte" : "estável"}</span>}
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
