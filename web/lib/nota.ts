"use client";
// A média e a modalidade do aluno ficam só no navegador (localStorage). Nada é enviado a servidor nenhum.
import { useSyncExternalStore } from "react";

/** Um valor guardado no localStorage, lido com useSyncExternalStore (no HTML estático vale `vazio`). */
function guardado<T>(chave: string, ler: (s: string | null) => T, escrever: (v: T) => string | null, vazio: T) {
  const evento = `ondepasso:${chave}`;
  let memoria: { v: T } | undefined;
  const lerAgora = () => { try { return ler(localStorage.getItem(`ondepasso.${chave}`)); } catch { return vazio; } };
  function salvar(v: T) {
    try {
      const s = escrever(v);
      if (s == null) localStorage.removeItem(`ondepasso.${chave}`); else localStorage.setItem(`ondepasso.${chave}`, s);
    } catch {}
    memoria = { v };
    window.dispatchEvent(new Event(evento));
  }
  function assinar(cb: () => void) {
    const f = () => { memoria = { v: lerAgora() }; cb(); };
    window.addEventListener(evento, cb);
    window.addEventListener("storage", f);
    return () => { window.removeEventListener(evento, cb); window.removeEventListener("storage", f); };
  }
  const atual = () => (memoria ??= { v: lerAgora() }).v;
  const useValor = () => useSyncExternalStore(assinar, atual, () => vazio);
  return { salvar, useValor };
}

const nota = guardado<number | null>("nota", (s) => { const v = Number(s); return s && Number.isFinite(v) && v > 0 ? v : null; }, (v) => (v == null ? null : String(v)), null);
/** Modalidade com que o aluno compara (a dele). Vale para a home, a lista e o detalhe; "AC" se nunca escolheu. */
const modalidade = guardado<string>("mod", (s) => (s && /^[A-Z0-9_]{1,12}$/.test(s) ? s : "AC"), (v) => (v === "AC" ? null : v), "AC");

/** Notas por área da calculadora (texto como digitado, para não reformatar enquanto a pessoa digita). */
export type Areas = Partial<Record<"red" | "lin" | "mat" | "ch" | "cn", string>>;
const areas = guardado<Areas>("areas", (s) => { try { const v = s ? JSON.parse(s) : {}; return v && typeof v === "object" ? v : {}; } catch { return {}; } }, (v) => (Object.values(v).some(Boolean) ? JSON.stringify(v) : null), {});
export const salvarAreas = areas.salvar;
export const useAreas = areas.useValor;

export const salvarNota = nota.salvar;
/** Média salva (ou null). No HTML estático é sempre null; o valor real entra depois que a página carrega. */
export const useNota = nota.useValor;
export const salvarMod = modalidade.salvar;
export const useMod = modalidade.useValor;
