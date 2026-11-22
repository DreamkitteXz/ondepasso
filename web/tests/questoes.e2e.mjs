// Teste ponta a ponta do modo "Por questão" do leitor (Playwright).
// Uso: BASE=http://localhost:3100 PDFS=/pasta node tests/questoes.e2e.mjs [pasta-de-capturas]
// PDFS/ tem cadernos SINTÉTICOS com a diagramação do Enem, gerados por tests/fixtures/gerar_cadernos_sinteticos.py
// (`python3 tests/fixtures/gerar_cadernos_sinteticos.py <pasta>`, precisa de reportlab; não são provas reais), servidos no
// lugar dos arquivos do Inep. A conferência nos PDFs reais (60 cadernos de 2021 a 2025) é descrita em web/PROVAS.md.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE ?? "http://localhost:3100";
const PDFS = process.env.PDFS ?? "";
const SAIDA = process.argv[2] ?? "questoes-e2e";
fs.mkdirSync(SAIDA, { recursive: true });
let falhas = 0;
const ok = (c, msg) => { console.log(`${c ? "✓" : "✗"} ${msg}`); if (!c) falhas++; };
const erros = [];

async function servir(ctx) {
  await ctx.route("https://download.inep.gov.br/**", async (route) => {
    const local = PDFS && path.join(PDFS, `teste-${route.request().url().split("/").pop()}`);
    if (local && fs.existsSync(local)) return route.fulfill({ status: 200, contentType: "application/pdf", body: fs.readFileSync(local), headers: { "access-control-allow-origin": "*" } });
    return route.abort("failed");
  });
}
async function abrir(page, id) {
  page.on("pageerror", (e) => erros.push(`${id}: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") erros.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}/provas/${id}/#ler`);
  await page.waitForSelector(".folha-papel.pronta canvas", { timeout: 30000 });
  await page.getByRole("radio", { name: "Por questão" }).click();
  await page.waitForSelector(".questao-trecho.estado-pronta canvas", { timeout: 30000 });
}
const titulo = (page) => page.locator(".questao-cabeca h2").innerText();

const browser = await chromium.launch();

// ------------------------------------------------------------ 2º dia
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await servir(ctx);
  const page = await ctx.newPage();
  await abrir(page, "enem-2025-segundo-dia-caderno-5-amarelo");
  ok(/Questão 91/.test(await titulo(page)), `abre na primeira questão (${await titulo(page)})`);
  ok(/1 de 90/.test(await page.locator(".questao-cabeca .miudo").innerText()), "90 questões separadas");
  const alt = await page.locator(".questao-trecho canvas").evaluate((c) => c.height / c.width);
  ok(alt > 0.3 && alt < 2, `recorte com proporção de uma questão, não de uma página (altura/largura ${alt.toFixed(2)})`);
  ok(await page.locator(".questao-resposta").getByText(/Resposta oficial/).count() === 0, "resposta escondida até pedir");
  await page.screenshot({ path: `${SAIDA}/01-questao-91.png` });
  await page.getByRole("button", { name: "Ver resposta" }).click();
  await page.waitForSelector(".gabarito-resposta", { timeout: 15000 });
  ok(/Resposta oficial:\s*B/.test(await page.locator(".gabarito-resposta").innerText()), `resposta da 91 vem do gabarito oficial (${await page.locator(".gabarito-resposta").innerText()})`);
  await page.screenshot({ path: `${SAIDA}/02-resposta.png` });
  await page.getByRole("button", { name: "Próxima ›" }).click();
  await page.waitForSelector(".questao-trecho.estado-pronta canvas");
  ok(/Questão 92/.test(await titulo(page)), "próxima vai para a 92");
  ok(await page.locator(".gabarito-resposta").count() === 0, "ao trocar de questão a resposta volta a ficar escondida");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  ok(/Questão 93/.test(await titulo(page)), "seta → também avança");
  await page.locator(".questao-ir select").selectOption({ label: "Questão 150" });
  await page.waitForSelector(".questao-trecho.estado-pronta canvas");
  await page.getByRole("button", { name: "Ver resposta" }).click();
  await page.waitForSelector(".gabarito-resposta, .questao-resposta .indice-aviso", { timeout: 15000 });
  ok(/anulada/.test(await page.locator(".questao-resposta").innerText()), "questão anulada aparece como anulada");
  await page.getByRole("button", { name: /Marcar para revisar/ }).click();
  ok(await page.getByRole("button", { name: /Marcada para revisar/ }).count() === 1, "marcar para revisar");
  // Volta ao ponto: recarregar mantém o modo e a questão
  await page.reload();
  await page.waitForSelector(".questao-trecho.estado-pronta canvas", { timeout: 30000 });
  ok(/Questão 150/.test(await titulo(page)), `reabre na questão onde parou (${await titulo(page)})`);
  ok((await page.locator(".questao-ir select option:checked").innerText()).includes("★"), "a marca de revisão fica salva");
  // Ver no caderno: volta ao modo livro na página da questão
  const alvo = (await page.getByRole("button", { name: /Ver no caderno/ }).innerText()).match(/página (\d+)/)[1];
  await page.getByRole("button", { name: /Ver no caderno/ }).click();
  await page.waitForTimeout(1500);
  const pag = await page.locator(".leitor-pagina input").inputValue();
  ok(await page.getByRole("radio", { name: "Caderno" }).getAttribute("aria-checked") === "true" && Math.abs(Number(pag) - Number(alvo)) <= 1, `“Ver no caderno” volta ao modo caderno na página da questão (${alvo} → ${pag})`);
  await page.screenshot({ path: `${SAIDA}/05-ver-no-caderno.png` });
  await ctx.close();
}

// ------------------------------------------------------------ 1º dia: idioma e texto de apoio
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await servir(ctx);
  const page = await ctx.newPage();
  await abrir(page, "enem-2025-primeiro-dia-caderno-1-azul");
  ok(/Questão 01.*Inglês/s.test(await titulo(page)), `1º dia começa na 01 em inglês (${await titulo(page)})`);
  await page.getByRole("group", { name: /Língua estrangeira/ }).getByRole("button", { name: "Espanhol" }).click();
  await page.waitForSelector(".questao-trecho.estado-pronta canvas");
  ok(/Questão 01.*Espanhol/s.test(await titulo(page)), "troca para espanhol na mesma questão");
  await page.getByRole("button", { name: "Ver resposta" }).click();
  await page.waitForSelector(".gabarito-resposta", { timeout: 15000 });
  ok(/Resposta oficial:\s*D/.test(await page.locator(".gabarito-resposta").innerText()), "resposta do espanhol é a 2ª coluna do gabarito");
  ok(/de 90/.test(await page.locator(".questao-cabeca .miudo").innerText()), "com um idioma escolhido, o caderno tem 90 questões");
  await page.locator(".questao-ir select").selectOption({ label: "Questão 06" });
  await page.waitForSelector(".questao-apoio .questao-trecho.estado-pronta canvas");
  ok(/Texto para as Questões de 06 a 07/i.test(await page.locator(".questao-apoio .rotulo").innerText()), "texto de apoio comum aparece antes da questão 06");
  await page.screenshot({ path: `${SAIDA}/03-apoio.png` });
  await page.locator(".questao-ir select").selectOption({ label: "Questão 08" });
  await page.waitForTimeout(400);
  ok(await page.locator(".questao-apoio").count() === 0, "a 08 não tem texto de apoio");
  await ctx.close();
}

// ------------------------------------------------------------ celular
{
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  await servir(ctx);
  const page = await ctx.newPage();
  await abrir(page, "enem-2025-segundo-dia-caderno-5-amarelo");
  const larg = await page.locator(".questao-trecho canvas").evaluate((c) => c.getBoundingClientRect().width);
  ok(larg > 300 && larg <= 390, `no celular o recorte ocupa a largura da tela (${Math.round(larg)}px)`);
  const vazou = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok(!vazou, "sem rolagem horizontal no celular");
  await page.screenshot({ path: `${SAIDA}/04-celular.png`, fullPage: false });
  await ctx.close();
}

// ------------------------------------------------------------ caderno que não fecha: modo não é oferecido com recortes
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route("https://download.inep.gov.br/**", async (route) => {
    const nome = route.request().url().split("/").pop();
    // Serve o caderno do 1º dia no lugar do 2º: as questões 91 a 180 não existem nele
    const local = path.join(PDFS, nome.includes("_PV_") ? "teste-2025_PV_impresso_D1_CD1.pdf" : `teste-${nome}`);
    if (fs.existsSync(local)) return route.fulfill({ status: 200, contentType: "application/pdf", body: fs.readFileSync(local), headers: { "access-control-allow-origin": "*" } });
    return route.abort("failed");
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erros.push(`incompleto: ${e.message}`));
  await page.goto(`${BASE}/provas/enem-2025-segundo-dia-caderno-5-amarelo/#ler`);
  await page.waitForSelector(".folha-papel.pronta canvas", { timeout: 30000 });
  await page.getByRole("radio", { name: "Por questão" }).click();
  await page.waitForSelector(".questao-aviso[role=alert]", { timeout: 30000 });
  ok(/não está disponível/.test(await page.locator(".questao-aviso").innerText()), "quando a separação não fecha, avisa e não mostra recortes");
  ok(await page.locator(".questao-trecho").count() === 0, "nenhum recorte é mostrado");
  await ctx.close();
}

// ------------------------------------------------------------ banco de questões (/provas/questoes/)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await servir(ctx);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erros.push(`banco: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") erros.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}/provas/`);
  ok(await page.locator("a.banco-convite[href='/provas/questoes/']").count() === 1, "a biblioteca leva à lista de questões");
  await page.goto(`${BASE}/provas/questoes/`);
  await page.waitForSelector(".banco[data-pronto]");
  const contagem = () => page.locator(".banco .biblioteca-contagem").innerText();
  ok(/^900 questões em 10 provas/.test(await contagem()), `padrão: só a aplicação regular, um idioma (${await contagem()})`);
  ok(await page.locator(".banco-prova").count() === 6, "mostra 6 provas por vez");
  await page.getByRole("group", { name: "Ano" }).getByRole("button", { name: "2025" }).click();
  await page.getByRole("group", { name: "Área" }).getByRole("button", { name: /Matemática/ }).click();
  ok(/^45 questões em 1 prova/.test(await contagem()), `2025 + Matemática: ${await contagem()}`);
  ok(/ano=2025/.test(page.url()) && /area=matematica/.test(page.url()), "filtros na URL");
  await page.screenshot({ path: `${SAIDA}/06-banco.png` });
  const link = page.getByRole("link", { name: /^Questão 136, Matemática/ });
  ok(/\/provas\/enem-2025-segundo-dia-caderno-5-amarelo\/#questao-136$/.test(await link.getAttribute("href")), "a questão aponta para o caderno de referência, já na questão");
  await link.click();
  await page.waitForSelector(".questao-trecho.estado-pronta canvas", { timeout: 30000 });
  ok(/Questão 136/.test(await titulo(page)), `o link abre o leitor no modo por questão, na 136 (${await titulo(page)})`);
  await page.getByRole("button", { name: "Ver resposta" }).click();
  await page.waitForSelector(".gabarito-resposta", { timeout: 15000 });
  await page.getByRole("button", { name: /Marcar para revisar/ }).click();
  await page.getByRole("button", { name: "Próxima ›" }).click();
  await page.waitForTimeout(400);
  ok(/#questao-137$/.test(page.url()), "o endereço acompanha a questão (dá para compartilhar)");
  const pref = await page.evaluate(() => JSON.parse(localStorage.getItem("ondepasso.leitor") ?? localStorage.getItem("ondepasso.leitor.preferencias") ?? "{}").modo ?? null);
  ok(pref !== "questao", `abrir por link de questão não troca o modo preferido da pessoa (${pref})`);
  await page.goto(`${BASE}/provas/questoes/?ano=2025&area=matematica`);
  await page.waitForSelector(".banco[data-pronto]");
  const q136 = page.getByRole("link", { name: /^Questão 136, Matemática/ });
  ok(/marcada para revisar, resposta vista/.test(await q136.getAttribute("aria-label")), `de volta à lista, a 136 aparece marcada e vista (${await q136.getAttribute("aria-label")})`);
  await page.getByRole("group", { name: "Situação" }).getByRole("button", { name: /Resposta vista/ }).click();
  ok(/^1 questão em 1 prova/.test(await contagem()), `filtro “Resposta vista”: ${await contagem()}`);
  await page.getByRole("group", { name: "Situação" }).getByRole("button", { name: /Para revisar/ }).click();
  ok(/^1 questão/.test(await contagem()), "filtro “Para revisar”");
  await page.screenshot({ path: `${SAIDA}/07-banco-marcadas.png` });
  // Espanhol: a 03 em espanhol abre com o idioma certo
  await page.goto(`${BASE}/provas/questoes/?ano=2025&area=linguagens&idioma=espanhol`);
  await page.waitForSelector(".banco[data-pronto]");
  await page.getByRole("link", { name: /^Questão 3 \(espanhol\)/ }).click();
  await page.waitForSelector(".questao-trecho.estado-pronta canvas", { timeout: 30000 });
  ok(/Questão 03.*Espanhol/s.test(await titulo(page)), `link da 03 em espanhol abre em espanhol (${await titulo(page)})`);
  // Vazio
  await page.goto(`${BASE}/provas/questoes/?situacao=revisar&ano=2021`);
  await page.waitForSelector(".banco[data-pronto]");
  ok(await page.locator(".biblioteca-vazia").count() === 1, "estado vazio explica como marcar");
  await ctx.close();
}
{
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/provas/questoes/`);
  await page.waitForSelector(".banco[data-pronto]");
  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), "lista sem rolagem horizontal no celular");
  const borda = await page.evaluate(() => Math.max(...[...document.querySelectorAll(".banco-prova, .banco-controles .controle-extra, .banco-q")].map((e) => e.getBoundingClientRect().right)));
  ok(borda <= (await page.evaluate(() => window.innerWidth)) + 1, `nada da lista passa da borda da tela (${Math.round(borda)}px)`);
  const larg = await page.locator(".banco-q").first().evaluate((a) => a.getBoundingClientRect().width);
  ok(larg >= 40, `números com área de toque confortável no celular (${Math.round(larg)}px)`);
  await page.screenshot({ path: `${SAIDA}/08-banco-celular.png` });
  await ctx.close();
}

await browser.close();
ok(erros.length === 0, `sem erros de página/console${erros.length ? `: ${erros.slice(0, 5).join(" | ")}` : ""}`);
console.log(falhas ? `\n${falhas} falha(s)` : "\ntudo ok");
process.exit(falhas ? 1 : 0);
