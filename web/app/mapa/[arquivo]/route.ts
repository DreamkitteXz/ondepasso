// Gera /mapa/<curso>.json no build (site estático): o mapa da home baixa só o curso escolhido.
import { indice } from "@/lib/dados";
import { dadosMapa } from "@/lib/mapa";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() {
  return indice().cursos.map((c) => ({ arquivo: `${c.slug}.json` }));
}

export async function GET(_: Request, { params }: { params: Promise<{ arquivo: string }> }) {
  const slug = (await params).arquivo.replace(/\.json$/, "");
  return Response.json(dadosMapa(slug));
}
