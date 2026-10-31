import fengari from 'fengari-web';

const { lauxlib, lua, lualib, to_luastring } = fengari;

const LUA_RUNNER = String.raw`
local function __run(code, stdin)
  local output = {}
  local cursor = 1

  local function read_one(format)
    format = format or "*l"
    if format == "*a" or format == "*all" then
      local remaining = string.sub(stdin, cursor)
      cursor = #stdin + 1
      return remaining
    end

    if format == "*n" or format == "*number" then
      local remaining = string.sub(stdin, cursor)
      local whitespace, token = string.match(remaining, "^(%s*)(%S+)")
      if not token then
        cursor = #stdin + 1
        return nil
      end
      cursor = cursor + #whitespace + #token
      return tonumber(token)
    end

    if type(format) == "number" then
      local value = string.sub(stdin, cursor, cursor + format - 1)
      if value == "" then return nil end
      cursor = cursor + #value
      return value
    end

    local newline = string.find(stdin, "\n", cursor, true)
    if newline then
      local line = string.sub(stdin, cursor, newline - 1)
      cursor = newline + 1
      if string.sub(line, -1) == "\r" then line = string.sub(line, 1, -2) end
      if format == "*L" then line = line .. "\n" end
      return line
    end

    if cursor > #stdin then return nil end
    local line = string.sub(stdin, cursor)
    cursor = #stdin + 1
    return line
  end

  local function read(...)
    local count = select("#", ...)
    if count == 0 then return read_one("*l") end
    local values = {}
    for index = 1, count do
      values[index] = read_one(select(index, ...))
    end
    return table.unpack(values, 1, count)
  end

  io = io or {}
  io.read = read
  print = function(...)
    local values = {}
    for index = 1, select("#", ...) do
      values[index] = tostring(select(index, ...))
    end
    output[#output + 1] = table.concat(values, "\t")
  end

  local chunk, syntax_error = load(code, "solution.lua", "t")
  if not chunk then return "syntax", syntax_error end
  local ok, runtime_error = pcall(chunk)
  if not ok then return "runtime", tostring(runtime_error) end

  local stdout = table.concat(output, "\n")
  if #output > 0 then stdout = stdout .. "\n" end
  return "ok", stdout
end

return __run
`;

function runLua(code, input) {
  const state = lauxlib.luaL_newstate();
  if (!state) throw new Error('Could not create Lua state');

  try {
    lualib.luaL_openlibs(state);
    let status = lauxlib.luaL_loadstring(state, to_luastring(LUA_RUNNER));
    if (status !== lua.LUA_OK) {
      return { type: 'runtime', message: lua.lua_tojsstring(state, -1) };
    }

    status = lua.lua_pcall(state, 0, 1, 0);
    if (status !== lua.LUA_OK) {
      return { type: 'runtime', message: lua.lua_tojsstring(state, -1) };
    }

    lua.lua_pushstring(state, to_luastring(code));
    lua.lua_pushstring(state, to_luastring(input));
    status = lua.lua_pcall(state, 2, 2, 0);
    if (status !== lua.LUA_OK) {
      return { type: 'runtime', message: lua.lua_tojsstring(state, -1) };
    }

    const type = lua.lua_tojsstring(state, -2);
    const message = lua.lua_tojsstring(state, -1);
    return type === 'ok' ? { type, stdout: message } : { type, message };
  } finally {
    lua.lua_close(state);
  }
}

self.onmessage = (event) => {
  const { type, code, input } = event.data;
  if (type === 'init') {
    self.postMessage({ type: 'ready' });
    return;
  }
  if (type !== 'run') return;

  try {
    self.postMessage(runLua(code, input));
  } catch (error) {
    self.postMessage({ type: 'runtime', message: error.message || String(error) });
  }
};
