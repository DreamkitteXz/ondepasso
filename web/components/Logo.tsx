// Logo "Crescendo" como arquivo estático (uma cópia por tema), para não repetir o desenho em cada uma das ~7.500 páginas.
export function Logo({ altura = 22 }: { altura?: number }) {
  return (
    <picture>
      <source srcSet="/logo-claro.svg" media="(prefers-color-scheme: light)" />
      <img src="/logo-escuro.svg" alt="onde passo" height={altura} style={{ display: "block", height: altura, width: "auto" }} />
    </picture>
  );
}
