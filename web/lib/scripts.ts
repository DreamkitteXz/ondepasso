// Scripts que rodam antes da pintura (inline no <head>). Ficam fora de arquivos "use client":
// uma constante exportada de um módulo de cliente não chega como texto ao layout (que é do servidor).

/** Tema: aplica a escolha guardada, para não piscar o tema errado. */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem("ondepasso.tema");if(t)document.documentElement.dataset.tema=t}catch(e){}`;

/** Movimento: liga .mov só para quem aceita movimento; se o JS da página falhar, solta tudo em 3 s. */
export const SCRIPT_MOV = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches){var h=document.documentElement;h.classList.add("mov");setTimeout(function(){h.classList.add("mov-pronto")},3000)}}catch(e){}`;
