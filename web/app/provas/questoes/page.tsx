import type { Metadata } from "next";
import "../../provas.css";
import { acervo } from "@/lib/provas";
import { SITE } from "@/lib/site";
import { agrupar, questoesDoGrupo } from "@/lib/provas-tipos";
import { Manchete } from "@/components/Manchete";
import { QuestionBank } from "@/components/provas/QuestionBank";

export const metadata: Metadata = {
  title: "Questões do Enem por ano e área, com resposta oficial",
  description: "Todas as questões das provas oficiais do Enem de 2021 a 2025, por ano, aplicação e área. Cada questão abre recortada do caderno oficial do Inep, com a resposta escondida até você pedir.",
  alternates: { canonical: "/provas/questoes/" },
  openGraph: { title: "Questões do Enem · onde passo", description: "Estude o Enem questão por questão, direto do caderno oficial do Inep.", url: `${SITE}/provas/questoes/` },
};

export default function PaginaQuestoes() {
  const { provas, anos, fonte } = acervo();
  const grupos = agrupar(provas);
  const total = grupos.reduce((s, g) => s + questoesDoGrupo(g).length, 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: "Questões do Enem", url: `${SITE}/provas/questoes/`, inLanguage: "pt-BR", description: metadata.description, isAccessibleForFree: true },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "onde passo", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Provas anteriores", item: `${SITE}/provas/` },
        { "@type": "ListItem", position: 3, name: "Questões do Enem", item: `${SITE}/provas/questoes/` },
      ] },
    ],
  };
  return (
    <div className="pagina-provas pagina-questoes">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="migalhas" aria-label="Você está em"><a href="/provas/">Provas anteriores</a> <span aria-hidden="true">›</span> <span>Questões do Enem</span></nav>
      <header className="provas-topo mov-topo">
        <p className="rotulo etiqueta"><span className="ponto" />Enem {anos[anos.length - 1]} a {anos[0]} · questão por questão</p>
        <Manchete texto="Questões do Enem" destaque={1} />
        <p>
          Escolha o ano, a área ou o que você marcou para revisar, e abra a questão direto do caderno oficial do Inep, com a resposta escondida até você pedir.
          Para não repetir, cada aplicação aparece pelo caderno de menor número; nas outras cores, as mesmas questões vêm em outra ordem.
        </p>
      </header>
      <div className="curso-fatos" aria-hidden="true">
        <div className="fato"><strong data-conta={total}>{total.toLocaleString("pt-BR")}</strong><span>questões, em {grupos.length} provas</span></div>
        <div className="fato"><strong data-conta={anos.length}>{anos.length}</strong><span>edições, de {anos[anos.length - 1]} a {anos[0]}</span></div>
        <div className="fato fato-verde"><strong>4</strong><span>áreas do conhecimento</span></div>
      </div>

      <QuestionBank grupos={grupos} anos={anos} />

      <section className="provas-fonte" aria-labelledby="t-fonte-q">
        <h2 id="t-fonte-q">Como as questões são mostradas</h2>
        <p>
          Cada questão é um recorte do <a href={fonte} target="_blank" rel="noopener">PDF oficial do Inep</a>, feito no seu navegador na hora em que você abre: o onde passo não guarda cópias.
          A separação é automática; se num caderno ela não encontrar exatamente as questões da prova, o leitor avisa e você lê pelo caderno completo.
          O que você marca para revisar e as respostas que já viu ficam só neste navegador. A classificação por disciplina e assunto ainda está em preparação.
          Conteúdo do Inep sob a licença Creative Commons Atribuição-SemDerivações 3.0.
        </p>
      </section>
    </div>
  );
}
