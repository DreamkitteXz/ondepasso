// /relatorio.json: histórico, vagas e inscritos por opção, para o relatório. Gerado no build; baixado só em /relatorio/.
import { dadosRelatorio } from "@/lib/relatorio-dados";

export const dynamic = "force-static";
export function GET() { return Response.json(dadosRelatorio()); }
