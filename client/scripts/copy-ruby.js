// Copies the Ruby runtime (CRuby compiled to WebAssembly) into public/ruby,
// so the app never needs a CDN and works on a slow campus network.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wasm = require.resolve('@ruby/4.0-wasm-wasi/dist/ruby+stdlib.wasm');
const dest = path.join(__dirname, '..', 'public', 'ruby');

fs.mkdirSync(dest, { recursive: true });
fs.copyFileSync(wasm, path.join(dest, 'ruby+stdlib.wasm'));
console.log(`Copied Ruby into ${path.relative(process.cwd(), dest)}`);
