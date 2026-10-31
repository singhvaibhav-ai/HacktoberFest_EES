process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from './index.js';
import { addUser } from './db.js';

describe('Submission Authorization & Identity Tests', () => {
  let server;
  let baseUrl;
  let teamACookie;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Create a team account and log in
    addUser({ username: 'TeamAlpha', password: 'password123' });
    addUser({ username: 'TeamVictim', password: 'password123' });

    // Log in as TeamAlpha to get session cookie
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'TeamAlpha', password: 'password123' }),
    });
    assert.equal(loginRes.status, 200);
    const setCookie = loginRes.headers.get('set-cookie');
    assert.ok(setCookie, 'Should receive session cookie');
    teamACookie = setCookie.split(';')[0];
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('rejects unauthenticated submissions with 401', async () => {
    const res = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'two-sum',
        language: 'python',
        code: 'print(1)',
        verdict: 'AC',
      }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'Authentication required');
  });

  it('rejects submissions with client-supplied username (impersonation attempt) with 400', async () => {
    const res = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: teamACookie,
      },
      body: JSON.stringify({
        username: 'TeamVictim', // Attempting to impersonate TeamVictim
        slug: 'two-sum',
        language: 'python',
        code: 'print("impersonated")',
        verdict: 'AC',
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Identity fields must not be supplied by the client');
    assert.deepEqual(body.fields, ['username']);
  });

  it('rejects other client-supplied identity fields (team, teamName, userId) with 400', async () => {
    for (const field of ['team', 'teamName', 'userId', 'author', 'submitter']) {
      const res = await fetch(`${baseUrl}/api/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: teamACookie,
        },
        body: JSON.stringify({
          [field]: 'MaliciousValue',
          slug: 'two-sum',
          language: 'python',
          code: 'print("malicious")',
          verdict: 'AC',
        }),
      });

      assert.equal(res.status, 400, `Expected 400 for forbidden field: ${field}`);
      const body = await res.json();
      assert.equal(body.error, 'Identity fields must not be supplied by the client');
      assert.ok(body.fields.includes(field));
    }
  });

  it('rejects submission if required fields (slug or verdict) are missing with 400', async () => {
    const res = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: teamACookie,
      },
      body: JSON.stringify({
        slug: '',
        language: 'python',
        code: 'print(1)',
        verdict: '',
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'slug and verdict are required');
  });

  it('accepts legitimate submission and derives identity strictly from authenticated session', async () => {
    const res = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: teamACookie,
      },
      body: JSON.stringify({
        slug: 'two-sum',
        language: 'python',
        code: 'print("valid solution")',
        verdict: 'AC',
        passed: 5,
        total: 5,
      }),
    });

    assert.equal(res.status, 201);
    const row = await res.json();
    assert.equal(row.username, 'TeamAlpha', 'Identity must match authenticated session, never client input');
    assert.equal(row.slug, 'two-sum');
    assert.equal(row.verdict, 'AC');
  });
});
