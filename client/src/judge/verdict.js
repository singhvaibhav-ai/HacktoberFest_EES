// Turns the result of running one test into a verdict code.
//   AC  Accepted
//   WA  Wrong Answer
//   TLE Time Limit Exceeded
//   RE  Runtime Error
//   CE  Compilation Error (for Python: a SyntaxError)
export function toVerdict(result) {
  if (result.type === 'ok') return result.passed ? 'AC' : 'WA';
  if (result.type === 'syntax') return 'CE';
  if (result.type === 'timeout') return 'TLE';
  // anything else means the program crashed
  return 'RE';
}

export const VERDICT_LABELS = {
  AC: 'Accepted',
  WA: 'Wrong Answer',
  TLE: 'Time Limit Exceeded',
  RE: 'Runtime Error',
  CE: 'Compilation Error',
};

export const VERDICT_MESSAGES = {
  AC: 'All tests passed.',
  WA: 'Output did not match the expected output.',
  TLE: 'Time limit exceeded. Your code took too long to run.',
  RE: 'Runtime error. Your program crashed or threw an unhandled exception.',
  CE: 'Compilation/Syntax error. Could not parse or compile code.',
};
