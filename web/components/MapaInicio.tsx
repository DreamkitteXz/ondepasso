"use client";
// Home com mapa — segue o Figma: mobile 01a (sem nota), 01b (com nota), 01c (estado aproximado + cartão)
// e desktop W1a–W1c. Os chips escolhem o curso, a nota colore os pontos, "trocar" muda a modalidade,
// tocar num estado aproxima e tocar num ponto abre o cartão do campus.
import { Apoio } from "@/components/Apoio";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DadosMapa, Geo, Ponto } from "@/lib/mapa";
import { lerNota, nota as fmt, ROTULO, type Status } from "@/lib/formato";
import { apagarNotas, salvarMedia, salvarMod, salvarNotasAreas, useMinhas, useMod, type Areas } from "@/lib/nota";
import { AREAS, statusPara, suaMedia, temPesos, type Minhas, type Pesos } from "@/lib/minhas";
import { BuscaCursos } from "@/components/BuscaCursos";
import { Termo } from "@/components/Termo";

type Atalho = { curso: string; slug: string; soDesktop?: boolean };
type ItemBusca = { curso: string; slug: string; ofertas: number; ampla_min: number | null; ampla_max: number | null };
type Disputado = { curso: string; slug: string; r: string; i: string; c: string; m: Record<string, number> } & Pesos;
type Caixa = [number, number, number, number];

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const curtaMod = (cod: string, nome: string) => (cod === "AC" ? "ampla" : nome.replace(/^Escola pública/, "Esc. pública"));

export function MapaInicio({ geo, inicial, atalhos, topo, disputados, cursos, anoBusca }: {
  geo: Geo; inicial: DadosMapa; atalhos: Atalho[]; topo: ReactNode; disputados: Disputado[]; cursos: ItemBusca[]; anoBusca: number;
}) {
  // Curso escolhido pela busca que não está nos chips: ganha um chip próprio e vai para o mapa como os outros.
  const [extra, setExtra] = useState<Atalho | null>(null);
  const mapaRef = useRef<HTMLDivElement>(null);
  // "Ver no mapa" da página do curso chega como /?curso=<slug>.
  useEffect(() => {
    // Do detalhe de uma opção chega também &campus=<rota>: abre o estado com o cartão daquele campus.
    const q = new URLSearchParams(location.search);
    const slug = q.get("curso"), campus = q.get("campus");
    const c = slug && cursos.find((x) => x.slug === slug);
    if (!c) return;
    setExtra({ curso: c.curso, slug: c.slug });
    escolher(c.slug).then((d) => {
      const p = campus ? d?.pontos.find((x) => x.r === campus) : null;
      if (p) { setUfBruto(p.u); setSel(p); }
      requestAnimationFrame(() => (mapaRef.current ?? topoRef.current)?.scrollIntoView({ block: "start" }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [dados, setDados] = useState(inicial);
  const [carregando, setCarregando] = useState<string | null>(null);
  const cache = useRef(new Map([[inicial.slug, inicial]]));
  const minha = useMinhas();
  const [editando, setEditando] = useState(false);
  const [uf, setUfBruto] = useState<string | null>(null);
  const [sel, setSelBruto] = useState<Ponto | null>(null);
  // Ações de teclado respondem sem animação (abrir ou fechar o cartão).
  const viaTeclado = useRef(false);
  const setSel = (p: Ponto | null, teclado = false) => { viaTeclado.current = teclado; setSelBruto(p); };
  // Conta só confirmações de nota nova (não teclas, não a nota que já estava salva ao abrir a página).
  const [revelacao, setRevelacao] = useState(0);
  const mod = useMod(); const setMod = salvarMod;
  const topoRef = useRef<HTMLDivElement>(null);

  const modAtual = dados.mods.find((m) => m.cod === mod) ?? dados.mods[0];
  const pontos = useMemo(() => dados.pontos.filter((p) => p.m[modAtual.cod] != null), [dados, modAtual]);
  const corte = (p: Ponto) => p.m[modAtual.cod];

  function setUf(u: string | null) {
    setUfBruto(u);
    setSel(null);
    requestAnimationFrame(() => { const el = topoRef.current; if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" }); });
  }

  async function escolher(slug: string): Promise<DadosMapa | undefined> {
    if (slug === dados.slug) return dados;
    setSel(null);
    const pronto = cache.current.get(slug);
    if (pronto) { setDados(pronto); return pronto; }
    setCarregando(slug);
    try {
      const d: DadosMapa = await (await fetch(`/mapa/${slug}.json`)).json();
      cache.current.set(slug, d);
      setDados(d);
      return d;
    } finally {
      setCarregando(null);
    }
  }

  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape" && uf) { if (sel) setSel(null, true); else setUf(null); } };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  });

  const chips = (
    <div className="chips" role="group" aria-label="Curso mostrado no mapa">
      {[...atalhos, ...(extra && !atalhos.some((a) => a.slug === extra.slug) ? [extra] : [])].map((a) => (
        <button key={a.slug} className={`chip${a.slug === dados.slug ? " ativo" : ""}${a.soDesktop ? " so-desktop" : ""}`} aria-pressed={a.slug === dados.slug} onClick={() => escolher(a.slug)}>
          {carregando === a.slug ? "…" : a.curso}
        </button>
      ))}
      <a className="chip" href="#busca" onClick={() => { setUf(null); setTimeout(() => document.getElementById("busca")?.focus(), 50); }}>Mais cursos</a>
    </div>
  );
  const comparando = (
    <p className="comparando">
      comparando com: <label className="trocar"><b>{modAtual.nome}</b> · <i>trocar</i>
        <select value={modAtual.cod} onChange={(e) => { setMod(e.target.value); setSel(null); }} aria-label="Modalidade para comparar">
          {dados.mods.map((m) => <option key={m.cod} value={m.cod}>{m.nome}</option>)}
        </select>
      </label>
    </p>
  );
  const pilula = minha != null && !editando ? <PilulaNota minha={minha} editar={() => setEditando(true)} /> : null;
  const entrada = (compacta: boolean) => (minha == null || editando) && (
    <EntradaNota ano={dados.ano} minha={editando ? minha : null} compacta={compacta}
      pronto={(salvou) => { if (salvou) setRevelacao((n) => n + 1); setEditando(false); }} />
  );

  // ---------- 01c / W1c: estado aproximado ----------
  if (uf) {
    const est = geo.ufs.find((u) => u.uf === uf)!;
    const doEstado = pontos.filter((p) => p.u === uf);
    const st = (p: Ponto): Status | null => (minha == null ? null : statusPara(minha, p, corte(p)));
    const conta = contar(doEstado, minha, corte);
    const cartao = (ponto: Ponto) => <CartaoPonto p={ponto} curso={dados} corte={corte(ponto)} minha={minha} />;
    return (
      <div className="estado-vista" ref={topoRef}>
        <button className="voltar link" onClick={() => setUf(null)}>‹ Brasil</button>
        {chips}
        <div className="estado-grade">
          <section className="cartao mapa-cartao" aria-label={`${dados.curso} em ${est.nome}`}>
            <div className="mapa-linha">
              <h2 className="titulo-estado">{est.nome}</h2>
              {pilula}
            </div>
            {entrada(true)}
            {minha != null ? (
              <p className={`contagem${revelacao ? " revela" : ""}`} key={`r${revelacao}`}>
                <span className="t-supera">{plural(conta.supera, "supera", "superam")} o corte</span><i>·</i>
                <span className="t-pouco">{conta.pouco} por pouco</span><i>·</i>
                <span className="t-abaixo">{conta.abaixo} abaixo do corte</span>
              </p>
            ) : (
              <p className="miudo">{plural(doEstado.length, "opção", "opções")} de {dados.curso} · Sisu {dados.ano}</p>
            )}
            {comparando}
            <Mapa geo={geo} pontos={pontos} corte={corte} st={st} uf={uf} caixa={est.box as Caixa} sel={sel}
              aoEstado={(u) => u !== uf && setUf(u)} aoPonto={setSel} />
            <Presenca valor={sel} teclado={viaTeclado.current} className="so-mobile">{cartao}</Presenca>
            <Legenda comNota={minha != null} />
          </section>
          <aside className="estado-lado">
            <Presenca valor={sel} teclado={viaTeclado.current} className="so-desktop">{cartao}</Presenca>
            <ListaEstado uf={uf} pontos={doEstado} curso={dados} mod={modAtual} corte={corte} minha={minha} sel={sel} aoEscolher={(p, teclado) => setSel(p, teclado)} />
          </aside>
        </div>
      </div>
    );
  }

  // ---------- 01a/01b · W1a/W1b: Brasil ----------
  const st = (p: Ponto): Status | null => (minha == null ? null : statusPara(minha, p, corte(p)));
  const conta = contar(pontos, minha, corte);
  return (
    <div className="inicio" ref={topoRef}>
      <div className="inicio-topo">
        {topo}
        <BuscaCursos cursos={cursos} atalhos={[]} ano={anoBusca} aoEscolher={(c) => {
          setExtra({ curso: c.curso, slug: c.slug });
          escolher(c.slug);
          // Rola só depois que a lista de resultados some (senão o mapa "pula" para baixo da Topbar).
          requestAnimationFrame(() => requestAnimationFrame(() => {
            const el = mapaRef.current;
            if (el && el.getBoundingClientRect().top > window.innerHeight * 0.5)
              el.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          }));
        }} />
      </div>
      <div className="inicio-controles">
        {chips}
        {entrada(false)}
      </div>
      <div className="inicio-mapa" ref={mapaRef}>
        <section className="cartao mapa-cartao" aria-label={`Mapa de ${dados.curso}`}>
          {minha == null ? (
            <div className="mapa-linha">
              <h2 className="titulo-mapa">{dados.curso}: {plural(pontos.length, "opção", "opções")} no Brasil</h2>
              <span className="miudo">cortes do Sisu {dados.ano}</span>
            </div>
          ) : (
            <>
              {pilula && <div className="mapa-linha">{pilula}</div>}
              <div className={`resumo${revelacao ? " revela" : ""}`} key={`r${revelacao}`}>
              <h2 className="manchete-mapa">{minha.n ? "Suas notas superam" : "Sua nota supera"} o corte de {dados.ano} em {conta.supera} de {plural(pontos.length, "opção", "opções")}</h2>
              <p className="miudo aviso-hist">Comparação histórica · não garante aprovação</p>
              <p className="contagem"><span className="t-pouco">{conta.pouco} por pouco</span><i>·</i><span className="t-abaixo">{conta.abaixo} abaixo do corte</span></p>
              </div>
              {comparando}
            </>
          )}
          <Mapa geo={geo} pontos={pontos} corte={corte} st={st} uf={null} caixa={null} sel={null}
            aoEstado={setUf} aoPonto={(p) => { setUf(p.u); setSel(p); }} />
          <Legenda comNota={minha != null} />
          <p className="miudo">
            <span className="so-mobile">Toque</span><span className="so-desktop">Clique</span> num estado para aproximar
            {minha != null && ` · base: Sisu ${dados.ano}, chamada regular`}
            {" · "}<a className="link-lista" href={`/curso/${dados.slug}/`}>ver lista de {dados.curso} ›</a>
          </p>
        </section>
      </div>
      <div className="inicio-lista">
        <MaisDisputados itens={disputados} minha={minha} ano={dados.ano} />
        <Apoio />
      </div>
    </div>
  );
}

/**
 * Mantém o cartão montado durante a saída. Entrada (CSS .cp-entra): só na primeira abertura — trocar de
 * campus com o cartão aberto só troca o conteúdo. Saída: opacidade, e o cartão fica `inert` (fora do foco).
 * Reabrir durante a saída reverte a opacidade sem remontar. Teclado: abre e fecha sem animação.
 */
function Presenca({ valor, teclado, className, children }: { valor: Ponto | null; teclado: boolean; className: string; children: (p: Ponto) => ReactNode }) {
  const [ultimo, setUltimo] = useState(valor);
  const [anterior, setAnterior] = useState(valor);
  const [saindo, setSaindo] = useState(false);
  const [semEntrada, setSemEntrada] = useState(teclado);
  if (valor !== anterior) {
    if (valor == null && anterior != null && !teclado) setSaindo(true);
    if (valor != null) { setUltimo(valor); setSaindo(false); if (anterior == null) setSemEntrada(teclado); }
    setAnterior(valor);
  }
  useEffect(() => {
    if (!saindo) return;
    const ms = matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 100;
    const t = setTimeout(() => setSaindo(false), ms);
    return () => clearTimeout(t);
  }, [saindo]);
  const p = valor ?? (saindo ? ultimo : null);
  if (!p) return null;
  return (
    <div className={`${className} cp-entra${semEntrada ? " sem-anim" : ""}${!valor ? " saindo" : ""}`} inert={!valor}>
      {children(p)}
    </div>
  );
}

function contar(pontos: Ponto[], minha: Minhas | null, corte: (p: Ponto) => number) {
  const c = { supera: 0, pouco: 0, abaixo: 0 };
  if (minha != null) for (const p of pontos) c[statusPara(minha, p, corte(p))]++;
  return c;
}

/** Com as 5 notas, a média muda de opção para opção (pesos), então a pílula não mostra um número só. */
export function PilulaNota({ minha, editar }: { minha: Minhas; editar: () => void }) {
  return (
    <span className="pilula-nota">
      {minha.n ? <><span>Suas notas</span><strong>por área</strong></> : <><span>Sua média</span><strong>{fmt(minha.media)}</strong></>}
      <button className="link-mudo" onClick={editar}>editar</button>
    </span>
  );
}

const CAMPOS_AREA: { k: keyof Areas; rotulo: string }[] = [
  { k: "red", rotulo: "Redação" }, { k: "mat", rotulo: "Matemática" }, { k: "cn", rotulo: "Natureza" }, { k: "ch", rotulo: "Humanas" }, { k: "lin", rotulo: "Linguagens" },
];

/** Aviso nas opções com pesos quando o aluno só deu a média única. */
export function AvisoPesos() {
  return <p className="aviso-pesos">Este curso usa pesos diferentes por área: sua média aqui pode ser outra. <a href="/calcular/">Digite por área</a></p>;
}

/**
 * Entrada da nota: a média única (rápida) ou as 5 notas por área (cada opção calcula a média com os próprios pesos).
 * As duas ficam salvas no navegador; a última forma digitada é a que vale.
 */
export function EntradaNota({ ano, minha, pronto, compacta }: { ano: number; minha: Minhas | null; pronto: (salvou: boolean) => void; compacta: boolean }) {
  const [modo, setModo] = useState<"media" | "areas">(minha?.n ? "areas" : "media");
  const [texto, setTexto] = useState(minha && !minha.n ? fmt(minha.media) : "");
  const [areas, setAreas] = useState<Areas>(() => minha?.n ? Object.fromEntries(AREAS.map((k, i) => [k, fmt(minha.n![i])])) : {});
  const [erro, setErro] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (minha) ref.current?.focus(); }, [minha, modo]);
  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (modo === "media") {
      const v = lerNota(texto);
      setErro(v == null);
      if (v != null) { salvarMedia(v); pronto(true); }
    } else {
      const ok = CAMPOS_AREA.every((c) => lerNota(areas[c.k] ?? "") != null);
      setErro(!ok);
      if (ok) { salvarNotasAreas(areas); pronto(true); }
    }
  }
  const trocar = (m: "media" | "areas") => { setModo(m); setErro(false); };
  return (
    <form className={`entrada-nota${compacta ? " compacta" : " cartao"}${modo === "areas" ? " por-area" : ""}`} onSubmit={enviar}>
      {!compacta && <label htmlFor="nota" className="entrada-titulo">{modo === "media" ? `Digite sua nota e compare com os cortes de ${ano}` : `Digite suas notas do Enem por área`}</label>}
      {modo === "media" ? (
        <div className="entrada-linha">
          <input id="nota" ref={ref} inputMode="decimal" placeholder="Sua média do Enem" value={texto}
            onChange={(e) => { setTexto(e.target.value); setErro(false); }} aria-invalid={erro} aria-label="Sua média do Enem" />
          <button className="botao" type="submit">{compacta ? "Salvar" : "Comparar nota"}</button>
        </div>
      ) : (
        <>
          <div className="entrada-areas">
            {CAMPOS_AREA.map((c, i) => (
              <label key={c.k} className="calc-nota">
                <span>{c.rotulo}</span>
                <input id={i === 0 ? "nota" : undefined} ref={i === 0 ? ref : undefined} inputMode="decimal" autoComplete="off" placeholder="0,0" value={areas[c.k] ?? ""}
                  onChange={(e) => { setAreas({ ...areas, [c.k]: e.target.value }); setErro(false); }} aria-invalid={erro && lerNota(areas[c.k] ?? "") == null} />
              </label>
            ))}
            <button className="botao" type="submit">{compacta ? "Salvar" : "Comparar"}</button>
          </div>
          {!compacta && !erro && <p className="miudo entrada-explica">Cada curso dá um peso a cada área. Com as cinco notas, calculamos a sua média em cada opção.</p>}
        </>
      )}
      {erro
        ? <p className="erro">{modo === "media" ? "Digite uma média entre 0 e 1000, como 712,40." : "Preencha as cinco notas, cada uma entre 0 e 1000."}</p>
        : !compacta && modo === "media" && <p className="privado"><span className="ponto" />Sua nota não sai do seu navegador</p>}
      <div className="entrada-opcoes">
        {modo === "media"
          ? <button type="button" className="link-mudo" onClick={() => trocar("areas")}>digitar por área (mais preciso)</button>
          : <button type="button" className="link-mudo" onClick={() => trocar("media")}>usar só a média</button>}
        {minha && <button type="button" className="link-mudo" onClick={() => { apagarNotas(); pronto(false); }}>apagar minhas notas</button>}
      </div>
    </form>
  );
}

// ---------- Placa inclinada (2,5D) da vista do estado ----------
// O estado vira uma "maquete": inclina até INCLINACAO graus durante o zoom, com espessura e sombra.
// A perspectiva é calculada nas próprias coordenadas (sem transform 3D no SVG), então textos e toques continuam retos.
const INCLINACAO = 28;
type Projecao = (x: number, y: number) => [number, number];
function projecao(caixa: Caixa | null, inc: number): { p: Projecao; cos: number } {
  if (!caixa || inc <= 0) return { p: (x, y) => [x, y], cos: 1 };
  const [bx, by, bw, bh] = caixa; const cx = bx + bw / 2, cy = by + bh / 2;
  const t = (INCLINACAO * Math.PI / 180) * inc, sen = Math.sin(t), cos = Math.cos(t), D = 2.4 * Math.max(bw, bh);
  return { cos, p: (x, y) => { const f = D / (D - (y - cy) * sen); return [cx + (x - cx) * f, cy + (y - cy) * cos * f]; } };
}
const aneis = (d: string) => d.split("M").filter(Boolean).map((r) => r.replace(/Z/g, "").split("L").map((par) => par.split(",").map(Number) as [number, number]));
const desenhar = (rs: [number, number][][], p: Projecao, dy = 0) =>
  rs.map((r) => "M" + r.map(([x, y]) => { const [a, b] = p(x, y); return `${a.toFixed(1)},${(b + dy).toFixed(1)}`; }).join("L") + "Z").join("");

export function Mapa({ geo, pontos, corte, st, uf, caixa, sel, aoEstado, aoPonto }: {
  geo: Geo; pontos: Ponto[]; corte: (p: Ponto) => number; st: (p: Ponto) => Status | null; uf: string | null;
  caixa: Caixa | null; sel: Ponto | null; aoEstado: (u: string) => void; aoPonto: (p: Ponto) => void;
}) {
  // A placa só existe na vista do estado da home (uf + caixa). Ao voltar ao Brasil, ela desinclina com o mesmo zoom.
  const placa = uf && caixa ? uf : null;
  const ultimo = useRef<{ uf: string; caixa: Caixa } | null>(null);
  if (placa && caixa) ultimo.current = { uf: placa, caixa };
  const rs = useMemo(() => { const u0 = ultimo.current?.uf; const e = u0 ? geo.ufs.find((g) => g.uf === u0) : null; return e ? aneis(e.d) : []; },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geo, placa ?? ultimo.current?.uf]);

  const alvo = useMemo<Caixa>(() => {
    if (!caixa) return [0, 0, geo.w, geo.h];
    // Enquadra a placa já inclinada, contando a espessura e a sombra embaixo.
    const { p } = projecao(caixa, 1);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const r of rs) for (const [x, y] of r) { const [a, b] = p(x, y); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
    if (!isFinite(x0)) { const [x, y, w, h] = caixa; x0 = x; y0 = y; x1 = x + w; y1 = y + h; }
    const w = x1 - x0, h = y1 - y0, m = Math.max(w, h) * 0.06;
    return [x0 - m, y0 - m * 1.4, w + 2 * m, h + m * 1.4 + m + Math.max(w, h) * 0.05];
  }, [caixa, geo, rs]);
  const [vb, setVb] = useState<Caixa>(alvo);
  const [inc, setInc] = useState(placa ? 1 : 0);
  const vbRef = useRef(vb); vbRef.current = vb;
  const incRef = useRef(inc); incRef.current = inc;
  const alvoInc = placa ? 1 : 0;
  useEffect(() => {
    const de = vbRef.current, deInc = incRef.current; const t0 = performance.now();
    const dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 380;
    let id = 0;
    const passo = (t: number) => {
      const a = dur ? Math.min(1, (t - t0) / dur) : 1; const e = 1 - Math.pow(1 - a, 3);
      setVb(de.map((v, i) => v + (alvo[i] - v) * e) as Caixa);
      setInc(deInc + (alvoInc - deInc) * e);
      if (a < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [alvo, alvoInc]);

  // Pontos e textos com tamanho fixo na tela (7 px no Brasil, 14 px no estado), qualquer que seja o zoom.
  const svgRef = useRef<SVGSVGElement>(null);
  const [px, setPx] = useState(326);
  useLayoutEffect(() => {
    const el = svgRef.current; if (!el) return;
    const medir = () => setPx(el.clientWidth || 326);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const u = vb[2] / px;
  const tam = (uf ? 14 : 7) * u;
  const { p: proj, cos } = projecao(ultimo.current?.caixa ?? null, inc);
  const pr = (p: { x: number; y: number }) => proj(p.x, p.y);

  const [foco, setFoco] = useState<Ponto | null>(null);
  const pos = (p: Ponto) => { const [x, y] = pr(p); return { left: `${((x - vb[0]) / vb[2]) * 100}%`, top: `${((y - vb[1]) / vb[3]) * 100}%` }; };
  const visiveis = uf ? pontos.filter((p) => p.u === uf) : pontos;

  // Nomes das 5 cidades com mais inscritos no estado (como no 01c).
  const rotulos = useMemo(() => {
    if (!uf) return [];
    const por = new Map<string, { c: string; x: number; y: number; n: number }>();
    for (const p of visiveis) { const a = por.get(p.c) ?? { c: p.c, x: p.x, y: p.y, n: 0 }; a.n += p.n; por.set(p.c, a); }
    return [...por.values()].sort((a, b) => b.n - a.n);
  }, [uf, visiveis]);
  // Sem sobrepor: estima a caixa de cada nome na tela (≈6,6 px por letra a 12 px) e pula o que colidir.
  const caixas: [number, number, number, number][] = [];
  const rotulosVisiveis = rotulos.flatMap((r) => {
    if (caixas.length >= 5) return [];
    const [rx, ry] = pr(r);
    const sx = (rx - vb[0]) / u, sy = (ry - vb[1]) / u, w = r.c.length * 6.6, d = tam / u / 2 + 5;
    const dir = sx + d + w < px;
    const box: [number, number, number, number] = [dir ? sx + d : sx - d - w, sy - 9, w, 18];
    if (caixas.some((b) => box[0] < b[0] + b[2] + 4 && b[0] < box[0] + box[2] + 4 && box[1] < b[1] + b[3] && b[1] < box[1] + box[3])) return [];
    caixas.push(box); return [{ ...r, rx, ry, dir }];
  });

  // Pino do campus escolhido: sobe ao escolher; o anterior desce em 100 ms (ver .pino no CSS).
  const [saindo, setSaindo] = useState<Ponto | null>(null);
  const [anterior, setAnterior] = useState(sel);
  if (sel !== anterior) { if (anterior && placa) setSaindo(anterior); setAnterior(sel); }
  useEffect(() => { if (!saindo) return; const t = setTimeout(() => setSaindo(null), 110); return () => clearTimeout(t); }, [saindo]);
  const H = 30 * u;
  const pino = (p: Ponto, sai: boolean) => {
    const [x, y] = pr(p); const s = st(p);
    return (
      <g key={(sai ? "sai-" : "") + p.r} className={`pino${sai ? " desce" : ""}`} transform={`translate(${x} ${y})`} style={{ "--h": `${H}px` } as React.CSSProperties} aria-hidden="true">
        {!sai && <ellipse className="onda" rx={16 * u} ry={16 * u * cos} />}
        <ellipse className="pino-sombra" rx={6 * u} ry={6 * u * cos} />
        <line className="pino-haste" x1={0} y1={0} x2={0} y2={-H} strokeWidth={2 * u} />
        <g transform={`translate(0 ${-H})`}><g className={`pino-cabeca pt ${s ?? "neutro"}`}><Marca s={s} tam={16 * u} /></g></g>
      </g>
    );
  };
  const espessura = 9 * u * inc;
  const comPlaca = inc > 0.001 && rs.length > 0;
  const ufPlaca = ultimo.current?.uf;

  return (
    <div className="mapa" onMouseLeave={() => setFoco(null)}>
      <svg ref={svgRef} viewBox={vb.join(" ")} role="img" aria-label={uf ? `Mapa do estado ${uf}` : "Mapa do Brasil"} style={{ aspectRatio: `${vb[2]} / ${vb[3]}` }}>
        {comPlaca && (
          <defs><filter id="sombra-placa" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation={6 * u} /></filter></defs>
        )}
        <g className="ufs">
          {geo.ufs.map((g) => {
            const cls = `uf${g.uf === uf ? " atual" : uf ? " fora" : ""}`;
            if (comPlaca && g.uf === ufPlaca) return (
              <g key={g.uf} className="placa">
                <path d={desenhar(rs, proj, espessura + 10 * u * inc)} className="placa-sombra" filter="url(#sombra-placa)" style={{ opacity: 0.55 * inc }} />
                <path d={desenhar(rs, proj, espessura)} className="placa-lado" strokeWidth={1.2 * u} />
                <path d={desenhar(rs, proj)} className={cls} strokeWidth={(uf ? 1.2 : 0.8) * u} onClick={() => aoEstado(g.uf)}><title>{g.nome}</title></path>
              </g>
            );
            return (
              <path key={g.uf} d={g.d} className={cls} strokeWidth={(uf ? 1.2 : 0.8) * u} onClick={() => aoEstado(g.uf)}>
                <title>{g.nome}</title>
              </path>
            );
          })}
        </g>
        {sel && uf && (() => { const [x, y] = pr(sel); return <line className="conector so-mobile" x1={x} y1={y + 8 * u} x2={x} y2={vb[1] + vb[3]} strokeWidth={u} />; })()}
        <g>
          {visiveis.map((p) => {
            const s = st(p); const [x, y] = pr(p); const escolhido = placa && sel?.r === p.r;
            return (
              <g key={p.r} className={`pt ${s ?? "neutro"}`} transform={`translate(${x} ${y})`}
                onMouseEnter={() => setFoco(p)} onClick={(e) => { e.stopPropagation(); setFoco(null); aoPonto(p); }}>
                <circle r={tam * 1.4} className="alvo" />
                {/* Achatado no chão da placa; o escolhido vira pino (abaixo). */}
                {!escolhido && <g transform={`scale(1 ${cos})`}><Marca s={s} tam={tam} /></g>}
              </g>
            );
          })}
        </g>
        {rotulosVisiveis.map((r) => {
          const dir = r.dir;
          return <text key={r.c} className="rotulo-cidade" x={r.rx + (dir ? 1 : -1) * (tam / 2 + 5 * u)} y={r.ry + 4.2 * u} fontSize={12 * u} textAnchor={dir ? "start" : "end"}>{r.c}</text>;
        })}
        {placa && saindo && saindo.r !== sel?.r && pino(saindo, true)}
        {placa && sel && pino(sel, false)}
        {sel && uf && !placa && <circle className="selecionado" cx={sel.x} cy={sel.y} r={13 * u} strokeWidth={1.5 * u} />}
      </svg>
      {foco && !sel && (
        <div className="dica-ponto" style={pos(foco)} role="tooltip">
          <strong>{foco.i}</strong> · {foco.c}/{foco.u}
          <span>corte {fmt(corte(foco))}</span>
        </div>
      )}
    </div>
  );
}

/** Ponto do mapa (componente "Ponto do mapa" do Figma): neutro, supera (cheio), por pouco (anel), abaixo (cheio com ×). */
export function Marca({ s, tam }: { s: Status | null; tam: number }) {
  const r = tam / 2;
  if (s === "pouco") { const sw = tam * 0.21; return <circle r={r - sw / 2} strokeWidth={sw} />; }
  if (s === "abaixo") {
    const a = tam * 0.18;
    return <><circle r={r} /><path d={`M${-a} ${-a}L${a} ${a}M${a} ${-a}L${-a} ${a}`} strokeWidth={tam * 0.14} /></>;
  }
  return <circle r={r} />;
}

export function Legenda({ comNota }: { comNota: boolean }) {
  if (!comNota) return <p className="legenda miudo">Cada ponto é um campus. Digite sua nota para ver as cores.</p>;
  const item = (s: Status, t: string) => (
    <span><svg width="10" height="10" viewBox="-5 -5 10 10" className={`pt ${s}`} aria-hidden="true"><Marca s={s} tam={10} /></svg>{t}</span>
  );
  return <div className="legenda">{item("supera", "Supera o corte")}<span><svg width="10" height="10" viewBox="-5 -5 10 10" className="pt pouco" aria-hidden="true"><Marca s="pouco" tam={10} /></svg><Termo id="pouco">Por pouco (até 10 pts)</Termo></span>{item("abaixo", "Abaixo do corte")}</div>;
}

function CartaoPonto({ p, curso, corte, minha }: { p: Ponto; curso: DadosMapa; corte: number; minha: Minhas | null }) {
  const sua = minha == null ? null : suaMedia(minha, p);
  const s = minha == null ? null : statusPara(minha, p, corte);
  const dif = sua == null ? null : sua.v - corte;
  const texto =
    sua?.minimo ? `Não atinge a ${sua.minimo}, então fica fora da disputa nesta opção.`
    : s === "pouco" ? `Até 10 pontos abaixo do corte do Sisu ${curso.ano}. O corte muda de um ano para o outro.`
    : s === "supera" ? `Sua nota supera o corte do Sisu ${curso.ano}. O corte muda de um ano para o outro, então não é garantia.`
    : s === "abaixo" ? `Faltam ${fmt(-dif!)} pontos para o corte do Sisu ${curso.ano}.`
    : `Digite sua nota para comparar com este corte.`;
  return (
    <div className="cartao-ponto">
      <div className="cp-topo">
        <div>
          <div className="cp-nome">{curso.curso} · {p.i}</div>
          <div className="cp-meta">{p.c} · {p.t}</div>
        </div>
        {s && <span className={`selo-status ${s}`}>{ROTULO[s]}</span>}
      </div>
      <div className="cp-numeros">
        <div><span>Corte</span><strong>{fmt(corte)}</strong></div>
        {minha != null
          ? <><div><span>{sua!.ponderada ? "Você (com pesos)" : "Você"}</span><strong>{fmt(sua!.v)}</strong></div><div><span>Diferença</span><strong className={`t-${s}`}>{dif! >= 0 ? "+" : "−"}{fmt(Math.abs(dif!))}</strong></div></>
          : <div><span>Inscritos (ampla)</span><strong>{p.n.toLocaleString("pt-BR")}</strong></div>}
      </div>
      <p>{texto}{p.b ? " Este curso dá bônus regional: confira no edital se você tem direito." : ""}</p>
      {minha && !minha.n && temPesos(p) && <AvisoPesos />}
      <a className="botao" href={`/curso/${curso.slug}/${p.r}/`}>Ver curso</a>
    </div>
  );
}

type LinhaProps = { titulo: string; meta: string; valor: number; s: Status | null; ativa?: boolean; href?: string; onClick?: (e: React.MouseEvent) => void };
function LinhaPonto({ titulo, meta, valor, s, ativa, href, onClick }: LinhaProps) {
  const dentro = (
    <>
      <div className="info"><div className="nome">{titulo}</div><div className="meta">{meta}</div></div>
      <div className="valor"><strong>{fmt(valor)}</strong>{s ? <span className={`detalhe t-${s}`}>{ROTULO[s]}</span> : <span className="detalhe">corte</span>}</div>
    </>
  );
  return href
    ? <a className="linha" href={href}>{dentro}</a>
    : <button className={`linha${ativa ? " ativa" : ""}`} onClick={onClick}>{dentro}</button>;
}

function ListaEstado({ uf, pontos, curso, mod, corte, minha, sel, aoEscolher }: {
  uf: string; pontos: Ponto[]; curso: DadosMapa; mod: { cod: string; nome: string }; corte: (p: Ponto) => number;
  minha: Minhas | null; sel: Ponto | null; aoEscolher: (p: Ponto, teclado: boolean) => void;
}) {
  const [todos, setTodos] = useState(false);
  const ord = [...pontos].sort((a, b) => corte(a) - corte(b));
  const vis = todos ? ord : ord.slice(0, 5);
  return (
    <section className="cartao lista">
      <div className="cabeca"><h2>Campi em {uf}</h2><span className="miudo">{curso.curso} · {curtaMod(mod.cod, mod.nome)}</span></div>
      {vis.map((p) => (
        <LinhaPonto key={p.r} titulo={`${curso.curso} · ${p.i}`} meta={p.c} valor={corte(p)}
          s={minha == null ? null : statusPara(minha, p, corte(p))} ativa={sel?.r === p.r} onClick={(e) => aoEscolher(p, e.detail === 0)} />
      ))}
      {ord.length > 5 && !todos && <button className="ver-mais" onClick={() => setTodos(true)}>Ver as {ord.length} opções em {uf}</button>}
    </section>
  );
}

function MaisDisputados({ itens, minha, ano }: { itens: Disputado[]; minha: Minhas | null; ano: number }) {
  return (
    <section className="cartao lista">
      <div className="cabeca"><h2>Mais procurados</h2><span className="miudo">{minha == null ? `Com mais inscritos no Sisu ${ano}` : "com a sua nota"}</span></div>
      {itens.map((d) => (
        <LinhaPonto key={d.r} titulo={d.curso} meta={`${d.i} · ${d.c}`} valor={d.m.AC} s={minha == null ? null : statusPara(minha, d, d.m.AC)} href={`/curso/${d.slug}/${d.r}/`} />
      ))}
    </section>
  );
}
