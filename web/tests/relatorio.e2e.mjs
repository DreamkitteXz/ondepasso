// Teste de ponta a ponta do relatório pago, com o servidor SIMULADO (servidor/: npm run dev) e o site em modo dev:
//   NEXT_PUBLIC_RELATORIO_API=http://localhost:8787/api/relatorio NEXT_PUBLIC_RELATORIO_CONTATO=teste@exemplo.com npx next dev -p 3000
//   node tests/relatorio.e2e.mjs [pasta-das-capturas]
// Nenhum pagamento real: o servidor simulado aprova o "Pix" sozinho. CHROME=/caminho/do/chrome se o Playwright não tiver o dele.
import { createRequire } from "module";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE ?? "http://localhost:3000";
const SHOTS = process.argv[2] ?? "/tmp";
const NOTAS = { red: "760", lin: "640", mat: "712,5", ch: "655", cn: "698" };
const VALORES = ["760", "640", "712.5", "712,5", "655", "698"];
let falhas = 0, total = 0;
const ok = (cond, msg) => { total++; if (cond) console.log("  ✓ " + msg); else { falhas++; console.log("  ✗ " + msg); } };

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
async function pagina({ largura = 1280, altura = 900, tema = "claro", notas = NOTAS, extra = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await ctx.addInitScript(([n, t, e]) => {
    if (sessionStorage.getItem("semeado")) return; sessionStorage.setItem("semeado", "1");
    localStorage.clear();
    localStorage.setItem("ondepasso.tema", t); localStorage.setItem("ondepasso.consentimento", JSON.stringify({ d: "recusado", v: 1, em: Date.now() }));
    if (n) localStorage.setItem("ondepasso.areas", JSON.stringify(n));
    for (const [k, v] of Object.entries(e)) localStorage.setItem(k, JSON.stringify(v));
  }, [notas, tema, extra]);
  const p = await ctx.newPage();
  const pedidos = [];
  p.on("request", (r) => pedidos.push({ url: r.url(), corpo: r.postData() ?? "" }));
  await p.goto(`${BASE}/relatorio/`, { waitUntil: "domcontentloaded" });
  await p.evaluate((t) => { document.documentElement.dataset.tema = t; }, tema);
  return { ctx, p, pedidos };
}
const vazou = (pedidos) => pedidos.filter((r) => VALORES.some((v) => r.url.includes(v) || r.corpo.includes(v)));

console.log("Sem notas");
{
  const { ctx, p } = await pagina({ notas: null });
  await p.getByText("Preencha as cinco notas").waitFor();
  ok(true, "pede as cinco notas");
  await p.screenshot({ path: `${SHOTS}/rel-sem-notas.png`, fullPage: false });
  await ctx.close();
}

console.log("Prévia (sem código), desktop claro");
{
  const { ctx, p, pedidos } = await pagina();
  await p.getByRole("heading", { name: "Onde você está" }).waitFor({ timeout: 90000 });
  ok(await p.getByText("Modo exploração.").isVisible(), "sem cursos marcados: aviso de exploração");
  ok(await p.getByText(/^Recomendação grátis/).count() === 1, "uma recomendação grátis");
  const aberto = p.locator("details.rl-porque[open]");
  ok(await aberto.count() === 1, "só a recomendação grátis vem com o porquê aberto");
  ok(await aberto.getByText("Simulação: e se o corte").isVisible(), "a grátis mostra os cenários");
  ok(await p.locator(".rl-cadeado").count() >= 2, "listas trancadas na prévia");
  ok(await p.getByRole("checkbox", { name: "Finalista" }).count() === 0, "sem marcação de finalista na prévia");
  ok(await p.locator(".rl-checklist").count() === 0 && await p.locator(".rl-pdf").count() === 0, "plano e PDF só com acesso");
  ok(!(await p.content()).includes("passa com folga"), "sem 'passa com folga'");
  await p.screenshot({ path: `${SHOTS}/rel-previa-desktop.png`, fullPage: true });
  // Preferência: Medicina + relacionados; "Não faria" some das recomendações
  await p.getByLabel("Adicionar curso").fill("Medicina");
  await p.getByRole("button", { name: "Adicionar" }).click();
  await p.getByRole("button", { name: "Tirar Medicina" }).waitFor();
  ok(!(await p.getByText("Modo exploração.").isVisible()), "com curso marcado, sai da exploração");
  ok(await p.locator(".rl-curso strong").evaluateAll((e) => e.every((x) => x.textContent === "Medicina")), "só Medicina sem aceitar relacionados");
  await p.getByLabel("Aceito cursos relacionados").check();
  await p.waitForTimeout(300);
  const nomes = await p.locator(".rl-curso strong").allTextContents();
  ok(nomes.some((x) => x !== "Medicina"), "relacionados entram depois do aceite");
  const primeiro = p.locator(".rl-linha").first();
  const titulo = await primeiro.locator(".rl-curso").innerText();
  await primeiro.getByRole("button", { name: "Não faria" }).click();
  await p.waitForTimeout(300);
  ok(!(await p.locator(".rl-curso").allInnerTexts()).includes(titulo), "“Não faria” sai das listas");
  ok(await p.getByText(/marcada como “Não faria”|marcadas como “Não faria”/).isVisible(), "dá para desfazer o “Não faria”");
  ok(vazou(pedidos).length === 0, "nenhuma nota em URL ou pedido");
  await ctx.close();
}

console.log("Compra simulada, finalistas, plano e PDF");
{
  const { ctx, p, pedidos } = await pagina({ extra: { "ondepasso.relatorio-prefs": { cursos: ["medicina", "enfermagem"], relacionados: false, mobilidade: "brasil", ufs: [], cidade: null, noite: false, turnos: [], grupos: [], avaliacoes: {} } } });
  await p.getByRole("heading", { name: "Onde você está" }).waitFor({ timeout: 90000 });
  await p.locator("#compra-email").fill("aluno@exemplo.com");
  await p.getByRole("button", { name: /Gerar Pix/ }).click();
  await p.getByRole("heading", { name: "O que fazer agora" }).waitFor({ timeout: 30000 });
  ok(true, "Pix simulado aprovado e relatório liberado");
  const marcas = p.getByRole("checkbox", { name: "Finalista" });
  for (let k = 0; k < 3; k++) await marcas.nth(k).check();
  await p.locator(".rl-finais").waitFor();
  ok(await p.locator(".rl-finais thead th").count() === 4, "três finalistas lado a lado");
  await p.locator(".rl-finais").getByRole("button", { name: "1ª opção" }).first().click();
  await p.locator(".rl-finais").getByRole("button", { name: "2ª opção" }).nth(1).click();
  await p.locator(".rl-finais").getByRole("button", { name: "2ª opção" }).first().click(); // a 1ª vira 2ª: não pode ser as duas
  const pressionados = await p.locator(".rl-finais [aria-pressed=true]").count();
  ok(pressionados === 1, "a mesma opção não fica como 1ª e 2ª");
  await p.locator(".rl-finais").getByRole("button", { name: "1ª opção" }).nth(1).click();
  await p.locator(".rl-checklist input").first().check();
  await p.locator(".rl-finais").scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${SHOTS}/rel-completo-desktop.png`, fullPage: true });
  await p.reload(); await p.getByRole("heading", { name: "O que fazer agora" }).waitFor({ timeout: 90000 });
  ok(await p.locator(".rl-finais thead th").count() === 4, "finalistas guardadas no navegador");
  await p.emulateMedia({ media: "print" });
  ok(await p.locator(".rl-pdf").isVisible() && !(await p.locator(".rl-notas").isVisible()), "na impressão só sai o plano");
  await p.screenshot({ path: `${SHOTS}/rel-impressao.png`, fullPage: true });
  await p.pdf({ path: `${SHOTS}/rel-plano.pdf`, format: "A4", printBackground: true });
  await p.emulateMedia({ media: "screen" });
  ok(vazou(pedidos).length === 0, "nenhuma nota em URL ou pedido (inclusive na compra)");
  const externos = pedidos.filter((r) => !r.url.startsWith(BASE) && !r.url.startsWith("http://localhost:8787") && !r.url.startsWith("data:"));
  ok(externos.length === 0, `sem pedidos externos (${externos.map((r) => new URL(r.url).host).join(", ") || "nenhum"})`);
  // Celular, escuro
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => { document.documentElement.dataset.tema = "escuro"; });
  await p.screenshot({ path: `${SHOTS}/rel-completo-celular-escuro.png`, fullPage: true });
  // Barreira: sem o código, volta à prévia
  await p.evaluate(() => localStorage.removeItem("ondepasso.relatorio"));
  await p.reload(); await p.getByRole("heading", { name: "Onde você está" }).waitFor({ timeout: 90000 });
  ok(await p.locator(".rl-checklist").count() === 0 && await p.getByRole("checkbox", { name: "Finalista" }).count() === 0, "sem o código, volta a ser prévia");
  await ctx.close();
}

console.log("Celular escuro, prévia e estado sem resultado");
{
  const { ctx, p } = await pagina({ largura: 390, altura: 844, tema: "escuro" });
  await p.getByRole("heading", { name: "Onde você está" }).waitFor({ timeout: 90000 });
  const largura = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(largura <= 392, `sem rolagem lateral no celular (${largura}px)`);
  await p.screenshot({ path: `${SHOTS}/rel-previa-celular-escuro.png`, fullPage: true });
  await p.getByRole("radio", { name: "Só na minha cidade" }).click();
  await p.getByLabel("Estado").selectOption("AC");
  await p.getByLabel("Cidade").selectOption({ index: 1 });
  await p.getByLabel("Adicionar curso").fill("Medicina Veterinária");
  await p.getByRole("button", { name: "Adicionar" }).click();
  await p.getByText("Nenhuma opção com as suas preferências.").waitFor();
  ok(true, "estado vazio explica o que ficou de fora");
  await p.screenshot({ path: `${SHOTS}/rel-sem-resultado.png`, fullPage: false });
  await ctx.close();
}

await browser.close();
console.log(`\n${total - falhas}/${total} ok`);
process.exit(falhas ? 1 : 0);
