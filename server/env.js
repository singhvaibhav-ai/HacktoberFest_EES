import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT_ENV_FILE = fileURLToPath(new URL('../.env', import.meta.url));

function parseEnvFile(contents) {
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || Object.hasOwn(process.env, match[1])) continue;

    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
      if (match[2].startsWith('"')) value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }

    process.env[match[1]] = value;
  }
}

export function loadEnv() {
  let contents;
  try {
    contents = fs.readFileSync(ROOT_ENV_FILE, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  // Use Node's parser where available, with a small fallback for older Node 20 releases.
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(ROOT_ENV_FILE);
  } else {
    parseEnvFile(contents);
  }
}
