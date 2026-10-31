import { describe, it, expect } from 'vitest';
import { toVerdict, VERDICT_LABELS } from './verdict.js';

describe('toVerdict', () => {
  it('returns AC when result is ok and test passed', () => {
    expect(toVerdict({ type: 'ok', passed: true })).toBe('AC');
  });

  it('returns WA when result is ok and test failed', () => {
    expect(toVerdict({ type: 'ok', passed: false })).toBe('WA');
  });

  it('returns CE when result is a syntax error', () => {
    expect(toVerdict({ type: 'syntax', message: 'SyntaxError: invalid syntax' })).toBe('CE');
  });

  it('returns TLE when result times out', () => {
    expect(toVerdict({ type: 'timeout' })).toBe('TLE');
  });

  it('returns RE when result is a runtime error or unhandled crash', () => {
    expect(toVerdict({ type: 'runtime', message: 'ZeroDivisionError' })).toBe('RE');
    expect(toVerdict({ type: 'error', message: 'Process exited with code 1' })).toBe('RE');
    expect(toVerdict({ type: 'crash' })).toBe('RE');
    expect(toVerdict({})).toBe('RE');
  });
});

describe('VERDICT_LABELS', () => {
  it('maps all verdict codes to human-readable strings', () => {
    expect(VERDICT_LABELS.AC).toBe('Accepted');
    expect(VERDICT_LABELS.WA).toBe('Wrong Answer');
    expect(VERDICT_LABELS.TLE).toBe('Time Limit Exceeded');
    expect(VERDICT_LABELS.RE).toBe('Runtime Error');
    expect(VERDICT_LABELS.CE).toBe('Compilation Error');
  });

  it('contains labels for every verdict code returned by toVerdict', () => {
    const verdicts = ['AC', 'WA', 'CE', 'TLE', 'RE'];
    for (const v of verdicts) {
      expect(VERDICT_LABELS[v]).toBeDefined();
      expect(typeof VERDICT_LABELS[v]).toBe('string');
    }
  });
});
