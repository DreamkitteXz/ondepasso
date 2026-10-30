import type { Metadata } from "next";
import { indice, curso, modalidades } from "@/lib/dados";
import { corteAmpla, variacao, nota, nomeModalidade, PESOS } from "@/lib/formato";
import { slugOferta, idDaRota } from "@/lib/rotas";

type P = { params: Promise<{ slug: string; oferta: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return indice().cursos.flatMap((c) => curso(c.slug).ofertas.map((o) => ({ slug: c.slug, oferta: slugOferta(o) })));
}
async function achar(params: P["params"]) {
  const { slug, oferta } = await params; const c = curso(slug);
  return { c, o: c.ofertas.find((x) => x.id === idDaRota(oferta))! };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { c, o } = await achar(params); const ano = Math.max(...c.anos);
  return {
    title: `Nota de corte de ${c.curso} na ${o.ies} (${o.municipio}/${o.uf}) — Sisu ${ano}`,
    description: `Corte da ampla em ${ano}: ${nota(corteAmpla(o, ano))}. Cotas, histórico de ${c.anos[0]} a ${ano}, pesos e notas mínimas.`,
    alternates: { canonical: `/curso/${c.slug}/${slugOferta(o)}/` },
  };
}

export default async function PaginaOferta({ params }: P) {
  const { c, o } = await achar(params);
  const mods = modalidades();
  const ano = Math.max(...c.anos);
  const atual = corteAmpla(o, ano), delta = variacao(o, ano);
  const linhas = Object.entries(o.cortes[String(ano)] ?? {}).sort(([a], [b]) => (a === "AC" ? -1 : b === "AC" ? 1 : a.localeCompare(b)));
  const hist = c.anos.map((a) => ({ ano: a, v: corteAmpla(o, a) }));
  const vs = hist.map((h) => h.v).filter((v): v is number => v != null);
  const piso = vs.length ? Math.floor(Math.min(...vs) / 50) * 50 - 50 : 0, teto = vs.length ? Math.max(...vs) : 1000;
  const iguais = PESOS.every(([k]) => o.pesos[k] === o.pesos.red);
  return (
    <div className="estreito">
      <a className="voltar" href={`/curso/${c.slug}/`}>‹ {c.curso}</a>
      <h1>{c.curso}</h1>
      <p className="sub">{o.ies_nome} · {o.campus} · {o.municipio}/{o.uf} · {o.turno} · {o.grau}</p>

      <section className="cartao">
        <p className="rotulo">Nota de corte · Sisu {ano} · ampla concorrência</p>
        <div className="figura">{atual == null ? "sem corte" : nota(atual)}</div>
        {delta != null && delta !== 0 && (
          <p style={{ margin: "10px 0 0" }}><span className={`pill ${delta > 0 ? "sobe" : "desce"}`}>{delta > 0 ? "▲" : "▼"} {nota(Math.abs(delta))} vs. {ano - 1}</span> <span className="miudo">chamada regular · MEC</span></p>
        )}
      </section>

      {(o.bonus_regional_pct ?? 0) > 0 && (
        <div className="aviso"><strong>Bônus regional de {o.bonus_regional_pct}%.</strong> Candidatos da região têm a nota multiplicada e disputam junto com a ampla, então este corte já inclui notas com bônus. Se você não tem direito ao bônus, compare com cuidado.</div>
      )}

      <section className="cartao">
        <h2>Cortes por modalidade · {ano}</h2>
        <table>
          <thead><tr><th>Modalidade</th><th className="n">Vagas</th><th className="n">Inscritos</th><th className="n">Corte</th></tr></thead>
          <tbody>
            {linhas.map(([m, v]) => (
              <tr key={m}><td title={mods[m]}>{nomeModalidade(m, mods[m])}</td><td className="n">{v.vagas ?? "—"}</td><td className="n">{v.inscritos?.toLocaleString("pt-BR") ?? "—"}</td><td className="n">{v.corte == null ? "sem corte" : nota(v.corte)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="miudo" style={{ margin: "10px 0 0" }}>“Sem corte”: a modalidade não teve candidatos suficientes para formar uma nota de corte.</p>
      </section>

      <section className="cartao">
        <h2>Últimas edições · ampla</h2>
        {hist.map((h) => (
          <div key={h.ano} className={`barra${h.ano === ano ? " atual" : ""}`}>
            <span>{h.ano}</span>
            <div className="trilho"><span style={{ width: h.v == null ? 0 : `${Math.max(4, ((h.v - piso) / (teto - piso)) * 100)}%` }} /></div>
            <span style={{ textAlign: "right" }}>{h.v == null ? "—" : nota(h.v)}</span>
          </div>
        ))}
      </section>

      <section className="cartao pesos">
        <h2>Pesos e notas mínimas</h2>
        {iguais && <p className="miudo" style={{ marginTop: -6 }}>Todas as áreas valem o mesmo: sua média aqui é a média simples.</p>}
        {PESOS.map(([k, nome]) => (
          <div key={k} className="peso"><span>{nome}</span><span>peso {o.pesos[k] ?? "—"}{(o.minimas[k] ?? 0) > 1 ? ` · mínimo ${nota(o.minimas[k])}` : ""}</span></div>
        ))}
        {(o.media_minima ?? 0) > 1 && <div className="peso"><span>Média mínima</span><span>{nota(o.media_minima)}</span></div>}
      </section>
    </div>
  );
}
