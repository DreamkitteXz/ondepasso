// Copia o worker, as fontes padrão e o wasm do PDF.js (pdfjs-dist) para public/pdfjs/, servidos pelo próprio site.
// Roda antes do dev e do build (package.json), então a versão sempre acompanha a do node_modules.
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const de = path.join(raiz, "node_modules", "pdfjs-dist");
const para = path.join(raiz, "public", "pdfjs");
fs.rmSync(para, { recursive: true, force: true });
fs.mkdirSync(para, { recursive: true });
fs.copyFileSync(path.join(de, "legacy", "build", "pdf.worker.min.mjs"), path.join(para, "pdf.worker.min.mjs"));
for (const pasta of ["standard_fonts", "wasm"]) fs.cpSync(path.join(de, pasta), path.join(para, pasta), { recursive: true });
const versao = JSON.parse(fs.readFileSync(path.join(de, "package.json"), "utf-8")).version;
fs.writeFileSync(path.join(para, "VERSAO.txt"), `pdfjs-dist ${versao} (Apache-2.0). Gerado por scripts/copiar-pdfjs.mjs — não edite.\n`);
console.log(`pdfjs-dist ${versao} copiado para public/pdfjs/`);
