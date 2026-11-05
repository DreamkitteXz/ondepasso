// TikTok 01 — linha do tempo central (segundos do vídeo). Marcos vêm da narração real (src/tiktok/narracao.json).
import narracao from "./narracao.json";

export const FPS = 30;
/** A voz entra quase no primeiro quadro: o gancho não pode esperar. */
export const NARRACAO_INICIO = 0.15;
/** Duração total: a fala termina em ~26,3 s; o CTA fica parado até aqui. */
export const DURACAO = 29;

type Marco = keyof typeof narracao.marcos;
export const M = Object.fromEntries(Object.entries(narracao.marcos).map(([k, v]) => [k, v + NARRACAO_INICIO])) as Record<Marco, number>;
export const F = Object.fromEntries(Object.entries(narracao.fins).map(([k, v]) => [k, v + NARRACAO_INICIO])) as Record<Marco, number>;

/** Palavras com tempo no vídeo, para as legendas. */
export const PALAVRAS = (narracao.palavras as [string, number, number][]).map(([w, a, b]) => ({ w, a: a + NARRACAO_INICIO, b: b + NARRACAO_INICIO }));
export const BLOCOS = narracao.blocos as number[][];
export const FIM_FALA = PALAVRAS[PALAVRAS.length - 1].b;

/** Trechos com voz (para abaixar a trilha). */
export const FALA: [number, number][] = (() => {
  const t: [number, number][] = [];
  for (const p of PALAVRAS) {
    if (t.length && p.a - t[t.length - 1][1] < 0.45) t[t.length - 1][1] = p.b;
    else t.push([p.a, p.b]);
  }
  return t;
})();

export const CENAS = {
  gancho: { de: 0, ate: M.sabe + 0.2 },
  problema: { de: M.sabe - 0.3, ate: M.noOndePasso + 0.35 },
  revelacao: { de: M.noOndePasso - 0.4, ate: M.coloca + 0.45 },
  demo: { de: M.coloca - 0.35, ate: M.explora + 0.5 },
  resultados: { de: M.explora - 0.15, ate: M.vaiFazer + 0.2 },
  cta: { de: M.vaiFazer - 0.45, ate: DURACAO },
} as const;
export type NomeCena = keyof typeof CENAS;

export const SFX: { arq: string; t: number; vol: number }[] = [
  { arq: "contador", t: 0, vol: 0.3 },
  { arq: "toque", t: M.nota + 0.1, vol: 0.45 },
  { arq: "confirma", t: M.nota + 0.2, vol: 0.2 },
  { arq: "whoosh-curto", t: M.sabe - 0.1, vol: 0.3 },
  { arq: "pop", t: M.sabe + 0.5, vol: 0.2 },
  { arq: "pop", t: M.chance - 0.2, vol: 0.2 },
  { arq: "whoosh", t: M.noOndePasso - 0.35, vol: 0.35 },
  { arq: "assinatura", t: M.noOndePasso + 0.3, vol: 0.45 },
  { arq: "whoosh-curto", t: M.coloca - 0.3, vol: 0.25 },
  { arq: "toque", t: M.coloca + 0.15, vol: 0.4 },
  ...[0, 1, 2].map((i) => ({ arq: "tecla", t: M.coloca + 0.35 + i * 0.13, vol: 0.35 })),
  { arq: "toque", t: M.escolhe + 0.45, vol: 0.4 },
  { arq: "whoosh-curto", t: M.explora - 0.15, vol: 0.25 },
  { arq: "pop", t: M.verde + 0.05, vol: 0.3 },
  { arq: "confirma", t: M.verde + 0.5, vol: 0.15 },
  { arq: "pop", t: M.amarelo + 0.05, vol: 0.28 },
  { arq: "pop-grave", t: M.vermelho + 0.05, vol: 0.3 },
  { arq: "whoosh", t: M.vaiFazer - 0.45, vol: 0.3 },
  { arq: "salvar", t: M.salva + 0.05, vol: 0.5 },
  { arq: "assinatura", t: F.sair + 0.25, vol: 0.35 },
];
