const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** /curso/medicina/ufmg-12970/ — sigla para SEO, id do MEC para ser único. */
export const slugOferta = (o: { ies: string; id: string }) => `${slug(o.ies)}-${o.id}`;
export const idDaRota = (s: string) => s.split("-").pop()!;
