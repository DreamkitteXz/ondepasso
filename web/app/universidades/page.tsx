import type { Metadata } from "next";
import { GEO } from "@/lib/mapa";
import { resumoUniversidades, universidades } from "@/lib/universidades";
import { ListaUniversidades } from "@/components/ListaUniversidades";
import { Manchete } from "@/components/Manchete";

export const metadata: Metadata = {
  title: "Universidades no Sisu: cursos, campi e notas de corte",
  description: "Todas as instituições públicas do Sisu, por estado: cursos, campi e a faixa das notas de corte de cada uma.",
  alternates: { canonical: "/universidades/" },
};

// Figma 06a (mobile) / W6a (desktop).
export default function PaginaUniversidades() {
  const { ano, lista } = universidades();
  const estados = [...GEO.ufs].map((g) => ({ uf: g.uf, nome: g.nome })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const unis = resumoUniversidades();
  const nUfs = new Set(unis.flatMap((u) => u.ufs)).size;
  const opcoes = unis.reduce((t, u) => t + u.ofertas, 0);
  const federais = unis.filter((u) => u.tipo === "Pública federal").length;
  const geo = { w: GEO.w, h: GEO.h, ufs: GEO.ufs.map((g) => ({ uf: g.uf, nome: g.nome, d: g.d })) };
  return (
    <div className="pagina-unis">
      <header className="unis-cabecalho mov-topo">
        <p className="rotulo etiqueta"><span className="ponto" />Universidades · Sisu {ano}</p>
        <Manchete texto="Universidades no Sisu" destaque={2} />
        <p className="sub">{lista.length} instituições públicas com cursos no Sisu {ano}. Escolha uma para ver todos os cursos, campi e cortes.</p>
      </header>
      <div className="curso-fatos" aria-hidden="true">
        <div className="fato"><strong data-conta={lista.length}>{lista.length}</strong><span>instituições públicas</span></div>
        <div className="fato"><strong data-conta={nUfs}>{nUfs}</strong><span>estados e DF</span></div>
        <div className="fato fato-verde"><strong data-conta={opcoes} data-mil="1">{opcoes.toLocaleString("pt-BR")}</strong><span>opções de curso no Sisu {ano}</span></div>
        <div className="fato"><strong data-conta={federais}>{federais}</strong><span>federais · {lista.length - federais} estaduais e municipais</span></div>
      </div>
      <ListaUniversidades unis={unis} estados={estados} geo={geo} />
    </div>
  );
}
