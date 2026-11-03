"use client";
// "Como funciona" da home: os três passos de quem chega pela primeira vez. Com a nota salva, encolhe para uma linha.
import { useMinhas } from "@/lib/nota";

export function ComoFunciona() {
  const minha = useMinhas();
  if (minha) return <p className="como-funciona-curto" aria-label="Como funciona"><b>1</b> Curso · <b>2</b> Nota · <b>3</b> Onde passa</p>;
  return (
    <ol className="como-funciona" aria-label="Como funciona">
      <li><b>1</b><span><strong>Escolha um curso</strong>Busque ou toque num dos atalhos.</span></li>
      <li><b>2</b><span><strong>Digite sua nota do Enem</strong>A média ou as cinco notas. Fica só no seu navegador.</span></li>
      <li><b>3</b><span><strong>Veja onde você passaria</strong>Cada ponto é um campus, com a cor da sua chance.</span></li>
    </ol>
  );
}
