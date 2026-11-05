// Testes do GA4 do onde passo contra o build estático (NEXT_PUBLIC_GA_ID=G-TESTE12345) servido em localhost:4321.
// Uso (ver web/ANALYTICS.md): node tests/analytics.e2e.mjs [pasta-das-capturas]   (BASE=http://... para outro endereço)
// O gtag.js real é substituído por um stub que só marca que foi baixado; o que importa é o que o site
// coloca no dataLayer (é isso que o gtag.js envia ao Google).
import { createRequire } from "module";
// require (e não import) para achar também um playwright instalado globalmente (NODE_PATH).
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE ?? "http://localhost:4321";
const GA_ID = process.env.GA_ID ?? "G-TESTE12345"; // o mesmo NEXT_PUBLIC_GA_ID usado no build
const SHOTS = process.argv[2] ?? "/tmp";
let falhas = 0, total = 0;
const ok = (cond, msg) => { total++; if (cond) console.log("  ✓ " + msg); else { falhas++; console.log("  ✗ " + msg); } };

const browser = await chromium.launch();

async function novo({ mobile = false, falharMapa = false, falharCalc = false } = {}) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  const reqGoogle = [];
  await ctx.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net/, (r) => {
    reqGoogle.push(r.request().url());
    if (r.request().url().includes("/gtag/js")) return r.fulfill({ contentType: "text/javascript", body: "window.__gtagJs = (window.__gtagJs || 0) + 1;" });
    return r.abort();
  });
  if (falharMapa) await ctx.route(/\/mapa\/direito\.json/, (r) => r.fulfill({ status: 500, body: "erro" }));
  if (falharCalc) await ctx.route(/\/calc\.json/, (r) => r.fulfill({ status: 500, body: "erro" }));
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  return { ctx, page, reqGoogle, erros };
}

// dataLayer → lista legível [comando, ...args]
const camada = (page) => page.evaluate(() => (window.dataLayer ?? []).map((a) => JSON.parse(JSON.stringify(Array.from(a)))));
const eventos = async (page) => (await camada(page)).filter((a) => a[0] === "event");
const nomes = async (page) => (await eventos(page)).map((a) => a[1]);
const conta = (lista, nome) => lista.filter((n) => n === nome).length;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------------------------------------
console.log("\n1. Primeira visita vinda do TikTok (UTM), age antes de decidir, depois permite");
{
  const { ctx, page, reqGoogle, erros } = await novo({ mobile: true });
  await page.goto(`${BASE}/?utm_source=tiktok&utm_medium=social&utm_campaign=bio&utm_content=video01`, { referer: "https://www.tiktok.com/" });
  await page.waitForSelector(".aviso-cookies");
  await esperar(400);
  ok(reqGoogle.length === 0, "nenhuma requisição ao Google antes de decidir");
  ok((await page.evaluate(() => window.dataLayer)) === undefined, "dataLayer não existe antes de decidir");
  ok((await ctx.cookies()).every((c) => !c.name.startsWith("_ga")), "nenhum cookie _ga antes de decidir");
  await page.screenshot({ path: `${SHOTS}/aviso-mobile.png` });

  await page.click(".chips button.chip:not(.ativo) >> text=Direito");
  await page.waitForSelector(".chip.ativo >> text=Direito");
  await page.fill("#nota", "7");
  await page.fill("#nota", "72");
  await page.fill("#nota", "720,5");
  await page.click("form.entrada-nota button[type=submit]");
  await page.waitForSelector(".manchete-mapa");
  await esperar(300);
  ok(reqGoogle.length === 0, "ainda nada enviado (ações ficam na fila, em memória)");

  await page.click(".aviso-cookies button:has-text(\"Permitir\")");
  await page.waitForFunction(() => window.__gtagJs === 1);
  ok(await page.locator(".aviso-cookies").count() === 0, "aviso some depois de permitir");
  const dl = await camada(page);
  const consent = dl.find((a) => a[0] === "consent");
  ok(consent && consent[1] === "default" && consent[2].ad_storage === "denied" && consent[2].ad_user_data === "denied" && consent[2].ad_personalization === "denied" && consent[2].analytics_storage === "granted", "Consent Mode: publicidade negada, medição liberada");
  const config = dl.find((a) => a[0] === "config");
  ok(config && config[1] === GA_ID && config[2].send_page_view === false && config[2].allow_google_signals === false && config[2].allow_ad_personalization_signals === false, "config sem Google Signals e sem personalização de anúncios");
  ok(config && !("campaign_source" in config[2]), "UTM na própria URL: nenhuma campanha forçada no config");
  const ev = await eventos(page);
  const n = ev.map((a) => a[1]);
  console.log("    eventos:", n.join(", "));
  ok(n[0] === "page_view", "page_view é o primeiro evento");
  ok(ev[0][2].page_location.includes("utm_source=tiktok") && ev[0][2].page_location.includes("utm_campaign=bio") && ev[0][2].page_location.includes("utm_content=video01"), "page_location mantém as UTMs (o GA4 lê a origem dali)");
  ok(conta(n, "page_view") === 1, "um único page_view");
  ok(conta(n, "en_consulta_iniciada") === 1, "en_consulta_iniciada uma vez (3 teclas)");
  const sel = ev.find((a) => a[1] === "en_curso_selecionado");
  ok(sel && sel[2].curso === "direito" && sel[2].origem === "atalho", "en_curso_selecionado {curso: direito, origem: atalho}");
  const real = ev.find((a) => a[1] === "en_consulta_realizada");
  ok(real && real[2].formulario === "media" && real[2].curso === "direito", "en_consulta_realizada {formulario: media, curso: direito}");
  const res = ev.filter((a) => a[1] === "en_resultados_visualizados");
  ok(res.length === 1 && res[0][2].curso === "direito" && res[0][2].origem_nota === "digitada" && res[0][2].pagina === "inicio", "en_resultados_visualizados uma vez {curso: direito, digitada, inicio}");
  const tudo = JSON.stringify(dl);
  ok(!/720/.test(tudo), "a nota (720,5) não aparece em lugar nenhum do dataLayer");
  ok(ev.every((a) => Object.values(a[2] ?? {}).every((v) => typeof v === "string")), "todos os parâmetros são texto (nenhum número)");

  console.log("\n2. Recarrega a página (permissão já salva)");
  await page.reload();
  await page.waitForSelector(".manchete-mapa");
  await page.waitForFunction(() => window.__gtagJs === 1);
  await esperar(400);
  ok(await page.locator(".aviso-cookies").count() === 0, "aviso não aparece de novo");
  const n2 = await nomes(page);
  console.log("    eventos:", n2.join(", "));
  ok(conta(n2, "page_view") === 1 && n2[0] === "page_view", "um page_view, primeiro");
  const r2 = (await eventos(page)).filter((a) => a[1] === "en_resultados_visualizados");
  ok(r2.length === 1 && r2[0][2].origem_nota === "salva" && r2[0][2].curso === "medicina", "resultados com nota salva: uma vez, origem_nota salva");

  console.log("\n3. Troca de curso com nota salva e navegação para a página do curso");
  await page.click(".chips button.chip:not(.ativo) >> text=Psicologia");
  await page.waitForSelector(".chip.ativo >> text=Psicologia");
  await esperar(300);
  const ev3 = await eventos(page);
  ok(ev3.some((a) => a[1] === "en_curso_selecionado" && a[2].curso === "psicologia"), "en_curso_selecionado psicologia");
  ok(ev3.filter((a) => a[1] === "en_resultados_visualizados" && a[2].curso === "psicologia").length === 1, "resultados de psicologia uma vez");
  await page.click(".chips button.chip.ativo"); // clicar no curso que já está no mapa não conta
  await esperar(200);
  ok((await eventos(page)).filter((a) => a[1] === "en_curso_selecionado").length === 1, "clicar no curso já ativo não gera seleção");
  await page.fill("#busca", "engenharia de comp");
  await page.click(".lista .linha >> nth=0");
  await esperar(500);
  const ev3b = (await eventos(page)).filter((a) => a[1] === "en_curso_selecionado");
  ok(ev3b.length === 2 && ev3b[1][2].origem === "busca", "seleção pela busca: origem busca (" + ev3b[1]?.[2].curso + ")");

  await page.goto(`${BASE}/curso/direito/`);
  await page.waitForSelector(".manchete-curso");
  await esperar(400);
  const ev4 = await eventos(page);
  ok(conta(ev4.map((a) => a[1]), "page_view") === 1 && ev4[0][2].page_location === `${BASE}/curso/direito/`, "page_view da página do curso (sem UTMs: outra página)");
  const r4 = ev4.filter((a) => a[1] === "en_resultados_visualizados");
  ok(r4.length === 1 && r4[0][2].pagina === "curso" && r4[0][2].curso === "direito", "resultados na página do curso");

  console.log("\n4. Erro de preenchimento");
  await page.click("text=editar").catch(() => {});
  await page.click(".pilula-nota button, .pilula-nota a").catch(() => {});
  await page.waitForSelector("#nota");
  await page.fill("#nota", "abc");
  await page.click("form.entrada-nota button[type=submit]");
  await esperar(200);
  const e4 = (await eventos(page)).filter((a) => a[1] === "en_erro_consulta");
  ok(e4.length === 1 && e4[0][2].tipo_erro === "nota_invalida" && e4[0][2].curso === "direito", "en_erro_consulta {tipo_erro: nota_invalida}");
  ok(!JSON.stringify(await camada(page)).includes("abc"), "o texto digitado não é enviado");

  console.log("\n5. Detalhe de uma opção");
  await page.goto(`${BASE}/curso/direito/`);
  await page.waitForSelector(".manchete-curso");
  const link = await page.locator('a[href^="/curso/direito/"][href$="/"]').first().getAttribute("href");
  await page.goto(`${BASE}${link}`);
  await page.waitForSelector(".voce-texto");
  await esperar(300);
  const r5 = (await eventos(page)).filter((a) => a[1] === "en_resultados_visualizados");
  ok(r5.length === 1 && r5[0][2].pagina === "opcao", "resultados no detalhe da opção (" + link + ")");
  ok(erros.length === 0, "sem erros de JavaScript" + (erros.length ? ": " + erros.join(" | ") : ""));
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------
console.log("\n6. Calculadora (5 notas) e falha ao carregar os cortes");
{
  const { ctx, page, erros } = await novo();
  await page.goto(`${BASE}/calcular/`);
  await page.click(".aviso-cookies button:has-text(\"Permitir\")");
  const campos = page.locator(".calc-nota input");
  const notas = ["700", "680,5", "720", "650", "1500"];
  for (let i = 0; i < 5; i++) { await campos.nth(i).click(); await campos.nth(i).pressSequentially(notas[i], { delay: 10 }); }
  await esperar(2000);
  let ev = await eventos(page);
  ok(conta(ev.map((a) => a[1]), "en_consulta_iniciada") === 1, "en_consulta_iniciada uma vez em ~18 teclas");
  ok(ev.filter((a) => a[1] === "en_erro_consulta").length === 1 && ev.find((a) => a[1] === "en_erro_consulta")[2].tipo_erro === "nota_invalida", "nota fora de 0–1000: en_erro_consulta uma vez");
  ok(!ev.some((a) => a[1] === "en_consulta_realizada"), "sem as 5 notas válidas: nada de consulta realizada");
  await campos.nth(4).fill("");
  await campos.nth(4).pressSequentially("710", { delay: 10 });
  await page.waitForSelector(".calc-resultado .contagem");
  await esperar(300);
  ok(!(await nomes(page)).includes("en_consulta_realizada"), "enquanto digita (menos de 1,5 s): ainda não conta");
  await esperar(1800);
  ev = await eventos(page);
  ok(conta(ev.map((a) => a[1]), "en_consulta_realizada") === 1, "en_consulta_realizada quando a 5ª nota fica válida");
  const r = ev.filter((a) => a[1] === "en_resultados_visualizados");
  ok(r.length === 1 && r[0][2].pagina === "calculadora" && r[0][2].resultado === "com_opcoes", "en_resultados_visualizados {calculadora, com_opcoes}");
  await page.selectOption('select[aria-label="Estado"]', "SP");
  await esperar(200);
  ok((await eventos(page)).filter((a) => a[1] === "en_resultados_visualizados").length === 1, "mudar filtro não conta nova visualização");
  ok(!/700|680|720|650|710|1500/.test(JSON.stringify(await camada(page))), "nenhuma das notas aparece no dataLayer");
  await page.reload();
  await page.waitForSelector(".calc-resultado .contagem");
  await esperar(2200);
  const ev6 = await eventos(page);
  ok(!ev6.some((a) => a[1] === "en_consulta_realizada") && ev6.filter((a) => a[1] === "en_resultados_visualizados").length === 1 && ev6.find((a) => a[1] === "en_resultados_visualizados")[2].origem_nota === "salva", "reabrir com notas salvas: resultados uma vez (salva), sem consulta nova");
  await campos.nth(0).fill("701");
  await esperar(2000);
  const ev6b = await eventos(page);
  ok(conta(ev6b.map((a) => a[1]), "en_consulta_realizada") === 1 && ev6b.filter((a) => a[1] === "en_resultados_visualizados").length === 2, "editar uma nota: nova consulta e nova exibição");
  ok(erros.length === 0, "sem erros de JavaScript");
  await ctx.close();
}
{
  const { ctx, page } = await novo({ falharCalc: true });
  await page.goto(`${BASE}/calcular/`);
  await page.click(".aviso-cookies button:has-text(\"Permitir\")");
  await page.waitForSelector("text=Não foi possível carregar os cortes").catch(() => {});
  await esperar(300);
  const e = (await eventos(page)).filter((a) => a[1] === "en_erro_consulta");
  ok(e.length >= 1 && e[0][2].tipo_erro === "falha_carregar_calculadora", "falha no calc.json: en_erro_consulta falha_carregar_calculadora");
  await ctx.close();
}
{
  const { ctx, page } = await novo({ falharMapa: true });
  await page.goto(`${BASE}/`);
  await page.click(".aviso-cookies button:has-text(\"Permitir\")");
  await page.click(".chips button.chip >> text=Direito");
  await page.waitForSelector("p.erro[role=alert]");
  await esperar(200);
  const e = (await eventos(page)).filter((a) => a[1] === "en_erro_consulta");
  ok(e.length === 1 && e[0][2].tipo_erro === "falha_carregar_mapa" && e[0][2].curso === "direito", "falha no mapa: en_erro_consulta falha_carregar_mapa");
  ok(!(await eventos(page)).some((a) => a[1] === "en_resultados_visualizados" && a[2].curso === "direito"), "sem resultado contado para o curso que falhou");
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------
console.log("\n7. Recusar, apagar cookies e mudar de ideia pelo rodapé");
{
  const { ctx, page, reqGoogle } = await novo();
  await page.goto(`${BASE}/?utm_source=instagram&utm_medium=social&utm_campaign=stories`);
  await page.evaluate((id) => { document.cookie = "_ga=GA1.1.123.456; path=/"; document.cookie = `_ga_${id.slice(2)}=GS1.1.1; path=/`; }, GA_ID);
  await page.fill("#nota", "700");
  await page.click(".aviso-cookies button:has-text(\"Recusar\")");
  await page.click("form.entrada-nota button[type=submit]");
  await esperar(400);
  ok(reqGoogle.length === 0, "recusado: nenhuma requisição ao Google");
  ok((await page.evaluate(() => window.dataLayer)) === undefined, "recusado: nenhum dado no dataLayer");
  ok((await ctx.cookies()).every((c) => !c.name.startsWith("_ga")), "recusado: cookies _ga apagados");
  ok((await page.evaluate(() => sessionStorage.getItem("ondepasso.origem"))) === null, "recusado: origem guardada apagada");
  await page.reload();
  await esperar(400);
  ok(await page.locator(".aviso-cookies").count() === 0 && reqGoogle.length === 0, "recarregar: escolha respeitada, nada carregado");
  await page.click("footer >> text=Preferências de cookies");
  await page.waitForSelector(".aviso-cookies");
  ok(await page.locator(".aviso-cookies >> text=medição recusada").count() === 1, "rodapé reabre o aviso mostrando a escolha atual");
  await page.click(".aviso-cookies button:has-text(\"Permitir\")");
  await page.waitForFunction(() => window.__gtagJs === 1);
  const n = await nomes(page);
  ok(n[0] === "page_view" && conta(n, "page_view") === 1, "permitir depois: carrega e envia o page_view desta página");
  await page.click("footer >> text=Preferências de cookies");
  await page.click(".aviso-cookies button:has-text(\"Recusar\")");
  const dl = await camada(page);
  ok(dl.some((a) => a[0] === "consent" && a[1] === "update" && a[2].analytics_storage === "denied"), "revogar: consent update analytics_storage denied");
  ok(await page.evaluate((id) => window[`ga-disable-${id}`] === true, GA_ID), "revogar: ga-disable ligado (o gtag.js para de enviar)");
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------
console.log("\n8. Chega do TikTok com UTM, navega, e só permite em outra página");
{
  const { ctx, page } = await novo({ mobile: true });
  await page.goto(`${BASE}/?utm_source=tiktok&utm_medium=social&utm_campaign=bio`, { referer: "https://www.tiktok.com/" });
  await page.waitForSelector(".aviso-cookies");
  await page.click(".tabbar >> text=Calcular");
  await page.waitForURL(/calcular/);
  await page.click(".aviso-cookies button:has-text(\"Permitir\")");
  await page.waitForFunction(() => window.__gtagJs === 1);
  const dl = await camada(page);
  const config = dl.find((a) => a[0] === "config")[2];
  ok(config.campaign_source === "tiktok" && config.campaign_medium === "social" && config.campaign_name === "bio", "config recebe a campanha da página de entrada (tiktok / social / bio)");
  ok(config.page_referrer === "https://www.tiktok.com/", "page_referrer = site de origem (não a página interna)");
  const pv = dl.find((a) => a[0] === "event" && a[1] === "page_view");
  ok(pv[2].page_location === `${BASE}/calcular/`, "page_location real da página atual (sem UTMs inventadas)");
  await page.goto(`${BASE}/universidades/`);
  await esperar(300);
  const c2 = (await camada(page)).find((a) => a[0] === "config")[2];
  ok(!("campaign_source" in c2), "páginas seguintes não repetem a campanha");
  await ctx.close();
}
{
  const { ctx, page } = await novo();
  await page.goto(`${BASE}/?utm_source=google&utm_medium=cpc`);
  await page.click(".aviso-cookies button:has-text(\"Permitir\")");
  await page.goto(`${BASE}/sobre-dados/?utm_source=newsletter&utm_medium=email&email=fulano@exemplo.com&nome=Ana#topo`);
  await esperar(300);
  const dl = await camada(page);
  const pv = dl.find((a) => a[0] === "event" && a[1] === "page_view")[2];
  ok(pv.page_location === `${BASE}/sobre-dados/?utm_source=newsletter&utm_medium=email`, "page_location remove parâmetros desconhecidos (e-mail, nome) e mantém as UTMs: " + pv.page_location);
  ok(!JSON.stringify(dl).includes("fulano"), "e-mail colado na URL não vai para o GA");
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------
console.log("\n9. Aparência do aviso");
for (const [nome, opts, tema] of [["desktop-escuro", {}, "dark"], ["desktop-claro", {}, "light"], ["mobile-claro", { mobile: true }, "light"]]) {
  const { ctx, page } = await novo(opts);
  await page.emulateMedia({ colorScheme: tema });
  await page.goto(`${BASE}/curso/medicina/`);
  await page.waitForSelector(".aviso-cookies");
  await page.screenshot({ path: `${SHOTS}/aviso-${nome}.png` });
  await ctx.close();
}
{
  const { ctx, page } = await novo({ mobile: true });
  await page.goto(`${BASE}/privacidade/`);
  await page.click(".aviso-cookies button:has-text(\"Permitir\")");
  await page.screenshot({ path: `${SHOTS}/privacidade-mobile.png`, fullPage: true });
  await ctx.close();
}

await browser.close();
console.log(`\n${total - falhas}/${total} verificações ok`);
process.exit(falhas ? 1 : 0);
