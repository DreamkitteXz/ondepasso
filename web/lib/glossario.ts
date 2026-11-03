// Termos do Sisu explicados onde aparecem (componente Termo). Texto curto, sem jargão, sem promessa.
export const GLOSSARIO = {
  corte: { titulo: "Nota de corte", texto: "A menor nota que conseguiu vaga nessa opção na chamada regular do Sisu. Muda todo ano: é uma referência, não uma garantia." },
  modalidade: { titulo: "Modalidade (cota)", texto: "A forma como você concorre: ampla concorrência ou uma das cotas (escola pública, renda, pretos, pardos e indígenas, pessoas com deficiência, quilombolas). Cada uma tem a sua nota de corte." },
  pesos: { titulo: "Pesos", texto: "Cada curso pode dar mais valor a uma área do Enem, como Matemática em Engenharia. Com as cinco notas por área, calculamos a sua média com os pesos de cada opção." },
  pouco: { titulo: "Por pouco", texto: "Sua nota ficou até 10 pontos abaixo do corte do último Sisu. Como o corte muda de um ano para o outro, ainda pode dar." },
  chamada: { titulo: "Chamada regular", texto: "A primeira lista de aprovados do Sisu. Quem não passa nela pode entrar na lista de espera, em que o corte pode ser menor." },
} as const;
export type TermoId = keyof typeof GLOSSARIO;
