// Gera a narração pela API do ElevenLabs e salva em audio-fonte/narracao-nova.mp3.
// A chave NUNCA fica no código: defina ELEVENLABS_API_KEY no ambiente (ou num arquivo .env que não vai para o git).
//
//   ELEVENLABS_API_KEY=... node scripts/elevenlabs-tts.mjs
//   ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=outra_voz node scripts/elevenlabs-tts.mjs
//
// A rota /v1/text-to-speech/{voice_id}/with-timestamps devolve o áudio e o alinhamento por caractere;
// o script converte para palavras e grava scripts/palavras-take-a.tsv (formato usado por alinhar_narracao.py).
// Depois: normalize (ver AUDIO_GUIDE.md), copie para public/audio/narracao.mp3 e rode `npm run audio`.
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const chave = process.env.ELEVENLABS_API_KEY;
if (!chave) { console.error("Defina ELEVENLABS_API_KEY no ambiente."); process.exit(1); }
const voz = process.env.ELEVENLABS_VOICE_ID || "b95tap8KE0pQivmClQRQ"; // Enzo - Professional and Warm (pt-BR)
const modelo = process.env.ELEVENLABS_MODEL || "eleven_v4";

const bruto = fs.readFileSync(path.join(raiz, "docs", "narration_directed.txt"), "utf-8");
const texto = bruto.split("\n").filter((l) => l.trim() && !l.startsWith("#")).join(" ").trim();

const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz}/with-timestamps?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "xi-api-key": chave, "Content-Type": "application/json" },
  body: JSON.stringify({ text: texto, model_id: modelo, language_code: "pt" }),
});
if (!r.ok) { console.error("Erro do ElevenLabs:", r.status, await r.text()); process.exit(1); }
const j = await r.json();
fs.mkdirSync(path.join(raiz, "audio-fonte"), { recursive: true });
fs.writeFileSync(path.join(raiz, "audio-fonte", "narracao-nova.mp3"), Buffer.from(j.audio_base64, "base64"));

// Caracteres → palavras (ignora as tags [..], que não são faladas).
const a = j.normalized_alignment ?? j.alignment;
const linhas = []; let palavra = "", ini = null, fim = 0, emTag = false;
a.characters.forEach((c, i) => {
  if (c === "[") emTag = true;
  if (emTag) { if (c === "]") emTag = false; return; }
  if (/\s/.test(c)) { if (palavra) linhas.push(`${palavra}\t${ini}\t${fim}`); palavra = ""; ini = null; return; }
  if (ini === null) ini = a.character_start_times_seconds[i];
  palavra += c; fim = a.character_end_times_seconds[i];
});
if (palavra) linhas.push(`${palavra}\t${ini}\t${fim}`);
fs.writeFileSync(path.join(raiz, "scripts", "palavras-take-a.tsv"), linhas.join("\n") + "\n");
console.log(`ok: audio-fonte/narracao-nova.mp3 e ${linhas.length} palavras em scripts/palavras-take-a.tsv`);
