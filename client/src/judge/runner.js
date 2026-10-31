import { outputsMatch } from './compare.js';
import { toVerdict } from './verdict.js';

const DEFAULT_TIME_LIMIT_MS = 2000;

// Each language runs in its own Web Worker.
const WORKERS = {
  python: { url: '/python-worker.js', label: 'Python' },
  javascript: { url: '/javascript-worker.js', label: 'JavaScript' },
};

function startWorker(language) {
  const { url, label } = WORKERS[language] ?? WORKERS.python;
  const worker = new Worker(url, { type: 'module' });
  const ready = new Promise((resolve, reject) => {
    worker.onmessage = (e) => e.data.type === 'ready' && resolve();
    worker.onerror = (e) => reject(new Error(e.message || `Could not start ${label}`));
  });
  worker.postMessage({ type: 'init' });
  return { worker, ready, label };
}

// Runs one test. Resolves with { type: 'ok' | 'syntax' | 'runtime' | 'timeout', ... }
function runTest(worker, code, input, timeLimitMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ type: 'timeout' });
    }, timeLimitMs);

    worker.onmessage = (e) => {
      clearTimeout(timer);
      resolve(e.data);
    };
    worker.postMessage({ type: 'run', code, input });
  });
}

/**
 * Judges a submission against a problem's tests.
 * onStatus is called with short status messages for the UI.
 * language is a language id from languages.js ('python' by default).
 * Returns { verdict, passed, total, message }.
 */
export async function judge(code, problem, onStatus = () => {}, language = 'python') {
  const { worker, ready, label } = startWorker(language);
  onStatus(`Starting ${label}...`);
  await ready;

  const timeLimitMs = problem.timeLimitMs ?? problem.timeLimit ?? DEFAULT_TIME_LIMIT_MS;
  const tests = problem.tests.slice(0, 1);
  let passed = 0;

  for (let i = 0; i < tests.length; i++) {
    onStatus(`Running test ${i + 1}...`);
    const result = await runTest(worker, code, tests[i].input, timeLimitMs);

    if (result.type === 'ok') {
      result.passed = outputsMatch(result.stdout, tests[i].output);
    }
    const verdict = toVerdict(result);
    if (verdict !== 'AC') {
      worker.terminate();
      return { verdict, passed, total: tests.length, message: result.message || '' };
    }
    passed++;
  }

  worker.terminate();
  return { verdict: 'AC', passed, total: tests.length, message: '' };
}
