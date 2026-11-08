import type { Metadata } from "next";
import "../provas.css";
import { acervo } from "@/lib/provas";
import { SITE } from "@/lib/site";
import { tituloProva } from "@/lib/provas-tipos";
import { ExamLibrary } from "@/components/provas/ExamLibrary";

export const metadata: Metadata = {
  title: "Provas anteriores do Enem (2021 a 2025) com gabarito",
  description: "Provas oficiais do Enem de 2021 a 2025 para ler online ou baixar em PDF, com gabarito oficial do Inep. Filtre por ano, dia, área, cor do caderno e aplicação.",
  alternates: { canonical: "/provas/" },
  openGraph: { title: "Provas anteriores do Enem · onde passo", description: "Leia as provas oficiais do Enem como um caderno de verdade, com gabarito.", url: `${SITE}/provas/` },
};

const dataBr = (iso: string) => iso.split("-").reverse().join("/");

export default function PaginaProvas() {
  const { provas, anos, verificadoEm, fonte, extras } = acervo();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage", name: "Provas anteriores do Enem", url: `${SITE}/provas/`, inLanguage: "pt-BR",
        description: metadata.description, isAccessibleForFree: true,
        mainEntity: { "@type": "ItemList", numberOfItems: provas.length, itemListElement: provas.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/provas/${p.id}/`, name: tituloProva(p) })) },
      },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "onde passo", item: `${SITE}/` }, { "@type": "ListItem", position: 2, name: "Provas anteriores", item: `${SITE}/provas/` }] },
    ],
  };
  return (
    <div className="pagina-provas">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="provas-topo">
        <h1>Provas do Enem</h1>
        <p>As provas oficiais de {anos[anos.length - 1]} a {anos[0]}, direto do Inep. Leia aqui, folheando como um caderno, ou baixe o PDF. O gabarito acompanha a cor do caderno que você escolher.</p>
      </header>

      <ExamLibrary provas={provas} />

      <section className="provas-sobre" aria-labelledby="t-sobre">
        <h2 id="t-sobre">Como é a prova do Enem</h2>
        <div className="provas-sobre-grade">
          <div>
            <h3>1º dia</h3>
            <p>Linguagens (questões 1 a 45, com 1 a 5 em inglês ou espanhol), Ciências Humanas (46 a 90) e Redação.</p>
          </div>
          <div>
            <h3>2º dia</h3>
            <p>Ciências da Natureza (91 a 135) e Matemática (136 a 180).</p>
          </div>
          <div>
            <h3>Cores dos cadernos</h3>
            <p>Cada dia tem quatro cores com as mesmas questões em ordem diferente. Por isso o gabarito é de um caderno específico: confira sempre a cor e o dia.</p>
          </div>
          <div>
            <h3>Acertos não são nota</h3>
            <p>A nota do Enem usa a Teoria de Resposta ao Item (TRI). Contar acertos ajuda a estudar, mas não dá a sua nota oficial.</p>
          </div>
        </div>
      </section>

      <section className="provas-fonte" aria-labelledby="t-fonte">
        <h2 id="t-fonte">De onde vêm as provas</h2>
        <p>
          Os PDFs são os arquivos oficiais da página <a href={fonte} target="_blank" rel="noopener">Provas e Gabaritos do Inep</a>, abertos direto do servidor do Inep (o onde passo não guarda cópias).
          Cada link foi conferido em {dataBr(verificadoEm)}; quando um arquivo oficial está fora do ar, ele aparece como indisponível. O conteúdo do portal do Inep é publicado sob a licença Creative Commons Atribuição-SemDerivações 3.0.
        </p>
        {extras.length > 0 && (
          <p className="miudo">Temas da redação publicados à parte: {extras.map((e, i) => <span key={e.url}>{i > 0 ? " · " : ""}<a href={e.url} target="_blank" rel="noopener">{e.rotulo} {e.ano}</a></span>)}.</p>
        )}
      </section>
    </div>
  );
}
