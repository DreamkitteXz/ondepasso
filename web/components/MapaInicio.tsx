"use client";
// Home com mapa (Figma W1a–W1c / mobile 01a–01c): chips escolhem o curso, a nota colore os pontos,
// clicar num estado aproxima e clicar num ponto abre o cartão do campus.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DadosMapa, Geo, Ponto } from "@/lib/mapa";
import { lerNota, nota as fmt, ROTULO, statusNota, type Status } from "@/lib/formato";
import { salvarNota, useNota } from "@/lib/nota";

type Atalho = { curso: string; slug: string };
type Caixa = [number, number, number, number];

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function MapaInicio({ geo, inicial, atalhos, topo, lista }: {
  geo: Geo; inicial: DadosMapa; atalhos: Atalho[]; topo: ReactNode; lista: ReactNode;
}) {
  const [dados, setDados] = useState(inicial);
  const [carregando, setCarregando] = useState<string | null>(null);
  const cache = useRef(new Map([[inicial.slug, inicial]]));
  const minha = useNota();
  const [uf, setUf] = useState<string | null>(null);
  const [sel, setSel] = useState<Ponto | null>(null);

  async function escolher(slug: string) {
    if (slug === dados.slug) return;
    setSel(null);
    const pronto = cache.current.get(slug);
    if (pronto) return setDados(pronto);
    setCarregando(slug);
    try {
      const d: DadosMapa = await (await fetch(`/mapa/${slug}.json`)).json();
      cache.current.set(slug, d);
      setDados(d);
    } finally {
      setCarregando(null);
    }
  }

  return (
    <div className="inicio">
      <div className="inicio-topo">{topo}</div>
      <div className="inicio-controles">
        <div className="chips" role="group" aria-label="Curso mostrado no mapa">
          {atalhos.map((a) => (
            <button key={a.slug} className={`chip${a.slug === dados.slug ? " ativo" : ""}`} aria-pressed={a.slug === dados.slug} onClick={() => escolher(a.slug)}>
              {carregando === a.slug ? "…" : a.curso}
            </button>
          ))}
          <a className="chip" href="#busca" onClick={() => setTimeout(() => document.getElementById("busca")?.focus(), 0)}>Mais cursos</a>
        </div>
        <EntradaNota minha={minha} ano={dados.ano} />
      </div>
      <div className="inicio-mapa">
        <CartaoMapa geo={geo} dados={dados} minha={minha} uf={uf} setUf={(u) => { setUf(u); setSel(null); }} sel={sel} setSel={setSel} />
      </div>
      <div className="inicio-lista">{lista}</div>
    </div>
  );
}

function EntradaNota({ minha, ano }: { minha: number | null; ano: number }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editando) ref.current?.focus(); }, [editando]);

  if (minha != null && !editando) {
    return (
      <div className="nota-salva">
        <span className="miudo">Sua média</span>
        <strong>{fmt(minha)}</strong>
        <button className="link" onClick={() => { setTexto(fmt(minha)); setEditando(true); }}>editar</button>
        <button className="link" onClick={() => salvarNota(null)}>limpar</button>
      </div>
    );
  }
  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const v = lerNota(texto);
    setErro(v == null);
    if (v != null) { salvarNota(v); setEditando(false); }
  }
  return (
    <form className="cartao entrada-nota" onSubmit={enviar}>
      <label htmlFor="nota" className="entrada-titulo">Digite sua nota e compare com os cortes de {ano}</label>
      <div className="entrada-linha">
        <input id="nota" ref={ref} inputMode="decimal" placeholder="Sua média do Enem, ex.: 712,40" value={texto}
          onChange={(e) => { setTexto(e.target.value); setErro(false); }} aria-invalid={erro} aria-describedby="nota-ajuda" />
        <button className="botao" type="submit">Comparar nota</button>
      </div>
      <p id="nota-ajuda" className={erro ? "erro" : "miudo"}>
        {erro ? "Digite uma média entre 0 e 1000, como 712,40." : "Sua nota não sai do seu navegador."}
      </p>
    </form>
  );
}

function CartaoMapa({ geo, dados, minha, uf, setUf, sel, setSel }: {
  geo: Geo; dados: DadosMapa; minha: number | null; uf: string | null; setUf: (u: string | null) => void;
  sel: Ponto | null; setSel: (p: Ponto | null) => void;
}) {
  const est = uf ? geo.ufs.find((u) => u.uf === uf)! : null;
  const visiveis = uf ? dados.pontos.filter((p) => p.u === uf) : dados.pontos;
  const st = (p: Ponto): Status | null => (minha == null ? null : statusNota(p.k, minha));
  const conta = { supera: 0, pouco: 0, abaixo: 0 };
  if (minha != null) for (const p of visiveis) conta[statusNota(p.k, minha)]++;
  const nUfs = new Set(dados.pontos.map((p) => p.u)).size;

  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") { if (sel) setSel(null); else setUf(null); } };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [sel, setSel, setUf]);

  return (
    <section className="cartao mapa-cartao" aria-label={`Mapa de ${dados.curso}`}>
      {uf && <button className="voltar link" onClick={() => setUf(null)}>‹ Brasil</button>}
      <div className="mapa-cabeca">
        {minha == null ? (
          <>
            <h2 className="mapa-titulo">{uf ? est!.nome : `${dados.curso} no Sisu`}</h2>
            <p className="miudo">
              {plural(visiveis.length, "opção", "opções")}{!uf && ` em ${plural(nUfs, "estado", "estados")}`} · Sisu {dados.ano}, ampla concorrência
            </p>
          </>
        ) : (
          <>
            <h2 className="mapa-titulo">
              {uf ? `${dados.curso} em ${est!.nome}` : `Sua nota supera o corte de ${dados.ano} em ${conta.supera} de ${plural(visiveis.length, "opção", "opções")}`}
            </h2>
            <p className="contagem">
              <span className="t-supera">{plural(conta.supera, "supera", "superam")} o corte</span> ·{" "}
              <span className="t-pouco">{conta.pouco} por pouco</span> ·{" "}
              <span className="t-abaixo">{conta.abaixo} abaixo do corte</span>
              <span className="miudo"> · {dados.curso}, ampla concorrência</span>
            </p>
          </>
        )}
      </div>

      <Mapa geo={geo} pontos={dados.pontos} uf={uf} caixa={est ? (est.box as Caixa) : null} st={st} sel={sel}
        aoEstado={(u) => setUf(u)} aoPonto={(p) => { setSel(p); if (!uf) setUf(p.u); }} />

      <Legenda comNota={minha != null} />
      <p className="miudo dica">
        {uf ? "Clique num ponto para ver o campus. Esc ou “Brasil” volta ao mapa inteiro." : "Passe o mouse num ponto para ver o campus; clique num estado para aproximar."}
      </p>

      {sel && <CartaoCampus p={sel} curso={dados} minha={minha} fechar={() => setSel(null)} />}
      {uf && <ListaEstado pontos={visiveis} curso={dados} minha={minha} aoEscolher={setSel} sel={sel} />}
    </section>
  );
}

function Mapa({ geo, pontos, uf, caixa, st, sel, aoEstado, aoPonto }: {
  geo: Geo; pontos: Ponto[]; uf: string | null; caixa: Caixa | null; st: (p: Ponto) => Status | null; sel: Ponto | null;
  aoEstado: (u: string) => void; aoPonto: (p: Ponto) => void;
}) {
  const alvo = useMemo<Caixa>(() => {
    if (!caixa) return [0, 0, geo.w, geo.h];
    // Margem e proporção do mapa inteiro, para o estado não ficar espremido.
    const [x, y, w, h] = caixa; const m = Math.max(w, h) * 0.08;
    let W = w + 2 * m, H = h + 2 * m; const r = geo.w / geo.h;
    if (W / H < r) W = H * r; else H = W / r;
    return [x + w / 2 - W / 2, y + h / 2 - H / 2, W, H];
  }, [caixa, geo]);
  const [vb, setVb] = useState<Caixa>(alvo);
  const vbRef = useRef(vb); vbRef.current = vb;
  useEffect(() => {
    const de = vbRef.current; const t0 = performance.now(); const dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 380;
    let id = 0;
    const passo = (t: number) => {
      const a = dur ? Math.min(1, (t - t0) / dur) : 1; const e = 1 - Math.pow(1 - a, 3);
      setVb(de.map((v, i) => v + (alvo[i] - v) * e) as Caixa);
      if (a < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [alvo]);

  const [foco, setFoco] = useState<Ponto | null>(null);
  const esc = vb[2] / geo.w; // unidades do SVG por "pixel" do mapa inteiro
  const r = (uf ? 5.5 : 4.2) * esc;
  const pos = (p: Ponto) => ({ left: `${((p.x - vb[0]) / vb[2]) * 100}%`, top: `${((p.y - vb[1]) / vb[3]) * 100}%` });

  return (
    <div className="mapa" onMouseLeave={() => setFoco(null)}>
      <svg viewBox={vb.join(" ")} role="img" aria-label={uf ? `Mapa do estado ${uf}` : "Mapa do Brasil"}>
        <g className="ufs">
          {geo.ufs.map((u) => (
            <path key={u.uf} d={u.d} className={u.uf === uf ? "uf atual" : uf ? "uf fora" : "uf"} onClick={() => aoEstado(u.uf)}>
              <title>{u.nome}</title>
            </path>
          ))}
        </g>
        <g>
          {pontos.map((p) => {
            const s = st(p);
            const dim = uf && p.u !== uf;
            const cls = `pt ${s ?? "neutro"}${dim ? " fora" : ""}${sel?.r === p.r ? " sel" : ""}`;
            return (
              <g key={p.r} className={cls} transform={`translate(${p.x} ${p.y})`} onMouseEnter={() => setFoco(p)} onClick={(e) => { e.stopPropagation(); aoPonto(p); }}>
                <circle r={r * 2.4} className="alvo" />
                {s === "abaixo" ? (
                  <path d={`M${-r * 0.8} ${-r * 0.8}L${r * 0.8} ${r * 0.8}M${r * 0.8} ${-r * 0.8}L${-r * 0.8} ${r * 0.8}`} />
                ) : (
                  <circle r={s === "pouco" ? r * 0.85 : r} />
                )}
                {sel?.r === p.r && <circle r={r * 2} className="anel" />}
              </g>
            );
          })}
        </g>
      </svg>
      {foco && (
        <div className="dica-ponto" style={pos(foco)} role="tooltip">
          <strong>{foco.i}</strong> · {foco.c}/{foco.u}
          <span>corte {fmt(foco.k)}</span>
        </div>
      )}
    </div>
  );
}

function Legenda({ comNota }: { comNota: boolean }) {
  if (!comNota) return <div className="legenda"><span><i className="lg neutro" />Campus com o curso</span></div>;
  return (
    <div className="legenda">
      <span><i className="lg supera" />Supera o corte</span>
      <span><i className="lg pouco" />Por pouco (até 10 pts)</span>
      <span><i className="lg abaixo" />Abaixo do corte</span>
    </div>
  );
}

function CartaoCampus({ p, curso, minha, fechar }: { p: Ponto; curso: DadosMapa; minha: number | null; fechar: () => void }) {
  const s = minha == null ? null : statusNota(p.k, minha);
  const dif = minha == null ? null : minha - p.k;
  return (
    <div className="campus" role="dialog" aria-label={`${curso.curso} · ${p.i}`}>
      <button className="fechar link" onClick={fechar} aria-label="Fechar">×</button>
      <div className="campus-nome">{curso.curso} · {p.i}</div>
      <div className="miudo">{p.c}/{p.u}</div>
      {s && <span className={`selo-status ${s}`}>{ROTULO[s]}</span>}
      <div className="campus-numeros">
        <div><span>Corte {curso.ano}</span><strong>{fmt(p.k)}</strong></div>
        {minha != null && <div><span>Você</span><strong>{fmt(minha)}</strong></div>}
        {dif != null && <div><span>Diferença</span><strong className={`t-${s}`}>{dif >= 0 ? "+" : "−"}{fmt(Math.abs(dif))}</strong></div>}
      </div>
      {s === "pouco" && <p className="miudo">Até 10 pontos abaixo do corte de {curso.ano}. O corte muda de um ano para o outro.</p>}
      {p.b && <p className="miudo">Este curso dá bônus regional: confira no edital se você tem direito antes de comparar.</p>}
      <a className="botao" href={`/curso/${curso.slug}/${p.r}/`}>Ver curso</a>
    </div>
  );
}

function ListaEstado({ pontos, curso, minha, aoEscolher, sel }: {
  pontos: Ponto[]; curso: DadosMapa; minha: number | null; aoEscolher: (p: Ponto) => void; sel: Ponto | null;
}) {
  const [todos, setTodos] = useState(false);
  const ord = [...pontos].sort((a, b) => a.k - b.k);
  const vis = todos ? ord : ord.slice(0, 6);
  return (
    <div className="lista-estado">
      <div className="cabeca"><h2 style={{ margin: 0 }}>Opções no estado</h2><span className="miudo">{curso.curso} · menor corte primeiro</span></div>
      {vis.map((p) => {
        const s = minha == null ? null : statusNota(p.k, minha);
        return (
          <button key={p.r} className={`linha${sel?.r === p.r ? " ativa" : ""}`} onClick={() => aoEscolher(p)}>
            <div className="info"><div className="nome">{p.i}</div><div className="meta">{p.c}/{p.u}</div></div>
            <div className="valor">
              <strong>{fmt(p.k)}</strong>
              {s ? <span className={`t-${s} miudo-status`}>{ROTULO[s]}</span> : <span className="miudo">corte</span>}
            </div>
          </button>
        );
      })}
      {ord.length > 6 && !todos && <button className="linha mais" onClick={() => setTodos(true)}>Ver as {ord.length} opções</button>}
    </div>
  );
}
