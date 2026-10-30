"use client";
// A média do aluno fica só no navegador (localStorage). Nada é enviado a servidor nenhum.
import { useSyncExternalStore } from "react";

const CHAVE = "ondepasso.nota";
const EVENTO = "ondepasso:nota";

function ler(): number | null {
  try {
    const v = Number(localStorage.getItem(CHAVE));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function salvarNota(v: number | null) {
  try {
    if (v == null) localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, String(v));
  } catch {}
  memoria = v;
  window.dispatchEvent(new Event(EVENTO));
}

let memoria: number | null | undefined;
function assinar(cb: () => void) {
  const f = () => { memoria = ler(); cb(); };
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", f);
  return () => { window.removeEventListener(EVENTO, cb); window.removeEventListener("storage", f); };
}
const atual = () => (memoria === undefined ? (memoria = ler()) : memoria);

/** Média salva (ou null). No HTML estático é sempre null; o valor real entra depois que a página carrega. */
export function useNota() {
  return useSyncExternalStore(assinar, atual, () => null);
}
