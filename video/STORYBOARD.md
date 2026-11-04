# Storyboard

Tempos em segundos do vídeo (30 fps). Os marcos `M.*` vêm da narração real (`src/timeline.ts`). As cenas se sobrepõem alguns décimos para as transições. Layout: **H** = 16:9, **V** = 9:16.

---

## Cena 1 — Hook · 0,00 → 8,43 (8,4 s) · `IntroScene.tsx`
- **Narração:** "Saiu a sua nota do Enem. 720. E agora? Até onde ela te leva?"
- **Texto na tela:** "SUA NOTA DO ENEM" · "720,00" · "nota de exemplo" · "Até onde ela te leva?"
- **Composição:** número enorme no centro (Geist 600, 300 px H / 230 px V). Em volta, 15 cartões com cortes reais em órbita elíptica com profundidade (H: elipse larga; V: elipse alta).
- **Entrada:** o número já está rolando no 1º quadro (centavos girando) — curiosidade imediata.
- **Principal:** contador desacelera e assenta em 720,00 exatamente no "720" (2,90 s) com brilho verde. Em "E agora?" (4,98) o número encolhe e os cartões entram um a um (mola, 0,13 s de intervalo). Em "Até onde" (5,94) a pergunta sobe palavra por palavra e a órbita acelera (a dúvida cresce).
- **Saída:** em "Pra responder" (8,08) os cartões encolhem e viram pontos verdes que voam para o desenho do símbolo; o número sobe e some.
- **Câmera:** fixa; profundidade dada por escala, desfoque e camadas dos cartões.
- **Transição:** cartões → pontos → caminho do símbolo (continuidade com a cena 2).
- **Sons:** contador (tiques que freiam), confirmação no 720, whoosh curto nos cartões, whoosh na transição. Trilha: acorde suspenso grave + pulso de tique.
- **Técnica:** `AnimatedCounter` (interpolação com easing; centavos giram até assentar), órbita por `Math.sin/cos` do tempo, destino de cada ponto = `noPalco(pontoNoCaminho(i/14))`.

## Cena 2 — Revelação da marca · 7,63 → 11,67 (4,0 s) · `BrandRevealScene.tsx`
- **Narração:** "Pra responder isso, existe o Onde Passo."
- **Texto:** logo "onde passo" · "As notas de corte do Sisu, no mapa."
- **Composição:** símbolo grande no centro; depois logo horizontal centralizada.
- **Entrada:** os pontos da cena 1 pousam no caminho; o visto se desenha por cima deles (8,18 → 9,69).
- **Principal:** a estação (anel) surge com mola exatamente em "Onde" (9,74–9,94). O símbolo desliza para o lugar na logo e o nome é revelado por máscara da esquerda para a direita (10,56 → 11,14). Linha de apoio entra embaixo.
- **Saída:** a logo encolhe e voa para o canto superior esquerdo (10,87 → 11,47), onde fica como cabeçalho durante a demonstração.
- **Câmera:** fixa. **Transição:** a logo vira o cabeçalho do "produto".
- **Sons:** assinatura sonora (sinos D–A–F#) em "Onde Passo", batida grave na entrada da progressão.
- **Técnica:** `LogoReveal` interpola a transformação afim do símbolo (palco central → lugar no lockup); o nome é um `clipPath` animado.

## Cena 3 — Entrada das notas · 11,07 → 21,26 (10,2 s) · `InputScene.tsx`
- **Narração:** "Você digita a sua nota. Ou as cinco notas por área, pra conta ficar mais precisa. Sem cadastro, e a nota não sai do seu aparelho."
- **Texto:** "Sua nota." → "Ou as cinco, por área." + "Cada curso usa os próprios pesos." → "Sem cadastro." + "A nota fica só no seu aparelho."
- **Composição:** H: texto grande à esquerda, cartão do site à direita (zoom 1,95). V: texto no alto, cartão abaixo.
- **Elementos (fiéis ao site):** cartão "Digite sua nota e compare com os cortes de 2026", campo "Sua média do Enem", botão "Comparar nota", "Sua nota não sai do seu navegador", aviso da média simples, link "Usar as cinco notas do Enem"; cartão "Digite suas notas do Enem por área" com Redação, Matemática, Natureza, Humanas, Linguagens.
- **Entrada:** cartão chega girando em Y (−26° → 0°) com mola.
- **Principal:** cursor toca no campo em "digita" e "720" é digitado; em "cinco notas" toca no link e o cartão por área sobe na frente, campos preenchidos em sequência (notas de exemplo, média 720); em "Sem cadastro" esse cartão sai; em "não sai do seu aparelho" a linha de privacidade acende em verde.
- **Saída:** toque em "Comparar nota" (20,61), o cartão sobe e some.
- **Sons:** toque, teclas, pop no "Sem cadastro". Trilha: entra a batida leve.
- **Técnica:** posições do cursor calculadas a partir das medidas do cartão × zoom (sem medir o DOM).

## Cena 4 — Escolha do curso · 20,81 → 26,93 (6,1 s) · `CourseScene.tsx`
- **Narração:** "Depois, escolhe o curso. Direito, por exemplo: 120 opções pelo Brasil."
- **Texto:** "Escolha o curso." · "602 cursos, de todas as universidades do Sisu." · "Direito: 120 opções no Brasil".
- **Composição:** H: texto à esquerda, busca + atalhos à direita. V: texto no alto, busca e atalhos no meio. Fundo: nomes reais de cursos subindo bem apagados.
- **Entrada:** busca desce; chips entram em cascata (Medicina, Direito, Psicologia, Enfermagem, Engenharia Civil, Mais cursos — os atalhos reais da home).
- **Principal:** cursor toca em "Direito" (22,92) → chip fica branco (estado ativo do site) com um pulso. Em "120" o título conta 0 → 120.
- **Saída:** tudo some enquanto os contornos do mapa começam a se desenhar.
- **Sons:** toque no chip, confirmação no 120.

## Cena 5 — Resultados · 26,03 → 43,07 (17,0 s) · `ResultsScene.tsx`
- **Narração:** "Cada ponto do mapa é uma opção. Verde… Amarelo… Vermelho… Toca numa opção e vê o corte de cada cota, e como ele mudou nos últimos anos."
- **Texto:** pílula "Sua média 720,00 editar" · "29 de 120 opções acima do corte de 2026" · "18 por pouco · 73 abaixo do corte" · "Comparação histórica · não garante aprovação." · legenda do mapa.
- **Composição:** H: coluna de leitura à esquerda, mapa à direita. V: leitura no alto, mapa embaixo.
- **Principal (sincronizado com a voz):**
  - "Cada ponto" (26,73): 120 pontos reais surgem em onda de norte a sul (neutros).
  - "Verde" (29,06): 29 ficam verdes em onda de oeste a leste; manchete conta até 29; item da legenda acende.
  - "Amarelo" (32,74): 18 viram anéis âmbar. "Vermelho" (34,58): 73 ficam vermelhos com ×.
  - "Toca numa opção" (37,14): a câmera traz a Paraíba para o centro, inclina 28° (a "maquete" da home do site) e o resto do Brasil apaga. Cursor toca na UFPB Santa Rita; o pino sobe; rótulo "UFPB · Santa Rita +7,06"; o cartão do campus mostra Corte 712,94 · Você 720,00 · Diferença +7,06.
  - "corte de cada cota" (38,53): o mapa vai para o canto e a página da opção se abre: nota de corte 712,94 (contando), cortes por cota em cascata.
  - "como ele mudou" (40,10): "Últimas edições · ampla" com barras 731,90 → 699,08 → 712,94.
- **Saída:** a cena desfoca e escurece sob "Não é promessa de vaga".
- **Sons:** pops nas cores, toque e confirmação no pino, whoosh curto na página.
- **Técnica:** `MapaBrasil` usa o mesmo `geo-br.json` e a mesma projeção do site; zoom por `viewBox` + `rotateX` com perspectiva; o cursor usa a mesma projeção 3D (`posicaoNaTela`).

## Cena 6 — Clareza · 42,27 → 48,21 (5,9 s) · `ClarityScene.tsx`
- **Narração:** "Não é promessa de vaga. É clareza pra escolher o seu próximo passo."
- **Texto:** "Não é promessa de vaga." · "Clareza para escolher o seu próximo passo." · rodapé com a fonte dos dados.
- **Composição:** três linhas de opção reais (supera, por pouco, abaixo) — H em linha, V em coluna — e a frase central.
- **Principal:** os cartões chegam espalhados e girados e assentam alinhados (a organização do caos). Em "próximo passo" as bordas acendem na cor de cada situação.
- **Saída:** sobe e some; trilha tira a batida e fica só o pad aberto + sinos.

## Cena 7 — Encerramento · 47,41 → 58,00 (10,6 s) · `OutroScene.tsx`
- **Narração:** "Onde Passo. Descubra onde a sua nota passa."
- **Texto:** logo · "Descubra onde a sua nota passa." · "ondepasso.com.br" · "Grátis e sem cadastro" · "Dados públicos do MEC · não é um site oficial do Sisu".
- **Principal:** o visto se desenha de novo e a estação surge em "Onde Passo" (48,0), com a assinatura sonora; logo horizontal; frase; endereço e selo. CTA fica ~8 s na tela com respiração mínima (0,6%).
- **Saída:** fade nos últimos 0,5 s; trilha resolve em Dmaj9 e some em 3 s.
