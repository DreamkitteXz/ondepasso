"use client";
// Versão de impressão do plano (Salvar em PDF / Imprimir). Fica escondida na tela e é a única coisa impressa
// (ver @media print em app/relatorio.css). Montada aqui no navegador, só para quem tem acesso: nada é enviado.
import { nota as fmt, diferenca } from "@/lib/formato";
import { NOME_FAIXA } from "@/lib/relatorio";
import { cenarios, chaveOpcao, margens, motivos, pendencias, regraFaixa, REGRA_SISU, ROTULO_VINCULO, CRITERIO_ORDEM, type Considerada, type Escolhas, type ItemChecklist, type Preferencias } from "@/lib/plano";

const sinal = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + diferenca(Math.abs(v));
const LUGAR = (p: Preferencias) => p.mobilidade === "cidade" && p.cidade ? `só em ${p.cidade.replace("|", "/")}` : p.mobilidade === "estados" && p.ufs.length ? `só em ${p.ufs.join(", ")}` : "em qualquer lugar";

type Props = {
  ano: number; anosBase: string; notas: { rotulo: string; v: number }[]; simples: number; nomeMod: string; prefs: Preferencias;
  nomesCursos: string[]; grupos: string[]; itens: Considerada[]; saoFinalistas: boolean; escolhas: Escolhas; checklist: ItemChecklist[]; feitos: Record<string, boolean>;
};

export function ImpressaoRelatorio({ ano, anosBase, notas, simples, nomeMod, prefs, nomesCursos, grupos, itens, saoFinalistas, escolhas, checklist, feitos }: Props) {
  const agora = new Date();
  const gerado = `${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  const ctx = { prefs, grupos };
  const ordemPapel = (c: Considerada) => (escolhas.primeira === chaveOpcao(c) ? 0 : escolhas.segunda === chaveOpcao(c) ? 1 : 2);
  const papel = (c: Considerada) => (escolhas.primeira === chaveOpcao(c) ? "Sua 1ª opção" : escolhas.segunda === chaveOpcao(c) ? "Sua 2ª opção" : null);
  return (
    <section className="rl-pdf" aria-hidden="true">
      <header className="pdf-topo">
        <p className="pdf-marca">onde passo · Plano para o Sisu</p>
        <h1>Seu plano de escolha</h1>
        <p>Gerado em {gerado}, neste navegador. Base: notas de corte da chamada regular do Sisu de {anosBase} (dados públicos do MEC). Calculado no aparelho: as notas não foram enviadas a nenhum servidor.</p>
      </header>

      <h2>Notas e preferências consideradas</h2>
      <table className="pdf-tabela">
        <tbody>
          <tr><th scope="row">Notas</th><td>{notas.map((n) => `${n.rotulo} ${fmt(n.v)}`).join(" · ")} · média simples {fmt(simples)}</td></tr>
          <tr><th scope="row">Modalidade</th><td>{nomeMod}</td></tr>
          <tr><th scope="row">Cursos que você quer</th><td>{nomesCursos.length ? nomesCursos.join(", ") : "nenhum marcado (exploração)"}{nomesCursos.length ? (prefs.relacionados ? " · aceita relacionados" : " · sem relacionados") : ""}</td></tr>
          <tr><th scope="row">Lugar</th><td>{LUGAR(prefs)}</td></tr>
          <tr><th scope="row">Turno</th><td>{prefs.noite ? "precisa estudar à noite (só noturnos)" : prefs.turnos.length ? prefs.turnos.join(", ") : "qualquer"}</td></tr>
        </tbody>
      </table>
      <p className="pdf-nota">{CRITERIO_ORDEM}</p>

      <h2>{saoFinalistas ? "Suas finalistas" : "Recomendações (você ainda não marcou finalistas)"}</h2>
      <p className="pdf-nota">{REGRA_SISU} Marcar 1ª e 2ª aqui não é a inscrição: ela é feita no Portal Único do Sisu.</p>
      {itens.length === 0 && <p>Nenhuma opção nesta seleção.</p>}
      {[...itens].sort((a, b) => ordemPapel(a) - ordemPapel(b)).map((c) => {
        const m = margens(c); const pend = pendencias(c, ano); const p = papel(c);
        return (
          <article key={chaveOpcao(c)} className="pdf-opcao">
            <h3>{p && <span className="pdf-papel">{p} · </span>}{c.curso}</h3>
            <p className="pdf-meta">{c.ies}{c.campus ? ` · ${c.campus}` : ""} · {c.cidade}/{c.uf} · {c.turno} · {c.grau} · {nomeMod} · {ROTULO_VINCULO[c.vinculo]}{c.relacionadoA ? ` (a ${c.relacionadoA})` : ""}</p>
            <table className="pdf-tabela">
              <thead><tr><th scope="col">Situação</th><th scope="col">Sua média</th><th scope="col">Corte {m.recente.ano}</th><th scope="col">Margem</th><th scope="col">Maior corte ({m.maior.ano})</th><th scope="col">Margem</th><th scope="col">Supera em</th></tr></thead>
              <tbody><tr>
                <td>{c.minimo ? "Nota mínima" : NOME_FAIXA[c.faixa]}</td><td>{fmt(c.media)}{Math.abs(c.ganho) >= 0.005 ? ` (${sinal(c.ganho)} pesos)` : ""}</td>
                <td>{fmt(m.recente.corte)}</td><td>{sinal(m.recente.margem)}</td><td>{fmt(m.maior.corte)}</td><td>{sinal(m.maior.margem)}</td>
                <td>{m.supera.length} de {m.anos.length} ({m.anos.join(", ")})</td>
              </tr></tbody>
            </table>
            {!c.minimo && (
              <table className="pdf-tabela">
                <thead><tr><th scope="col">Simulação (não é previsão)</th>{cenarios(c).map((s) => <th scope="col" key={s.aumento}>Corte +{s.aumento} ({fmt(s.corte)})</th>)}</tr></thead>
                <tbody><tr><td>Sua média {fmt(c.media)}</td>{cenarios(c).map((s) => <td key={s.aumento}>{s.supera ? "supera" : "fica abaixo"} ({sinal(s.margem)})</td>)}</tr></tbody>
              </table>
            )}
            <p className="pdf-sub">Por que esta opção apareceu</p>
            <ul>{motivos(c, ctx).map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="pdf-nota">{regraFaixa(c)}</p>
            {pend.length > 0 && <><p className="pdf-sub">Para conferir</p><ul>{pend.map((t) => <li key={t}>{t}</li>)}</ul></>}
          </article>
        );
      })}

      <h2>Plano de ação</h2>
      <ul className="pdf-check">
        {checklist.map((i) => (
          <li key={i.id}>
            <span aria-hidden="true">{feitos[i.id] ? "☑" : "☐"}</span>{" "}
            <strong>{i.texto}</strong> ({i.tipo === "exigencia" ? "exigência" : "sugestão"}). {i.detalhe}
            {i.link && <> {i.link.rotulo}: <span className="pdf-url">{i.link.href.startsWith("http") ? i.link.href : `https://ondepasso.com.br${i.link.href}`}</span></>}
          </li>
        ))}
      </ul>

      <p className="pdf-aviso">Comparação histórica não garante aprovação. As faixas e os cenários comparam a sua média com os cortes de {anosBase}; os cortes de 2027 só existem depois das inscrições, e pesos, vagas e notas mínimas podem mudar. Confira tudo no portal oficial do Sisu e no edital de cada instituição. O onde passo não é um site oficial.</p>
    </section>
  );
}
