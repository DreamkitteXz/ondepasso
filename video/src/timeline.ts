// Linha do tempo central do vídeo. Tudo é medido em SEGUNDOS do vídeo.
// Os marcos vêm da narração real (src/data/narracao.json, gerado por scripts/alinhar_narracao.py),
// então trocar a narração e rodar o script reposiciona cenas, animações e efeitos sozinho.
import narracao from "./data/narracao.json";

export const FPS = 30;
/** Quando a narração começa dentro do vídeo. */
export const NARRACAO_INICIO = 0.5;
/** Duração total (s). O CTA fica na tela dos ~49 s até aqui. */
export const DURACAO = 58;

type Marco = keyof typeof narracao.marcos;
/** Momento (s do vídeo) em que a palavra-chave começa a ser falada. */
export const M = Object.fromEntries(
  Object.entries(narracao.marcos).map(([k, v]) => [k, v + NARRACAO_INICIO]),
) as Record<Marco, number>;
/** Momento (s do vídeo) em que a frase-chave termina. */
export const F = Object.fromEntries(
  Object.entries(narracao.fins).map(([k, v]) => [k, v + NARRACAO_INICIO]),
) as Record<Marco, number>;

/** Trechos em que há voz (para abaixar a trilha). */
export const FALA: [number, number][] = (() => {
  const t: [number, number][] = [];
  for (const [, a, b] of narracao.palavras as [string, number, number][]) {
    const ini = a + NARRACAO_INICIO, fim = b + NARRACAO_INICIO;
    if (t.length && ini - t[t.length - 1][1] < 0.45) t[t.length - 1][1] = fim;
    else t.push([ini, fim]);
  }
  return t;
})();

/** Cenas: início e fim (s). Há sobreposição de alguns décimos para as transições. */
export const CENAS = {
  hook: { de: 0, ate: M.praResponder + 0.35 },
  marca: { de: M.praResponder - 0.45, ate: M.digita - 0.15 },
  notas: { de: M.digita - 0.75, ate: M.escolhe - 0.2 },
  curso: { de: M.escolhe - 0.65, ate: M.cadaPonto + 0.2 },
  resultados: { de: M.cadaPonto - 0.7, ate: M.naoEPromessa + 0.25 },
  clareza: { de: M.naoEPromessa - 0.55, ate: M.ondePassoFinal + 0.2 },
  fim: { de: M.ondePassoFinal - 0.6, ate: DURACAO },
} as const;
export type NomeCena = keyof typeof CENAS;

/** Efeitos sonoros (arquivo em public/audio/sfx, momento em s, volume). */
export const SFX: { arq: string; t: number; vol: number }[] = [
  { arq: "contador", t: 0.0, vol: 0.35 },
  { arq: "confirma", t: M.n720 + 0.05, vol: 0.25 },
  { arq: "whoosh-curto", t: M.eAgora - 0.05, vol: 0.25 },
  { arq: "whoosh", t: M.praResponder - 0.3, vol: 0.4 },
  { arq: "assinatura", t: M.ondePasso, vol: 0.55 },
  { arq: "whoosh-curto", t: M.digita - 0.6, vol: 0.25 },
  { arq: "toque", t: M.digita + 0.05, vol: 0.4 },
  ...[0, 1, 2].map((i) => ({ arq: "tecla", t: M.digita + 0.45 + i * 0.16, vol: 0.35 })),
  { arq: "toque", t: M.cincoNotas - 0.15, vol: 0.35 },
  ...[0, 1, 2, 3, 4].map((i) => ({ arq: "tecla", t: M.cincoNotas + 0.35 + i * 0.22, vol: 0.25 })),
  { arq: "pop", t: M.semCadastro, vol: 0.25 },
  { arq: "whoosh-curto", t: M.escolhe - 0.5, vol: 0.25 },
  { arq: "toque", t: M.direito + 0.1, vol: 0.4 },
  { arq: "confirma", t: M.n120 + 0.2, vol: 0.18 },
  { arq: "whoosh", t: M.cadaPonto - 0.55, vol: 0.3 },
  { arq: "pop", t: M.verde + 0.05, vol: 0.3 },
  { arq: "pop", t: M.amarelo + 0.05, vol: 0.25 },
  { arq: "pop-grave", t: M.vermelho + 0.05, vol: 0.3 },
  { arq: "whoosh-curto", t: M.toca - 0.25, vol: 0.3 },
  { arq: "toque", t: M.toca + 0.65, vol: 0.4 },
  { arq: "confirma", t: M.toca + 0.85, vol: 0.2 },
  { arq: "whoosh-curto", t: M.cota - 0.3, vol: 0.2 },
  { arq: "subida", t: M.naoEPromessa - 1.2, vol: 0.18 },
  { arq: "whoosh", t: M.ondePassoFinal - 0.55, vol: 0.3 },
  { arq: "assinatura", t: M.ondePassoFinal + 0.35, vol: 0.5 },
  { arq: "pop", t: M.descubra + 1.3, vol: 0.2 },
];
