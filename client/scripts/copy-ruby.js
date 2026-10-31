// Copies the ruby.wasm runtime into public/ruby,
// so the app never needs a CDN and works on a slow campus network.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dest = path.join(__dirname, '..', 'public', 'ruby');

fs.mkdirSync(dest, { recursive: true });

try {
  const rubyWasmSrc = require.resolve('@ruby/3.3-wasm-wasi/dist/ruby.wasm');
  fs.copyFileSync(rubyWasmSrc, path.join(dest, 'ruby.wasm'));

  const wasiCjsIndex = require.resolve('@ruby/wasm-wasi');
  const browserUmdSrc = path.resolve(path.dirname(wasiCjsIndex), '..', 'browser.umd.js');
  fs.copyFileSync(browserUmdSrc, path.join(dest, 'browser.umd.js'));

  console.log(`Copied ruby.wasm into ${path.relative(process.cwd(), dest)}`);
} catch (e) {
  console.warn('Could not copy ruby.wasm:', e.message);
}
