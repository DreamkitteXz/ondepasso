// Variação do corte de um ano para o outro, por extenso: "subiu 3,02" / "caiu 3,02", com seta e cor.
// Corte que subiu ficou mais difícil (vermelho); corte que caiu ficou mais fácil (verde).
import { nota } from "@/lib/formato";

export function Variacao({ d, ano, className }: { d: number; ano?: number; className?: string }) {
  const subiu = d > 0;
  const desde = ano ? ` desde ${ano - 1}` : "";
  return (
    <span className={`variacao ${subiu ? "sobe" : "desce"}${className ? ` ${className}` : ""}`}
      title={`O corte ${subiu ? "subiu" : "caiu"} ${nota(Math.abs(d))} pontos${ano ? ` em relação a ${ano - 1}` : " em relação ao ano anterior"}: ficou ${subiu ? "mais difícil" : "mais fácil"} passar.`}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {subiu ? <path d="M2.5 9.5 9.5 2.5M4.5 2.5h5v5" /> : <path d="M2.5 2.5 9.5 9.5M9.5 4.5v5h-5" />}
      </svg>
      {subiu ? "subiu" : "caiu"} {nota(Math.abs(d))}{desde}
    </span>
  );
}
