import { describe, it, expect } from 'vitest';
import { outputsMatch } from './compare.js';

describe('outputsMatch', () => {
  describe('identical output', () => {
    it('returns true for identical single-line strings', () => {
      expect(outputsMatch('Hello, world!', 'Hello, world!')).toBe(true);
      expect(outputsMatch('42', '42')).toBe(true);
      expect(outputsMatch('', '')).toBe(true);
    });

    it('returns true for identical multi-line strings', () => {
      const output = '1\n2\n3\n4\n5';
      expect(outputsMatch(output, output)).toBe(true);
    });
  });

  describe('trailing whitespace', () => {
    it('ignores single trailing newline', () => {
      expect(outputsMatch('42\n', '42')).toBe(true);
      expect(outputsMatch('42', '42\n')).toBe(true);
    });

    it('ignores multiple trailing newlines', () => {
      expect(outputsMatch('42\n\n\n', '42')).toBe(true);
      expect(outputsMatch('42', '42\n\n')).toBe(true);
    });

    it('ignores trailing spaces at end of string', () => {
      expect(outputsMatch('Hello   ', 'Hello')).toBe(true);
      expect(outputsMatch('Hello', 'Hello   ')).toBe(true);
    });

    it('ignores trailing spaces on individual lines', () => {
      expect(outputsMatch('line1   \nline2', 'line1\nline2')).toBe(true);
      expect(outputsMatch('line1\nline2   ', 'line1\nline2')).toBe(true);
      expect(outputsMatch('line1 \nline2 \n', 'line1\nline2')).toBe(true);
    });

    it('handles Windows CRLF and Unix LF line endings equivalently', () => {
      expect(outputsMatch('line1\r\nline2\r\n', 'line1\nline2\n')).toBe(true);
      expect(outputsMatch('line1\r\nline2', 'line1\nline2')).toBe(true);
    });
  });

  describe('different output', () => {
    it('returns false for completely different content', () => {
      expect(outputsMatch('42', '43')).toBe(false);
      expect(outputsMatch('hello', 'world')).toBe(false);
    });

    it('returns false when one output is empty and the other is not', () => {
      expect(outputsMatch('', 'something')).toBe(false);
      expect(outputsMatch('something', '')).toBe(false);
    });

    it('returns false when casing differs', () => {
      expect(outputsMatch('fizzbuzz', 'FizzBuzz')).toBe(false);
      expect(outputsMatch('YES', 'yes')).toBe(false);
    });

    it('returns false when internal whitespace differs', () => {
      expect(outputsMatch('1 2 3', '1  2 3')).toBe(false);
      expect(outputsMatch('1 2 3', '1 2  3')).toBe(false);
    });

    it('returns false when leading whitespace differs', () => {
      expect(outputsMatch(' 42', '42')).toBe(false);
      expect(outputsMatch('42', ' 42')).toBe(false);
      expect(outputsMatch('  line1\nline2', 'line1\nline2')).toBe(false);
    });

    it('returns false when line count or order differs', () => {
      expect(outputsMatch('1\n2\n3', '1\n2')).toBe(false);
      expect(outputsMatch('1\n2', '2\n1')).toBe(false);
    });
  });
});
