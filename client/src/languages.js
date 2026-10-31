// Languages shown in the editor's dropdown.
// Python and JavaScript can run; the others are waiting for someone to add them!
export const LANGUAGES = [
  {
    id: 'python',
    label: 'Python 3',
    monaco: 'python',
    enabled: true,
    template: '# Read input with input(), print your answer with print()\n\n',
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    monaco: 'javascript',
    enabled: true,
    template: '// Read input with readline() (or input()), print your answer with console.log()\n\n',
  },
  { id: 'lua', label: 'Lua (coming soon)', monaco: 'lua', enabled: false, template: '' },
  { id: 'ruby', label: 'Ruby (coming soon)', monaco: 'ruby', enabled: false, template: '' },
];
