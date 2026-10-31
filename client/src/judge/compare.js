// Decides whether the program's output matches the expected output.
function normalize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trimEnd();
}

export function outputsMatch(actual, expected) {
  return normalize(actual) === normalize(expected);
}
