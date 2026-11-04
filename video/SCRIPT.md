# Roteiro — "Sua nota é o começo"

**Ideia:** incerteza → descoberta → clareza → possibilidades. A nota do Enem chega cercada de números soltos (cortes de vários cursos). O onde passo organiza esse caos num mapa: verde, amarelo, vermelho. No fim, a mensagem honesta: não é promessa de vaga, é clareza.

**Tom:** fala de amigo que já passou pelo Sisu. Frases curtas, sem slogan, sem promessa de aprovação. A voz não descreve o que aparece; ela dá sentido ao que aparece.

**Duração:** 58 s (voz de 0,5 s a 51,5 s; CTA na tela por ~9 s).

## Narração final

| Cena | Tempo no vídeo | Fala |
|---|---|---|
| 1 · Hook | 0,7 – 7,2 | Saiu a sua nota do Enem. **720.** E agora? Até onde ela te leva? |
| 2 · Marca | 8,1 – 10,8 | Pra responder isso, existe o **Onde Passo**. |
| 3 · Notas | 11,8 – 20,0 | Você digita a sua nota. Ou as cinco notas por área, pra conta ficar mais precisa. Sem cadastro, e a nota não sai do seu aparelho. |
| 4 · Curso | 20,9 – 26,2 | Depois, escolhe o curso. Direito, por exemplo: 120 opções pelo Brasil. |
| 5 · Resultados | 26,7 – 41,8 | Cada ponto do mapa é uma opção. **Verde**: sua nota supera o corte do último Sisu. **Amarelo**: por pouco. **Vermelho**: ainda falta. Toca numa opção e vê o corte de cada cota, e como ele mudou nos últimos anos. |
| 6 · Clareza | 42,8 – 47,2 | Não é promessa de vaga. É clareza pra escolher o seu próximo passo. |
| 7 · Encerramento | 48,0 – 51,5 | Onde Passo. Descubra onde a sua nota passa. |

Os tempos exatos de cada palavra estão em `src/data/narracao.json` (transcrição com tempos por palavra do ElevenLabs).

## Por que essas escolhas

- **"720" falado sozinho**: o número é o protagonista do hook; a pausa antes e depois dá peso.
- **"Pra responder isso, existe o Onde Passo"**: a marca entra como resposta à pergunta, não como anúncio.
- **"Sem cadastro, e a nota não sai do seu aparelho"**: os dois diferenciais reais do site, ditos de passagem.
- **Verde / Amarelo / Vermelho** ditos como rótulos: cada palavra acende a cor no mapa no mesmo quadro.
- **"Não é promessa de vaga"**: o site mostra uma comparação histórica; o vídeo diz isso com todas as letras.
- **Encerramento** repete o nome e a promessa do produto (descobrir onde a nota passa), sem exagero.

## Textos na tela

Poucas palavras, grandes, e só o que a voz não diz ou precisa reforçar:
"SUA NOTA DO ENEM · 720,00 (nota de exemplo)", "Até onde ela te leva?", "As notas de corte do Sisu, no mapa.",
"Sua nota." / "Ou as cinco, por área." / "Sem cadastro.", "Escolha o curso. · 602 cursos, de todas as universidades do Sisu.",
"29 de 120 opções acima do corte de 2026 · Comparação histórica · não garante aprovação.",
"Não é promessa de vaga." / "Clareza para escolher o seu próximo passo.", "Descubra onde a sua nota passa. · ondepasso.com.br · Grátis e sem cadastro".

## Dados usados (todos reais, do próprio site)

- Nota de exemplo: **720,00** (identificada como exemplo na tela). Notas por área de exemplo: 760, 690, 700, 730, 720 (média 720).
- Curso: **Direito**, Sisu 2026, ampla concorrência: 120 opções com corte no mapa; com 720: **29 superam, 18 por pouco, 73 abaixo**.
- Opção aberta: **Direito · UFPB · Santa Rita (Noturno)**: corte 712,94 (+7,06 para 720), ▲ 13,86 vs. 2025, histórico 731,90 → 699,08 → 712,94, cortes por cota reais.
- Paraíba (cena 6): UFPB Santa Rita 712,94 (supera), UEPB Campina Grande 729,36 (por pouco), UEPB João Pessoa 732,66 (abaixo).
- Cartões da abertura: 15 cortes reais de 2026 (Medicina, Direito, Psicologia, Enfermagem e Engenharia Civil; as 3 opções com mais inscritos de cada).
