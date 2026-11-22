# Relatório 01 (anúncio do relatório pago)

- Composição: `OndePassoRelatorio01` (src/relatorio01/), 1080×1920, 30 fps, 34,5 s.
- Telas: capturas reais do relatório em public/images/relatorio01/, feitas com o servidor SIMULADO (compra sem dinheiro) e notas de exemplo (Redação 880, Linguagens 645, Matemática 720,4, Humanas 662, Natureza 690; Enfermagem e Medicina em MG e SP).
- Narração: public/audio/relatorio01/narracao.mp3 (take A). Trilha: `python3 scripts/gerar_trilha_relatorio01.py`.
- Render (como foi feito): vídeo mudo + áudio separado, juntados sem reencodar o vídeo:
  npx remotion render OndePassoRelatorio01 output/relatorio01-video.mp4 --props='{"narracao":false,"trilha":false,"legendas":true}' --muted
  npx remotion render OndePassoRelatorio01 output/relatorio01-audio.wav --codec=wav --props='{"narracao":true,"trilha":true,"legendas":false}'
  ffmpeg -i output/relatorio01-video.mp4 -i output/relatorio01-audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -af loudnorm=I=-14:TP=-1.5:LRA=11 -shortest output/ondepasso-relatorio-01.mp4
- Texto do post: POST.md. Regras: sem promessa de aprovação nem urgência; preço escrito; aviso no fim.
