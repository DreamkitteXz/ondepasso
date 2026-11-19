"use client";
// Página de universidade fora do Sisu (USP pela Fuvest, Unicamp pela Comvest). Mesmo esqueleto da página das
// universidades do Sisu, mas a comparação é com acertos na 1ª fase do vestibular próprio, não com a média do Enem.
import { useEffect, useMemo, useState } from "react";
import type { Proprio, CursoProprio } from "@/lib/vestibular-proprio-tipos";
import { concorrencia, lerAcertos, situacaoData, statusAcertos } from "@/lib/vestibular-proprio-tipos";
import { ROTULO, contagemVazia, type Status } from "@/lib/formato";
import { ContagemComparacao } from "@/components/ResumoComparacao";
import { Apoio } from "@/components/Apoio";
import { Compartilhar } from "@/components/Compartilhar";
import { Carrossel, Creditos, OndeFica } from "@/components/PaginaUniversidade";

const POR_PAGINA = 12;
type Ordem = "maior" | "menor" | "vagas" | "concorrencia" | "nome";
const plural = (n: number, um: string, varios: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;
const mil = (n: number) => n.toLocaleString("pt-BR");
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const SELO: Record<Status, string> = { supera: "supera", igual: "supera", pouco: "pouco", abaixo: "abaixo", minimo: "abaixo" };
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function dataCurta(d: string) { const [, m, dia] = d.split("-").map(Number); return `${dia} ${MES[m - 1]}`; }
function periodoData(d: { data: string; fim?: string }) {
  if (!d.fim) return dataCurta(d.data);
  const [a, b] = [dataCurta(d.data), dataCurta(d.fim)];
  return a.split(" ")[1] === b.split(" ")[1] ? `${a.split(" ")[0]} a ${b}` : `${a} a ${b}`;
}
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

function guardado<T>(chave: string, ler: (s: string) => T | null): T | null {
  try { const s = localStorage.getItem(chave); return s == null ? null : ler(s); } catch { return null; }
}
function guardar(chave: string, v: string | null) {
  try { if (v == null) localStorage.removeItem(chave); else localStorage.setItem(chave, v); } catch { /* navegação privada */ }
}

export function PaginaVestibularProprio({ u, contorno }: {
  u: Proprio; contorno: { ufs: { uf: string; d: string }[]; box: [number, number, number, number] };
}) {
  const ed = u.vestibular.edicao;
  const vest = u.vestibular.nome.replace(/ \(.*\)$/, "");
  const orgao = u.vestibular.nome.match(/\((.*)\)/)?.[1] ?? u.vestibular.nome;
  const curta = u.sigla;
  const chave = `ondepasso.acertos.${u.vestibular.id}-${ed}`;
  const max = u.prova.questoes;
  const [acertos, setAcertos] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [mod, setMod] = useState(u.modalidades[0].cod);
  const [hoje, setHoje] = useState(u.geradoEm);
  const [busca, setBusca] = useState("");
  const [cidade, setCidade] = useState("");
  const [area, setArea] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("maior");
  const [limite, setLimite] = useState(POR_PAGINA);

  useEffect(() => {
    const a = guardado(chave, (s) => lerAcertos(s, max));
    if (a != null) { setAcertos(a); setTexto(String(a)); }
    const m = guardado(`${chave}.modalidade`, (s) => (u.modalidades.some((x) => x.cod === s) ? s : null));
    if (m) setMod(m);
    setHoje(hojeISO());
  }, [chave, max, u.modalidades]);

  const escolherMod = (m: string) => { setMod(m); guardar(`${chave}.modalidade`, m); };
  const invalido = texto.trim() !== "" && lerAcertos(texto, max) == null;
  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const a = lerAcertos(texto, max);
    if (a == null) return;
    setAcertos(a); guardar(chave, String(a));
  }
  function limpar() { setAcertos(null); setTexto(""); guardar(chave, null); }

  const corte = (c: CursoProprio) => c.cortes[mod] ?? null;
  const st = (c: CursoProprio): Status | null => { const v = corte(c); return acertos == null || v == null ? null : statusAcertos(v, acertos, u.prova.minimo); };

  // Na Fuvest o corte é da carreira: a contagem é por carreira, para não contar o mesmo corte várias vezes.
  const porCarreira = u.nCarreiras != null;
  const unidadesComparadas = useMemo(() => {
    const vistas = new Map<string, number>();
    for (const c of u.cursos) { const v = c.cortes[mod]; if (v == null) continue; vistas.set(porCarreira ? `k${c.carreira}` : c.id, v); }
    return [...vistas.values()];
  }, [u, mod, porCarreira]);
  const conta = contagemVazia();
  if (acertos != null) for (const v of unidadesComparadas) conta[statusAcertos(v, acertos, u.prova.minimo)]++;
  const acima = conta.supera + conta.igual;

  const cidades = useMemo(() => [...new Set(u.cursos.map((c) => c.cidade))].sort((a, b) => a.localeCompare(b, "pt-BR")), [u]);
  const areas = useMemo(() => [...new Set(u.cursos.map((c) => c.area))].sort((a, b) => a.localeCompare(b, "pt-BR")), [u]);
  const periodos = useMemo(() => [...new Set(u.cursos.map((c) => c.periodo))].sort((a, b) => a.localeCompare(b, "pt-BR")), [u]);
  const vis = useMemo(() => {
    const q = norm(busca.trim());
    const f = u.cursos.filter((c) => (!cidade || c.cidade === cidade) && (!area || c.area === area) && (!periodo || c.periodo === periodo)
      && (!q || norm(c.nome).includes(q) || norm(c.carreiraNome ?? "").includes(q) || norm(c.unidade ?? "").includes(q)));
    const nulosNoFim = (x: number | null | undefined, y: number | null | undefined, dir: number) => (x == null ? (y == null ? 0 : 1) : y == null ? -1 : dir * (x - y));
    return f.sort((a, b) => {
      if (ordem === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
      if (ordem === "vagas") return b.vagasTotais - a.vagasTotais || a.nome.localeCompare(b.nome, "pt-BR");
      if (ordem === "concorrencia") return nulosNoFim(concorrencia(a), concorrencia(b), -1) || a.nome.localeCompare(b.nome, "pt-BR");
      return nulosNoFim(corte(a), corte(b), ordem === "maior" ? -1 : 1) || a.nome.localeCompare(b.nome, "pt-BR");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u, busca, cidade, area, periodo, ordem, mod]);
  const reset = () => setLimite(POR_PAGINA);

  const nomeMod = u.modalidades.find((m) => m.cod === mod)?.nome ?? mod;
  const vagasVest = u.ingresso[0].vagas;
  const vagasTodas = u.ingresso.reduce((t, i) => t + i.vagas, 0);
  const nCampi = u.campi.length;
  const descricao = [u.nome, u.tipo, `${nCampi} ${nCampi === 1 ? "campus" : "campi"} em ${u.cidades.length} cidades de SP`].join(" · ");
  const unidadeCorte = porCarreira ? (n: number) => (n === 1 ? "carreira" : "carreiras") : (n: number) => (n === 1 ? "curso" : "cursos");

  const abertura = (
    <section className="cartao uni-abertura" aria-label={u.sigla}>
      {u.fotos.length > 0 && <Carrossel u={u} />}
      <div className="uni-id">
        <p className="rotulo etiqueta proprio-etiqueta"><span className="ponto" />Vestibular próprio · fora do Sisu</p>
        <h1>{u.sigla}</h1>
        <p className="sub">{descricao}</p>
        <p className="proprio-aviso">
          A {curta} não usa o Sisu: as vagas são preenchidas por {u.ingresso.map((i) => i.nome).slice(0, -1).join(", ")} e {u.ingresso[u.ingresso.length - 1].nome}.
          Os cortes desta página são da {u.prova.fase} do {vest} {ed}, em acertos de {u.prova.questoes} questões.
        </p>
        <div className="uni-acoes">
          <a className="uni-site" href={u.site} target="_blank" rel="noopener noreferrer">Site oficial ↗</a>
          <a className="uni-site" href={u.vestibular.site} target="_blank" rel="noopener noreferrer">{orgao} ↗</a>
          <Compartilhar titulo={`${u.sigla}: cursos, vagas e notas de corte do vestibular ${ed}`} />
        </div>
        {u.fotos.length > 0 && <Creditos u={u} className="so-desktop" />}
      </div>
    </section>
  );

  const cartaoAcertos = (
    <section className="cartao uni-nota proprio-nota" aria-label="Seus acertos na 1ª fase">
      <form className="proprio-form" onSubmit={salvar}>
        <label htmlFor="acertos" className="entrada-titulo">Quantos acertos você fez na {u.prova.fase} do {vest} {ed}?</label>
        <div className="entrada-linha">
          <input id="acertos" inputMode="numeric" autoComplete="off" placeholder={`de 0 a ${max}`} value={texto} aria-invalid={invalido || undefined}
            aria-describedby="acertos-ajuda" onChange={(e) => setTexto(e.target.value.replace(/\D/g, "").slice(0, 3))} />
          <button className="botao" type="submit" disabled={lerAcertos(texto, max) == null}>Comparar</button>
        </div>
        {invalido ? <p className="erro" id="acertos-ajuda">Use um número de 0 a {max}.</p>
          : <p className="privado" id="acertos-ajuda"><span className="ponto" />Fica só neste aparelho. Confira seus acertos no gabarito oficial.</p>}
      </form>
      {acertos != null && (
        <div className="resumo revela" key={`${acertos}-${mod}`}>
          <h2 className="manchete-curso">{acima} de {plural(unidadesComparadas.length, unidadeCorte(1), unidadeCorte(2))} com corte igual ou abaixo de {acertos} acertos</h2>
          <ContagemComparacao conta={conta} />
          <div className="orientacao-comparacao">
            <p>Passar do corte da {u.prova.fase} só leva para a 2ª fase; a aprovação depende da nota final.</p>
            {u.prova.minimo != null && acertos < u.prova.minimo && <p>Com menos de {u.prova.minimo} acertos, a {orgao} elimina na {u.prova.fase}.</p>}
          </div>
          <button type="button" className="link-mudo" onClick={limpar}>Apagar meus acertos</button>
        </div>
      )}
      {u.modalidades.length > 1 ? (
        <div className="uni-mod">
          <span className="miudo">comparando com:</span>
          <label className="trocar"><b>{nomeMod}</b> <i>trocar</i>
            <select value={mod} onChange={(e) => escolherMod(e.target.value)} aria-label="Modalidade para comparar">
              {u.modalidades.map((m) => <option key={m.cod} value={m.cod}>{m.nome}</option>)}
            </select>
          </label>
        </div>
      ) : <p className="miudo proprio-mod">Comparando com o corte de {nomeMod.toLowerCase()}.</p>}
    </section>
  );

  const numeros = (
    <section className="cartao uni-numeros" aria-label={`Números da ${u.sigla}`}>
      <div><strong>{mil(vagasVest)}</strong><span>vagas no vestibular {ed}</span></div>
      <div><strong>{u.cursos.length}</strong><span>{porCarreira ? `cursos em ${u.nCarreiras} carreiras` : "opções de curso"}</span></div>
      <div><strong>{u.cidades.length}</strong><span>cidades</span></div>
    </section>
  );

  const ingresso = (
    <section className="cartao proprio-ingresso" aria-labelledby="t-ingresso">
      <div className="proprio-cabeca">
        <h2 id="t-ingresso">Formas de entrar</h2>
        <span className="miudo">{mil(vagasTodas)} vagas para {ed}</span>
      </div>
      <ul>
        {u.ingresso.map((i) => (
          <li key={i.nome}>
            <strong className="pi-vagas">{mil(i.vagas)}<span>vagas</span></strong>
            <div>
              <h3>{i.link ? <a href={i.link} target="_blank" rel="noopener noreferrer">{i.nome} ↗</a> : i.nome}</h3>
              <p>{i.texto}</p>
              <p className="miudo">{i.detalhe}.</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );

  const filtros = (
    <div className="proprio-controles">
      <label className="busca unis-busca">
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M10.08 17.42a7.33 7.33 0 1 0 0-14.67 7.33 7.33 0 0 0 0 14.67Z" /><path d="m19.25 19.25-3.94-3.94" /></svg>
        <input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); reset(); }} placeholder={`Busque um curso${porCarreira ? " ou unidade, ex.: Poli" : ", ex.: Medicina"}`} aria-label="Buscar curso" />
      </label>
      <div className="uni-filtros">
        {cidades.length > 1 && (
          <select value={cidade} onChange={(e) => { setCidade(e.target.value); reset(); }} aria-label="Filtrar por cidade">
            <option value="">Todas as cidades</option>
            {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select value={area} onChange={(e) => { setArea(e.target.value); reset(); }} aria-label="Filtrar por área">
          <option value="">Todas as áreas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={periodo} onChange={(e) => { setPeriodo(e.target.value); reset(); }} aria-label="Filtrar por período">
          <option value="">Todos os períodos</option>
          {periodos.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="uni-ordem" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar">
          <option value="maior">Corte mais alto primeiro</option>
          <option value="menor">Corte mais baixo primeiro</option>
          <option value="vagas">Mais vagas primeiro</option>
          {porCarreira && <option value="concorrencia">Mais concorrida primeiro</option>}
          <option value="nome">Nome do curso</option>
        </select>
        <span className="miudo" aria-live="polite">{plural(vis.length, "curso", "cursos")}</span>
      </div>
    </div>
  );

  const temAnterior = u.cursos.some((c) => c.corteAnterior != null);
  const lista = (
    <div className="uni-cursos proprio-cursos">
      <div className="uni-cabeca so-desktop">
        <span>Curso</span><span>Campus</span><span className="n">Corte {ed}{u.modalidades.length > 1 ? ` · ${mod}` : ""}</span><span className="n">{temAnterior ? `vs. ${ed - 1}` : "Vagas"}</span><span className="n">Seus acertos</span>
      </div>
      {vis.length === 0 && <p className="unis-vazio">Nenhum curso com esses filtros.</p>}
      {vis.slice(0, limite).map((c) => {
        const v = corte(c); const s = st(c); const cc = concorrencia(c);
        const meta = [c.unidade, c.periodo, c.duracao, temAnterior ? `${c.vagasTotais} ${c.vagasTotais === 1 ? "vaga" : "vagas"} no vestibular` : null, c.habilidades ? "prova de habilidades" : null].filter(Boolean).join(" · ");
        const dif = v != null && c.corteAnterior != null ? v - c.corteAnterior : null;
        return (
          <div key={c.id} className="uni-curso">
            <span className="uc-nome">
              <strong>{c.nome}</strong>
              <span className="meta" title={c.unidade && u.unidades?.[c.unidade] ? u.unidades[c.unidade] : undefined}>{meta}</span>
              {c.carreiraNome && <span className="meta">Carreira {c.carreira} · {c.carreiraNome}{cc != null ? ` · ${cc.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} candidatos por vaga` : ""}</span>}
            </span>
            <span className="uc-corte"><strong>{v == null ? "sem corte" : `${v}`}</strong><span className="meta">{v == null ? (c.habilidades ? "habilidades específicas" : "") : `acertos de ${max}`}</span></span>
            <span className="uc-campus">{!/^campus/i.test(c.campus) && <span className="so-mobile">Campus · </span>}{c.campus}{c.campus.includes(c.cidade) ? "" : ` · ${c.cidade}`}</span>
            <span className="uc-delta">
              {temAnterior
                ? <><span className="meta so-mobile">vs. {ed - 1}</span>{dif == null ? <span className="miudo">—</span> : dif === 0 ? <span className="miudo">igual</span> : <span className={`variacao ${dif > 0 ? "sobe" : "desce"}`} title={`Em ${ed - 1}, o corte foi ${c.corteAnterior} acertos.`}>{dif > 0 ? "+" : "−"}{Math.abs(dif)} {Math.abs(dif) === 1 ? "acerto" : "acertos"}</span>}</>
                : <><span className="meta so-mobile">Vagas</span><span title={Object.entries(c.vagas).map(([k, n]) => `${k}: ${n}`).join(" · ")}>{c.vagasTotais}</span></>}
            </span>
            <span className="uc-status">
              {s && <span className="meta so-mobile">Seus acertos</span>}
              {s ? <span className={`selo-tinta ${SELO[s]}`}>{ROTULO[s]}</span> : <span className="miudo so-desktop">—</span>}
            </span>
          </div>
        );
      })}
      {vis.length > limite && <button className="uni-mais" onClick={() => setLimite((n) => n + 40)}>Ver mais {Math.min(40, vis.length - limite)} (faltam {vis.length - limite})</button>}
    </div>
  );

  const calendario = (
    <section className="cartao proprio-calendario" aria-labelledby="t-cal">
      <h2 id="t-cal">Calendário {vest} {ed}</h2>
      <ol>
        {u.calendario.map((d) => {
          const s = situacaoData(d, hoje);
          return (
            <li key={d.data + d.evento} className={s}>
              <span className="pc-data">{periodoData(d)}</span>
              <span className="pc-evento">{d.evento}{s === "agora" && <em> · agora</em>}</span>
            </li>
          );
        })}
      </ol>
      <p className="miudo">Taxa de inscrição: {u.vestibular.taxa}. Confira sempre as datas no site oficial.</p>
    </section>
  );

  const cotas = (
    <section className="cartao proprio-cotas" aria-labelledby="t-cotas">
      <h2 id="t-cotas">Cotas e bônus</h2>
      <ul>{u.cotas.map((t) => <li key={t}>{t}</li>)}</ul>
    </section>
  );

  return (
    <div className="pagina-uni pagina-proprio">
      <a className="voltar" href="/universidades/">‹ Universidades</a>
      {abertura}
      {u.fotos.length > 0 && <Creditos u={u} className="so-mobile" />}
      <div className="uni-grade">
        <div className="uni-principal">
          <div className="uni-topo">{cartaoAcertos}{numeros}</div>
          {ingresso}
          <div className="proprio-cabeca proprio-titulo-cursos">
            <h2>Cursos e notas de corte</h2>
            <span className="miudo">{u.prova.fase} · {vest} {ed}</span>
          </div>
          {filtros}
          {lista}
          <p className="miudo proprio-nota-corte">{u.prova.nota}</p>
        </div>
        <aside className="uni-lado">
          {calendario}
          <OndeFica u={u} contorno={contorno} unidade={["curso", "cursos"]} />
          {cotas}
          <a className="cartao proprio-provas" href={u.provas}>
            <span><strong>Provas anteriores</strong><span className="miudo">Cadernos e gabaritos oficiais do {vest}</span></span>
            <span aria-hidden="true">→</span>
          </a>
          <Apoio />
          <div className="miudo proprio-fontes">
            <p>Fontes:</p>
            <ul>{u.fontes.map((f) => <li key={f.titulo}><a href={f.url} target="_blank" rel="noopener noreferrer">{f.titulo}</a></li>)}</ul>
            <p>{u.conferencia} Dados reunidos em {dataCurta(u.geradoEm)} de {u.geradoEm.slice(0, 4)}.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
