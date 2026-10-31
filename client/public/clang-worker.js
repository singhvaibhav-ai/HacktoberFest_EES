// Compiles and runs C and C++ code inside the browser.
// Clang itself is compiled to WebAssembly (by the YoWASP project). It turns the
// submission into a WebAssembly program, which we then run right here.
// This file is a Web Worker, so an infinite loop here can't freeze the page:
// the page just kills the worker when the time limit runs out.
import { runClang, Exit } from '/clang/bundle.js';

const STACK_SIZE = 8 * 1024 * 1024; // 8 MB, so deep recursion works like on other judges

const COMPILERS = {
  c: { command: 'clang', file: 'main.c', flags: ['-std=c17'] },
  // This build of the C++ library has no exception support, so turn `throw` into a clear compile error.
  cpp: { command: 'clang++', file: 'main.cpp', flags: ['-std=c++20', '-fno-exceptions', '-isystem', 'include'] },
};

// GCC's <bits/stdc++.h> ("include everything") is popular in competitive programming,
// but Clang's C++ library doesn't have it, so we provide our own.
// Headers for signals and threads are left out: programs here can't use them.
const BITS_STDCXX = `
  cassert cctype cerrno cfenv cfloat cinttypes climits clocale cmath cstdarg cstddef cstdint cstdio cstdlib cstring
  ctime cuchar cwchar cwctype
  algorithm any array atomic bit bitset charconv chrono codecvt compare complex concepts deque exception execution
  filesystem format forward_list fstream functional initializer_list iomanip ios iosfwd iostream istream iterator
  limits list locale map memory memory_resource new numbers numeric optional ostream queue random ranges ratio regex
  set source_location span sstream stack stdexcept streambuf string string_view system_error tuple type_traits
  typeindex typeinfo unordered_map unordered_set utility valarray variant vector`
  .trim()
  .split(/\s+/)
  .map((header) => `#include <${header}>`)
  .join('\n');

let program = null; // the compiled submission, as a WebAssembly.Module

// Downloads Clang (about 100 MB, cached by the browser after the first time).
async function init() {
  let lastPercent = -1;
  await runClang(null, {}, {
    fetchProgress: ({ doneLength, totalLength }) => {
      const percent = Math.floor((100 * doneLength) / totalLength);
      if (percent === lastPercent) return;
      lastPercent = percent;
      self.postMessage({ type: 'progress', message: `Downloading the C/C++ compiler... ${percent}%` });
    },
  });
}

async function compile(code, language) {
  const { command, file, flags } = COMPILERS[language];
  // -fno-finite-loops: without it, the optimiser may delete a loop like `while (true) x++;`
  // (the standard allows it), so an infinite loop would crash instead of hitting the time limit.
  const args = [
    command,
    ...flags,
    '-O2',
    '-fno-finite-loops',
    '-fno-color-diagnostics',
    `-Wl,-z,stack-size=${STACK_SIZE}`,
    file,
    '-o',
    'main.wasm',
  ];
  const files = { [file]: code };
  if (language === 'cpp') files.include = { bits: { 'stdc++.h': BITS_STDCXX } };

  let log = '';
  const decoder = new TextDecoder();
  const collect = (bytes) => {
    if (bytes) log += decoder.decode(bytes, { stream: true });
  };

  try {
    const output = await runClang(args, files, { stdout: collect, stderr: collect, decodeASCII: false });
    program = await WebAssembly.compile(output['main.wasm']);
    return { type: 'compiled' };
  } catch (err) {
    // Clang exits with an error code when the code doesn't compile; 'syntax' means Compilation Error.
    if (err instanceof Exit) return { type: 'syntax', message: log };
    throw err;
  }
}

// --- Running the program ---------------------------------------------------
// WebAssembly programs talk to the outside world through WASI, a small set of
// system calls. A judge only needs a few of them: stdin is the test input,
// stdout is captured, and everything else (files, network, ...) is unavailable.

const ERRNO_SUCCESS = 0;
const ERRNO_BADF = 8; // "no such file descriptor"
const ERRNO_NOSYS = 52; // "not supported"
const ERRNO_SPIPE = 70; // "can't seek"

class ProgramExit extends Error {
  constructor(code) {
    super(`Program exited with code ${code}`);
    this.code = code;
  }
}

function concat(chunks) {
  const out = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function createWasi(input, stdout, stderr) {
  const stdin = new TextEncoder().encode(input);
  let stdinPos = 0;
  let memory = null;
  const view = () => new DataView(memory.buffer); // re-created each time, because memory can grow
  const bytes = () => new Uint8Array(memory.buffer);

  // Reads a list of { pointer, length } buffers that the program passes in.
  function buffers(ptr, count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({ buf: view().getUint32(ptr + i * 8, true), len: view().getUint32(ptr + i * 8 + 4, true) });
    }
    return list;
  }

  const calls = {
    fd_read(fd, iovs, count, nreadPtr) {
      if (fd !== 0) return ERRNO_BADF;
      let total = 0;
      for (const { buf, len } of buffers(iovs, count)) {
        const chunk = stdin.subarray(stdinPos, stdinPos + len);
        bytes().set(chunk, buf);
        stdinPos += chunk.length;
        total += chunk.length;
        if (chunk.length < len) break;
      }
      view().setUint32(nreadPtr, total, true);
      return ERRNO_SUCCESS;
    },
    fd_write(fd, iovs, count, nwrittenPtr) {
      const target = fd === 1 ? stdout : fd === 2 ? stderr : null;
      if (!target) return ERRNO_BADF;
      let total = 0;
      for (const { buf, len } of buffers(iovs, count)) {
        target.push(bytes().slice(buf, buf + len));
        total += len;
      }
      view().setUint32(nwrittenPtr, total, true);
      return ERRNO_SUCCESS;
    },
    // Report stdin/stdout as plain streams (not a terminal), so output is buffered and fast.
    fd_fdstat_get(fd, statPtr) {
      if (fd > 2) return ERRNO_BADF;
      bytes().fill(0, statPtr, statPtr + 24);
      return ERRNO_SUCCESS;
    },
    fd_close: (fd) => (fd > 2 ? ERRNO_BADF : ERRNO_SUCCESS),
    fd_seek: () => ERRNO_SPIPE,
    // No folders are shared with the program.
    fd_prestat_get: () => ERRNO_BADF,
    fd_prestat_dir_name: () => ERRNO_BADF,
    args_sizes_get(argcPtr, sizePtr) {
      view().setUint32(argcPtr, 0, true);
      view().setUint32(sizePtr, 0, true);
      return ERRNO_SUCCESS;
    },
    args_get: () => ERRNO_SUCCESS,
    environ_sizes_get(countPtr, sizePtr) {
      view().setUint32(countPtr, 0, true);
      view().setUint32(sizePtr, 0, true);
      return ERRNO_SUCCESS;
    },
    environ_get: () => ERRNO_SUCCESS,
    clock_time_get(clockId, precision, timePtr) {
      const ms = clockId === 0 ? Date.now() : performance.now(); // 0 is the wall clock
      view().setBigUint64(timePtr, BigInt(Math.round(ms * 1e6)), true);
      return ERRNO_SUCCESS;
    },
    clock_res_get(clockId, resPtr) {
      view().setBigUint64(resPtr, 1000n, true);
      return ERRNO_SUCCESS;
    },
    random_get(buf, len) {
      for (let i = 0; i < len; i += 65536) {
        crypto.getRandomValues(bytes().subarray(buf + i, buf + Math.min(len, i + 65536)));
      }
      return ERRNO_SUCCESS;
    },
    sched_yield: () => ERRNO_SUCCESS,
    proc_exit(code) {
      throw new ProgramExit(code);
    },
  };

  return {
    imports(module) {
      const wasi = {};
      for (const { module: from, name } of WebAssembly.Module.imports(module)) {
        if (from === 'wasi_snapshot_preview1') wasi[name] = calls[name] ?? (() => ERRNO_NOSYS);
      }
      return { wasi_snapshot_preview1: wasi };
    },
    setMemory(m) {
      memory = m;
    },
  };
}

function run(input) {
  const stdout = [];
  const stderr = [];
  const wasi = createWasi(input, stdout, stderr);
  // A fresh instance for every test, so global variables start from zero each time.
  const instance = new WebAssembly.Instance(program, wasi.imports(program));
  wasi.setMemory(instance.exports.memory);

  let error = null;
  try {
    instance.exports._start();
  } catch (err) {
    if (!(err instanceof ProgramExit && err.code === 0)) error = err;
  }

  const decoder = new TextDecoder();
  if (error) {
    // e.g. "divide by zero", "memory access out of bounds", or "unreachable" after abort()
    const reason = error instanceof ProgramExit ? error.message : `${error.name}: ${error.message}`;
    const message = [decoder.decode(concat(stderr)).trimEnd(), reason].filter(Boolean).join('\n');
    return { type: 'runtime', message };
  }
  return { type: 'ok', stdout: decoder.decode(concat(stdout)) };
}

self.onmessage = async (event) => {
  const msg = event.data;
  try {
    if (msg.type === 'init') {
      await init();
      self.postMessage({ type: 'ready' });
    } else if (msg.type === 'compile') {
      self.postMessage(await compile(msg.code, msg.language));
    } else if (msg.type === 'run') {
      self.postMessage(run(msg.input));
    }
  } catch (err) {
    // Something went wrong in the judge itself (not in the submission). Report it instead of hanging.
    self.postMessage({ type: 'runtime', message: String(err) });
  }
};
