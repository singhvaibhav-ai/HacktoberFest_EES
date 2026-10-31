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

export const VERDICT_CLASSES = {
  AC: 'verdict-ac',
  WA: 'verdict-wa',
  TLE: 'verdict-tle',
  RE: 'verdict-re',
  CE: 'verdict-ce',
};
