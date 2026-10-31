// Decides whether the program's output matches the expected output.
export function outputsMatch(actual, expected) {
  const trimLineEnds = (output) => output.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trimEnd()).join('\n').replace(/\n+$/, '');
  return trimLineEnds(actual) === trimLineEnds(expected);
}
