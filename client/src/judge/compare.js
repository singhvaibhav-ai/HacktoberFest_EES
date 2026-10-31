// Decides whether the program's output matches the expected output.
// Forgiven (standard judge behaviour): \r\n vs \n line endings, trailing
// spaces/tabs at the END of each line, and trailing newlines at the END of
// the output. Everything else — words, numbers, missing lines, leading or
// interior whitespace — still has to match exactly.
export function outputsMatch(actual, expected) {
const norm = (s) =>
s
.replace(/\r\n?/g, '\n') // CRLF and lone CR → LF
.split('\n')
.map((line) => line.replace(/[ \t]+$/, '')) // per-line trailing spaces/tabs
.join('\n')
.replace(/\n+$/, ''); // final trailing newlines
return norm(actual) === norm(expected);
}
