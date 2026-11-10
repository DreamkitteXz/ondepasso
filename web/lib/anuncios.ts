// Anúncios do Google AdSense — o único lugar do site que fala com o AdSense. Ver web/ANUNCIOS.md.
//
// Regras:
// - Sem NEXT_PUBLIC_ADSENSE_CLIENT válido no build, nada disto existe (nem meta tag, nem ads.txt).
// - Só com o ID de editor: a meta tag de verificação e o ads.txt entram no ar, para o Google analisar o site.
//   Nenhum anúncio aparece e nenhum script do Google é baixado.
// - Com o ID e o bloco (NEXT_PUBLIC_ADSENSE_SLOT): o aviso de cookies passa a perguntar sobre publicidade, e o
//   anúncio ocupa o bloco reservado ("Gostou? Compartilhe") só para quem permitiu. O script do AdSense só é baixado
//   depois dessa permissão; sem ela, o bloco continua pedindo para compartilhar o site.
// - Um patrocinador direto (lib/patrocinio.ts) tem prioridade sobre o AdSense.
// - Nunca no meio dos números, nunca dentro do leitor de provas, e nenhuma nota do aluno chega ao Google.

declare global { interface Window { adsbygoogle?: unknown[] } }

/** ID de editor: ca-pub- seguido de 16 dígitos. */
export const CLIENTE_ADSENSE = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "").trim();
const SLOT = (process.env.NEXT_PUBLIC_ADSENSE_SLOT ?? "").trim();
export const VERIFICACAO_ADSENSE = /^ca-pub-\d{16}$/.test(CLIENTE_ADSENSE);
/** Anúncios ligados: precisa do ID de editor e do ID numérico do bloco de anúncio criado no AdSense. */
export const ANUNCIOS_ATIVO = VERIFICACAO_ADSENSE && /^\d{6,12}$/.test(SLOT);
export const SLOT_ADSENSE = SLOT;

let carregado = false;
/** Baixa o script do AdSense (uma vez). Chamado só quando há permissão de publicidade. */
export function carregarAdsense() {
  if (!ANUNCIOS_ATIVO || carregado || typeof document === "undefined") return;
  carregado = true;
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CLIENTE_ADSENSE)}`;
  document.head.appendChild(s);
}

/** Cookies que o AdSense grava no próprio domínio. Apagados quando a pessoa retira a permissão. */
export function apagarCookiesAnuncios() {
  const nomes = document.cookie.split(";").map((c) => c.split("=")[0].trim()).filter((n) => n === "__gads" || n === "__gpi" || n === "__eoi" || n === "FCNEC");
  const partes = location.hostname.split(".");
  const dominios = [""];
  for (let i = 0; i < partes.length - 1; i++) dominios.push(`; domain=.${partes.slice(i).join(".")}`);
  for (const n of nomes) for (const d of dominios) document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`;
}
