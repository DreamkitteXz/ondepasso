// Dados da calculadora (/calc.json). Roda só no build: uma linha compacta por opção com corte no último ano.
import { indice, curso } from "./dados";
import { cortesPorMod, nomesMods } from "./mapa";
import { slugOferta } from "./rotas";

/** Grupos de curso do filtro "área". A primeira regra que casar com o nome vale (Engenharia de Computação é engenharia). */
const GRUPOS: [string, RegExp][] = [
  ["Engenharias", /^(ABI - )?Engenharia/i],
  ["Saúde", /medicina|enfermagem|odontolog|farmácia|fisioterap|nutrição|biomedic|fonoaudiolog|terapia ocupacional|saúde|radiolog|psicolog|educação física|obstetríc|gerontolog|musicoterap/i],
  ["Computação e TI", /comput|sistemas? de informação|sistemas para internet|software|dados|informática|redes de|inteligência artificial|tecnologia da informação|cibersegurança|jogos digitais|telemática|desenvolvimento de sistemas/i],
  ["Negócios", /administra|contábe|econôm|gestão|marketing|finanças|logística|comércio|secretariado|atuaria|processos gerenciais|negócio|cooperativ|hotelaria|turismo/i],
  ["Direito e Humanas", /direito|história|filosof|sociais|sociolog|geografia|antropolog|arqueolog|ciência política|relações internacionais|serviço social|pedagog|humanidades|religi|museolog|arquivolog|biblioteconom|políticas públicas|educação/i],
  ["Letras, Artes e Comunicação", /letras|línguas|tradução|música|arte|teatro|dança|design|cinema|audiovisual|comunicação|jornalismo|publicidade|relações públicas|moda|fotografia|produção (cultural|multimídia|publicitária|editorial)|rádio|mídia|animação|cênic|gastronomia/i],
  ["Agrárias e Ambiente", /agro|agrí|agrár|zootecnia|florestal|pesca|aqui?cultura|alimentos|laticínios|ambiental|ambiente|ecolog|veterin|enologia|cafeicultura|fruticultura|apicultura|meteorolog|oceanog|geolog/i],
  ["Exatas e Biológicas", /matemát|física|químic|biolog|estatística|ciências|astronom|bioquímic|biotecnolog|nanotecnolog|geofísic/i],
];
export const grupoDe = (nome: string) => GRUPOS.find(([, re]) => re.test(nome))?.[0] ?? "Outros";
export const NOMES_GRUPOS = [...GRUPOS.map(([g]) => g), "Outros"];

/** Linha: [curso (índice), rota, sigla, cidade, UF, pesos red/lin/mat/ch/cn, mínimas (0 = sem), média mínima (0 = sem), cortes por modalidade] */
export type LinhaCalc = [number, string, string, string, string, number[], number[], number, Record<string, number>];
export type DadosCalc = { ano: number; cursos: { curso: string; slug: string; g: number }[]; grupos: string[]; mods: { cod: string; nome: string }[]; linhas: LinhaCalc[] };

const AREAS = ["red", "lin", "mat", "ch", "cn"] as const;
const mais1 = (v: number | null | undefined) => (v != null && v > 1 ? v : 0);

export function dadosCalc(): DadosCalc {
  const idx = indice();
  const ano = Math.max(...idx.anos);
  const cursos: DadosCalc["cursos"] = [];
  const linhas: LinhaCalc[] = [];
  const usadas = new Set<string>();
  for (const it of idx.cursos) {
    const c = curso(it.slug);
    const ci = cursos.push({ curso: c.curso, slug: c.slug, g: NOMES_GRUPOS.indexOf(grupoDe(c.curso)) }) - 1;
    for (const o of c.ofertas) {
      const m = cortesPorMod(o.cortes, ano);
      if (m.AC == null) continue;
      Object.keys(m).forEach((k) => usadas.add(k));
      linhas.push([ci, slugOferta(o), o.ies, o.municipio, o.uf, AREAS.map((a) => o.pesos[a] ?? 1), AREAS.map((a) => mais1(o.minimas[a])), mais1(o.media_minima), m]);
    }
  }
  return { ano, cursos, grupos: NOMES_GRUPOS, mods: nomesMods(usadas), linhas };
}
