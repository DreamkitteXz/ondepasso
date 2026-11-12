// KV em memória e um Mercado Pago de mentira, para os testes e para o servidor local (dev.cjs).
const crypto = require('node:crypto');

function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }

/** Mercado Pago simulado: cria pagamentos Pix pendentes; `aprovar(id)` / `devolver(id)` mudam o status. */
function mercadoPago() {
  const pagamentos = new Map(); let seq = 1000;
  const buscar = async (url, init = {}) => {
    const u = new URL(url);
    if (!String(init.headers?.authorization ?? '').startsWith('Bearer ')) return new Response('{}', { status: 401 });
    if (init.method === 'POST' && u.pathname === '/v1/payments') {
      const b = JSON.parse(init.body); const id = ++seq;
      pagamentos.set(String(id), { id, status: 'pending', transaction_amount: b.transaction_amount, currency_id: 'BRL', external_reference: b.external_reference, payer: b.payer });
      return Response.json({ id, status: 'pending', point_of_interaction: { transaction_data: { qr_code: `00020126PIX-SIMULADO-${id}`, qr_code_base64: null } } }, { status: 201 });
    }
    const m = /^\/v1\/payments\/(\d+)$/.exec(u.pathname);
    if (m && pagamentos.has(m[1])) return Response.json(pagamentos.get(m[1]));
    return new Response('{}', { status: 404 });
  };
  return { buscar, pagamentos, aprovar: (id) => { pagamentos.get(String(id)).status = 'approved'; }, devolver: (id) => { pagamentos.get(String(id)).status = 'refunded'; } };
}

/** Requisição de webhook assinada como o Mercado Pago assina. */
function aviso(base, segredo, id, { assinar = true } = {}) {
  const ts = String(Date.now()), rid = crypto.randomUUID();
  const v1 = crypto.createHmac('sha256', segredo).update(`id:${id};request-id:${rid};ts:${ts};`).digest('hex');
  return new Request(`${base}/webhook?data.id=${id}&type=payment`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-request-id': rid, ...(assinar ? { 'x-signature': `ts=${ts},v1=${v1}` } : {}) }, body: JSON.stringify({ type: 'payment', data: { id: String(id) } }) });
}
module.exports = { kv, mercadoPago, aviso };
