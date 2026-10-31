// Runs Ruby code inside the browser using ruby.wasm.
// This file is a Web Worker, so an infinite loop here can't freeze the page:
// the page just kills the worker when the time limit runs out.
import { DefaultRubyVM } from '@ruby/wasm-wasi/dist/browser';

let vm = null;

function inputBytes(text) {
  return Array.from(new TextEncoder().encode(text)).join(',');
}

function runRuby(code, input) {
  vm.eval(`
    require 'stringio'
    $stdin = StringIO.new([${inputBytes(input)}].pack('C*').force_encoding('UTF-8'))
    $__out = StringIO.new
    $stdout = $__out
  `);

  let error = null;
  try {
    vm.eval(code);
  } catch (err) {
    error = err;
  }

  let stdout = '';
  try {
    stdout = vm.eval('$__out.string').toString();
  } catch {
    stdout = '';
  }
  try {
    vm.eval('$stdout = STDOUT');
  } catch {
    // The submitted code may have replaced the stream already.
  }

  if (error) {
    const message = String(error.message || error);
    return { type: /syntax error/i.test(message) ? 'syntax' : 'runtime', message };
  }
  return { type: 'ok', stdout };
}

self.onmessage = async (event) => {
  const msg = event.data;

  if (msg.type === 'init') {
    try {
      const response = await fetch('/ruby/ruby+stdlib.wasm');
      const module = await WebAssembly.compileStreaming(response);
      const { vm: ruby } = await DefaultRubyVM(module);
      vm = ruby;
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err.message || err) });
    }
    return;
  }

  if (msg.type === 'run') {
    try {
      self.postMessage(runRuby(msg.code, msg.input));
    } catch (err) {
      self.postMessage({ type: 'runtime', message: String(err.message || err) });
    }
  }
};
