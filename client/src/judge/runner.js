import { outputsMatch } from './compare.js';
import { toVerdict } from './verdict.js';

const DEFAULT_TIME_LIMIT_MS = 2000;

// Loading Python takes a few seconds, so one worker is kept warm and reused for
// every submission. It's only replaced when it can't be reused: after it was
// killed for running out of time, or after Pyodide itself crashed.
let warm = null;

function startWorker() {
  const worker = new Worker('/python-worker.js', { type: 'module' });
  const entry = { worker, isReady: false };
  entry.ready = new Promise((resolve, reject) => {
    worker.onmessage = (e) => e.data.type === 'ready' && resolve();
    worker.onerror = (e) => reject(new Error(e.message || 'Could not start Python'));
  }).then(() => {
    entry.isReady = true;
  });
  entry.ready.catch(() => {}); // a failed start is reported by the submission waiting for it
  worker.postMessage({ type: 'init' });
  return entry;
}

function getWorker() {
  warm ??= startWorker();
  return warm;
}

// Throws the current worker away and starts loading a new one straight away,
// so it's ready by the time the next submission comes in.
function replaceWorker() {
  warm?.worker.terminate();
  warm = startWorker();
}

// Starts loading Python in the background, so even the first submission doesn't wait for it.
export function warmUp() {
  getWorker();
}

// Runs one test. Resolves with { type: 'ok' | 'syntax' | 'runtime' | 'crash' | 'timeout', ... }
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
 * Returns { verdict, passed, total, message }.
 */
export async function judge(code, problem, onStatus = () => {}) {
  const { worker, ready, isReady } = getWorker();
  if (!isReady) onStatus('Starting Python...');
  try {
    await ready;
  } catch (err) {
    // Don't keep a worker that failed to start: the next submission tries again.
    worker.terminate();
    warm = null;
    throw err;
  }

  const timeLimitMs = problem.timeLimitMs ?? problem.timeLimit ?? DEFAULT_TIME_LIMIT_MS;
  const tests = problem.tests.slice(0, 1);
  let passed = 0;

  for (let i = 0; i < tests.length; i++) {
    onStatus(`Running test ${i + 1}...`);
    const result = await runTest(worker, code, tests[i].input, timeLimitMs);
    if (result.type === 'timeout' || result.type === 'crash') replaceWorker();

    if (result.type === 'ok') {
      result.passed = outputsMatch(result.stdout, tests[i].output);
    }
    const verdict = toVerdict(result);
    if (verdict !== 'AC') {
      return { verdict, passed, total: tests.length, message: result.message || '' };
    }
    passed++;
  }

  return { verdict: 'AC', passed, total: tests.length, message: '' };
}
