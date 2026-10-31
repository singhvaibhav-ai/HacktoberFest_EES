import { outputsMatch } from './compare.js';
import { toVerdict } from './verdict.js';

const DEFAULT_TIME_LIMIT_MS = 2000;

function startWorker() {
  const worker = new Worker('/python-worker.js', { type: 'module' });
  const ready = new Promise((resolve, reject) => {
    worker.onmessage = (e) => e.data.type === 'ready' && resolve();
    worker.onerror = (e) => reject(new Error(e.message || 'Could not start Python'));
  });
  worker.postMessage({ type: 'init' });
  return { worker, ready };
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
 * Returns { verdict, passed, total, message }.
 */
export async function judge(code, problem, onStatus = () => {}) {
  onStatus('Starting Python...');
  const timeLimitMs = problem.timeLimitMs ?? problem.timeLimit ?? DEFAULT_TIME_LIMIT_MS;
  const tests = problem.tests;
  let passed = 0;
  let verdict = 'AC';
  let message = '';
  let worker;

  try {
    let ready;
    ({ worker, ready } = startWorker());
    await ready;

    for (let i = 0; i < tests.length; i++) {
      onStatus(`Running test ${i + 1}...`);
      const result = await runTest(worker, code, tests[i].input, timeLimitMs);

      if (result.type === 'ok') {
        result.passed = outputsMatch(result.stdout, tests[i].output);
      }
      const testVerdict = toVerdict(result);
      if (testVerdict === 'AC') {
        passed++;
      } else if (verdict === 'AC') {
        verdict = testVerdict;
        message = result.message || '';
      }

      if (result.type === 'timeout' && i < tests.length - 1) {
        ({ worker, ready } = startWorker());
        await ready;
      }
    }
  } finally {
    worker?.terminate();
  }

  return { verdict, passed, total: tests.length, message };
}
