const test = require('node:test');
const assert = require('node:assert/strict');
const { analisar } = require('../.test-build/relatorio.js');
const P = require('../.test-build/plano.js');

// Base pequena: Medicina (Saúde), Física e Matemática (Exatas), Enfermagem (Saúde).
const calc = { ano: 2026, grupos: ['Saúde', 'Exatas'], mods: [{ cod: 'AC', nome: 'Ampla' }, { cod: 'LB_EP', nome: 'Cota' }],
  cursos: [{ curso: 'Medicina', slug: 'medicina', g: 0 }, { curso: 'Física', slug: 'fisica', g: 1 }, { curso: 'Enfermagem', slug: 'enfermagem', g: 0 }, { curso: 'Matemática', slug: 'matematica', g: 1 }],
  linhas: [
    [0, 'ufa-x', 'UFA', 'X', 'MG', [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], 0, { AC: 760 }],
    [1, 'ufb-y', 'UFB', 'Y', 'SP', [1, 1, 4, 1, 3], [0, 0, 0, 0, 0], 0, { AC: 700, LB_EP: 650 }],
    [2, 'ufc-z', 'UFC', 'Z', 'SP', [1, 1, 1, 1, 1], [800, 0, 0, 0, 0], 0, { AC: 600 }],
    [2, 'ufd-w', 'UFD', 'W', 'MG', [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], 0, { AC: 720 }],
    [3, 'ufe-v', 'UFE', 'V', 'RJ', [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], 0, { AC: 730 }],
  ] };
const rel = { ano: 2026, anosAntes: [2024, 2025], linhas: [
  ['Integral', 'Bacharelado', 'Pública Federal', 0, { AC: [770, 735] }, { AC: [40, 2000] }, { c: 'Campus Centro' }],
  ['Noturno', 'Licenciatura', 'Pública Federal', 20, { AC: [null, 690] }, { AC: [2, 10], LB_EP: [1, 3] }, { v: { AC: [4, 2] } }],
  ['Matutino', 'Bacharelado', 'Pública Estadual', 0, {}, { AC: [30, 60] }],
  ['Noturno', 'Bacharelado', 'Pública Federal', 0, { AC: [700, 705] }, { AC: [30, 300] }],
  ['Integral', 'Licenciatura', 'Pública Federal', 0, { AC: [725, 728] }, { AC: [30, 90] }],
] };
const n = [700, 700, 800, 700, 800]; // média simples 740
const cursos = new Map(calc.cursos.map((c) => [c.slug, c]));
const ops = (prefs, mod = 'AC') => analisar(calc, rel, n, mod, P.filtroDoMotor(prefs));
const com = (o) => ({ ...P.PREFS_VAZIAS, ...o });

test('extras da base: campus e vagas que mudaram (sem misturar modalidades)', () => {
  const [med, fis] = ops(P.PREFS_VAZIAS);
  assert.equal(med.campus, 'Campus Centro');
  assert.equal(fis.campus, null);
  assert.deepEqual(fis.vagasAntes, [{ ano: 2024, vagas: 4 }]); // 2025 teve as mesmas 2 vagas: não entra
  const cota = ops(P.PREFS_VAZIAS, 'LB_EP');
  assert.equal(cota.length, 1);
  assert.deepEqual(cota[0].hist.map((h) => h.ano), [2026]); // não usa o histórico da ampla
  assert.deepEqual(cota[0].vagasAntes, []);
});

test('preferências: leitura segura e aproveitamento do filtro antigo', () => {
  assert.deepEqual(P.lerPreferencias(null), P.PREFS_VAZIAS);
  const migrado = P.lerPreferencias(null, { ufs: ['SP'], grupos: [1, 'x'], turnos: ['Noturno'] });
  assert.equal(migrado.mobilidade, 'estados'); assert.deepEqual(migrado.ufs, ['SP']); assert.deepEqual(migrado.grupos, [1]);
  const p = P.lerPreferencias({ cursos: ['fisica', 3], mobilidade: 'lua', cidade: 'semuf', avaliacoes: { a: 'quero', b: 'talvez' }, noite: 'sim' });
  assert.deepEqual(p.cursos, ['fisica']); assert.equal(p.mobilidade, 'brasil'); assert.equal(p.cidade, null);
  assert.deepEqual(p.avaliacoes, { a: 'quero' }); assert.equal(p.noite, false);
});

test('restrições explícitas: noite, cidade e área só na exploração', () => {
  assert.deepEqual(P.filtroDoMotor(com({ noite: true, turnos: ['Integral'] })).turnos, ['Noturno']);
  assert.deepEqual(P.filtroDoMotor(com({ mobilidade: 'cidade', cidade: 'W|MG' })).ufs, ['MG']);
  assert.deepEqual(P.filtroDoMotor(com({ grupos: [1] })).grupos, [1]);
  assert.deepEqual(P.filtroDoMotor(com({ grupos: [1], cursos: ['medicina'] })).grupos, []);
  const prefs = com({ mobilidade: 'cidade', cidade: 'W|MG' });
  const a = P.aplicarPreferencias(ops(prefs), prefs, cursos);
  assert.deepEqual(a.consideradas.map((c) => c.rota), ['ufd-w']);
  assert.equal(a.foraDaCidade, 1); // a UFA também é de MG, mas de outra cidade
  const noite = com({ noite: true });
  assert.ok(P.aplicarPreferencias(ops(noite), noite, cursos).consideradas.every((c) => c.turno === 'Noturno'));
});

test('cursos, relacionados só com aceite, e "Não faria" fora de tudo', () => {
  const so = com({ cursos: ['medicina'] });
  assert.deepEqual(P.aplicarPreferencias(ops(so), so, cursos).consideradas.map((c) => c.slug), ['medicina']);
  const rel2 = com({ cursos: ['medicina'], relacionados: true });
  const a = P.aplicarPreferencias(ops(rel2), rel2, cursos);
  assert.deepEqual(a.consideradas.map((c) => c.slug).sort(), ['enfermagem', 'enfermagem', 'medicina']);
  assert.equal(a.consideradas.find((c) => c.slug === 'enfermagem').relacionadoA, 'Medicina');
  assert.equal(a.foraDoCurso, 2); // Física e Matemática são de outra área
  // relacionado vale pela área do curso marcado, mesmo sem oferta dele nesta seleção
  const semMed = com({ cursos: ['medicina'], relacionados: true, mobilidade: 'estados', ufs: ['SP'] });
  assert.deepEqual(P.aplicarPreferencias(ops(semMed), semMed, cursos).consideradas.map((c) => c.rota), ['ufc-z']);
  // avaliação explícita: "Consideraria" traz uma opção de fora; "Não faria" tira até um curso marcado
  const av = com({ cursos: ['medicina'], avaliacoes: { 'fisica/ufb-y': 'consideraria', 'medicina/ufa-x': 'nao' } });
  const b = P.aplicarPreferencias(ops(av), av, cursos);
  assert.deepEqual(b.consideradas.map((c) => c.rota), ['ufb-y']);
  assert.deepEqual(b.naoFaria.map((o) => o.rota), ['ufa-x']);
  const r = P.recomendar(b.consideradas);
  assert.ok(![...r.primeira, ...r.segunda].some((c) => c.rota === 'ufa-x'));
});

test('ordenação: preferência antes da margem; corte alto não é critério', () => {
  const prefs = com({ cursos: ['enfermagem', 'matematica'], avaliacoes: { 'enfermagem/ufd-w': 'quero' } });
  const cs = P.aplicarPreferencias(ops(prefs), prefs, cursos).consideradas;
  const r = P.recomendar(cs);
  // A Matemática (corte 730) vem depois da Enfermagem marcada como "Quero muito" (corte 720).
  assert.deepEqual(r.primeira.map((c) => c.rota), ['ufd-w', 'ufe-v']);
  // Sem a marcação, as duas são "curso que você marcou": na 1ª vem antes a mais perto do corte (margem 10 < 20);
  // na 2ª, a de maior margem. O corte, sozinho, não decide (a de corte mais alto, Medicina, nem está aqui).
  const sem = com({ cursos: ['enfermagem', 'matematica'] });
  const r3 = P.recomendar(P.aplicarPreferencias(ops(sem), sem, cursos).consideradas);
  assert.deepEqual(r3.primeira.map((c) => c.rota), ['ufe-v', 'ufd-w']);
  assert.deepEqual(r3.segunda.map((c) => c.rota), ['ufd-w', 'ufe-v']);
  // Nota mínima vai para o fim do mesmo grupo e não entra em 1ª nem 2ª.
  const min = com({ cursos: ['enfermagem'] });
  const r2 = P.recomendar(P.aplicarPreferencias(ops(min), min, cursos).consideradas);
  assert.ok(!r2.primeira.some((c) => c.rota === 'ufc-z'));
});

test('2ª opção só com o que o aluno aceitaria; exploração deixa claro', () => {
  const exp = P.aplicarPreferencias(ops(P.PREFS_VAZIAS), P.PREFS_VAZIAS, cursos).consideradas;
  assert.ok(exp.every((c) => c.vinculo === 'exploracao'));
  const r = P.recomendar(exp);
  assert.ok(r.primeira.length > 0);
  assert.equal(r.segunda.length, 0); // nada confirmado como aceito
  const marcada = com({ avaliacoes: { 'fisica/ufb-y': 'consideraria' } });
  const r2 = P.recomendar(P.aplicarPreferencias(ops(marcada), marcada, cursos).consideradas);
  assert.deepEqual(r2.segunda.map((c) => c.rota), ['ufb-y']);
  assert.match(P.motivos(exp[0], { prefs: P.PREFS_VAZIAS, grupos: calc.grupos }).join(' '), /exploração/);
});

test('margens: recente, maior corte histórico e edições, sem tratar ausência como zero', () => {
  const [med, fis] = ops(P.PREFS_VAZIAS);
  const m = P.margens(med); // 770 (2024), 735 (2025), 760 (2026); média 740
  assert.deepEqual(m.recente, { ano: 2026, corte: 760, margem: -20 });
  assert.deepEqual(m.maior, { ano: 2024, corte: 770, margem: -30 });
  assert.deepEqual(m.anos, [2024, 2025, 2026]); assert.deepEqual(m.supera, [2025]);
  const f = P.margens(fis); // 2024 sem corte (null): fica de fora, não vira 0
  assert.deepEqual(f.anos, [2025, 2026]); assert.deepEqual(f.supera, [2025, 2026]);
  assert.equal(f.maior.corte, 700);
});

test('cenários de +5, +10 e +20 sobre o corte mais recente', () => {
  const fis = ops(P.PREFS_VAZIAS)[1]; // média 770, corte 700
  assert.deepEqual(P.cenarios(fis).map((c) => [c.aumento, c.corte, c.margem, c.supera]), [[5, 705, 65, true], [10, 710, 60, true], [20, 720, 50, true]]);
  const enf = ops(P.PREFS_VAZIAS)[3]; // média 740, corte 720
  assert.deepEqual(P.cenarios(enf).map((c) => c.supera), [true, true, true]);
  const mat = ops(P.PREFS_VAZIAS)[4]; // média 740, corte 730
  assert.deepEqual(P.cenarios(mat).map((c) => c.supera), [true, true, false]);
});

test('regra da faixa explicada e nota mínima distinta de nota insuficiente', () => {
  const [med, fis, enfMin, enf] = ops(P.PREFS_VAZIAS);
  assert.match(P.regraFaixa(fis), /pelo menos 10,00 pontos/); // oscilação 10 → vale o mínimo
  assert.match(P.regraFaixa(fis), /Com folga/);
  assert.match(P.regraFaixa(med), /35,00 pontos, e esse é o limite/); // 770→735: variou 35
  assert.match(P.regraFaixa(med), /abaixo do corte/);
  assert.match(P.regraFaixa(enfMin), /nota mínima/); assert.doesNotMatch(P.regraFaixa(enfMin), /Sua média fica/);
  assert.equal(P.limiteFolga(enf), 15); // 705→720: variou 15
  const mot = P.motivos({ ...enfMin, vinculo: 'desejado', relacionadoA: null, avaliacao: null }, { prefs: P.PREFS_VAZIAS, grupos: calc.grupos });
  assert.ok(mot.some((t) => /Não disputa: a opção exige nota mínima em Redação/.test(t)));
  assert.ok(!mot.some((t) => /abaixo do corte de/.test(t)));
});

test('motivos e pendências usam os números reais da opção', () => {
  const fis = ops(P.PREFS_VAZIAS)[1];
  const c = { ...fis, vinculo: 'desejado', relacionadoA: null, avaliacao: null };
  const t = P.motivos(c, { prefs: com({ cursos: ['fisica'], noite: true }), grupos: calc.grupos }).join(' | ');
  assert.match(t, /Física é um dos cursos que você marcou/);
  assert.match(t, /Turno noturno, como você precisa/);
  assert.match(t, /de 740,00 para 770,00 \(\+30,00\)/);
  assert.match(t, /supera o corte de 2026 \(700,00\) por 70,00 pontos/);
  assert.match(t, /2 de 2 edições com dados \(2025 e 2026\)/);
  const pend = P.pendencias(fis, 2026).join(' | ');
  assert.match(pend, /bônus regional/); assert.match(pend, /2024: 4; 2026: 2/);
});

test('escolhas de 1ª e 2ª: avisos honestos', () => {
  const [med, fis] = ops(P.PREFS_VAZIAS);
  const fins = [{ ...med, vinculo: 'quero', relacionadoA: null, avaliacao: 'quero' }, { ...fis, vinculo: 'exploracao', relacionadoA: null, avaliacao: null }];
  const av = P.avisosEscolhas({ primeira: 'fisica/ufb-y', segunda: 'medicina/ufa-x' }, fins);
  assert.ok(av.some((t) => /2ª opção, sua média fica 20,00 pontos abaixo/.test(t)));
  const av2 = P.avisosEscolhas({ primeira: 'medicina/ufa-x', segunda: 'fisica/ufb-y' }, fins);
  assert.ok(av2.some((t) => /exploração/.test(t)));
});

test('barreira do acesso pago: sem código, só a primeira linha de cada lista', () => {
  assert.deepEqual(P.recorte([1, 2, 3], false), { visiveis: [1], escondidas: 2 });
  assert.deepEqual(P.recorte([1, 2, 3], true), { visiveis: [1, 2, 3], escondidas: 0 });
  assert.deepEqual(P.recorte([1, 2, 3, 4], false, 2), { visiveis: [1], escondidas: 1 });
  assert.deepEqual(P.recorte([], false), { visiveis: [], escondidas: 0 });
});

test('checklist: exigência só para a cota; o resto é sugestão, sem datas', () => {
  const ac = P.checklist('AC', 'Ampla');
  assert.equal(ac.filter((i) => i.tipo === 'exigencia').length, 0);
  const cota = P.checklist('LB_EP', 'Escola pública');
  assert.equal(cota[0].tipo, 'exigencia'); assert.match(cota[0].link.href, /l12711/);
  assert.ok(cota.every((i) => !/\d{1,2}\/\d{1,2}/.test(i.detalhe)));
});
