# Direção criativa

**Conceito:** "Sua nota é o começo. Descubra onde ela pode te levar."
**Arco:** incerteza (números soltos girando) → descoberta (a marca organiza os pontos num caminho) → clareza (mapa colorido, uma opção aberta) → possibilidades (três opções alinhadas, CTA).
**Regra de ouro:** a interface real do site é a protagonista; o vídeo é uma extensão do produto, não uma peça genérica de tecnologia.

## Paleta (tokens do site, tema escuro)

| Uso | Cor |
|---|---|
| Fundo | `#0F0E0D` (luz verde radial a 5–12% que passeia devagar; vinheta escura nas bordas) |
| Painéis | `#151412` · `#1B1A17` · `#22201D` |
| Linhas | `rgba(250,250,249,.08)` e `.16` |
| Texto | `#FAFAF9` · `#D6D4CF` · `#A6A39C` · `#85827C` |
| Supera / marca | `#3DD68C` |
| Por pouco | `#E8B04B` |
| Abaixo | `#F14242` |

Cor só carrega significado: verde = marca e "supera", âmbar = "por pouco", vermelho = "abaixo". Nada de gradiente decorativo.

## Tipografia

- **Faustina SemiBold** (a do logo e dos títulos do site): frases centrais, manchetes, nome dos estados.
- **Geist** (a da interface): números, rótulos, UI. Números com `tabular-nums`.
- Mínimos: manchete ≥ 84 px (1080 de largura), apoio ≥ 38 px. Interface reproduzida com zoom ≥ 1,5× para ser legível.
- No máximo uma frase grande por vez. Destaque com `*asteriscos*` (verde).

## Princípios de animação

- Tudo é função do quadro (`useCurrentFrame` + `interpolate`/`spring`), sem CSS animations nem timers — renderização determinística.
- **Entrada:** `bezier(.16, 1, .3, 1)` — rápida no começo, assenta devagar. **Saída:** `bezier(.7, 0, .84, 0)`. **Câmera:** `bezier(.65, 0, .35, 1)`. **Traço:** `bezier(.45, 0, .2, 1)`.
- Molas: interface `damping 18–20` (sem quicar); só a marca (anel da estação, chip escolhido) tem um pequeno overshoot.
- Texto entra por palavra: sobe 0,42 em, sai do desfoque, 0,07 s entre palavras.
- O movimento obedece à voz: cada palavra-chave dispara a animação no mesmo quadro (ver `M.*` em `src/timeline.ts`).

## Ritmo

Hook rápido (o número rola desde o 1º quadro) → respiro na marca → demonstração em blocos de 4–10 s → a maior cena (resultados, 17 s) com três "batidas" de cor → desaceleração na clareza → CTA parado e longo.

## Tratamento da interface

- Componentes recriados em React com os mesmos tokens, medidas, textos e estados do site (`src/components/ui.tsx`, `ResultCard.tsx`).
- Mapa: mesmo `geo-br.json`, mesma projeção, mesmos símbolos de ponto (cheio, anel, ×) e a mesma inclinação de 28° da home.
- Dados reais extraídos do build do site (`scripts/gerar-dados.mjs`). A nota 720 aparece como "nota de exemplo".
- 2.5D só onde existe no produto (a maquete do estado) e nas entradas dos cartões (rotação curta que assenta em 0°).

## Transições

Sempre por continuidade de um elemento: cartões → pontos → traço da logo; logo grande → logo do cabeçalho; botão "Comparar" → mapa; mapa → página da opção (o mapa vai para o canto); página → cartões organizados. Nada de cortes secos nem zoom genérico.

## Textos

- Português do Brasil, frases curtas, sem promessa de aprovação; "não garante aprovação" aparece no resultado e "Não é promessa de vaga" é dito em voz.
- Termos do site: "Supera o corte", "Por pouco", "Abaixo do corte", "corte", "cota", "modalidade".
- Marca escrita sempre "onde passo" (minúsculas) na tela; falada "Onde Passo".

## Referências de qualidade

Apple (ritmo e espaço vazio), Linear (fluidez de interface), Stripe (animação de UI com dados), Vercel (tipografia), Raycast (demonstração dinâmica) — como régua de acabamento, não como estilo a copiar.
