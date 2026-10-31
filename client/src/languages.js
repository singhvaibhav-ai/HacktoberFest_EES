// Languages shown in the editor's dropdown.
// Only enabled languages can be selected and run in the judge.
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
    label: 'Ruby',
    monaco: 'ruby',
    enabled: true,
    template: '# Read input with gets, print your answer with puts or print\n\n',
  },
];
