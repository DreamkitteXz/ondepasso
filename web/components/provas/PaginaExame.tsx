// Página de uma prova de outro vestibular (Fuvest, Unicamp): tudo o que o acervo oficial publica para ela,
// com link para o arquivo oficial. Não há leitor: o servidor oficial não libera a leitura dentro de outros sites.
import { Manchete } from "@/components/Manchete";
import type { Exame, InfoVestibular } from "@/lib/provas-tipos";
import { DISPONIBILIDADE_ROTULO, VESTIBULAR_ROTULO, dataBr, descricaoExame, gabaritoDaVersao, hostDe as host, resumoExame, rotuloExame, tituloExame } from "@/lib/provas-tipos";
import { SITE } from "@/lib/site";
import { BotaoSalvar } from "@/components/provas/AcoesProva";
import { LinkOficial } from "@/components/provas/ExameCard";

const NOME_LACUNA: Record<string, string> = { prova: "Caderno de prova", gabarito: "Gabarito", "respostas-esperadas": "Respostas esperadas", "redacao-abordagem": "Abordagem da redação", criterios: "Critérios de correção", outro: "Documento" };

export function PaginaExame({ e, info, outras }: { e: Exame; info: InfoVestibular | undefined; outras: Exame[] }) {
  const titulo = tituloExame(e);
  const nome = VESTIBULAR_ROTULO[e.vestibular];
  const varias = e.versoes.length > 1;
  const gabaritos = e.complementares.filter((c) => c.tipo === "gabarito");
  const outros = e.complementares.filter((c) => c.tipo !== "gabarito");
  const coleta = e.versoes[0]?.prova.procedencia.coletadoEm ?? info?.coletadoEm;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "LearningResource", name: `Prova ${titulo}`, url: `${SITE}/provas/${e.id}/`, inLanguage: "pt-BR", isAccessibleForFree: true, description: descricaoExame(e),
        learningResourceType: "Prova", educationalLevel: "Ensino médio", isBasedOn: e.fonte, ...(e.dataAplicacao ? { dateCreated: e.dataAplicacao } : {}) },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Provas anteriores", item: `${SITE}/provas/` },
        { "@type": "ListItem", position: 2, name: `${nome} ${e.edicao}`, item: `${SITE}/provas/?vestibular=${e.vestibular}&ano=${e.edicao}` },
        { "@type": "ListItem", position: 3, name: titulo, item: `${SITE}/provas/${e.id}/` },
      ] },
    ],
  };
  return (
    <div className="pagina-prova pagina-exame">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="migalhas" aria-label="Você está em">
        <a href="/provas/">Provas anteriores</a> <span aria-hidden="true">›</span> <a href={`/provas/?vestibular=${e.vestibular}&ano=${e.edicao}`}>{nome} {e.edicao}</a>
      </nav>

      <header className="prova-cabecalho exame-cabecalho mov-topo">
        <div>
          <p className="rotulo etiqueta"><span className="ponto" />{nome} · ingresso em {e.edicao}</p>
          <Manchete texto={`${nome} ${e.edicao} · ${rotuloExame(e)}`} destaque={2} />
          <p className="sub">{resumoExame(e)}</p>
          <ul className="prova-fatos">
            <li><span>Edição</span><strong>Ingresso em {e.edicao}</strong></li>
            <li><span>Aplicação</span><strong>{e.dataAplicacao ? dataBr(e.dataAplicacao) : "Data não conferida"}</strong></li>
            <li><span>Cadernos</span><strong>{varias ? `${e.versoes.length} versões (${e.versoes.map((v) => v.codigo).join(", ")})` : e.versoes.length ? "Versão única" : "Não encontrado"}</strong></li>
            <li><span>{e.tipoQuestoes === "discursiva" ? "Respostas esperadas" : "Gabarito"}</span><strong>{(e.tipoQuestoes === "discursiva" ? outros.some((c) => c.tipo === "respostas-esperadas") : gabaritos.length > 0) ? "Oficial, disponível" : "Não encontrado no acervo"}</strong></li>
          </ul>
          <div className="prova-acoes"><BotaoSalvar id={e.id} /></div>
        </div>
      </header>

      <p className="exame-aviso">
        <strong>Estes arquivos abrem no site da {nome}.</strong> {info?.motivoAcesso ?? "O servidor oficial não libera a leitura dentro de outros sites."} Por isso esta prova ainda não tem o leitor nem a leitura por questão do onde passo.
      </p>

      <div className="prova-grade">
        <section className="exame-bloco" aria-labelledby="t-cadernos">
          <h2 id="t-cadernos">{varias ? "Cadernos de prova" : "Caderno de prova"}</h2>
          {varias && <p className="miudo">As versões trazem as mesmas questões em ordens diferentes. Abra a versão que você fez (ou qualquer uma, para estudar) e use a coluna dela no gabarito.</p>}
          {e.versoes.length === 0 ? <p className="exame-falta">Caderno de prova: {DISPONIBILIDADE_ROTULO["nao-encontrado"]}.</p> : (
            <ul className="exame-lista">
              {e.versoes.map((v) => {
                const g = gabaritoDaVersao(e, v.codigo);
                return (
                  <li key={v.codigo}>
                    <LinkOficial d={v.prova} exame={e.id} className="botao botao-contorno">{varias ? `Prova ${v.codigo}` : "Abrir a prova"}</LinkOficial>
                    {varias && g && <span className="miudo">Gabarito: {g.versoes === "todas" ? `coluna ${v.codigo} do gabarito oficial` : g.rotulo}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="exame-bloco" aria-labelledby="t-resp">
          <h2 id="t-resp">Gabarito e respostas</h2>
          {gabaritos.length + outros.length === 0 && e.lacunas.length === 0 && <p className="miudo">Nenhum documento complementar no acervo oficial.</p>}
          <ul className="exame-lista">
            {[...gabaritos, ...outros].map((c) => (
              <li key={c.url + c.rotulo}>
                <LinkOficial d={c} exame={e.id} className="botao botao-contorno">{c.rotulo}</LinkOficial>
                {c.retificadoEm && <span className="miudo">Retificado em {dataBr(c.retificadoEm)}</span>}
                {c.escopo === "fase" && <span className="miudo">Um documento só para os dois dias da 2ª fase</span>}
              </li>
            ))}
            {e.lacunas.filter((l) => l.tipo !== "prova").map((l) => <li key={l.tipo} className="exame-falta">{NOME_LACUNA[l.tipo]}: {DISPONIBILIDADE_ROTULO[l.estado]}. <span className="miudo">{l.nota}</span></li>)}
          </ul>
          {e.tipoQuestoes === "discursiva" && <p className="miudo">Prova discursiva: não existe gabarito de alternativas. {e.redacao ? "Na redação não há resposta certa; a banca publica a abordagem esperada." : ""}</p>}
        </section>

        {outras.length > 0 && (
          <section className="prova-outras" aria-labelledby="t-outras">
            <h2 id="t-outras">Outras provas da {nome} {e.edicao}</h2>
            <ul>{outras.map((x) => <li key={x.id}><a href={`/provas/${x.id}/`}>{rotuloExame(x)}</a></li>)}</ul>
          </section>
        )}

        <section className="prova-origem" aria-labelledby="t-origem">
          <h2 id="t-origem">Fonte</h2>
          <p>Links da <a href={e.fonte} target="_blank" rel="noopener">página oficial do acervo da {nome} {e.edicao}</a> ({host(e.fonte)}){coleta ? `, como estavam em ${dataBr(coleta)}` : ""}. O onde passo não guarda cópia dos arquivos nem é afiliado à {nome}.</p>
          <p className="miudo">Os links foram transcritos da página oficial; os arquivos ainda não foram conferidos um a um. Se algum não abrir, use a página do acervo.</p>
        </section>
      </div>
    </div>
  );
}
