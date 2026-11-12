// Servidor do relatório pago do onde passo: cobra por Pix (Mercado Pago), entrega um código de acesso e confere o código.
// NUNCA recebe notas do Enem: o relatório é calculado no navegador do aluno. Aqui só passam o e-mail (repassado ao
// Mercado Pago para o recibo, sem ser guardado), o código e um identificador aleatório do aparelho.
//
// Este arquivo não depende do Cloudflare: recebe o armazenamento (KV) e o fetch por parâmetro, para ser testado no Node.

export type Guarda = { get(chave: string): Promise<string | null>; put(chave: string, valor: string, op?: { expirationTtl?: number }): Promise<void> };
export type Ambiente = {
  KV: Guarda;
  /** Access Token de PRODUÇÃO do Mercado Pago (segredo). */
  MP_TOKEN: string;
  /** Assinatura secreta do webhook, do painel do Mercado Pago (segredo). */
  MP_SEGREDO_WEBHOOK: string;
  /** Preço em reais, ex.: "15.90". */
  PRECO: string;
  /** Último dia de validade dos códigos (AAAA-MM-DD), ex.: fim do Sisu 2027. */
  VALIDADE: string;
  /** Endereço público deste servidor para o Mercado Pago avisar, ex.: https://ondepasso.com.br/api/relatorio/webhook */
  URL_WEBHOOK: string;
  /** Origens que podem chamar (CORS), separadas por vírgula. Vazio = só a mesma origem. */
  ORIGENS?: string;
  MAX_APARELHOS?: string;
};
type Buscar = (url: string, init?: RequestInit) => Promise<Response>;

type Pagamento = { token: string; status: "pendente" | "aprovado" | "cancelado" | "devolvido"; codigo?: string; criado: number };
type Codigo = { pagamento: string; ativo: boolean; aparelhos: string[]; criado: number };

const MP = "https://api.mercadopago.com";
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O e 1/I, para ditar e copiar sem erro
const DIA = 24 * 3600;

function aleatorio(n: number, alfabeto = ALFABETO): string {
  const b = new Uint8Array(n); crypto.getRandomValues(b);
  return [...b].map((x) => alfabeto[x % alfabeto.length]).join("");
}
/** Código no formato OP-XXXX-XXXX-XXXX (60 bits). */
export const novoCodigo = () => `OP-${aleatorio(4)}-${aleatorio(4)}-${aleatorio(4)}`;
export const normalizar = (s: unknown) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^OP/, "").replace(/(.{4})(?=.)/g, "$1-").replace(/^/, "OP-");
const CODIGO_OK = /^OP-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

async function hmacHex(segredo: string, texto: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(texto));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function igual(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

/** Confere o cabeçalho x-signature do Mercado Pago: "ts=...,v1=..." sobre "id:<data.id>;request-id:<x-request-id>;ts:<ts>;". */
export async function assinaturaValida(segredo: string, assinatura: string | null, idPedido: string | null, idDado: string): Promise<boolean> {
  if (!segredo || !assinatura) return false;
  const partes = Object.fromEntries(assinatura.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!partes.ts || !partes.v1) return false;
  const manifesto = `id:${idDado.toLowerCase()};request-id:${idPedido ?? ""};ts:${partes.ts};`;
  return igual(await hmacHex(segredo, manifesto), partes.v1);
}

const json = (corpo: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const erro = (codigo: string, status = 400) => json({ erro: codigo }, status);

const validade = (amb: Ambiente) => new Date(`${amb.VALIDADE}T23:59:59-03:00`).getTime();
const preco = (amb: Ambiente) => Math.round(Number(amb.PRECO) * 100) / 100;
/** Guarda os registros até 60 dias depois da validade (para reembolso e suporte) e então o KV apaga sozinho. */
const ttl = (amb: Ambiente, agora: number) => Math.max(DIA, Math.round((validade(amb) - agora) / 1000) + 60 * DIA);

async function ler<T>(kv: Guarda, chave: string): Promise<T | null> { const s = await kv.get(chave); return s ? JSON.parse(s) as T : null; }

/** Consulta o pagamento no Mercado Pago (a fonte da verdade) e atualiza o registro: aprova e cria o código, ou desativa se foi devolvido. */
async function sincronizar(amb: Ambiente, buscar: Buscar, id: string, agora: number): Promise<Pagamento | null> {
  const reg = await ler<Pagamento>(amb.KV, `pag:${id}`);
  if (!reg) return null; // pagamento que não nasceu aqui: ignora
  const r = await buscar(`${MP}/v1/payments/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${amb.MP_TOKEN}` } });
  if (!r.ok) return reg;
  const p = await r.json() as { status?: string; transaction_amount?: number; currency_id?: string; external_reference?: string };
  if (p.external_reference !== reg.token) return reg; // não é o pagamento que este registro criou
  const opcoes = { expirationTtl: ttl(amb, agora) };
  if (p.status === "approved" && reg.status === "pendente" && p.currency_id === "BRL" && Math.abs((p.transaction_amount ?? 0) - preco(amb)) < 0.005) {
    const codigo = novoCodigo();
    await amb.KV.put(`cod:${codigo}`, JSON.stringify({ pagamento: id, ativo: true, aparelhos: [], criado: agora } satisfies Codigo), opcoes);
    reg.status = "aprovado"; reg.codigo = codigo;
    await amb.KV.put(`pag:${id}`, JSON.stringify(reg), opcoes);
  } else if ((p.status === "refunded" || p.status === "charged_back") && reg.status !== "devolvido") {
    if (reg.codigo) { const c = await ler<Codigo>(amb.KV, `cod:${reg.codigo}`); if (c) { c.ativo = false; await amb.KV.put(`cod:${reg.codigo}`, JSON.stringify(c), opcoes); } }
    reg.status = "devolvido";
    await amb.KV.put(`pag:${id}`, JSON.stringify(reg), opcoes);
  } else if ((p.status === "cancelled" || p.status === "rejected") && reg.status === "pendente") {
    reg.status = "cancelado";
    await amb.KV.put(`pag:${id}`, JSON.stringify(reg), { expirationTtl: 7 * DIA });
  }
  return reg;
}

export async function tratar(req: Request, amb: Ambiente, buscar: Buscar = fetch, agora = Date.now()): Promise<Response> {
  const url = new URL(req.url);
  const rota = url.pathname.replace(/\/+$/, "").split("/").pop();
  const origem = req.headers.get("origin");
  const liberadas = (amb.ORIGENS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const cors: Record<string, string> = origem && liberadas.includes(origem) ? { "access-control-allow-origin": origem, "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET, POST, OPTIONS", vary: "origin" } : {};
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const responder = async (r: Promise<Response> | Response) => { const x = await r; for (const [k, v] of Object.entries(cors)) x.headers.set(k, v); return x; };
  const corpo = async () => { try { const t = await req.text(); return t.length > 4000 ? {} : JSON.parse(t || "{}") as Record<string, unknown>; } catch { return {}; } };

  // Sem segredo configurado, o servidor diz que a venda está fechada em vez de falhar no meio de um pagamento.
  if (!amb.MP_TOKEN || !amb.MP_SEGREDO_WEBHOOK || !(preco(amb) > 0) || Number.isNaN(validade(amb))) return responder(erro("fechado", 503));

  if (rota === "info" && req.method === "GET") return responder(json({ preco: preco(amb), validade: amb.VALIDADE, aberto: agora <= validade(amb) }));

  // 1. Criar a cobrança Pix
  if (rota === "comprar" && req.method === "POST") {
    if (agora > validade(amb)) return responder(erro("encerrado", 410));
    const { email } = await corpo();
    if (typeof email !== "string" || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return responder(erro("email"));
    const token = aleatorio(32, "abcdefghijklmnopqrstuvwxyz0123456789");
    const r = await buscar(`${MP}/v1/payments`, {
      method: "POST",
      headers: { authorization: `Bearer ${amb.MP_TOKEN}`, "content-type": "application/json", "x-idempotency-key": token },
      body: JSON.stringify({
        transaction_amount: preco(amb), description: "Relatório onde passo — Sisu 2027", payment_method_id: "pix",
        payer: { email }, external_reference: token, notification_url: amb.URL_WEBHOOK,
        date_of_expiration: new Date(agora + 30 * 60 * 1000).toISOString().replace("Z", "-00:00"),
      }),
    });
    if (!r.ok) return responder(erro("pagamento", 502));
    const p = await r.json() as { id?: number | string; point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } } };
    const dados = p.point_of_interaction?.transaction_data;
    if (p.id == null || !dados?.qr_code) return responder(erro("pagamento", 502));
    await amb.KV.put(`pag:${p.id}`, JSON.stringify({ token, status: "pendente", criado: agora } satisfies Pagamento), { expirationTtl: 2 * DIA });
    return responder(json({ id: String(p.id), token, copiaCola: dados.qr_code, qr: dados.qr_code_base64 ?? null, preco: preco(amb), expiraEm: agora + 30 * 60 * 1000 }));
  }

  // 2. O navegador pergunta se o Pix caiu (precisa do token devolvido na compra: o id sozinho não revela o código)
  if (rota === "status" && req.method === "GET") {
    const id = url.searchParams.get("id") ?? "", token = url.searchParams.get("token") ?? "";
    if (!/^\d{1,20}$/.test(id)) return responder(erro("id"));
    let reg = await ler<Pagamento>(amb.KV, `pag:${id}`);
    if (!reg || !igual(reg.token, token)) return responder(erro("nao-encontrado", 404));
    if (reg.status === "pendente") reg = (await sincronizar(amb, buscar, id, agora)) ?? reg; // rede de segurança se o aviso atrasar
    return responder(json({ status: reg.status, ...(reg.status === "aprovado" ? { codigo: reg.codigo, validade: amb.VALIDADE } : {}) }));
  }

  // 3. Aviso do Mercado Pago (pagou, devolveu, cancelou)
  if (rota === "webhook" && req.method === "POST") {
    const c = await corpo() as { type?: string; data?: { id?: string | number } };
    const id = String(url.searchParams.get("data.id") ?? c.data?.id ?? "");
    if (!/^\d{1,20}$/.test(id)) return json({ ok: true }); // outros tipos de aviso: nada a fazer
    if (!(await assinaturaValida(amb.MP_SEGREDO_WEBHOOK, req.headers.get("x-signature"), req.headers.get("x-request-id"), id))) return erro("assinatura", 401);
    await sincronizar(amb, buscar, id, agora);
    return json({ ok: true });
  }

  // 4. Conferir o código neste aparelho
  if (rota === "ativar" && req.method === "POST") {
    const { codigo: bruto, aparelho } = await corpo();
    const codigo = normalizar(bruto);
    if (!CODIGO_OK.test(codigo) || typeof aparelho !== "string" || !/^[a-zA-Z0-9-]{16,64}$/.test(aparelho)) return responder(erro("codigo"));
    const c = await ler<Codigo>(amb.KV, `cod:${codigo}`);
    if (!c) return responder(erro("codigo", 404));
    if (!c.ativo) return responder(erro("desativado", 403));
    if (agora > validade(amb)) return responder(erro("vencido", 403));
    if (!c.aparelhos.includes(aparelho)) {
      if (c.aparelhos.length >= Number(amb.MAX_APARELHOS ?? 3)) return responder(erro("aparelhos", 403));
      c.aparelhos.push(aparelho);
      await amb.KV.put(`cod:${codigo}`, JSON.stringify(c), { expirationTtl: ttl(amb, agora) });
    }
    return responder(json({ ok: true, codigo, validade: amb.VALIDADE }));
  }

  return responder(erro("rota", 404));
}
