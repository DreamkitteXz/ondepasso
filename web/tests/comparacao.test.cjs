const test = require('node:test');
const assert = require('node:assert/strict');
const { statusNota, lerNota, diferenca, contagemVazia } = require('../.test-build/formato.js');
const { suaMedia, statusPara, pesosCompactos } = require('../.test-build/minhas.js');

test('empate, faixas e precisão não confundem classificação', () => {
  assert.equal(statusNota(800, 800), 'igual');
  assert.equal(statusNota(800, 800 - 1e-12), 'igual');
  assert.equal(statusNota(800, 800.001), 'supera');
  assert.equal(statusNota(800, 799.999), 'pouco');
  assert.equal(statusNota(800, 790), 'pouco');
  assert.equal(statusNota(800, 789.999), 'abaixo');
  assert.notEqual(diferenca(0.001), '0,00');
});

test('entradas aceitam zero e decimal brasileiro, mas não vazios ou formatos ambíguos', () => {
  for (const [texto, nota] of [['0', 0], ['1000', 1000], ['712,40', 712.4], ['712.405', 712.405]]) assert.equal(lerNota(texto), nota);
  for (const texto of ['', ' ', '-1', '1000.01', 'NaN', '0x10', '7e2', '7 12', '1,2,3']) assert.equal(lerNota(texto), null);
});

test('ponderação mantém precisão antes de comparar', () => {
  const minha = { n: [799.99, 800, 800, 800, 800], media: 799.998 };
  const pesos = { p: [1, 1, 1, 1, 1] };
  assert.ok(suaMedia(minha, pesos).v < 800);
  assert.equal(statusPara(minha, pesos, 800), 'pouco');
});

test('mínimos por área e por média precedem o corte', () => {
  const minha = { n: [0, 900, 900, 900, 900], media: 720 };
  assert.equal(statusPara(minha, { mi: [1, 0, 0, 0, 0] }, 600), 'minimo');
  assert.equal(statusPara(minha, { mm: 750 }, 600), 'minimo');
  assert.equal(statusPara(minha, undefined, 600), 'supera');
});

test('pesos compactos preservam mínimos de 1 e soma das situações', () => {
  const p = pesosCompactos({ pesos: { red: 1, lin: 1, mat: 1, ch: 1, cn: 1 }, minimas: { red: 1 }, media_minima: 1 });
  assert.deepEqual(p.mi, [1, 0, 0, 0, 0]);
  assert.equal(p.mm, 1);
  const conta = contagemVazia();
  for (const n of [801, 800, 795, 700]) conta[statusNota(800, n)]++;
  assert.equal(Object.values(conta).reduce((a,b) => a+b, 0), 4);
});
