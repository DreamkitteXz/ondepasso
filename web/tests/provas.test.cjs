const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const T = require('../.test-build/provas-tipos.js');

const site = path.join(__dirname, '..', '..', 'dados', 'saida', 'site');
const enem = JSON.parse(fs.readFileSync(path.join(site, 'provas.json'), 'utf-8'));
const vest = JSON.parse(fs.readFileSync(path.join(site, 'vestibulares.json'), 'utf-8'));
const F = T.FILTROS_VAZIOS;
const grupos = T.agrupar(enem.provas);

test('Enem não regrediu: mesmos cadernos, ids e agrupamento', () => {
  assert.equal(enem.provas.length, 144);
  assert.equal(new Set(enem.provas.map((p) => p.id)).size, 144);
  assert.ok(enem.provas.some((p) => p.id === 'enem-2025-primeiro-dia-caderno-1-azul'));
  assert.equal(T.filtrarGrupos(grupos, F).length, grupos.length);
  assert.equal(T.filtrarGrupos(grupos, { ...F, vestibular: 'enem' }).length, grupos.length);
  assert.deepEqual(T.filtrosDaUrl(new URLSearchParams('ano=2025&dia=1&cor=azul')), { ...F, ano: 2025, dia: 1, cor: 'azul' });
  assert.equal(T.filtrosParaUrl({ ...F, ano: 2025, dia: 1, cor: 'azul' }), '?ano=2025&dia=1&cor=azul');
});

test('catálogo da Fuvest: 2022 a 2026, 1ª fase e dois dias de 2ª fase por edição', () => {
  const fu = vest.exames.filter((e) => e.vestibular === 'fuvest');
  assert.equal(fu.length, 15);
  for (const ed of [2022, 2023, 2024, 2025, 2026]) {
    const daEd = fu.filter((e) => e.edicao === ed);
    assert.deepEqual(daEd.map((e) => [e.fase, e.dia]), [[1, null], [2, 1], [2, 2]], `edição ${ed}`);
  }
  assert.equal(new Set(vest.exames.map((e) => e.id)).size, vest.exames.length);
  assert.ok(!vest.exames.some((e) => enem.provas.some((p) => p.id === e.id)), 'id de exame não colide com caderno do Enem');
  // nada aqui pode abrir no leitor do site: os servidores não liberam
  const host = { fuvest: /^https:\/\/www\.fuvest\.br\//, unicamp: /^https:\/\/www\.comvest\.unicamp\.br\// };
  assert.ok(vest.exames.every((e) => [...e.versoes.map((v) => v.prova), ...e.complementares].every((d) => d.acesso === 'oficial' && host[e.vestibular].test(d.url) && d.procedencia.pagina)));
  // fora do recorte: simulado, competências específicas, notas de corte
  const urls = vest.exames.flatMap((e) => [...e.versoes.map((v) => v.prova.url), ...e.complementares.map((c) => c.url)]).join(' ');
  assert.ok(!/simulado|artes|musica|notas_de_corte|notas-de-corte/i.test(urls));
});

test('versões e gabarito: quantidade varia por edição e o gabarito é o da versão', () => {
  const por = Object.fromEntries(vest.exames.map((e) => [e.id, e]));
  assert.deepEqual(por['fuvest-2026-1a-fase'].versoes.map((v) => v.codigo), ['V1', 'V2', 'V3', 'V4']);
  assert.deepEqual(por['fuvest-2024-1a-fase'].versoes.map((v) => v.codigo), ['V', 'K', 'Q', 'X', 'Z']);
  assert.equal(por['fuvest-2026-2a-fase-1o-dia'].versoes.length, 1);
  const g = T.gabaritoDaVersao(por['fuvest-2024-1a-fase'], 'K');
  assert.equal(g.versoes, 'todas'); assert.equal(g.retificado, true); assert.equal(g.retificadoEm, '2023-11-24');
  assert.equal(T.gabaritoDaVersao(por['fuvest-2026-2a-fase-1o-dia'], 'unica'), null); // discursiva: sem gabarito de alternativas
  // gabarito específico de uma versão nunca serve a outra
  const falso = { ...por['fuvest-2024-1a-fase'], complementares: [{ tipo: 'gabarito', versoes: ['V'], url: 'x' }] };
  assert.equal(T.gabaritoDaVersao(falso, 'V').url, 'x'); assert.equal(T.gabaritoDaVersao(falso, 'K'), null);
});

test('discursivas, redação e ausência de respostas', () => {
  const por = Object.fromEntries(vest.exames.map((e) => [e.id, e]));
  assert.equal(por['fuvest-2026-2a-fase-1o-dia'].redacao, true);
  assert.equal(T.documentosDoTipo(por['fuvest-2026-2a-fase-1o-dia'], 'redacao-abordagem').length, 1);
  assert.equal(T.documentosDoTipo(por['fuvest-2026-2a-fase-2o-dia'], 'respostas-esperadas').length, 6);
  assert.equal(por['fuvest-2025-2a-fase-1o-dia'].redacao, null); // não verificado: não se afirma
  assert.equal(por['fuvest-2025-2a-fase-1o-dia'].complementares[0].escopo, 'fase');
  const l = por['fuvest-2022-2a-fase-1o-dia'].lacunas;
  assert.deepEqual(l.map((x) => [x.tipo, x.estado]), [['respostas-esperadas', 'nao-encontrado']]);
  assert.ok(T.DISPONIBILIDADE_ROTULO[l[0].estado]);
  assert.equal(new Set(Object.values(T.DISPONIBILIDADE_ROTULO)).size, 4); // quatro estados, quatro textos
  assert.equal(por['fuvest-2026-1a-fase'].dataAplicacao, '2025-11-23');
  // 1ª fase: data do cabeçalho do gabarito oficial (conferida no navegador em 13/11/2026)
  assert.deepEqual(['2022', '2023', '2024', '2025', '2026'].map((a) => por[`fuvest-${a}-1a-fase`].dataAplicacao), ['2021-12-12', '2022-12-04', '2023-11-19', '2024-11-17', '2025-11-23']);
  // 2ª fase: nenhum documento aberto traz a data de aplicação; sem fonte, sem data
  assert.ok(vest.exames.filter((e) => e.vestibular === 'fuvest' && e.fase === 2).every((e) => e.dataAplicacao === null));
  assert.equal(vest.vestibulares.find((v) => v.id === 'unicamp').estado, 'catalogado');
});

test('filtros por vestibular, edição, fase e dia', () => {
  const ex = vest.exames;
  assert.equal(T.filtrarExames(ex, F).length, 30);
  assert.equal(T.filtrarExames(ex, { ...F, vestibular: 'enem' }).length, 0);
  assert.equal(T.filtrarExames(ex, { ...F, vestibular: 'unicamp' }).length, 15);
  assert.equal(T.filtrarExames(ex, { ...F, vestibular: 'unicamp', ano: 2026 }).length, 3);
  assert.equal(T.filtrarExames(ex, { ...F, vestibular: 'fuvest', ano: 2026 }).length, 3);
  assert.equal(T.filtrarExames(ex, { ...F, fase: 1 }).length, 10);
  assert.equal(T.filtrarExames(ex, { ...F, fase: 2, dia: 2 }).length, 10);
  assert.equal(T.filtrarGrupos(grupos, { ...F, fase: 1 }).length, 0);        // o Enem não tem fases
  assert.equal(T.filtrarGrupos(grupos, { ...F, vestibular: 'fuvest' }).length, 0);
  for (const f of [{ cor: 'azul' }, { area: 'matematica' }, { acessivel: true }, { modalidade: 'digital' }]) assert.equal(T.filtrarExames(ex, { ...F, ...f }).length, 0);
  assert.equal(T.filtrarExames(ex, { ...F, modalidade: 'regular' }).length, 30);
  assert.equal(T.filtrarExames(ex, { ...F, busca: 'fuvest 2024 segunda fase' }).length, 2);
  assert.equal(T.filtrarExames(ex, { ...F, busca: 'unicamp 2024 segunda fase' }).length, 2);
  assert.equal(T.filtrarExames(ex, { ...F, vestibular: 'fuvest', busca: 'redação' }).length, 1);
  assert.equal(T.versaoInicial(ex.find((e) => e.id === 'fuvest-2024-1a-fase'), { ...F, busca: 'prova k' }).codigo, 'K');
  const u = T.filtrosParaUrl({ ...F, vestibular: 'fuvest', ano: 2026, fase: 2 });
  assert.equal(u, '?vestibular=fuvest&ano=2026&fase=2');
  assert.deepEqual(T.filtrosDaUrl(new URLSearchParams(u.slice(1))), { ...F, vestibular: 'fuvest', ano: 2026, fase: 2 });
  assert.equal(T.filtrosDaUrl(new URLSearchParams('vestibular=xyz&fase=9')).vestibular, null);
  assert.equal(T.tituloExame(ex.find((e) => e.id === 'fuvest-2026-2a-fase-1o-dia')), 'Fuvest 2026 · 2ª fase · 1º dia');
});

test('catálogo da Unicamp: 2022 a 2026, cadernos aos pares na 1ª fase e uma prova por área no 2º dia', () => {
  const un = vest.exames.filter((e) => e.vestibular === 'unicamp');
  const por = Object.fromEntries(un.map((e) => [e.id, e]));
  assert.equal(un.length, 15);
  for (const ed of [2022, 2023, 2024, 2025, 2026]) assert.deepEqual(un.filter((e) => e.edicao === ed).map((e) => [e.fase, e.dia]), [[1, null], [2, 1], [2, 2]], `edição ${ed}`);
  assert.deepEqual(por['unicamp-2026-1a-fase'].versoes.map((v) => v.codigo), ['Q e X', 'R e Y', 'S e Z', 'T e W']);
  // o gabarito da Unicamp é por par de versões, nunca o de outro par
  assert.match(T.gabaritoDaVersao(por['unicamp-2025-1a-fase'], 'R e W').url, /RW_gabarito/);
  assert.equal(T.gabaritoDaVersao(por['unicamp-2025-1a-fase'], 'Q e Z').url.includes('RW_'), false);
  // 2022: um gabarito único, para todos os cadernos; 2023: a página não lista gabarito (lacuna, não suposição)
  assert.equal(T.gabaritoDaVersao(por['unicamp-2022-1a-fase'], 'T e Y').versoes, 'todas');
  assert.equal(T.gabaritoDaVersao(por['unicamp-2023-1a-fase'], 'Q e Z'), null);
  assert.deepEqual(por['unicamp-2023-1a-fase'].lacunas.map((x) => [x.tipo, x.estado]), [['gabarito', 'nao-encontrado']]);
  // 2º dia: três provas de área, com respostas esperadas por área; 1º dia: caderno único com Redação
  for (const ed of [2022, 2023, 2024, 2025, 2026]) {
    const d2 = por[`unicamp-${ed}-2a-fase-2o-dia`], d1 = por[`unicamp-${ed}-2a-fase-1o-dia`];
    assert.deepEqual(d2.versoes.map((v) => v.codigo), ['Exatas', 'Biológicas', 'Humanas'], `2º dia ${ed}`);
    assert.equal(T.documentosDoTipo(d2, 'respostas-esperadas').length, 3);
    assert.equal(d1.versoes.length, 1); assert.equal(d1.redacao, true);
    assert.equal(T.documentosDoTipo(d1, 'redacao-abordagem').length, 1);
    assert.equal(T.documentosDoTipo(d1, 'respostas-esperadas').length, 1);
    assert.equal(T.porArea(d2), true); assert.equal(T.porArea(d1), false);
  }
  // sem lacunas além do gabarito de 2023; data de aplicação não conferida; HEAD 200 e tamanho registrados
  assert.equal(un.flatMap((e) => e.lacunas).length, 1);
  assert.ok(un.every((e) => e.dataAplicacao === null));
  assert.ok(un.every((e) => [...e.versoes.map((v) => v.prova), ...e.complementares].every((d) => d.bytes > 0 && d.procedencia.conferencia === 'head')));
  assert.equal(T.tituloExame(por['unicamp-2026-2a-fase-2o-dia']), 'Unicamp 2026 · 2ª fase · 2º dia');
});

test('banco de questões do Enem: um caderno de referência por aplicação/dia, sem repetir questão', () => {
  const qs = grupos.flatMap(T.questoesDoGrupo);
  const d1 = grupos.filter((g) => g.dia === 1).length, d2 = grupos.filter((g) => g.dia === 2).length;
  assert.equal(qs.length, d1 * 95 + d2 * 90); // 1º dia: 01–05 em inglês e em espanhol
  assert.equal(new Set(qs.map((q) => q.chave)).size, qs.length);
  // referência = menor número entre as cores (nunca Libras/braile)
  for (const g of grupos) {
    const ref = T.cadernosReferencia(g);
    assert.equal(ref.geral.variante, null);
    assert.equal(ref.geral.caderno, Math.min(...g.cores.map((p) => p.caderno)));
  }
  // área pelo número oficial; 1–5 com idioma
  const um = qs.filter((q) => q.grupo === grupos.find((g) => g.ano === 2025 && g.modalidade === 'regular' && g.dia === 1).chave);
  assert.deepEqual(um.filter((q) => q.numero === 3).map((q) => q.idioma), ['ingles', 'espanhol']);
  assert.equal(um.find((q) => q.numero === 46).area, 'humanas');
  assert.equal(um.find((q) => q.numero === 46).idioma, null);
  // digital: inglês e espanhol vêm de cadernos diferentes
  const dig = grupos.find((g) => g.modalidade === 'digital' && g.dia === 1);
  const q1 = T.questoesDoGrupo(dig).filter((q) => q.numero === 1);
  assert.equal(new Set(q1.map((q) => q.provaId)).size, 2);
  assert.match(q1.find((q) => q.idioma === 'espanhol').provaId, /espanhol/);
});

test('banco de questões: filtros, marcas do navegador e URL', () => {
  const qs = grupos.flatMap(T.questoesDoGrupo);
  const F = T.FILTROS_QUESTOES_VAZIOS;
  const vazio = new Map();
  const reg = T.filtrarQuestoes(qs, F, vazio);
  assert.ok(reg.every((q) => q.modalidade === 'regular' && q.idioma !== 'espanhol'));
  const g25 = grupos.filter((g) => g.ano === 2025 && g.modalidade === 'regular');
  assert.equal(T.filtrarQuestoes(qs, { ...F, ano: 2025 }, vazio).length, g25.length * 90);
  assert.ok(T.filtrarQuestoes(qs, { ...F, area: 'matematica' }, vazio).every((q) => q.numero >= 136));
  assert.equal(T.filtrarQuestoes(qs, { ...F, ano: 2025, numero: 136 }, vazio).length, 1);
  const esp = T.filtrarQuestoes(qs, { ...F, ano: 2025, area: 'linguagens', idioma: 'espanhol' }, vazio);
  assert.equal(esp.filter((q) => q.numero <= 5).every((q) => q.idioma === 'espanhol'), true);
  // marcas: revisar é por número no caderno; vistas por chave (com idioma)
  const alvo = qs.find((q) => q.ano === 2024 && q.modalidade === 'regular' && q.numero === 3 && q.idioma === 'espanhol');
  const marcas = new Map([[alvo.provaId, { revisar: [100], vistas: ['3-espanhol'] }]]);
  assert.deepEqual(T.filtrarQuestoes(qs, { ...F, situacao: 'vistas', idioma: 'espanhol' }, marcas).map((q) => q.chave), [alvo.chave]);
  assert.equal(T.filtrarQuestoes(qs, { ...F, situacao: 'vistas' }, marcas).length, 0); // em inglês, a 3 não foi vista
  assert.equal(T.filtrarQuestoes(qs, { ...F, situacao: 'revisar' }, marcas).length, 0); // 100 não é do 1º dia
  const naoVistas = T.filtrarQuestoes(qs, { ...F, situacao: 'nao-vistas', idioma: 'espanhol' }, marcas);
  assert.equal(naoVistas.length, T.filtrarQuestoes(qs, { ...F, idioma: 'espanhol' }, marcas).length - 1);
  // URL ida e volta; padrão = regular, inglês, todas
  const f = { ano: 2023, modalidade: null, area: 'humanas', idioma: 'espanhol', situacao: 'revisar', numero: 50 };
  const url = T.filtrosQuestoesParaUrl(f);
  assert.deepEqual(T.filtrosQuestoesDaUrl(new URLSearchParams(url)), f);
  assert.equal(T.filtrosQuestoesParaUrl(F), '');
  assert.deepEqual(T.filtrosQuestoesDaUrl(new URLSearchParams('?questao=999&area=x&situacao=y')), F);
  assert.deepEqual(T.lerChaveQuestao('3-espanhol'), { numero: 3, idioma: 'espanhol' });
  assert.equal(T.lerChaveQuestao('181'), null);
});
