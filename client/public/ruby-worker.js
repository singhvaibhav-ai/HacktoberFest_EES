// Runs Ruby code inside the browser using ruby.wasm.
// This file is a Web Worker, so an infinite loop here can't freeze the page:
// the page just kills the worker when the time limit runs out.

import '/ruby/browser.umd.js';

let vm = null;
let wasi = null;

async function ensureRubyLoaded() {
  if (self['ruby-wasm-wasi']?.DefaultRubyVM) return;
  if (typeof importScripts === 'function') {
    try {
      importScripts('/ruby/browser.umd.js');
    } catch {}
  }
  if (!self['ruby-wasm-wasi']?.DefaultRubyVM) {
    try {
      await import('/ruby/browser.umd.js');
    } catch {}
  }
}

self.onmessage = async (event) => {
  const msg = event.data;

  if (msg.type === 'init') {
    try {
      await ensureRubyLoaded();
      let module;
      try {
        module = await WebAssembly.compileStreaming(fetch('/ruby/ruby.wasm'));
      } catch {
        const response = await fetch('/ruby/ruby.wasm');
        const buffer = await response.arrayBuffer();
        module = await WebAssembly.compile(buffer);
      }
      const ruby = self['ruby-wasm-wasi'] || globalThis['ruby-wasm-wasi'];
      if (!ruby || !ruby.DefaultRubyVM) {
        throw new Error('Could not load Ruby WebAssembly runtime');
      }
      const res = await ruby.DefaultRubyVM(module, { consolePrint: false });
      vm = res.vm;
      wasi = res.wasi;
      vm.eval('STDOUT.sync = true; STDERR.sync = true');
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message || String(err) });
    }
    return;
  }

  if (msg.type === 'run') {
    try {
      const inputStr = msg.input != null ? String(msg.input) : '';
      wasi.fds[0].file.data = new TextEncoder().encode(inputStr);
      wasi.fds[0].file_pos = 0n;
      wasi.fds[1].file.data = new Uint8Array(0);
      wasi.fds[1].file_pos = 0n;
      wasi.fds[2].file.data = new Uint8Array(0);
      wasi.fds[2].file_pos = 0n;

      vm.eval(msg.code);

      const stdout = new TextDecoder().decode(wasi.fds[1].file.data);
      self.postMessage({ type: 'ok', stdout });
    } catch (err) {
      const errText = err.message || String(err);
      const isSyntax = errText.includes('syntax error') || errText.includes('SyntaxError');
      self.postMessage({
        type: isSyntax ? 'syntax' : 'runtime',
        message: errText,
      });
    }
  }
};
