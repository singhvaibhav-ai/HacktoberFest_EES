// Copies Clang (the C/C++ compiler, built for WebAssembly by the YoWASP project)
// into public/clang, so C and C++ code can be compiled right in the browser
// without a CDN, just like Pyodide.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolves to node_modules/@yowasp/clang/gen/bundle.js; everything we need sits next to it.
const src = path.dirname(require.resolve('@yowasp/clang'));
const dest = path.join(__dirname, '..', 'public', 'clang');

fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  if (/\.(js|wasm|tar)$/.test(file)) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
}
console.log(`Copied Clang into ${path.relative(process.cwd(), dest)}`);
