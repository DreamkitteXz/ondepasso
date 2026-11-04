# ElevenLabs — configuração da narração

## O que foi usado

- **Modelo:** `eleven_v4` (aceita tags de direção como `[warmly]`, `[softly]`, `[pause]`, que não são faladas).
- **Voz:** **Enzo - Professional and Warm** (`b95tap8KE0pQivmClQRQ`), pt-BR. Escolhida por soar como "um amigo de confiança dando uma recomendação": jovem-adulto, médio-grave, ritmo natural, sem tom de vendedor.
- **Texto:** `docs/narration_directed.txt`. Duas takes geradas; usada a **take A** (50,9 s). As duas estão em `audio-fonte/`.
- **Sincronia:** transcrição com tempos por palavra (ElevenLabs Speech to Text) → `scripts/palavras-take-a.tsv` → `scripts/alinhar_narracao.py`.

### Alternativas de voz (pt-BR, biblioteca do ElevenLabs)

| Voz | ID | Quando usar |
|---|---|---|
| Enzo - Professional and Warm | `b95tap8KE0pQivmClQRQ` | padrão (próximo, confiável) |
| Jonathan | `TblFZwTikhe7REPnw5nh` | mais jovem e conversacional |
| Renato - Warm and melodic | `U9M8vn5UNn2nhPX9vRPE` | mais leve, para redes sociais |
| Isabela - Commercial & Corporate | `Pxxu743NJcLUqO1QxfD6` | voz feminina institucional |
| Lari Diniz | `Yu6uoFniEUcJhbrF7K1D` | voz feminina animada |

## Gerar pela API (sem chave no código)

```bash
cd video
cp .env.example .env            # opcional: guarde a chave aqui (o .env não vai para o git)
export ELEVENLABS_API_KEY=sk_...  # ou via .env carregado pelo seu shell
npm run tts                       # = node scripts/elevenlabs-tts.mjs
# opcional: ELEVENLABS_VOICE_ID=... ELEVENLABS_MODEL=eleven_v4 npm run tts
```

O script chama `POST /v1/text-to-speech/{voice_id}/with-timestamps`, salva `audio-fonte/narracao-nova.mp3` e grava os tempos por palavra em `scripts/palavras-take-a.tsv`. Confira na documentação atual do ElevenLabs se o modelo/rota mudaram (https://elevenlabs.io/docs).

## Gerar pelo painel (sem API)

1. Text to Speech → modelo **Eleven v4** → voz Enzo → cole `docs/narration_directed.txt` (sem as linhas `#`).
2. Baixe o MP3 e salve em `audio-fonte/`.
3. Speech to Text com tempos por palavra → copie para `scripts/palavras-take-a.tsv` (palavra⇥início⇥fim).
4. Siga os passos 2–5 de `AUDIO_GUIDE.md → Trocar a narração`.

## Regras

- Nunca coloque a chave em arquivos do repositório.
- Se mudar o texto, mantenha as frases-âncora de `scripts/alinhar_narracao.py` (ou atualize a lista `MARCOS` lá).
