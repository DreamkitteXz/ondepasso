import type { Metadata } from "next";
import { indice } from "@/lib/dados";
import { Manchete } from "@/components/Manchete";
import { Relatorio } from "@/components/Relatorio";

const ATIVO = !!(process.env.NEXT_PUBLIC_RELATORIO_API ?? "").trim() && !!(process.env.NEXT_PUBLIC_RELATORIO_CONTATO ?? "").trim();

export const metadata: Metadata = {
  title: "Relatório para o Sisu: suas melhores opções",
  description: "Com as suas cinco notas do Enem e o que você quer cursar: 1ª e 2ª opção explicadas, margens sobre 3 anos de cortes, cenários, finalistas lado a lado e um plano para salvar em PDF.",
  alternates: { canonical: "/relatorio/" },
  // Enquanto a venda não abre, a página existe mas não entra no Google.
  ...(ATIVO ? {} : { robots: { index: false } }),
};

export default function PaginaRelatorio() {
  const { anos } = indice();
  const ano = Math.max(...anos);
  return (
    <div className="pagina-relatorio">
      <header className="rl-cabecalho mov-topo">
        <p className="rotulo etiqueta"><span className="ponto" />Relatório · Sisu {ano + 1}</p>
        <Manchete texto="Seu plano de escolha para o Sisu" destaque={3} />
        <div className="calc-sub">
          <p className="sub">Diga o que você quer cursar e onde pode estudar. O relatório compara suas cinco notas com os cortes de {anos[0]} a {ano}, opção por opção: onde sua nota supera os cortes históricos, onde fica no limite e por que cada opção aparece na sua 1ª e na sua 2ª.</p>
          <p className="privado"><span className="ponto" />Calculado no seu aparelho: suas notas não saem daqui</p>
        </div>
      </header>
      <Relatorio ano={ano} />
    </div>
  );
}
