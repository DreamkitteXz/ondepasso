import type { Metadata } from "next";
import { indice } from "@/lib/dados";
export const metadata: Metadata = { title: "Fonte e metodologia", alternates: { canonical: "/sobre-dados/" } };

export default function SobreDados() {
  const { atualizado, anos } = indice();
  return <article className="pagina-informativa">
    <h1>Fonte e metodologia</h1>
    <p className="sub">Dados públicos do MEC. O onde passo é um projeto independente e não é um site oficial.</p>
    <section className="cartao estado-comparacao">
      <h2>De onde vêm as notas</h2>
      <p>Usamos as planilhas de inscrições e notas de corte e de vagas ofertadas do Sisu, de {anos[0]} a {anos.at(-1)}, disponíveis na seção Relatórios do portal oficial.</p>
      <a href="https://sisu.mec.gov.br/#/relatorio" target="_blank" rel="noopener noreferrer">Consultar relatórios originais do MEC ↗</a>
      <p>Última atualização da base: {atualizado.split("-").reverse().join("/")}. Essa data é da base histórica, não de uma parcial das inscrições atuais.</p>
    </section>
    <section className="cartao estado-comparacao">
      <h2>Como ler a comparação</h2>
      <p>O corte é uma referência da chamada regular da edição e modalidade indicadas. Estar acima dele em uma comparação histórica não garante aprovação futura.</p>
      <p>Com as cinco notas, calculamos a média ponderada de cada opção e conferimos os mínimos disponíveis na base. A média simples é apenas uma estimativa quando há pesos diferentes. A classificação usa a média sem arredondamento; os valores exibidos são formatados para leitura.</p>
      <p>Empate tem uma situação própria: confira os critérios de desempate no edital. “Por pouco” significa até 10 pontos abaixo do corte histórico, sem indicar uma chance de aprovação.</p>
      <p>As opções sem corte ficam fora do resumo da comparação. Elas aparecem separadamente; ausência de corte não é nota zero. O mapa também depende de coordenadas disponíveis e pode mostrar menos opções que a lista.</p>
      <p>Quando há bônus regional, consulte o edital para confirmar sua elegibilidade. A comparação não adiciona o bônus automaticamente.</p>
    </section>
    <section className="cartao estado-comparacao">
      <h2>Suas notas ficam no navegador</h2>
      <p>Os cálculos são feitos no seu aparelho. As notas que você informa ficam no armazenamento local do navegador e podem ser apagadas pela opção “apagar minhas notas”.</p>
      <a className="botao" href="/calcular/">Comparar minhas notas</a>
    </section>
  </article>;
}
