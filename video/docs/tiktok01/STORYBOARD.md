# TikTok 01 — "Criei um site para quem vai fazer o Enem"

**Composição:** `OndePassoTikTok01` (1080 × 1920, 30 fps, 29,0 s) · código em `src/tiktok/` · saída `output/ondepasso-tiktok-01.mp4`
**Ideia:** um dev mostrando a ferramenta que construiu. A marca aparece no meio da história, não na abertura.
**Narração:** ElevenLabs `eleven_v4`, voz "Eduardo - Streamer & Brasileiro", take A (26,1 s), entra em 0,15 s.

## Roteiro final

> Eu criei um site que mostra onde a sua nota do Enem pode te levar.
> Sabe aquela dúvida de onde você tem chance de passar?
> No Onde Passo, você coloca a sua nota, escolhe o curso que quer... e explora as opções no mapa.
> Verde: sua nota supera o corte do último Sisu. Amarelo: tá perto. Vermelho: ainda falta um pouco.
> Vai fazer o Enem? Salva esse vídeo pra conhecer o Onde Passo quando a sua nota sair.

Mudanças em relação ao roteiro-base: "favorável / perto / falta um pouco" virou as três cores do site (é o que a tela mostra); "explora suas possibilidades" virou "explora as opções no mapa" (diz o que acontece); "supera o corte do último Sisu" deixa claro que é comparação com o corte passado, sem prometer aprovação.

## Zonas da tela (TikTok)

- Topo (0–200 px): livre (abas do app). Logo pequena só no canto esquerdo, y 130.
- Conteúdo principal: y 230–1200, x 60–1020.
- Legendas: y 1250–1420, centralizadas, 70 px, peso 800, contorno escuro.
- Base (y > 1450) e borda direita inferior: nada essencial (descrição e botões).

## Cenas (tempos do vídeo)

| # | Tempo | Narração | Visual | Animação / transição | Som |
|---|---|---|---|---|---|
| 1 · Gancho | 0,0–5,0 | "Eu criei um site… pode te levar." | Nota gigante já rolando no 1º quadro (512 → 720,00, "nota de exemplo"). Título cinético "CRIEI UM SITE / PARA O ENEM" (ENEM em verde). | Palavras entram com mola no ritmo da fala; cursor toca a nota em "nota" (brilho verde); em "levar" saem 3 caminhos tracejados até pontos verde, âmbar e vermelho (prévia do mapa). | contador, toque, confirmação |
| 2 · Problema | 4,5–8,6 | "Sabe aquela dúvida de onde você tem chance de passar?" | A nota encolhe no centro; 6 cartões com cortes reais 2026 (Medicina, Direito, Psicologia) com selo "?"; "Dá pra passar onde?" em âmbar. | Cartões entram em cascata e trocam de lugar 2 vezes dentro da própria fileira; no fim viram pontos verdes que voam para o desenho do símbolo. | whoosh curto, pops |
| 3 · Revelação | 8,0–9,7 | "No Onde Passo," | Os pontos viram o visto, a estação surge em "Passo", nome aparece. | Logo vai para o canto superior esquerdo e vira cabeçalho. | whoosh, assinatura (sinos) |
| 4 · Demonstração | 9,1–12,8 | "você coloca a sua nota, escolhe o curso que quer…" | Cartão real "Digite sua nota e compare com os cortes de 2026" (zoom 2,1×) e atalhos de curso da home. | Cartão sobe por máscara; cursor toca no campo em "coloca" e digita 720; toca "Comparar nota"; chips entram em cascata e "Direito" é tocado em "curso" (fica branco). | toque, teclas, toque |
| 5 · Resultados | 12,1–22,0 | "…e explora as opções no mapa. Verde… Amarelo… Vermelho…" | "Direito: 120 opções" + mapa real do Brasil com os 120 pontos (Sisu 2026, ampla). Cartão da situação: 29 superam (ex.: UFPB Santa Rita 712,94), 18 por pouco (UEPB Campina Grande 729,36), 73 abaixo (UEPB João Pessoa 732,66). | Contorno do mapa se desenha; pontos surgem de norte a sul; cada cor acende em onda no mesmo quadro em que é falada; cartão troca com mola, contador sobe; leve aproximação do mapa. | pops, confirmação |
| 6 · CTA | 21,3–29,0 | "Vai fazer o Enem? Salva esse vídeo…" | Logo, "Vai fazer o Enem?", marcador que se preenche + "SALVA / PRA DEPOIS", "ondepasso.com.br", "grátis · sem cadastro · dados públicos do MEC". | Elementos entram com mola em "Vai fazer", "Salva" (o marcador enche e pula) e "conhecer". CTA completo na tela por ~5 s. | whoosh, "salvar", assinatura final |

## Legendas

Sincronizadas com os tempos de cada palavra (transcrição do próprio áudio). Componente `AnimatedCaption`: um bloco curto por vez, a palavra falada acende em verde; "Verde", "Amarelo" e "Vermelho" na própria cor; "Salva" em verde. Arquivo `.srt` para subir no TikTok, se quiser: `docs/tiktok01/legendas.srt`.

## Dados (todos reais, do site)

Nota 720 marcada como exemplo · Direito, Sisu 2026, ampla: 120 opções com corte, 29/18/73 · exemplos da Paraíba com o corte real de cada opção.

## Áudio

- Narração normalizada (≈ −17 LUFS) em `public/audio/tiktok01/narracao.mp3`.
- Trilha leve (112 BPM, Ré maior, D–Bm–G–A) sintetizada por `scripts/gerar_trilha_tiktok01.py`: arpejo desde o 1º quadro, respiro na revelação, batida leve na demonstração, acorde aberto no CTA. Abaixa sob a voz.
- Efeitos: os do vídeo institucional + `salvar` (clique e duas notas subindo).
- Master final: −14 LUFS, pico −1 dBFS.

## Reproduzir e renderizar

```bash
cd video
npm run dev                         # Studio → pasta "tiktok" → OndePassoTikTok01
npm run render:tiktok01             # output/ondepasso-tiktok-01.mp4
bash scripts/masterizar.sh output/ondepasso-tiktok-01.mp4
```

Trocar a narração: gere a nova voz, normalize para `public/audio/tiktok01/narracao.mp3`, atualize `scripts/palavras-tiktok01.tsv` e rode `npm run audio:tiktok01` (refaz marcos, legendas e trilha). Versão sem legendas embutidas: `--props='{"narracao":true,"trilha":true,"legendas":false}'`.
