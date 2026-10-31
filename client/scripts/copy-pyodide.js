// Copies the Pyodide runtime (Python compiled to WebAssembly) into public/pyodide,
// so the app never needs a CDN and works on a slow campus network.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.dirname(require.resolve('pyodide/package.json'));
const dest = path.join(__dirname, '..', 'public', 'pyodide');

fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  if (/\.(js|mjs|wasm|zip|json)$/.test(file) && !file.endsWith('.d.ts')) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
}
console.log(`Copied Pyodide into ${path.relative(process.cwd(), dest)}`);

try {
  const fengariSrc = require.resolve('fengari-web/dist/fengari-web.js');
  const fengariDest = path.join(__dirname, '..', 'public', 'fengari-web.js');
  fs.copyFileSync(fengariSrc, fengariDest);
  console.log(`Copied Fengari into ${path.relative(process.cwd(), fengariDest)}`);
} catch (e) {
  // Ignore if fengari-web is not installed yet
}
