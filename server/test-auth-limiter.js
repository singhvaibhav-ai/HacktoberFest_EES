import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  loginAttempts,
  recordLoginFailure,
  recordLoginSuccess,
  loginRateLimit,
  cleanupAttempt,
  getAttemptKey,
  MAX_FAILURES,
  FAIL_WINDOW_MS,
  LOCKOUT_MS,
} from './auth.js';

describe('Login Rate Limiter (Issue #60)', () => {
  beforeEach(() => {
    loginAttempts.clear();
  });

  it('allows normal login flow without rate limiting when under threshold', () => {
    const req = {
      ip: '127.0.0.1',
      body: { username: 'TeamOhm' },
    };
    let nextCalled = false;
    const res = {
      status() {
        return this;
      },
      json() {},
      set() {},
    };

    loginRateLimit(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it('records failed attempts and locks out after 5 failures, returning 429 and Retry-After', () => {
    const req = {
      ip: '192.168.1.50',
      body: { username: 'TeamOhm' },
    };

    // Simulate 5 failed login attempts
    for (let i = 0; i < 5; i++) {
      recordLoginFailure(req, 'TeamOhm');
    }

    const key = getAttemptKey(req, 'TeamOhm');
    const record = loginAttempts.get(key);
    assert.ok(record, 'Record should exist in loginAttempts map');
    assert.equal(record.failures, 5);
    assert.ok(record.lockedUntil, 'lockedUntil should be set');

    // 6th attempt should be blocked by loginRateLimit
    let statusCode = null;
    let headers = {};
    let responseBody = null;
    let nextCalled = false;

    const res = {
      set(k, v) {
        headers[k] = v;
      },
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
      },
    };

    loginRateLimit(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, 'next() should not be called when locked out');
    assert.equal(statusCode, 429, 'HTTP status should be 429');
    assert.ok(headers['Retry-After'], 'Retry-After header should be set');
    assert.ok(responseBody?.error?.includes('Too many failed login attempts'));
  });

  it('clears failed attempts counter on successful login', () => {
    const req = {
      ip: '10.0.0.1',
      body: { username: 'TeamOhm' },
    };

    // 2 failed attempts
    recordLoginFailure(req, 'TeamOhm');
    recordLoginFailure(req, 'TeamOhm');

    const key = getAttemptKey(req, 'TeamOhm');
    assert.equal(loginAttempts.get(key)?.failures, 2);

    // Successful login
    recordLoginSuccess(req, 'TeamOhm');
    assert.equal(loginAttempts.has(key), false, 'Record should be removed upon successful login');
  });

  it('tracks attempts independently per IP for the same team name', () => {
    const req1 = {
      ip: '10.0.0.1',
      body: { username: 'TeamOhm' },
    };
    const req2 = {
      ip: '10.0.0.2',
      body: { username: 'TeamOhm' },
    };

    // IP 1 fails 5 times and gets locked
    for (let i = 0; i < 5; i++) {
      recordLoginFailure(req1, 'TeamOhm');
    }

    // IP 2 has not failed yet
    let req2NextCalled = false;
    const res = {
      set() {},
      status() {
        return this;
      },
      json() {},
    };

    loginRateLimit(req2, res, () => {
      req2NextCalled = true;
    });

    assert.equal(req2NextCalled, true, 'IP 2 should not be affected by IP 1 lockout');
  });

  it('normalizes team name case-insensitively so case variations share the rate limit', () => {
    const req1 = { ip: '127.0.0.1', body: { username: 'TeamOhm' } };
    const req2 = { ip: '127.0.0.1', body: { username: 'teamohm' } };

    const key1 = getAttemptKey(req1, req1.body.username);
    const key2 = getAttemptKey(req2, req2.body.username);

    assert.equal(key1, key2, 'Case variations should produce the same attempt key');
  });

  it('cleans up expired lockout and allows login again', () => {
    const req = {
      ip: '192.168.1.100',
      body: { username: 'TeamOhm' },
    };

    const baseTime = 1000000;
    for (let i = 0; i < 5; i++) {
      recordLoginFailure(req, 'TeamOhm', baseTime);
    }

    const key = getAttemptKey(req, 'TeamOhm');
    assert.ok(loginAttempts.has(key));

    // Fast-forward past lockout period
    const futureTime = baseTime + LOCKOUT_MS + 1000;
    const recordAfterExpiry = cleanupAttempt(key, futureTime);
    assert.equal(recordAfterExpiry, null, 'Lockout should expire and record should be removed');
    assert.equal(loginAttempts.has(key), false);
  });
});
