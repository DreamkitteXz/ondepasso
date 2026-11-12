// Dados do relatório (/relatorio.json). Roda só no build. As linhas seguem a MESMA ordem das de /calc.json
// (mesmo laço de lib/calc.ts), para o navegador juntar as duas pelo índice.
import fs from "node:fs";
import path from "node:path";
import { indice, curso } from "./dados";
import { MODS } from "./mapa";
import type { DadosRelatorio, LinhaRel, Qualidade } from "./relatorio";

/** Opcional: dados/saida/site/qualidade.json, { "<id da oferta>": { enade, cpc, igc, ano } }, gerado pelo pipeline do Inep. */
function qualidade(): Record<string, Qualidade> {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "..", "dados", "saida", "site", "qualidade.json"), "utf-8")); } catch { return {}; }
}

export function dadosRelatorio(): DadosRelatorio {
  const idx = indice();
  const ano = Math.max(...idx.anos);
  const anosAntes = idx.anos.filter((a) => a < ano).sort((a, b) => a - b);
  const q = qualidade();
  const linhas: LinhaRel[] = [];
  for (const it of idx.cursos) {
    for (const o of curso(it.slug).ofertas) {
      const doAno = o.cortes[String(ano)] ?? {};
      const antes: LinhaRel[4] = {}; const conc: LinhaRel[5] = {};
      for (const cod of MODS) {
        if (doAno[cod]?.corte == null) continue;
        const h = anosAntes.map((a) => o.cortes[String(a)]?.[cod]?.corte ?? null);
        if (h.some((v) => v != null)) antes[cod] = h;
        conc[cod] = [doAno[cod].vagas ?? 0, doAno[cod].inscritos ?? 0];
      }
      const linha: LinhaRel = [o.turno, o.grau, o.categoria, o.bonus_regional_pct ?? 0, antes, conc];
      if (q[o.id]) linha.push(q[o.id]);
      linhas.push(linha);
    }
  }
  return { ano, anosAntes, linhas };
}
