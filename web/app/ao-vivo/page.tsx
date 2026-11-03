import type { Metadata } from "next";
export const metadata: Metadata = { title: "Acompanhamento das parciais do Sisu", alternates: { canonical: "/ao-vivo/" } };

export default function AoVivo() {
  return <div className="pagina-informativa">
    <h1>Parciais ainda não disponíveis</h1>
    <p className="sub">O acompanhamento diário será exibido quando houver dados publicados pelo Sisu e disponíveis aqui.</p>
    <section className="cartao estado-comparacao">
      <h2>Histórico disponível</h2>
      <p>Nenhuma parcial está disponível nesta página. Você ainda pode explorar os cortes das edições anteriores.</p>
      <p>Os cortes históricos são identificados pelo ano e não representam a situação atual das inscrições.</p>
      <a className="botao" href="/">Consultar histórico</a>
      <a href="https://acessounico.mec.gov.br/" target="_blank" rel="noopener noreferrer">Consultar portal oficial ↗</a>
    </section>
  </div>;
}
