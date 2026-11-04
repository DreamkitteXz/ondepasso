#!/usr/bin/env bash
# Masterização final do áudio (loudness para web/redes): -14 LUFS, pico verdadeiro -1 dBTP. O vídeo é copiado sem recodificar.
# Uso: bash scripts/masterizar.sh output/ondepasso-launch-16x9.mp4 [alvo_LUFS]
set -euo pipefail
ent="$1"; alvo="${2:--14}"; tmp="${ent%.mp4}.tmp.mp4"
med=$(ffmpeg -hide_banner -i "$ent" -af loudnorm=I=$alvo:TP=-1:LRA=9:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
val() { echo "$med" | grep "\"$1\"" | sed -E 's/.*: "?([^",]*)"?,?/\1/'; }
ffmpeg -hide_banner -loglevel error -y -i "$ent" -c:v copy \
  -af "loudnorm=I=$alvo:TP=-1:LRA=9:measured_I=$(val input_i):measured_TP=$(val input_tp):measured_LRA=$(val input_lra):measured_thresh=$(val input_thresh):offset=$(val target_offset):linear=true,aresample=48000" \
  -c:a aac -b:a 256k -movflags +faststart "$tmp"
mv "$tmp" "$ent"
ffmpeg -hide_banner -i "$ent" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" | tr -s ' ' | tr '\n' ' '; echo " ← $ent"
