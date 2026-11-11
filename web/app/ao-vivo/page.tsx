import type { Metadata } from "next";
import { indice } from "@/lib/dados";
import { Manchete, SetaBotao } from "@/components/Manchete";

export const metadata: Metadata = {
  title: "Ao vivo: parciais do Sisu dia a dia",
  description: "Durante as inscrições do Sisu, as notas de corte parciais mudam todo dia. Aqui você vai acompanhar essa evolução, opção por opção.",
  alternates: { canonical: "/ao-vivo/" },
};

// Fora do período de inscrições não há parcial nenhuma: a página explica o que vai acontecer aqui e manda para o histórico.
export default function AoVivo() {
  const { anos } = indice();
  const proximo = Math.max(...anos) + 1;
  return (
    <div className="pagina-aovivo">
      <header className="av-cabecalho mov-topo">
        <p className="rotulo etiqueta av-espera"><span className="ponto" />Fora do período de inscrições</p>
        <Manchete texto="As parciais do Sisu, dia a dia" destaque={3} />
        <p className="sub">Quando as inscrições do Sisu {proximo} abrirem, esta página mostra como a nota de corte de cada opção sobe ou desce a cada dia. Hoje ainda não há parcial nenhuma para mostrar.</p>
        <div className="av-acoes">
          <a className="botao botao-pilula botao-ima" href="/">Ver os cortes de {proximo - 1}<SetaBotao /></a>
          <a className="botao botao-contorno" href="https://acessounico.mec.gov.br/" target="_blank" rel="noopener noreferrer">Portal oficial do Sisu ↗</a>
        </div>
      </header>

      <section className="av-explica" aria-labelledby="t-av">
        <h2 id="t-av">O que é uma parcial</h2>
        <div className="av-grade">
          <div>
            <h3>O corte muda durante as inscrições</h3>
            <p>Enquanto o Sisu está aberto, cada pessoa pode trocar de opção quantas vezes quiser. Por isso a nota de corte de cada curso muda de um dia para o outro.</p>
          </div>
          <div>
            <h3>O Sisu mostra uma parcial por dia</h3>
            <p>A parcial é a nota de corte daquele momento, calculada com quem está inscrito até ali. Ela serve de referência e não é o resultado final.</p>
          </div>
          <div>
            <h3>Aqui você vê a evolução</h3>
            <p>O onde passo vai guardar a parcial de cada dia e mostrar a curva: se o corte da sua opção está subindo, caindo ou parado, comparado com a sua nota.</p>
          </div>
        </div>
      </section>

      <section className="av-linha" aria-labelledby="t-quando">
        <h2 id="t-quando">Quando isso entra no ar</h2>
        <ol>
          <li className="feito"><b>Agora</b><span><strong>Cortes das edições anteriores</strong>Já dá para ver os cortes finais de {anos[0]} a {proximo - 1} em todo o site.</span></li>
          <li><b>Jan/{proximo}</b><span><strong>Abrem as inscrições do Sisu {proximo}</strong>As datas exatas saem no edital do MEC.</span></li>
          <li><b>Durante as inscrições</b><span><strong>Parciais aqui, dia a dia</strong>Só aparecem se o Sisu publicar os dados e eles estiverem disponíveis para o onde passo.</span></li>
        </ol>
        <p className="miudo">Os cortes históricos são identificados pelo ano e não representam a situação atual das inscrições.</p>
      </section>
    </div>
  );
}
