import type { Metadata } from "next";
import { indice } from "@/lib/dados";
import { Calculadora } from "@/components/Calculadora";
import { Manchete } from "@/components/Manchete";

export const metadata: Metadata = {
  title: "Calculadora de média do Enem para o Sisu",
  description: "Digite suas notas do Enem e veja sua média ponderada em cada curso, com os pesos de cada universidade, comparada com as notas de corte do Sisu.",
  alternates: { canonical: "/calcular/" },
};

// Figma 05 (mobile) / W5 (desktop).
export default function PaginaCalcular() {
  const ano = Math.max(...indice().anos);
  return (
    <div className="pagina-calc">
      <header className="calc-cabecalho mov-topo">
        <p className="rotulo etiqueta"><span className="ponto" />Calculadora</p>
        <Manchete texto="Compare sua média com os cortes" destaque={2} />
        <div className="calc-sub">
          <p className="sub">Informe as cinco notas. Cada opção usa os pesos do curso para calcular sua média.</p>
          <p className="privado"><span className="ponto" />Suas notas não saem do seu navegador</p>
        </div>
      </header>
      <Calculadora ano={ano} />
    </div>
  );
}
