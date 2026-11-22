// Mapa "por questão" do Enem (lib/leitor/questoes.ts), com páginas sintéticas que reproduzem a diagramação real:
// coluna única e dupla, margens alternadas, faixas de cabeçalho/rodapé, texto de apoio, seções, idiomas e contracapa.
// A validação nos PDFs reais (60 cadernos, 2021–2025) está descrita em web/PROVAS.md; aqui ficam as regras.
const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../.test-build/leitor/questoes.js');

const W = 567, H = 780;
const seg = (x, y, w, t, h = 11) => ({ x, y, w, h, t });
const marca = () => [seg(65, 30, 370, 'ENEM2025ENEM2025ENEM2025ENEM2025'), seg(65, 700, 370, 'ENEM2025ENEM2025ENEM2025ENEM2025')];
const cab = (x, y, n) => seg(x, y, 60, `QUESTÃO ${String(n).padStart(2, '0')}`);
const linhas = (x, y0, y1, w = 250) => { const r = []; for (let y = y0; y <= y1; y += 12) r.push(seg(x, y, w, 'x')); return r; };
const pagina = (n, segs) => ({ n, largura: W, altura: H, segs });
// Página de duas colunas: cada coluna com as questões dadas, igualmente espaçadas. `cont` = texto de continuação no topo.
function duasColunas(n, esq, dir, { contEsq = false, contDir = false } = {}) {
  const off = n % 2 ? 0 : 7; // margens alternadas entre páginas pares e ímpares, como nos cadernos reais
  const col = (x, qs, cont) => {
    const s = []; let y = 50;
    if (cont) { s.push(...linhas(x, y, y + 60)); y += 80; }
    const passo = qs.length ? (680 - y) / qs.length : 0;
    for (const q of qs) { s.push(cab(x, y, q), ...linhas(x, y + 16, y + passo - 20)); y += passo; }
    return s;
  };
  return pagina(n, [...marca(), ...col(58 + off, esq, contEsq), ...col(321 + off, dir, contDir)]);
}
const umaColuna = (n, qs) => { const s = [...marca()]; let y = 50; const passo = 630 / qs.length; for (const q of qs) { s.push(cab(65, y, q), ...linhas(65, y + 16, y + passo - 20, 480)); y += passo; } return pagina(n, s); };

/** Caderno do 2º dia completo e simples: 4 questões por página, em duas colunas. */
function caderno2Dia() {
  const pags = [pagina(1, [seg(80, 300, 400, 'Este CADERNO DE QUESTÕES contém 90 questões')])];
  for (let q = 91, n = 2; q <= 180; n++) { const qs = [q, q + 1, q + 2, q + 3].filter((x) => x <= 180); pags.push(duasColunas(n, qs.slice(0, 2), qs.slice(2))); q += 4; }
  return pags;
}

test('segmentar junta o cabeçalho quebrado em pedaços ("Q|UEST|ã|O|01") e reconhece o número', () => {
  const s = Q.segmentar([{ s: 'Q', x: 65, y: 100, w: 8, h: 11 }, { s: 'UEST', x: 73, y: 100, w: 24, h: 11 }, { s: 'ã', x: 96, y: 100, w: 7, h: 11 }, { s: 'O', x: 103, y: 100, w: 7, h: 11 }, { s: '01', x: 114, y: 100, w: 11, h: 11 },
    { s: 'texto da outra coluna', x: 328, y: 100, w: 200, h: 11 }]);
  assert.equal(s.length, 2); // o vão entre as colunas não é juntado
  assert.equal(Q.numeroCabecalho(s[0].t), 1);
  for (const [t, n] of [['QUESTÃO 91', 91], ['Questão 180', 180], ['Questão 92 - Ciências da Natureza e suas Tecnologias', 92], ['QUESTÃO 1234', null], ['questiona a insalubridade', null], ['Questões de 01 a 45', null]]) assert.equal(Q.numeroCabecalho(t), n, t);
});

test('caderno completo: 90 questões, colunas em ordem de leitura, sem faixas', () => {
  const m = Q.mapearQuestoes(caderno2Dia(), 2);
  assert.equal(m.completo, true, m.problemas.join('; '));
  assert.equal(m.questoes.length, 90);
  const q = (n) => m.questoes.find((x) => x.numero === n);
  // página 2: 91 e 92 na esquerda, 93 e 94 na direita
  assert.deepEqual([91, 92, 93, 94].map((n) => [q(n).regioes[0].pagina, q(n).regioes[0].x < 300 ? 'esq' : 'dir']), [[2, 'esq'], [2, 'esq'], [2, 'dir'], [2, 'dir']]);
  // nenhuma região invade a marca d'água de cima (y≈30) ou de baixo (y≈700)
  assert.ok(m.questoes.every((x) => x.regioes.every((r) => r.y > 40 && r.y + r.h <= 700)));
  // a região da 91 termina antes do cabeçalho da 92
  assert.ok(q(91).regioes[0].y + q(91).regioes[0].h <= q(92).regioes[0].y + 3);
  // colunas não se sobrepõem
  assert.ok(q(91).regioes[0].x + q(91).regioes[0].w <= q(93).regioes[0].x + 1);
});

test('questão que passa da coluna esquerda para a direita e para a página seguinte', () => {
  const pags = caderno2Dia();
  // página 2: a 94 vira continuação da 93 no topo da página 3 (esquerda)
  pags[1] = duasColunas(2, [91, 92], [93]);
  pags[2] = duasColunas(3, [94, 95], [96, 97], { contEsq: true }); // topo da esquerda: resto da 93
  pags.splice(3); for (let q = 98, n = 4; q <= 180; n++) { const qs = [q, q + 1, q + 2, q + 3].filter((x) => x <= 180); pags.push(duasColunas(n, qs.slice(0, 2), qs.slice(2))); q += 4; }
  const m = Q.mapearQuestoes(pags, 2);
  assert.equal(m.completo, true, m.problemas.join('; '));
  const q93 = m.questoes.find((x) => x.numero === 93);
  assert.equal(q93.regioes.length, 2);
  assert.deepEqual(q93.regioes.map((r) => r.pagina), [2, 3]);
  assert.ok(q93.regioes[1].y < 60 && q93.regioes[1].x < 300); // topo da coluna esquerda da página 3
  const q94 = m.questoes.find((x) => x.numero === 94);
  assert.ok(q94.regioes[0].y >= q93.regioes[1].y + q93.regioes[1].h - 3); // a 94 começa depois do resto da 93
});

test('1º dia: texto de apoio comum, línguas estrangeiras, redação e título de área', () => {
  const p2 = pagina(2, [...marca(), seg(70, 50, 211, 'LINGUAGENS, CÓDIGOS E SUAS TECNOLOGIAS'), seg(70, 63, 92, 'Questões de 01 a 45'), seg(70, 76, 158, 'Questões de 01 a 05 (opção inglês)'),
    ...[1, 2, 3, 4, 5].flatMap((q, k) => [cab(65, 100 + k * 115, q), ...linhas(65, 116 + k * 115, 190 + k * 115, 480)])]);
  const p3 = pagina(3, [...marca(), seg(70, 50, 158, 'Questões de 01 a 05 (opção espanhol)'),
    ...[1, 2, 3, 4, 5].flatMap((q, k) => [cab(65, 80 + k * 120, q), ...linhas(65, 96 + k * 120, 180 + k * 120, 480)])]);
  const p4 = pagina(4, [...marca(), seg(70, 50, 300, 'Texto para as Questões de 06 a 07.'), ...linhas(65, 70, 400, 480), cab(65, 420, 6), ...linhas(65, 436, 520, 480), cab(65, 540, 7), ...linhas(65, 556, 680, 480)]);
  const resto = []; let n = 5;
  for (let q = 8; q <= 45; q += 4, n++) resto.push(duasColunas(n, [q, q + 1].filter((x) => x <= 45), [q + 2, q + 3].filter((x) => x <= 45)));
  const red = pagina(n++, [...marca(), seg(266, 50, 111, 'PROPOSTA DE REDAÇÃO'), ...linhas(65, 80, 680, 480)]);
  const hum = [pagina(n++, [...marca(), seg(70, 50, 198, 'CIÊNCIAS HUMANAS E SUAS TECNOLOGIAS'), seg(70, 63, 92, 'Questões de 46 a 90'), cab(65, 90, 46), ...linhas(65, 106, 680, 480)])];
  for (let q = 47; q <= 90; q += 4, n++) hum.push(duasColunas(n, [q, q + 1].filter((x) => x <= 90), [q + 2, q + 3].filter((x) => x <= 90)));
  const contracapa = pagina(n, [seg(200, 300, 200, 'enem2025'), ...linhas(65, 400, 600, 480)]);
  const m = Q.mapearQuestoes([pagina(1, [seg(80, 300, 400, 'capa')]), p2, p3, p4, ...resto, red, ...hum, contracapa], 1);
  assert.equal(m.completo, true, m.problemas.join('; '));
  assert.equal(m.questoes.length, 95);
  const q = (num, idioma = null) => m.questoes.find((x) => x.numero === num && x.idioma === idioma);
  assert.equal(q(1, 'ingles').regioes[0].pagina, 2);
  assert.equal(q(1, 'espanhol').regioes[0].pagina, 3);
  assert.equal(q(5, 'ingles').regioes.length, 1); // o título "(opção espanhol)" encerra a 5 em inglês
  assert.equal(q(6).apoio.length, 1); assert.equal(q(7).apoio.length, 1);
  assert.match(q(6).apoioRotulo, /Texto para as Questões de 06 a 07/);
  assert.ok(q(6).apoio[0].y + q(6).apoio[0].h <= q(6).regioes[0].y + 3);
  assert.equal(q(8).apoio.length, 0);
  const q45 = q(45), q46 = q(46);
  assert.ok(q45.regioes.every((r) => r.pagina < red.n), 'a 45 não pode entrar na proposta de redação');
  assert.ok(q46.regioes[0].y > 63, 'a 46 começa no cabeçalho, sem o título da área');
  assert.ok(q(90).regioes.every((r) => r.pagina < contracapa.n), 'a última questão não engole a contracapa');
  // caderno de um idioma só (digital): 1 a 5 aparecem uma vez, com o idioma do caderno
  const so = Q.mapearQuestoes([pagina(1, []), p2, ...resto.slice(0, 0)], 1, 'ingles');
  assert.ok(so.questoes.filter((x) => x.numero <= 5).every((x) => x.idioma === 'ingles'));
});

test('faixas sem marca d\'água: rodapé repetido e número da página ficam de fora; cabeçalho repetido de questão não', () => {
  const pags = caderno2Dia().map((p) => ({ ...p, segs: p.segs.filter((s) => !/ENEM2025/.test(s.t)).concat(p.n > 1 ? [seg(65, 752, 300, `MT - 2° dia | Caderno 5 - AMARELO - Página ${p.n}`), seg(540, 752, 10, String(p.n))] : []) }));
  const m = Q.mapearQuestoes(pags, 2);
  assert.equal(m.completo, true, m.problemas.join('; '));
  assert.ok(m.questoes.every((x) => x.regioes.every((r) => r.y + r.h < 752)), 'o rodapé não entra no recorte');
  // caderno digital: uma questão por página, cabeçalho colado no alto e repetido ("Questão N - Área")
  const dig = []; for (let q = 91; q <= 180; q++) dig.push({ n: q - 88, largura: 842, altura: 1190, segs: [seg(151, 26, 248, `Questão ${q} - Ciências da Natureza e suas Tecnologias`), ...linhas(150, 67, 900, 540)] });
  const md = Q.mapearQuestoes([{ n: 1, largura: 842, altura: 1190, segs: [seg(200, 400, 300, 'UTILIZANDO O SISTEMA')] }, { n: 2, largura: 842, altura: 1190, segs: [] }, ...dig], 2);
  assert.equal(md.completo, true, md.problemas.join('; '));
  assert.ok(md.questoes.every((x) => x.regioes.length === 1 && x.regioes[0].pagina === x.numero - 88));
});

test('quando falta uma questão (cabeçalho fora da camada de texto), o mapa não é completo', () => {
  const pags = caderno2Dia();
  const k = pags.findIndex((p) => p.segs.some((s) => Q.numeroCabecalho(s.t) === 112));
  pags[k] = { ...pags[k], segs: pags[k].segs.filter((s) => Q.numeroCabecalho(s.t) !== 112) };
  const m = Q.mapearQuestoes(pags, 2);
  assert.equal(m.completo, false);
  assert.ok(m.problemas.some((p) => /questão 112: 0 ocorrência/.test(p)));
  // e não inventa nada: as vizinhas continuam lá
  assert.ok(m.questoes.some((x) => x.numero === 111) && m.questoes.some((x) => x.numero === 113));
});

test('página de uma coluna com cabeçalhos só na esquerda continua sendo de uma coluna', () => {
  const pags = caderno2Dia();
  pags[3] = umaColuna(4, [99, 100, 101, 102]);
  const m = Q.mapearQuestoes(pags, 2);
  assert.equal(m.completo, true, m.problemas.join('; '));
  assert.ok(m.questoes.find((x) => x.numero === 100).regioes[0].w > 400);
});
