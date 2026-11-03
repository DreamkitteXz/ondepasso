"use client";
import { useState } from "react";

/** Compartilha a página (menu nativo do celular) ou copia o link. */
export function Compartilhar({ titulo, url: fixa, rotulo = "Compartilhar" }: { titulo: string; url?: string; rotulo?: string }) {
  const [copiado, setCopiado] = useState(false);
  async function compartilhar() {
    const url = fixa ?? location.href.split("?")[0];
    try {
      if (navigator.share) return await navigator.share({ title: titulo, url });
      await navigator.clipboard.writeText(url);
      setCopiado(true); setTimeout(() => setCopiado(false), 2000);
    } catch {}
  }
  return (
    <button className="botao botao-contorno" onClick={compartilhar}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="m16 6-4-4-4 4" /><path d="M12 2v13" /></svg>
      <span aria-live="polite">{copiado ? "Link copiado" : rotulo}</span>
    </button>
  );
}
