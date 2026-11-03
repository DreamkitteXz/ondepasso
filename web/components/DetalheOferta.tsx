"use client";
// Detalhe de uma opção (Figma 03/03b e W3/W3b). A parte da média e da modalidade vem do navegador;
// todo o resto já sai pronto no HTML estático.
import { useState } from "react";
import { nota as fmt, ROTULO, type Status } from "@/lib/formato";
import { statusPara, suaMedia, temPesos, type Pesos } from "@/lib/minhas";
import { salvarMod, useMinhas, useMod } from "@/lib/nota";
import { AvisoPesos, EntradaNota, Marca } from "@/components/MapaInicio";
import { IconeMapa } from "@/components/ListaCurso";
import { Compartilhar } from "@/components/Compartilhar";
import { Termo } from "@/components/Termo";
import { NoSisu } from "@/components/NoSisu";

export type LinhaCota = { cod: string; nome: string; titulo: string; vagas: number | null; inscritos: number | null; corte: number | null };
export type Local = { d: string; box: [number, number, number, number]; x: number | null; y: number | null };
type Props = {
  slug: string; rota: string; curso: string; ies: string; cidade: string; ano: number;
  atual: number | null; delta: number | null; bonus: number;
  cotas: LinhaCota[]; hist: { ano: number; v: number | null }[]; piso: number; teto: number;
  iguais: boolean; minimas: { area: string; v: number }[]; pesos: { area: string; peso: number | null; minima: number | null }[];
  mediaMinima: number | null; local: Local | null; peso: Pesos;
};

const MOSTRAR = 6;
const inteiro = (v: number | null) => (v == null ? "—" : v.toLocaleString("pt-BR"));

export function DetalheOferta(p: Props) {
  const minha = useMinhas();
  const modSalva = useMod();
  const [editando, setEditando] = useState(false);
  const [todas, setTodas] = useState(false);

  // A modalidade do aluno só vale aqui se ela tiver corte nesta opção; senão, compara com a ampla.
  const comCorte = p.cotas.filter((c) => c.corte != null);
  const minhaCota = comCorte.find((c) => c.cod === modSalva) ?? comCorte.find((c) => c.cod === "AC") ?? null;
  const semAMinha = modSalva !== "AC" && minhaCota?.cod !== modSalva;
  const corte = minhaCota?.corte ?? null;
  const sua = minha == null ? null : suaMedia(minha, p.peso);
  const s = minha != null && corte != null ? statusPara(minha, p.peso, corte) : null;
  const dif = sua != null && corte != null ? Math.round((sua.v - corte) * 100) / 100 : null;

  const idxMinha = p.cotas.findIndex((c) => c.cod === minhaCota?.cod);
  const cortar = !todas && p.cotas.length > MOSTRAR + 1 && idxMinha < MOSTRAR;

  const voce = (
    <div className="voce">
      {minha == null || editando ? (
        <>
          <p className="voce-titulo">{minha == null ? "Compare com a sua nota" : "Editar sua nota"}</p>
          <EntradaNota ano={p.ano} minha={editando ? minha : null} compacta pronto={() => setEditando(false)} />
        </>
      ) : (
        <>
          <div className="voce-texto">
            <p className="voce-titulo">{sua!.ponderada ? "Sua média aqui" : "Sua média"} <strong>{fmt(sua!.v)}</strong> <button className="link-mudo" onClick={() => setEditando(true)}>editar</button></p>
            {sua!.ponderada && <p className="miudo">com os pesos deste curso</p>}
            {sua!.minimo && <p className="miudo t-abaixo">não atinge a {sua!.minimo}</p>}
            {dif != null && !sua!.minimo && (
              <p className="miudo">
                {dif < 0 ? `faltam ${fmt(-dif)} pontos` : dif === 0 ? "exatamente no corte" : `${fmt(dif)} pontos acima`}
                {minhaCota && minhaCota.cod !== "AC" ? ` · ${minhaCota.nome}` : ""}
              </p>
            )}
          </div>
          {s ? <span className={`selo-tinta ${s}`}>{ROTULO[s]}</span> : <span className="miudo">sem corte para comparar</span>}
          {!minha.n && temPesos(p.peso) && <AvisoPesos />}
        </>
      )}
    </div>
  );

  return (
    <div className="oferta-grade">
      <div className="oferta-principal">
        <section className="cartao corte-oferta" aria-label="Nota de corte">
          <div className="corte-numero">
            <p className="rotulo"><Termo id="corte">Nota de corte</Termo> · Sisu {p.ano} · ampla</p>
            <div className="figura">{p.atual == null ? "sem corte" : fmt(p.atual)}</div>
            <p className="corte-meta">
              {p.delta != null && p.delta !== 0 && <span className={`pill ${p.delta > 0 ? "sobe" : "desce"}`}>{p.delta > 0 ? "▲" : "▼"} {fmt(Math.abs(p.delta))} vs. {p.ano - 1}</span>}
              <span className="miudo"><Termo id="chamada">chamada regular</Termo> · MEC</span>
            </p>
          </div>
          {voce}
        </section>

        {p.bonus > 0 && (
          <div className="aviso aviso-bonus">
            <strong>Este curso dá bônus regional de {p.bonus.toLocaleString("pt-BR")}%</strong>
            <p>Candidatos da região têm a nota multiplicada e disputam junto com a ampla, então o corte já inclui notas com bônus. Se você não tem direito ao bônus, compare com cuidado.</p>
            <p>Confirme no edital se você tem direito ao bônus antes de comparar sua nota.</p>
          </div>
        )}

        <section className="cartao cotas" aria-labelledby="t-cotas">
          <div className="cotas-topo">
            <h2 id="t-cotas">Cortes por <Termo id="modalidade">cota</Termo> · {p.ano}</h2>
            {comCorte.length > 1 && (
              <label className="trocar miudo">sua modalidade · <i>trocar</i>
                <select value={minhaCota?.cod ?? "AC"} onChange={(e) => salvarMod(e.target.value)} aria-label="Sua modalidade">
                  {comCorte.map((c) => <option key={c.cod} value={c.cod}>{c.nome}</option>)}
                </select>
              </label>
            )}
          </div>
          {semAMinha && <p className="miudo cotas-nota">Sua modalidade não tem corte nesta opção em {p.ano}; a comparação usa a ampla.</p>}
          <table className="tabela-cotas">
            <thead><tr><th>Modalidade</th><th className="n">Vagas</th><th className="n">Inscritos</th><th className="n">Corte</th></tr></thead>
            <tbody>
              {p.cotas.map((c, i) => {
                const sua = c.cod === minhaCota?.cod;
                // No celular mostra as 6 primeiras (Figma 03); no desktop, todas (W3).
                const cls = [sua && "sua", cortar && i >= MOSTRAR && "extra"].filter(Boolean).join(" ");
                return (
                  <tr key={c.cod} className={cls || undefined} aria-current={sua || undefined}>
                    <td title={c.titulo || undefined}><span className="cota-nome">{c.nome}</span>{sua && <span className="cota-sua">sua modalidade</span>}</td>
                    <td className="n">{inteiro(c.vagas)}</td>
                    <td className="n">{inteiro(c.inscritos)}</td>
                    <td className="n corte">{c.corte == null ? <span className="miudo">sem corte</span> : fmt(c.corte)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {cortar && <button className="ver-todas" onClick={() => setTodas(true)}>Ver todas as {p.cotas.length} modalidades</button>}
          {p.cotas.some((c) => c.corte == null) && <p className="miudo cotas-nota">“Sem corte”: a modalidade não teve candidatos suficientes para formar uma nota de corte.</p>}
        </section>
      </div>

      <aside className="oferta-lado">
        <section className="cartao" aria-labelledby="t-hist">
          <h2 id="t-hist">Últimas edições · ampla</h2>
          {p.hist.map((h) => (
            <div key={h.ano} className={`barra${h.ano === p.ano ? " atual" : ""}`}>
              <span>{h.ano}</span>
              <div className="trilho"><span style={{ width: h.v == null ? 0 : `${Math.max(4, ((h.v - p.piso) / (p.teto - p.piso)) * 100)}%` }} /></div>
              <span className="n">{h.v == null ? "—" : fmt(h.v)}</span>
            </div>
          ))}
        </section>

        <section className="cartao pesos" aria-labelledby="t-pesos">
          <h2 id="t-pesos"><Termo id="pesos">Pesos</Termo> e notas mínimas</h2>
          {p.iguais ? (
            <>
              <p className="pesos-texto">Todas as áreas valem o mesmo: sua média aqui é a média simples.{p.minimas.length === 0 && " Sem nota mínima por área."}</p>
              {p.minimas.map((m) => <div key={m.area} className="peso"><span>{m.area}</span><span>mínimo {fmt(m.v)}</span></div>)}
            </>
          ) : p.pesos.map((x) => (
            <div key={x.area} className="peso"><span>{x.area}</span><span>peso {x.peso ?? "—"}{x.minima != null ? ` · mínimo ${fmt(x.minima)}` : ""}</span></div>
          ))}
          {p.mediaMinima != null && <div className="peso"><span>Média mínima</span><span>{fmt(p.mediaMinima)}</span></div>}
        </section>

        {p.local && <OndeFica local={p.local} cidade={p.cidade} s={s} />}

        <NoSisu ano={p.ano} />

        <div className="oferta-acoes">
          <a className="botao botao-contorno" href={`/?curso=${p.slug}&campus=${p.rota}`}><IconeMapa /> Ver no mapa</a>
          <Compartilhar titulo={`Nota de corte de ${p.curso} na ${p.ies}`} />
        </div>
      </aside>
    </div>
  );
}

/** Estado da opção com o ponto do campus (só no desktop, como no W3). */
function OndeFica({ local, cidade, s }: { local: Local; cidade: string; s: Status | null }) {
  const [x, y, w, h] = local.box; const m = Math.max(w, h) * 0.06;
  const vb = [x - m, y - m, w + 2 * m, h + 2 * m];
  const u = vb[2] / 318; // largura do cartão no desktop: o ponto fica com ~14 px, como no mapa do estado
  return (
    <section className="cartao onde-fica so-desktop" aria-labelledby="t-onde">
      <h2 id="t-onde">Onde fica</h2>
      <div className="mapa">
        <svg viewBox={vb.join(" ")} role="img" aria-label={`Mapa: ${cidade}`} style={{ aspectRatio: `${vb[2]} / ${vb[3]}` }}>
          <path d={local.d} className="uf atual" strokeWidth={1.2 * u} />
          {local.x != null && local.y != null && (
            <>
              <g className={`pt ${s ?? "neutro"}`} transform={`translate(${local.x} ${local.y})`}><Marca s={s} tam={14 * u} /></g>
              <circle className="selecionado" cx={local.x} cy={local.y} r={13 * u} strokeWidth={1.5 * u} />
            </>
          )}
        </svg>
      </div>
      <p className="miudo">{cidade}</p>
    </section>
  );
}
