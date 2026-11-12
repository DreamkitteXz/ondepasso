// Servidor LOCAL do relatório, com um Mercado Pago simulado: nenhum dinheiro, nenhuma chamada externa.
// Uso: (em servidor/) npm run dev  →  http://localhost:8787/api/relatorio
// O "Pix" é aprovado sozinho 6 segundos depois de criado (mude com APROVAR_EM=segundos; 0 = nunca).
const http = require('node:http');
const { tratar } = require('./.test-build/nucleo.js');
const { kv, mercadoPago, aviso } = require('./tests/simulado.cjs');

const PORTA = Number(process.env.PORTA ?? 8787), BASE = `http://localhost:${PORTA}/api/relatorio`;
const mp = mercadoPago();
const amb = { KV: kv(), MP_TOKEN: 'simulado', MP_SEGREDO_WEBHOOK: 'simulado', PRECO: process.env.PRECO ?? '15.90', VALIDADE: process.env.VALIDADE ?? '2027-02-28', URL_WEBHOOK: `${BASE}/webhook`, ORIGENS: process.env.ORIGENS ?? 'http://localhost:3000,http://localhost:3111' };
const espera = Number(process.env.APROVAR_EM ?? 6);

http.createServer(async (q, s) => {
  const corpo = await new Promise((ok) => { let t = ''; q.on('data', (d) => (t += d)); q.on('end', () => ok(t)); });
  const req = new Request(`http://localhost:${PORTA}${q.url}`, { method: q.method, headers: q.headers, body: ['GET', 'HEAD'].includes(q.method) ? undefined : corpo });
  const r = await tratar(req, amb, mp.buscar);
  if (q.method === 'POST' && q.url.includes('/comprar') && r.ok && espera > 0) {
    const { id } = await r.clone().json();
    setTimeout(async () => { mp.aprovar(id); await tratar(aviso(BASE, 'simulado', id), amb, mp.buscar); console.log(`pagamento ${id} aprovado (simulado)`); }, espera * 1000);
  }
  s.writeHead(r.status, Object.fromEntries(r.headers)); s.end(await r.text());
}).listen(PORTA, () => console.log(`Relatório (SIMULADO) em ${BASE}`));
