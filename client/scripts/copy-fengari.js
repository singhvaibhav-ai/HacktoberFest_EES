// Copies/bundles Fengari (Lua VM written in JavaScript) into public/fengari.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = require.resolve('fengari-web/dist/fengari-web.bundle.js');
const dest = path.join(__dirname, '..', 'public', 'fengari.mjs');

let code = fs.readFileSync(bundlePath, 'utf8');
code = code.replace('module.exports=', 'const fengari = ');
code += '\nexport default fengari;\nexport const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;\n';

fs.writeFileSync(dest, code);
console.log(`Prepared Fengari at ${path.relative(process.cwd(), dest)}`);
