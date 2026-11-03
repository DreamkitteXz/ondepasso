// "Como usar isso no Sisu": o que fazer com a informação, em janeiro. Regras conferidas no edital do Sisu 2026.
export function NoSisu({ ano }: { ano: number }) {
  return (
    <section className="cartao no-sisu" aria-labelledby="t-no-sisu">
      <h2 id="t-no-sisu">Como usar isso no Sisu {ano + 1}</h2>
      <ol>
        <li>As inscrições são no <a href="https://acessounico.mec.gov.br/" target="_blank" rel="noopener noreferrer">Portal Único do MEC</a>, em janeiro. É grátis.</li>
        <li>Você escolhe até <strong>2 opções</strong> de curso e pode trocar quantas vezes quiser até o fim das inscrições.</li>
        <li>Durante as inscrições, o Sisu mostra uma nota de corte parcial por dia. Use para decidir se mantém ou troca.</li>
        <li>Não passou na chamada regular? Entre na <strong>lista de espera</strong>.</li>
      </ol>
      <p className="miudo">Datas e regras valem pelo edital do Sisu {ano + 1}: confira sempre no portal oficial.</p>
    </section>
  );
}
