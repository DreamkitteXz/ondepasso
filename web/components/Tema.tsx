"use client";
// Botão de tema da Topbar: alterna claro/escuro e lembra a escolha (só no navegador).
export function BotaoTema() {
  function trocar() {
    const el = document.documentElement;
    const escuroAgora = el.dataset.tema ? el.dataset.tema === "escuro" : !matchMedia("(prefers-color-scheme: light)").matches;
    const novo = escuroAgora ? "claro" : "escuro";
    el.dataset.tema = novo;
    try { localStorage.setItem("ondepasso.tema", novo); } catch {}
  }
  return (
    <button className="tema" onClick={trocar} aria-label="Trocar tema claro/escuro" title="Trocar tema">
      <svg width="18" height="18" viewBox="8 8 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M17 9.5V11M17 23v1.5M11.7 11.7l1.06 1.06M21.25 21.25l1.05 1.05M9.5 17H11M23 17h1.5M12.76 21.25l-1.06 1.05M22.3 11.7l-1.05 1.06" />
      </svg>
    </button>
  );
}

/** Roda antes da pintura, para não piscar o tema errado. */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem("ondepasso.tema");if(t)document.documentElement.dataset.tema=t}catch(e){}`;
