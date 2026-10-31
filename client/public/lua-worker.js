// Runs Lua code inside the browser using Fengari.
// This file is a Web Worker, so an infinite loop here can't freeze the page:
// the page just kills the worker when the time limit runs out.

self.window = self;

if (typeof importScripts === 'function') {
  importScripts('/fengari-web.js');
} else {
  await import('/fengari-web.js');
}

const { lua, lauxlib, lualib, to_luastring, to_jsstring } = self.fengari;

let L = null;
let currentStdout = '';

function setupState() {
  L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  currentStdout = '';

  // Redirect print to capture output
  lua.lua_register(L, to_luastring('print'), (state) => {
    const n = lua.lua_gettop(state);
    const parts = [];
    for (let i = 1; i <= n; i++) {
      const str = lauxlib.luaL_tolstring(state, i);
      parts.push(to_jsstring(str));
      lua.lua_pop(state, 1);
    }
    currentStdout += parts.join('\t') + '\n';
    return 0;
  });

  // Support io.write to capture raw output without newline
  lua.lua_register(L, to_luastring('__raw_write'), (state) => {
    const n = lua.lua_gettop(state);
    for (let i = 1; i <= n; i++) {
      const str = lauxlib.luaL_tolstring(state, i);
      currentStdout += to_jsstring(str);
      lua.lua_pop(state, 1);
    }
    return 0;
  });

  const IO_SHIM = `
io = io or {}
io.write = __raw_write

function __setup_io(stdin_str)
  local pos = 1
  local len = #stdin_str

  local function read_one(fmt)
    if fmt == nil then
      fmt = "l"
    elseif type(fmt) == "string" then
      if fmt == "*a" or fmt == "a" or fmt == "*all" then fmt = "a"
      elseif fmt == "*l" or fmt == "l" or fmt == "*line" then fmt = "l"
      elseif fmt == "*L" or fmt == "L" then fmt = "L"
      elseif fmt == "*n" or fmt == "n" or fmt == "*number" then fmt = "n"
      end
    end

    if pos > len then
      if fmt == "a" then
        return ""
      end
      return nil
    end

    if fmt == "l" then
      local nl = stdin_str:find("\\n", pos, true)
      local res
      if nl then
        res = stdin_str:sub(pos, nl - 1)
        pos = nl + 1
      else
        res = stdin_str:sub(pos)
        pos = len + 1
      end
      if res:sub(-1) == "\\r" then
        res = res:sub(1, -2)
      end
      return res
    elseif fmt == "L" then
      local nl = stdin_str:find("\\n", pos, true)
      local res
      if nl then
        res = stdin_str:sub(pos, nl)
        pos = nl + 1
      else
        res = stdin_str:sub(pos)
        pos = len + 1
      end
      return res
    elseif fmt == "a" then
      local res = stdin_str:sub(pos)
      pos = len + 1
      return res
    elseif fmt == "n" then
      local s, e = stdin_str:find("^%s*", pos)
      if e and e >= s then pos = e + 1 end
      if pos > len then return nil end

      local num_str = stdin_str:match("^[-+]?0[xX][%da-fA-F]+", pos)
      if not num_str then
        num_str = stdin_str:match("^[-+]?%d+%.?%d*[eE]?[-+]?%d*", pos)
      end
      if not num_str or num_str == "" or num_str == "+" or num_str == "-" then
        num_str = stdin_str:match("^[-+]?%.%d+[eE]?[-+]?%d*", pos)
      end
      if num_str and num_str ~= "" and num_str ~= "+" and num_str ~= "-" then
        pos = pos + #num_str
        return tonumber(num_str)
      else
        return nil
      end
    elseif type(fmt) == "number" then
      if fmt <= 0 then return "" end
      local res = stdin_str:sub(pos, pos + fmt - 1)
      pos = pos + #res
      return res
    else
      error("bad argument to 'read' (invalid format)")
    end
  end

  io.read = function(...)
    local n = select("#", ...)
    if n == 0 then
      return read_one("l")
    end
    local results = {}
    for i = 1, n do
      local fmt = select(i, ...)
      results[i] = read_one(fmt)
    end
    return table.unpack(results, 1, n)
  end
  if io.stdin then
    io.stdin.read = io.read
  end
  io.lines = function(...)
    return function()
      return io.read()
    end
  end
end
`;
  lauxlib.luaL_dostring(L, to_luastring(IO_SHIM));
}

self.onmessage = async (event) => {
  const msg = event.data;

  if (msg.type === 'init') {
    setupState();
    self.postMessage({ type: 'ready' });
    return;
  }

  if (msg.type === 'run') {
    setupState();

    lua.lua_getglobal(L, to_luastring('__setup_io'));
    lua.lua_pushstring(L, to_luastring(msg.input != null ? String(msg.input) : ''));
    if (lua.lua_pcall(L, 1, 0, 0) !== lua.LUA_OK) {
      const err = to_jsstring(lua.lua_tostring(L, -1));
      self.postMessage({ type: 'runtime', message: err });
      return;
    }

    const loadStatus = lauxlib.luaL_loadstring(L, to_luastring(msg.code));
    if (loadStatus !== lua.LUA_OK) {
      const err = to_jsstring(lua.lua_tostring(L, -1));
      self.postMessage({ type: 'syntax', message: err });
      return;
    }

    const runStatus = lua.lua_pcall(L, 0, 0, 0);
    if (runStatus !== lua.LUA_OK) {
      const err = to_jsstring(lua.lua_tostring(L, -1));
      self.postMessage({ type: 'runtime', message: err });
      return;
    }

    self.postMessage({ type: 'ok', stdout: currentStdout });
  }
};
