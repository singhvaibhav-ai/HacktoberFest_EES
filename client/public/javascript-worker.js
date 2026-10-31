// Runs JavaScript code inside the browser using a Web Worker.
// This file is a Web Worker, so an infinite loop here can't freeze the page:
// the page just kills the worker when the time limit runs out.

// Turns a value passed to console.log into the text we would see in a terminal.
function stringify(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return `${value}n`;
  if (value instanceof Error) return value.stack || String(value);
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// Runs `code` with fake input()/readline() and a captured console.log.
// Returns { type: 'ok', stdout } or { type: 'syntax' | 'runtime', message }.
function run(code, stdin) {
  const lines = String(stdin ?? '').split(/\r?\n/);
  // A final newline should not create an extra empty line.
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  let cursor = 0;
  const readline = () => (cursor < lines.length ? lines[cursor++] : null);
  const input = readline;

  let stdout = '';
  const fakeConsole = {};
  for (const method of ['log', 'info', 'debug', 'warn', 'error']) {
    fakeConsole[method] = (...args) => {
      stdout += args.map(stringify).join(' ') + '\n';
    };
  }

  let solution;
  try {
    solution = new Function('input', 'readline', 'console', code);
  } catch (err) {
    return { type: 'syntax', message: err instanceof Error ? err.message : String(err) };
  }

  try {
    solution(input, readline, fakeConsole);
  } catch (err) {
    return { type: 'runtime', message: err instanceof Error ? err.stack || err.message : String(err) };
  }

  return { type: 'ok', stdout };
}

self.onmessage = (event) => {
  const msg = event.data;

  if (msg.type === 'init') {
    self.postMessage({ type: 'ready' });
    return;
  }

  if (msg.type === 'run') {
    self.postMessage(run(msg.code, msg.input));
  }
};
