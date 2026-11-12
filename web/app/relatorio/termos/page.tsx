import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos do relatório e reembolso",
  description: "O que é o relatório pago do onde passo, o que ele não promete, como funciona o código de acesso e como pedir reembolso.",
  alternates: { canonical: "/relatorio/termos/" },
};

const CONTATO = (process.env.NEXT_PUBLIC_RELATORIO_CONTATO ?? "").trim();
const PRECO = (process.env.NEXT_PUBLIC_RELATORIO_PRECO ?? "15,90").trim();

export default function TermosRelatorio() {
  return <article className="pagina-informativa">
    <h1>Termos do relatório e reembolso</h1>
    <p className="sub">Resumo: o relatório é uma análise das suas notas contra os cortes passados do Sisu. Não garante vaga. Se não gostar, devolvemos o valor em até 7 dias.</p>

    <section className="cartao estado-comparacao">
      <h2>O que você compra</h2>
      <p>Um código de acesso ao relatório do onde passo, por R$ {PRECO}, em pagamento único por Pix. Com o código, o relatório completo abre em até 3 aparelhos, e você pode refazê-lo quantas vezes quiser, mudando notas, modalidade, estados, áreas e turnos, até a data de validade mostrada na compra.</p>
      <p>Todo o resto do onde passo continua gratuito e sem cadastro.</p>
    </section>

    <section className="cartao estado-comparacao">
      <h2>O que o relatório não é</h2>
      <p><strong>Não é previsão nem garantia de aprovação.</strong> As faixas (“com folga”, “acima do corte”, “no limite”, “aposta”) comparam a sua média com as notas de corte da chamada regular de edições anteriores do Sisu. Os cortes de uma nova edição só existem depois das inscrições e podem ser bem diferentes.</p>
      <p>A sugestão de 1ª e 2ª opção é uma leitura dos números, não uma orientação profissional. A escolha do curso é sua. O onde passo não é um site oficial: confira sempre vagas, pesos, notas mínimas e regras no <a className="link-sublinhado" href="https://acessounico.mec.gov.br/">portal do Sisu</a> e no edital de cada universidade.</p>
    </section>

    <section className="cartao estado-comparacao">
      <h2>Reembolso</h2>
      <p>Você pode pedir o reembolso integral em até 7 dias depois do pagamento, sem precisar explicar o motivo.{CONTATO ? <> Escreva para <a className="link-sublinhado" href={`mailto:${CONTATO}`}>{CONTATO}</a> com o e-mail usado na compra ou o comprovante do Pix.</> : null} O valor volta pelo Mercado Pago, para a mesma conta, e o código deixa de funcionar.</p>
    </section>

    <section className="cartao estado-comparacao">
      <h2>Seus dados na compra</h2>
      <p><strong>Suas notas não são enviadas.</strong> O relatório é calculado no seu navegador, como o resto do site.</p>
      <p>O e-mail que você informa é repassado ao Mercado Pago, que processa o Pix e envia o recibo; o onde passo não guarda o seu e-mail. Guardamos apenas: o número do pagamento, o código de acesso e um identificador aleatório de cada aparelho em que o código foi usado, para aplicar o limite de 3 aparelhos. Esses registros são apagados 60 dias depois da validade do código.</p>
      <p>No seu navegador ficam o código e os filtros que você escolheu. Detalhes em <a className="link-sublinhado" href="/privacidade/">Privacidade</a>.</p>
    </section>

    <section className="cartao estado-comparacao">
      <h2>Quem tem menos de 18 anos</h2>
      <p>Se você tem menos de 18 anos, faça a compra com a autorização de um responsável.</p>
    </section>

    <section className="cartao estado-comparacao">
      <h2>Perdi meu código</h2>
      <p>O código aparece na tela logo depois do pagamento e fica salvo no navegador em que você comprou. Anote-o para usar em outro aparelho.{CONTATO ? <> Se perder, escreva para <a className="link-sublinhado" href={`mailto:${CONTATO}`}>{CONTATO}</a> com o comprovante do Pix.</> : null}</p>
    </section>
  </article>;
}
