importScripts('https://cdn.jsdelivr.net/npm/fengari-web@0.1.4/dist/fengari-web.js');

let initialized = false;

function init() {
  initialized = true;
  self.postMessage({ type: 'ready' });
}

function runLua(code, input) {
  let stdout = '';
  const L = fengari.lauxlib.luaL_newstate();
  fengari.lualib.luaL_openlibs(L);

  // Buffer input for io.read()
  let inputBuffer = input || '';

  // Override io.read
  fengari.lua.lua_getglobal(L, 'io');
  fengari.lua.lua_pushjsfunction(L, function (luaState) {
    const top = fengari.lua.lua_gettop(luaState);
    let pattern = '*l';
    if (top >= 1) {
      pattern = fengari.lua.lua_tojsstring(luaState, 1);
    }

    if (inputBuffer.length === 0) {
      fengari.lua.lua_pushnil(luaState);
      return 1;
    }

    if (pattern === '*n' || pattern === 'n') {
      const match = inputBuffer.match(/^\s*([+-]?\d+(?:\.\d+)?)/);
      if (match) {
        inputBuffer = inputBuffer.slice(inputBuffer.indexOf(match[0]) + match[0].length);
        fengari.lua.lua_pushnumber(luaState, parseFloat(match[1]));
        return 1;
      }
      fengari.lua.lua_pushnil(luaState);
      return 1;
    }

    if (pattern === '*a' || pattern === 'a') {
      const all = inputBuffer;
      inputBuffer = '';
      fengari.lua.lua_pushstring(luaState, all);
      return 1;
    }

    // Default line read (*l or *L)
    const newlineIndex = inputBuffer.indexOf('\n');
    let line = '';
    if (newlineIndex !== -1) {
      line = inputBuffer.slice(0, newlineIndex);
      inputBuffer = inputBuffer.slice(newlineIndex + 1);
    } else {
      line = inputBuffer;
      inputBuffer = '';
    }
    fengari.lua.lua_pushstring(luaState, line);
    return 1;
  });
  fengari.lua.lua_setfield(L, -2, 'read');
  fengari.lua.lua_pop(L, 1);

  // Override print
  fengari.lua.lua_pushjsfunction(L, function (luaState) {
    const n = fengari.lua.lua_gettop(luaState);
    const parts = [];
    for (let i = 1; i <= n; i++) {
      if (fengari.lua.lua_isnil(luaState, i)) {
        parts.push('nil');
      } else {
        parts.push(fengari.lua.lua_tojsstring(luaState, i));
      }
    }
    stdout += parts.join('\t') + '\n';
    return 0;
  });
  fengari.lua.lua_setglobal(L, 'print');

  // Execute code
  const loadStatus = fengari.lauxlib.luaL_loadstring(L, fengari.to_luastring(code));
  if (loadStatus !== fengari.lua.LUA_OK) {
    const err = fengari.lua.lua_tojsstring(L, -1);
    return { type: 'syntax', message: err };
  }

  const callStatus = fengari.lua.lua_pcall(L, 0, 0, 0);
  if (callStatus !== fengari.lua.LUA_OK) {
    const err = fengari.lua.lua_tojsstring(L, -1);
    return { type: 'runtime', message: err };
  }

  return { type: 'ok', stdout: stdout };
}

self.onmessage = (event) => {
  const msg = event.data;

  if (msg.type === 'init') {
    init();
    return;
  }

  if (msg.type === 'run') {
    try {
      const res = runLua(msg.code, msg.input);
      if (res.type === 'ok') {
        self.postMessage({ type: 'ok', stdout: res.stdout });
      } else {
        self.postMessage({ type: res.type, message: res.message });
      }
    } catch (e) {
      self.postMessage({ type: 'runtime', message: e.message || String(e) });
    }
  }
};