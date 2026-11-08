import type { MetadataRoute } from "next";
import { indice, curso } from "@/lib/dados";
import { slugOferta } from "@/lib/rotas";
import { universidades } from "@/lib/universidades";
import { acervo } from "@/lib/provas";

export const dynamic = "force-static";
import { SITE } from "@/lib/site";

/** Home, ~670 cursos, ~6.900 páginas curso × universidade e ~150 provas (abaixo do limite de 50 mil URLs por sitemap). */
export default function sitemap(): MetadataRoute.Sitemap {
  const { cursos, atualizado } = indice();
  const lastModified = new Date(atualizado);
  return [
    { url: `${SITE}/`, lastModified, priority: 1 },
    { url: `${SITE}/calcular/`, lastModified, priority: 0.9 },
    { url: `${SITE}/sobre-dados/`, priority: 0.5 },
    { url: `${SITE}/privacidade/`, priority: 0.3 },
    { url: `${SITE}/ao-vivo/`, priority: 0.5 },
    { url: `${SITE}/universidades/`, lastModified, priority: 0.9 },
    { url: `${SITE}/provas/`, lastModified: new Date(acervo().verificadoEm), priority: 0.9 },
    ...acervo().provas.map((p) => ({ url: `${SITE}/provas/${p.id}/`, lastModified: new Date(acervo().verificadoEm), priority: p.modalidade === "regular" ? 0.7 : 0.5 })),
    ...universidades().lista.map((u) => ({ url: `${SITE}/universidades/${u.slug}/`, lastModified, priority: 0.7 })),
    ...cursos.flatMap((c) => [
      { url: `${SITE}/curso/${c.slug}/`, lastModified, priority: 0.8 },
      ...curso(c.slug).ofertas.map((o) => ({ url: `${SITE}/curso/${c.slug}/${slugOferta(o)}/`, lastModified, priority: 0.6 })),
    ]),
  ];
}
