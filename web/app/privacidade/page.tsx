import type { Metadata } from "next";
import { PreferenciasCookies } from "@/components/Analytics";
import { ANUNCIOS_ATIVO } from "@/lib/anuncios";

export const metadata: Metadata = {
  title: "Privacidade e cookies",
  description: "O que o onde passo guarda no seu navegador, o que mede (só com a sua permissão) e o que nunca é enviado.",
  alternates: { canonical: "/privacidade/" },
};

// O GA4 só existe quando o build tem NEXT_PUBLIC_GA_ID (ver web/ANALYTICS.md); os anúncios, quando tem o AdSense
// configurado (ver web/ANUNCIOS.md). O texto acompanha o que está ligado.
const MEDICAO = /^G-[A-Z0-9]{4,20}$/.test((process.env.NEXT_PUBLIC_GA_ID ?? "").trim());
const ANUNCIOS = ANUNCIOS_ATIVO;

export default function Privacidade() {
  return <article className="pagina-informativa">
    <h1>Privacidade e cookies</h1>
    <p className="sub">Resumo: suas notas do Enem ficam só no seu aparelho. {MEDICAO && ANUNCIOS ? "Medimos visitas com o Google Analytics e mostramos anúncios do Google apenas se você permitir." : MEDICAO ? "Medimos visitas com o Google Analytics apenas se você permitir." : ANUNCIOS ? "Mostramos anúncios do Google apenas se você permitir." : "O site não usa cookies de medição."}</p>

    <section className="cartao estado-comparacao">
      <h2>O que fica no seu navegador</h2>
      <p>As notas e a modalidade que você informa, o tema (claro ou escuro){MEDICAO || ANUNCIOS ? " e a sua escolha sobre cookies" : ""} ficam no armazenamento local do navegador. Os cálculos acontecem no seu aparelho e as notas não são enviadas a nenhum servidor, nosso ou de terceiros. Você pode apagá-las pela opção “apagar minhas notas” ou limpando os dados do site no navegador.</p>
      <p>Na biblioteca de provas, também ficam só no navegador: as provas que você salva, as páginas marcadas, as questões marcadas para revisar, a última página lida e as preferências do leitor (modo, animação e som).</p>
    </section>

    <section className="cartao estado-comparacao">
      <h2>Provas abertas direto do Inep</h2>
      <p>Quando você abre uma prova ou um gabarito no leitor, o PDF é baixado direto do servidor oficial do Inep (download.inep.gov.br), como aconteceria ao clicar no link do site do Inep. Por isso o Inep recebe o pedido do arquivo (com o endereço de conexão, como em qualquer site). Nada é baixado antes de você abrir o leitor.</p>
    </section>

    {MEDICAO ? <>
      <section className="cartao estado-comparacao">
        <h2>Medição de visitas (Google Analytics 4)</h2>
        <p>Se você clicar em “Permitir” no aviso de cookies, usamos o Google Analytics 4 para entender quantas pessoas usam o site, de onde elas chegam (por exemplo, TikTok, Instagram, Google ou um link de campanha) e quais partes ajudam mais. Antes da sua permissão, o script do Google não é carregado e nenhum cookie de medição é gravado.</p>
        <p>Com a permissão, são enviados: as páginas visitadas, o site ou o link de campanha de origem, tipo de aparelho e navegador, região aproximada (calculada pelo Google a partir da conexão) e algumas ações no site, como começar a preencher a nota, escolher um curso (qual curso), pedir e ver a comparação, erros de carregamento ou de preenchimento e, na biblioteca de provas, qual prova foi aberta, filtros usados, viradas de página (primeira, metade e fim), troca de modo de leitura, abertura do gabarito e downloads.</p>
        <p><strong>Nunca são enviados:</strong> suas notas do Enem, sua média, a modalidade de cota, nome, e-mail, CPF ou qualquer texto que você digite. O Google Analytics 4 não guarda endereços IP.</p>
        {ANUNCIOS
          ? <p>O Google Analytics não é usado para publicidade: o Google Signals e os sinais de personalização de anúncios ficam desligados, e os dados de medição não são usados para remarketing. Os anúncios são tratados à parte, abaixo, com permissão própria.</p>
          : <p>Não usamos recursos de publicidade: o Google Signals e a personalização de anúncios ficam desligados, e os dados não são usados para remarketing.</p>}
      </section>
    </> : null}

    {ANUNCIOS && (
      <section className="cartao estado-comparacao">
        <h2>Anúncios (Google AdSense)</h2>
        <p>Os anúncios ajudam a manter o onde passo grátis. Eles aparecem só no espaço reservado das páginas (o cartão ao lado dos resultados), nunca no meio das notas de corte e nunca dentro do leitor de provas.</p>
        <p>Só mostramos anúncios a quem permite “Anúncios” no aviso de cookies. Antes disso, o script do Google AdSense não é carregado e nenhum cookie de publicidade é gravado; no lugar do anúncio aparece o convite para compartilhar o site.</p>
        <p>Com a permissão, o Google e seus parceiros usam cookies e identificadores do aparelho para escolher, mostrar e medir os anúncios, evitar fraudes e, se for o caso, personalizá-los com base nas suas visitas a este e a outros sites. Para isso o Google recebe dados técnicos, como o endereço de conexão, o aparelho, o navegador e a página em que o anúncio aparece, e os trata conforme as próprias políticas: veja <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">como o Google usa informações de sites que usam os serviços dele</a>. Você pode desligar a personalização na <a href="https://myadcenter.google.com/" target="_blank" rel="noopener">Minha Central de Anúncios do Google</a>.</p>
        <p><strong>Nunca são enviados</strong> ao Google para anúncios: suas notas do Enem, sua média, a modalidade de cota ou qualquer texto que você digite.</p>
      </section>
    )}

    {MEDICAO || ANUNCIOS ? <>
      <section className="cartao estado-comparacao">
        <h2>Cookies usados</h2>
        {MEDICAO && <p><code>_ga</code> e <code>_ga_…</code> (Google Analytics, do próprio domínio ondepasso.com.br): distinguem visitas de forma pseudônima, sem identificar você. Duram até 2 anos e são apagados se você recusar ou retirar a permissão.</p>}
        {ANUNCIOS && <p><code>__gads</code>, <code>__gpi</code> e <code>__eoi</code> (Google AdSense, do próprio domínio ondepasso.com.br): limitam a repetição de anúncios e ajudam a medi-los. Duram até 13 meses e são apagados se você retirar a permissão. O Google também pode usar cookies nos domínios dele (por exemplo, doubleclick.net), que você controla nas configurações do navegador e da sua conta Google.</p>}
        {MEDICAO && <p>Os dados de eventos ficam guardados no Google Analytics por até 14 meses e são tratados pelo Google como operador, inclusive fora do Brasil, conforme os termos de proteção de dados do Google.</p>}
      </section>
      <section className="cartao estado-comparacao">
        <h2>Base legal e como mudar de ideia</h2>
        <p>{MEDICAO && ANUNCIOS ? "A medição e os anúncios usam" : MEDICAO ? "A medição usa" : "Os anúncios usam"} o seu consentimento (Lei Geral de Proteção de Dados, art. 7º, I){MEDICAO && ANUNCIOS ? ", dado separadamente para cada um" : ""}. Ele é opcional: recusar não muda nada no funcionamento do site. A escolha vale por 12 meses e pode ser revista a qualquer momento, também pelo rodapé de todas as páginas.</p>
        <p><PreferenciasCookies separador={false} /></p>
        {MEDICAO && <p>Como os dados de medição são pseudônimos e não ficam ligados a nome ou e-mail, não temos como localizá-los por pessoa. Para encerrar a medição, recuse no aviso ou apague os cookies do site no navegador.</p>}
      </section>
    </> : (
      <section className="cartao estado-comparacao">
        <h2>Medição de visitas</h2>
        <p>No momento o onde passo não usa cookies de medição nem de publicidade.</p>
      </section>
    )}
    <p className="miudo">Atualizada em {ANUNCIOS ? "10" : "5"} de novembro de 2026.</p>
  </article>;
}
