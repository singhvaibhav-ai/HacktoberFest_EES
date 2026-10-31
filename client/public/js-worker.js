// Runs user JavaScript in this worker with a fake stdin — the JS twin of
// python-worker.js: same init/run protocol, same result shapes.
// An infinite loop can't freeze the page: the judge kills this worker
// when the time limit runs out.

let stdout = '';
let inputLines = [];
let inputIndex = 0;

function input() {
    if (inputIndex >= inputLines.length) {
        throw new Error('Ran out of input (EOF while calling input())');
    }
    return inputLines[inputIndex++];
}
const readline = input;

function formatValue(value) {
    if (typeof value === 'string') return value;
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'object') {
        try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value);
}

function log(...args) {
    const line = args.map(formatValue).join(' ');
    stdout += (stdout ? '\n' : '') + line;
}

function runOnce(code, stdin) {
    stdout = '';
    inputLines = stdin.split('\n');
    if (inputLines.length && inputLines[inputLines.length - 1] === '') inputLines.pop(); // ignore trailing newline in test files
    inputIndex = 0;

    const fakeConsole = { log, info: log, warn: log, error: log, debug: log };

    let fn;
    try {
        fn = new Function('console', 'input', 'readline', `'use strict'; \n${ code } \n`);
    } catch (err) {
        return { kind: 'syntax', message: String(err) };
    }
    try {
        fn(fakeConsole, input, readline);
        return { kind: 'ok', stdout };
    } catch (err) {
        return { kind: 'runtime', message: (err && err.stack) || String(err) };
    }
}

self.onmessage = (event) => {
    const msg = event.data;
    if (msg.type === 'init') {
        self.postMessage({ type: 'ready' });
        return;
    }
    if (msg.type === 'run') {
        const result = runOnce(msg.code, msg.input);
        if (result.kind === 'ok') self.postMessage({ type: 'ok', stdout: result.stdout });
        else self.postMessage({ type: result.kind, message: result.message });
    }
};