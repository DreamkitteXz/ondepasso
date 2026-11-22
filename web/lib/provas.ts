// Leitura do acervo de provas no build (Server Components). Ver lib/provas-tipos.ts.
import fs from "node:fs";
import path from "node:path";
import type { Acervo, Exame, InfoVestibular, Prova } from "./provas-tipos";

let cache: Acervo | null = null;
export function acervo(): Acervo {
  if (!cache) {
    const pasta = path.join(process.cwd(), "..", "dados", "saida", "site");
    const enem = JSON.parse(fs.readFileSync(path.join(pasta, "provas.json"), "utf-8")) as Omit<Acervo, "exames" | "vestibulares">;
    // Outros vestibulares (pipeline/provas_vestibulares.py). Sem o arquivo, a biblioteca fica só com o Enem.
    let outros: { exames: Exame[]; vestibulares: InfoVestibular[] } = { exames: [], vestibulares: [] };
    try { outros = JSON.parse(fs.readFileSync(path.join(pasta, "vestibulares.json"), "utf-8")); } catch {}
    cache = { ...enem, exames: outros.exames, vestibulares: outros.vestibulares };
  }
  return cache;
}
export const provaPorId = (id: string): Prova | undefined => acervo().provas.find((p) => p.id === id);
export const examePorId = (id: string): Exame | undefined => acervo().exames.find((e) => e.id === id);
/** Outras provas do mesmo vestibular e edição. */
export const examesDaEdicao = (e: Exame): Exame[] => acervo().exames.filter((x) => x.id !== e.id && x.vestibular === e.vestibular && x.edicao === e.edicao);

/** Outros cadernos da mesma edição, aplicação e dia (links internos). */
export function irmas(p: Prova): Prova[] {
  return acervo().provas.filter((q) => q.id !== p.id && q.ano === p.ano && q.modalidade === p.modalidade && q.dia === p.dia);
}
/** O caderno de mesma cor e aplicação no outro dia (quando existe). */
export function outroDia(p: Prova): Prova | undefined {
  return acervo().provas.find((q) => q.ano === p.ano && q.modalidade === p.modalidade && q.dia !== p.dia && q.variante === p.variante && q.idioma == null && (p.variante ? true : q.cor === p.cor));
}
