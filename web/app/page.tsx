import { ComoFunciona } from "@/components/ComoFunciona";
import { indice } from "@/lib/dados";
import { GEO, dadosMapa, maisDisputados } from "@/lib/mapa";
import { MapaInicio } from "@/components/MapaInicio";

// Chips do mapa (Figma 01a: Medicina, Direito, Psicologia; no desktop W1 entram mais dois).
const ATALHOS = [
  { slug: "medicina" }, { slug: "direito" }, { slug: "psicologia" },
  { slug: "enfermagem", soDesktop: true }, { slug: "engenharia-civil", soDesktop: true },
];

export default function Inicio() {
  const { cursos, anos } = indice();
  const ano = Math.max(...anos);
  const slim = cursos.map(({ curso, slug, ofertas, ampla_min, ampla_max }) => ({ curso, slug, ofertas, ampla_min, ampla_max }));
  const atalhos = ATALHOS.map((a) => ({ ...a, curso: cursos.find((c) => c.slug === a.slug)!.curso }));
  const disputados = maisDisputados(["medicina", "direito", "psicologia"]).map(({ curso, slug, r, i, c, m }) => ({ curso, slug, r, i, c, m: { AC: m.AC } }));
  return (
    <MapaInicio
      geo={GEO}
      inicial={dadosMapa("medicina")}
      atalhos={atalhos}
      disputados={disputados}
      cursos={slim}
      anoBusca={ano}
      topo={
        <>
          <p className="rotulo">Para o Sisu {ano + 1} · cortes de {ano}</p>
          <h1>Quanto você precisa tirar, e onde?</h1>
          <p className="sub so-desktop">Notas de corte de {cursos.length} cursos em todas as universidades do Sisu, por cota e por ano. Sem cadastro.</p>
          <ComoFunciona />
        </>
      }
    />
  );
}
