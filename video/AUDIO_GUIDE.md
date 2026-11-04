# Guia de áudio

## Camadas

| Camada | Arquivo | Origem | Volume no filme |
|---|---|---|---|
| Narração | `public/audio/narracao.mp3` | ElevenLabs, modelo `eleven_v4`, voz **Enzo - Professional and Warm** (pt-BR), take A; normalizada para ≈ −17 LUFS, pico −1,5 dBTP | 1,0 a partir de 0,5 s |
| Trilha | `public/audio/trilha.wav` | Sintetizada por `scripts/gerar_trilha.py` (material próprio) | 0,55; abaixa para 0,17 sob a voz (rampas de 0,25 s) |
| Efeitos | `public/audio/sfx/*.wav` | Sintetizados pelo mesmo script | por evento, em `SFX` de `src/timeline.ts` |

A mixagem está em `src/components/AudioMix.tsx`. O "ducking" usa os trechos com voz (`FALA`), calculados das palavras da narração.

## Trilha (o que toca e quando)

- **Ato 1 · incerteza (0 → 9,9 s):** acorde suspenso grave (B–F#–C#–E), pulso de tique em colcheias, notas dedilhadas que crescem em "E agora?", subida de ruído até a revelação.
- **Ato 2 · descoberta (9,9 → 42,6 s):** batida grave no "Onde Passo"; progressão D – A – Bm – G a 100 BPM com pad e baixo; batida leve entra em "digita", chimbal em "escolhe", arpejo dedilhado em toda a demonstração.
- **Ato 3 · clareza (42,6 → 48 s):** sai a batida; pad aberto (G add9) e três notas de sino em "clareza" e "próximo passo".
- **Ato 4 · assinatura (48 s →):** Dmaj9 com sinos D–F#–A–C# no "Onde Passo" final; fade de 3 s.

## Efeitos

`contador` (números rolando), `confirma` (dois sinos), `whoosh`/`whoosh-curto` (transições), `toque` (clique de interface), `tecla` (digitação), `pop`/`pop-grave` (cores no mapa), `assinatura` (logo), `subida` (antes da clareza).

## Níveis medidos

Medição da render final com `ffmpeg -af ebur128=peak=true` está em `RENDERING.md`. Alvo: −16 a −14 LUFS integrados, pico ≤ −1 dBTP, voz sempre ~15 dB acima da trilha.

## Trocar a narração

1. Gere a nova voz (ver `docs/elevenlabs_setup.md`). Guarde o original em `audio-fonte/`.
2. Normalize e converta:
   ```bash
   ffmpeg -i audio-fonte/narracao-nova.mp3 -af "loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000" -c:a libmp3lame -b:a 192k public/audio/narracao.mp3
   ```
3. Atualize `scripts/palavras-take-a.tsv` (palavra, início, fim em segundos — o `npm run tts` grava sozinho; se gerou pelo painel, use a transcrição com tempos por palavra do ElevenLabs Speech to Text).
4. `npm run audio` → recalcula os marcos (`src/data/narracao.json`) e regenera a trilha nos novos tempos.
5. Abra o Studio e confira; renderize.

## Trocar a trilha por uma música licenciada

Coloque o arquivo em `public/audio/` e troque o `src` da trilha em `AudioMix.tsx`. Use só música com licença comercial (ou gerada no ElevenLabs Music conforme o plano da conta). Ajuste `VOL.trilha` e `VOL.trilhaSobVoz`.
