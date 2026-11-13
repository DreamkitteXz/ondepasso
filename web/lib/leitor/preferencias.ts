// Preferências do leitor e marcações de estudo. Tudo fica só neste navegador (localStorage); nada vai para servidor.
// Leitura e escrita sempre em try/catch: em aba anônima ou com armazenamento bloqueado, o leitor funciona igual, só não lembra.

export type ModoLeitor = "livro" | "leitura" | "questao";
export type Preferencias = { modo: ModoLeitor | null; animacoes: boolean | null; som: boolean };
const CHAVE_PREF = "ondepasso.leitor";

export function lerPreferencias(): Preferencias {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_PREF) ?? "{}") as Partial<Preferencias>;
    return {
      modo: v.modo === "livro" || v.modo === "leitura" || v.modo === "questao" ? v.modo : null,
      animacoes: typeof v.animacoes === "boolean" ? v.animacoes : null,
      som: v.som === true, // som de papel: desligado por padrão
    };
  } catch { return { modo: null, animacoes: null, som: false }; }
}
export function salvarPreferencias(p: Preferencias) {
  try { localStorage.setItem(CHAVE_PREF, JSON.stringify(p)); } catch {}
}

/** Respeita "reduzir movimento" do sistema quando a pessoa ainda não escolheu. */
export const prefereMenosMovimento = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- estudo (por prova)

/** `ultimaQuestao`: onde a pessoa parou no modo por questão ("12" ou "3-espanhol"). */
export type Estudo = { marcadores: number[]; revisar: number[]; ultimaPagina: number | null; ultimaQuestao?: string; em?: number };
const chaveEstudo = (id: string) => `ondepasso.estudo.${id}`;

export function lerEstudo(id: string): Estudo {
  try {
    const v = JSON.parse(localStorage.getItem(chaveEstudo(id)) ?? "{}") as Partial<Estudo>;
    const nums = (a: unknown) => (Array.isArray(a) ? a.filter((n) => Number.isInteger(n) && n > 0 && n < 1000) : []) as number[];
    return { marcadores: nums(v.marcadores), revisar: nums(v.revisar), ultimaPagina: Number.isInteger(v.ultimaPagina) ? (v.ultimaPagina as number) : null,
      ultimaQuestao: typeof v.ultimaQuestao === "string" && /^\d{1,3}(-(ingles|espanhol))?$/.test(v.ultimaQuestao) ? v.ultimaQuestao : undefined, em: typeof v.em === "number" ? v.em : undefined };
  } catch { return { marcadores: [], revisar: [], ultimaPagina: null }; }
}
export function salvarEstudo(id: string, e: Estudo) {
  try { localStorage.setItem(chaveEstudo(id), JSON.stringify({ ...e, em: Date.now() })); } catch {}
}

/** Provas que a pessoa começou a ler neste aparelho, da mais recente para a mais antiga. */
export function leiturasRecentes(): { id: string; pagina: number; em: number }[] {
  const out: { id: string; pagina: number; em: number }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith("ondepasso.estudo.")) continue;
      const e = lerEstudo(k.slice("ondepasso.estudo.".length));
      if (e.ultimaPagina && e.ultimaPagina > 1) out.push({ id: k.slice("ondepasso.estudo.".length), pagina: e.ultimaPagina, em: e.em ?? 0 });
    }
  } catch {}
  return out.sort((a, b) => b.em - a.em);
}

// ---------------------------------------------------------------- provas salvas (favoritas)

const CHAVE_FAV = "ondepasso.provas-salvas";
export function lerFavoritas(): string[] {
  try { const v = JSON.parse(localStorage.getItem(CHAVE_FAV) ?? "[]"); return Array.isArray(v) ? v.filter((s) => typeof s === "string").slice(0, 200) : []; } catch { return []; }
}
export function alternarFavorita(id: string): string[] {
  const atual = lerFavoritas();
  const nova = atual.includes(id) ? atual.filter((x) => x !== id) : [id, ...atual];
  try { localStorage.setItem(CHAVE_FAV, JSON.stringify(nova)); } catch {}
  window.dispatchEvent(new Event("ondepasso:favoritas"));
  return nova;
}

// ---------------------------------------------------------------- som de papel (sintetizado, sem arquivo)

let audio: AudioContext | null = null;
/** Um "frrr" curto de papel: ruído filtrado com envelope rápido. Só toca se a pessoa ligou o som. */
export function somDePapel() {
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    const dur = 0.32;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const t = i / d.length;
      d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * t), 1.6) * (0.6 + 0.4 * Math.sin(t * 40));
    }
    const fonte = ctx.createBufferSource();
    fonte.buffer = buf;
    const filtro = ctx.createBiquadFilter();
    filtro.type = "bandpass"; filtro.frequency.value = 2600; filtro.Q.value = 0.6;
    const ganho = ctx.createGain();
    ganho.gain.value = 0.08;
    fonte.connect(filtro).connect(ganho).connect(ctx.destination);
    fonte.start();
  } catch {}
}
