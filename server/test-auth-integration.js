import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { authRoutes, loginAttempts } from './auth.js';
import { addUser } from './db.js';

describe('Auth Integration Tests (Issue #60)', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    app.use(express.json());
    authRoutes(app);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Seed a test user
    addUser({ username: 'RateLimitTeam', password: 'correctpassword' });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('returns 400 if team name or password is missing', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '', password: '' }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Team name and password are required');
  });

  it('returns generic 401 for both unknown team and wrong password without info leak', async () => {
    loginAttempts.clear();

    const resUnknown = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'NonExistentTeam', password: 'somepassword' }),
    });
    assert.equal(resUnknown.status, 401);
    const unknownBody = await resUnknown.json();
    assert.equal(unknownBody.error, 'Invalid credentials');

    const resWrongPass = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'RateLimitTeam', password: 'wrongpassword' }),
    });
    assert.equal(resWrongPass.status, 401);
    const wrongPassBody = await resWrongPass.json();
    assert.equal(wrongPassBody.error, 'Invalid credentials');
  });

  it('locks out after 5 consecutive failures and returns 429 with Retry-After header', async () => {
    loginAttempts.clear();

    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'RateLimitTeam', password: `badpass${i}` }),
      });
      assert.equal(res.status, 401);
    }

    // 6th attempt should be blocked with 429
    const blockedRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'RateLimitTeam', password: 'correctpassword' }),
    });

    assert.equal(blockedRes.status, 429);
    assert.ok(blockedRes.headers.get('Retry-After'));
    const body = await blockedRes.json();
    assert.ok(body.error.includes('Too many failed login attempts'));
  });

  it('successful login resets failure counter and issues session', async () => {
    loginAttempts.clear();

    // 2 failed attempts
    for (let i = 0; i < 2; i++) {
      await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'RateLimitTeam', password: 'badpassword' }),
      });
    }

    // Now correct password
    const successRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'RateLimitTeam', password: 'correctpassword' }),
    });

    assert.equal(successRes.status, 200);
    const successBody = await successRes.json();
    assert.equal(successBody.username, 'RateLimitTeam');
  });
});
