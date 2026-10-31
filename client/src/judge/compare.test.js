import { describe, it, expect } from 'vitest';
import { outputsMatch } from './compare.js';

describe('outputsMatch', () => {
  describe('identical output', () => {
    it('returns true when actual and expected are identical single-line strings', () => {
      expect(outputsMatch('42', '42')).toBe(true);
      expect(outputsMatch('Hello, world!', 'Hello, world!')).toBe(true);
    });

    it('returns true when actual and expected are identical multi-line strings', () => {
      const output = '1\n2\n3\n';
      expect(outputsMatch(output, output)).toBe(true);
    });

    it('returns true for identical empty strings', () => {
      expect(outputsMatch('', '')).toBe(true);
    });

    it('returns true when strings contain identical internal whitespace', () => {
      expect(outputsMatch('a   b\tc', 'a   b\tc')).toBe(true);
    });
  });

  describe('different output', () => {
    it('returns false when values are completely different', () => {
      expect(outputsMatch('42', '43')).toBe(false);
      expect(outputsMatch('foo', 'bar')).toBe(false);
    });

    it('returns false when letter casing differs', () => {
      expect(outputsMatch('hello', 'Hello')).toBe(false);
    });

    it('returns false when actual has extra or missing lines', () => {
      expect(outputsMatch('1\n2\n3', '1\n2')).toBe(false);
      expect(outputsMatch('1\n2', '1\n2\n3')).toBe(false);
    });

    it('returns false when actual is empty but expected has content', () => {
      expect(outputsMatch('', '42')).toBe(false);
      expect(outputsMatch('42', '')).toBe(false);
    });
  });

  describe('trailing whitespace behavior (current strict equality)', () => {
    // Note: Documents current strict comparison semantics where trailing whitespace
    // differences do not match (unnormalized, tracked by issue #22 / PR #82).
    it('returns false when actual has a trailing newline and expected does not', () => {
      expect(outputsMatch('42\n', '42')).toBe(false);
    });

    it('returns false when expected has a trailing newline and actual does not', () => {
      expect(outputsMatch('42', '42\n')).toBe(false);
    });

    it('returns false when actual has trailing spaces on a line', () => {
      expect(outputsMatch('42 ', '42')).toBe(false);
      expect(outputsMatch('line \n', 'line\n')).toBe(false);
    });

    it('returns false when line endings differ (CRLF vs LF)', () => {
      expect(outputsMatch('line\r\n', 'line\n')).toBe(false);
    });

    it('returns false when there are extra trailing newlines', () => {
      expect(outputsMatch('42\n\n', '42\n')).toBe(false);
    });
  });
});
