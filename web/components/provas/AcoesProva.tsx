"use client";
// Pequenas ações da página da prova que precisam do navegador (medição e "salvar para depois").
import { useSyncExternalStore } from "react";
import { registrar } from "@/lib/analytics";
import { alternarFavorita, lerFavoritas } from "@/lib/leitor/preferencias";

export function LinkBaixar({ provaId, url, rotulo }: { provaId: string; url: string; rotulo: string }) {
  return (
    <a className="botao botao-contorno" href={url} target="_blank" rel="noopener" download
      onClick={() => registrar("enem_pdf_baixado", { prova: provaId, arquivo: "prova", origem: "pagina" })}>{rotulo}</a>
  );
}

const assinar = (cb: () => void) => { window.addEventListener("ondepasso:favoritas", cb); window.addEventListener("storage", cb); return () => { window.removeEventListener("ondepasso:favoritas", cb); window.removeEventListener("storage", cb); }; };

export function BotaoSalvar({ id }: { id: string }) {
  const salva = useSyncExternalStore(assinar, () => lerFavoritas().includes(id), () => false);
  return (
    <button type="button" className={`botao botao-contorno${salva ? " ativo" : ""}`} aria-pressed={salva} onClick={() => alternarFavorita(id)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={salva ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
      {salva ? "Salva" : "Salvar"}
    </button>
  );
}
