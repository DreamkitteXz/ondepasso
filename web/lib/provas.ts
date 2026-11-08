// Leitura do acervo de provas no build (Server Components). Ver lib/provas-tipos.ts.
import fs from "node:fs";
import path from "node:path";
import type { Acervo, Prova } from "./provas-tipos";

let cache: Acervo | null = null;
export function acervo(): Acervo {
  if (!cache) cache = JSON.parse(fs.readFileSync(path.join(process.cwd(), "..", "dados", "saida", "site", "provas.json"), "utf-8")) as Acervo;
  return cache;
}
export const provaPorId = (id: string): Prova | undefined => acervo().provas.find((p) => p.id === id);

/** Outros cadernos da mesma edição, aplicação e dia (links internos). */
export function irmas(p: Prova): Prova[] {
  return acervo().provas.filter((q) => q.id !== p.id && q.ano === p.ano && q.modalidade === p.modalidade && q.dia === p.dia);
}
/** O caderno de mesma cor e aplicação no outro dia (quando existe). */
export function outroDia(p: Prova): Prova | undefined {
  return acervo().provas.find((q) => q.ano === p.ano && q.modalidade === p.modalidade && q.dia !== p.dia && q.variante === p.variante && q.idioma == null && (p.variante ? true : q.cor === p.cor));
}
