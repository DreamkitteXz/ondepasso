// Teste ponta a ponta da biblioteca /provas e do leitor (Playwright).
// Uso: BASE=http://localhost:3100 PDFS=/pasta/com/os/pdfs node tests/provas.e2e.mjs [pasta-de-capturas]
// Como o ambiente de teste pode não alcançar download.inep.gov.br, os PDFs do Inep são servidos de PDFS/ (cópias
// locais, não versionadas) pela interceptação de rede. Arquivos que não estão lá respondem como falha de rede.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE ?? "http://localhost:3100";
const PDFS = process.env.PDFS ?? "";
const SAIDA = process.argv[2] ?? "provas-e2e";
fs.mkdirSync(SAIDA, { recursive: true });
let falhas = 0;
const ok = (c, msg) => { console.log(`${c ? "✓" : "✗"} ${msg}`); if (!c) falhas++; };

async function servirPdfs(ctx, { atraso = 0 } = {}) {
  await ctx.route("https://download.inep.gov.br/**", async (route) => {
    const nome = route.request().url().split("/").pop();
    const local = PDFS && path.join(PDFS, `teste-${nome}`);
    if (local && fs.existsSync(local)) {
      if (atraso) await new Promise((r) => setTimeout(r, atraso));
      return route.fulfill({ status: 200, contentType: "application/pdf", body: fs.readFileSync(local), headers: { "access-control-allow-origin": "*" } });
    }
    return route.abort("failed");
  });
}

const browser = await chromium.launch();
const erros = [];

// ------------------------------------------------------------ biblioteca
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erros.push(`biblioteca: ${e.message}`));
  await page.goto(`${BASE}/provas/`);
  await page.waitForSelector(".biblioteca[data-pronto]");
  const conta = () => page.locator(".biblioteca .prova").count();
  const total = await conta();
  ok(total === 26, `biblioteca lista ${total} provas (esperado 26: um cartão por dia de cada aplicação)`);
  const radios = await page.locator(".prova .amostra input[type=radio]").count();
  ok(radios >= 26 * 4, `as cores de caderno ficam dentro dos cartões (${radios} opções; no digital o idioma é escolhido à parte)`);
  await page.screenshot({ path: `${SAIDA}/01-biblioteca.png` });
  await page.getByRole("group", { name: "Ano" }).getByRole("button", { name: "2025" }).click();
  ok(await conta() === 6, `filtro 2025: ${await conta()} (esperado 6)`);
  await page.getByRole("group", { name: "Dia" }).getByRole("button", { name: "2º dia" }).click();
  ok(await conta() === 3, `2025 + 2º dia: ${await conta()} (esperado 3)`);
  await page.getByRole("combobox", { name: "Aplicação" }).selectOption("reaplicacao");
  ok(await conta() === 1, `2025 + 2º dia + reaplicação: ${await conta()} (esperado 1)`);
  ok(await page.locator("details.outras[open]").count() === 1, "filtrar por outra aplicação já abre a seção dela");
  await page.waitForTimeout(400);
  ok(/ano=2025/.test(page.url()) && /dia=2/.test(page.url()) && /modalidade=reaplicacao/.test(page.url()), `URL acompanha os filtros (${page.url().split("?")[1]})`);
  await page.getByRole("button", { name: "Limpar filtros" }).first().click();
  ok(await conta() === 26, "limpar filtros volta a 26");
  // Links antigos com ?area= continuam valendo: Matemática = 2º dia
  await page.goto(`${BASE}/provas/?area=matematica`);
  await page.waitForSelector(".biblioteca[data-pronto]");
  await page.waitForTimeout(200);
  const dias = await page.locator(".biblioteca .prova h3").allTextContents();
  ok(dias.length > 0 && dias.every((t) => !t.includes("1º dia")), `?area=matematica só traz 2º dia (${dias.length})`);
  await page.goto(`${BASE}/provas/`);
  await page.waitForSelector(".biblioteca[data-pronto]");
  // Escolher a cor troca o caderno que abre e o gabarito
  const cartao = page.locator(".principais .prova").first();
  const lerAntes = await cartao.getByRole("link", { name: /^Ler o caderno/ }).getAttribute("href");
  await cartao.locator("label.amostra", { hasText: "Verde" }).click();
  ok(await cartao.getByRole("radio", { name: "Verde" }).isChecked(), "a cor escolhida fica marcada como opção de rádio");
  const ler = cartao.getByRole("link", { name: /^Ler o caderno/ });
  ok((await ler.textContent()).includes("verde") && (await ler.getAttribute("href")) !== lerAntes, `cor Verde muda o caderno aberto (${await ler.getAttribute("href")})`);
  const gab = await cartao.getByRole("link", { name: "Gabarito" }).getAttribute("href");
  ok(/download\.inep\.gov\.br/.test(gab ?? ""), "gabarito do cartão é o link oficial do Inep");
  // Vazio
  await page.getByRole("searchbox").fill("zzz inexistente");
  await page.waitForTimeout(200);
  ok(await page.locator(".biblioteca-vazia").isVisible(), "busca sem resultado mostra estado vazio");
  await page.screenshot({ path: `${SAIDA}/02-vazio.png` });
  await page.getByRole("searchbox").fill("libras 2023");
  await page.waitForTimeout(200);
  const anosBusca = await page.locator(".biblioteca .ano-numero").allTextContents();
  ok(await conta() > 0 && anosBusca.every((t) => t.includes("2023")), `busca "libras 2023": ${await conta()} provas, só de 2023`);
  ok(await page.locator(".prova .amostra.marcada", { hasText: "Libras" }).count() === await conta(), "a busca já deixa marcado o caderno em Libras");
  // Disciplina não é anunciada como disponível
  ok(await page.locator(".controles", { hasText: /disciplina/i }).count() === 0, "nenhum filtro de disciplina anunciado antes de existir");
  // Salvar
  await page.getByRole("searchbox").fill("");
  await page.waitForTimeout(200);
  await page.locator(".principais .prova").first().getByRole("button", { name: /^Salvar o caderno/ }).click();
  ok(await page.locator(".suas-provas .salvas li").count() === 1, "salvar o caderno aparece em 'Salvas'");
  await page.locator(".suas-provas .salvas li button").first().click();
  ok(await page.locator(".suas-provas").count() === 0, "tirar das salvas some com a faixa");
  // Botões sem nome acessível
  const semNome = await page.evaluate(() => [...document.querySelectorAll("button, a[href]")].filter((b) => !(b.getAttribute("aria-label") || b.textContent.trim() || b.getAttribute("title")) && b.offsetParent).length);
  ok(semNome === 0, `todos os botões e links visíveis têm nome (${semNome} sem nome)`);
  // Celular
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/provas/`);
  await page.waitForSelector(".biblioteca[data-pronto]");
  const largura = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(largura <= 390, `sem rolagem horizontal no celular (${largura}px)`);
  const altura = await page.evaluate(() => document.documentElement.scrollHeight);
  ok(altura < 9000, `página no celular com ${altura}px de altura (antes ~34 mil)`);
  await page.screenshot({ path: `${SAIDA}/03-biblioteca-celular.png` });
  await ctx.close();
}

// ------------------------------------------------------------ leitor (desktop)
const ID = "enem-2025-primeiro-dia-caderno-1-azul";
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await servirPdfs(ctx);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erros.push(`leitor: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") erros.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}/provas/${ID}/`);
  ok(await page.locator("h1").innerText().then((t) => /Enem 2025/.test(t)), "página da prova tem título indexável no HTML");
  ok(await page.locator("script[type='application/ld+json']").count() === 1, "página da prova tem dados estruturados");
  ok(await page.locator(".folha").count() === 0, "o PDF não é baixado antes de abrir o leitor");
  await page.getByRole("button", { name: "Abrir no leitor" }).click();
  await page.waitForSelector(".folha-papel.pronta canvas", { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SAIDA}/10-leitor-capa.png` });
  const indic = () => page.locator(".leitor-pagina").innerText();
  ok(/de 32/.test(await indic()), `indicador de páginas: ${await indic()}`);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1100);
  ok(/e 3 de 32/.test(await indic()) && (await page.locator(".leitor-pagina input").inputValue()) === "2", `seta → abre a dupla 2–3 (${await page.locator(".leitor-pagina input").inputValue()} ${await indic()})`);
  await page.screenshot({ path: `${SAIDA}/11-leitor-dupla.png` });
  // Nitidez: o canvas tem exatamente o tamanho da página na tela × densidade de pixels (sem reamostragem)
  const nitidez = await page.evaluate(() => [...document.querySelectorAll(".folha-papel canvas")].filter((c) => c.getBoundingClientRect().width > 50).map((c) => Math.abs(c.width - c.getBoundingClientRect().width * devicePixelRatio)));
  ok(nitidez.length >= 2 && nitidez.every((d) => d <= 1), `páginas desenhadas na resolução exata da tela (diferença ${nitidez.join(", ")}px)`);
  // Arrastar a ponta da folha (virada com o mouse), capturando o meio do movimento
  const caixa = await page.locator(".livro").boundingBox();
  await page.mouse.move(caixa.x + caixa.width - 6, caixa.y + 20);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(caixa.x + caixa.width - 6 - i * (caixa.width * 0.06), caixa.y + 40 + i * 6);
  await page.screenshot({ path: `${SAIDA}/12-leitor-dobra.png` });
  for (let i = 13; i <= 20; i++) await page.mouse.move(caixa.x + caixa.width - 6 - i * (caixa.width * 0.045), caixa.y + 40 + i * 4);
  await page.mouse.up();
  await page.waitForTimeout(1200);
  ok((await page.locator(".leitor-pagina input").inputValue()) === "4", `arrastar a folha vira para 4–5 (${await page.locator(".leitor-pagina input").inputValue()})`);
  // Zoom no modo livro: continua sendo o livro (dupla), maior e rolável; setas seguem virando a dupla
  const largVisivel = () => page.evaluate(() => Math.max(0, ...[...document.querySelectorAll(".folha-papel canvas")].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 50 && r.right > 0 && r.left < innerWidth).map((r) => r.width)));
  const larg1 = await largVisivel();
  await page.getByRole("button", { name: "Aumentar zoom" }).click();
  await page.waitForSelector(".palco-livro.ampliado", { timeout: 20000 });
  await page.waitForTimeout(1500);
  const larg2 = await largVisivel();
  ok(larg2 > larg1 * 1.2 && await page.locator(".livro").count() === 1, `zoom amplia o próprio livro (${Math.round(larg1)} → ${Math.round(larg2)}px)`);
  ok(await page.locator(".palco-livro").evaluate((el) => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight), "livro ampliado pode ser rolado");
  await page.keyboard.press("ArrowRight"); await page.waitForTimeout(1200);
  ok((await page.locator(".leitor-pagina input").inputValue()) === "6" && /e 7/.test(await indic()), `com zoom, → vira para a dupla 6–7 (${await page.locator(".leitor-pagina input").inputValue()})`);
  await page.screenshot({ path: `${SAIDA}/12b-leitor-zoom.png` });
  await page.keyboard.press("0"); await page.waitForTimeout(800);
  ok(await page.locator(".palco-livro.ampliado").count() === 0, "tecla 0 volta ao livro inteiro");
  await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(1100);
  // Digitar no campo não vira página
  const campo = page.locator(".leitor-pagina input");
  await campo.click(); await campo.fill("2"); await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  ok((await campo.inputValue()) === "2", "setas dentro do campo não viram página");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  ok((await campo.inputValue()) === "2", "ir para página 2 pelo campo");
  // Memória: folhas distantes não guardam canvas
  for (let i = 0; i < 10; i++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(850); }
  const canvases = await page.locator(".folha canvas").count();
  ok(canvases <= 8, `após folhear, só ${canvases} folhas têm canvas (limite 8)`);
  // Índice de questões (mapeado pelo texto oficial)
  await page.getByRole("button", { name: "Índice e marcadores" }).click();
  await page.waitForSelector(".grade-questoes", { timeout: 30000 });
  await page.getByRole("button", { name: "Questão 46, página 22" }).click();
  await page.waitForTimeout(900);
  ok((await campo.inputValue()) === "22", `questão 46 leva à página 22 (${await campo.inputValue()})`);
  await page.locator(".grade-questoes li").filter({ hasText: "47" }).getByRole("button", { name: /Marcar questão 47/ }).click();
  await page.getByRole("tab", { name: "Marcados" }).click();
  ok(await page.getByRole("button", { name: "Questão 47", exact: true }).isVisible(), "questão marcada para revisar aparece em Marcados");
  await page.screenshot({ path: `${SAIDA}/13-indice.png` });
  // Gabarito: consulta por número
  await page.getByRole("button", { name: "Gabarito" }).click();
  const painelGab = page.getByRole("complementary", { name: "Gabarito" });
  await painelGab.getByRole("button", { name: "Consultar a resposta de uma questão" }).click();
  const campoGab = painelGab.locator(".gabarito-campo input");
  const respGab = painelGab.locator(".gabarito-resposta");
  await campoGab.waitFor({ timeout: 20000 });
  await campoGab.fill("3");
  ok(/Inglês\s*D.*Espanhol\s*D/s.test(await respGab.innerText()), `gabarito q3: ${await respGab.innerText()}`);
  await campoGab.fill("46");
  ok(/46:\s*E/.test(await respGab.innerText()), `gabarito q46: ${await respGab.innerText()}`);
  await campoGab.fill("90");
  ok(/90:\s*A/.test(await respGab.innerText()), `gabarito q90: ${await respGab.innerText()}`);
  await page.screenshot({ path: `${SAIDA}/14-gabarito.png` });
  await painelGab.getByRole("button", { name: "Ver gabarito" }).click();
  await page.waitForSelector(".leitor-faixa >> text=gabarito oficial", { timeout: 20000 });
  await page.waitForSelector(".pagina-pdf.estado-pronta", { timeout: 20000 });
  await page.screenshot({ path: `${SAIDA}/15-gabarito-no-leitor.png` });
  await page.getByRole("button", { name: "Voltar à prova" }).click();
  await page.waitForSelector(".folha-papel.pronta canvas", { timeout: 20000 });
  // Modo leitura
  await page.getByRole("radio", { name: /Leitura/ }).click();
  await page.waitForSelector(".pagina-pdf.estado-pronta", { timeout: 20000 });
  const prontas = await page.locator(".pagina-pdf.estado-pronta").count();
  ok(prontas > 0 && prontas <= 6, `modo leitura desenha só as páginas visíveis (${prontas})`);
  await page.locator(".leitura-rolagem").evaluate((el) => el.scrollBy(0, 4000));
  await page.waitForTimeout(800);
  ok(Number(await campo.inputValue()) > 2, `rolar atualiza a página atual (${await campo.inputValue()})`);
  ok(await page.locator(".pagina-pdf figcaption.sr-only").count() > 0, "páginas têm o texto para leitor de tela");
  await page.screenshot({ path: `${SAIDA}/16-modo-leitura.png` });
  // Zoom
  const l1 = await page.locator(".pagina-pdf").first().evaluate((e) => e.getBoundingClientRect().width);
  await page.getByRole("button", { name: "Aumentar zoom" }).click();
  await page.waitForTimeout(500);
  const l2 = await page.locator(".pagina-pdf").first().evaluate((e) => e.getBoundingClientRect().width);
  ok(l2 > l1 * 1.2, `zoom aumenta a página (${Math.round(l1)} → ${Math.round(l2)}px)`);
  await page.getByRole("button", { name: "Diminuir zoom" }).click();
  // Sem animação
  await page.getByRole("radio", { name: /Livro/ }).click();
  await page.getByRole("button", { name: "Configurações do leitor" }).click();
  await page.getByRole("switch", { name: /Animação de virar página/ }).click({ force: true });
  await page.waitForSelector(".espelho .pagina-pdf.estado-pronta", { timeout: 20000 });
  ok(await page.locator(".livro").count() === 0, "sem animação, o livro troca de página sem dobra");
  await page.keyboard.press("Escape");
  const antes = await campo.inputValue();
  await page.keyboard.press("ArrowRight"); await page.waitForTimeout(300);
  ok(Number(await campo.inputValue()) > Number(antes), `setas funcionam sem animação (${antes} → ${await campo.inputValue()})`);
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem("ondepasso.leitor")).animacoes === false), "preferência de animação fica salva");
  // Tela cheia
  await page.getByRole("button", { name: "Tela cheia" }).click();
  await page.waitForTimeout(500);
  ok(await page.locator(".leitor.tela-cheia").count() === 1, "tela cheia");
  await page.screenshot({ path: `${SAIDA}/17-tela-cheia.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  ok(await page.locator(".leitor.tela-cheia").count() === 0, "Esc sai da tela cheia");
  // Download aponta para o arquivo oficial
  const href = await page.getByRole("toolbar").getByRole("link", { name: "Baixar PDF", exact: true }).getAttribute("href");
  ok(href === "https://download.inep.gov.br/enem/provas_e_gabaritos/2025_PV_impresso_D1_CD1.pdf", "download aponta para o PDF oficial do Inep");
  await ctx.close();
}

// ------------------------------------------------------------ leitor (celular, toque, rede lenta e erro)
{
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  await servirPdfs(ctx, { atraso: 2500 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erros.push(`celular: ${e.message}`));
  await page.goto(`${BASE}/provas/enem-2024-segundo-dia-caderno-7-azul/#ler`);
  await page.waitForSelector(".leitor-carregando", { timeout: 15000 });
  await page.screenshot({ path: `${SAIDA}/20-celular-carregando.png` });
  await page.waitForSelector(".folha-papel.pronta canvas", { timeout: 30000 });
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => document.querySelector(".stf__wrapper")?.classList.contains("--portrait")), "no celular, uma página por vez");
  await page.screenshot({ path: `${SAIDA}/21-celular-leitor.png` });
  const b = await page.locator(".livro").boundingBox();
  // Toque: arrastar da borda direita para a esquerda
  const cdp = await ctx.newCDPSession(page);
  const toque = async (tipo, x, y) => cdp.send("Input.dispatchTouchEvent", { type: tipo, touchPoints: tipo === "touchEnd" ? [] : [{ x, y }] });
  // Dedo encosta perto da borda direita, espera um instante (o page-flip separa arrasto de rolagem) e arrasta.
  const x0 = b.x + b.width * 0.85, y0 = b.y + b.height * 0.5;
  await toque("touchStart", x0, y0);
  await page.waitForTimeout(320);
  // Arrasto lento: a folha acompanha o dedo e vira quando passa da borda esquerda.
  for (let i = 1; i <= 10; i++) { await toque("touchMove", x0 - i * (x0 - b.x + 8) / 10, y0 + i * 2); if (i === 6) await page.screenshot({ path: `${SAIDA}/23-celular-dobra.png` }); }
  await toque("touchEnd");
  await page.waitForTimeout(1200);
  ok((await page.locator(".leitor-pagina input").inputValue()) === "2", `arrastar com o dedo vira a página (${await page.locator(".leitor-pagina input").inputValue()})`);
  // Deslize rápido (swipe) para a próxima.
  await toque("touchStart", x0, y0);
  await toque("touchMove", x0 - b.width * 0.3, y0);
  await toque("touchEnd");
  await page.waitForTimeout(1200);
  ok((await page.locator(".leitor-pagina input").inputValue()) === "3", `deslize rápido vira a página no celular (${await page.locator(".leitor-pagina input").inputValue()})`);
  const largura = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(largura <= 420, `leitor cabe no celular (${largura}px)`);
  await page.getByRole("button", { name: "Índice e marcadores" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SAIDA}/22-celular-indice.png` });
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await servirPdfs(ctx); // este arquivo não está nas cópias locais → falha de rede
  const page = await ctx.newPage();
  await page.goto(`${BASE}/provas/enem-2023-primeiro-dia-caderno-1-azul/#ler`);
  await page.waitForSelector(".leitor-erro", { timeout: 30000 });
  ok(await page.getByRole("link", { name: "Abrir PDF oficial" }).isVisible(), "falha de rede mostra erro com link oficial");
  ok(await page.getByRole("button", { name: "Tentar de novo" }).isVisible(), "e um botão de tentar de novo");
  await page.screenshot({ path: `${SAIDA}/30-erro.png` });
  await ctx.close();
}

await browser.close();
const relevantes = erros.filter((e) => !/Warning|favicon|standardFont|TT: |fetchStandardFontData/i.test(e));
ok(relevantes.length === 0, `sem erros de JavaScript${relevantes.length ? ": " + relevantes.slice(0, 5).join(" | ") : ""}`);
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo");
process.exit(falhas ? 1 : 0);
