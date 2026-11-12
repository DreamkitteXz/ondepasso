// Compila nucleo.ts para .test-build/ usando o TypeScript instalado em ../web (funciona igual no Windows, Mac e Linux).
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const tsc = path.join(__dirname, '..', 'web', 'node_modules', 'typescript', 'bin', 'tsc');
if (!fs.existsSync(tsc)) { console.error('Falta instalar as dependências do site: rode "npm install" na pasta web.'); process.exit(1); }
const r = spawnSync(process.execPath, [tsc, 'nucleo.ts', '--outDir', '.test-build', '--module', 'commonjs', '--target', 'ES2022', '--lib', 'ES2022,DOM,DOM.Iterable', '--skipLibCheck', '--strict'], { cwd: __dirname, stdio: 'inherit' });
process.exit(r.status ?? 1);
