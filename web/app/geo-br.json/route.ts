// Contornos dos estados para o minimapa da página do curso (baixado só no desktop, quando a lateral aparece).
import { GEO } from "@/lib/mapa";
export const dynamic = "force-static";
export function GET() { return Response.json(GEO); }
