const test = require('node:test');
const assert = require('node:assert/strict');
const { faixaDe, analisar, contarFaixas, estrategia, valemMais, extremos } = require('../.test-build/relatorio.js');

test('faixas: folga contra a oscilação do corte', () => {
  assert.equal(faixaDe(30, 12, null), 'segura');
  assert.equal(faixaDe(11, 12, null), 'provavel');   // passa, mas menos do que o corte já variou
  assert.equal(faixaDe(10, null, null), 'segura');   // sem histórico vale o padrão de 10
  assert.equal(faixaDe(0, 5, null), 'provavel');
  assert.equal(faixaDe(-0.01, 5, null), 'limite');
  assert.equal(faixaDe(-10, 5, null), 'limite');
  assert.equal(faixaDe(-10.01, 5, null), 'ousada');
  assert.equal(faixaDe(-25.01, 5, null), 'fora');
  assert.equal(faixaDe(50, 5, 'nota mínima em Redação: 600,00'), 'fora');
});

const calc = { ano: 2026, grupos: ['Saúde', 'Exatas'], mods: [{ cod: 'AC', nome: 'Ampla' }],
  cursos: [{ curso: 'Medicina', slug: 'medicina', g: 0 }, { curso: 'Física', slug: 'fisica', g: 1 }],
  linhas: [
    [0, 'ufa-x', 'UFA', 'X', 'MG', [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], 0, { AC: 790 }],
    [1, 'ufb-y', 'UFB', 'Y', 'SP', [1, 1, 4, 1, 3], [0, 0, 0, 0, 0], 0, { AC: 700, LB_EP: 650 }],
    [1, 'ufc-z', 'UFC', 'Z', 'SP', [1, 1, 1, 1, 1], [800, 0, 0, 0, 0], 0, { AC: 600 }],
    [0, 'ufd-w', 'UFD', 'W', 'RJ', [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], 0, { LB_EP: 500 }],
  ] };
const rel = { ano: 2026, anosAntes: [2024, 2025], linhas: [
  ['Integral', 'Bacharelado', 'Pública Federal', 0, { AC: [770, 795] }, { AC: [40, 2000] }],
  ['Noturno', 'Licenciatura', 'Pública Federal', 20, { AC: [null, 690] }, { AC: [2, 10], LB_EP: [1, 3] }],
  ['Matutino', 'Bacharelado', 'Pública Estadual', 0, {}, { AC: [30, 60] }],
  ['Integral', 'Bacharelado', 'Pública Federal', 0, {}, { LB_EP: [5, 5] }],
] };
const n = [700, 700, 800, 700, 800]; // red, lin, mat, ch, cn → média simples 740
const tudo = { ufs: [], grupos: [], turnos: [] };

test('analisar: média com pesos, histórico, alertas e mínimos', () => {
  const ops = analisar(calc, rel, n, 'AC', tudo);
  assert.equal(ops.length, 3); // a 4ª não tem corte na ampla
  const [med, fis, min] = ops;
  assert.equal(med.media, 740); assert.equal(med.folga, -50); assert.equal(med.faixa, 'fora');
  assert.deepEqual(med.hist.map((h) => h.corte), [770, 795, 790]);
  assert.equal(med.variacao, -5); assert.equal(med.oscilacao, 25);
  assert.equal(med.porVaga, 50); assert.ok(med.alertas.includes('concorrida'));
  assert.equal(fis.media, (700 + 700 + 3200 + 700 + 2400) / 10); // 770
  assert.equal(fis.ganho, 30); assert.equal(fis.folga, 70); assert.equal(fis.faixa, 'segura');
  assert.deepEqual(fis.hist.map((h) => h.ano), [2025, 2026]);
  assert.ok(fis.alertas.includes('bonus')); assert.ok(fis.alertas.includes('poucas-vagas'));
  assert.equal(min.faixa, 'fora'); assert.match(min.minimo, /Redação/);
  assert.ok(min.alertas.includes('sem-historico'));
});

test('filtros e modalidade', () => {
  assert.equal(analisar(calc, rel, n, 'AC', { ufs: ['SP'], grupos: [], turnos: [] }).length, 2);
  assert.equal(analisar(calc, rel, n, 'AC', { ufs: ['SP'], grupos: [], turnos: ['Noturno'] }).length, 1);
  assert.equal(analisar(calc, rel, n, 'AC', { ufs: [], grupos: [0], turnos: [] }).length, 1);
  const cota = analisar(calc, rel, n, 'LB_EP', tudo);
  assert.deepEqual(cota.map((o) => o.rota), ['ufb-y', 'ufd-w']);
  assert.equal(cota[0].vagas, 1);
});

test('resumo, estratégia e pesos que ajudam', () => {
  const ops = analisar(calc, rel, [780, 780, 780, 780, 780], 'AC', tudo);
  const c = contarFaixas(ops);
  assert.equal(c.segura + c.provavel + c.limite + c.ousada + c.fora, 3);
  const e = estrategia(ops);
  assert.deepEqual(e.primeira.map((o) => o.rota), ['ufa-x']); // 780 contra 790: no limite
  assert.deepEqual(e.segunda.map((o) => o.rota), ['ufb-y']);
  assert.equal(valemMais(ops).length, 0); // notas iguais: peso nenhum ajuda
  assert.deepEqual(valemMais(analisar(calc, rel, n, 'AC', tudo)).map((o) => o.rota), ['ufb-y']);
  assert.deepEqual(extremos([700, 650, 800, 700, 790]), { forte: 2, fraca: 1 });
});
