// Decides whether the program's output matches the expected output.
export function outputsMatch(actual, expected) {
  const norm = (s) => s.replace(/\r/g, '').replace(/\n+$/, '');
  return norm(actual) === norm(expected);
}
