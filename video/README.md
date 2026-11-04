# onde passo — vídeo oficial de apresentação

Vídeo de lançamento de ~58 s feito em **Remotion + React + TypeScript**, com narração do **ElevenLabs**, trilha e efeitos sintetizados no próprio projeto e dados **reais** do site (cortes do Sisu 2026).

| Saída | Formato | Arquivo |
|---|---|---|
| Principal | 1920 × 1080 (16:9), H.264, 30 fps | `output/ondepasso-launch-16x9.mp4` |
| Secundária | 1080 × 1920 (9:16), H.264, 30 fps — cenas reorganizadas, não recortadas | `output/ondepasso-launch-9x16.mp4` |
| Sem narração | 16:9, só trilha e efeitos | `output/ondepasso-launch-16x9-sem-narracao.mp4` |

`output/` não vai para o git (os MP4 são gerados).

## Estrutura

```
video/
├── src/
│   ├── Root.tsx, index.ts            registro das composições
│   ├── timeline.ts                   LINHA DO TEMPO CENTRAL: duração, cenas, marcos da voz, efeitos sonoros
│   ├── compositions/
│   │   ├── Filme.tsx                 o filme (fundo, cenas, logo do cabeçalho, áudio) — igual nos dois formatos
│   │   ├── OndePassoVideo.tsx        composição 16:9  (id OndePasso16x9)
│   │   └── OndePassoVertical.tsx     composição 9:16  (id OndePasso9x16)
│   ├── scenes/                       7 cenas: Intro (hook), BrandReveal, Input, Course, Results, Clarity, Outro
│   ├── components/                   BrandLogo, LogoReveal, AnimatedText, AnimatedCounter, CursorAnimation,
│   │                                 MapaBrasil, ResultCard (cartões do site), ui (chips, botões, campo…), Fundo, AudioMix
│   ├── lib/                          tema (tokens do site), anim (helpers de tempo), layout (16:9 × 9:16), logo-dados
│   └── data/                         dados.json (dados reais) e narracao.json (marcos da voz) — gerados por scripts
├── public/
│   ├── audio/narracao.mp3            narração (ElevenLabs, normalizada)
│   ├── audio/trilha.wav, sfx/*.wav   trilha e efeitos (sintetizados por scripts/gerar_trilha.py)
│   ├── fonts/                        Faustina SemiBold e Geist (as mesmas do site)
│   └── images/logo-escuro.svg        logo oficial
├── audio-fonte/                      takes originais do ElevenLabs (sem tratamento)
├── scripts/                          gerar-dados.mjs, alinhar_narracao.py, gerar_trilha.py, elevenlabs-tts.mjs, previews.mjs, folha.py
├── docs/                             narration.txt, narration_directed.txt, narration_segments.json, elevenlabs_setup.md
└── SCRIPT.md · STORYBOARD.md · CREATIVE_DIRECTION.md · AUDIO_GUIDE.md · RENDERING.md
```

## Abrir o preview

```bash
cd video
npm install          # primeira vez
npm run dev          # abre o Remotion Studio (http://localhost:3000)
```

No Studio, escolha **OndePasso16x9** ou **OndePasso9x16** na pasta `onde-passo`. A linha do tempo mostra as cenas com nome.

## Mudar textos

- **Narração**: `docs/narration.txt` (texto limpo) e `docs/narration_directed.txt` (o que vai para o ElevenLabs). Se o texto mudar, gere o áudio de novo (abaixo).
- **Textos na tela**: dentro de cada cena em `src/scenes/` (são poucas palavras por tela, de propósito). Use `*asteriscos*` no `AnimatedText` para destacar em verde.
- **Dados** (cursos, cortes, a opção de exemplo, a nota de exemplo 720): `scripts/gerar-dados.mjs` → `npm run dados`. Ele lê `web/out` (rode `npm run build` em `web/` antes) e `dados/saida/site`.

## Mudar duração e ritmo

Tudo em `src/timeline.ts`:
- `DURACAO` (total), `NARRACAO_INICIO` (quando a voz entra);
- `CENAS` (início e fim de cada cena, ancorados nos marcos da voz `M.*`);
- `SFX` (cada efeito: arquivo, instante, volume).

As animações dentro das cenas usam os mesmos marcos (`M.verde`, `M.toca`…), então trocar a narração e rodar `npm run audio` reposiciona tudo.

## Trocar a narração (ElevenLabs)

Veja `docs/elevenlabs_setup.md`. Resumo:
1. Gere o áudio (painel do ElevenLabs ou `ELEVENLABS_API_KEY=… npm run tts`).
2. Normalize e copie para `public/audio/narracao.mp3` (comando no `AUDIO_GUIDE.md`).
3. Atualize `scripts/palavras-take-a.tsv` com os tempos por palavra (o `npm run tts` já grava) e rode `npm run audio`.

## Exportar

Ver `RENDERING.md`. Atalhos:

```bash
npm run render:16x9
npm run render:9x16
npm run render:sem-narracao
```

## Conferir quadros

```bash
node scripts/previews.mjs ambos          # quadros de início/meio/fim das cenas nos dois formatos
python3 scripts/folha.py                  # junta em folhas de contato (previews/)
```

## Fontes e licenças

- Faustina (OFL) e Geist (OFL): as mesmas fontes do site.
- Narração: gerada no ElevenLabs pela conta do projeto; o uso comercial segue o plano da conta.
- Trilha e efeitos: sintetizados do zero por `scripts/gerar_trilha.py` (sem amostras de terceiros).
- Dados: cortes públicos do Sisu (MEC). O vídeo não promete aprovação e mostra a nota 720 como **exemplo**.
