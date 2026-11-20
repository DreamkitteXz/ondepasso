"use client";
// Oferta do relatório pago. Regra do site: só DEPOIS dos números, nunca no meio deles. Sem NEXT_PUBLIC_RELATORIO_API não aparece.
import { RELATORIO_ATIVO, PRECO_TEXTO, useAcesso } from "@/lib/acesso";
import { registrar, useRegistrarQuando } from "@/lib/analytics";
import { SetaBotao } from "@/components/Manchete";

export function CartaoRelatorio({ origem }: { origem: "calculadora" | "oferta" }) {
  const acesso = useAcesso();
  useRegistrarQuando(RELATORIO_ATIVO, `oferta-relatorio|${origem}`, "en_relatorio_oferta_vista", { origem });
  if (!RELATORIO_ATIVO) return null;
  return (
    <aside className="cartao-relatorio" aria-label="Relatório completo">
      <div>
        <p className="cr-rotulo">Relatório para o Sisu 2027</p>
        <strong>{acesso ? "Seu relatório está liberado" : "Monte o seu plano de 1ª e 2ª opção"}</strong>
        <p>{acesso ? "Veja o seu plano: 1ª e 2ª opção explicadas, margens, cenários e finalistas lado a lado." : `Com o que você quer cursar e onde pode estudar, o relatório compara suas notas com 3 anos de cortes e explica cada sugestão de 1ª e 2ª opção. R$ ${PRECO_TEXTO}, pagamento único.`}</p>
      </div>
      <a className="botao botao-pilula" href="/relatorio/" onClick={() => registrar("en_relatorio_oferta_clicada", { origem })}>{acesso ? "Abrir meu relatório" : "Ver a prévia grátis"}<SetaBotao /></a>
    </aside>
  );
}
