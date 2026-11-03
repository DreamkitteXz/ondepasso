import type { Status } from "@/lib/formato";
import type { Minhas } from "@/lib/minhas";

export function ContagemComparacao({ conta }: { conta: Record<Status, number> }) {
  return <p className="contagem">
    {conta.igual > 0 && <><span className="t-igual">{conta.igual} no mesmo corte</span><i>·</i></>}
    <span className="t-pouco">{conta.pouco} por pouco</span><i>·</i>
    <span className="t-abaixo">{conta.abaixo} abaixo do corte</span>
    {conta.minimo > 0 && <><i>·</i><span className="t-minimo">{conta.minimo} sem atingir mínimo</span></>}
  </p>;
}

export function AvisoComparacao({ minha }: { minha: Minhas }) {
  return <div className="orientacao-comparacao">
    <p>Comparação histórica · não garante aprovação.</p>
    {!minha.n && <p>Média simples: estimativa. Os pesos podem mudar o resultado. <a href="/calcular/">Usar as cinco notas do Enem</a></p>}
  </div>;
}

export function CoberturaComparacao({ total, comparaveis, mapeadas }: { total: number; comparaveis: number; mapeadas?: number }) {
  return <p className="miudo cobertura-comparacao">
    {total} opções no total · {comparaveis} com corte para esta modalidade e edição
    {total > comparaveis && <> · {total - comparaveis} sem dados para comparar</>}
    {mapeadas != null && comparaveis > mapeadas && <> · {comparaveis - mapeadas} sem localização no mapa</>}.
  </p>;
}
