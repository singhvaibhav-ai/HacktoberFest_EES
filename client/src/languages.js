// Languages shown in the editor's dropdown.
// Each enabled language runs in its own Web Worker (in public/).
// Compiled languages are built once before the tests, so compiling doesn't eat into the time limit.
export const LANGUAGES = [
  {
    id: 'python',
    label: 'Python 3',
    monaco: 'python',
    enabled: true,
    worker: '/python-worker.js',
    template: '# Read input with input(), print your answer with print()\n\n',
  },
  {
    id: 'cpp',
    label: 'C++20 (Clang)',
    monaco: 'cpp',
    enabled: true,
    worker: '/clang-worker.js',
    compiled: true,
    template:
      '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input with cin, print your answer with cout\n\n    return 0;\n}\n',
  },
  {
    id: 'c',
    label: 'C17 (Clang)',
    monaco: 'c',
    enabled: true,
    worker: '/clang-worker.js',
    compiled: true,
    template:
      '#include <stdio.h>\n\nint main(void) {\n    // Read input with scanf(), print your answer with printf()\n\n    return 0;\n}\n',
  },
  { id: 'javascript', label: 'JavaScript (coming soon)', monaco: 'javascript', enabled: false, template: '' },
  { id: 'lua', label: 'Lua (coming soon)', monaco: 'lua', enabled: false, template: '' },
  { id: 'ruby', label: 'Ruby (coming soon)', monaco: 'ruby', enabled: false, template: '' },
];
