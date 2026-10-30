// Logo "Crescendo" como arquivo estático (uma cópia por tema), para não repetir o desenho em cada uma das ~7.500 páginas.
// Qual aparece é decidido no CSS (.logo-claro / .logo-escuro), que respeita o botão de tema.
export function Logo({ altura = 22 }: { altura?: number }) {
  const s = { height: altura, width: "auto" } as const;
  return (
    <>
      <img className="logo-escuro" src="/logo-escuro.svg" alt="onde passo" height={altura} style={s} />
      <img className="logo-claro" src="/logo-claro.svg" alt="onde passo" height={altura} style={s} />
    </>
  );
}
