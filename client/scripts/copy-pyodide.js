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

// Also ensure Ruby runtime files are copied if available
try {
  const rubyDest = path.join(__dirname, '..', 'public', 'ruby');
  fs.mkdirSync(rubyDest, { recursive: true });
  const rubyWasmSrc = require.resolve('@ruby/3.3-wasm-wasi/dist/ruby.wasm');
  fs.copyFileSync(rubyWasmSrc, path.join(rubyDest, 'ruby.wasm'));

  const wasiCjsIndex = require.resolve('@ruby/wasm-wasi');
  const browserUmdSrc = path.resolve(path.dirname(wasiCjsIndex), '..', 'browser.umd.js');
  fs.copyFileSync(browserUmdSrc, path.join(rubyDest, 'browser.umd.js'));
  console.log(`Copied ruby.wasm into ${path.relative(process.cwd(), rubyDest)}`);
} catch {
  // Ignore if ruby packages are not installed
}
