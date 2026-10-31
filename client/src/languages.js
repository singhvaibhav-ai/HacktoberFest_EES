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
  { id: 'javascript', label: 'JavaScript (coming soon)', monaco: 'javascript', enabled: false, template: '' },
  {
    id: 'lua',
    label: 'Lua',
    monaco: 'lua',
    enabled: true,
    template: '-- Read input with io.read(), print your answer with print()\n\n',
  },
  { id: 'ruby', label: 'Ruby (coming soon)', monaco: 'ruby', enabled: false, template: '' },
];
