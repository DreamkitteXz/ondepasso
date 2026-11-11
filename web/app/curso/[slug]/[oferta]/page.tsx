import { Manchete } from "@/components/Manchete";
import type { Metadata } from "next";
import { indice, curso, modalidades } from "@/lib/dados";
import { corteAmpla, variacao, nota, nomeModalidade, PESOS } from "@/lib/formato";
import { slugOferta, idDaRota } from "@/lib/rotas";
import { GEO, projetar } from "@/lib/mapa";
import { pesosCompactos } from "@/lib/minhas";
import { slugIes } from "@/lib/universidades";
import { DetalheOferta, type LinhaCota, type Local } from "@/components/DetalheOferta";

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

// Figma 03/03b (mobile) e W3/W3b (desktop): uma opção do curso, com a nota do aluno.
export default async function PaginaOferta({ params }: P) {
  const { c, o } = await achar(params);
  const descr = modalidades();
  const ano = Math.max(...c.anos);

  // Ampla primeiro; depois do maior corte para o menor; modalidades sem corte no fim.
  const cotas: LinhaCota[] = Object.entries(o.cortes[String(ano)] ?? {})
    .map(([cod, v]) => ({ cod, nome: nomeModalidade(cod, descr[cod]), titulo: descr[cod] ?? "", vagas: v.vagas, inscritos: v.inscritos, corte: v.corte }))
    .sort((a, b) => (a.cod === "AC" ? -1 : b.cod === "AC" ? 1 : (b.corte ?? -1) - (a.corte ?? -1)));

  const hist = c.anos.map((a) => ({ ano: a, v: corteAmpla(o, a) }));
  const vs = hist.map((h) => h.v).filter((v): v is number => v != null);
  const piso = vs.length ? Math.floor(Math.min(...vs) / 50) * 50 - 50 : 0, teto = vs.length ? Math.max(...vs) : 1000;

  const iguais = PESOS.every(([k]) => o.pesos[k] === o.pesos.red);
  const minimas = PESOS.filter(([k]) => (o.minimas[k] ?? 0) > 1).map(([k, n]) => ({ area: n, v: o.minimas[k]! }));
  const pesos = PESOS.map(([k, n]) => ({ area: n, peso: o.pesos[k], minima: (o.minimas[k] ?? 0) > 1 ? o.minimas[k] : null }));

  const est = GEO.ufs.find((u) => u.uf === o.uf);
  let local: Local | null = null;
  if (est) {
    const [x, y] = o.lat != null && o.lon != null ? projetar(o.lon, o.lat) : [null, null];
    local = { d: est.d, box: est.box as [number, number, number, number], x, y };
  }

  return (
    <div className="pagina-oferta">
      <a className="voltar" href={`/curso/${c.slug}/`}>‹ {c.curso}</a>
      <header className="oferta-cabecalho mov-topo">
        <p className="rotulo etiqueta"><span className="ponto" />Sisu {ano} · {o.ies} · {o.municipio}/{o.uf}</p>
        <Manchete texto={c.curso} estilo={{ ["--letras" as string]: Math.max(...c.curso.split(" ").map((x) => x.length), 7) }} />
        <p className="sub"><a className="link-uni" href={`/universidades/${slugIes(o.ies)}/`}>{o.ies_nome}</a>{" · " + [o.campus, `${o.municipio}/${o.uf}`, o.turno, o.grau].filter(Boolean).join(" · ")}</p>
      </header>
      {(() => {
        const ac = cotas.find((x) => x.cod === "AC");
        const porVaga = ac?.vagas && ac.inscritos ? ac.inscritos / ac.vagas : null;
        return (
          <div className="curso-fatos" aria-hidden="true">
            <div className="fato"><strong>{ac?.vagas != null ? ac.vagas.toLocaleString("pt-BR") : "—"}</strong><span>vagas na ampla em {ano}</span></div>
            <div className="fato"><strong>{ac?.inscritos != null ? ac.inscritos.toLocaleString("pt-BR") : "—"}</strong><span>inscritos na ampla</span></div>
            <div className="fato fato-ambar"><strong>{porVaga != null ? porVaga.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}</strong><span>inscritos por vaga na ampla</span></div>
            <div className="fato"><strong>{cotas.length}</strong><span>{cotas.length === 1 ? "modalidade com vagas" : "modalidades com vagas"}</span></div>
          </div>
        );
      })()}
      <DetalheOferta
        slug={c.slug} rota={slugOferta(o)} curso={c.curso} ies={o.ies} cidade={`${o.municipio}/${o.uf}`} ano={ano} turno={o.turno} grau={o.grau}
        atual={corteAmpla(o, ano)} delta={variacao(o, ano)} bonus={o.bonus_regional_pct ?? 0}
        cotas={cotas} hist={hist} piso={piso} teto={teto}
        iguais={iguais} minimas={minimas} pesos={pesos} mediaMinima={(o.media_minima ?? 0) > 1 ? o.media_minima : null}
        local={local} peso={pesosCompactos(o)}
      />
    </div>
  );
}
