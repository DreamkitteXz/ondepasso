"use client";
// Acesso ao relatório pago: fala com o servidor de pagamento (servidor/ no repositório) e guarda o código no navegador.
// O que sai do aparelho: o e-mail (só na compra, repassado ao Mercado Pago), o código e um identificador aleatório
// do aparelho. As notas do Enem NUNCA saem: o relatório é calculado aqui.
//
// Liga com NEXT_PUBLIC_RELATORIO_API (ex.: /api/relatorio) e NEXT_PUBLIC_RELATORIO_CONTATO no build. Sem elas, o site fica como antes: nenhuma
// oferta aparece e /relatorio/ mostra só a explicação com "em breve".
import { useSyncExternalStore } from "react";

const API = (process.env.NEXT_PUBLIC_RELATORIO_API ?? "").trim().replace(/\/+$/, "");
/** E-mail de atendimento (reembolso, código perdido). Obrigatório para vender: aparece nos termos. */
export const CONTATO = (process.env.NEXT_PUBLIC_RELATORIO_CONTATO ?? "").trim();
export const RELATORIO_ATIVO = /^(\/[a-z0-9/_-]+|https?:\/\/[^\s]+)$/i.test(API) && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(CONTATO);
/** Só para os textos; quem cobra de verdade é o servidor (variável PRECO). Mantenha os dois iguais. */
export const PRECO_TEXTO = (process.env.NEXT_PUBLIC_RELATORIO_PRECO ?? "15,90").trim();

export type Acesso = { codigo: string; validade: string; conferido: number };
const CHAVE = "ondepasso.relatorio", CHAVE_APARELHO = "ondepasso.aparelho", EVENTO = "ondepasso:relatorio";

let memoria: { v: Acesso | null } | null = null;
function lerAgora(): Acesso | null {
  try {
    const a = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Acesso | null;
    return a && typeof a.codigo === "string" && typeof a.validade === "string" && Date.now() <= new Date(`${a.validade}T23:59:59-03:00`).getTime() ? a : null;
  } catch { return null; }
}
function guardar(a: Acesso | null) {
  try { if (a) localStorage.setItem(CHAVE, JSON.stringify(a)); else localStorage.removeItem(CHAVE); } catch { /* sem armazenamento: vale só nesta visita */ }
  memoria = { v: a };
  window.dispatchEvent(new Event(EVENTO));
}
function assinar(cb: () => void) {
  const f = () => { memoria = { v: lerAgora() }; cb(); };
  window.addEventListener(EVENTO, cb); window.addEventListener("storage", f);
  return () => { window.removeEventListener(EVENTO, cb); window.removeEventListener("storage", f); };
}
/** O acesso guardado neste navegador (null no HTML estático e para quem não comprou). */
export const useAcesso = () => useSyncExternalStore(assinar, () => (memoria ??= { v: lerAgora() }).v, () => null);
export const esquecerAcesso = () => guardar(null);

function aparelho(): string {
  try {
    let id = localStorage.getItem(CHAVE_APARELHO);
    if (!id || !/^[a-zA-Z0-9-]{16,64}$/.test(id)) { id = crypto.randomUUID(); localStorage.setItem(CHAVE_APARELHO, id); }
    return id;
  } catch { return crypto.randomUUID(); }
}

export type Erro = "email" | "pagamento" | "codigo" | "desativado" | "vencido" | "aparelhos" | "encerrado" | "fechado" | "rede";
export const TEXTO_ERRO: Record<Erro, string> = {
  email: "Confira o e-mail: ele é usado só para o recibo do Mercado Pago.",
  pagamento: "Não foi possível gerar o Pix agora. Tente de novo em instantes.",
  codigo: "Código não encontrado. Confira as letras e os números.",
  desativado: "Este código foi desativado (compra reembolsada).",
  vencido: "Este código venceu.",
  aparelhos: "Este código já foi usado no número máximo de aparelhos.",
  encerrado: "As vendas desta edição foram encerradas.",
  fechado: "A venda do relatório ainda não está aberta.",
  rede: "Sem conexão com o servidor. Confira a internet e tente de novo.",
};

async function chamar<T>(rota: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try { r = await fetch(`${API}/${rota}`, { ...init, headers: init?.body ? { "content-type": "application/json" } : undefined, cache: "no-store" }); }
  catch { throw new Error("rede"); }
  const j = await r.json().catch(() => ({})) as T & { erro?: string };
  if (!r.ok) throw new Error(j.erro && j.erro in TEXTO_ERRO ? j.erro : r.status === 404 ? "codigo" : "rede");
  return j;
}
export const erroDe = (e: unknown): Erro => (e instanceof Error && e.message in TEXTO_ERRO ? e.message as Erro : "rede");

export type Cobranca = { id: string; token: string; copiaCola: string; qr: string | null; preco: number; expiraEm: number };
export const comprar = (email: string) => chamar<Cobranca>("comprar", { method: "POST", body: JSON.stringify({ email }) });
export const consultar = (c: Pick<Cobranca, "id" | "token">) => chamar<{ status: "pendente" | "aprovado" | "cancelado" | "devolvido"; codigo?: string; validade?: string }>(`status?id=${encodeURIComponent(c.id)}&token=${encodeURIComponent(c.token)}`);

/** Confere o código no servidor e, se valer, guarda neste navegador. */
export async function ativar(codigo: string): Promise<Acesso> {
  const r = await chamar<{ ok: true; codigo: string; validade: string }>("ativar", { method: "POST", body: JSON.stringify({ codigo, aparelho: aparelho() }) });
  const a = { codigo: r.codigo, validade: r.validade, conferido: Date.now() };
  guardar(a);
  return a;
}

/** Reconfere um acesso guardado (no máximo uma vez por dia). Reembolso ou limite de aparelhos tiram o acesso; falha de rede não. */
export async function reconferir(a: Acesso): Promise<void> {
  if (Date.now() - a.conferido < 24 * 3600 * 1000) return;
  try { await ativar(a.codigo); } catch (e) { const k = erroDe(e); if (k === "desativado" || k === "vencido" || k === "aparelhos" || k === "codigo") guardar(null); }
}
