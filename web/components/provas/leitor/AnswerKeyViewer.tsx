"use client";
// Gabarito oficial do caderno: abre/baixa o PDF do Inep e, quando a tabela do PDF é lida por inteiro e confere,
// permite consultar a resposta por número de questão. Nunca inventa resposta: sem leitura completa, só o PDF.
import { useState } from "react";
import type { Arquivo } from "@/lib/provas-tipos";
import { megas } from "@/lib/provas-tipos";
import { abrirPdf, lerGabarito, type Gabarito } from "@/lib/leitor/pdf";
import { registrar } from "@/lib/analytics";

type Props = { provaId: string; identificacao: string; dia: 1 | 2; idioma?: "ingles" | "espanhol" | null; gabarito: Arquivo | null; aoAbrirNoLeitor?: () => void; compacto?: boolean };

export function AnswerKeyViewer({ provaId, identificacao, dia, idioma = null, gabarito, aoAbrirNoLeitor, compacto }: Props) {
  const [estado, setEstado] = useState<"parado" | "lendo" | "ok" | "incompleto" | "erro">("parado");
  const [dados, setDados] = useState<Gabarito | null>(null);
  const [q, setQ] = useState("");
  const [de, ate] = dia === 1 ? [1, 90] : [91, 180];

  if (!gabarito) {
    return (
      <div className={`gabarito-caixa${compacto ? " compacto" : ""}`}>
        <h3>Gabarito oficial</h3>
        <p className="miudo">{identificacao}</p>
        <p className="indice-aviso">O link do gabarito deste caderno na página do Inep está fora do ar (conferido em 08/11/2026). Assim que voltar, ele aparece aqui.</p>
      </div>
    );
  }

  async function consultar() {
    if (estado === "lendo" || dados) return;
    setEstado("lendo");
    registrar("enem_gabarito_aberto", { prova: provaId, modo: "consulta" });
    try {
      const { promessa } = await abrirPdf(gabarito!.url);
      const doc = await promessa;
      const g = await lerGabarito(doc, dia, idioma);
      void doc.loadingTask.destroy();
      setDados(g);
      setEstado(g.completo ? "ok" : "incompleto");
    } catch { setEstado("erro"); }
  }

  const n = Number(q);
  const valido = Number.isInteger(n) && n >= de && n <= ate;
  const resp = valido && dados?.completo ? dados.respostas.get(n) : undefined;

  return (
    <div className={`gabarito-caixa${compacto ? " compacto" : ""}`}>
      <h3>Gabarito oficial</h3>
      <p className="miudo">{identificacao}</p>
      <div className="gabarito-acoes">
        {aoAbrirNoLeitor && <button type="button" className="botao botao-pequeno" onClick={() => { registrar("enem_gabarito_aberto", { prova: provaId, modo: "leitor" }); aoAbrirNoLeitor(); }}>Ver gabarito</button>}
        <a className={`botao ${aoAbrirNoLeitor ? "botao-contorno " : ""}botao-pequeno`} href={gabarito.url} target="_blank" rel="noopener"
          onClick={() => registrar("enem_gabarito_aberto", { prova: provaId, modo: "pdf" })}>{aoAbrirNoLeitor ? "PDF" : "Ver gabarito"}</a>
        <a className="botao botao-contorno botao-pequeno" href={gabarito.url} target="_blank" rel="noopener" download
          onClick={() => registrar("enem_pdf_baixado", { prova: provaId, arquivo: "gabarito" })}>Baixar <span className="miudo">{megas(gabarito.bytes)}</span></a>
      </div>

      <div className="gabarito-consulta">
        {estado === "parado" && <button type="button" className="link-botao" onClick={consultar}>Consultar a resposta de uma questão</button>}
        {estado === "lendo" && <p className="miudo" role="status">Lendo o gabarito oficial…</p>}
        {estado === "erro" && <p className="indice-aviso">Não foi possível ler o gabarito agora. Abra o PDF oficial acima.</p>}
        {estado === "incompleto" && <p className="indice-aviso">A tabela deste gabarito não pôde ser lida por inteiro com segurança. Consulte o PDF oficial.</p>}
        {estado === "ok" && (
          <>
            <label className="gabarito-campo">
              <span>Questão ({de}–{ate})</span>
              <input inputMode="numeric" value={q} onChange={(e) => setQ(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder={String(de)} aria-describedby="gab-resp" />
            </label>
            <p id="gab-resp" className="gabarito-resposta" aria-live="polite">
              {!q ? "Digite o número da questão." : !valido ? `Este caderno vai da questão ${de} à ${ate}.` : resp ? (
                <>Questão {n}: {resp.respostas.map((r, i) => <span key={i} className="letra">{r.rotulo ? `${r.rotulo} ` : ""}{/^[A-E]$/.test(r.valor) ? <b>{r.valor}</b> : <em className="anulada">anulada pelo Inep</em>}</span>)}</>
              ) : "—"}
            </p>
            <p className="miudo">Lido do PDF oficial do Inep. Em caso de dúvida, vale o PDF. Acertos não viram nota: o Enem usa a TRI.</p>
          </>
        )}
      </div>
    </div>
  );
}
