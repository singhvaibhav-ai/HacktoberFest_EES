// Languages shown in the editor's dropdown.
export const LANGUAGES = [
  {
    id: 'python',
    label: 'Python 3',
    monaco: 'python',
    enabled: true,
    template: '# Read input with input(), print your answer with print()\n',
  },
  {
    id: 'lua',
    label: 'Lua',
    monaco: 'lua',
    enabled: true,
    template: '-- Read input with io.read(), print your answer with print()\nlocal a = io.read("*n")\nlocal b = io.read("*n")\nprint(a + b)\n',
  },
  { id: 'javascript', label: 'JavaScript (coming soon)', monaco: 'javascript', enabled: false },
  { id: 'ruby', label: 'Ruby (coming soon)', monaco: 'ruby', enabled: false },
];