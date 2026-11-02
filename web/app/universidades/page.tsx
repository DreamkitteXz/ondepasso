import type { Metadata } from "next";
import { GEO } from "@/lib/mapa";
import { resumoUniversidades, universidades } from "@/lib/universidades";
import { ListaUniversidades } from "@/components/ListaUniversidades";

export const metadata: Metadata = {
  title: "Universidades no Sisu: cursos, campi e notas de corte",
  description: "Todas as instituições públicas do Sisu, por estado: cursos, campi e a faixa das notas de corte de cada uma.",
  alternates: { canonical: "/universidades/" },
};

// Figma 06a (mobile) / W6a (desktop).
export default function PaginaUniversidades() {
  const { ano, lista } = universidades();
  const estados = [...GEO.ufs].map((g) => ({ uf: g.uf, nome: g.nome })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return (
    <div className="pagina-unis">
      <header className="calc-cabecalho">
        <p className="rotulo">Universidades</p>
        <h1>Universidades no Sisu</h1>
        <p className="sub">{lista.length} instituições públicas com cursos no Sisu {ano}. Escolha uma para ver todos os cursos, campi e cortes.</p>
      </header>
      <ListaUniversidades unis={resumoUniversidades()} estados={estados} />
    </div>
  );
}
