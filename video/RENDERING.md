# Renderização

## Requisitos

- Node 20+ (testado com Node 22) e `npm install` em `video/`.
- Remotion 4.0.540 (`@remotion/cli`, `@remotion/media`, `@remotion/fonts`, `@remotion/bundler`, `@remotion/renderer`).
- FFmpeg no PATH só para a masterização (`scripts/masterizar.sh`) e para medir loudness. O Remotion já traz o próprio encoder.
- Python 3 com `numpy` e `scipy` só se for regenerar trilha/efeitos (`npm run audio`).
- O Remotion baixa um Chrome headless na primeira renderização. Se a rede bloquear, aponte para um Chrome/Chromium local com `--browser-executable=/caminho/do/chrome` (ou `REMOTION_CHROME=...` nos scripts).

## Exportar

```bash
cd video
npm run render:16x9          # output/ondepasso-launch-16x9.mp4      (1920×1080)
npm run render:9x16          # output/ondepasso-launch-9x16.mp4      (1080×1920)
npm run render:sem-narracao  # output/ondepasso-launch-16x9-sem-narracao.mp4
# masterização do áudio (−14 LUFS / −1 dBTP; a versão sem narração usa −16)
bash scripts/masterizar.sh output/ondepasso-launch-16x9.mp4
bash scripts/masterizar.sh output/ondepasso-launch-9x16.mp4
bash scripts/masterizar.sh output/ondepasso-launch-16x9-sem-narracao.mp4 -16
```

Qualidade usada: H.264, `--crf=18`, 30 fps, AAC 256 kbps após a masterização. Cada render levou ~4 min neste ambiente (8 vCPU, sem GPU).

A versão vertical é a **mesma linha do tempo** com as cenas reorganizadas por `useLayout()` (texto em cima, interface no meio, nada importante nos 320 px de baixo nem perto da borda direita, onde ficam os botões das redes).

## Verificação feita (03/11/2026)

| Item | Resultado |
|---|---|
| Duração | 58,0 s nas três versões |
| Resolução / fps | 1920×1080 e 1080×1920, 30 fps, H.264 + AAC 48 kHz estéreo |
| Loudness | 16:9 e 9:16: −14,0 LUFS, pico −0,9 dBFS · sem narração: −16,0 LUFS, pico −1,0 dBFS |
| Quadros pretos / congelados | nenhum (`blackdetect`, `freezedetect` do FFmpeg) |
| TypeScript | `npx tsc --noEmit` sem erros |
| Quadros conferidos | início, meio e fim de cada cena nos dois formatos e um quadro logo após cada palavra-chave da voz (720, Onde Passo, digita, cinco notas, Direito, 120, Verde, Amarelo, Vermelho, Toca, cota, mudou, clareza, Onde Passo final) — `node scripts/previews.mjs ambos` + `python3 scripts/folha.py` |
| Sincronia | as animações usam os tempos por palavra da transcrição do próprio áudio (ElevenLabs Speech to Text) |

**Não testado aqui:** a audição da mixagem (não há saída de som neste ambiente). Os níveis foram medidos (loudness, picos, voz ~15 dB acima da trilha), mas ouça o resultado antes de publicar, principalmente a trilha sintetizada e os efeitos.
