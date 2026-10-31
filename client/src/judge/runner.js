import { outputsMatch } from './compare.js';
import { toVerdict } from './verdict.js';

const DEFAULT_TIME_LIMIT_MS = 2000;

function startWorker(language) {
  const src = language === 'javascript' ? '/js-worker.js' : '/python-worker.js';
  const worker = new Worker(src, { type: 'module' });
  const ready = new Promise((resolve, reject) => {
    worker.onmessage = (e) => e.data.type === 'ready' && resolve();
    worker.onerror = (e) => reject(new Error(e.message || 'Could not start the language worker'));
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
* Returns { verdict, passed, total, message, results, firstFailure } where
* results is one entry per test:
* { state: 'passed' | 'failed' | 'timeout' | 'not-run', ...first failure only:
* verdict, input, expected, actual, message }
*/
export async function judge(code, language, problem, onStatus = () => { }) {
  const langLabel = language === 'javascript' ? 'JavaScript' : 'Python';
  onStatus(`Starting ${langLabel}...`);
  const { worker, ready } = startWorker(language);
  await ready;

  const timeLimitMs = problem.timeLimitMs ?? problem.timeLimit ?? DEFAULT_TIME_LIMIT_MS;
  const tests = problem.tests ?? [];
  const results = [];
  let failed = null;

  for (let i = 0; i < tests.length; i++) {
    if (failed) {
      results.push({ state: 'not-run' });
      continue;
    }
    onStatus(`Running test ${i + 1}...`);
    const result = await runTest(worker, code, tests[i].input, timeLimitMs);
    if (result.type === 'ok') {
      result.passed = outputsMatch(result.stdout, tests[i].output);
    }
    const verdict = toVerdict(result);
    if (verdict === 'AC') {
      results.push({ state: 'passed' });
      continue;
    }
    failed = {
      state: verdict === 'TLE' ? 'timeout' : 'failed',
      verdict,
      input: tests[i].input,
      expected: tests[i].output,
      actual: result.type === 'ok' ? result.stdout : '',
      message: result.message || '',
    };
    results.push(failed);
  }

  worker.terminate();
  return {
    verdict: failed ? failed.verdict : 'AC',
    passed: results.filter((r) => r.state === 'passed').length,
    total: tests.length,
    message: failed ? failed.message : '',
    results,
    firstFailure: failed,
  };
}