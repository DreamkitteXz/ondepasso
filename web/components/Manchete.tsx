// Manchete revelada palavra por palavra (ver Movimento.tsx). O nome acessível fica inteiro no aria-label;
// as palavras partidas são decorativas (aria-hidden). Sem JavaScript, o texto aparece normal.
export function Manchete({ texto, destaque = 0, className, estilo }: { texto: string; destaque?: number; className?: string; estilo?: React.CSSProperties }) {
  const palavras = texto.split(" ");
  return (
    <h1 className={`manchete-mov${className ? ` ${className}` : ""}`} aria-label={texto} style={estilo}>
      {palavras.flatMap((p, i) => [
        <span key={i} aria-hidden="true" className={`mp${i >= palavras.length - destaque ? " mp-destaque" : ""}`}><span className="mp-i">{p}</span></span>,
        i < palavras.length - 1 ? " " : "",
      ])}
    </h1>
  );
}

/** Seta dentro de um círculo próprio, para o fim de um botão em pílula ("botão dentro do botão"). Só decoração. */
export function SetaBotao() {
  return (
    <span className="botao-ic" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10 10 4M5 4h5v5" /></svg>
    </span>
  );
}
