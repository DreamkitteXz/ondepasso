"use client";
// Página da universidade (Figma "UFMG · Universidade · Mobile" e W6b). Tudo vem do Sisu, menos fotos e site oficial.
import { useMemo, useState } from "react";
import type { CursoUni, Universidade } from "@/lib/universidades";
import { nota as fmt, ROTULO, type Status } from "@/lib/formato";
import { statusPara } from "@/lib/minhas";
import { salvarMod, useMinhas, useMod } from "@/lib/nota";
import { EntradaNota, Marca, PilulaNota } from "@/components/MapaInicio";
import { Compartilhar } from "@/components/Compartilhar";

const POR_PAGINA = 8;
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
type Ordem = "maior" | "menor" | "nome";

export function PaginaUniversidade({ u, ano, mods, contorno }: {
  u: Universidade; ano: number; mods: { cod: string; nome: string }[];
  contorno: { ufs: { uf: string; d: string }[]; box: [number, number, number, number] };
}) {
  const minha = useMinhas();
  const modSalva = useMod();
  const [editando, setEditando] = useState(false);
  const [revelacao, setRevelacao] = useState(0);
  const [campus, setCampus] = useState("");
  const [turno, setTurno] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("maior");
  const [limite, setLimite] = useState(POR_PAGINA);
  const mod = mods.find((m) => m.cod === modSalva) ?? mods[0];
  const corte = (c: CursoUni) => c.m[mod.cod] as number | undefined;
  const st = (c: CursoUni): Status | null => { const v = corte(c); return minha == null || v == null ? null : statusPara(minha, c, v); };

  const turnos = useMemo(() => [...new Set(u.cursos.map((c) => c.t))].sort(), [u]);
  const vis = useMemo(() => {
    const f = u.cursos.filter((c) => (!campus || `${c.campus}|${c.c}` === campus) && (!turno || c.t === turno));
    return f.sort((a, b) => {
      if (ordem === "nome") return a.curso.localeCompare(b.curso, "pt-BR");
      const x = a.m[mod.cod], y = b.m[mod.cod];
      if (x == null) return 1; if (y == null) return -1;
      return ordem === "maior" ? y - x : x - y;
    });
  }, [u, campus, turno, ordem, mod.cod]);

  const comCorte = u.cursos.filter((c) => corte(c) != null);
  const conta = { supera: 0, pouco: 0, abaixo: 0 };
  if (minha) for (const c of comCorte) conta[statusPara(minha, c, corte(c)!)]++;

  const descricao = [u.nome, u.tipo, campiTexto(u)].join(" · ");
  const abertura = (
    <section className="cartao uni-abertura" aria-label={u.sigla}>
      {u.fotos.length > 0 && <Carrossel u={u} />}
      <div className="uni-id">
        <h1>{u.sigla}</h1>
        <p className="sub">{descricao}</p>
        <div className="uni-acoes">
          {u.site && <a className="uni-site" href={u.site} target="_blank" rel="noopener noreferrer">Site oficial ↗</a>}
          <Compartilhar titulo={`Notas de corte da ${u.sigla} no Sisu ${ano}`} />
        </div>
        {u.fotos.length > 0 && <Creditos u={u} className="so-desktop" />}
      </div>
    </section>
  );

  const cartaoNota = (
    <section className="cartao uni-nota" aria-label="Sua nota nesta universidade">
      {minha == null || editando ? (
        <EntradaNota ano={ano} minha={editando ? minha : null} compacta={false}
          pronto={(salvou) => { if (salvou) setRevelacao((n) => n + 1); setEditando(false); }} />
      ) : (
        <>
          <div className="mapa-linha"><PilulaNota minha={minha} editar={() => setEditando(true)} /></div>
          <div className={`resumo${revelacao ? " revela" : ""}`} key={`r${revelacao}`}>
            <h2 className="manchete-curso">{minha.n ? "Suas notas superam" : "Sua nota supera"} o corte de {ano} em {conta.supera} de {comCorte.length} cursos</h2>
            <p className="contagem"><span className="t-pouco">{conta.pouco} por pouco</span><i>·</i><span className="t-abaixo">{conta.abaixo} abaixo do corte</span></p>
          </div>
        </>
      )}
      <div className="uni-mod">
        <span className="miudo">comparando com:</span>
        <label className="trocar"><b>{mod.nome}</b> <i>trocar</i>
          <select value={mod.cod} onChange={(e) => salvarMod(e.target.value)} aria-label="Modalidade para comparar">
            {mods.map((m) => <option key={m.cod} value={m.cod}>{m.nome}</option>)}
          </select>
        </label>
      </div>
    </section>
  );

  const numeros = (
    <section className="cartao uni-numeros" aria-label="Números da universidade">
      <div><strong>{u.comCorte}</strong><span>{u.comCorte === 1 ? "opção com corte" : "opções com corte"}</span></div>
      <div><strong>{u.cidades.length}</strong><span>{u.cidades.length === 1 ? "cidade" : "cidades"}</span></div>
      {u.min != null && <div><strong>{Math.floor(u.min)} a {Math.ceil(u.max!)}</strong><span>do menor ao maior corte (ampla, {ano})</span></div>}
    </section>
  );

  const campiOpcoes = u.campi.map((c) => ({ v: `${c.nome}|${c.cidade}`, t: u.campi.filter((x) => x.nome === c.nome).length > 1 ? `${c.nome} · ${c.cidade}` : c.nome }));
  const filtros = (
    <div className="uni-filtros">
      {u.campi.length > 1 && (
        <select value={campus} onChange={(e) => { setCampus(e.target.value); setLimite(POR_PAGINA); }} aria-label="Filtrar por campus">
          <option value="">Todos os campi</option>
          {campiOpcoes.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
        </select>
      )}
      {turnos.length > 1 && (
        <select value={turno} onChange={(e) => { setTurno(e.target.value); setLimite(POR_PAGINA); }} aria-label="Filtrar por turno">
          <option value="">Todos os turnos</option>
          {turnos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
      <select className="uni-ordem" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar">
        <option value="maior">Corte mais alto primeiro</option>
        <option value="menor">Corte mais baixo primeiro</option>
        <option value="nome">Nome do curso</option>
      </select>
      <span className="miudo">{plural(vis.length, "opção", "opções")}</span>
    </div>
  );

  const lista = (
    <div className="uni-cursos">
      <div className="uni-cabeca so-desktop">
        <span>Curso</span><span>Campus</span><span className="n">Corte {ano}{mod.cod !== "AC" ? "*" : ""}</span><span className="n">vs. {ano - 1}</span><span className="n">Sua nota</span>
      </div>
      {vis.slice(0, limite).map((c) => {
        const v = corte(c); const s = st(c); const d = mod.cod === "AC" ? c.delta : null;
        return (
          <a key={c.r + c.slug} className="uni-curso" href={`/curso/${c.slug}/${c.r}/`}>
            <span className="uc-nome"><strong>{c.curso}</strong><span className="meta">{grauCurto(c.grau)} · {c.t}{c.b ? " · bônus regional" : ""}</span></span>
            <span className="uc-corte"><strong>{v == null ? "sem corte" : fmt(v)}</strong><span className="meta so-mobile">Corte {ano}</span></span>
            <span className="uc-campus"><span className="so-mobile">Campus · </span>{c.campus}</span>
            <span className="uc-delta"><span className="meta so-mobile">vs. {ano - 1}</span><Delta d={d} sem={v == null} /></span>
            <span className="uc-status">
              {s && <span className="meta so-mobile">Sua nota</span>}
              {s ? <span className={`selo-tinta ${s}`}>{ROTULO[s]}</span> : <span className="miudo so-desktop">—</span>}
            </span>
          </a>
        );
      })}
      {vis.length > limite && <button className="uni-mais" onClick={() => setLimite((n) => n + 40)}>Ver mais {Math.min(40, vis.length - limite)} (faltam {vis.length - limite})</button>}
      {mod.cod !== "AC" && <p className="miudo">* Corte da modalidade “{mod.nome}”. A variação contra {ano - 1} aparece só na ampla.</p>}
    </div>
  );

  return (
    <div className="pagina-uni">
      <a className="voltar" href="/universidades/">‹ Universidades</a>
      {abertura}
      {u.fotos.length > 0 && <Creditos u={u} className="so-mobile" />}
      <div className="uni-grade">
        <div className="uni-principal">
          <div className="uni-topo">{cartaoNota}{numeros}</div>
          {filtros}
          {lista}
        </div>
        <aside className="uni-lado">
          <OndeFica u={u} contorno={contorno} />
          <p className="miudo">Toque num curso para abrir a opção. Dados de cursos e campi são do Sisu{u.fotos.length ? "; fotos externas, com créditos e licenças indicados acima" : ""}.</p>
        </aside>
      </div>
    </div>
  );
}

function campiTexto(u: Universidade) {
  const n = u.campi.length;
  const cid = u.cidades.map((c) => c.split("/")[0]);
  const onde = cid.length <= 2 ? `em ${cid.join(" e ")}` : `em ${cid.length} cidades`;
  return `${n} ${n === 1 ? "campus" : "campi"} ${onde}`;
}
const grauCurto = (g: string) => (/Área Básica/.test(g) ? "Área Básica de Ingresso" : g);

function Delta({ d, sem }: { d: number | null; sem: boolean }) {
  if (sem || d == null) return <span className="miudo">—</span>;
  if (d === 0) return <span className="miudo">estável</span>;
  return <span className={d > 0 ? "sobe" : "desce"}>{d > 0 ? "▲" : "▼"} {fmt(Math.abs(d))}</span>;
}

function Creditos({ u, className }: { u: Universidade; className: string }) {
  return (
    <p className={`uni-creditos ${className}`}>
      Fotos: {u.fotos.map((f, i) => (
        <span key={f.src}>{i > 0 ? (i === u.fotos.length - 1 ? " e " : ", ") : ""}<a href={f.pagina} target="_blank" rel="noopener noreferrer">{f.titulo}</a> ({f.autor} / {f.licencaUrl ? <a href={f.licencaUrl} target="_blank" rel="noopener noreferrer">{f.licenca}</a> : f.licenca})</span>
      ))}. Fotos do Wikimedia Commons, recortadas.
    </p>
  );
}

/** Carrossel por rolagem (scroll-snap): funciona com o dedo, o trackpad e o teclado; as bolinhas só indicam e pulam. */
function Carrossel({ u }: { u: Universidade }) {
  const [atual, setAtual] = useState(0);
  const varias = u.fotos.length > 1;
  return (
    <div className="carrossel">
      <div className="carrossel-trilho" tabIndex={varias ? 0 : -1} aria-label={`Fotos da ${u.sigla}`}
        onScroll={(e) => { const el = e.currentTarget; setAtual(Math.round(el.scrollLeft / el.clientWidth)); }}>
        {u.fotos.map((f, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={f.src} src={f.src} alt={`${f.titulo} (${u.sigla})`} loading={i === 0 ? "eager" : "lazy"} width={1200} height={800} />
        ))}
      </div>
      {varias && (
        <div className="carrossel-pontos" role="group" aria-label="Escolher foto">
          {u.fotos.map((f, i) => (
            <button key={f.src} aria-label={`Foto ${i + 1} de ${u.fotos.length}`} aria-current={i === atual || undefined}
              onClick={(e) => { const t = (e.currentTarget.parentElement!.previousElementSibling as HTMLElement); t.scrollTo({ left: i * t.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function OndeFica({ u, contorno }: { u: Universidade; contorno: { ufs: { uf: string; d: string }[]; box: [number, number, number, number] } }) {
  const [x, y, w, h] = contorno.box; const m = Math.max(w, h) * 0.06;
  const vb = [x - m, y - m, w + 2 * m, h + 2 * m];
  const unid = vb[2] / 318;
  const cidades = new Map<string, { x: number; y: number; nome: string }>();
  for (const c of u.campi) if (c.x != null && c.y != null && !cidades.has(c.cidade)) cidades.set(c.cidade, { x: c.x, y: c.y, nome: c.cidade });
  const pts = [...cidades.values()];
  return (
    <section className="cartao onde-fica uni-onde" aria-labelledby="t-onde">
      <h2 id="t-onde">Onde fica</h2>
      <div className="mapa">
        <svg viewBox={vb.join(" ")} role="img" aria-label={`Mapa com as cidades da ${u.sigla}`} style={{ aspectRatio: `${vb[2]} / ${vb[3]}` }}>
          {contorno.ufs.map((g) => <path key={g.uf} d={g.d} className={`uf${u.ufs.includes(g.uf) ? " atual" : ""}`} strokeWidth={(contorno.ufs.length > 1 ? 0.8 : 1.2) * unid} />)}
          {pts.map((p) => (
            <g key={p.nome}>
              <g className="pt neutro" transform={`translate(${p.x} ${p.y})`}><Marca s={null} tam={(pts.length > 6 ? 9 : 14) * unid} /></g>
              {pts.length <= 6 && <text className="rotulo-cidade" x={p.x + 12 * unid} y={p.y + 4 * unid} fontSize={12 * unid}>{p.nome}</text>}
            </g>
          ))}
        </svg>
      </div>
      <ul className="uni-campi">
        {u.campi.map((c) => (
          <li key={`${c.nome}|${c.cidade}`}><strong>{c.nome}</strong><span>{c.cidade}/{c.uf} · {plural(c.n, "opção", "opções")}</span></li>
        ))}
      </ul>
    </section>
  );
}
