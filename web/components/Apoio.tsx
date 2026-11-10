// Bloco reservado: patrocínio direto > anúncio do AdSense (só com permissão) > "Gostou? Compartilhe com sua turma".
// Mesma altura nos casos, para trocar o conteúdo sem mexer no layout (com anúncios ligados, o bloco já reserva a
// altura do anúncio). Ver web/ANUNCIOS.md.
import { PATROCINIO } from "@/lib/patrocinio";
import { SITE } from "@/lib/site";
import { Compartilhar } from "@/components/Compartilhar";
import { Anuncio } from "@/components/Anuncio";
import { ANUNCIOS_ATIVO } from "@/lib/anuncios";

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
  const compartilhe = (
    <aside className={`cartao apoio${ANUNCIOS_ATIVO ? " com-anuncio" : ""}`} aria-label="Compartilhe o onde passo">
      <strong>Gostou? Compartilhe com sua turma</strong>
      <p>O onde passo é grátis e sem cadastro. Quanto mais gente usa, mais gente chega ao Sisu sabendo onde tem chance.</p>
      <Compartilhar titulo="onde passo · notas de corte do Sisu" url={`${SITE}/`} rotulo="Compartilhar o site" />
    </aside>
  );
  return ANUNCIOS_ATIVO ? <Anuncio alternativo={compartilhe} /> : compartilhe;
}
