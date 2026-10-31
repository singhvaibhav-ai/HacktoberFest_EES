import { describe, it, expect } from 'vitest';
import { toVerdict, VERDICT_LABELS } from './verdict.js';

describe('toVerdict', () => {
  describe('AC (Accepted)', () => {
    it('returns AC when execution succeeds and all tests pass', () => {
      expect(toVerdict({ type: 'ok', passed: true })).toBe('AC');
    });
  });

  describe('WA (Wrong Answer)', () => {
    it('returns WA when execution succeeds but test comparison fails', () => {
      expect(toVerdict({ type: 'ok', passed: false })).toBe('WA');
    });

    it('returns WA when passed property is omitted or falsy on ok result', () => {
      expect(toVerdict({ type: 'ok' })).toBe('WA');
      expect(toVerdict({ type: 'ok', passed: null })).toBe('WA');
      expect(toVerdict({ type: 'ok', passed: undefined })).toBe('WA');
    });
  });

  describe('CE (Compilation Error)', () => {
    it('returns CE when code has a Python syntax error', () => {
      expect(toVerdict({ type: 'syntax' })).toBe('CE');
      expect(toVerdict({ type: 'syntax', message: 'SyntaxError: invalid syntax' })).toBe('CE');
    });
  });

  describe('RE (Runtime Error)', () => {
    it('returns RE when execution fails with a runtime exception', () => {
      expect(toVerdict({ type: 'runtime' })).toBe('RE');
      expect(toVerdict({ type: 'runtime', message: 'ZeroDivisionError: division by zero' })).toBe('RE');
    });

    it('returns RE for unknown or unexpected error types', () => {
      expect(toVerdict({ type: 'unknown_failure' })).toBe('RE');
      expect(toVerdict({ type: 'crash' })).toBe('RE');
    });

    it('returns RE when result is an empty object', () => {
      expect(toVerdict({})).toBe('RE');
    });
  });
});

describe('VERDICT_LABELS', () => {
  it('defines human-readable labels for all five verdicts', () => {
    expect(VERDICT_LABELS).toEqual({
      AC: 'Accepted',
      WA: 'Wrong Answer',
      TLE: 'Time Limit Exceeded',
      RE: 'Runtime Error',
      CE: 'Compilation Error',
    });
  });

  it('maps every verdict label to a defined human-readable string', () => {
    const verdictCodes = ['AC', 'WA', 'TLE', 'RE', 'CE'];
    for (const code of verdictCodes) {
      expect(VERDICT_LABELS[code]).toBeDefined();
      expect(typeof VERDICT_LABELS[code]).toBe('string');
    }
  });
});
