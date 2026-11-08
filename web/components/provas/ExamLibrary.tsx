"use client";
// Biblioteca de provas: busca, filtros combináveis, grupos por edição e aplicação, salvos e estados vazios.
// O HTML estático já traz todos os cadernos (bom para busca no Google); os filtros só escondem no navegador.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Filtros, Modalidade, Prova } from "@/lib/provas-tipos";
import { FILTROS_VAZIOS, filtrar, filtrosDaUrl, filtrosParaUrl, tituloProva } from "@/lib/provas-tipos";
import { alternarFavorita, lerFavoritas } from "@/lib/leitor/preferencias";
import { registrar, registrarUmaVez } from "@/lib/analytics";
import { ExamCard } from "./ExamCard";
import { ExamFilters } from "./ExamFilters";

const ORDEM_MOD: Modalidade[] = ["regular", "digital", "belem", "reaplicacao"];
const ORDEM_COR = ["azul", "amarelo", "branco", "rosa", "verde", "cinza", "laranja", "roxo"];

const assinarFav = (cb: () => void) => { window.addEventListener("ondepasso:favoritas", cb); window.addEventListener("storage", cb); return () => { window.removeEventListener("ondepasso:favoritas", cb); window.removeEventListener("storage", cb); }; };
let favCache = ""; let favLista: string[] = [];
const lerFavSnapshot = () => { const l = lerFavoritas(); const k = l.join(","); if (k !== favCache) { favCache = k; favLista = l; } return favLista; };
const SEM: string[] = [];

export function ExamLibrary({ provas }: { provas: Prova[] }) {
  const [f, setF] = useState<Filtros>(FILTROS_VAZIOS);
  const [pronto, setPronto] = useState(false);
  const favoritas = useSyncExternalStore(assinarFav, lerFavSnapshot, () => SEM);
  const buscaRegistrada = useRef(false);

  useEffect(() => {
    setF(filtrosDaUrl(new URLSearchParams(location.search)));
    setPronto(true);
    registrarUmaVez("biblioteca", "enem_biblioteca_visualizada", {});
  }, []);

  // A URL acompanha os filtros (compartilhável), sem criar uma entrada no histórico a cada clique.
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

  const lista = useMemo(() => filtrar(provas, f), [provas, f]);
  const ativos = [f.ano, f.dia, f.area, f.cor, f.modalidade].filter((x) => x != null).length + (f.acessivel ? 1 : 0) + (f.busca.trim() ? 1 : 0);

  // Opções dos filtros mostram quantos sobram se forem escolhidas (a cor some quando não existe naquele recorte).
  const opcoes = useMemo(() => {
    const anos = [...new Set(provas.map((p) => p.ano))].sort((a, b) => b - a);
    const base = filtrar(provas, { ...f, cor: null });
    const cores = ORDEM_COR.filter((c) => provas.some((p) => p.cor === c)).map((c) => {
      const p0 = provas.find((p) => p.cor === c)!;
      return { id: c, rotulo: p0.corRotulo, hex: p0.corHex, n: base.filter((p) => p.cor === c).length };
    });
    const baseM = filtrar(provas, { ...f, modalidade: null });
    const modalidades = ORDEM_MOD.filter((m) => provas.some((p) => p.modalidade === m)).map((m) => ({ id: m, n: baseM.filter((p) => p.modalidade === m).length }));
    return { anos, cores, modalidades };
  }, [provas, f]);

  const grupos = useMemo(() => {
    const g = new Map<string, { ano: number; mod: Modalidade; rotulo: string; provas: Prova[] }>();
    for (const p of lista) {
      const k = `${p.ano}|${p.modalidade}`;
      if (!g.has(k)) g.set(k, { ano: p.ano, mod: p.modalidade, rotulo: p.modalidadeRotulo, provas: [] });
      g.get(k)!.provas.push(p);
    }
    return [...g.values()];
  }, [lista]);

  const salvas = provas.filter((p) => favoritas.includes(p.id));
  let i = 0;

  return (
    <div className="biblioteca" data-pronto={pronto ? "1" : undefined}>
      <ExamFilters f={f} opcoes={opcoes} mudar={mudar} limpar={limpar} ativos={ativos} />

      {salvas.length > 0 && (
        <section className="provas-salvas" aria-labelledby="t-salvas">
          <h2 id="t-salvas">Salvas para estudar</h2>
          <ul>
            {salvas.map((p) => (
              <li key={p.id}>
                <a href={`/provas/${p.id}/`}><span className="bolinha" style={{ background: p.corHex }} aria-hidden="true" />{tituloProva(p)}</a>
                <button type="button" className="botao-icone" aria-label={`Remover ${tituloProva(p)} dos salvos`} onClick={() => alternarFavorita(p.id)}>×</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="biblioteca-contagem" role="status" aria-live="polite">
        {lista.length === provas.length ? `${provas.length} cadernos oficiais` : `${lista.length} de ${provas.length} cadernos`}
      </p>

      {lista.length === 0 ? (
        <div className="biblioteca-vazia">
          <svg width="40" height="40" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M11 5.5C9.17 4.12 6.42 3.67 2.75 3.67v13.75c3.67 0 6.42.46 8.25 1.83 1.83-1.37 4.58-1.83 8.25-1.83V3.67c-3.67 0-6.42.45-8.25 1.83Z" /><path d="M11 5.5v13.75" /></svg>
          <p><strong>Nenhum caderno com essa combinação.</strong></p>
          <p className="miudo">Nem toda cor existe em todo dia e aplicação (o 2º dia não tem caderno branco, por exemplo).</p>
          <button type="button" className="botao botao-contorno" onClick={limpar}>Limpar filtros</button>
        </div>
      ) : (
        grupos.map((g) => (
          <section key={`${g.ano}-${g.mod}`} className="grupo-provas" aria-labelledby={`g-${g.ano}-${g.mod}`}>
            <header className="grupo-provas-cabeca">
              <h2 id={`g-${g.ano}-${g.mod}`}><span className="grupo-ano">Enem {g.ano}</span> <span className="grupo-mod">{g.rotulo}</span></h2>
              <span className="miudo">{g.provas.length} {g.provas.length === 1 ? "caderno" : "cadernos"}</span>
            </header>
            <div className="grade-provas">
              {g.provas.map((p) => <ExamCard key={p.id} p={p} indice={i++} favorita={favoritas.includes(p.id)} aoFavoritar={alternarFavorita} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
