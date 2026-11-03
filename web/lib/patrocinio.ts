// Espaço de patrocínio. Enquanto PATROCINIO for null, o bloco pede para compartilhar o site.
// Para vender o espaço: preencha o objeto abaixo e publique. O bloco mostra "Patrocínio" e o link sai com rel="sponsored".
// Regras: nunca no meio dos números, sem afiliados misturados aos dados, sem rastreamento do aluno.
export type Patrocinio = { nome: string; texto: string; url: string; chamada: string };
export const PATROCINIO: Patrocinio | null = null;
