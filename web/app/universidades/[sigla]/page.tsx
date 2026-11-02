import type { Metadata } from "next";
import { nota } from "@/lib/formato";
import { contorno, modsDe, universidade, universidades } from "@/lib/universidades";
import { PaginaUniversidade } from "@/components/PaginaUniversidade";

type P = { params: Promise<{ sigla: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return universidades().lista.map((u) => ({ sigla: u.slug })); }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const u = universidade((await params).sigla); const { ano } = universidades();
  return {
    title: `${u.sigla}: cursos e notas de corte no Sisu ${ano}`,
    description: `${u.nome}: ${u.cursos.length} opções no Sisu ${ano}${u.min != null ? `, com corte da ampla de ${nota(u.min)} a ${nota(u.max)}` : ""}. Campi, cursos e notas de corte por cota.`,
    alternates: { canonical: `/universidades/${u.slug}/` },
    ...(u.fotos[0] ? { openGraph: { images: [u.fotos[0].src] } } : {}),
  };
}

// Figma "UFMG · Universidade · Mobile" e W6b.
export default async function PaginaDaUniversidade({ params }: P) {
  const u = universidade((await params).sigla);
  return <PaginaUniversidade u={u} ano={universidades().ano} mods={modsDe(u)} contorno={contorno(u)} />;
}
