import type { MetadataRoute } from "next";
import { indice, curso } from "@/lib/dados";
import { slugOferta } from "@/lib/rotas";

export const dynamic = "force-static";
import { SITE } from "@/lib/site";

/** Home, ~670 cursos e ~6.900 páginas curso × universidade (abaixo do limite de 50 mil URLs por sitemap). */
export default function sitemap(): MetadataRoute.Sitemap {
  const { cursos, atualizado } = indice();
  const lastModified = new Date(atualizado);
  return [
    { url: `${SITE}/`, lastModified, priority: 1 },
    ...cursos.flatMap((c) => [
      { url: `${SITE}/curso/${c.slug}/`, lastModified, priority: 0.8 },
      ...curso(c.slug).ofertas.map((o) => ({ url: `${SITE}/curso/${c.slug}/${slugOferta(o)}/`, lastModified, priority: 0.6 })),
    ]),
  ];
}
