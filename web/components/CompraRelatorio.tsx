"use client";
// Compra do relatório: e-mail → Pix (QR e copia-e-cola) → espera o pagamento → código de acesso. Ou digitar um código.
// A cobrança pendente fica guardada no navegador: no celular, ir ao app do banco e voltar não perde o Pix.
import { useEffect, useRef, useState } from "react";
import { RELATORIO_ATIVO, PRECO_TEXTO, TEXTO_ERRO, comprar, consultar, ativar, erroDe, type Cobranca, type Erro } from "@/lib/acesso";
import { registrar } from "@/lib/analytics";
import { SetaBotao } from "@/components/Manchete";

const CHAVE = "ondepasso.cobranca";
const lerPendente = (): Cobranca | null => { try { const c = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Cobranca | null; return c && c.expiraEm > Date.now() ? c : null; } catch { return null; } };
const guardarPendente = (c: Cobranca | null) => { try { if (c) localStorage.setItem(CHAVE, JSON.stringify(c)); else localStorage.removeItem(CHAVE); } catch { /* segue sem guardar */ } };

export function CompraRelatorio({ origem }: { origem: string }) {
  const [email, setEmail] = useState("");
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<Erro | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [temCodigo, setTemCodigo] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [venceu, setVenceu] = useState(false);
  const campoPix = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setCobranca(lerPendente()); }, []);

  // Enquanto há Pix pendente, pergunta ao servidor a cada 3 s se caiu. Aprovado → confere o código e libera.
  useEffect(() => {
    if (!cobranca) return;
    let vivo = true;
    const t = setInterval(async () => {
      if (Date.now() > cobranca.expiraEm) { guardarPendente(null); setCobranca(null); setVenceu(true); return; }
      try {
        const r = await consultar(cobranca);
        if (!vivo) return;
        if (r.status === "aprovado" && r.codigo) { clearInterval(t); await ativar(r.codigo); guardarPendente(null); registrar("en_relatorio_desbloqueado", { origem: "pix" }); }
        else if (r.status === "cancelado" || r.status === "devolvido") { guardarPendente(null); setCobranca(null); setVenceu(true); }
      } catch { /* rede oscilou: tenta de novo no próximo ciclo */ }
    }, 3000);
    return () => { vivo = false; clearInterval(t); };
  }, [cobranca]);

  if (!RELATORIO_ATIVO) return (
    <div className="compra">
      <p className="compra-preco"><strong>R$ {PRECO_TEXTO}</strong><span>pagamento único · chega em janeiro</span></p>
      <p className="miudo">A venda ainda não abriu. A prévia acima já usa as suas notas.</p>
    </div>
  );

  const gerar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(null); setVenceu(false); setOcupado(true);
    registrar("en_relatorio_compra_iniciada", { origem });
    try { const c = await comprar(email.trim()); guardarPendente(c); setCobranca(c); registrar("en_relatorio_pix_gerado", { origem }); }
    catch (x) { setErro(erroDe(x)); }
    setOcupado(false);
  };
  const usarCodigo = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(null); setOcupado(true);
    try { await ativar(codigo); registrar("en_relatorio_desbloqueado", { origem: "codigo" }); }
    catch (x) { setErro(erroDe(x)); }
    setOcupado(false);
  };
  const copiar = async () => {
    if (!cobranca) return;
    try { await navigator.clipboard.writeText(cobranca.copiaCola); setCopiado(true); setTimeout(() => setCopiado(false), 2500); }
    catch { campoPix.current?.select(); }
  };

  if (cobranca) return (
    <div className="compra compra-pix" aria-live="polite">
      <p className="compra-passo"><span className="ponto pulsa" />Aguardando o Pix de R$ {cobranca.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
      <div className="compra-pix-grade">
        {cobranca.qr && <img className="compra-qr" src={`data:image/png;base64,${cobranca.qr}`} width={180} height={180} alt="QR code do Pix" />}
        <div className="compra-pix-lado">
          <label htmlFor="pix-cc">Pix copia e cola</label>
          <textarea id="pix-cc" ref={campoPix} readOnly rows={3} value={cobranca.copiaCola} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="botao" onClick={copiar}>{copiado ? "Copiado" : "Copiar código Pix"}</button>
        </div>
      </div>
      <p className="miudo">Pague no app do seu banco. Esta tela libera o relatório sozinha em alguns segundos depois do pagamento; pode voltar aqui a qualquer momento. O Pix vale por 30 minutos.</p>
      <button type="button" className="link-mudo" onClick={() => { guardarPendente(null); setCobranca(null); }}>Cancelar e voltar</button>
    </div>
  );

  return (
    <div className="compra">
      <p className="compra-preco"><strong>R$ {PRECO_TEXTO}</strong><span>pagamento único por Pix · vale até o fim do Sisu 2027</span></p>
      {!temCodigo ? (
        <form onSubmit={gerar} className="compra-form">
          <label htmlFor="compra-email">Seu e-mail <span>(só para o recibo do Mercado Pago)</span></label>
          <div className="compra-linha">
            <input id="compra-email" type="email" required autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={erro === "email"} />
            <button className="botao botao-pilula" type="submit" disabled={ocupado}>{ocupado ? "Gerando…" : "Gerar Pix"}<SetaBotao /></button>
          </div>
        </form>
      ) : (
        <form onSubmit={usarCodigo} className="compra-form">
          <label htmlFor="compra-codigo">Código de acesso</label>
          <div className="compra-linha">
            <input id="compra-codigo" required autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="OP-XXXX-XXXX-XXXX" value={codigo} onChange={(e) => setCodigo(e.target.value)} aria-invalid={erro === "codigo"} />
            <button className="botao" type="submit" disabled={ocupado}>{ocupado ? "Conferindo…" : "Liberar"}</button>
          </div>
        </form>
      )}
      {erro && <p className="erro" role="alert">{TEXTO_ERRO[erro]}</p>}
      {venceu && !erro && <p className="erro" role="alert">O Pix anterior venceu ou foi cancelado. Gere outro.</p>}
      <p className="miudo compra-rodape">
        <button type="button" className="link-mudo" onClick={() => { setTemCodigo(!temCodigo); setErro(null); }}>{temCodigo ? "Ainda não tenho código" : "Já tenho um código"}</button>
        <span> · Reembolso em até 7 dias, sem perguntas · <a href="/relatorio/termos/">Termos</a></span>
      </p>
      <p className="miudo">Suas notas não saem do seu aparelho: o relatório é calculado aqui no navegador. Não é previsão de aprovação.</p>
    </div>
  );
}
