// Languages shown in the editor's dropdown.
// Python and Ruby run in the browser through WebAssembly.
export const LANGUAGES = [
  {
    id: 'python',
    label: 'Python 3',
    monaco: 'python',
    enabled: true,
    template: '# Read input with input(), print your answer with print()\n\n',
  },
  { id: 'javascript', label: 'JavaScript (coming soon)', monaco: 'javascript', enabled: false, template: '' },
  { id: 'lua', label: 'Lua (coming soon)', monaco: 'lua', enabled: false, template: '' },
  {
    id: 'ruby',
    label: 'Ruby 4.0',
    monaco: 'ruby',
    enabled: true,
    template: '# Read input with gets, print your answer with puts\n\n',
  },
];
