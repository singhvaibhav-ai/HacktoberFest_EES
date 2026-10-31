import { outputsMatch } from './compare.js';
import { toVerdict } from './verdict.js';

const DEFAULT_TIME_LIMIT_MS = 2000;
// Compiling isn't timed like a test, but a compiler stuck on pathological code shouldn't hang the judge.
const COMPILE_TIME_LIMIT_MS = 30000;

function startWorker(language, onStatus) {
  const worker = new Worker(language.worker, { type: 'module' });
  const ready = new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      if (e.data.type === 'ready') resolve();
      else if (e.data.type === 'progress') onStatus(e.data.message);
      else reject(new Error(e.data.message || `Could not start ${language.label}`));
    };
    worker.onerror = (e) => reject(new Error(e.message || `Could not start ${language.label}`));
  });
  worker.postMessage({ type: 'init' });
  return { worker, ready };
}

// Compiles the code once, before any test runs. Resolves with { type: 'compiled' | 'syntax', ... }
function compile(worker, code, language) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ type: 'syntax', message: `Compiling took longer than ${COMPILE_TIME_LIMIT_MS / 1000} seconds.` });
    }, COMPILE_TIME_LIMIT_MS);

    worker.onmessage = (e) => {
      clearTimeout(timer);
      resolve(e.data);
    };
    worker.postMessage({ type: 'compile', code, language: language.id });
  });
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
 * language is an entry from LANGUAGES (see languages.js).
 * onStatus is called with short status messages for the UI.
 * Returns { verdict, passed, total, message }.
 */
export async function judge(code, problem, language, onStatus = () => {}) {
  onStatus(`Starting ${language.label}...`);
  const { worker, ready } = startWorker(language, onStatus);
  await ready;

  const timeLimitMs = problem.timeLimitMs ?? problem.timeLimit ?? DEFAULT_TIME_LIMIT_MS;
  const tests = problem.tests.slice(0, 1);
  let passed = 0;

  if (language.compiled) {
    onStatus('Compiling...');
    const result = await compile(worker, code, language);
    if (result.type !== 'compiled') {
      worker.terminate();
      return { verdict: toVerdict(result), passed, total: tests.length, message: result.message || '' };
    }
  }

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
