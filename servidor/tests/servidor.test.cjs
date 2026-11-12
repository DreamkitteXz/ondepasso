const test = require('node:test');
const assert = require('node:assert/strict');
const { tratar, normalizar, novoCodigo } = require('../.test-build/nucleo.js');
const { kv, mercadoPago, aviso } = require('./simulado.cjs');

const B = 'https://ondepasso.com.br/api/relatorio';
const novo = (extra = {}) => { const mp = mercadoPago(); const amb = { KV: kv(), MP_TOKEN: 'APP_USR-teste', MP_SEGREDO_WEBHOOK: 'segredo', PRECO: '15.90', VALIDADE: '2027-02-28', URL_WEBHOOK: `${B}/webhook`, ...extra }; return { mp, amb }; };
const AGORA = Date.parse('2027-01-20T12:00:00-03:00');
const post = (rota, corpo) => new Request(`${B}/${rota}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
const chamar = async (ctx, req, agora = AGORA) => { const r = await tratar(req, ctx.amb, ctx.mp.buscar, agora); return { status: r.status, corpo: await r.json().catch(() => null), r }; };
const A1 = 'aparelho-0000000001', A2 = 'aparelho-0000000002', A3 = 'aparelho-0000000003', A4 = 'aparelho-0000000004';

async function comprarEAprovar(ctx) {
  const c = await chamar(ctx, post('comprar', { email: 'aluno@exemplo.com' }));
  assert.equal(c.status, 200);
  ctx.mp.aprovar(c.corpo.id);
  assert.equal((await chamar(ctx, aviso(B, 'segredo', c.corpo.id))).status, 200);
  const s = await chamar(ctx, new Request(`${B}/status?id=${c.corpo.id}&token=${c.corpo.token}`));
  return { ...c.corpo, codigo: s.corpo.codigo, s };
}

test('pagar por Pix libera um código; o código abre em até 3 aparelhos', async () => {
  const ctx = novo();
  const c = await chamar(ctx, post('comprar', { email: 'aluno@exemplo.com' }));
  assert.equal(c.corpo.preco, 15.9); assert.match(c.corpo.copiaCola, /PIX/);
  const pendente = await chamar(ctx, new Request(`${B}/status?id=${c.corpo.id}&token=${c.corpo.token}`));
  assert.deepEqual(pendente.corpo, { status: 'pendente' });
  ctx.mp.aprovar(c.corpo.id);
  await chamar(ctx, aviso(B, 'segredo', c.corpo.id));
  const ok = await chamar(ctx, new Request(`${B}/status?id=${c.corpo.id}&token=${c.corpo.token}`));
  assert.equal(ok.corpo.status, 'aprovado'); assert.match(ok.corpo.codigo, /^OP-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  for (const a of [A1, A2, A3, A1]) assert.equal((await chamar(ctx, post('ativar', { codigo: ok.corpo.codigo, aparelho: a }))).status, 200);
  const quarto = await chamar(ctx, post('ativar', { codigo: ok.corpo.codigo, aparelho: A4 }));
  assert.equal(quarto.status, 403); assert.equal(quarto.corpo.erro, 'aparelhos');
  // o e-mail não fica guardado em lugar nenhum
  assert.ok(![...ctx.amb.KV.m.values()].some((v) => v.includes('exemplo.com')));
});

test('o status aprova sozinho se o aviso do Mercado Pago não chegar', async () => {
  const ctx = novo();
  const c = await chamar(ctx, post('comprar', { email: 'a@b.co' }));
  ctx.mp.aprovar(c.corpo.id);
  const s = await chamar(ctx, new Request(`${B}/status?id=${c.corpo.id}&token=${c.corpo.token}`));
  assert.equal(s.corpo.status, 'aprovado');
  // avisos repetidos não trocam o código
  await chamar(ctx, aviso(B, 'segredo', c.corpo.id)); await chamar(ctx, aviso(B, 'segredo', c.corpo.id));
  const s2 = await chamar(ctx, new Request(`${B}/status?id=${c.corpo.id}&token=${c.corpo.token}`));
  assert.equal(s2.corpo.codigo, s.corpo.codigo);
});

test('ninguém pega o código só com o número do pagamento', async () => {
  const ctx = novo();
  const p = await comprarEAprovar(ctx);
  assert.equal((await chamar(ctx, new Request(`${B}/status?id=${p.id}&token=errado`))).status, 404);
  assert.equal((await chamar(ctx, new Request(`${B}/status?id=${p.id}`))).status, 404);
  assert.equal((await chamar(ctx, new Request(`${B}/status?id=999999&token=${p.token}`))).status, 404);
});

test('aviso sem assinatura válida é recusado; valor errado não aprova', async () => {
  const ctx = novo();
  const c = await chamar(ctx, post('comprar', { email: 'a@b.co' }));
  ctx.mp.aprovar(c.corpo.id);
  assert.equal((await chamar(ctx, aviso(B, 'outro-segredo', c.corpo.id))).status, 401);
  assert.equal((await chamar(ctx, aviso(B, 'segredo', c.corpo.id, { assinar: false }))).status, 401);
  ctx.mp.pagamentos.get(c.corpo.id).transaction_amount = 0.01;
  await chamar(ctx, aviso(B, 'segredo', c.corpo.id));
  const s = await chamar(ctx, new Request(`${B}/status?id=${c.corpo.id}&token=${c.corpo.token}`));
  assert.equal(s.corpo.status, 'pendente');
  // pagamento de outra origem (sem registro aqui) não cria nada
  ctx.mp.pagamentos.set('555', { id: 555, status: 'approved', transaction_amount: 15.9, currency_id: 'BRL', external_reference: 'x' });
  await chamar(ctx, aviso(B, 'segredo', 555));
  assert.ok(![...ctx.amb.KV.m.keys()].some((k) => k.startsWith('cod:')));
});

test('reembolso desativa o código', async () => {
  const ctx = novo();
  const p = await comprarEAprovar(ctx);
  assert.equal((await chamar(ctx, post('ativar', { codigo: p.codigo, aparelho: A1 }))).status, 200);
  ctx.mp.devolver(p.id);
  await chamar(ctx, aviso(B, 'segredo', p.id));
  const r = await chamar(ctx, post('ativar', { codigo: p.codigo, aparelho: A1 }));
  assert.equal(r.status, 403); assert.equal(r.corpo.erro, 'desativado');
});

test('validade, entradas ruins e servidor sem segredo', async () => {
  const ctx = novo();
  const p = await comprarEAprovar(ctx);
  const depois = Date.parse('2027-03-01T00:00:01-03:00');
  assert.equal((await chamar(ctx, post('ativar', { codigo: p.codigo, aparelho: A1 }), depois)).corpo.erro, 'vencido');
  assert.equal((await chamar(ctx, post('comprar', { email: 'a@b.co' }), depois)).status, 410);
  assert.equal((await chamar(ctx, post('comprar', { email: 'sem-arroba' }))).corpo.erro, 'email');
  assert.equal((await chamar(ctx, post('comprar', {}))).corpo.erro, 'email');
  assert.equal((await chamar(ctx, post('ativar', { codigo: 'OP-AAAA-AAAA-AAAA', aparelho: A1 }))).status, 404);
  assert.equal((await chamar(ctx, post('ativar', { codigo: p.codigo, aparelho: 'x' }))).status, 400);
  assert.equal((await chamar(ctx, post('ativar', { codigo: p.codigo.toLowerCase().replace(/-/g, ' '), aparelho: A1 }))).status, 200);
  assert.equal((await chamar(novo({ MP_TOKEN: '' }), post('comprar', { email: 'a@b.co' }))).status, 503);
  assert.equal(normalizar(' op abcd efgh jklm '), 'OP-ABCD-EFGH-JKLM');
  assert.equal(normalizar('ABCDEFGHJKLM'), 'OP-ABCD-EFGH-JKLM');
  assert.equal(normalizar(novoCodigo()).length, 17);
});

test('CORS só para as origens liberadas', async () => {
  const ctx = novo({ ORIGENS: 'http://localhost:3111' });
  const r = await tratar(new Request(`${B}/info`, { headers: { origin: 'http://localhost:3111' } }), ctx.amb, ctx.mp.buscar, AGORA);
  assert.equal(r.headers.get('access-control-allow-origin'), 'http://localhost:3111');
  const r2 = await tratar(new Request(`${B}/info`, { headers: { origin: 'https://outro.site' } }), ctx.amb, ctx.mp.buscar, AGORA);
  assert.equal(r2.headers.get('access-control-allow-origin'), null);
});
