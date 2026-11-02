"use client";
// Calculadora (Figma 05 / W5): notas por área → média ponderada de cada opção, com os pesos dela, contra o corte.
import { useEffect, useMemo, useState } from "react";
import type { DadosCalc } from "@/lib/calc";
import { lerNota, nota as fmt, ROTULO, statusNota, type Status } from "@/lib/formato";
import { salvarAreas, salvarMod, useAreas, useMod, type Areas } from "@/lib/nota";

// Ordem dos campos como no Figma; a ordem dos pesos no /calc.json é red, lin, mat, ch, cn.
const CAMPOS: { k: keyof Areas; rotulo: string; i: number; ph: string }[] = [
  { k: "red", rotulo: "Redação", i: 0, ph: "880" },
  { k: "mat", rotulo: "Matemática", i: 2, ph: "742,5" },
  { k: "cn", rotulo: "Natureza", i: 4, ph: "690,1" },
  { k: "ch", rotulo: "Humanas", i: 3, ph: "701,3" },
  { k: "lin", rotulo: "Linguagens", i: 1, ph: "655,0" },
];
const NOME_AREA = ["Redação", "Linguagens", "Matemática", "Humanas", "Natureza"];
const ORDEM: Record<Status, number> = { supera: 0, pouco: 1, abaixo: 2 };
const POR_PAGINA = 20;

type Resultado = { rota: string; curso: string; slug: string; ies: string; cidade: string; uf: string; media: number; corte: number; dif: number; s: Status; minimo: string | null };

export function Calculadora({ ano }: { ano: number }) {
  const areas = useAreas();
  const mod = useMod();
  const [dados, setDados] = useState<DadosCalc | null>(null);
  const [erroDados, setErroDados] = useState(false);
  const [grupo, setGrupo] = useState(-1);
  const [uf, setUf] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);

  useEffect(() => {
    fetch("/calc.json").then((r) => r.json()).then(setDados).catch(() => setErroDados(true));
  }, []);

  const notas = CAMPOS.map((c) => ({ ...c, v: lerNota(areas[c.k] ?? ""), texto: areas[c.k] ?? "" }));
  const n = [0, 0, 0, 0, 0];
  for (const c of notas) if (c.v != null) n[c.i] = c.v;
  const completo = notas.every((c) => c.v != null);

  const ufs = useMemo(() => (dados ? [...new Set(dados.linhas.map((l) => l[4]))].sort() : []), [dados]);
  const modAtual = dados?.mods.find((m) => m.cod === mod) ?? { cod: "AC", nome: "Ampla concorrência" };

  const resultados = useMemo<Resultado[]>(() => {
    if (!dados || !completo) return [];
    const out: Resultado[] = [];
    for (const [ci, rota, ies, cidade, u, pesos, minimas, mediaMin, cortes] of dados.linhas) {
      const c = dados.cursos[ci];
      if (grupo >= 0 && c.g !== grupo) continue;
      if (uf && u !== uf) continue;
      const corte = cortes[modAtual.cod];
      if (corte == null) continue;
      const soma = pesos.reduce((a, b) => a + b, 0);
      const media = Math.round((soma > 0 ? pesos.reduce((a, p, i) => a + p * n[i], 0) / soma : n.reduce((a, b) => a + b, 0) / 5) * 100) / 100;
      // Nota mínima por área ou média mínima não atingida: não entra na disputa, então conta como abaixo.
      const falta = minimas.findIndex((m, i) => m > 0 && n[i] < m);
      const minimo = falta >= 0 ? `nota mínima em ${NOME_AREA[falta]}: ${fmt(minimas[falta])}` : mediaMin > 0 && media < mediaMin ? `média mínima: ${fmt(mediaMin)}` : null;
      const dif = Math.round((media - corte) * 100) / 100;
      out.push({ rota, curso: c.curso, slug: c.slug, ies, cidade, uf: u, media, corte, dif, s: minimo ? "abaixo" : statusNota(corte, media), minimo });
    }
    // Primeiro onde passaria (da menor folga para a maior: as mais disputadas que você alcança), depois por pouco e abaixo.
    return out.sort((a, b) => ORDEM[a.s] - ORDEM[b.s] || (a.s === "supera" ? a.dif - b.dif : b.dif - a.dif));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, completo, grupo, uf, modAtual.cod, ...n]);

  const conta = { supera: 0, pouco: 0, abaixo: 0 };
  for (const r of resultados) conta[r.s]++;

  const mudar = (k: keyof Areas, v: string) => { salvarAreas({ ...areas, [k]: v }); setLimite(POR_PAGINA); };
  const filtro = (rotulo: string, valor: string, aria: string, opcoes: [string, string][], aoMudar: (v: string) => void, ativo: boolean) => (
    <label className={`chip chip-select${ativo ? " ativo" : ""}`}>
      {rotulo}
      <select value={valor} onChange={(e) => { aoMudar(e.target.value); setLimite(POR_PAGINA); }} aria-label={aria}>
        {opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );

  return (
    <div className="calc-grade">
      <div className="calc-entrada">
        <div className="calc-notas">
          {notas.map((c) => {
            const invalida = c.texto.trim() !== "" && c.v == null;
            return (
              <label key={c.k} className={`calc-nota${invalida ? " invalida" : ""}`}>
                <span>{c.rotulo}</span>
                <input inputMode="decimal" autoComplete="off" placeholder={c.ph} value={c.texto} aria-invalid={invalida}
                  onChange={(e) => mudar(c.k, e.target.value)} />
              </label>
            );
          })}
        </div>
        {notas.some((c) => c.texto.trim() !== "" && c.v == null) && <p className="erro">Cada nota vai de 0 a 1000, como 712,40.</p>}
        <div className="calc-filtros" role="group" aria-label="Filtros">
          {filtro(grupo >= 0 && dados ? dados.grupos[grupo] : "Todas as áreas", String(grupo), "Área do curso",
            [["-1", "Todas as áreas"], ...(dados?.grupos.map((g, i) => [String(i), g] as [string, string]) ?? [])], (v) => setGrupo(Number(v)), grupo >= 0)}
          {filtro(uf || "Todos os estados", uf, "Estado", [["", "Todos os estados"], ...ufs.map((u) => [u, u] as [string, string])], setUf, uf !== "")}
          {filtro(modAtual.cod === "AC" ? "Ampla" : modAtual.nome, modAtual.cod, "Modalidade",
            (dados?.mods ?? [modAtual]).map((m) => [m.cod, m.nome] as [string, string]), salvarMod, modAtual.cod !== "AC")}
        </div>
      </div>

      <section className="cartao calc-resultado" aria-labelledby="t-calc" aria-live="polite">
        <div className="calc-topo">
          <h2 id="t-calc">Onde você passaria</h2>
          <p className="miudo">Comparação com os cortes de {ano}; não garante aprovação.</p>
          {completo && dados && resultados.length > 0 && (
            <p className="contagem"><span className="t-supera">{conta.supera} supera{conta.supera === 1 ? "" : "m"}</span><i>·</i><span className="t-pouco">{conta.pouco} por pouco</span><i>·</i><span className="t-abaixo">{conta.abaixo} abaixo</span></p>
          )}
        </div>
        {!completo ? (
          <p className="calc-vazio">Digite as cinco notas para ver, opção por opção, a sua média com os pesos de cada curso.</p>
        ) : erroDados ? (
          <p className="calc-vazio">Não deu para carregar os cortes. Confira sua conexão e recarregue a página.</p>
        ) : !dados ? (
          <p className="calc-vazio">Carregando os cortes…</p>
        ) : resultados.length === 0 ? (
          <p className="calc-vazio">Nenhuma opção com esses filtros.</p>
        ) : (
          <>
            <div className="calc-cabeca so-desktop">
              <span>Curso</span><span className="n">Sua média ponderada</span><span className="n">Corte {ano}</span><span className="n">Diferença (pontos)</span><span className="n">Situação</span>
            </div>
            {resultados.slice(0, limite).map((r) => (
              <a key={r.slug + r.rota} className="calc-linha" href={`/curso/${r.slug}/${r.rota}/`}>
                <span className="calc-curso">
                  <strong>{r.curso}</strong>
                  <span className="meta">{r.ies} · {r.cidade}/{r.uf}<span className="so-mobile"> · Corte {ano} {fmt(r.corte)}</span></span>
                  {r.minimo && <span className="meta t-abaixo">{r.minimo}</span>}
                </span>
                <span className="calc-media">{fmt(r.media)}</span>
                <span className="calc-corte so-desktop">{fmt(r.corte)}</span>
                <span className={`calc-dif ${r.dif >= 0 ? "pos" : "neg"}`}>{r.dif > 0 ? "+" : r.dif < 0 ? "−" : ""}{fmt(Math.abs(r.dif))}<span className="so-mobile"> pts</span></span>
                <span className="calc-status"><span className={`selo-tinta ${r.s}`}>{ROTULO[r.s]}</span></span>
              </a>
            ))}
            {resultados.length > limite && (
              <button className="ver-mais" onClick={() => setLimite((x) => x + 40)}>Mostrar mais {Math.min(40, resultados.length - limite)} de {resultados.length - limite}</button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
