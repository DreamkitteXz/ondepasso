import { indice } from "@/lib/dados";
import { GEO, dadosMapa } from "@/lib/mapa";
import { BuscaCursos, LinhaCurso } from "@/components/BuscaCursos";
import { MapaInicio } from "@/components/MapaInicio";

// Atalhos do mapa e "mais procurados": lista editorial fixa até termos analytics.
const POPULARES = ["medicina", "direito", "psicologia", "enfermagem", "engenharia-civil", "odontologia", "ciencia-da-computacao", "medicina-veterinaria"];

export default function Inicio() {
  const { cursos, anos } = indice();
  const ano = Math.max(...anos);
  const slim = cursos.map(({ curso, slug, ofertas, ampla_min, ampla_max }) => ({ curso, slug, ofertas, ampla_min, ampla_max }));
  const populares = POPULARES.map((s) => slim.find((c) => c.slug === s)).filter((c): c is (typeof slim)[number] => !!c);
  return (
    <MapaInicio
      geo={GEO}
      inicial={dadosMapa("medicina")}
      atalhos={populares.slice(0, 5).map(({ curso, slug }) => ({ curso, slug }))}
      topo={
        <>
          <p className="rotulo">Sisu {ano} · notas de corte</p>
          <h1>Quanto você precisa tirar, e onde?</h1>
          <p className="sub">Notas de corte de {cursos.length} cursos em todas as universidades do Sisu, por cota e por ano. Sem cadastro.</p>
          <BuscaCursos cursos={slim} atalhos={[]} ano={ano} />
        </>
      }
      lista={
        <section className="cartao lista">
          <div className="cabeca"><h2 style={{ margin: 0 }}>Mais procurados</h2><span className="miudo">Sisu {ano} · ampla concorrência</span></div>
          {populares.map((c) => <LinhaCurso key={c.slug} c={c} ano={ano} />)}
        </section>
      }
    />
  );
}
