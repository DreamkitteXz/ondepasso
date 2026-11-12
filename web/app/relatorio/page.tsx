import type { Metadata } from "next";
import { indice } from "@/lib/dados";
import { Manchete } from "@/components/Manchete";
import { Relatorio } from "@/components/Relatorio";

const ATIVO = !!(process.env.NEXT_PUBLIC_RELATORIO_API ?? "").trim() && !!(process.env.NEXT_PUBLIC_RELATORIO_CONTATO ?? "").trim();

export const metadata: Metadata = {
  title: "Relatório para o Sisu: suas melhores opções",
  description: "Com as suas cinco notas do Enem: a 1ª e a 2ª opção sugeridas, o risco de cada escolha com 3 anos de cortes e os cursos em que os pesos mais ajudam você.",
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
        <Manchete texto="Em quais opções vale apostar" destaque={2} />
        <div className="calc-sub">
          <p className="sub">Suas cinco notas contra os cortes de {anos[0]} a {ano}, opção por opção: onde você passa com folga, onde está no limite e o que colocar na 1ª e na 2ª opção.</p>
          <p className="privado"><span className="ponto" />Calculado no seu aparelho: suas notas não saem daqui</p>
        </div>
      </header>
      <Relatorio ano={ano} />
    </div>
  );
}
