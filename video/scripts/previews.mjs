// Gera quadros de conferência (início, meio e fim de cada cena) nos dois formatos.
// Uso: node scripts/previews.mjs [16x9|9x16|ambos|tiktok01] [segundos...]
// Saída: previews/<formato>/t<seg>.jpg  (a pasta previews/ não vai para o git)
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const raiz = path.resolve(import.meta.dirname, "..");
const [qual = "ambos", ...segs] = process.argv.slice(2);
const formatos = qual === "ambos" ? ["16x9", "9x16"] : [qual];
const tempos = segs.length ? segs.map(Number) : [0.3, 1.6, 3.2, 5.6, 6.9, 8.4, 9.4, 10.4, 11.3, 12.6, 14.6, 17.6, 19.3, 20.8, 22.0, 23.0, 25.2, 26.6, 28.0, 30.4, 34.0, 36.6, 37.9, 38.6, 39.4, 41.5, 43.0, 44.0, 46.2, 47.6, 48.6, 49.4, 51.5, 56.0];
const browserExecutable = process.env.REMOTION_CHROME || undefined;

const serveUrl = await bundle({ entryPoint: path.join(raiz, "src/index.ts") });
for (const f of formatos) {
  const id = { "16x9": "OndePasso16x9", "9x16": "OndePasso9x16", tiktok01: "OndePassoTikTok01" }[f];
  const composition = await selectComposition({ serveUrl, id, inputProps: {}, browserExecutable });
  const dir = path.join(raiz, "previews", f);
  fs.mkdirSync(dir, { recursive: true });
  for (const s of tempos) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
    const output = path.join(dir, `t${s.toFixed(1).padStart(4, "0")}.jpg`);
    await renderStill({ composition, serveUrl, output, frame, imageFormat: "jpeg", jpegQuality: 85, browserExecutable, scale: 0.5 });
    process.stdout.write(".");
  }
  console.log(`\n${f}: ${tempos.length} quadros em ${dir}`);
}
