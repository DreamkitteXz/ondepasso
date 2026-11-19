import type { Metadata } from "next";
import { nota } from "@/lib/formato";
import { contorno, modsDe, universidade, universidades } from "@/lib/universidades";
import { faixaCortes, propria, proprias } from "@/lib/vestibular-proprio";
import { PaginaUniversidade } from "@/components/PaginaUniversidade";
import { PaginaVestibularProprio } from "@/components/PaginaVestibularProprio";

type P = { params: Promise<{ sigla: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return [...universidades().lista.map((u) => ({ sigla: u.slug })), ...proprias().map((u) => ({ sigla: u.slug }))];
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = (await params).sigla;
  const p = propria(s);
  if (p) {
    const ed = p.vestibular.edicao; const f = faixaCortes(p, p.modalidades[0].cod);
    const vest = p.vestibular.nome.replace(/ \(.*\)$/, "");
    return {
      title: `${p.sigla}: cursos, vagas e notas de corte do ${vest} ${ed}`,
      description: `${p.nome}: ${p.cursos.length} cursos, ${p.ingresso[0].vagas.toLocaleString("pt-BR")} vagas no ${vest} ${ed}${f ? `, com corte da 1ª fase de ${f.min} a ${f.max} acertos` : ""}. Campi, formas de ingresso, cotas e calendário.`,
      alternates: { canonical: `/universidades/${p.slug}/` },
      ...(p.fotos[0] ? { openGraph: { images: [p.fotos[0].src] } } : {}),
    };
  }
  const u = universidade(s); const { ano } = universidades();
  return {
    title: `${u.sigla}: cursos e notas de corte no Sisu ${ano}`,
    description: `${u.nome}: ${u.cursos.length} opções no Sisu ${ano}${u.min != null ? `, com corte da ampla de ${nota(u.min)} a ${nota(u.max)}` : ""}. Campi, cursos e notas de corte por cota.`,
    alternates: { canonical: `/universidades/${u.slug}/` },
    ...(u.fotos[0] ? { openGraph: { images: [u.fotos[0].src] } } : {}),
  };
}

// Figma "UFMG · Universidade · Mobile" e W6b. USP e Unicamp (fora do Sisu) usam o mesmo esqueleto, com os cortes do vestibular próprio.
export default async function PaginaDaUniversidade({ params }: P) {
  const s = (await params).sigla;
  const p = propria(s);
  if (p) return <PaginaVestibularProprio u={p} contorno={contorno(p)} />;
  const u = universidade(s);
  return <PaginaUniversidade u={u} ano={universidades().ano} mods={modsDe(u)} contorno={contorno(u)} />;
}
