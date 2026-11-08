"use client";
// Na página da prova, o leitor só baixa a biblioteca de PDF e o arquivo quando a pessoa pede (ou chega com #ler):
// economiza dados no celular e mantém a página leve para o Google.
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Prova } from "@/lib/provas-tipos";
import { megas } from "@/lib/provas-tipos";
import type { ProvaLeitor } from "./leitor/ExamReader";
import { ExamCover } from "./ExamCover";

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
    document.getElementById("leitor")?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [aberto]);

  return (
    <section id="leitor" className="leitor-ancora" aria-label="Leitor da prova">
      {aberto ? <ExamReader prova={leitor} /> : (
        <div className="leitor-convite">
          <div className="convite-livro" aria-hidden="true"><ExamCover p={p} tamanho="grande" /><div className="convite-folhas" /></div>
          <div className="convite-texto">
            <h2>Folheie a prova aqui</h2>
            <p>Vire as páginas como num caderno de verdade, ou leia rolando. Dá para dar zoom, ir direto a uma questão, marcar páginas e conferir o gabarito.</p>
            <button type="button" className="botao" onClick={() => { setAberto(true); history.replaceState(null, "", "#ler"); }}>Abrir no leitor</button>
            <p className="miudo">PDF oficial do Inep · {megas(p.prova.bytes)}. Nada é baixado antes de você abrir.</p>
          </div>
        </div>
      )}
    </section>
  );
}
