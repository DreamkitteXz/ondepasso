import type { Metadata } from "next";
import { PreferenciasCookies } from "@/components/Analytics";

export const metadata: Metadata = {
  title: "Privacidade e cookies",
  description: "O que o onde passo guarda no seu navegador, o que mede (só com a sua permissão) e o que nunca é enviado.",
  alternates: { canonical: "/privacidade/" },
};

// O GA4 só existe quando o build tem NEXT_PUBLIC_GA_ID (ver web/ANALYTICS.md); o texto acompanha.
const MEDICAO = /^G-[A-Z0-9]{4,20}$/.test((process.env.NEXT_PUBLIC_GA_ID ?? "").trim());

export default function Privacidade() {
  return <article className="pagina-informativa">
    <h1>Privacidade e cookies</h1>
    <p className="sub">Resumo: suas notas do Enem ficam só no seu aparelho. {MEDICAO ? "Medimos visitas com o Google Analytics apenas se você permitir." : "O site não usa cookies de medição."}</p>

    <section className="cartao estado-comparacao">
      <h2>O que fica no seu navegador</h2>
      <p>As notas e a modalidade que você informa, o tema (claro ou escuro){MEDICAO ? " e a sua escolha sobre cookies" : ""} ficam no armazenamento local do navegador. Os cálculos acontecem no seu aparelho e as notas não são enviadas a nenhum servidor, nosso ou de terceiros. Você pode apagá-las pela opção “apagar minhas notas” ou limpando os dados do site no navegador.</p>
    </section>

    {MEDICAO ? <>
      <section className="cartao estado-comparacao">
        <h2>Medição de visitas (Google Analytics 4)</h2>
        <p>Se você clicar em “Permitir” no aviso de cookies, usamos o Google Analytics 4 para entender quantas pessoas usam o site, de onde elas chegam (por exemplo, TikTok, Instagram, Google ou um link de campanha) e quais partes ajudam mais. Antes da sua permissão, o script do Google não é carregado e nenhum cookie de medição é gravado.</p>
        <p>Com a permissão, são enviados: as páginas visitadas, o site ou o link de campanha de origem, tipo de aparelho e navegador, região aproximada (calculada pelo Google a partir da conexão) e algumas ações no site, como começar a preencher a nota, escolher um curso (qual curso), pedir e ver a comparação e erros de carregamento ou de preenchimento.</p>
        <p><strong>Nunca são enviados:</strong> suas notas do Enem, sua média, a modalidade de cota, nome, e-mail, CPF ou qualquer texto que você digite. O Google Analytics 4 não guarda endereços IP.</p>
        <p>Não usamos recursos de publicidade: o Google Signals e a personalização de anúncios ficam desligados, e os dados não são usados para remarketing.</p>
      </section>
      <section className="cartao estado-comparacao">
        <h2>Cookies usados</h2>
        <p><code>_ga</code> e <code>_ga_…</code> (Google Analytics, do próprio domínio ondepasso.com.br): distinguem visitas de forma pseudônima, sem identificar você. Duram até 2 anos e são apagados se você recusar ou retirar a permissão.</p>
        <p>Os dados de eventos ficam guardados no Google Analytics por até 14 meses e são tratados pelo Google como operador, inclusive fora do Brasil, conforme os termos de proteção de dados do Google.</p>
      </section>
      <section className="cartao estado-comparacao">
        <h2>Base legal e como mudar de ideia</h2>
        <p>A medição usa o seu consentimento (Lei Geral de Proteção de Dados, art. 7º, I). Ele é opcional: recusar não muda nada no funcionamento do site. A escolha vale por 12 meses e pode ser revista a qualquer momento, também pelo rodapé de todas as páginas.</p>
        <p><PreferenciasCookies separador={false} /></p>
        <p>Como os dados de medição são pseudônimos e não ficam ligados a nome ou e-mail, não temos como localizá-los por pessoa. Para encerrar a medição, recuse no aviso ou apague os cookies do site no navegador.</p>
      </section>
    </> : (
      <section className="cartao estado-comparacao">
        <h2>Medição de visitas</h2>
        <p>No momento o onde passo não usa cookies de medição nem de publicidade.</p>
      </section>
    )}
    <p className="miudo">Atualizada em 5 de novembro de 2026.</p>
  </article>;
}
