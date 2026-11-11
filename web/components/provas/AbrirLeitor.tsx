"use client";
// Na página da prova, o leitor só baixa a biblioteca de PDF e o arquivo quando a pessoa pede (ou chega com #ler):
// economiza dados no celular e mantém a página leve para o Google.
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Prova } from "@/lib/provas-tipos";
import { megas } from "@/lib/provas-tipos";
import type { ProvaLeitor } from "./leitor/ExamReader";

const ExamReader = dynamic(() => import("./leitor/ExamReader"), {
  ssr: false,
  loading: () => (
    <div className="leitor leitor-preparando" role="status">
      <div className="leitor-carregando"><div className="livro-esqueleto" aria-hidden="true"><div className="esq-pagina"><i /><i /><i className="curta" /></div><div className="esq-pagina"><i /><i className="curta" /><i /></div></div><p>Preparando o leitor…</p></div>
    </div>
  ),
});

export function AbrirLeitor({ p, leitor }: { p: Prova; leitor: ProvaLeitor }) {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const ver = () => { if (location.hash === "#ler") setAberto(true); };
    ver();
    window.addEventListener("hashchange", ver);
    return () => window.removeEventListener("hashchange", ver);
  }, []);
  useEffect(() => {
    if (!aberto) return;
    // O leitor cobre a janela inteira; nada para rolar.
  }, [aberto]);

  return (
    <section id="leitor" className="leitor-ancora" aria-label="Leitor da prova">
      {aberto && <ExamReader prova={leitor} aoFechar={() => { setAberto(false); history.replaceState(null, "", location.pathname + location.search); }} />}
      {(
        <div className="leitor-convite">
          <div className="convite-livro" aria-hidden="true" style={{ ["--cor-caderno" as string]: p.corHex }}>
            <div className="convite-pagina esq"><i /><i /><i className="curta" /><i /><i /><i className="curta" /></div>
            <div className="convite-pagina dir"><i /><i className="curta" /><i /><i /><i /><i className="curta" /></div>
            <div className="convite-dobra" />
          </div>
          <div className="convite-texto">
            <h2>Folheie a prova aqui</h2>
            <p>O leitor abre em tela inteira. Vire as páginas como num caderno ou leia rolando, dê zoom, vá direto a uma questão e confira o gabarito.</p>
            <button type="button" className="botao botao-pilula botao-ima" onClick={() => { setAberto(true); history.replaceState(null, "", "#ler"); }}>Abrir a prova<span className="botao-ic" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10 10 4M5 4h5v5" /></svg></span></button>
            <p className="miudo">PDF oficial do Inep · {megas(p.prova.bytes)}. Nada é baixado antes de você abrir.</p>
          </div>
        </div>
      )}
    </section>
  );
}
