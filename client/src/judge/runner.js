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
 * Returns { verdict, passed, total, message, tests }.
 */
export async function judge(code, problem, onStatus = () => {}) {
  onStatus('Starting Python...');
  let { worker, ready } = startWorker();
  await ready;

  const timeLimitMs = problem.timeLimitMs ?? problem.timeLimit ?? DEFAULT_TIME_LIMIT_MS;
  const tests = problem.tests || [];
  let passed = 0;
  const testResults = [];
  let firstFailingVerdict = null;
  let firstFailingMessage = '';

  for (let i = 0; i < tests.length; i++) {
    onStatus(`Running test ${i + 1} of ${tests.length}...`);
    const test = tests[i];
    const result = await runTest(worker, code, test.input, timeLimitMs);

    if (result.type === 'ok') {
      result.passed = outputsMatch(result.stdout, test.output);
    }
    const verdict = toVerdict(result);
    const testPassed = verdict === 'AC';
    if (testPassed) {
      passed++;
    } else if (!firstFailingVerdict) {
      firstFailingVerdict = verdict;
      firstFailingMessage = result.message || '';
    }

    testResults.push({
      testIndex: i + 1,
      input: test.input,
      expected: test.output,
      actual: result.stdout ?? '',
      verdict,
      passed: testPassed,
      message: result.message || '',
    });

    if (result.type === 'syntax') {
      // Syntax error stops further execution; mark remaining tests as CE
      for (let j = i + 1; j < tests.length; j++) {
        testResults.push({
          testIndex: j + 1,
          input: tests[j].input,
          expected: tests[j].output,
          actual: '',
          verdict: 'CE',
          passed: false,
          message: result.message || '',
        });
      }
      break;
    }

    if (result.type === 'timeout') {
      // Worker was terminated by timeout; start a fresh one for remaining tests
      if (i < tests.length - 1) {
        const next = startWorker();
        await next.ready;
        worker = next.worker;
      }
    }
  }

  worker.terminate();

  const finalVerdict = firstFailingVerdict || (tests.length > 0 && passed === tests.length ? 'AC' : 'AC');
  return {
    verdict: finalVerdict,
    passed,
    total: tests.length,
    message: firstFailingMessage,
    tests: testResults,
  };
}
