"use client";
// Termo com explicação: toque ou clique no "?" para ler o que significa. Fecha com Esc, tocando fora ou no próprio botão.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { GLOSSARIO, type TermoId } from "@/lib/glossario";

export function Termo({ id, children }: { id: TermoId; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const dica = useId();
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);
  const g = GLOSSARIO[id];
  return (
    <span className="termo" ref={ref}>
      {children}
      <button type="button" className="termo-botao" aria-expanded={aberto} aria-controls={dica} aria-label={`O que é ${g.titulo.toLowerCase()}?`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAberto((a) => !a); }}>?</button>
      {aberto && <span className="termo-dica" id={dica} role="note"><strong>{g.titulo}</strong>{g.texto}</span>}
    </span>
  );
}
