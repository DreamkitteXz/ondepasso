"use client";
// Página do curso com a nota do aluno — Figma 02 (mobile) e W2 (desktop).
// A média vem do mesmo localStorage da home; cada linha ganha o status e o topo resume "supera em X de N".
import { AvisoComparacao, CoberturaComparacao, ContagemComparacao } from "@/components/ResumoComparacao";
import { Apoio } from "@/components/Apoio";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Geo, Ponto } from "@/lib/mapa";
import { nota as fmt, ROTULO, nomeModalidade, contagemVazia, type Status } from "@/lib/formato";
import { statusPara, temPesos } from "@/lib/minhas";
import { salvarMod, useMinhas, useMod } from "@/lib/nota";
import { EntradaNota, Legenda, Mapa, PilulaNota } from "@/components/MapaInicio";
import { useRegistrarQuando } from "@/lib/analytics";

export type ItemCurso = Ponto & { campus: string; grau: string; delta: number | null; temMapa: boolean };
type Mod = { cod: string; nome: string };

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const POR_PAGINA = 20;

export function ListaCurso({ slug, curso, ano, itens, mods }: { slug: string; curso: string; ano: number; itens: ItemCurso[]; mods: Mod[] }) {
  const minha = useMinhas();
  const [editando, setEditando] = useState(false);
  const [revelacao, setRevelacao] = useState(0);
  const mod = useMod(); const setMod = salvarMod;
  const [uf, setUf] = useState("");
  const [turno, setTurno] = useState("");
  const [ordem, setOrdem] = useState<"menor" | "maior">("menor");
  const [limite, setLimite] = useState(POR_PAGINA);
  const modAtual = mods.find((m) => m.cod === mod) ?? { cod: mod, nome: nomeModalidade(mod) };
  const corte = (p: Ponto) => p.m[modAtual.cod] as number | undefined;
  // Resultados exibidos: o resumo "X de N opções acima do corte" com a lista colorida.
  useRegistrarQuando(minha != null && !editando, `resultados|${slug}|${revelacao}`, "en_resultados_visualizados",
    { curso: slug, pagina: "curso", tipo_nota: minha?.n ? "areas" : "media", origem_nota: revelacao ? "digitada" : "salva" });

  const ufs = useMemo(() => [...new Set(itens.map((i) => i.u))].sort(), [itens]);
  const turnos = useMemo(() => [...new Set(itens.map((i) => i.t))].sort(), [itens]);
  const vis = useMemo(() => {
    const f = itens.filter((i) => (!uf || i.u === uf) && (!turno || i.t === turno));
    return f.sort((a, b) => {
      const x = a.m[modAtual.cod], y = b.m[modAtual.cod];
      if (x == null) return 1; if (y == null) return -1;
      return ordem === "menor" ? x - y : y - x;
    });
  }, [itens, uf, turno, ordem, modAtual]);

  const comCorte = itens.filter((i) => corte(i) != null);
  const conta = contagemVazia();
  if (minha != null) for (const i of comCorte) conta[statusPara(minha, i, corte(i)!)]++;
  const comPesos = itens.filter((i) => temPesos(i)).length;
  const st = (p: Ponto): Status | null => { const c = corte(p); return minha == null || c == null ? null : statusPara(minha, p, c); };

  const comparando = (
    <p className="comparando">
      comparando com: <label className="trocar"><b>{modAtual.nome}</b> · <i>trocar</i>
        <select value={modAtual.cod} onChange={(e) => setMod(e.target.value)} aria-label="Modalidade para comparar">
          {!mods.some((m) => m.cod === mod) && <option value={mod}>{nomeModalidade(mod)} · sem corte</option>}
          {mods.map((m) => <option key={m.cod} value={m.cod}>{m.nome}</option>)}
        </select>
      </label>
    </p>
  );

  const cartaoNota = (
    <section className="cartao nota-curso" aria-label="Sua nota neste curso">
      {minha == null || editando ? (
        <EntradaNota ano={ano} minha={editando ? minha : null} compacta={false} curso={slug}
          pronto={(salvou) => { if (salvou) setRevelacao((n) => n + 1); setEditando(false); }} />
      ) : (
        <>
          <div className="mapa-linha"><PilulaNota minha={minha} editar={() => setEditando(true)} /></div>
          <div className={`resumo${revelacao ? " revela" : ""}`} key={`r${revelacao}`}>
            <h2 className="manchete-curso">{conta.supera} de {comCorte.length} opções acima do corte de {ano}</h2>
            {minha.n
              ? <p className="miudo">Com os pesos de cada opção{comPesos ? ` (${plural(comPesos, "usa", "usam")} pesos diferentes por área)` : ""}.</p>
              : comPesos > 0 && <p className="aviso-pesos">{plural(comPesos, "opção usa", "opções usam")} pesos diferentes por área: nelas a sua média pode ser outra. <a href="/calcular/">Digite por área</a></p>}
            <ContagemComparacao conta={conta} /><AvisoComparacao minha={minha} />
          </div>
        </>
      )}
      {comparando}
      <CoberturaComparacao total={itens.length} comparaveis={comCorte.length} />
      {comCorte.length === 0 && <p className="orientacao-comparacao">Sem corte para esta modalidade e edição. Um dado ausente não significa nota zero.</p>}
    </section>
  );

  return (
    // Um só cartão de nota (sem ids repetidos): o grid o põe acima da lista no celular e na lateral no desktop.
    <div className="curso-grade">
      <div className="curso-nota">{cartaoNota}</div>
      <div className="curso-principal">
        <div className="filtros">
          <select value={uf} onChange={(e) => { setUf(e.target.value); setLimite(POR_PAGINA); }} aria-label="Filtrar por estado">
            <option value="">Todos os estados</option>
            {ufs.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          {turnos.length > 1 && (
            <select className="so-desktop" value={turno} onChange={(e) => setTurno(e.target.value)} aria-label="Filtrar por turno">
              <option value="">Todos os turnos</option>
              {turnos.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as "menor" | "maior")} aria-label="Ordenar">
            <option value="menor">Corte mais baixo primeiro</option>
            <option value="maior">Corte mais alto primeiro</option>
          </select>
          <span className="miudo so-desktop">{plural(vis.length, "opção", "opções")}</span>
        </div>
        <p className="miudo lc-legenda so-mobile">▲ o corte subiu desde {ano - 1} · ▼ caiu</p>
        <div className="cartao lista tabela-curso">
          <div className="lc-cabeca">
            <span className="lc-uni">Universidade<span className="so-mobile"> · cidade</span></span>
            <span className="lc-cidade so-desktop">Cidade</span>
            <span className="lc-corte">Corte {ano}{modAtual.cod !== "AC" ? "*" : " (ampla)"}</span>
            <span className="lc-delta so-desktop">vs. {ano - 1}</span>
            <span className="lc-status so-desktop">Sua nota</span>
          </div>
          {vis.slice(0, limite).map((i) => {
            const c = corte(i); const s = st(i);
            return (
              <a key={i.r} className="lc-linha" href={`/curso/${slug}/${i.r}/`}>
                <span className="lc-uni">
                  <span className="nome">{i.i}<span className="so-mobile"> · {i.c}/{i.u}</span></span>
                  <span className="meta">{i.t} · {i.grau}{i.b ? " · bônus regional" : ""}</span>
                </span>
                <span className="lc-cidade so-desktop">{i.c}/{i.u}</span>
                <span className="lc-corte">
                  <strong>{c == null ? "sem corte" : fmt(c)}</strong>
                  <span className="so-mobile detalhe">{s ? <span className={`t-${s}`}>{ROTULO[s]}</span> : <Delta d={modAtual.cod === "AC" ? i.delta : null} sem={c == null} ano={ano} />}</span>
                </span>
                <span className="lc-delta so-desktop"><Delta d={modAtual.cod === "AC" ? i.delta : null} sem={c == null} /></span>
                <span className="lc-status so-desktop">{s ? <span className={`selo-status ${s}`}>{ROTULO[s]}</span> : <span className="miudo">{c == null ? "Sem dados para comparar" : "—"}</span>}</span>
              </a>
            );
          })}
          {vis.length > limite && <button className="ver-mais" onClick={() => setLimite((n) => n + 40)}>Ver mais {Math.min(40, vis.length - limite)} (faltam {vis.length - limite})</button>}
        </div>
        {modAtual.cod !== "AC" && <p className="miudo">* Corte da modalidade “{modAtual.nome}”. A variação contra {ano - 1} aparece só na ampla.</p>}
        <a className="botao botao-contorno so-mobile" href={`/?curso=${slug}`}><IconeMapa /> Ver no mapa</a>
        <Apoio />
      </div>
      <aside className="curso-lado so-desktop">
        <MiniMapa slug={slug} curso={curso} itens={itens.filter((i) => i.temMapa && corte(i) != null)} corte={(p) => corte(p)!} st={st} comNota={minha != null} />
      </aside>
    </div>
  );
}

function Delta({ d, sem, ano }: { d: number | null; sem: boolean; ano?: number }) {
  if (sem) return <span className="miudo">sem corte</span>;
  if (d == null) return <span className="miudo">—</span>;
  if (d === 0) return <span className="miudo">estável</span>;
  return <span className={d > 0 ? "sobe" : "desce"}>{d > 0 ? "▲" : "▼"} {fmt(Math.abs(d))}{ano ? ` vs. ${ano - 1}` : ""}</span>;
}

export function IconeMapa() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" />
    </svg>
  );
}

/** Minimapa da lateral (W2). Só existe no desktop, então os contornos são baixados só ali. */
function MiniMapa({ slug, curso, itens, corte, st, comNota }: {
  slug: string; curso: string; itens: Ponto[]; corte: (p: Ponto) => number; st: (p: Ponto) => Status | null; comNota: boolean;
}) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const pedido = useRef(false);
  useEffect(() => {
    const mq = matchMedia("(min-width: 1024px)");
    const carregar = () => {
      if (!mq.matches || pedido.current) return;
      pedido.current = true;
      fetch("/geo-br.json").then((r) => r.json()).then(setGeo).catch(() => { pedido.current = false; });
    };
    carregar();
    mq.addEventListener("change", carregar);
    return () => mq.removeEventListener("change", carregar);
  }, []);
  return (
    <section className="cartao mapa-cartao mini-mapa" aria-label={`Mapa das opções de ${curso}`}>
      <h2 className="titulo-mapa">Onde fica cada opção</h2>
      {geo ? (
        <Mapa geo={geo} pontos={itens} corte={corte} st={st} uf={null} caixa={null} sel={null}
          aoEstado={() => { location.href = `/?curso=${slug}`; }} aoPonto={(p) => { location.href = `/curso/${slug}/${p.r}/`; }} />
      ) : <div className="mini-mapa-vazio" />}
      <Legenda comNota={comNota} />
      <p className="miudo">Clique num ponto para abrir a opção · <a className="link-lista" href={`/?curso=${slug}`}>abrir no mapa grande ›</a></p>
    </section>
  );
}
