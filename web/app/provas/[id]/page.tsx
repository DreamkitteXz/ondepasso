import { Manchete, SetaBotao } from "@/components/Manchete";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../provas.css";
import { acervo, irmas, outroDia, provaPorId } from "@/lib/provas";
import { SITE } from "@/lib/site";
import { AREA_QUESTOES, AREA_ROTULO, IDIOMA_ROTULO, VARIANTE_ROTULO, descricaoProva, diaRotulo, megas, tituloProva } from "@/lib/provas-tipos";
import { ExamCover } from "@/components/provas/ExamCover";
import { AbrirLeitor } from "@/components/provas/AbrirLeitor";
import { AnswerKeyViewer } from "@/components/provas/leitor/AnswerKeyViewer";
import { BotaoSalvar, LinkBaixar } from "@/components/provas/AcoesProva";

export const dynamicParams = false;
export function generateStaticParams() {
  return acervo().provas.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = provaPorId((await params).id);
  if (!p) return {};
  const titulo = `Prova ${tituloProva(p)}${p.modalidade !== "regular" ? ` (${p.modalidadeRotulo})` : ""}: PDF e gabarito`;
  return {
    title: titulo,
    description: descricaoProva(p),
    alternates: { canonical: `/provas/${p.id}/` },
    openGraph: { title: titulo, description: descricaoProva(p), url: `${SITE}/provas/${p.id}/`, type: "article" },
  };
}

export default async function PaginaProva({ params }: { params: Promise<{ id: string }> }) {
  const p = provaPorId((await params).id);
  if (!p) notFound();
  const titulo = tituloProva(p);
  const identificacao = `Enem ${p.ano} · ${diaRotulo(p.dia)} · Caderno ${p.caderno} ${p.corRotulo}${p.variante ? ` (${VARIANTE_ROTULO[p.variante]})` : ""}${p.idioma ? ` · ${IDIOMA_ROTULO[p.idioma]}` : ""} · ${p.modalidadeRotulo}`;
  const areas = p.areas.map((a) => AREA_ROTULO[a]);
  const outras = irmas(p);
  const par = outroDia(p);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource", name: `Prova ${titulo}`, url: `${SITE}/provas/${p.id}/`, inLanguage: "pt-BR", isAccessibleForFree: true,
        description: descricaoProva(p), learningResourceType: "Prova", educationalLevel: "Ensino médio", about: areas,
        dateCreated: String(p.ano), creator: { "@type": "GovernmentOrganization", name: "Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira (Inep)", url: "https://www.gov.br/inep" },
        license: "https://creativecommons.org/licenses/by-nd/3.0/deed.pt",
        encoding: [{ "@type": "MediaObject", encodingFormat: "application/pdf", contentUrl: p.prova.url, contentSize: `${p.prova.bytes} B` }],
        ...(p.gabarito ? { hasPart: { "@type": "CreativeWork", name: `Gabarito ${titulo}`, encoding: { "@type": "MediaObject", encodingFormat: "application/pdf", contentUrl: p.gabarito.url } } } : {}),
      },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Provas anteriores", item: `${SITE}/provas/` },
        { "@type": "ListItem", position: 2, name: `Enem ${p.ano}`, item: `${SITE}/provas/?ano=${p.ano}` },
        { "@type": "ListItem", position: 3, name: titulo, item: `${SITE}/provas/${p.id}/` },
      ] },
    ],
  };
  const leitor = {
    id: p.id, titulo: `Enem ${p.ano} · ${diaRotulo(p.dia)}`, subtitulo: `Caderno ${p.caderno} ${p.corRotulo}${p.idioma ? ` · ${IDIOMA_ROTULO[p.idioma]}` : ""}${p.modalidade !== "regular" ? ` · ${p.modalidadeRotulo}` : ""}`,
    identificacao, dia: p.dia, idioma: p.idioma, areas: p.areas, prova: p.prova, gabarito: p.gabarito,
  };

  return (
    <div className="pagina-prova">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="migalhas" aria-label="Você está em">
        <a href="/provas/">Provas anteriores</a> <span aria-hidden="true">›</span> <a href={`/provas/?ano=${p.ano}`}>Enem {p.ano}</a>
      </nav>

      <header className="prova-cabecalho mov-topo" style={{ ["--cor-caderno" as string]: p.corHex }}>
        <ExamCover p={p} tamanho="grande" />
        <div>
          <p className="rotulo etiqueta"><span className="ponto" style={{ background: p.corHex }} />{p.modalidadeRotulo} · Caderno {p.corRotulo}</p>
          <Manchete texto={`Prova do Enem ${p.ano} · ${diaRotulo(p.dia)}`} destaque={2} />
          <p className="sub">Caderno {p.caderno} {p.corRotulo}{p.variante ? ` (${VARIANTE_ROTULO[p.variante]})` : ""}{p.idioma ? ` · ${IDIOMA_ROTULO[p.idioma]}` : ""}. {areas.join(" e ")}{p.redacao ? " + Redação" : ""}.</p>
          <ul className="prova-fatos">
            <li><span>Questões</span><strong>{p.questoes}{p.redacao ? " + redação" : ""}</strong></li>
            <li><span>Numeração</span><strong>{p.areas.map((a) => AREA_QUESTOES[a].join("–")).join(" · ")}</strong></li>
            <li><span>Gabarito</span><strong>{p.gabarito ? "Oficial, disponível" : "Indisponível no Inep"}</strong></li>
            <li><span>Arquivo</span><strong>PDF · {megas(p.prova.bytes)}</strong></li>
          </ul>
          <div className="prova-acoes">
            <a className="botao botao-pilula botao-ima" href="#ler">Abrir a prova<SetaBotao /></a>
            <LinkBaixar provaId={p.id} url={p.prova.url} rotulo={`Baixar PDF (${megas(p.prova.bytes)})`} />
            <BotaoSalvar id={p.id} />
          </div>
        </div>
      </header>

      <AbrirLeitor p={p} leitor={leitor} />

      <div className="prova-grade">
        <section aria-labelledby="t-gab">
          <h2 id="t-gab" className="sr-only">Gabarito</h2>
          <AnswerKeyViewer provaId={p.id} identificacao={identificacao} dia={p.dia} idioma={p.idioma} gabarito={p.gabarito} />
        </section>

        {p.versoes.length > 0 && (
          <section className="prova-versoes" aria-labelledby="t-versoes">
            <h2 id="t-versoes">Versões acessíveis</h2>
            <p className="miudo">Publicadas pelo Inep para atendimento especializado. Os arquivos para leitor de tela (NVDA) e o texto para DOSVOX funcionam melhor que as páginas desenhadas.</p>
            <ul>
              {p.versoes.map((v) => (
                <li key={v.url}><a href={v.url} target="_blank" rel="noopener">{v.rotulo}</a> <span className="miudo">{v.formato.toUpperCase()} · {megas(v.bytes)}</span></li>
              ))}
            </ul>
          </section>
        )}

        <section className="prova-outras" aria-labelledby="t-outras">
          <h2 id="t-outras">Outros cadernos do {diaRotulo(p.dia)} de {p.ano}</h2>
          <ul>
            {outras.map((q) => (
              <li key={q.id}><a href={`/provas/${q.id}/`}><span className="bolinha" style={{ background: q.corHex }} aria-hidden="true" />Caderno {q.caderno} {q.corRotulo}{q.variante ? ` (${VARIANTE_ROTULO[q.variante]})` : ""}{q.idioma ? ` · ${IDIOMA_ROTULO[q.idioma]}` : ""}</a></li>
            ))}
          </ul>
          {par && <p><a className="link-seta" href={`/provas/${par.id}/`}>No {diaRotulo(par.dia)}: Caderno {par.caderno} {par.corRotulo} →</a></p>}
        </section>

        <section className="prova-origem" aria-labelledby="t-origem">
          <h2 id="t-origem">Fonte</h2>
          <p>Arquivo oficial do Inep, aberto direto de <code>download.inep.gov.br</code>. Link conferido em {acervo().verificadoEm.split("-").reverse().join("/")}. <a href={p.fonte} target="_blank" rel="noopener">Página oficial de provas e gabaritos</a>.</p>
          <p className="miudo">Conteúdo do Inep sob licença Creative Commons Atribuição-SemDerivações 3.0. O onde passo não é afiliado ao Inep.</p>
        </section>
      </div>
    </div>
  );
}
