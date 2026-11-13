import type { Metadata } from "next";
import "../provas.css";
import { acervo } from "@/lib/provas";
import { SITE } from "@/lib/site";
import { tituloProva } from "@/lib/provas-tipos";
import { ExamLibrary } from "@/components/provas/ExamLibrary";
import { Manchete } from "@/components/Manchete";
import { agrupar, dataBr as dataBrasil, tituloExame } from "@/lib/provas-tipos";

export const metadata: Metadata = {
  title: "Provas anteriores do Enem, da Fuvest e da Unicamp com gabarito",
  description: "Provas oficiais do Enem (2021 a 2025) para ler online ou baixar em PDF, com gabarito do Inep, e o catálogo das provas da Fuvest e da Unicamp (ingresso de 2022 a 2026), 1ª e 2ª fases, com gabaritos e respostas esperadas oficiais.",
  alternates: { canonical: "/provas/" },
  openGraph: { title: "Provas anteriores do Enem, da Fuvest e da Unicamp · onde passo", description: "Leia as provas oficiais do Enem como um caderno de verdade, com gabarito, e encontre as da Fuvest e da Unicamp por edição, fase e versão.", url: `${SITE}/provas/` },
};

const dataBr = (iso: string) => iso.split("-").reverse().join("/");

export default function PaginaProvas() {
  const { provas, anos, verificadoEm, fonte, extras, exames, vestibulares } = acervo();
  const catalogados = vestibulares.filter((v) => v.estado === "catalogado");
  const pendentes = vestibulares.filter((v) => v.estado === "pendente");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage", name: "Provas anteriores do Enem, da Fuvest e da Unicamp", url: `${SITE}/provas/`, inLanguage: "pt-BR",
        description: metadata.description, isAccessibleForFree: true,
        mainEntity: { "@type": "ItemList", numberOfItems: provas.length + exames.length, itemListElement: [...provas.map((p) => ({ id: p.id, nome: tituloProva(p) })), ...exames.map((e) => ({ id: e.id, nome: tituloExame(e) }))].map((x, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/provas/${x.id}/`, name: x.nome })) },
      },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "onde passo", item: `${SITE}/` }, { "@type": "ListItem", position: 2, name: "Provas anteriores", item: `${SITE}/provas/` }] },
    ],
  };
  return (
    <div className="pagina-provas">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="provas-topo mov-topo">
        <p className="rotulo etiqueta"><span className="ponto" />Provas oficiais · Enem{catalogados.map((v) => ` · ${v.nome}`).join("")}</p>
        <Manchete texto={catalogados.length ? "Provas anteriores" : "Provas do Enem"} destaque={1} />
        <p>As provas oficiais do Enem de {anos[anos.length - 1]} a {anos[0]}, direto do Inep. Leia aqui, folheando como um caderno, ou baixe o PDF. O gabarito acompanha a cor do caderno que você escolher.{catalogados.map((v) => ` As provas da ${v.nome} (ingresso de ${Math.min(...(v.edicoes ?? []))} a ${Math.max(...(v.edicoes ?? []))}) estão no catálogo, com link para o site oficial.`).join("")}</p>
      </header>
      <div className="curso-fatos" aria-hidden="true">
        <div className="fato"><strong data-conta={agrupar(provas).length}>{agrupar(provas).length}</strong><span>provas do Enem, uma por dia de aplicação</span></div>
        <div className="fato"><strong data-conta={provas.length}>{provas.length}</strong><span>cadernos, de todas as cores</span></div>
        {exames.length > 0
          ? <div className="fato"><strong data-conta={exames.length}>{exames.length}</strong><span>provas da {catalogados.map((v) => v.nome).join(" e ")}, 1ª e 2ª fases</span></div>
          : <div className="fato"><strong data-conta={anos.length}>{anos.length}</strong><span>edições, de {anos[anos.length - 1]} a {anos[0]}</span></div>}
        <div className="fato fato-verde"><strong data-conta={provas.filter((p) => p.gabarito).length}>{provas.filter((p) => p.gabarito).length}</strong><span>com gabarito oficial do Inep</span></div>
      </div>

      <ExamLibrary provas={provas} exames={exames} vestibulares={vestibulares} />

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
        {catalogados.map((v) => (
          <p key={v.id}>
            <strong>{v.nome}.</strong> O catálogo lista o que a <a href={v.acervo} target="_blank" rel="noopener">página oficial do acervo</a> publica para as edições de {Math.min(...(v.edicoes ?? []))} a {Math.max(...(v.edicoes ?? []))} (ano de ingresso): cadernos de todas as versões, gabaritos e respostas esperadas{v.coletadoEm ? `, como estavam em ${dataBrasil(v.coletadoEm)}` : ""}.
            Esses arquivos abrem no site oficial: {v.motivoAcesso?.charAt(0).toLowerCase()}{v.motivoAcesso?.slice(1)} Simulados e provas de habilidades específicas ficaram de fora.
          </p>
        ))}
        {pendentes.map((v) => <p key={v.id} className="miudo"><strong>{v.nome}.</strong> {v.pendencia}</p>)}
        {extras.length > 0 && (
          <p className="miudo">Temas da redação publicados à parte: {extras.map((e, i) => <span key={e.url}>{i > 0 ? " · " : ""}<a href={e.url} target="_blank" rel="noopener">{e.rotulo} {e.ano}</a></span>)}.</p>
        )}
      </section>
    </div>
  );
}
