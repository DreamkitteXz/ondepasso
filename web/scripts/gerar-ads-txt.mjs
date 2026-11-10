// Gera public/ads.txt a partir de NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-…), antes do dev e do build.
// Sem ID válido, o arquivo não existe. Ordem de prioridade igual à do Next: variável de ambiente (ex.: painel da
// Cloudflare) > .env.production.local > .env.local > .env.production > .env. Ver ANUNCIOS.md.
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const destino = path.join(raiz, "public", "ads.txt");
let id = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
for (const f of [".env.production.local", ".env.local", ".env.production", ".env"]) {
  if (id !== undefined) break;
  try {
    const m = fs.readFileSync(path.join(raiz, f), "utf8").match(/^\s*NEXT_PUBLIC_ADSENSE_CLIENT\s*=\s*["']?([^"'\s#]*)/m);
    if (m) id = m[1];
  } catch {}
}
id = (id ?? "").trim();
if (/^ca-pub-\d{16}$/.test(id)) {
  // f08c47fec0942fa0 é o identificador fixo do Google na lista de autorizados (TAG-ID).
  fs.writeFileSync(destino, `google.com, ${id.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`);
  console.log(`ads.txt gerado para ${id}`);
} else {
  fs.rmSync(destino, { force: true });
}
