// Universidades com vestibular próprio (USP/Fuvest e Unicamp/Comvest): regras de comparação e coerência dos dados curados.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { statusAcertos, lerAcertos, situacaoData, POR_POUCO_ACERTOS } = require("../.test-build/vestibular-proprio-tipos.js");

const PASTA = path.join(__dirname, "..", "..", "dados", "vestibulares", "universidades");
const ler = (s) => JSON.parse(fs.readFileSync(path.join(PASTA, `${s}.json`), "utf-8"));

test("status por acertos: supera, iguala, por pouco, abaixo e eliminado", () => {
  assert.equal(statusAcertos(50, 51, 24), "supera");
  assert.equal(statusAcertos(50, 50, 24), "igual");
  assert.equal(statusAcertos(50, 50 - POR_POUCO_ACERTOS, 24), "pouco");
  assert.equal(statusAcertos(50, 50 - POR_POUCO_ACERTOS - 1, 24), "abaixo");
  assert.equal(statusAcertos(24, 23, 24), "minimo");
  assert.equal(statusAcertos(16, 20, null), "supera");
});

test("lerAcertos aceita só inteiros dentro da prova", () => {
  assert.equal(lerAcertos(" 42 ", 80), 42);
  assert.equal(lerAcertos("0", 72), 0);
  assert.equal(lerAcertos("81", 80), null);
  assert.equal(lerAcertos("4,5", 80), null);
  assert.equal(lerAcertos("", 80), null);
});

test("calendário: passou, agora e próxima", () => {
  assert.equal(situacaoData({ data: "2026-11-01" }, "2026-11-19"), "passou");
  assert.equal(situacaoData({ data: "2026-12-06", fim: "2026-12-07" }, "2026-12-07"), "agora");
  assert.equal(situacaoData({ data: "2027-01-26" }, "2026-11-19"), "proxima");
});

test("USP: vagas por curso batem com a carreira e com o total da Fuvest 2027", () => {
  const u = ler("usp");
  const total = u.cursos.reduce((t, c) => t + c.vagas.AC + c.vagas.EP + c.vagas.PPI, 0);
  assert.equal(total, u.ingresso[0].vagas);
  assert.equal(u.cursos.reduce((t, c) => t + c.vagas.AC, 0), 4888);
  for (const k of u.carreiras) {
    const soma = u.cursos.filter((c) => c.carreira === k.cod).reduce((t, c) => t + c.vagas.AC + c.vagas.EP + c.vagas.PPI, 0);
    assert.equal(soma, k.vagas, `carreira ${k.cod}`);
    for (const m of ["AC", "EP", "PPI"]) if (k.corte[m] != null) assert.ok(k.corte[m] >= u.prova.minimo && k.corte[m] <= u.prova.questoes, `corte ${k.cod} ${m}`);
  }
  assert.equal(u.carreiras.find((k) => k.cod === 111).corte.AC, 68); // Medicina, divulgado pela Fuvest
  assert.ok(u.cursos.every((c) => u.unidades[c.unidade.split("/")[0]]), "toda unidade tem nome por extenso");
});

test("Unicamp: vagas do vestibular e de todas as formas de ingresso batem com o manual 2027", () => {
  const u = ler("unicamp");
  assert.equal(u.cursos.reduce((t, c) => t + c.vagas, 0), 2523);
  assert.equal(u.cursos.reduce((t, c) => t + c.vagasTotal, 0), 3358);
  assert.equal(u.cursos.find((c) => c.nome === "Medicina").corte, 62);
  assert.ok(u.cursos.filter((c) => c.corte != null).every((c) => c.corte <= u.prova.questoes));
  assert.equal(new Set(u.cursos.map((c) => c.id)).size, u.cursos.length);
});
