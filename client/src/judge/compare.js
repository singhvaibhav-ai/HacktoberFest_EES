const FLOAT_TOLERANCE = 1e-6;

function compareFloat(actual, expected) {
  const actualTokens = actual.trim().split(/\s+/).filter(Boolean);
  const expectedTokens = expected.trim().split(/\s+/).filter(Boolean);

  if (actualTokens.length !== expectedTokens.length) {
    return false;
  }

  for (let i = 0; i < actualTokens.length; i++) {
    const a = Number(actualTokens[i]);
    const e = Number(expectedTokens[i]);

    if (!Number.isNaN(a) && !Number.isNaN(e)) {
      const diff = Math.abs(a - e);
      const allowed = Math.max(FLOAT_TOLERANCE, FLOAT_TOLERANCE * Math.abs(e));
      if (diff > allowed) {
        return false;
      }
    } else {
      if (actualTokens[i] !== expectedTokens[i]) {
        return false;
      }
    }
  }

  return true;
}

function compareUnorderedLines(actual, expected) {
  const getLines = (str) =>
    str
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trimEnd()
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);

  const actualLines = getLines(actual).sort();
  const expectedLines = getLines(expected).sort();

  if (actualLines.length !== expectedLines.length) {
    return false;
  }

  for (let i = 0; i < actualLines.length; i++) {
    if (actualLines[i] !== expectedLines[i]) {
      return false;
    }
  }

  return true;
}

// Decides whether the program's output matches the expected output.
export function outputsMatch(actual, expected, checker) {
  if (actual == null || expected == null) return false;

  if (checker === 'float') {
    return compareFloat(actual, expected);
  }

  if (checker === 'unordered-lines') {
    return compareUnorderedLines(actual, expected);
  }

  return actual === expected;
}
