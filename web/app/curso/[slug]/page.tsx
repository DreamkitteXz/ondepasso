import type { Metadata } from "next";
import { indice, curso } from "@/lib/dados";
import { corteAmpla, variacao, nota } from "@/lib/formato";
import { slugOferta } from "@/lib/rotas";
import { ListaOfertas } from "@/components/ListaOfertas";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return indice().cursos.map((c) => ({ slug: c.slug })); }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = curso((await params).slug); const ano = Math.max(...c.anos);
  return { title: `Nota de corte de ${c.curso} no Sisu ${ano}`, description: `Notas de corte de ${c.curso} em ${c.ofertas.length} opções do Sisu ${ano}, por universidade, cota e ano.` };
}

export default async function PaginaCurso({ params }: P) {
  const c = curso((await params).slug);
  const ano = Math.max(...c.anos);
  const cortes = c.ofertas.map((o) => corteAmpla(o, ano)).filter((v): v is number => v != null);
  const itens = c.ofertas.map((o) => ({
    rota: slugOferta(o), ies: o.ies, campus: o.campus, municipio: o.municipio, uf: o.uf, turno: o.turno, grau: o.grau,
    corte: corteAmpla(o, ano), delta: variacao(o, ano), bonus: (o.bonus_regional_pct ?? 0) > 0,
  }));
  const ufs = new Set(c.ofertas.map((o) => o.uf)).size;
  return (
    <>
      <a className="voltar" href="/">‹ Buscar</a>
      <p className="rotulo">Sisu {ano} · ampla concorrência</p>
      <h1>{c.curso}</h1>
      <p className="sub">
        {c.ofertas.length} {c.ofertas.length === 1 ? "opção" : "opções"} em {ufs} {ufs === 1 ? "estado" : "estados"}.
        {cortes.length > 0 && <> O corte da ampla vai de <strong>{nota(Math.min(...cortes))}</strong> a <strong>{nota(Math.max(...cortes))}</strong>.</>}
      </p>
      <ListaOfertas itens={itens} cursoSlug={c.slug} ano={ano} />
    </>
  );
}
