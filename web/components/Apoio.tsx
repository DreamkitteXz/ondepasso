// Bloco reservado para patrocínio (plano: "Gostou? Compartilhe com sua turma" até haver patrocinador).
// Mesma altura nos dois casos, para trocar o conteúdo sem mexer no layout.
import { PATROCINIO } from "@/lib/patrocinio";
import { SITE } from "@/lib/site";
import { Compartilhar } from "@/components/Compartilhar";

export function Apoio() {
  const p = PATROCINIO;
  if (p) return (
    <aside className="cartao apoio" aria-label="Patrocínio">
      <span className="apoio-rotulo">Patrocínio</span>
      <strong>{p.nome}</strong>
      <p>{p.texto}</p>
      <a className="botao botao-contorno" href={p.url} target="_blank" rel="sponsored noopener noreferrer">{p.chamada}</a>
    </aside>
  );
  return (
    <aside className="cartao apoio" aria-label="Compartilhe o onde passo">
      <strong>Gostou? Compartilhe com sua turma</strong>
      <p>O onde passo é grátis e sem cadastro. Quanto mais gente usa, mais gente chega ao Sisu sabendo onde tem chance.</p>
      <Compartilhar titulo="onde passo · notas de corte do Sisu" url={`${SITE}/`} rotulo="Compartilhar o site" />
    </aside>
  );
}
