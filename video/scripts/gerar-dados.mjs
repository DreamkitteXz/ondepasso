// Extrai do próprio site os dados REAIS usados no vídeo (nada é inventado):
// - pontos do mapa de Direito (cortes do Sisu 2026, ampla concorrência) já projetados no SVG do Brasil;
// - contornos dos estados (o mesmo geo-br.json do site);
// - a opção Direito · UFPB Santa Rita (cortes por cota e histórico) usada como exemplo.
// Rode depois de `npm run build` em web/ (precisa de web/out). Saída: src/data/dados.json
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..", "..");
const OUT = path.join(RAIZ, "web", "out");
const SITE = path.join(RAIZ, "dados", "saida", "site");
const ler = (f) => JSON.parse(fs.readFileSync(f, "utf-8"));

const NOTA = 720; // nota de exemplo usada no vídeo (ilustrativa)
const CURSO = "direito";
const OFERTA = "1110415"; // Direito · UFPB · Santa Rita · Noturno
const MOD = "AC";

const geo = ler(path.join(OUT, "geo-br.json"));
const mapa = ler(path.join(OUT, "mapa", `${CURSO}.json`));
const curso = ler(path.join(SITE, "curso", `${CURSO}.json`));
const nCursos = fs.readdirSync(path.join(SITE, "curso")).filter((f) => f.endsWith(".json")).length;

// Mesma regra de web/lib/formato.ts (statusNota) com a média única (sem pesos por área).
const POR_POUCO = 10;
const status = (corte, minha) =>
  Math.abs(minha - corte) < 1e-9 ? "igual" : minha > corte ? "supera" : corte - minha <= POR_POUCO ? "pouco" : "abaixo";

const pontos = mapa.pontos
  .filter((p) => p.m[MOD] != null)
  .map((p) => ({ r: p.r, i: p.i, c: p.c, u: p.u, x: p.x, y: p.y, corte: p.m[MOD], s: status(p.m[MOD], NOTA) }));
const conta = { supera: 0, igual: 0, pouco: 0, abaixo: 0 };
for (const p of pontos) conta[p.s]++;

const o = curso.ofertas.find((x) => x.id === OFERTA);
const CURTO = {
  AC: "Ampla concorrência", LI_EP: "Escola pública", LB_EP: "Escola pública + baixa renda",
  LI_PPI: "Escola pública + pretos, pardos e indígenas", LB_PPI: "Escola pública + baixa renda + PPI",
  LI_PCD: "Escola pública + pessoas com deficiência", LB_PCD: "Escola pública + baixa renda + PcD",
  LB_Q: "Escola pública + baixa renda + quilombolas",
};
const ano = Math.max(...curso.anos);
const cotas = Object.entries(o.cortes[String(ano)])
  .map(([cod, v]) => ({ cod, nome: CURTO[cod] ?? cod, vagas: v.vagas, inscritos: v.inscritos, corte: v.corte }))
  .sort((a, b) => (a.cod === "AC" ? -1 : b.cod === "AC" ? 1 : b.corte - a.corte));
const historico = curso.anos.map((a) => ({ ano: a, corte: o.cortes[String(a)]?.AC?.corte ?? null }));

const dados = {
  fonte: "Gerado por scripts/gerar-dados.mjs a partir de web/out e dados/saida/site (cortes oficiais do Sisu, MEC).",
  nota: NOTA,
  ano,
  nCursos,
  curso: { slug: mapa.slug, nome: mapa.curso, total: mapa.total, comCorte: pontos.length },
  conta,
  geo: { w: geo.w, h: geo.h, ufs: geo.ufs.map((u) => ({ uf: u.uf, nome: u.nome, d: u.d, box: u.box })) },
  pontos,
  oferta: {
    r: `ufpb-${OFERTA}`, curso: mapa.curso, ies: o.ies, iesNome: o.ies_nome, campus: o.campus, cidade: o.municipio, uf: o.uf,
    turno: o.turno, grau: o.grau, corte: o.cortes[String(ano)].AC.corte, diferenca: +(NOTA - o.cortes[String(ano)].AC.corte).toFixed(2),
    variacao: +(o.cortes[String(ano)].AC.corte - o.cortes[String(ano - 1)].AC.corte).toFixed(2),
    cotas, historico,
  },
  estado: (() => {
    const uf = o.uf; const doUf = pontos.filter((p) => p.u === uf); const c = { supera: 0, igual: 0, pouco: 0, abaixo: 0 };
    for (const p of doUf) c[p.s]++;
    return { uf, nome: geo.ufs.find((u) => u.uf === uf).nome, conta: c };
  })(),
  // Opções do mesmo estado (para a cena de clareza: uma de cada situação, todas reais).
  doEstado: pontos.filter((p) => p.u === o.uf).sort((a, b) => a.corte - b.corte),
  // Nomes reais de cursos (os mais ofertados), para o fundo da cena de escolha do curso.
  nomesCursos: ler(path.join(SITE, "cursos.json")).cursos.slice(0, 60).map((c) => c.curso),
  // Cortes reais de 2026 (ampla) que aparecem soltos na abertura.
  amostra: ["medicina", "direito", "psicologia", "enfermagem", "engenharia-civil"].flatMap((slug) => {
    const m = ler(path.join(OUT, "mapa", `${slug}.json`));
    return m.pontos.filter((p) => p.m.AC != null).sort((a, b) => b.n - a.n).slice(0, 3)
      .map((p) => ({ curso: m.curso, ies: p.i, cidade: p.c, uf: p.u, corte: p.m.AC }));
  }),
};

fs.mkdirSync(path.join(import.meta.dirname, "..", "src", "data"), { recursive: true });
fs.writeFileSync(path.join(import.meta.dirname, "..", "src", "data", "dados.json"), JSON.stringify(dados));
console.log(`ok: ${pontos.length} pontos (${JSON.stringify(conta)}), oferta ${o.ies} ${o.municipio} corte ${dados.oferta.corte}, ${nCursos} cursos`);
