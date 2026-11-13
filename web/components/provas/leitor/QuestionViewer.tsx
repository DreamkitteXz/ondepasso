"use client";
// Modo "Por questão" do leitor do Enem: uma questão por vez, desenhada a partir do PDF oficial do Inep (recortes
// feitos no navegador, nada é copiado nem hospedado), com o texto de apoio comum quando houver, e a resposta
// escondida até a pessoa pedir. Sem cronômetro, pontuação nem correção.
// O mapa vem de lib/leitor/questoes.ts; se ele não fecha (faltou ou sobrou questão), o modo não é oferecido.
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Arquivo } from "@/lib/provas-tipos";
import { abrirPdf, lerGabarito, mapearPorQuestao, recortarRegiao, type Gabarito, type RenderizadorPdf } from "@/lib/leitor/pdf";
import type { IdiomaQuestao, MapaQuestoes, QuestaoMapa, Regiao } from "@/lib/leitor/questoes";
import { registrar } from "@/lib/analytics";

export type ApiQuestoes = { proxima: () => void; anterior: () => void };
type Mapa = MapaQuestoes & { paginas: Record<number, { largura: number; altura: number }> };

const chave = (q: QuestaoMapa) => `${q.numero}${q.idioma ? `-${q.idioma}` : ""}`;
const IDIOMA = { ingles: "Inglês", espanhol: "Espanhol" } as const;

type Props = {
  r: RenderizadorPdf; provaId: string; dia: 1 | 2; idiomaCaderno: IdiomaQuestao; gabarito: Arquivo | null; fonte: string;
  largura: number; inicial?: string; aoMudar: (chave: string) => void; aoVerNoCaderno: (pagina: number) => void;
  revisar: number[]; alternarRevisar: (q: number) => void;
  /** Questões cuja resposta já foi aberta ("12", "3-espanhol"); `aoVerResposta` registra mais uma. */
  vistas: string[]; aoVerResposta: (chave: string) => void;
};

export const QuestionViewer = forwardRef<ApiQuestoes, Props>(function QuestionViewer(p, ref) {
  const [mapa, setMapa] = useState<Mapa | null>(null);
  const [erro, setErro] = useState(false);
  const [lidas, setLidas] = useState(0);
  const [idioma, setIdioma] = useState<"ingles" | "espanhol">(p.idiomaCaderno ?? (p.inicial?.endsWith("-espanhol") ? "espanhol" : "ingles"));
  const [atual, setAtual] = useState<string | null>(null);
  const [mostrar, setMostrar] = useState(false);
  const [gab, setGab] = useState<{ estado: "parado" | "lendo" | "ok" | "incompleto" | "erro"; dados: Gabarito | null }>({ estado: "parado", dados: null });
  const topo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    setMapa(null); setErro(false); setLidas(0);
    mapearPorQuestao(p.r, p.dia, p.idiomaCaderno, (n) => vivo && setLidas(n))
      .then((m) => { if (!vivo) return; setMapa(m); registrar("enem_questoes_mapeadas", { prova: p.provaId, resultado: m.completo ? "completo" : "incompleto" }); })
      .catch(() => vivo && setErro(true));
    return () => { vivo = false; };
  }, [p.r, p.dia, p.idiomaCaderno, p.provaId]);

  // Lista na ordem de estudo, só com o idioma escolhido nas questões 1 a 5 do 1º dia.
  const lista = useMemo(() => (mapa?.completo ? mapa.questoes.filter((q) => !q.idioma || q.idioma === (p.idiomaCaderno ?? idioma)) : []), [mapa, idioma, p.idiomaCaderno]);
  useEffect(() => {
    if (!lista.length) return;
    setAtual((a) => {
      const alvo = a ?? p.inicial ?? null;
      if (alvo && lista.some((q) => chave(q) === alvo)) return alvo;
      const num = alvo ? Number(alvo.split("-")[0]) : NaN;
      return chave(lista.find((q) => q.numero === num) ?? lista[0]);
    });
  }, [lista, p.inicial]);
  const i = lista.findIndex((q) => chave(q) === atual);
  const q = i >= 0 ? lista[i] : null;

  const ir = (k: number) => {
    const alvo = lista[Math.max(0, Math.min(lista.length - 1, k))];
    if (!alvo || chave(alvo) === atual) return;
    setAtual(chave(alvo)); setMostrar(false);
    p.aoMudar(chave(alvo));
    topo.current?.scrollIntoView({ block: "start" });
  };
  useImperativeHandle(ref, () => ({ proxima: () => ir(i + 1), anterior: () => ir(i - 1) }));

  async function verResposta() {
    setMostrar(true);
    if (!q) return;
    registrar("enem_resposta_vista", { prova: p.provaId });
    p.aoVerResposta(chave(q));
    if (gab.estado !== "parado" || !p.gabarito) return;
    setGab({ estado: "lendo", dados: null });
    try {
      const { promessa } = await abrirPdf(p.gabarito.url);
      const doc = await promessa;
      const g = await lerGabarito(doc, p.dia, p.idiomaCaderno);
      void doc.loadingTask.destroy();
      setGab({ estado: g.completo ? "ok" : "incompleto", dados: g });
    } catch { setGab({ estado: "erro", dados: null }); }
  }

  if (erro) return <div className="questao-aviso" role="alert"><p>Não foi possível montar as questões deste caderno.</p><p className="miudo">Use o modo Caderno ou Rolagem para ler a prova.</p></div>;
  if (!mapa) {
    return (
      <div className="questao-aviso" role="status" aria-live="polite">
        <p>Separando as questões do caderno oficial…</p>
        <div className="barra-progresso" aria-hidden="true"><span style={{ width: `${Math.round((lidas / Math.max(1, p.r.total)) * 100)}%` }} /></div>
        <p className="miudo">Página {lidas} de {p.r.total}</p>
      </div>
    );
  }
  if (!mapa.completo) {
    return (
      <div className="questao-aviso" role="alert">
        <p><strong>O modo por questão não está disponível para este caderno.</strong></p>
        <p className="miudo">A separação automática não encontrou exatamente as {mapa.esperadas} questões do caderno ({mapa.encontradas} encontradas), então preferimos não mostrar recortes que podem estar errados. A prova inteira continua nos modos Caderno e Rolagem.</p>
      </div>
    );
  }
  if (!q) return null;

  const resposta = gab.dados?.respostas.get(q.numero);
  const valor = resposta && (resposta.respostas.length > 1 ? resposta.respostas.find((x) => x.rotulo === (q.idioma ? IDIOMA[q.idioma] : null)) ?? null : resposta.respostas[0]);
  const marcada = p.revisar.includes(q.numero);
  const largura = Math.min(p.largura - 24, 760);
  // Mesma escala para todos os trechos da questão (e do texto de apoio), no máximo 1,9× o tamanho do papel:
  // uma coluna do caderno esticada até 760px deixaria a letra três vezes maior que a impressa.
  const escala = Math.min(1.9, largura / Math.max(...[...q.regioes, ...q.apoio].map((r) => r.w)));

  return (
    <div className="questao-modo" ref={topo}>
      <div className="questao-cabeca" style={{ maxWidth: largura }}>
        <div>
          <h2>Questão {String(q.numero).padStart(2, "0")}{q.idioma ? <small> · {IDIOMA[q.idioma]}</small> : null}</h2>
          <p className="miudo">{i + 1} de {lista.length}</p>
        </div>
        <div className="questao-cabeca-acoes">
          {p.dia === 1 && !p.idiomaCaderno && (
            <div className="controle-dias" role="group" aria-label="Língua estrangeira (questões 1 a 5)">
              {(["ingles", "espanhol"] as const).map((l) => (
                <button key={l} type="button" aria-pressed={idioma === l} onClick={() => { setIdioma(l); setMostrar(false); }}>{IDIOMA[l]}</button>
              ))}
            </div>
          )}
          <label className="questao-ir">
            <span className="sr-only">Ir para a questão</span>
            <select value={atual ?? ""} onChange={(e) => { const k = lista.findIndex((x) => chave(x) === e.target.value); ir(k); }}>
              {lista.map((x) => <option key={chave(x)} value={chave(x)}>Questão {String(x.numero).padStart(2, "0")}{p.revisar.includes(x.numero) ? " ★" : ""}{p.vistas.includes(chave(x)) ? " ✓" : ""}</option>)}
            </select>
          </label>
        </div>
      </div>

      {q.apoio.length > 0 && (
        <section className="questao-apoio" style={{ maxWidth: largura }} aria-label={q.apoioRotulo ?? "Texto de apoio"}>
          <p className="rotulo">{q.apoioRotulo ?? "Texto de apoio"}</p>
          {q.apoio.map((reg, k) => <Recorte key={`a${k}`} r={p.r} reg={reg} paginaPt={mapa.paginas[reg.pagina].largura} largura={Math.round(reg.w * escala)} rotulo={`${q.apoioRotulo ?? "Texto de apoio"}, trecho ${k + 1}`} />)}
        </section>
      )}

      <section className="questao-corpo" style={{ maxWidth: largura }} aria-label={`Questão ${q.numero}`}>
        {q.regioes.map((reg, k) => <Recorte key={`${chave(q)}-${k}`} r={p.r} reg={reg} paginaPt={mapa.paginas[reg.pagina].largura} largura={Math.round(reg.w * escala)} rotulo={`Questão ${q.numero}${q.regioes.length > 1 ? `, parte ${k + 1} de ${q.regioes.length}` : ""}`} />)}
      </section>

      <div className="questao-resposta" style={{ maxWidth: largura }}>
        {!mostrar ? (
          <button type="button" className="botao" onClick={verResposta}>Ver resposta</button>
        ) : !p.gabarito ? (
          <p className="indice-aviso">O gabarito deste caderno está fora do ar no site do Inep.</p>
        ) : gab.estado === "lendo" || gab.estado === "parado" ? (
          <p className="miudo" role="status">Lendo o gabarito oficial…</p>
        ) : gab.estado === "ok" && valor ? (
          <p className="gabarito-resposta" aria-live="polite">Resposta oficial: {/^[A-E]$/.test(valor.valor) ? <b className="letra">{valor.valor}</b> : <em className="anulada">questão anulada pelo Inep</em>}</p>
        ) : (
          <p className="indice-aviso">Não foi possível ler esta resposta no gabarito com segurança. <a href={p.gabarito.url} target="_blank" rel="noopener">Abra o gabarito oficial</a>.</p>
        )}
        <button type="button" className={`link-botao${marcada ? " ativo" : ""}`} aria-pressed={marcada} onClick={() => p.alternarRevisar(q.numero)}>{marcada ? "★ Marcada para revisar" : "☆ Marcar para revisar"}</button>
      </div>

      <nav className="questao-nav" style={{ maxWidth: largura }} aria-label="Navegar entre questões">
        <button type="button" className="botao botao-contorno" onClick={() => ir(i - 1)} disabled={i <= 0}>‹ Anterior</button>
        <button type="button" className="link-botao" onClick={() => p.aoVerNoCaderno(q.regioes[0].pagina)}>Ver no caderno (página {q.regioes[0].pagina})</button>
        <button type="button" className="botao" onClick={() => ir(i + 1)} disabled={i >= lista.length - 1}>Próxima ›</button>
      </nav>
      <p className="miudo questao-fonte" style={{ maxWidth: largura }}>Recorte automático do PDF oficial do Inep ({p.fonte}), desenhado no seu navegador. Se algo parecer cortado, use “Ver no caderno”.</p>
    </div>
  );
});

/** Um trecho de página: desenha a página e mostra só a região, sem as faixas brancas. */
function Recorte({ r, reg, paginaPt, largura, rotulo }: { r: RenderizadorPdf; reg: Regiao; paginaPt: number; largura: number; rotulo: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"espera" | "pronta" | "erro">("espera");
  const [texto, setTexto] = useState("");
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    let vivo = true;
    setEstado("espera");
    const larguraPagina = Math.round(largura * paginaPt / reg.w);
    r.renderizar(reg.pagina, larguraPagina, 5).then((pagina) => {
      if (!vivo) return;
      const c = recortarRegiao(pagina, paginaPt, reg);
      c.className = "questao-canvas";
      c.style.width = `${largura}px`;
      el.replaceChildren(c);
      setEstado("pronta");
    }).catch((e) => { if (vivo && !/cancel|destru/i.test(String(e?.message))) setEstado("erro"); });
    // Texto do trecho para leitores de tela (o canvas sozinho não é acessível).
    r.posicoes(reg.pagina).then((pg) => {
      if (!vivo) return;
      setTexto(pg.segs.filter((s) => s.x >= reg.x - 1 && s.x < reg.x + reg.w && s.y >= reg.y - 1 && s.y < reg.y + reg.h).map((s) => s.t).join("\n"));
    }).catch(() => {});
    return () => { vivo = false; el.replaceChildren(); };
  }, [r, reg, paginaPt, largura]);
  return (
    <figure className={`questao-trecho estado-${estado}`} aria-label={rotulo}>
      <div ref={caixa} aria-hidden="true" />
      {estado === "espera" && <div className="questao-espera" aria-hidden="true"><i /><i /><i className="curta" /></div>}
      {estado === "erro" && <p className="indice-aviso">Não foi possível desenhar este trecho.</p>}
      <figcaption className="sr-only">{texto}</figcaption>
    </figure>
  );
}
