// /calc.json: tudo o que a calculadora precisa, gerado no build e baixado só quando a página abre.
import { dadosCalc } from "@/lib/calc";

export const dynamic = "force-static";
export function GET() { return Response.json(dadosCalc()); }
