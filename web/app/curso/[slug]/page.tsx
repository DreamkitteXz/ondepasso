import type { Metadata } from "next";
import { indice, curso } from "@/lib/dados";
import { corteAmpla, variacao, nota } from "@/lib/formato";
import { slugOferta } from "@/lib/rotas";
import { cortesPorMod, nomesMods, projetar } from "@/lib/mapa";
import { ListaCurso, IconeMapa, type ItemCurso } from "@/components/ListaCurso";
import { Compartilhar } from "@/components/Compartilhar";

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
      campus: o.campus, grau: o.grau, delta: variacao(o, ano), temMapa,
    };
  });
  const ufs = new Set(c.ofertas.map((o) => o.uf)).size;
  return (
    <div className="pagina-curso">
      <a className="voltar" href="/">‹ Início</a>
      <div className="curso-cabecalho">
        <div>
          <p className="rotulo">Sisu {ano} · ampla concorrência</p>
          <h1>{c.curso}</h1>
          <p className="sub">
            {c.ofertas.length} {c.ofertas.length === 1 ? "opção" : "opções"} em {ufs} {ufs === 1 ? "estado" : "estados"}.
            {cortes.length > 0 && <> O corte da ampla vai de <strong>{nota(Math.min(...cortes))}</strong> a <strong>{nota(Math.max(...cortes))}</strong>.</>}
          </p>
        </div>
        <div className="curso-acoes so-desktop">
          <a className="botao botao-contorno" href={`/?curso=${c.slug}`}><IconeMapa /> Ver no mapa</a>
          <Compartilhar titulo={`Nota de corte de ${c.curso} no Sisu ${ano}`} />
        </div>
      </div>
      <ListaCurso slug={c.slug} curso={c.curso} ano={ano} itens={itens} mods={nomesMods(usadas)} />
    </div>
  );
}
