// Google Analytics 4 do onde passo — o único lugar do site que fala com o GA.
//
// Regras (ver web/ANALYTICS.md):
// - Sem NEXT_PUBLIC_GA_ID válido no build, nada disto roda (nem o aviso de cookies aparece).
// - O gtag.js só é baixado DEPOIS que a pessoa aceita. Antes disso, nenhum cookie e nenhuma requisição ao Google.
// - Recusar (ou revogar depois) apaga os cookies _ga e desliga o envio na hora.
// - Notas do Enem nunca entram em evento: os parâmetros aceitam só rótulos curtos (a-z, 0-9, "-" e "_"), nunca números,
//   e só os nomes listados em PARAMETROS. Qualquer outra coisa é descartada antes de sair do navegador.
// - Eventos são disparados em handlers ou efeitos (nunca no render) e os "uma vez por página" são deduplicados aqui,
//   o que também neutraliza o efeito duplo do React Strict Mode em desenvolvimento.
import { useEffect } from "react";

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [k: `ga-disable-${string}`]: boolean | undefined }
}

const ID = (process.env.NEXT_PUBLIC_GA_ID ?? "").trim();
/** Liga só com um ID de medição do GA4 (G-XXXXXXX). */
export const ANALYTICS_ATIVO = /^G-[A-Z0-9]{4,20}$/.test(ID);

// ---------------------------------------------------------------- consentimento

export type Decisao = "aceito" | "recusado";
const CHAVE_CONSENTIMENTO = "ondepasso.consentimento";
/** Suba esta versão se a finalidade mudar (ex.: um novo serviço de medição): todos são perguntados de novo. */
const VERSAO_CONSENTIMENTO = 1;
/** A escolha vale por 12 meses; depois o aviso aparece de novo. */
const VALIDADE_MS = 365 * 24 * 3600 * 1000;
const EVENTO_CONSENTIMENTO = "ondepasso:consentimento";
export const EVENTO_ABRIR_PREFERENCIAS = "ondepasso:preferencias-cookies";

export function lerConsentimento(): Decisao | null {
  if (!ANALYTICS_ATIVO) return null;
  try {
    const s = localStorage.getItem(CHAVE_CONSENTIMENTO);
    if (!s) return null;
    const v = JSON.parse(s) as { d?: string; v?: number; em?: number };
    if (v.v !== VERSAO_CONSENTIMENTO || typeof v.em !== "number" || Date.now() - v.em > VALIDADE_MS) return null;
    return v.d === "aceito" || v.d === "recusado" ? v.d : null;
  } catch { return null; }
}

export function definirConsentimento(d: Decisao) {
  if (!ANALYTICS_ATIVO) return;
  try { localStorage.setItem(CHAVE_CONSENTIMENTO, JSON.stringify({ d, v: VERSAO_CONSENTIMENTO, em: Date.now() })); } catch {}
  if (d === "aceito") iniciar();
  else revogar();
  window.dispatchEvent(new Event(EVENTO_CONSENTIMENTO));
}

export function assinarConsentimento(cb: () => void) {
  window.addEventListener(EVENTO_CONSENTIMENTO, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENTO_CONSENTIMENTO, cb); window.removeEventListener("storage", cb); };
}

/** Reabre o aviso (link "Preferências de cookies" do rodapé). */
export function abrirPreferencias() { window.dispatchEvent(new Event(EVENTO_ABRIR_PREFERENCIAS)); }

// ---------------------------------------------------------------- origem do acesso (UTM)

const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id"] as const;
const CAMPO_CAMPANHA: Record<(typeof UTM)[number], string> = {
  utm_source: "campaign_source", utm_medium: "campaign_medium", utm_campaign: "campaign_name",
  utm_content: "campaign_content", utm_term: "campaign_term", utm_id: "campaign_id",
};
const CHAVE_ORIGEM = "ondepasso.origem";
/** Parâmetros de URL que podem ir para o GA. Qualquer outro (ex.: algo colado por engano) é removido de page_location. */
const QUERY_PERMITIDA = new Set<string>([...UTM, "curso", "campus"]);

function temUtm(busca: string) { const q = new URLSearchParams(busca); return UTM.some((k) => q.get(k)); }

/** Endereço da página sem fragmento e só com os parâmetros permitidos (as UTMs ficam intactas). */
function enderecoLimpo(): string {
  const u = new URL(location.href);
  for (const k of [...u.searchParams.keys()]) if (!QUERY_PERMITIDA.has(k)) u.searchParams.delete(k);
  u.hash = "";
  return u.toString();
}

/**
 * Enquanto a pessoa ainda não decidiu, guarda (só nesta aba, sessionStorage) as UTMs e o site de origem da
 * PRIMEIRA página. Assim, se ela aceitar só depois de navegar, a visita continua atribuída a quem trouxe
 * (ex.: TikTok). Nada disso sai do navegador sem consentimento; recusar apaga.
 */
function lembrarOrigem() {
  try {
    if (sessionStorage.getItem(CHAVE_ORIGEM)) return;
    const q = new URLSearchParams(location.search);
    const utm: Record<string, string> = {};
    for (const k of UTM) { const v = q.get(k); if (v) utm[k] = v.slice(0, 100); }
    let ref = "";
    try { if (document.referrer && new URL(document.referrer).hostname !== location.hostname) ref = document.referrer.slice(0, 420); } catch {}
    sessionStorage.setItem(CHAVE_ORIGEM, JSON.stringify({ utm, ref, pagina: location.pathname + location.search }));
  } catch {}
}

/**
 * Atribuição a aplicar no config desta página: só quando a pessoa aceitou numa página diferente da de entrada
 * e a URL atual não traz UTMs próprias (UTMs presentes na URL nunca são sobrescritas).
 */
function origemGuardada(): Record<string, string> {
  try {
    const s = sessionStorage.getItem(CHAVE_ORIGEM);
    sessionStorage.removeItem(CHAVE_ORIGEM);
    if (!s || temUtm(location.search)) return {};
    const o = JSON.parse(s) as { utm: Record<string, string>; ref: string; pagina: string };
    if (o.pagina === location.pathname + location.search) return {};
    const campos: Record<string, string> = {};
    for (const k of UTM) if (o.utm[k]) campos[CAMPO_CAMPANHA[k]] = o.utm[k];
    if (o.ref) campos.page_referrer = o.ref;
    return campos;
  } catch { return {}; }
}

// ---------------------------------------------------------------- gtag

let iniciado = false;
/** ?ga_debug=1 (guardado na aba): marca os eventos com debug_mode para aparecerem no DebugView. */
let depurar = false;
let ultimaPagina = "";
let paginaEnviada = ""; // última página com page_view já enviado
/** Ações feitas antes de decidir sobre os cookies (em memória; somem ao sair da página). Vão ao GA se a pessoa aceitar. */
const fila: [string, Record<string, string>][] = [];

// O gtag.js só processa objetos `arguments` (não arrays) no dataLayer.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gtag(..._args: unknown[]) {
  // eslint-disable-next-line prefer-rest-params
  (window.dataLayer ??= []).push(arguments);
}

function iniciar() {
  if (!ANALYTICS_ATIVO || iniciado) return;
  iniciado = true;
  window[`ga-disable-${ID}`] = false;
  window.gtag = gtag;
  // Consent Mode v2: tudo de publicidade negado; só a medição (analytics_storage) liberada, porque a pessoa aceitou.
  gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted" });
  gtag("set", "ads_data_redaction", true);
  gtag("js", new Date());
  try { depurar = new URLSearchParams(location.search).get("ga_debug") === "1" || sessionStorage.getItem("ondepasso.ga_debug") === "1"; if (depurar) sessionStorage.setItem("ondepasso.ga_debug", "1"); } catch {}
  // page_location só vale como campo de config/set (no evento o gtag ignora e usa document.location).
  gtag("set", { page_location: enderecoLimpo(), page_title: document.title });
  gtag("config", ID, {
    send_page_view: false,            // page_view é enviado por registrarPagina (uma vez por página/rota)
    allow_google_signals: false,      // sem Google Signals (dados demográficos e entre dispositivos)
    allow_ad_personalization_signals: false,
    cookie_flags: "SameSite=Lax;Secure",
    ...origemGuardada(),
    page_location: enderecoLimpo(),
  });
  // O script vem por último e sem bloquear: depois da página interativa.
  const carregar = () => {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`;
    document.head.appendChild(s);
  };
  if ("requestIdleCallback" in window) requestIdleCallback(carregar, { timeout: 3000 }); else setTimeout(carregar, 1);
  if (ultimaPagina && paginaEnviada !== ultimaPagina) enviarPagina(); // a página em que a pessoa aceitou
  for (const [nome, p] of fila.splice(0)) gtag("event", nome, comDebug(p));
}

function revogar() {
  fila.length = 0;
  try { sessionStorage.removeItem(CHAVE_ORIGEM); } catch {}
  if (!ANALYTICS_ATIVO) return;
  window[`ga-disable-${ID}`] = true; // desliga o gtag.js já carregado nesta página
  if (iniciado) gtag("consent", "update", { analytics_storage: "denied" });
  apagarCookiesGa();
}

/** Remove _ga e _ga_<ID> no domínio atual e nos domínios pais (o GA grava em .ondepasso.com.br). */
function apagarCookiesGa() {
  const nomes = document.cookie.split(";").map((c) => c.split("=")[0].trim()).filter((n) => n === "_ga" || n.startsWith("_ga_"));
  const partes = location.hostname.split(".");
  const dominios = [""];
  for (let i = 0; i < partes.length - 1; i++) dominios.push(`; domain=.${partes.slice(i).join(".")}`);
  for (const n of nomes) for (const d of dominios) document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`;
}

function comDebug(p: Record<string, string>): Record<string, string | boolean> { return depurar ? { ...p, debug_mode: true } : p; }

function enviarPagina() {
  paginaEnviada = location.pathname + location.search;
  gtag("set", { page_location: enderecoLimpo(), page_title: document.title });
  gtag("event", "page_view", comDebug({}));
}

/** Chamado pelo componente <Analytics /> no carregamento e a cada mudança de rota. */
export function registrarPagina() {
  if (!ANALYTICS_ATIVO) return;
  const chave = location.pathname + location.search;
  if (chave === ultimaPagina) return; // re-render, Strict Mode ou a mesma URL de novo
  ultimaPagina = chave;
  const d = lerConsentimento();
  if (d === "aceito") { iniciar(); if (paginaEnviada !== chave) enviarPagina(); }
  else if (d == null) lembrarOrigem();
}

// ---------------------------------------------------------------- eventos

export type NomeEvento = "en_consulta_iniciada" | "en_curso_selecionado" | "en_consulta_realizada" | "en_resultados_visualizados" | "en_erro_consulta"
  // Biblioteca de provas (/provas): ver web/ANALYTICS.md.
  | "enem_biblioteca_visualizada" | "enem_filtro_aplicado" | "enem_prova_aberta" | "enem_pagina_virada"
  | "enem_gabarito_aberto" | "enem_pdf_baixado" | "enem_modo_leitura_alterado";
/** Únicos parâmetros aceitos. Todos são rótulos (nunca notas, nunca texto digitado). */
const PARAMETROS = new Set(["curso", "origem", "formulario", "pagina", "tipo_nota", "origem_nota", "resultado", "tipo_erro",
  "prova", "filtro", "valor", "modo", "marco", "arquivo"]);
const ROTULO = /^[a-z][a-z0-9_-]{0,99}$/;

function limpar(params: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) if (PARAMETROS.has(k) && typeof v === "string" && ROTULO.test(v)) out[k] = v;
  return out;
}

/** Registra um evento. Sem consentimento ainda: guarda na fila desta página. Recusado: descarta. */
export function registrar(nome: NomeEvento, params: Record<string, string | undefined> = {}) {
  if (!ANALYTICS_ATIVO || typeof window === "undefined") return;
  registrarPagina(); // o page_view da página vem antes de qualquer evento dela (efeitos dos filhos rodam antes do <Analytics />)
  const p = limpar(params);
  const d = lerConsentimento();
  if (d === "aceito") { iniciar(); gtag("event", nome, comDebug(p)); }
  else if (d == null && fila.length < 30) fila.push([nome, p]);
}

const vistos = new Set<string>();
/** Como `registrar`, mas no máximo uma vez por página para a mesma `chave`. */
export function registrarUmaVez(chave: string, nome: NomeEvento, params: Record<string, string | undefined> = {}) {
  if (!ANALYTICS_ATIVO) return;
  const k = `${location.pathname}${location.search}|${chave}`;
  if (vistos.has(k)) return;
  vistos.add(k);
  registrar(nome, params);
}

/** Registra quando `ativo` fica verdadeiro (depois do commit, nunca no render); uma vez por `chave` em cada página. */
export function useRegistrarQuando(ativo: boolean, chave: string, nome: NomeEvento, params: Record<string, string | undefined>) {
  useEffect(() => {
    if (ativo) registrarUmaVez(chave, nome, params);
    // `params` é derivado de `chave`; não precisa disparar de novo quando só o objeto muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, chave]);
}
