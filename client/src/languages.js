// Languages shown in the editor's dropdown.
// Only Python can actually run right now; the others are waiting for someone to add them!
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
    template: '// Read a line with input(), print the answer with console.log()\n\n',
  },
  { id: 'lua', label: 'Lua (coming soon)', monaco: 'lua', enabled: false, template: '' },
  { id: 'ruby', label: 'Ruby (coming soon)', monaco: 'ruby', enabled: false, template: '' },
];
