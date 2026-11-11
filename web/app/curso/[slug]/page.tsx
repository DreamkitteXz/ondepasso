import type { Metadata } from "next";
import { indice, curso } from "@/lib/dados";
import { corteAmpla, variacao, nota } from "@/lib/formato";
import { slugOferta } from "@/lib/rotas";
import { pesosCompactos } from "@/lib/minhas";
import { cortesPorMod, nomesMods, projetar } from "@/lib/mapa";
import { ListaCurso, type ItemCurso } from "@/components/ListaCurso";
import { Compartilhar } from "@/components/Compartilhar";
import { Manchete, SetaBotao } from "@/components/Manchete";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return indice().cursos.map((c) => ({ slug: c.slug })); }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = curso((await params).slug); const ano = Math.max(...c.anos);
  return { title: `Nota de corte de ${c.curso} no Sisu ${ano}`, description: `Notas de corte de ${c.curso} em ${c.ofertas.length} opções do Sisu ${ano}, por universidade, cota e ano.`, alternates: { canonical: `/curso/${c.slug}/` } };
}

// Figma 02 (mobile) / W2 (desktop): lista de universidades do curso com a nota do aluno.
export default async function PaginaCurso({ params }: P) {
  const c = curso((await params).slug);
  const ano = Math.max(...c.anos);
  const cortes = c.ofertas.map((o) => corteAmpla(o, ano)).filter((v): v is number => v != null);
  const usadas = new Set<string>();
  const itens: ItemCurso[] = c.ofertas.map((o) => {
    const m = cortesPorMod(o.cortes, ano); Object.keys(m).forEach((k) => usadas.add(k));
    const temMapa = o.lat != null && o.lon != null;
    const [x, y] = temMapa ? projetar(o.lon!, o.lat!) : [0, 0];
    return {
      r: slugOferta(o), i: o.ies, c: o.municipio, u: o.uf, x: +x.toFixed(1), y: +y.toFixed(1), t: o.turno,
      n: o.cortes[String(ano)]?.AC?.inscritos ?? 0, m, ...((o.bonus_regional_pct ?? 0) > 0 ? { b: 1 as const } : {}),
      ...pesosCompactos(o), campus: o.campus, grau: o.grau, delta: variacao(o, ano), temMapa,
    };
  });
  const ufs = new Set(c.ofertas.map((o) => o.uf)).size;
  return (
    <div className="pagina-curso">
      <a className="voltar" href="/">‹ Início</a>
      <div className="curso-cabecalho">
        <div className="mov-topo">
          <p className="rotulo etiqueta"><span className="ponto" />Sisu {ano} · ampla concorrência</p>
          <Manchete texto={c.curso} estilo={{ ["--letras" as string]: Math.max(...c.curso.split(" ").map((p) => p.length), 7) }} />
          <p className="sub sub-leitor">
            {c.ofertas.length} {c.ofertas.length === 1 ? "opção" : "opções"} em {ufs} {ufs === 1 ? "estado" : "estados"}.
            {cortes.length > 0 && <> O corte da ampla vai de {nota(Math.min(...cortes))} a {nota(Math.max(...cortes))}.</>}
          </p>
        </div>
        <div className="curso-acoes so-desktop">
          <a className="botao botao-pilula botao-ima" href={`/?curso=${c.slug}`}>Ver no mapa<SetaBotao /></a>
          <Compartilhar titulo={`Nota de corte de ${c.curso} no Sisu ${ano}`} />
        </div>
      </div>
      <div className="curso-fatos" aria-hidden="true">
        <div className="fato"><strong data-conta={c.ofertas.length}>{c.ofertas.length}</strong><span>{c.ofertas.length === 1 ? "opção no Sisu" : "opções no Sisu"} {ano}</span></div>
        <div className="fato"><strong data-conta={ufs}>{ufs}</strong><span>{ufs === 1 ? "estado" : "estados"}</span></div>
        {cortes.length > 0 && <>
          <div className="fato fato-min"><strong data-conta={Math.min(...cortes)} data-dec="2">{nota(Math.min(...cortes))}</strong><span>menor corte da ampla</span></div>
          <div className="fato fato-max"><strong data-conta={Math.max(...cortes)} data-dec="2">{nota(Math.max(...cortes))}</strong><span>maior corte da ampla</span></div>
        </>}
      </div>
      <ListaCurso slug={c.slug} curso={c.curso} ano={ano} itens={itens} mods={nomesMods(usadas)} />
    </div>
  );
}
