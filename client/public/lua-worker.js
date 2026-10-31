// Runs Lua code inside the browser using Fengari.
// This file is a Web Worker, so an infinite loop here can't freeze the page:
// the page just kills the worker when the time limit runs out.
import { lua, lauxlib, lualib, to_luastring, to_jsstring } from '/fengari.mjs';

function runLua(code, stdin) {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);

  let inputBuffer = String(stdin ?? '');
  let inputPos = 0;
  let outputBuffer = '';

  function readOne(fmt) {
    if (fmt === undefined || fmt === '*l' || fmt === '*line' || fmt === 'l' || fmt === 'line') {
      if (inputPos >= inputBuffer.length) return null;
      const newlineIndex = inputBuffer.indexOf('\n', inputPos);
      let line;
      if (newlineIndex === -1) {
        line = inputBuffer.slice(inputPos);
        inputPos = inputBuffer.length;
      } else {
        line = inputBuffer.slice(inputPos, newlineIndex);
        inputPos = newlineIndex + 1;
      }
      if (line.endsWith('\r')) line = line.slice(0, -1);
      return line;
    }
    if (fmt === '*L' || fmt === 'L') {
      if (inputPos >= inputBuffer.length) return null;
      const newlineIndex = inputBuffer.indexOf('\n', inputPos);
      let line;
      if (newlineIndex === -1) {
        line = inputBuffer.slice(inputPos);
        inputPos = inputBuffer.length;
      } else {
        line = inputBuffer.slice(inputPos, newlineIndex + 1);
        inputPos = newlineIndex + 1;
      }
      return line;
    }
    if (fmt === '*a' || fmt === '*all' || fmt === 'a' || fmt === 'all') {
      if (inputPos >= inputBuffer.length) return '';
      const rest = inputBuffer.slice(inputPos);
      inputPos = inputBuffer.length;
      return rest;
    }
    if (fmt === '*n' || fmt === '*number' || fmt === 'n' || fmt === 'number') {
      while (inputPos < inputBuffer.length && /\s/.test(inputBuffer[inputPos])) {
        inputPos++;
      }
      if (inputPos >= inputBuffer.length) return null;
      const match = inputBuffer.slice(inputPos).match(/^[+-]?(?:0x[\da-fA-F]+|\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (!match) return null;
      inputPos += match[0].length;
      const num = Number(match[0]);
      return isNaN(num) ? null : num;
    }
    if (typeof fmt === 'number') {
      if (inputPos >= inputBuffer.length) return null;
      const chunk = inputBuffer.slice(inputPos, inputPos + fmt);
      inputPos += chunk.length;
      return chunk;
    }
    return readOne('*l');
  }

  const lua_io_read = (L) => {
    const top = lua.lua_gettop(L);
    if (top === 0) {
      const val = readOne('*l');
      if (val === null) {
        lua.lua_pushnil(L);
      } else {
        lua.lua_pushstring(L, to_luastring(val));
      }
      return 1;
    }
    for (let i = 1; i <= top; i++) {
      let fmt;
      if (lua.lua_isnumber(L, i)) {
        fmt = lua.lua_tonumber(L, i);
      } else if (lua.lua_isstring(L, i)) {
        fmt = lua.lua_tojsstring(L, i);
      }
      const val = readOne(fmt);
      if (val === null) {
        lua.lua_pushnil(L);
      } else if (typeof val === 'number') {
        if (Number.isInteger(val)) {
          lua.lua_pushinteger(L, val);
        } else {
          lua.lua_pushnumber(L, val);
        }
      } else {
        lua.lua_pushstring(L, to_luastring(val));
      }
    }
    return top;
  };

  // Ensure io table exists and override io.read and io.write
  lua.lua_getglobal(L, to_luastring('io'));
  if (!lua.lua_istable(L, -1)) {
    lua.lua_pop(L, 1);
    lua.lua_newtable(L);
    lua.lua_pushvalue(L, -1);
    lua.lua_setglobal(L, to_luastring('io'));
  }
  lua.lua_pushcfunction(L, lua_io_read);
  lua.lua_setfield(L, -2, to_luastring('read'));

  lua.lua_pushcfunction(L, (L) => {
    const top = lua.lua_gettop(L);
    for (let i = 1; i <= top; i++) {
      lauxlib.luaL_tolstring(L, i);
      outputBuffer += lua.lua_tojsstring(L, -1);
      lua.lua_pop(L, 1);
    }
    return 0;
  });
  lua.lua_setfield(L, -2, to_luastring('write'));
  lua.lua_pop(L, 1);

  // Global read() alias
  lua.lua_register(L, to_luastring('read'), lua_io_read);

  // Override print()
  lua.lua_register(L, to_luastring('print'), (L) => {
    const top = lua.lua_gettop(L);
    const parts = [];
    for (let i = 1; i <= top; i++) {
      lauxlib.luaL_tolstring(L, i);
      parts.push(lua.lua_tojsstring(L, -1));
      lua.lua_pop(L, 1);
    }
    outputBuffer += parts.join('\t') + '\n';
    return 0;
  });

  // Load string to detect syntax errors
  const loadStatus = lauxlib.luaL_loadstring(L, to_luastring(code));
  if (loadStatus !== lua.LUA_OK) {
    const err = to_jsstring(lua.lua_tostring(L, -1));
    return ['syntax', err];
  }

  // Execute chunk to detect runtime errors
  const runStatus = lua.lua_pcall(L, 0, lua.LUA_MULTRET, 0);
  if (runStatus !== lua.LUA_OK) {
    const err = to_jsstring(lua.lua_tostring(L, -1));
    return ['runtime', err];
  }

  return ['ok', outputBuffer];
}

self.onmessage = async (event) => {
  const msg = event.data;

  if (msg.type === 'init') {
    self.postMessage({ type: 'ready' });
    return;
  }

  if (msg.type === 'run') {
    const [kind, text] = runLua(msg.code, msg.input);
    if (kind === 'ok') self.postMessage({ type: 'ok', stdout: text });
    else self.postMessage({ type: kind, message: text });
  }
};
